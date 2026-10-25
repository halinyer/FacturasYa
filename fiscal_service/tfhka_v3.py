import functools
import sys
# Redirect all internal module prints to sys.stderr so sys.stdout remains pure JSON for Electron
print = functools.partial(print, file=sys.stderr)
# -*- coding: utf-8 -*-
"""
Driver oficial The Factory HKA adaptado a Python 3 moderno.
Manejo de protocolo fiscal serie RS232 para impresoras HKA Venezuela (HKA80 / SRP350) y emulador VFPHKA.
Incluye soporte completo para Flag 50=01 (IGTF Comando 199 obligatorio), S1 de 12 y 16 campos, S2 y U0X.
"""
import serial
import serial.tools.list_ports
import time
import operator
import unicodedata
import re
import threading


def clean_fiscal_text(s: str, max_len: int = 38) -> str:
    """Normaliza tildes y caracteres especiales según el estándar fiscal HKA (sin # ni * que colisionen con tramas)."""
    if not s:
        return ""
    norm = unicodedata.normalize('NFKD', str(s))
    ascii_str = norm.encode('ASCII', 'ignore').decode('ASCII')
    cleaned = re.sub(r"[^A-Za-z0-9\s\.\,\-\_\/\(\)\:]", "", ascii_str).strip().upper()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned[:max_len]


def do_value_double(val_str: str) -> float:
    """Convierte cadenas numéricas HKA con 2 decimales implícitos a float (equivalente a DoValueDouble del SDK)."""
    try:
        s = re.sub(r"[^0-9\-]", "", str(val_str or "0").strip())
        if not s or s == "-":
            return 0.0
        return int(s) / 100.0
    except Exception:
        return 0.0


def decode_status_error(st_raw: int, er_raw: int):
    st_aux = st_raw
    st = st_raw & ~0x04

    if (st & 0x6A) == 0x6A:
        status_desc = "En modo fiscal, carga completa de memoria fiscal y emisión doc no fiscal"
        status_code = 12
    elif (st & 0x69) == 0x69:
        status_desc = "En modo fiscal, carga completa de memoria fiscal y emisión doc fiscal"
        status_code = 11
    elif (st & 0x68) == 0x68:
        status_desc = "En modo fiscal, carga completa de memoria fiscal y en espera"
        status_code = 10
    elif (st & 0x72) == 0x72:
        status_desc = "En modo fiscal, cercana carga completa y emisión doc no fiscal"
        status_code = 9
    elif (st & 0x71) == 0x71:
        status_desc = "En modo fiscal, cercana carga completa y emisión doc fiscal"
        status_code = 8
    elif (st & 0x70) == 0x70:
        status_desc = "En modo fiscal, cercana carga completa y en espera"
        status_code = 7
    elif (st & 0x62) == 0x62:
        status_desc = "En modo fiscal y en emisión de doc no fiscal"
        status_code = 6
    elif (st & 0x61) == 0x61:
        status_desc = "En modo fiscal y en emisión de doc fiscal"
        status_code = 5
    elif (st & 0x60) == 0x60:
        status_desc = "En modo fiscal y en espera"
        status_code = 4
    elif (st & 0x42) == 0x42:
        status_desc = "En modo prueba y en emisión de doc no fiscal"
        status_code = 3
    elif (st & 0x41) == 0x41:
        status_desc = "En modo prueba y en emisión de doc fiscal"
        status_code = 2
    elif (st & 0x40) == 0x40:
        status_desc = "En modo prueba y en espera"
        status_code = 1
    else:
        status_desc = "Estado desconocido"
        status_code = 0

    if (er_raw & 0x6C) == 0x6C:
        error_desc = "Memoria fiscal llena"
        error_code = 108
    elif (er_raw & 0x64) == 0x64:
        error_desc = "Error en memoria fiscal"
        error_code = 100
    elif (er_raw & 0x60) == 0x60:
        error_desc = "Error fiscal"
        error_code = 96
    elif (er_raw & 0x5C) == 0x5C:
        error_desc = "Comando inválido"
        error_code = 92
    elif (er_raw & 0x58) == 0x58:
        error_desc = "No hay asignadas directivas"
        error_code = 88
    elif (er_raw & 0x54) == 0x54:
        error_desc = "Tasa inválida"
        error_code = 84
    elif (er_raw & 0x50) == 0x50:
        error_desc = "Comando inválido / Valor inválido"
        error_code = 80
    elif (er_raw & 0x43) == 0x43:
        error_desc = "Fin en la entrega de papel y error mecánico"
        error_code = 3
    elif (er_raw & 0x42) == 0x42:
        error_desc = "Error mecánico en la entrega de papel"
        error_code = 2
    elif (er_raw & 0x41) == 0x41:
        error_desc = "Fin en la entrega de papel"
        error_code = 1
    elif (er_raw & 0x40) == 0x40:
        error_desc = "Sin error"
        error_code = 0
    elif (st_aux & 0x04) == 0x04:
        error_desc = "Buffer completo"
        error_code = 112
    elif er_raw == 128:
        error_desc = "Error de comunicación (CTS)"
        error_code = 128
    elif er_raw == 137:
        error_desc = "Sin respuesta"
        error_code = 137
    else:
        error_desc = f"Error {er_raw}"
        error_code = er_raw

    has_paper = error_code not in [1, 2, 3]
    in_fiscal = status_code in [4, 5, 6, 7, 8, 9, 10, 11, 12]
    is_in_invoice = status_code in [2, 5, 8, 11]
    is_in_non_fiscal = status_code in [3, 6, 9, 12]
    is_ready = (error_code == 0 and status_code in [1, 4, 7])

    return {
        "status_code": status_code,
        "error_code": error_code,
        "status_desc": status_desc,
        "error_desc": error_desc,
        "has_paper": has_paper,
        "in_fiscal_mode": in_fiscal,
        "is_in_invoice": is_in_invoice,
        "is_in_non_fiscal": is_in_non_fiscal,
        "is_ready": is_ready
    }


class TfhkaV3:
    def __init__(self, port="COM2", baudrate=9600):
        self.port = port
        self.baudrate = baudrate
        self.ser = None
        self.is_connected = False
        self.lock = threading.RLock()
        self.debug = True

    def open_port(self, port=None):
        with self.lock:
            if port:
                self.port = port
            if self.ser and self.ser.is_open:
                try:
                    self.ser.close()
                except Exception:
                    pass
                self.is_connected = False

            try:
                self.ser = serial.Serial(
                    port=self.port,
                    baudrate=self.baudrate,
                    bytesize=serial.EIGHTBITS,
                    parity=serial.PARITY_EVEN,
                    stopbits=serial.STOPBITS_ONE,
                    timeout=1.5,
                    write_timeout=3.0,
                    xonxoff=False,
                    rtscts=False
                )
                self.ser.rts = True
                self.ser.dtr = True
                self.is_connected = True
                return True, f"Puerto {self.port} abierto exitosamente."
            except Exception as e:
                self.is_connected = False
                return False, f"Error abriendo puerto {self.port}: {str(e)}"

    def close_port(self):
        with self.lock:
            if self.ser and self.ser.is_open:
                try:
                    self.ser.close()
                except Exception:
                    pass
            self.is_connected = False
            return True, f"Puerto {self.port} cerrado."

    def _handle_cts(self):
        """Maneja el apretón de manos CTS/RTS según el estándar HKA."""
        if not self.ser or not self.ser.is_open:
            return False
        try:
            self.ser.rts = True
            wait_count = 0
            while not self.ser.cts and wait_count < 15:
                time.sleep(0.05)
                wait_count += 1
            return True
        except Exception:
            return True

    def _calc_lrc(self, data_bytes: bytes) -> int:
        """Calcula el checksum XOR longitudinal (LRC)."""
        return functools.reduce(operator.xor, data_bytes, 0)

    def _assemble_frame(self, cmd_str: str) -> bytes:
        """Empaqueta trama: STX (0x02) + CMD + ETX (0x03) + LRC."""
        cmd_bytes = cmd_str.encode("latin-1", errors="replace")
        payload = cmd_bytes + b"\x03"
        lrc = self._calc_lrc(payload)
        return b"\x02" + payload + bytes([lrc])

    def read_fp_status(self):
        """Consulta estado con ENQ (0x05) y decodifica la respuesta de 5 bytes según SDK oficial."""
        with self.lock:
            if not self.ser or not self.ser.is_open:
                ok, msg = self.open_port()
                if not ok:
                    return {
                        "connected": False,
                        "status_code": 0,
                        "error_code": 128,
                        "status_desc": "Desconectado",
                        "error_desc": msg,
                        "has_paper": False,
                        "in_fiscal_mode": False,
                        "is_in_invoice": False,
                        "is_ready": False
                    }

            try:
                self.ser.reset_input_buffer()
                self.ser.reset_output_buffer()
                self._handle_cts()
                self.ser.write(b"\x05")
                # El emulador HKA hace Thread.sleep(100ms) en serialEvent antes de leer el byte ENQ
                wait_enq = time.time()
                while (time.time() - wait_enq) < 0.45:
                    if self.ser.in_waiting >= 5:
                        break
                    time.sleep(0.03)
                resp = self.ser.read(5)
                time.sleep(0.12)  # Pausa de guarda para evitar colisión con la siguiente trama

                if len(resp) == 5:
                    b_stx, st_raw, er_raw, b_etx, lrc = resp[0], resp[1], resp[2], resp[3], resp[4]
                    decoded = decode_status_error(st_raw, er_raw)
                    return {
                        "connected": True,
                        "port": self.port,
                        "raw_bytes": [int(x) for x in resp],
                        **decoded
                    }
                else:
                    return {
                        "connected": False,
                        "port": self.port,
                        "status_code": 0,
                        "error_code": 137,
                        "status_desc": "Sin respuesta",
                        "error_desc": f"La impresora en {self.port} no respondió al comando ENQ.",
                        "has_paper": False,
                        "in_fiscal_mode": False,
                        "is_in_invoice": False,
                        "is_ready": False
                    }
            except Exception as e:
                return {
                    "connected": False,
                    "port": self.port,
                    "status_code": 0,
                    "error_code": 128,
                    "status_desc": "Error de comunicación",
                    "error_desc": str(e),
                    "has_paper": False,
                    "in_fiscal_mode": False,
                    "is_in_invoice": False,
                    "is_ready": False
                }

    def send_cmd(self, cmd_str: str, timeout_sec=12.0) -> (bool, str):
        """
        Envía un comando empaquetado y espera ACK (0x06).
        El timeout predeterminado de 12.0s evita que la impresora física HKA80 dé falso timeout
        mientras imprime las 8 líneas del encabezado + datos del cliente en el primer ítem.
        """
        with self.lock:
            if not self.ser or not self.ser.is_open:
                ok, msg = self.open_port()
                if not ok:
                    return False, msg

            try:
                self.ser.reset_input_buffer()
                self.ser.reset_output_buffer()
                self._handle_cts()

                frame = self._assemble_frame(cmd_str)
                if self.debug:
                    print(f"[Fiscal] TX >>> {repr(cmd_str)}")

                self.ser.write(frame)

                start_time = time.time()
                resp = b""
                while (time.time() - start_time) < timeout_sec:
                    if self.ser.in_waiting > 0:
                        b = self.ser.read(1)
                        if b == b"\x06":  # ACK
                            if self.debug:
                                print(f"[Fiscal] RX <<< ACK (0x06)")
                            time.sleep(0.12)
                            return True, "ACK"
                        elif b == b"\x15":  # NAK
                            if self.debug:
                                print(f"[Fiscal] RX <<< NAK (0x15) en comando {repr(cmd_str)}")
                            st_nak = self.read_fp_status()
                            err_detail = st_nak.get("error_desc", "Comando rechazado")
                            return False, f"NAK: {err_detail} (Código {st_nak.get('error_code', 0)})"
                        resp += b
                    time.sleep(0.02)

                if resp:
                    if self.debug:
                        print(f"[Fiscal] RX <<< Resp: {repr(resp)}")
                    if b"\x06" in resp or b"\x03" in resp:
                        return True, "ACK"
                    return False, f"Respuesta inesperada: {repr(resp)}"

                # Si expiró el tiempo esperando el byte ACK pero la impresora estaba ocupada imprimiendo físicamente,
                # verificamos con ENQ si el estado es Sin Error (error_code == 0).
                if self.debug:
                    print(f"[Fiscal] Timeout parcial esperando ACK para {repr(cmd_str)}. Verificando estado ENQ...")
                time.sleep(0.25)
                st_check = self.read_fp_status()
                if st_check.get("connected") and st_check.get("error_code") == 0 and st_check.get("has_paper"):
                    if self.debug:
                        print(f"[Fiscal] ENQ confirmó estado sin error ({st_check.get('status_desc')}) tras {repr(cmd_str)}. Continuando.")
                    return True, "ACK_BY_ENQ"

                err_msg = st_check.get("error_desc") or f"Timeout esperando ACK para {repr(cmd_str)}"
                return False, err_msg
            except Exception as e:
                return False, f"Excepción en envío de comando: {str(e)}"

    def _query_status_frame(self, cmd_str: str, timeout_sec=5.0):
        """Envía comando de consulta (S1, S2, S3, S5, U0X) y retorna la trama limpia separada por LF (0x0A)."""
        with self.lock:
            if not self.ser or not self.ser.is_open:
                ok, msg = self.open_port()
                if not ok:
                    return False, msg, []

            try:
                self.ser.reset_input_buffer()
                self.ser.reset_output_buffer()
                self._handle_cts()

                frame = self._assemble_frame(cmd_str)
                self.ser.write(frame)

                start_time = time.time()
                buf = b""
                enq_acked = False
                while (time.time() - start_time) < timeout_sec:
                    if self.ser.in_waiting > 0:
                        chunk = self.ser.read(self.ser.in_waiting)
                        buf += chunk
                        # Para U0X, la impresora envía ENQ (0x05) primero y espera ACK (0x06) para descargar
                        if b"\x05" in buf and not enq_acked and b"\x02" not in buf:
                            time.sleep(0.14)
                            self.ser.write(b"\x06")
                            enq_acked = True
                            buf = b""
                            continue
                        if b"\x03" in buf:
                            # Esperar 1 byte más para el LRC si aún no llegó
                            if buf[-1] == 0x03:
                                time.sleep(0.05)
                                if self.ser.in_waiting > 0:
                                    buf += self.ser.read(self.ser.in_waiting)
                            time.sleep(0.14)
                            break
                        if b"\x15" in buf and b"\x02" not in buf:
                            return False, f"NAK recibido para consulta {cmd_str}", []
                    time.sleep(0.04)

                if not buf:
                    return False, f"No hubo respuesta para consulta {cmd_str}", []

                clean_str = buf.decode("latin-1", errors="ignore")
                if "\x02" in clean_str:
                    clean_str = clean_str.split("\x02", 1)[1]
                if "\x03" in clean_str:
                    clean_str = clean_str.split("\x03", 1)[0]
                parts = clean_str.split("\x0a")
                return True, clean_str, parts
            except Exception as e:
                return False, str(e), []

    def get_s1_status(self, allow_u0x_fallback=True):
        """
        Consulta el estado S1 (Manual HKA V8.5.0 Págs. 55-56).
        Soporta automáticamente tanto la trama HKA80 de 16 campos (con Notas de Débito)
        como la trama estándar/emulador de 12-14 campos.
        """
        ok, raw_or_err, parts = self._query_status_frame("S1", timeout_sec=5.0)
        if not ok:
            return {"success": False, "error": raw_or_err}

        try:
            if len(parts) < 10:
                return {"success": True, "raw": raw_or_err, "raw_parts": parts}

            cashier = parts[0][2:].strip() if len(parts[0]) > 2 else parts[0].strip()
            total_daily_sales_bs = do_value_double(parts[1])
            last_inv = int(re.sub(r"[^0-9]", "", parts[2]) or "0")
            qty_inv_today = int(re.sub(r"[^0-9]", "", parts[3]) or "0")

            # Detectar dinámicamente si es formato de 16 campos (HKA80 donde RIF está en índice 12)
            # o formato de 12-14 campos (donde RIF está en índice 8 o 10)
            if len(parts) >= 15:
                # HKA80 16 campos (Manual Pág. 55-56):
                # 0:Cajero, 1:VentasDia, 2:UltFactura, 3:CantFacturasHoy,
                # 4:UltND, 5:CantNDHoy, 6:UltNC, 7:CantNCHoy,
                # 8:UltDNF, 9:CantDNFHoy, 10:ContadorZ, 11:ContadorRepFiscales,
                # 12:RIF, 13:SerialMaquina, 14:Hora, 15:Fecha
                last_nd = int(re.sub(r"[^0-9]", "", parts[4]) or "0")
                qty_nd_today = int(re.sub(r"[^0-9]", "", parts[5]) or "0")
                last_nc = int(re.sub(r"[^0-9]", "", parts[6]) or "0")
                qty_nc_today = int(re.sub(r"[^0-9]", "", parts[7]) or "0")
                last_dnf = int(re.sub(r"[^0-9]", "", parts[8]) or "0")
                qty_dnf_today = int(re.sub(r"[^0-9]", "", parts[9]) or "0")
                z_counter = int(re.sub(r"[^0-9]", "", parts[10]) or "0")
                fiscal_rep_counter = int(re.sub(r"[^0-9]", "", parts[11]) or "0")
                rif = parts[12].strip()
                machine_serial = parts[13].strip()
                printer_time = parts[14].strip() if len(parts) > 14 else ""
                printer_date = parts[15].strip() if len(parts) > 15 else ""
            elif len(parts) >= 13 and re.match(r"^[VEJGPCvejgpc]", parts[10].strip()):
                # 14 campos (sin ND):
                # 4:UltNC, 5:CantNCHoy, 6:UltDNF, 7:CantDNFHoy, 8:ContadorZ, 9:ContadorRepFiscales, 10:RIF, 11:Serial, 12:Hora, 13:Fecha
                last_nd = 0
                qty_nd_today = 0
                last_nc = int(re.sub(r"[^0-9]", "", parts[4]) or "0")
                qty_nc_today = int(re.sub(r"[^0-9]", "", parts[5]) or "0")
                last_dnf = int(re.sub(r"[^0-9]", "", parts[6]) or "0")
                qty_dnf_today = int(re.sub(r"[^0-9]", "", parts[7]) or "0")
                z_counter = int(re.sub(r"[^0-9]", "", parts[8]) or "0")
                fiscal_rep_counter = int(re.sub(r"[^0-9]", "", parts[9]) or "0")
                rif = parts[10].strip()
                machine_serial = parts[11].strip()
                printer_time = parts[12].strip() if len(parts) > 12 else ""
                printer_date = parts[13].strip() if len(parts) > 13 else ""
            else:
                # 12 campos (Emulador clásico):
                # 4:UltDNF, 5:CantDNFHoy, 6:ContadorZ, 7:ContadorRepFiscales, 8:RIF, 9:Serial, 10:Hora, 11:Fecha
                last_nd = 0
                qty_nd_today = 0
                last_nc = 0
                qty_nc_today = 0
                last_dnf = int(re.sub(r"[^0-9]", "", parts[4]) or "0")
                qty_dnf_today = int(re.sub(r"[^0-9]", "", parts[5]) or "0")
                z_counter = int(re.sub(r"[^0-9]", "", parts[6]) or "0")
                fiscal_rep_counter = int(re.sub(r"[^0-9]", "", parts[7]) or "0")
                rif = parts[8].strip() if len(parts) > 8 else ""
                machine_serial = parts[9].strip() if len(parts) > 9 else ""
                printer_time = parts[10].strip() if len(parts) > 10 else ""
                printer_date = parts[11].strip() if len(parts) > 11 else ""

            # En el Emulador VFPHKA (o modelos donde S1 devuelve 0 en last_invoice_number),
            # enriquecemos automáticamente con U0X cuando no hay factura abierta en curso.
            u0x_cached = None
            if last_inv == 0 and allow_u0x_fallback:
                time.sleep(0.15)
                u0x_fallback = self.get_x_report_data()
                if u0x_fallback.get("success"):
                    u0x_cached = u0x_fallback
                    if u0x_fallback.get("last_invoice_number", 0) > 0:
                        last_inv = u0x_fallback["last_invoice_number"]
                    if total_daily_sales_bs == 0.0 and u0x_fallback.get("total_accumulated_bs", 0.0) > 0:
                        total_daily_sales_bs = u0x_fallback["total_accumulated_bs"]
                    if last_nc == 0 and u0x_fallback.get("last_nc_number", 0) > 0:
                        last_nc = u0x_fallback["last_nc_number"]
                    if last_nd == 0 and u0x_fallback.get("last_nd_number", 0) > 0:
                        last_nd = u0x_fallback["last_nd_number"]
                    if last_dnf == 0 and u0x_fallback.get("last_dnf_number", 0) > 0:
                        last_dnf = u0x_fallback["last_dnf_number"]

            res_s1 = {
                "success": True,
                "cashier": cashier,
                "total_daily_sales": f"{total_daily_sales_bs:.2f}",
                "total_daily_sales_bs": total_daily_sales_bs,
                "last_invoice_number": last_inv,
                "invoices_today": str(qty_inv_today),
                "quantity_of_invoices_today": qty_inv_today,
                "last_nc_number": last_nc,
                "quantity_nc_today": qty_nc_today,
                "last_nd_number": last_nd,
                "quantity_nd_today": qty_nd_today,
                "number_non_fiscal_documents": last_dnf,
                "quantity_non_fiscal_today": qty_dnf_today,
                "daily_closure_counter": str(z_counter),
                "z_counter": z_counter,
                "fiscal_reports_counter": fiscal_rep_counter,
                "rif": rif,
                "machine_register": machine_serial,
                "registered_machine_number": machine_serial,
                "current_printer_time": printer_time,
                "current_printer_date": printer_date,
                "raw_parts": parts
            }
            if u0x_cached:
                res_s1["u0x"] = u0x_cached
            return res_s1
        except Exception as e:
            return {"success": False, "error": f"Error parseando S1: {str(e)}"}

    def get_s2_status(self):
        """
        Consulta el estado S2 (Transacción abierta en curso, Manual Pág. 57).
        Permite saber cuántos artículos se han registrado, monto por pagar y pagos realizados.
        """
        ok, raw_or_err, parts = self._query_status_frame("S2", timeout_sec=4.0)
        if not ok:
            return {"success": False, "error": raw_or_err}
        try:
            if len(parts) >= 6:
                sub_bases = do_value_double(parts[0][2:] if parts[0].startswith("S2") else parts[0])
                sub_tax = do_value_double(parts[1])
                future_data = parts[2].strip()
                qty_articles = int(re.sub(r"[^0-9]", "", parts[3]) or "0")
                amount_payable = do_value_double(parts[4])
                payments_made = int(re.sub(r"[^0-9]", "", parts[5]) or "0")
                doc_type = int(re.sub(r"[^0-9]", "", parts[6]) or "0") if len(parts) > 6 else 0
                return {
                    "success": True,
                    "subtotal_bases": sub_bases,
                    "subtotal_tax": sub_tax,
                    "quantity_articles": qty_articles,
                    "amount_payable": amount_payable,
                    "payments_made": payments_made,
                    "type_document": doc_type,
                    "raw_parts": parts
                }
            return {"success": True, "raw": raw_or_err, "raw_parts": parts}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_x_report_data(self):
        """
        Consulta electrónica U0X (Acumulados del día en la memoria de trabajo de la impresora sin imprimir papel).
        Soporta dinámicamente tramas de 30, 31, 33+ campos (HKA80 / Emulador VFPHKA) y 21-22 campos.
        """
        ok, raw_or_err, parts = self._query_status_frame("U0X", timeout_sec=8.0)
        if not ok:
            return {"success": False, "error": raw_or_err}
        try:
            if len(parts) >= 21:
                next_z = int(re.sub(r"[^0-9]", "", parts[0]) or "0")
                z_date = parts[1].strip()

                # Detectar si parts[2] es Hora de Z (4 dígitos) o Número de Última Factura (8 dígitos)
                has_z_time = len(parts[2].strip()) == 4
                idx_inv = 3 if has_z_time else 2

                last_inv = int(re.sub(r"[^0-9]", "", parts[idx_inv]) or "0")
                last_inv_date = parts[idx_inv + 1].strip() if len(parts) > idx_inv + 1 else ""
                last_inv_time = parts[idx_inv + 2].strip() if len(parts) > idx_inv + 2 else ""

                # En tramas largas (>= 28 campos), después de hora de factura vienen UltNC, UltND, UltDNF (3 campos de 8 dígitos)
                if len(parts) >= 28:
                    last_nc = int(re.sub(r"[^0-9]", "", parts[idx_inv + 3]) or "0")
                    last_nd = int(re.sub(r"[^0-9]", "", parts[idx_inv + 4]) or "0")
                    last_dnf = int(re.sub(r"[^0-9]", "", parts[idx_inv + 5]) or "0")
                    idx_sales = idx_inv + 6
                else:
                    last_nc = 0
                    last_nd = 0
                    last_dnf = 0
                    idx_sales = idx_inv + 3

                exempt_sales = do_value_double(parts[idx_sales])
                bi_general = do_value_double(parts[idx_sales + 1])
                iva_general = do_value_double(parts[idx_sales + 2])
                bi_reduced = do_value_double(parts[idx_sales + 3])
                iva_reduced = do_value_double(parts[idx_sales + 4])
                bi_additional = do_value_double(parts[idx_sales + 5])
                iva_additional = do_value_double(parts[idx_sales + 6])

                # Si la trama incluye bloques de IGTF al final (tramas > 31 campos en HKA80 con IGTF)
                bi_igtf = do_value_double(parts[idx_sales + 21]) if len(parts) > (idx_sales + 22) else 0.0
                imp_igtf = do_value_double(parts[idx_sales + 22]) if len(parts) > (idx_sales + 22) else 0.0

                total_sales_with_tax = (
                    exempt_sales + bi_general + iva_general +
                    bi_reduced + iva_reduced + bi_additional + iva_additional + imp_igtf
                )
                return {
                    "success": True,
                    "next_z_number": next_z,
                    "z_report_date": z_date,
                    "last_invoice_number": last_inv,
                    "last_invoice_date": last_inv_date,
                    "last_invoice_time": last_inv_time,
                    "last_nc_number": last_nc,
                    "last_nd_number": last_nd,
                    "last_dnf_number": last_dnf,
                    "exempt_sales_bs": exempt_sales,
                    "bi_general_bs": bi_general,
                    "iva_general_bs": iva_general,
                    "bi_reduced_bs": bi_reduced,
                    "iva_reduced_bs": iva_reduced,
                    "bi_additional_bs": bi_additional,
                    "iva_additional_bs": iva_additional,
                    "bi_igtf_bs": bi_igtf,
                    "imp_igtf_bs": imp_igtf,
                    "total_accumulated_bs": round(total_sales_with_tax, 2),
                    "raw_parts": parts
                }
            return {"success": True, "raw": raw_or_err, "raw_parts": parts}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def cancel_open_invoice(self):
        """Cancela factura abierta con comando '7' verificando estado previamente."""
        status = self.read_fp_status()
        if not status.get("connected"):
            return False, "Impresora desconectada"

        if status.get("is_in_invoice"):
            ok, msg = self.send_cmd("7", timeout_sec=8.0)
            return ok, "Factura abierta anulada correctamente en la impresora." if ok else f"Fallo al anular: {msg}"
        elif status.get("is_in_non_fiscal"):
            ok, msg = self.send_cmd("810", timeout_sec=8.0)
            return ok, "Documento no fiscal cerrado correctamente." if ok else f"Fallo cerrando DNF: {msg}"
        else:
            return True, "No hay factura abierta en curso (impresora en espera)."

    def _close_or_cancel_before_report(self):
        """
        Verifica si quedó un documento abierto antes de emitir un Reporte X o Z.
        Si la factura ya estaba totalmente pagada (esperando 199), envía 199 para no anularla.
        """
        st = self.read_fp_status()
        if st.get("is_in_invoice"):
            s2 = self.get_s2_status()
            if s2.get("success") and s2.get("payments_made", 0) > 0 and s2.get("amount_payable", 1.0) <= 0.01:
                if self.debug:
                    print("[Fiscal] Factura pagada pendiente de cierre 199 detectada antes de reporte. Enviando '199'...")
                self.send_cmd("199", timeout_sec=15.0)
                time.sleep(0.5)
            else:
                if self.debug:
                    print("[Fiscal] Factura incompleta abierta detectada antes de reporte. Anulando con '7'...")
                self.send_cmd("7", timeout_sec=8.0)
                time.sleep(0.5)

    def print_report_x(self):
        """Emite Reporte X manejando la trama de respuesta de reporte oficial."""
        self._close_or_cancel_before_report()

        with self.lock:
            if not self.ser or not self.ser.is_open:
                ok, msg = self.open_port()
                if not ok:
                    return False, msg

            try:
                self.ser.reset_input_buffer()
                self.ser.reset_output_buffer()
                self._handle_cts()

                frame = self._assemble_frame("I0X")
                if self.debug:
                    print(f"[Fiscal] TX >>> 'I0X' (frame: {repr(frame)})")
                self.ser.write(frame)

                start_time = time.time()
                buf = b""
                while (time.time() - start_time) < 25.0:
                    if self.ser.in_waiting > 0:
                        chunk = self.ser.read(self.ser.in_waiting)
                        buf += chunk
                        if b"\x06" in buf or b"\x03" in buf:
                            return True, "Reporte X emitido exitosamente."
                        elif b"\x15" in buf:
                            st_err = self.read_fp_status()
                            return False, f"NAK: La impresora rechazó el comando I0X ({st_err.get('error_desc')})"
                    time.sleep(0.08)

                if buf:
                    return True, "Reporte X emitido exitosamente."
                return False, "Timeout: La impresora no respondió al comando I0X"
            except Exception as e:
                return False, f"Excepción en Reporte X: {str(e)}"

    def print_report_z(self):
        """Emite Reporte Z manejando la trama de respuesta de reporte oficial."""
        self._close_or_cancel_before_report()

        with self.lock:
            if not self.ser or not self.ser.is_open:
                ok, msg = self.open_port()
                if not ok:
                    return False, msg

            try:
                self.ser.reset_input_buffer()
                self.ser.reset_output_buffer()
                self._handle_cts()

                frame = self._assemble_frame("I0Z")
                if self.debug:
                    print(f"[Fiscal] TX >>> 'I0Z' (frame: {repr(frame)})")
                self.ser.write(frame)

                start_time = time.time()
                buf = b""
                while (time.time() - start_time) < 35.0:
                    if self.ser.in_waiting > 0:
                        chunk = self.ser.read(self.ser.in_waiting)
                        buf += chunk
                        if b"\x06" in buf or b"\x03" in buf:
                            return True, "Reporte Z emitido exitosamente."
                        elif b"\x15" in buf:
                            st_err = self.read_fp_status()
                            return False, f"NAK: La impresora rechazó el comando I0Z ({st_err.get('error_desc')})"
                    time.sleep(0.08)

                if buf:
                    return True, "Reporte Z emitido exitosamente."
                return False, "Timeout: La impresora no respondió al comando I0Z"
            except Exception as e:
                return False, f"Excepción en Reporte Z: {str(e)}"

    def print_invoice(self, data: dict):
        """
        Emite una factura fiscal completa según normativa SENIAT / HKA V8.5.0.
        - Nunca anula por falsos timeouts en el primer ítem (usa 18s para impresión de encabezado).
        - Cumple obligatoriamente con el envío de '199' cuando Flag 50=01 está activo, incluso en pagos en Bs (101).
        - Verifica S1 antes y después para certificar que la factura fue emitida y numerada.
        """
        st = self.read_fp_status()
        if not st.get("connected"):
            return {
                "success": False,
                "wasAnnulled": False,
                "error": st.get("error_desc", "Impresora fiscal no conectada.")
            }

        if not st.get("has_paper"):
            return {
                "success": False,
                "wasAnnulled": False,
                "error": "La impresora fiscal no tiene papel o tiene la tapa abierta."
            }

        # Si había un documento previo abierto:
        had_previous_open = False
        if st.get("is_in_invoice"):
            had_previous_open = True
            s2_prev = self.get_s2_status()
            if s2_prev.get("success") and s2_prev.get("payments_made", 0) > 0 and s2_prev.get("amount_payable", 1.0) <= 0.01:
                print("[Fiscal] Factura previa ya pagada pendiente de cierre 199 detectada. Cerrando con '199'...")
                self.send_cmd("199", timeout_sec=18.0)
                time.sleep(0.6)
            else:
                print("[Fiscal] Transacción previa incompleta detectada al iniciar. Limpiando con '7'...")
                self.send_cmd("7", timeout_sec=8.0)
                time.sleep(0.6)
        elif st.get("is_in_non_fiscal"):
            self.send_cmd("810", timeout_sec=8.0)
            time.sleep(0.4)

        # Leer S1 ANTES de emitir la factura para auditar numeración exacta
        s1_before = self.get_s1_status()
        inv_before = s1_before.get("last_invoice_number", 0) if s1_before.get("success") else 0
        dnf_before = s1_before.get("quantity_non_fiscal_today", 0) if s1_before.get("success") else 0

        rate = float(data.get("exchangeRate", 1.0) or 1.0)

        # 1. Datos del cliente (Providencia SENIAT - Comandos iR*, iS*, i01..i09)
        client_obj = data.get("client") if isinstance(data.get("client"), dict) else {}
        delivery_obj = data.get("deliveryInfo") if isinstance(data.get("deliveryInfo"), dict) else {}

        raw_rif = (
            data.get("clientRif")
            or data.get("clientCedula")
            or data.get("clientDocument")
            or client_obj.get("cedula")
            or client_obj.get("rif")
            or client_obj.get("document")
            or "V-00000000"
        )
        clean_rif_raw = clean_fiscal_text(raw_rif, 25).replace(" ", "").replace(".", "")
        if clean_rif_raw.isdigit():
            client_rif = f"V-{clean_rif_raw}"
        elif re.match(r"^[VEJGPC]\d+$", clean_rif_raw):
            client_rif = f"{clean_rif_raw[0]}-{clean_rif_raw[1:]}"
        elif not clean_rif_raw:
            client_rif = "V-00000000"
        else:
            client_rif = clean_rif_raw[:20]

        raw_name = (
            data.get("clientName")
            or client_obj.get("name")
            or "CONSUMIDOR FINAL"
        )
        if str(raw_name).strip().upper() == "CLIENTE GENERICO":
            raw_name = "CONSUMIDOR FINAL"
        client_name = clean_fiscal_text(raw_name, 40) or "CONSUMIDOR FINAL"

        raw_address = (
            data.get("clientAddress")
            or client_obj.get("address")
            or delivery_obj.get("address")
            or ""
        )
        if str(raw_address).strip().upper() == "MOSTRADOR" and client_name == "CONSUMIDOR FINAL":
            raw_address = ""
        client_address = clean_fiscal_text(raw_address, 65)

        raw_phone = (
            data.get("clientPhone")
            or client_obj.get("phone")
            or delivery_obj.get("phone")
            or ""
        )
        client_phone = re.sub(r"[^0-9\+\-\s\(\)]", "", str(raw_phone)).strip()[:28]

        ok_r, msg_r = self.send_cmd(f"iR*{client_rif}", timeout_sec=8.0)
        ok_s, msg_s = self.send_cmd(f"iS*{client_name}", timeout_sec=8.0)
        if self.debug:
            print(f"[Fiscal] Cliente Fiscal -> iR*{client_rif} (ok={ok_r}) | iS*{client_name} (ok={ok_s})")

        # Líneas adicionales de encabezado del cliente (i01 a i09 según Manual HKA V8.5.0 pág. 34)
        line_idx = 1
        if client_address:
            addr_full = f"DIRECCION: {client_address}"
            addr_part1 = addr_full[:40]
            self.send_cmd(f"i0{line_idx}{addr_part1}", timeout_sec=6.0)
            line_idx += 1
            if len(addr_full) > 40:
                addr_part2 = addr_full[40:80].strip()
                if addr_part2:
                    self.send_cmd(f"i0{line_idx}{addr_part2}", timeout_sec=6.0)
                    line_idx += 1

        if client_phone and line_idx <= 9:
            self.send_cmd(f"i0{line_idx}TELEFONO: {client_phone}"[:43], timeout_sec=6.0)
            line_idx += 1

        comments = data.get("comments") or []
        for c in comments[:3]:
            c_clean = clean_fiscal_text(c, 38)
            if c_clean:
                self.send_cmd(f"@{c_clean}", timeout_sec=6.0)

        # 2. Ítems (incluyendo cargo por Delivery si existe para cuadrar el subtotal exacto)
        raw_items = list(data.get("items") or [])
        delivery_fee_usd = float(data.get("deliveryFee") or 0.0)
        if delivery_fee_usd > 0:
            has_delivery_item = any("DELIVERY" in str(it.get("productName") or it.get("name") or "").upper() for it in raw_items)
            if not has_delivery_item:
                raw_items.append({
                    "productName": "SERVICIO DE DELIVERY",
                    "quantity": 1,
                    "unitPrice": delivery_fee_usd,
                    "unitPriceBs": round(delivery_fee_usd * rate, 2),
                    "taxRate": 0.0,
                    "taxType": "exento"
                })

        if not raw_items:
            return {
                "success": False,
                "wasAnnulled": False,
                "error": "La factura no contiene productos para imprimir."
            }

        for idx, itm in enumerate(raw_items):
            raw_desc = str(itm.get("productName") or itm.get("name") or f"PRODUCTO {idx+1}")
            desc = clean_fiscal_text(raw_desc, 38) or f"PRODUCTO {idx+1}"

            qty = float(itm.get("quantity", 1.0) or 1.0)
            if qty <= 0:
                qty = 1.0

            raw_price = float(itm.get("unitPriceBs") or itm.get("priceBs") or 0.0)
            if raw_price <= 0:
                usd_price = float(itm.get("unitPrice") or itm.get("price") or 0.0)
                price_bs = usd_price * rate if rate > 0 else usd_price
            else:
                price_bs = raw_price

            # Asegurar al menos 0.01 Bs (la impresora fiscal rechaza precio 0.00 con NAK)
            price_cents = max(1, int(round(price_bs * 100)))
            price_str = f"{price_cents:010d}"

            qty_millis = max(1, int(round(qty * 1000)))
            qty_str = f"{qty_millis:08d}"

            # Tasa de impuesto (Exento, Reducida 8%, General 16%, Adicional 31%)
            tax_type = str(itm.get("taxType", "")).lower()
            raw_tax = float(itm.get("taxRate", 16.0) if itm.get("taxRate") is not None else 16.0)
            if "exen" in tax_type or raw_tax <= 0.001:
                tax_rate = 0.0
            elif raw_tax <= 0.5:
                tax_rate = raw_tax * 100.0
            else:
                tax_rate = raw_tax

            if tax_rate <= 0.001:
                cmd_char = " "  # Exento (0x20)
            elif abs(tax_rate - 8.0) < 0.5:
                cmd_char = '"'  # Tasa Reducida 8%
            elif abs(tax_rate - 31.0) < 0.5:
                cmd_char = "#"  # Tasa Adicional 31%
            else:
                cmd_char = "!"  # Tasa General 16%

            item_cmd = f"{cmd_char}{price_str}{qty_str}{desc}"
            # El primer ítem imprime las 8 líneas del encabezado + RIF/Nombre + título FACTURA (puede tardar 6-10s)
            item_timeout = 18.0 if idx == 0 else 12.0
            if self.debug:
                print(f"[Fiscal] Registrando ítem #{idx+1}: {item_cmd} (Bs {price_bs:.2f} x {qty} | Tasa: {tax_rate}%)")
            ok, msg = self.send_cmd(item_cmd, timeout_sec=item_timeout)
            if not ok:
                st_err = self.read_fp_status()
                # Si la impresora ya abrió la factura y rechazó un ítem, anulamos para no dejarla bloqueada
                if st_err.get("is_in_invoice"):
                    self.send_cmd("7", timeout_sec=8.0)
                return {
                    "success": False,
                    "wasAnnulled": bool(st_err.get("is_in_invoice")),
                    "annulReason": f"Rechazo en producto '{desc}': {msg}",
                    "error": f"La impresora fiscal rechazó el producto '{desc}': {msg}. Verifique precio/impuesto."
                }

        # 3. Subtotal (Comando '3')
        ok_sub, msg_sub = self.send_cmd("3", timeout_sec=12.0)
        if not ok_sub:
            st_sub = self.read_fp_status()
            if st_sub.get("is_in_invoice"):
                self.send_cmd("7", timeout_sec=8.0)
            return {
                "success": False,
                "wasAnnulled": True,
                "annulReason": f"Error en comando Subtotal ('3'): {msg_sub}",
                "error": f"Error calculando subtotal en impresora fiscal: {msg_sub}"
            }

        # 4. Totalización y Cierre (Manual HKA V8.5.0 Pág. 26 y Pág. 82 Sección 24 Punto 5)
        # IMPORTANTE: Cuando el Flag 50 = 01 (IGTF activo en la impresora), el comando '199'
        # es OBLIGATORIO para cerrar TODOS los documentos fiscales, tanto en Divisas ('120') como en Bolívares ('101')!
        is_igtf = bool(
            data.get("igtf") or
            (float(data.get("igtfBaseUSD") or 0) > 0 and not data.get("isIgtfExempt", True))
        )

        closed = False
        last_error = ""
        pay_method = str(data.get("paymentMethod") or "").lower()

        if is_igtf:
            if self.debug:
                print("[Fiscal] Intentando cierre con Medio 20 (Divisas/IGTF comando '120')...")
            ok_120, msg_120 = self.send_cmd("120", timeout_sec=15.0)
            if ok_120:
                ok_199, msg_199 = self.send_cmd("199", timeout_sec=22.0)
                closed = ok_199
                last_error = msg_199
            else:
                if self.debug:
                    print(f"[Fiscal] Medio 120 no disponible ({msg_120}). Cerrando con Medio 01 ('101')...")
                ok_101, msg_101 = self.send_cmd("101", timeout_sec=20.0)
                closed = ok_101
                last_error = msg_101
        elif any(k in pay_method for k in ["punto", "tarjeta", "debito", "pos"]):
            if self.debug:
                print("[Fiscal] Pago con Punto de Venta / Tarjeta Débito. Enviando comando '105' (Medio 05)...")
            ok_105, msg_105 = self.send_cmd("105", timeout_sec=20.0)
            if ok_105:
                closed = True
            else:
                if self.debug:
                    print(f"[Fiscal] Medio 105 no disponible ({msg_105}). Intentando con Medio 02 ('102')...")
                ok_102, msg_102 = self.send_cmd("102", timeout_sec=15.0)
                if ok_102:
                    closed = True
                else:
                    ok_101, msg_101 = self.send_cmd("101", timeout_sec=20.0)
                    closed = ok_101
                    last_error = msg_101
        elif "pago_movil" in pay_method:
            if self.debug:
                print("[Fiscal] Pago con Pago Móvil. Enviando comando '105' (Medio electrónico)...")
            ok_105, msg_105 = self.send_cmd("105", timeout_sec=20.0)
            if ok_105:
                closed = True
            else:
                ok_101, msg_101 = self.send_cmd("101", timeout_sec=20.0)
                closed = ok_101
                last_error = msg_101
        else:
            ok_101, msg_101 = self.send_cmd("101", timeout_sec=20.0)
            closed = ok_101
            last_error = msg_101

        # VERIFICACIÓN CRÍTICA DE FLAG 50 = 01:
        # Si enviamos '101' (pago directo en Bs) y la impresora tiene Flag 50 = 01,
        # la factura queda en estado 'En emisión de doc fiscal' (is_in_invoice == True) esperando '199'.
        time.sleep(0.35)
        st_post_pay = self.read_fp_status()
        if st_post_pay.get("is_in_invoice"):
            if self.debug:
                print("[Fiscal] La factura sigue abierta tras el pago (Flag 50=01 activo). Enviando comando obligatorio '199' para cerrar...")
            ok_199_final, msg_199_final = self.send_cmd("199", timeout_sec=22.0)
            if ok_199_final:
                closed = True
            else:
                last_error = msg_199_final

        # Esperar a que la impresora termine de imprimir el pie de página fiscal y vuelva a estado 'En espera'
        wait_close_start = time.time()
        while (time.time() - wait_close_start) < 8.0:
            st_check = self.read_fp_status()
            if not st_check.get("is_in_invoice"):
                closed = True
                break
            time.sleep(0.35)

        st_final = self.read_fp_status()
        if st_final.get("is_in_invoice"):
            # Si aún sigue abierta tras '101' y '199', entonces el pago no cubrió el monto o hubo error mecánico
            if self.debug:
                print(f"[Fiscal] Error crítico: la factura no cerró ({last_error}). Anulando con '7' para liberar impresora...")
            self.send_cmd("7", timeout_sec=8.0)
            time.sleep(0.4)
            s1_err = self.get_s1_status()
            return {
                "success": False,
                "wasAnnulled": True,
                "annulReason": f"No se pudo completar el cierre de la factura ({last_error} | {st_final.get('error_desc')})",
                "error": f"La impresora fiscal anuló la factura al cerrar: {last_error} ({st_final.get('error_desc')})",
                "s1": s1_err
            }

        # Consultar S1 después del cierre para certificar el número de factura fiscal asignado por SENIAT
        s1_after = self.get_s1_status()
        inv_after = s1_after.get("last_invoice_number") if s1_after.get("success") else None
        dnf_after = s1_after.get("quantity_non_fiscal_today", 0) if s1_after.get("success") else dnf_before

        # Verificar si realmente incrementó el contador de facturas fiscales o si incrementó el de No Fiscales (Anulada)
        if inv_before > 0 and inv_after is not None and inv_after <= inv_before and dnf_after > dnf_before:
            return {
                "success": False,
                "wasAnnulled": True,
                "annulReason": "La impresora cerró el documento como ANULADO / NO FISCAL (el contador de facturas no incrementó).",
                "error": "ALERTA FISCAL: La máquina fiscal anuló el documento (no incrementó el correlativo de facturas). No se registrará como venta válida.",
                "s1": s1_after
            }

        return {
            "success": True,
            "wasAnnulled": False,
            "hadPreviousOpenCleaned": had_previous_open,
            "message": f"Factura fiscal Nº {inv_after} emitida exitosamente.",
            "invoiceNumber": inv_after,
            "fiscalInvoiceNumber": inv_after,
            "s1_before": s1_before,
            "s1": s1_after,
            "status": st_final
        }
