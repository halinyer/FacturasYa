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
            $zCounter = [int]$s1.DailyClosureCounter
            $auditCounter = [int]$s1.AuditReportsCounter
            # La DLL puede mapear los contadores distinto segun modelo/firmware: usamos el mayor como tope
            $totalZ = [Math]::Max($zCounter, $auditCounter)

            $diag = @{
                zCounter = $zCounter
                auditCounter = $auditCounter
                byDateCount = -1
                byNumberCount = -1
                byDateError = ""
                byNumberError = ""
                samples = @()
            }

            $inv = [System.Globalization.CultureInfo]::InvariantCulture
            $dStart = $null
            $dEnd = $null
            if ($StartDate) { try { $dStart = [DateTime]::ParseExact($StartDate, 'yyyy-MM-dd', $inv) } catch {} }
            if ($EndDate)   { try { $dEnd   = [DateTime]::ParseExact($EndDate,   'yyyy-MM-dd', $inv) } catch {} }

            $raw = @()

            # 1) Consulta por FECHA (comando U2 del SDK). Se pide 10 dias antes para conocer el Z anterior
            if ($dStart -and $dEnd -and $StartZ -le 0 -and $EndZ -le 0) {
                try {
                    $r = $printer.GetZReport($dStart.AddDays(-10), $dEnd)
                    if ($r) { $raw = @($r | Where-Object { $_ }) }
                    $diag.byDateCount = $raw.Count
                } catch {
                    $diag.byDateError = $_.Exception.Message
                }
            }

            # 2) Consulta por NUMERO de Z (comando U3 del SDK)
            if ($raw.Count -eq 0) {
                try {
                    $qs = 1
                    $qe = $totalZ + 1
                    if ($totalZ -le 0) { $qe = 200 }
                    if ($StartZ -gt 0) { $qs = [Math]::Max(1, $StartZ - 1) }
                    if ($EndZ -gt 0 -and $EndZ -ge $StartZ) {
                        if ($totalZ -gt 0 -and $EndZ -ge $totalZ) {
                            $qe = $totalZ + 1
                        } else {
                            $qe = $EndZ + 1
                        }
                    }
                    if (($qe - $qs) -gt 350) {
                        if ($qs -eq 1 -or $StartZ -eq 1) {
                            $qe = $qs + 350
                        } else {
                            $qs = [Math]::Max(1, $qe - 350)
                        }
                    }
                    $r = $printer.GetZReport($qs, $qe)
                    if ($r) { $raw = @($r | Where-Object { $_ }) }
                    $diag.byNumberCount = $raw.Count
                } catch {
                    $diag.byNumberError = $_.Exception.Message
                }
            }

            # Normalizar, ordenar, quitar duplicados
            $list = @()
            foreach ($item in $raw) {
                $zDt = $item.ZReportDate
                if (-not $zDt -or $zDt.Year -lt 2000) { $zDt = $item.LastInvoiceDate }
                if (-not $zDt -or $zDt.Year -lt 2000) { $zDt = [DateTime]::MinValue }

                $exempt = [Math]::Round([double]$item.FreeSalesTax, 2)
                $base16 = [Math]::Round([double]$item.GeneralRate1Sale, 2)
                $tax16  = [Math]::Round([double]$item.GeneralRate1Tax, 2)
                $base8  = [Math]::Round([double]$item.ReducedRate2Sale, 2)
                $tax8   = [Math]::Round([double]$item.ReducedRate2Tax, 2)
                $baseAdd = [Math]::Round([double]$item.AdditionalRate3Sale, 2)
                $taxAdd  = [Math]::Round([double]$item.AdditionalRate3Tax, 2)
                $totSales = [Math]::Round($exempt + $base16 + $tax16 + $base8 + $tax8 + $baseAdd + $taxAdd, 2)
                $devs = [Math]::Round([double]$item.FreeTaxDevolution + [double]$item.GeneralRateDevolution + [double]$item.GeneralRateTaxDevolution + [double]$item.ReducedRateDevolution + [double]$item.ReducedRateTaxDevolution, 2)

                $list += [pscustomobject]@{
                    zNumber = [int]$item.NumberOfLastZReport
                    zDt = $zDt
                    lastInvoiceNumber = [int]$item.NumberOfLastInvoice
                    exemptSalesBs = $exempt
                    baseGeneral16Bs = $base16
                    taxGeneral16Bs = $tax16
                    baseReduced8Bs = $base8
                    taxReduced8Bs = $tax8
                    baseAdditionalBs = $baseAdd
                    taxAdditionalBs = $taxAdd
                    totalSalesBs = $totSales
                    devolutionsBs = $devs
                    lastCreditNote = [int]$item.NumberOfLastCreditNote
                    lastDebitNote = [int]$item.NumberOfLastDebitNote
                    lastNonFiscal = [int]$item.NumberOfLastNonFiscal
                }
            }
            $list = @($list | Sort-Object zNumber -Unique)

            $diag.rawCount = $list.Count
            $sampleItems = @()
            foreach ($x in ($list | Select-Object -First 3)) { $sampleItems += ("Z" + $x.zNumber + " " + $x.zDt.ToString("yyyy-MM-dd") + " total=" + $x.totalSalesBs) }
            foreach ($x in ($list | Select-Object -Last 2)) { $sampleItems += ("Z" + $x.zNumber + " " + $x.zDt.ToString("yyyy-MM-dd") + " total=" + $x.totalSalesBs) }
            $diag.samples = @($sampleItems)

            # Serie (primera/ultima factura) de cada Z: la primera = ultima factura del Z anterior + 1
            $allReports = @()
            $prevLast = -1
            foreach ($x in $list) {
                $first = 0
                $count = 0
                if ($prevLast -ge 0) {
                    if ($x.lastInvoiceNumber -gt $prevLast) {
                        $first = $prevLast + 1
                        $count = $x.lastInvoiceNumber - $prevLast
                    } else {
                        $first = $x.lastInvoiceNumber
                        $count = 0
                    }
                } elseif ($x.zNumber -le 1) {
                    $first = 1
                    $count = $x.lastInvoiceNumber
                } else {
                    $first = 0
                    $count = 0
                }
                $prevLast = $x.lastInvoiceNumber

                $zDateStr = $x.zDt.ToString("yyyy-MM-dd")
                if ($StartDate -and $EndDate -and $StartZ -le 0 -and $EndZ -le 0) {
                    if ($zDateStr -lt $StartDate) { continue }
                    if ($zDateStr -gt $EndDate) { continue }
                } else {
                    if ($StartZ -gt 0 -and $x.zNumber -lt $StartZ) { continue }
                    if ($EndZ -gt 0 -and $x.zNumber -gt $EndZ) { continue }
                }

                $allReports += @{
                    zNumber = $x.zNumber
                    zDate = $zDateStr
                    zDateTime = $x.zDt.ToString("yyyy-MM-dd HH:mm:ss")
                    firstInvoiceNumber = $first
                    lastInvoiceNumber = $x.lastInvoiceNumber
                    invoiceCount = $count
                    exemptSalesBs = $x.exemptSalesBs
                    baseGeneral16Bs = $x.baseGeneral16Bs
                    taxGeneral16Bs = $x.taxGeneral16Bs
                    baseReduced8Bs = $x.baseReduced8Bs
                    taxReduced8Bs = $x.taxReduced8Bs
                    baseAdditionalBs = $x.baseAdditionalBs
                    taxAdditionalBs = $x.taxAdditionalBs
                    totalSalesBs = $x.totalSalesBs
                    devolutionsBs = $x.devolutionsBs
                    lastCreditNote = $x.lastCreditNote
                    lastDebitNote = $x.lastDebitNote
                    lastNonFiscal = $x.lastNonFiscal
                }
            }

            # Si el filtro por fecha no arrojó resultados pero la memoria fiscal sí contiene cierres Z
            $fallbackReports = @()
            if ($allReports.Count -eq 0 -and $list.Count -gt 0) {
                foreach ($x in $list) {
                    $fallbackReports += @{
                        zNumber = $x.zNumber
                        zDate = $x.zDt.ToString("yyyy-MM-dd")
                        zDateTime = $x.zDt.ToString("yyyy-MM-dd HH:mm:ss")
                        firstInvoiceNumber = 1
                        lastInvoiceNumber = $x.lastInvoiceNumber
                        invoiceCount = 0
                        exemptSalesBs = $x.exemptSalesBs
                        baseGeneral16Bs = $x.baseGeneral16Bs
                        taxGeneral16Bs = $x.taxGeneral16Bs
                        baseReduced8Bs = $x.baseReduced8Bs
                        taxReduced8Bs = $x.taxReduced8Bs
                        baseAdditionalBs = $x.baseAdditionalBs
                        taxAdditionalBs = $x.taxAdditionalBs
                        totalSalesBs = $x.totalSalesBs
                        devolutionsBs = $x.devolutionsBs
                        lastCreditNote = $x.lastCreditNote
                        lastDebitNote = $x.lastDebitNote
                        lastNonFiscal = $x.lastNonFiscal
                        isFallback = $true
                    }
                }
            }

            $printer.CloseFpctrl()

            $finalRecords = if ($allReports.Count -gt 0) { @($allReports) } else { @($fallbackReports) }

            $result = @{
                success = $true
                records = $finalRecords
                totalRecords = $finalRecords.Count
                matchedDateFilter = ($allReports.Count -gt 0)
                fallbackUsed = ($allReports.Count -eq 0 -and $fallbackReports.Count -gt 0)
                totalZInPrinter = $totalZ
                registeredMachineNumber = $s1.RegisteredMachineNumber
                rif = $s1.RIF
                currentPrinterDateTime = $s1.CurrentPrinterDateTime.ToString("yyyy-MM-dd HH:mm:ss")
                diagnostic = $diag
            }
            Write-Output ($result | ConvertTo-Json -Compress -Depth 6)
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
            $rawRif = if ($inv.clientCedula) { $inv.clientCedula } elseif ($inv.clientRif) { $inv.clientRif } else { "" }
            $cleanRif = ($rawRif -replace '[^A-Za-z0-9]', '').ToUpper()
            $rawName = if ($inv.clientName) { $inv.clientName } else { "" }
            $upperName = $rawName.Trim().ToUpper()

            # Si es venta anónima a Consumidor Final, según la Guía HKA (pág. 12),
            # NO se envían comandos iR* ni iS*, saliendo el ticket fiscal limpio directamente con los ítems.
            $isGenericRif = (-not $rawRif -or $cleanRif -eq "" -or $cleanRif -eq "0" -or $cleanRif -eq "V0" -or $cleanRif -eq "V00000000" -or $cleanRif -eq "V000000000")
            $isGenericName = (-not $rawName -or $upperName -eq "" -or $upperName -eq "CONSUMIDOR FINAL" -or $upperName -eq "CLIENTE GENERICO" -or $upperName -eq "CLIENTE GENERAL" -or $upperName -eq "MOSTRADOR")

            if (-not ($isGenericRif -and $isGenericName)) {
                $clientRifClean = if ($cleanRif) { $cleanRif } else { "V000000000" }
                $clientNameClean = Clean-Ascii $rawName
                if ($clientNameClean.Length -gt 40) { $clientNameClean = $clientNameClean.Substring(0, 40) }
                if (-not $clientNameClean) { $clientNameClean = "CONSUMIDOR FINAL" }

                $null = $printer.SendCmd("iR*$clientRifClean")
                $null = $printer.SendCmd("iS*$clientNameClean")

                if ($inv.clientAddress) {
                    $addrClean = Clean-Ascii $inv.clientAddress
                    if ($addrClean.Length -gt 40) { $addrClean = $addrClean.Substring(0, 40) }
                    if ($addrClean) {
                        $null = $printer.SendCmd("i01$addrClean")
                    }
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
