# -*- coding: utf-8 -*-
"""
Bridge Fiscal CLI para Impresoras Fiscales The Factory HKA (Venezuela).
Ejecutable autónomo sin dependencias externas para FacturaPOS.
"""
import sys
import os
import time
import json
import argparse
import datetime
import traceback
import serial
import serial.tools.list_ports

# Forzar codificación UTF-8 para stdout y stderr
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

# Importar el driver HKA V3
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from tfhka_v3 import TfhkaV3, decode_status_error, clean_fiscal_text
except ImportError:
    # Si se compila en un solo archivo con PyInstaller y está en el mismo paquete
    from .tfhka_v3 import TfhkaV3, decode_status_error, clean_fiscal_text

LOG_FILE_PATH = None

def get_default_log_path():
    """Calcula la ruta predeterminada para el archivo de registro en el pendrive o carpeta de la app."""
    if getattr(sys, 'frozen', False):
        # Ejecutable compilado por PyInstaller
        base_dir = os.path.dirname(sys.executable)
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Si estamos en resources, intentar subir un nivel para que quede en la raíz de FacturaPOS
    if os.path.basename(base_dir).lower() in ['resources', 'dist', 'fiscal_service']:
        parent = os.path.dirname(base_dir)
        if os.path.isdir(parent):
            base_dir = parent
            
    return os.path.join(base_dir, "registro_fiscal.log")

def log(msg, level="INFO"):
    """Escribe en el log persistente del pendrive y en stderr (nunca en stdout para no corromper el JSON)."""
    global LOG_FILE_PATH
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{now}] [{level}] {msg}"
    
    # Escribir en stderr para depuración en vivo
    try:
        sys.stderr.write(formatted + "\n")
        sys.stderr.flush()
    except Exception:
        pass
        
    # Escribir en el archivo de texto del pendrive
    target_path = LOG_FILE_PATH or get_default_log_path()
    try:
        with open(target_path, "a", encoding="utf-8", errors="replace") as f:
            f.write(formatted + "\n")
    except Exception as e:
        try:
            sys.stderr.write(f"[LOG ERROR] No se pudo escribir en {target_path}: {e}\n")
        except Exception:
            pass

def scan_ports(timeout=1.2, preferred_port=None):
    """
    Escanea todos los puertos COM disponibles y envía ENQ (0x05) a 9600 8E1.
    Si un puerto responde 5 bytes [STX (0x02), ST, ER, ETX (0x03), LRC] con LRC válido,
    se identifica como la impresora fiscal The Factory HKA.
    """
    log("Iniciando escaneo automático de puertos COM...", "SCAN")
    ports_info = serial.tools.list_ports.comports()
    available_ports = [p.device for p in ports_info]
    
    # Ordenar priorizando preferred_port, luego COM2..COM20, dejando COM1 al final (en caso de emulador en COM1<->COM2)
    def sort_key(p_name):
        if preferred_port and p_name.upper() == str(preferred_port).upper():
            return (0, 0)
        if p_name.upper() == "COM1":
            return (2, 1)
        try:
            num = int("".join(filter(str.isdigit, p_name)) or "99")
            return (1, num)
        except Exception:
            return (1, 99)

    available_ports.sort(key=sort_key)
    log(f"Puertos COM detectados en el sistema: {available_ports}", "SCAN")
    
    if not available_ports:
        return {
            "success": False,
            "activePort": None,
            "ports": [],
            "error": "No se detectó ningún puerto COM en la computadora. Verifique que el cable USB/Serial de la impresora esté conectado."
        }
        
    detected_port = None
    detected_status = None
    
    for port_name in available_ports:
        log(f"Probando puerto {port_name} con comando ENQ (0x05)...", "SCAN")
        ser = None
        try:
            ser = serial.Serial(
                port=port_name,
                baudrate=9600,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_EVEN,
                stopbits=serial.STOPBITS_ONE,
                timeout=timeout,
                write_timeout=timeout,
                xonxoff=False,
                rtscts=False
            )
            ser.rts = True
            ser.dtr = True
            ser.reset_input_buffer()
            ser.reset_output_buffer()
            ser.write(b"\x05")
            
            wait_start = time.time()
            while (time.time() - wait_start) < 0.45:
                if ser.in_waiting >= 5:
                    break
                time.sleep(0.03)
            
            # Esperar respuesta de 5 bytes [STX, ST, ER, ETX, LRC]
            resp = ser.read(5)
            time.sleep(0.12)
            ser.close()
            ser = None
            
            if len(resp) == 5 and resp[0] == 0x02 and resp[3] == 0x03:
                # Validar Checksum HKA: ST ^ ER ^ 0x03 == LRC
                st_byte = resp[1]
                er_byte = resp[2]
                lrc_byte = resp[4]
                lrc_calc = st_byte ^ er_byte ^ 0x03
                
                if lrc_calc == lrc_byte:
                    decoded = decode_status_error(st_byte, er_byte)
                    detected_port = port_name
                    detected_status = {
                        "port": port_name,
                        "raw_bytes": [int(x) for x in resp],
                        **decoded
                    }
                    log(f"¡Impresora fiscal HKA DETECTADA en {port_name}! Estado: {decoded.get('status_desc')} | Error: {decoded.get('error_desc')}", "SCAN")
                    break
                else:
                    log(f"Puerto {port_name} respondió trama pero falló checksum (calc {lrc_calc} != {lrc_byte})", "SCAN")
            else:
                log(f"Puerto {port_name}: sin respuesta válida a ENQ ({len(resp)} bytes recibidos)", "SCAN")
        except Exception as e:
            log(f"Puerto {port_name}: no disponible o bloqueado ({str(e)})", "SCAN")
            if ser and getattr(ser, 'is_open', False):
                try:
                    ser.close()
                except Exception:
                    pass

    if detected_port:
        return {
            "success": True,
            "activePort": detected_port,
            "port": detected_port,
            "ports": available_ports,
            "status": detected_status
        }
    else:
        return {
            "success": False,
            "activePort": None,
            "ports": available_ports,
            "error": f"Se detectaron puertos COM ({', '.join(available_ports)}), pero la impresora fiscal no respondió al comando ENQ. Asegúrese de que esté encendida y con el cable bien conectado."
        }

def resolve_working_port(preferred_port):
    """
    Verifica rápidamente si la impresora responde en preferred_port.
    Si no responde (ej. Windows cambió el puerto USB-Serial o estaba desconfigurado),
    auto-detecta silenciosamente en todos los puertos COM para que el cajero NUNCA
    tenga que presionar 'Auto-Detectar' manualmente.
    """
    target = (preferred_port or "COM2").strip().upper()
    driver = TfhkaV3(port=target, baudrate=9600)
    st = driver.read_fp_status()
    driver.close_port()
    if st.get("connected"):
        return target

    log(f"Puerto configurado {target} no respondió. Ejecutando auto-detección inteligente de puerto COM...", "AUTO-PORT")
    scan_res = scan_ports(timeout=1.0, preferred_port=target)
    if scan_res.get("success") and scan_res.get("activePort"):
        found = scan_res["activePort"]
        log(f"¡Auto-detección exitosa! Cambiando automáticamente de {target} -> {found}", "AUTO-PORT")
        return found
    return target

def read_status_action(port):
    """Consulta el estado actual de la impresora en el puerto dado."""
    log(f"Consultando estado en {port}...", "STATUS")
    driver = TfhkaV3(port=port, baudrate=9600)
    driver.debug = True
    status = driver.read_fp_status()
    driver.close_port()
    log(f"Resultado estado en {port}: conectado={status.get('connected')} | {status.get('status_desc')} | {status.get('error_desc')}", "STATUS")
    return {
        "success": status.get("connected", False),
        "data": status
    }

def append_audit_event(event_type, details):
    """Guarda un registro estructurado en auditoria_fiscal.json junto al log."""
    try:
        log_path = LOG_FILE_PATH or get_default_log_path()
        audit_path = os.path.join(os.path.dirname(log_path), "auditoria_fiscal.json")
        events = []
        if os.path.exists(audit_path):
            try:
                with open(audit_path, "r", encoding="utf-8") as f:
                    events = json.load(f)
                if not isinstance(events, list):
                    events = []
            except Exception:
                events = []
        entry = {
            "timestamp": datetime.datetime.now().isoformat(),
            "event": event_type,
            **(details if isinstance(details, dict) else {"info": str(details)})
        }
        events.append(entry)
        # Mantener últimos 1000 eventos de auditoría
        if len(events) > 1000:
            events = events[-1000:]
        with open(audit_path, "w", encoding="utf-8") as f:
            json.dump(events, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log(f"Error guardando auditoria_fiscal.json: {e}", "WARN")

def read_s1_action(port):
    """Consulta el estado S1 (RIF, última factura, documentos no fiscales/anulados, etc.) en el puerto dado."""
    log(f"Consultando S1 en {port}...", "S1")
    driver = TfhkaV3(port=port, baudrate=9600)
    driver.debug = True
    s1 = driver.get_s1_status()
    driver.close_port()
    log(
        f"Resultado S1 en {port}: éxito={s1.get('success')} | RIF={s1.get('rif')} | "
        f"Ult Factura={s1.get('last_invoice_number')} | Facturas Hoy={s1.get('quantity_of_invoices_today')} | "
        f"No Fiscales/Anuladas Hoy={s1.get('quantity_non_fiscal_today')}",
        "S1"
    )
    return s1

def audit_action(port):
    """
    Auditoría completa de la máquina fiscal (ENQ + S1 + S2 + U0X electrónico sin gastar papel).
    Permite al sistema POS saber exactamente cuántas facturas válidas, cuántas anuladas/DNF,
    y cuánto dinero lleva acumulado la memoria de trabajo de la máquina fiscal hoy.
    """
    log(f"Ejecutando auditoría fiscal completa (ENQ + S1 + S2 + U0X) en {port}...", "AUDIT")
    driver = TfhkaV3(port=port, baudrate=9600)
    driver.debug = True
    st = driver.read_fp_status()
    if not st.get("connected"):
        driver.close_port()
        return {
            "success": False,
            "connected": False,
            "error": st.get("error_desc", f"Impresora no conectada en {port}"),
            "status": st
        }
    is_open_tx = bool(st.get("is_in_invoice") or st.get("is_in_non_fiscal"))
    s1 = driver.get_s1_status(allow_u0x_fallback=not is_open_tx)
    s2 = driver.get_s2_status() if st.get("is_in_invoice") else {"success": True, "is_open": False}
    if is_open_tx:
        u0x = {"success": False, "skipped": True, "reason": "Transacción fiscal en curso (U0X omitido para preservar estado S2)"}
    else:
        u0x = s1.get("u0x") if isinstance(s1.get("u0x"), dict) else driver.get_x_report_data()
    driver.close_port()

    log(
        f"Auditoría en {port}: Facturas Hoy={s1.get('quantity_of_invoices_today')} | "
        f"DNF/Anuladas Hoy={s1.get('quantity_non_fiscal_today')} | "
        f"Ventas Día S1={s1.get('total_daily_sales')} Bs | Total U0X={u0x.get('total_accumulated_bs')} Bs",
        "AUDIT"
    )
    return {
        "success": True,
        "connected": True,
        "port": port,
        "status": st,
        "s1": s1,
        "s2": s2,
        "u0x": u0x
    }

def test_connection_action(port):
    """Prueba completa de conexión: estado ENQ + consulta S1."""
    log(f"Iniciando prueba de conexión completa en {port}...", "TEST")
    driver = TfhkaV3(port=port, baudrate=9600)
    driver.debug = True
    st = driver.read_fp_status()
    if not st.get("connected"):
        driver.close_port()
        log(f"Prueba fallida en {port}: {st.get('error_desc')}", "TEST")
        return {
            "success": False,
            "error": f"No se pudo conectar a la impresora fiscal en {port}: {st.get('error_desc')}",
            "status": st
        }
        
    s1 = driver.get_s1_status()
    driver.close_port()
    
    log(f"Prueba exitosa en {port}! RIF: {s1.get('rif')}, Ult Factura: {s1.get('last_invoice_number')}", "TEST")
    return {
        "success": True,
        "message": f"Impresora fiscal conectada en {port} - {st.get('status_desc')}",
        "status": st,
        "s1": s1
    }

def invoice_action(port, invoice_data):
    """Emite una factura fiscal completa usando TfhkaV3 y respalda auditoría completa."""
    log(f"Emitiendo factura en {port}...", "INVOICE")
    client_name = invoice_data.get("clientName", "CONSUMIDOR FINAL")
    client_rif = (
        invoice_data.get("clientRif")
        or invoice_data.get("clientCedula")
        or invoice_data.get("clientDocument")
        or "V00000000"
    )
    items_count = len(invoice_data.get("items", []))
    pos_inv_id = invoice_data.get("id") or invoice_data.get("invoiceNumber") or ""
    log(f"Factura POS #{pos_inv_id} para: {client_name} ({client_rif}) con {items_count} productos.", "INVOICE")
    
    driver = TfhkaV3(port=port, baudrate=9600)
    driver.debug = True
    res = driver.print_invoice(invoice_data)
    driver.close_port()
    
    if res.get("success"):
        log(f"¡Factura emitida exitosamente en {port}! Número fiscal SENIAT: {res.get('invoiceNumber')}", "INVOICE")
        append_audit_event("INVOICE_SUCCESS", {
            "port": port,
            "posInvoiceId": pos_inv_id,
            "fiscalInvoiceNumber": res.get("fiscalInvoiceNumber"),
            "clientName": client_name,
            "clientRif": client_rif,
            "totalBs": invoice_data.get("totalBs"),
            "totalUSD": invoice_data.get("totalUSD"),
            "s1_after": res.get("s1")
        })
    else:
        log(
            f"ALERTA: Fallo/Anulación emitiendo factura en {port}: {res.get('error')} | "
            f"Anulada={res.get('wasAnnulled')} | Razón={res.get('annulReason')}",
            "ERROR"
        )
        append_audit_event("INVOICE_FAILED_OR_ANNULLED", {
            "port": port,
            "posInvoiceId": pos_inv_id,
            "wasAnnulled": res.get("wasAnnulled", False),
            "annulReason": res.get("annulReason") or res.get("error"),
            "error": res.get("error"),
            "clientName": client_name,
            "clientRif": client_rif,
            "totalBs": invoice_data.get("totalBs"),
            "totalUSD": invoice_data.get("totalUSD"),
            "s1_after": res.get("s1")
        })
    return res

def report_x_action(port):
    """Emite un Reporte X en el puerto dado."""
    log(f"Emitiendo Reporte X en {port}...", "REPORT-X")
    driver = TfhkaV3(port=port, baudrate=9600)
    driver.debug = True
    ok, msg = driver.print_report_x()
    s1 = driver.get_s1_status() if ok else {}
    driver.close_port()
    log(f"Reporte X en {port}: éxito={ok} | {msg}", "REPORT-X")
    append_audit_event("REPORT_X", {"port": port, "success": ok, "message": msg, "s1": s1})
    return {"success": ok, "message": msg, "s1": s1, "error": None if ok else msg}

def report_z_action(port):
    """Emite un Reporte Z en el puerto dado."""
    log(f"Emitiendo Reporte Z en {port}...", "REPORT-Z")
    driver = TfhkaV3(port=port, baudrate=9600)
    driver.debug = True
    s1_before = driver.get_s1_status()
    ok, msg = driver.print_report_z()
    s1_after = driver.get_s1_status() if ok else {}
    driver.close_port()
    log(f"Reporte Z en {port}: éxito={ok} | {msg}", "REPORT-Z")
    append_audit_event("REPORT_Z", {
        "port": port,
        "success": ok,
        "message": msg,
        "s1_before": s1_before,
        "s1_after": s1_after
    })
    return {"success": ok, "message": msg, "s1_before": s1_before, "s1": s1_after, "error": None if ok else msg}

def cancel_action(port):
    """Cancela cualquier factura abierta en el puerto dado."""
    log(f"Cancelando documento pendiente con '7' en {port}...", "CANCEL")
    driver = TfhkaV3(port=port, baudrate=9600)
    driver.debug = True
    ok, msg = driver.cancel_open_invoice()
    s1 = driver.get_s1_status()
    driver.close_port()
    log(f"Cancelación en {port}: éxito={ok} | {msg}", "CANCEL")
    append_audit_event("MANUAL_CANCEL_7", {"port": port, "success": ok, "message": msg, "s1": s1})
    return {"success": ok, "message": msg, "s1": s1, "error": None if ok else msg}

def get_log_action(max_lines=150):
    """Lee las últimas líneas del archivo de log y los eventos de auditoria_fiscal.json."""
    target_path = LOG_FILE_PATH or get_default_log_path()
    audit_path = os.path.join(os.path.dirname(target_path), "auditoria_fiscal.json")
    audit_events = []
    if os.path.exists(audit_path):
        try:
            with open(audit_path, "r", encoding="utf-8") as af:
                audit_events = json.load(af)
        except Exception:
            audit_events = []

    if not os.path.exists(target_path):
        return {"success": True, "log": "No hay registros fiscales previos.", "path": target_path, "auditEvents": audit_events[-50:]}
    try:
        with open(target_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
        tail = "".join(lines[-max_lines:])
        return {"success": True, "log": tail, "path": target_path, "auditEvents": audit_events[-50:]}
    except Exception as e:
        return {"success": False, "error": str(e), "path": target_path, "auditEvents": audit_events[-50:]}

def main():
    global LOG_FILE_PATH
    parser = argparse.ArgumentParser(description="Bridge Fiscal The Factory HKA CLI")
    parser.add_argument("--action", required=True, 
                        choices=["scan", "status", "s1", "audit", "test", "invoice", "report-x", "report-z", "cancel", "get-log"],
                        help="Acción fiscal a ejecutar")
    parser.add_argument("--port", default="COM2", help="Puerto COM a utilizar (ej. COM2, COM3)")
    parser.add_argument("--json", help="Payload JSON en línea para facturas")
    parser.add_argument("--file", help="Ruta a archivo JSON con payload de factura")
    parser.add_argument("--log-file", help="Ruta personalizada para el archivo de bitácora")
    
    args = parser.parse_args()
    
    if args.log_file:
        LOG_FILE_PATH = os.path.abspath(args.log_file)
        
    result = None
    try:
        if args.action == "scan":
            result = scan_ports(preferred_port=args.port)
        elif args.action == "get-log":
            result = get_log_action()
        else:
            # Auto-resolver puerto activo si el puerto configurado cambió o no responde
            active_port = resolve_working_port(args.port)
            if args.action == "status":
                result = read_status_action(active_port)
            elif args.action == "s1":
                result = read_s1_action(active_port)
            elif args.action == "audit":
                result = audit_action(active_port)
            elif args.action == "test":
                result = test_connection_action(active_port)
            elif args.action == "report-x":
                result = report_x_action(active_port)
            elif args.action == "report-z":
                result = report_z_action(active_port)
            elif args.action == "cancel":
                result = cancel_action(active_port)
            elif args.action == "invoice":
                payload = None
                if args.file and os.path.exists(args.file):
                    with open(args.file, "r", encoding="utf-8-sig") as f:
                        payload = json.load(f)
                elif args.json:
                    payload = json.loads(args.json)
                else:
                    result = {"success": False, "error": "Debe especificar --json o --file para emitir una factura."}
                    
                if payload is not None:
                    result = invoice_action(active_port, payload)

            if isinstance(result, dict):
                result["activePort"] = active_port
                if not result.get("port"):
                    result["port"] = active_port
    except Exception as e:
        err_msg = f"Excepción fatal en bridge fiscal [{args.action}]: {str(e)}"
        log(err_msg, "CRITICAL")
        log(traceback.format_exc(), "CRITICAL")
        result = {"success": False, "error": err_msg, "traceback": traceback.format_exc()}

    # Imprimir estrictamente JSON en stdout
    try:
        sys.stdout.write(json.dumps(result, ensure_ascii=False))
        sys.stdout.flush()
    except Exception as e:
        sys.stdout.write(json.dumps({"success": False, "error": f"Error serializando JSON de salida: {e}"}))
        sys.stdout.flush()

if __name__ == "__main__":
    main()
