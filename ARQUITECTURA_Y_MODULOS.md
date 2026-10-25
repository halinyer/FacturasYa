# 🏛️ Arquitectura y Mapa de Módulos — FacturaPOS (Guía para Desarrolladores e IA)

> **Propósito de este documento**: Servir como mapa de referencia rápida (Contexto Maestro) para cualquier asistente de IA o desarrollador que trabaje en `FacturaPOS`. Antes de modificar cualquier flujo (POS, Impresora Fiscal HKA, Impresión Térmica 58mm, Cierre de Caja, Libros SENIAT o Mesas WiFi), lee las reglas de negocio y contratos de este archivo.

---

## 1. Visión General de la Arquitectura (3 Capas)

El sistema corre en Windows como una aplicación de escritorio empaquetada en **Electron** y se divide en **3 capas desacopladas**:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 1. FRONTEND REACT (Vite) — Carpeta: src/                                   │
│    • Estado Global: DataContext.jsx + dataService.js                       │
│    • Páginas: POS.jsx, CashClose.jsx, FiscalBooks.jsx, Tables.jsx, etc.    │
└───────────────────────────────┬────────────────────────────────────────────┘
                                │ window.electronAPI (IPC invoke)
                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 2. PROCESO PRINCIPAL ELECTRON (Node.js) — Carpeta: electron/               │
│    • main.cjs: Persistencia atómica JSON, Impresión térmica 58mm/80mm      │
│    • fiscalPrinterService.cjs: Ejecuta bin/bridge_fiscal.exe por CLI       │
│    • localServer.cjs (Express + Socket.IO :3001): App móvil de Meseros     │
└───────────────────────────────┬────────────────────────────────────────────┘
                                │ child_process.execFile (JSON stdout)
                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 3. PUENTE FISCAL PYTHON AUTÓNOMO — Carpeta: fiscal_service/ -> bin/        │
│    • bridge_fiscal.py: CLI (--action scan|status|s1|audit|invoice|...)     │
│    • tfhka_v3.py: Protocolo RS232 HKA V8.5.0 (9600 8-E-1, STX/ETX/LRC)     │
│    • Binario compilado: bin/bridge_fiscal.exe (PyInstaller --onefile)      │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Mapa de Archivos Actuales y Responsabilidades

### A. Capa Fiscal Python (`fiscal_service/` y `bin/`)
| Archivo | Líneas aprox. | Responsabilidad |
| :--- | :--- | :--- |
| `fiscal_service/tfhka_v3.py` | ~730 | Driver serie RS232 para impresoras fiscales **The Factory HKA (HKA80 / SRP350)** y emulador **VFPHKA**. Maneja tramas `STX + CMD + ETX + LRC`, `ENQ (0x05)`, lecturas `S1` (12 y 16 campos), `S2` (documento en curso), `U0X` (memoria acumulada X), emisión de facturas (`iR*`, `iS*`, `i01..i03`, ítems `!`/` `, subtotal `3`, pagos `101`/`120` y cierre obligatorio `199`), y reportes `I0X` / `I0Z`. |
| `fiscal_service/bridge_fiscal.py` | ~430 | Interfaz CLI invocada por Electron. Recibe `--action` (`scan`, `status`, `s1`, `audit`, `test`, `invoice`, `report-x`, `report-z`, `cancel`, `get-log`) y devuelve **exclusivamente JSON válido por `stdout`**. Escribe bitácora en `registro_fiscal.log` y auditoría estructurada en `auditoria_fiscal.json`. |
| `bin/bridge_fiscal.exe` | Binario | Ejecutable compilado con PyInstaller a partir de `bridge_fiscal.py` + `tfhka_v3.py`. **Regla crítica**: Siempre que se edite cualquier `.py` en `fiscal_service/`, se debe recompilar `bin/bridge_fiscal.exe`. |

---

### B. Capa Electron / Backend Local (`electron/`)
| Archivo | Líneas aprox. | Responsabilidad |
| :--- | :--- | :--- |
| `electron/main.cjs` | ~470 | Proceso principal de Electron. Registra todos los canales `ipcMain.handle`:<br>• `load-db` / `save-db`: Lectura/escritura atómica con respaldo `.bak` en `%APPDATA%/facturacion-pos/facturapos_db.json`.<br>• `print-window`: Impresión térmica aislada en rollo de **58mm** (`48mm` área imprimible, archivo HTML temporal con `headerFooter: false`).<br>• `fiscal:*`: Delega a `fiscalPrinterService.cjs`. |
| `electron/preload.cjs` | ~27 | Expone `window.electronAPI` de forma segura al frontend React (`contextIsolation: true`). |
| `electron/fiscalPrinterService.cjs` | ~220 | Localiza `bridge_fiscal.exe` (tanto en modo desarrollo `bin/` como empaquetado `resources/`), pasa el payload de factura por archivo JSON temporal en `os.tmpdir()` y parsea la respuesta JSON. |
| `electron/localServer.cjs` | ~838 | Servidor HTTP/WebSocket local en puerto `3001` para tablets/teléfonos de meseros por WiFi, sincronización de mesas en vivo y consulta de tasa oficial BCV (`/api/bcv/rate`). |
| `electron/waiterView.cjs` | ~3266 | Vista web móvil (HTML/CSS/JS) servida en `http://<IP_LOCAL>:3001/mesero` para toma de pedidos en mesas y envío automático de comandas a cocina. |

---

### C. Capa Frontend React (`src/`)

#### 1. Núcleo de Datos (`src/services/` y `src/contexts/`)
| Archivo | Responsabilidad |
| :--- | :--- |
| `src/services/dataService.js` | **Repositorio único de datos (`db`)**. Sincroniza memoria con `localStorage` y `facturapos_db.json` vía `window.electronAPI.saveDb`. Gestiona: `products`, `categories`, `clients`, `invoices`, `payments`, `purchases`, `cashCloses`, `openTabs`, `exchangeRate` y `fiscalSettings`. |
| `src/contexts/DataContext.jsx` | Proveedor React (`useData()`) que envuelve a `dataService.js` y expone las acciones reactivas y los métodos `fiscal*` a todas las pantallas. |

#### 2. Pantallas Principales (`src/pages/`)
| Archivo | Líneas aprox. | Responsabilidad |
| :--- | :--- | :--- |
| `src/pages/POS.jsx` | ~930 | **Punto de Venta / Facturación**. Catálogo de productos, carrito, cálculo bimonetario (`USD` y `Bs` a tasa BCV), cálculo de IVA (16%) e IGTF (3% en divisas), integración con cuentas abiertas (`openTabs`) y mesas (`loadedTableOrder`), y flujo de cobro diferenciado entre **Factura Fiscal SENIAT** y **Nota de Entrega**. |
| `src/pages/CashClose.jsx` | ~970 | **Cierre y Arqueo de Caja**. Calcula ventas válidas del día (excluyendo facturas `voided`/`anulada`), desglose por método de pago, conteo físico bimonetario en gaveta (`$` y `Bs`), emisión de **Reporte X** y **Reporte Z**, consulta de memoria fiscal en vivo (`S1` + `U0X`), alerta de discrepancia POS vs Máquina Fiscal y botón `🚫 Anular` por factura. |
| `src/pages/FiscalBooks.jsx` | ~1340 | **Libros Fiscales SENIAT (Ventas, Compras y Forma 30)**. Filtra por mes/año/quincena y tipo de documento (`Solo Facturas Fiscales SENIAT` vs `Todas`). Muestra facturas anuladas como `03-ANUL` con monto `Bs. 0,00`, permite anular/restaurar con 1 clic y exporta CSV con formato contable venezolano. |
| `src/pages/Tables.jsx` | ~1595 | **Mapa de Mesas y Comandas**. Gestión visual de mesas de restaurante, estado de ocupación, unión/cambio de mesa, pre-cuentas e impresión de comandas de cocina. |
| `src/pages/Clients.jsx` | ~616 | **Directorio de Clientes y Cuentas por Cobrar**. CRUD de clientes (con validación de Cédula/RIF venezolano `V-`, `E-`, `J-`, `G-`), historial de compras y abonos de deudas. |
| `src/pages/Products.jsx` | ~394 | **Inventario / Menú de Productos**. Creación y edición de productos, precios en USD, categorías e imágenes. |
| `src/pages/Dashboard.jsx` | ~827 | **Panel Estadístico**. KPIs de ingresos diarios/mensuales, gráficas de ventas, métodos de pago y productos más vendidos. |

#### 3. Componentes y Utilidades Modulares (`src/components/` y `src/utils/`)
| Archivo | Responsabilidad |
| :--- | :--- |
| `src/utils/invoiceCalculator.js` | **Calculador Tributario SENIAT**. Calcula Base Imponible, IVA 16%, IGTF 3% en divisas, pagos mixtos y arma el payload de factura para `POS.jsx`. |
| `src/utils/seniatCsvExporter.js` | **Exportador Contable CSV**. Genera los archivos `.csv` de Libro de Ventas y Libro de Compras con formato SENIAT para Excel. |
| `src/components/fiscal/FiscalConfigModal.jsx` | Modal de Configuración y Diagnóstico de la Impresora Fiscal HKA80 (auto-detección de puertos COM, prueba `S1`, Reporte X/Z y visor de `registro_fiscal.log`). |
| `src/components/BackupModal.jsx` | Modal de exportación y restauración de copias de seguridad offline (`.json`). |
| `src/components/cashClose/FiscalMachineLivePanel.jsx` | Panel en Cierre de Caja para emitir Reporte X, Cierre Z y consultar la memoria viva (`S1` + `U0X`) con detección automática de discrepancias POS vs Impresora Fiscal. |
| `src/components/cashClose/DailyInvoicesTable.jsx` | Tabla de facturas del día en Cierre de Caja con insignias Fiscal/Nota de Entrega y botón `🚫 Anular` / `↩️ Restaurar`. |
| `src/components/fiscalBooks/TaxSummaryForma30.jsx` | Pestaña de Autoliquidación Mensual de IVA e IGTF (Forma 30 SENIAT). |
| `src/components/fiscalBooks/PurchaseFormModal.jsx` | Modal para registrar o editar facturas de compra de proveedores con cálculo automático de Crédito Fiscal. |
| `src/components/InvoicePreview.jsx` | Modal de vista previa e impresión de **Nota de Entrega / Pre-Cuenta / Copia Fiscal** en formato térmico **58mm** (`215px` de ancho con barra inferior fija). |
| `src/components/KitchenTicketModal.jsx` | Modal de vista previa e impresión de **Comanda de Cocina / Barra** en formato **58mm**. |
| `src/components/pos/POSInvoiceSidebar.jsx` | Barra lateral derecha del POS (selección de cliente, tipo de pedido Salón/Delivery/Llevar, lista de ítems del carrito y totales). |
| `src/components/pos/POSPaymentModal.jsx` | Modal de cobro (selección de método de pago, pago mixto, banco/referencia de Pago Móvil, cálculo de vuelto y botones de emisión **Nota de Entrega** vs **Factura Fiscal SENIAT**). |
| `src/components/ClientSearch.jsx` | Buscador y modal rápido para crear o editar clientes directamente desde la caja (`POS`) sin perder el carrito. |
| `src/components/Sidebar.jsx` | Menú de navegación lateral (~175 líneas). |

---

## 3. Reglas Críticas de Negocio y Protocolo Fiscal (Para la IA)

1. **Regla de Oro de Facturación Fiscal (`POS.jsx` + `tfhka_v3.py`)**:
   - Una factura fiscal **NUNCA** debe guardarse como `'paid'` en la base de datos antes de que `fiscalPrintInvoice` retorne `{ success: true }`.
   - Si la impresora fiscal rechaza o anula la factura (`wasAnnulled: true`), el registro se guarda únicamente con `status: 'voided'` (Anulada, monto `0.00` para Caja y Libro SENIAT) y el carrito del cajero permanece intacto.
2. **Regla del Flag 50 = 01 en Impresoras HKA80 (Manual V8.5.0 Pág. 82)**:
   - Cuando la impresora tiene activo el `Flag 50 = 01` (IGTF), el comando **`199`** es **obligatorio para cerrar TODAS las facturas**, incluso cuando se pagan en Bolívares con `"101"`.
   - El primer ítem de una factura imprime el membrete completo de 8 líneas + datos del cliente (`iR*`, `iS*`, `i01`..`i03`) y tarda entre 5 y 9 segundos; por eso `send_cmd` usa un timeout de `18.0s` en el primer ítem.
3. **Regla de Impresión Térmica 58mm (`electron/main.cjs`)**:
   - La impresora de comandas/notas usa papel de **58mm** (ancho imprimible físico de **48mm** = `48000` micrones).
   - Siempre se imprime cargando un archivo `.html` temporal en disco (`printWin.loadFile(tempHtmlPath)`) con `headerFooter: false` para que Chromium nunca imprima códigos URL/HTML en el encabezado del ticket.
4. **Regla de Compilación**:
   - Si modificas `fiscal_service/*.py`: ejecuta PyInstaller para actualizar `bin/bridge_fiscal.exe`.
   - Si modificas `src/**` o `electron/**`: ejecuta `node scripts/build.cjs` para actualizar `dist-electron/win-unpacked/FacturaPOS.exe`.

---

## 4. Plan de Modularización Recomendado (Reducción de Complejidad)

Actualmente varios archivos superan las 800–3,000 líneas porque concentran vista, lógica de negocio y modales en un solo archivo. La estructura objetivo para modularizar sin romper nada es:

### Fase 1: Limpieza de Archivos Obsoletos (Código Muerto)
- Eliminar o archivar scripts antiguos que ya no se usan:
  - `electron/fiscal_translator.py` (reemplazado por `fiscal_service/bridge_fiscal.py`).
  - `fiscal_service/api_fiscal.py` (antiguo servidor Flask/HTTP reemplazado por el CLI `bridge_fiscal.py`).

### Fase 2: División de `Sidebar.jsx` (673 líneas)
- Extraer el modal de configuración y diagnóstico de la impresora fiscal a su propio componente:
  - `src/components/fiscal/FiscalConfigModal.jsx`
- Dejar `src/components/Sidebar.jsx` (~220 líneas) únicamente para la navegación lateral y estado de conexión.

### Fase 3: División de `FiscalBooks.jsx` (1,340 líneas)
- Separar las 3 pestañas y el exportador en submódulos dentro de `src/components/fiscalBooks/`:
  - `SalesBookTable.jsx` (Tabla del Libro de Ventas + filtro + anulación rápida).
  - `PurchasesBookTable.jsx` (Tabla del Libro de Compras).
  - `PurchaseFormModal.jsx` (Modal de creación/edición de compras con cálculo automático de IVA/retención).
  - `TaxSummaryForma30.jsx` (Resumen tributario SENIAT Forma 30).
  - `seniatCsvExporter.js` (Lógica pura de generación de CSV contable).

### Fase 4: División de `CashClose.jsx` (970 líneas)
- Separar en `src/components/cashClose/`:
  - `BimonetaryDrawerCount.jsx` (Arqueo físico de gaveta en `$` y `Bs`).
  - `FiscalMachineLivePanel.jsx` (Panel de control Reporte X, Reporte Z y auditoría `S1` + `U0X`).
  - `DailyInvoicesTable.jsx` (Tabla de facturas del día con botón `🚫 Anular`).
  - `CashCloseHistoryTable.jsx` (Pestaña de historial de cierres).

### Fase 5: División de `POS.jsx` (930 líneas) y `dataService.js` (763 líneas)
- Extraer la lógica de cálculo tributario y armado de factura de `POS.jsx` a un helper puro:
  - `src/utils/invoiceBuilder.js` (calcula bases imponibles, IVA, IGTF 3%, pagos mixtos y construye el payload).
- Dividir `dataService.js` internamente por dominios (`productsRepo`, `clientsRepo`, `invoicesRepo`, `cashCloseRepo`, `bcvRateService`) manteniendo la misma API `db.*` para no romper ningún componente existente.

### Fase 6: Separación de `electron/waiterView.cjs` (3,266 líneas)
- Extraer la plantilla HTML/CSS/JS de los meseros a archivos estáticos limpios en `electron/waiter-app/` (`index.html`, `styles.css`, `app.js`) leídos por `waiterView.cjs`.
