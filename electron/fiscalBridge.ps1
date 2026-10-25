param (
    [string]$Action,
    [string]$Port = "COM2",
    [string]$InvoiceJson = "",
    [string]$InvoiceBase64 = "",
    [string]$StartDate = "",
    [string]$EndDate = "",
    [int]$StartZ = 0,
    [int]$EndZ = 0,
    [string]$ReportType = "detailed"
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$candidates = @(
    (Join-Path $scriptDir "lib\TfhkaNet.dll"),
    (Join-Path $scriptDir "..\lib\TfhkaNet.dll"),
    (Join-Path (Get-Location) "resources\app.asar.unpacked\electron\lib\TfhkaNet.dll"),
    (Join-Path (Get-Location) "electron\lib\TfhkaNet.dll")
)

$dllPath = $null
foreach ($c in $candidates) {
    if (Test-Path $c) {
        $dllPath = $c
        break
    }
}
if (-not $dllPath) {
    $dllPath = Join-Path $scriptDir "lib\TfhkaNet.dll"
}

function Out-JsonResult($obj) {
    Write-Output ($obj | ConvertTo-Json -Compress)
}

function Clean-Ascii([string]$str) {
    if (-not $str) { return "" }
    $normalized = $str.Normalize([System.Text.NormalizationForm]::FormD)
    $sb = New-Object System.Text.StringBuilder
    foreach ($c in $normalized.ToCharArray()) {
        $uc = [System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($c)
        if ($uc -ne [System.Globalization.UnicodeCategory]::NonSpacingMark) {
            $val = [int]$c
            if ($val -lt 128) {
                [void]$sb.Append($c)
            }
        }
    }
    $res = ($sb.ToString() -replace '[^A-Za-z0-9\s\.\-]', '').Trim().ToUpper()
    return $res
}

if ($Action -eq "getPorts") {
    try {
        $ports = [System.IO.Ports.SerialPort]::GetPortNames() | Sort-Object -Unique
        Out-JsonResult @{ success = $true; ports = $ports }
    } catch {
        Out-JsonResult @{ success = $false; error = $_.Exception.Message; ports = @() }
    }
    exit 0
}

if (-not (Test-Path $dllPath)) {
    Out-JsonResult @{ success = $false; error = "No se encontro TfhkaNet.dll en: $dllPath" }
    exit 1
}

try {
    Add-Type -Path $dllPath -ErrorAction Stop
} catch {}

$printer = New-Object TfhkaNet.IF.VE.Tfhka

if ($Action -eq "detectPrinterPort" -or $Action -eq "autoDetect") {
    try {
        $ports = [System.IO.Ports.SerialPort]::GetPortNames() | Sort-Object -Unique
        $activePort = $null

        $testOrder = @()
        if ($Port -and $Port -ne "COM1" -and ($ports -contains $Port)) {
            $testOrder += $Port
        }
        foreach ($candidate in @("COM2", "COM3", "COM4", "COM5")) {
            if (($ports -contains $candidate) -and ($testOrder -notcontains $candidate)) {
                $testOrder += $candidate
            }
        }
        if ($testOrder.Count -gt 3) {
            $testOrder = $testOrder[0..2]
        }

        foreach ($p in $testOrder) {
            try {
                $opened = $printer.OpenFpctrl($p)
                if ($opened) {
                    $printer.CloseFpctrl()
                    $activePort = $p
                    break
                }
            } catch {}
        }

        if ($activePort) {
            Out-JsonResult @{ 
                success = $true
                activePort = $activePort
                ports = $ports
                message = "Impresora fiscal HKA detectada en puerto $activePort" 
            }
        } else {
            Out-JsonResult @{ 
                success = $false
                ports = $ports
                activePort = "COM2"
                message = "No se detectó respuesta activa. Si usa el emulador fiscal, verifique que la ventana esté abierta con el botón en VERDE (Encendido)." 
            }
        }
    } catch {
        Out-JsonResult @{ success = $false; error = $_.Exception.Message; ports = @() }
    }
    exit 0
}

function Open-Printer($targetPort) {
    # COM1 is reserved for the HKA emulator itself; the POS must connect on COM2
    if (-not $targetPort -or $targetPort -eq "COM1") { 
        $targetPort = "COM2" 
    }
    
    $res = $printer.OpenFpctrl($targetPort)
    if (-not $res) {
        throw "No se pudo conectar con la impresora fiscal en el puerto $targetPort. Si está usando el Emulador Fiscal HKA, asegúrese de tenerlo abierto en su escritorio con el botón en VERDE (Encendido). Si usa una impresora física, revise que esté conectada y encendida."
    }
    
    # Configure fast retries so commands fail fast instead of freezing 50s
    try {
        $printer.SendCmdRetryAttempts = 1
        $printer.SendCmdRetryInterval = 250
        $printer.SerialPortReceiveTimeout = 5
    } catch {}
}

switch ($Action) {
    "testConnection" {
        try {
            Open-Printer $Port
            Start-Sleep -Milliseconds 200
            $connected = $printer.CheckFprinter()
            $status = $printer.GetPrinterStatus()
            $printer.CloseFpctrl()
            
            $isOk = ($connected -eq $true -and $status.PrinterErrorCode -eq 0)
            Out-JsonResult @{
                success = $isOk
                connected = [bool]$connected
                statusCode = $status.PrinterStatusCode
                statusDescription = $status.PrinterStatusDescription
                errorCode = $status.PrinterErrorCode
                errorDescription = $status.PrinterErrorDescription
                message = if ($isOk) { "Conexion exitosa con la impresora fiscal en $Port." } else { "La impresora en $Port no responde o esta apagada. Si usa el Emulador HKA, pulse el boton I/O en VERDE." }
            }
        } catch {
            try { $printer.CloseFpctrl() } catch {}
            Out-JsonResult @{ success = $false; error = $_.Exception.Message }
        }
    }

    "getS1Status" {
        try {
            Open-Printer $Port
            Start-Sleep -Milliseconds 200
            $s1 = $printer.GetS1PrinterData()
            $status = $printer.GetPrinterStatus()
            $printer.CloseFpctrl()

            Out-JsonResult @{
                success = $true
                totalDailySales = $s1.TotalDailySales
                lastInvoiceNumber = $s1.LastInvoiceNumber
                quantityOfInvoicesToday = $s1.QuantityOfInvoicesToday
                dailyClosureCounter = $s1.DailyClosureCounter
                rif = $s1.RIF
                registeredMachineNumber = $s1.RegisteredMachineNumber
                currentPrinterDateTime = $s1.CurrentPrinterDateTime.ToString("dd/MM/yyyy HH:mm:ss")
                printerStatus = $status.PrinterStatusDescription
            }
        } catch {
            try { $printer.CloseFpctrl() } catch {}
            Out-JsonResult @{ success = $false; error = $_.Exception.Message }
        }
    }

    "reportX" {
        try {
            Open-Printer $Port
            Start-Sleep -Milliseconds 200
            $sent = $printer.SendCmd("I0X")
            Start-Sleep -Seconds 2
            $printer.CloseFpctrl()
            
            if ($sent) {
                Out-JsonResult @{ success = $true; message = "Reporte X emitido con exito." }
            } else {
                Out-JsonResult @{ success = $false; error = "La impresora rechazo el comando de Reporte X. Verifique que este encendida." }
            }
        } catch {
            try { $printer.CloseFpctrl() } catch {}
            Out-JsonResult @{ success = $false; error = $_.Exception.Message }
        }
    }

    "reportZ" {
        try {
            Open-Printer $Port
            Start-Sleep -Milliseconds 200
            $sent = $printer.SendCmd("I0Z")
            Start-Sleep -Seconds 4
            $status = $printer.GetPrinterStatus()
            $printer.CloseFpctrl()
            
            if ($sent) {
                Out-JsonResult @{ success = $true; message = "Cierre Z emitido y asentado en Memoria Fiscal con exito." }
            } else {
                $errDesc = $status.PrinterErrorDescription
                if (-not $errDesc) {
                    $errDesc = "La impresora rechazo el Cierre Z. Segun la normativa del SENIAT, solo se permite emitir un Reporte Z por dia."
                }
                Out-JsonResult @{ 
                    success = $false
                    error = $errDesc
                    alreadyPrinted = $true
                }
            }
        } catch {
            try { $printer.CloseFpctrl() } catch {}
            Out-JsonResult @{ success = $false; error = $_.Exception.Message }
        }
    }

    "cancelInvoice" {
        try {
            Open-Printer $Port
            Start-Sleep -Milliseconds 200
            $sent = $printer.SendCmd("7")
            $printer.CloseFpctrl()
            Out-JsonResult @{ success = $sent; message = "Comando de anulacion enviado." }
        } catch {
            try { $printer.CloseFpctrl() } catch {}
            Out-JsonResult @{ success = $false; error = $_.Exception.Message }
        }
    }

    "getFiscalMemory" {
        try {
            Open-Printer $Port
            Start-Sleep -Milliseconds 200
            $s1 = $printer.GetS1PrinterData()
            $totalZ = [int]$s1.DailyClosureCounter

            $allReports = @()
            if ($totalZ -gt 0) {
                $queryStart = 1
                $queryEnd = $totalZ + 1
                if ($StartZ -gt 0) { $queryStart = $StartZ }
                if ($EndZ -gt 0 -and $EndZ -ge $queryStart) { $queryEnd = $EndZ + 1 }

                # Limitar lote a un máximo razonable para proteger tiempo de respuesta
                if (($queryEnd - $queryStart) -gt 350) {
                    $queryStart = [Math]::Max(1, $queryEnd - 350)
                }

                $rawZList = $printer.GetZReport($queryStart, $queryEnd)
                if ($rawZList) {
                    foreach ($item in $rawZList) {
                        if (-not $item) { continue }
                        $zDateStr = $item.ZReportDate.ToString("yyyy-MM-dd")
                        
                        # Filtro opcional por rango de fechas
                        if ($StartDate -and $zDateStr -lt $StartDate) { continue }
                        if ($EndDate -and $zDateStr -gt $EndDate) { continue }

                        $exempt = [Math]::Round([double]$item.FreeSalesTax, 2)
                        $base16 = [Math]::Round([double]$item.GeneralRate1Sale, 2)
                        $tax16  = [Math]::Round([double]$item.GeneralRate1Tax, 2)
                        $base8  = [Math]::Round([double]$item.ReducedRate2Sale, 2)
                        $tax8   = [Math]::Round([double]$item.ReducedRate2Tax, 2)
                        $baseAdd = [Math]::Round([double]$item.AdditionalRate3Sale, 2)
                        $taxAdd  = [Math]::Round([double]$item.AdditionalRate3Tax, 2)
                        $totSales = [Math]::Round($exempt + $base16 + $tax16 + $base8 + $tax8 + $baseAdd + $taxAdd, 2)

                        $devs = [Math]::Round([double]$item.FreeTaxDevolution + [double]$item.GeneralRateDevolution + [double]$item.GeneralRateTaxDevolution + [double]$item.ReducedRateDevolution + [double]$item.ReducedRateTaxDevolution, 2)

                        $allReports += @{
                            zNumber = $item.NumberOfLastZReport
                            zDate = $zDateStr
                            zDateTime = $item.ZReportDate.ToString("yyyy-MM-dd HH:mm:ss")
                            lastInvoiceNumber = $item.NumberOfLastInvoice
                            exemptSalesBs = $exempt
                            baseGeneral16Bs = $base16
                            taxGeneral16Bs = $tax16
                            baseReduced8Bs = $base8
                            taxReduced8Bs = $tax8
                            baseAdditionalBs = $baseAdd
                            taxAdditionalBs = $taxAdd
                            totalSalesBs = $totSales
                            devolutionsBs = $devs
                            lastCreditNote = $item.NumberOfLastCreditNote
                            lastDebitNote = $item.NumberOfLastDebitNote
                            lastNonFiscal = $item.NumberOfLastNonFiscal
                        }
                    }
                }
            }

            $printer.CloseFpctrl()

            Out-JsonResult @{
                success = $true
                records = $allReports
                totalRecords = $allReports.Count
                totalZInPrinter = $totalZ
                registeredMachineNumber = $s1.RegisteredMachineNumber
                rif = $s1.RIF
                currentPrinterDateTime = $s1.CurrentPrinterDateTime.ToString("yyyy-MM-dd HH:mm:ss")
            }
        } catch {
            try { $printer.CloseFpctrl() } catch {}
            Out-JsonResult @{ success = $false; error = $_.Exception.Message }
        }
    }

    "printFiscalMemory" {
        try {
            Open-Printer $Port
            Start-Sleep -Milliseconds 200
            $s1 = $printer.GetS1PrinterData()
            $totalZ = [int]$s1.DailyClosureCounter

            $printStart = 1
            $printEnd = [Math]::Max(2, $totalZ + 1)
            if ($StartZ -gt 0) { $printStart = $StartZ }
            if ($EndZ -gt 0 -and $EndZ -ge $printStart) { $printEnd = $EndZ + 1 }

            $printer.PrintZReport($printStart, $printEnd)
            Start-Sleep -Seconds 3
            $printer.CloseFpctrl()

            Out-JsonResult @{
                success = $true
                message = "Reporte de Memoria Fiscal emitido en la impresora física (Z #$printStart hasta Z #$($printEnd - 1))."
            }
        } catch {
            try { $printer.CloseFpctrl() } catch {}
            Out-JsonResult @{ success = $false; error = $_.Exception.Message }
        }
    }

    "printInvoice" {
        try {
            $rawJson = ""
            if ($InvoiceBase64) {
                $bytes = [System.Convert]::FromBase64String($InvoiceBase64)
                $rawJson = [System.Text.Encoding]::UTF8.GetString($bytes)
            } else {
                $rawJson = $InvoiceJson
            }

            if (-not $rawJson) {
                throw "No se recibieron datos de la factura."
            }
            $inv = $rawJson | ConvertFrom-Json
            Open-Printer $Port
            Start-Sleep -Milliseconds 200

            # 0. Cancelar documento previo SOLO SI la impresora esta en transaccion (statusCode 1 o 2)
            try {
                $stInit = $printer.GetPrinterStatus()
                if ($stInit -and ($stInit.PrinterStatusCode -eq 1 -or $stInit.PrinterStatusCode -eq 2)) {
                    $null = $printer.SendCmd("7")
                    Start-Sleep -Milliseconds 200
                }
            } catch {}

            # 1. Datos del Cliente
            $clientRif = if ($inv.clientCedula) { $inv.clientCedula } else { "V000000000" }
            $clientRifClean = ($clientRif -replace '[^A-Za-z0-9]', '').ToUpper()
            
            $rawClientName = if ($inv.clientName) { $inv.clientName } else { "CLIENTE GENERAL" }
            $clientNameClean = Clean-Ascii $rawClientName
            if ($clientNameClean.Length -gt 40) { $clientNameClean = $clientNameClean.Substring(0, 40) }
            if (-not $clientNameClean) { $clientNameClean = "CLIENTE GENERAL" }

            $null = $printer.SendCmd("iR*$clientRifClean")
            $null = $printer.SendCmd("iS*$clientNameClean")

            if ($inv.clientAddress) {
                $addrClean = Clean-Ascii $inv.clientAddress
                if ($addrClean.Length -gt 40) { $addrClean = $addrClean.Substring(0, 40) }
                if ($addrClean) {
                    $null = $printer.SendCmd("i01$addrClean")
                }
            }

            # 2. Items / Renglones de Factura
            foreach ($item in $inv.items) {
                $qty = [decimal]($item.quantity)
                if ($qty -le 0) { $qty = 1 }

                $price = 0
                if ($item.unitPriceBs -and [decimal]$item.unitPriceBs -gt 0) {
                    $price = [decimal]$item.unitPriceBs
                } elseif ($item.unitPrice -and [decimal]$item.unitPrice -gt 0 -and $inv.exchangeRate -gt 0) {
                    $price = [decimal]$item.unitPrice * [decimal]$inv.exchangeRate
                } elseif ($item.priceUSD -and [decimal]$item.priceUSD -gt 0 -and $inv.exchangeRate -gt 0) {
                    $price = [decimal]$item.priceUSD * [decimal]$inv.exchangeRate
                } elseif ($item.price -and [decimal]$item.price -gt 0 -and $inv.exchangeRate -gt 0) {
                    $price = [decimal]$item.price * [decimal]$inv.exchangeRate
                }

                $qtyInt = [Math]::Floor($qty)
                $qtyDec = [Math]::Round(($qty - $qtyInt) * 1000)
                $qtyStr = "{0:D5}{1:D3}" -f [int]$qtyInt, [int]$qtyDec

                $priceInt = [Math]::Floor($price)
                $priceDec = [Math]::Round(($price - $priceInt) * 100)
                $priceStr = "{0:D8}{1:D2}" -f [long]$priceInt, [int]$priceDec

                $rawName = if ($item.productName) { $item.productName } elseif ($item.name) { $item.name } elseif ($item.nombre) { $item.nombre } else { "ARTICULO" }
                $nameClean = Clean-Ascii $rawName
                if ($nameClean.Length -gt 38) { $nameClean = $nameClean.Substring(0, 38) }
                if (-not $nameClean) { $nameClean = "ARTICULO" }

                # Tasa: '!' General 16% / ' ' Exento / '"' Reducida 8% / '#' Adicional 31%
                $cmdChar = "!"
                if ($item.taxRate -eq 0 -or $item.isExempt) {
                    $cmdChar = " "
                } elseif ($item.taxRate -eq 0.08) {
                    $cmdChar = "`""
                } elseif ($item.taxRate -eq 0.31) {
                    $cmdChar = "#"
                }

                $itemCmd = "$cmdChar$priceStr$qtyStr$nameClean"
                $okItem = $printer.SendCmd($itemCmd)
                if (-not $okItem) {
                    $st = $printer.GetPrinterStatus()
                    throw "Error enviando item '$nameClean' a la impresora fiscal: $($st.PrinterErrorDescription)"
                }
            }

            # 3. Subtotal
            $null = $printer.SendCmd("3")
            Start-Sleep -Milliseconds 150

            # 4. Total y Pago según medio de pago seleccionado
            $payMethod = "$($inv.paymentMethod)".ToLower()
            $isIgtf = [bool]$inv.igtf -or ([double]$inv.igtfBaseUSD -gt 0 -and -not [bool]$inv.isIgtfExempt)

            $paid = $false
            if ($isIgtf) {
                # Divisas / IGTF: Comando 120 + 199
                $paid = [bool]$printer.SendCmd("120")
                if ($paid) {
                    $null = $printer.SendCmd("199")
                }
            } elseif ($payMethod -match "punto|tarjeta|debito|pos") {
                # Punto de Venta / Tarjeta Débito: Comando 105 (Medio 05 Tarjeta en TFHKA)
                $paid = [bool]$printer.SendCmd("105")
                if (-not $paid) {
                    # Fallback a Medio 02 si la impresora tiene configurada tarjeta en 02
                    $paid = [bool]$printer.SendCmd("102")
                }
            } elseif ($payMethod -match "pago_movil") {
                # Pago Móvil / Transferencia Electrónica
                $paid = [bool]$printer.SendCmd("105")
                if (-not $paid) {
                    $paid = [bool]$printer.SendCmd("101")
                }
            } else {
                # Efectivo (Bs o USD sin IGTF)
                $paid = [bool]$printer.SendCmd("101")
            }

            if (-not $paid) {
                # Fallback general
                $paid = [bool]$printer.SendCmd("101")
            }
            if (-not $paid) {
                $paid = [bool]$printer.SendCmd("199")
            }

            Start-Sleep -Milliseconds 250
            $stAfter = $printer.GetPrinterStatus()
            if ($stAfter.IsInInvoice) {
                $null = $printer.SendCmd("199")
            }

            if (-not $paid -and $stAfter.IsInInvoice) {
                $st = $printer.GetPrinterStatus()
                throw "Error totalizando pago en la impresora fiscal: $($st.PrinterErrorDescription)"
            }

            Start-Sleep -Seconds 2
            $lastInv = $null
            $dailySales = $null
            $closure = $null
            try {
                $s1 = $printer.GetS1PrinterData()
                if ($s1) {
                    $lastInv = $s1.LastInvoiceNumber
                    $dailySales = $s1.TotalDailySales
                    $closure = $s1.DailyClosureCounter
                }
            } catch {}

            Out-JsonResult @{ 
                success = $true
                message = "Factura fiscal emitida y registrada en memoria fiscal con exito."
                fiscalInvoiceNumber = $lastInv
                totalDailySales = $dailySales
                dailyClosureCounter = $closure
            }
        } catch {
            Out-JsonResult @{ success = $false; error = $_.Exception.Message }
        } finally {
            try { $printer.CloseFpctrl() } catch {}
        }
    }

    default {
        Out-JsonResult @{ success = $false; error = "Accion no reconocida: $Action" }
    }
}
