import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isConfigured } from '../../lib/supabase';

const INITIAL_ITEMS = [
  { id: 'burger', name: 'Hamburguesa Doble', priceUsd: 6.50, qty: 2 },
  { id: 'pepito', name: 'Pepito Mixto 40cm', priceUsd: 8.00, qty: 1 },
  { id: 'papas', name: 'Ración de Papas', priceUsd: 3.00, qty: 1 },
  { id: 'malta', name: 'Malta / Refresco', priceUsd: 1.50, qty: 2 }
];

const INSTALLER_URL =
  import.meta.env.VITE_INSTALLER_URL || 'https://github.com/halinyer/FacturasYa/releases/latest';

function formatBs(val) {
  return (
    'Bs ' +
    Number(val || 0).toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  );
}

export default function LandingPage() {
  const [bcvRate, setBcvRate] = useState(876.80);
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [cashUsd, setCashUsd] = useState(10);
  const [applyIgtf, setApplyIgtf] = useState(true);

  // Estado del modal de registro de 14 días + descarga del .EXE
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    rif: '',
    phone: '',
    email: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [registeredAccount, setRegisteredAccount] = useState(null);

  const rate = Math.max(1, Number(bcvRate) || 876.80);
  const activeItems = items.filter((i) => i.qty > 0);
  const totalBaseUsd = activeItems.reduce((sum, i) => sum + i.priceUsd * i.qty, 0);
  const appliedUsd = Math.min(cashUsd, totalBaseUsd);
  const igtfUsd = applyIgtf ? appliedUsd * 0.03 : 0;
  const finalUsd = totalBaseUsd + igtfUsd;

  const subBs = (totalBaseUsd / 1.16) * rate;
  const ivaBs = (totalBaseUsd - totalBaseUsd / 1.16) * rate;
  const igtfBs = igtfUsd * rate;
  const totalBs = finalUsd * rate;
  const remainingUsd = Math.max(0, totalBaseUsd - appliedUsd);
  const remainingBs = remainingUsd * rate;

  const toggleItemQty = (id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty: item.qty >= 3 ? 0 : item.qty + 1 } : item
      )
    );
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const cleanEmail = form.email.trim().toLowerCase();
      const cleanRif = form.rif.trim().toUpperCase();

      if (isConfigured && supabase) {
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: form.password,
          options: {
            data: {
              business_name: form.businessName.trim(),
              rif: cleanRif,
              phone: form.phone.trim()
            }
          }
        });
        if (error) throw new Error(error.message);
      }

      setRegisteredAccount({
        businessName: form.businessName.trim(),
        rif: cleanRif,
        email: cleanEmail,
        validUntil: new Date(Date.now() + 14 * 86400000).toLocaleDateString('es-VE')
      });
    } catch (err) {
      setFormError(err.message || 'No se pudo completar el registro.');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => {
    setFormError('');
    setRegisteredAccount(null);
    setModalOpen(true);
  };

  return (
    <div className="fy-landing">
      {/* Barra superior operativa con tasa BCV editable en vivo */}
      <div className="fy-topbar">
        <div className="fy-container fy-topbar-inner">
          <div className="fy-topbar-left">
            <span className="fy-live-dot" />
            <strong>Hecho para operar en Venezuela</strong>
            <span className="fy-hide-mobile">
              · Compatible con <strong>The Factory HKA80</strong>, Bixolon y Bematech
            </span>
          </div>
          <label className="fy-rate-pill">
            <span>Tasa BCV hoy:</span>
            <input
              type="number"
              step="0.01"
              value={bcvRate}
              onChange={(e) => setBcvRate(e.target.value)}
            />
            <span>Bs/$</span>
          </label>
        </div>
      </div>

      {/* Navegación principal */}
      <header className="fy-nav">
        <div className="fy-container fy-nav-inner">
          <div className="fy-brand">
            <div className="fy-logo">FY</div>
            <div>
              <strong>FacturasYa</strong>
              <span>POS Fiscal + Nube · Venezuela</span>
            </div>
          </div>

          <nav className="fy-links">
            <a href="#simulador">Probar Caja en Vivo</a>
            <a href="#realidad-vzla">¿Por qué cambiar?</a>
            <a href="#funciones">Funciones</a>
            <a href="#precios">Precios</a>
          </nav>

          <div className="fy-nav-cta">
            <Link to="/monitor" className="btn">
              Entrar al Monitor
            </Link>
            <button type="button" className="btn fy-btn-red" onClick={openModal}>
              Descargar Prueba 14 Días
            </button>
          </div>
        </div>
      </header>

      <main className="fy-container fy-main">
        {/* HERO + SIMULADOR EN VIVO */}
        <section id="simulador" className="fy-hero-grid">
          <div className="fy-hero-copy">
            <div className="fy-pill">
              <span className="fy-pill-tag">NUEVO</span>
              <span>Sin pagar $800 de instalación · Descargas, instalas y facturas hoy</span>
            </div>

            <h1>
              El punto de venta para restaurantes en Venezuela que no se tranca cuando se cae el internet.
            </h1>

            <p className="fy-lead">
              Precios protegidos en <strong>dólares ($)</strong>, cobro mixto en{' '}
              <strong>Bolívares a tasa BCV</strong>, conexión directa por USB a tu{' '}
              <strong>máquina fiscal HKA80</strong> y el dueño viendo las ventas en vivo desde su
              teléfono donde quiera que esté.
            </p>

            <div className="fy-highlights">
              <div className="fy-highlight-card">
                <strong>1. Corre en tu PC (Offline-First)</strong>
                <p>Si el internet falla en pleno almuerzo, la caja y las comandas siguen facturando sin pausa.</p>
              </div>
              <div className="fy-highlight-card">
                <strong>2. Respaldo en la Nube</strong>
                <p>¿Se dañó la PC de la caja? Instalas en otra, inicias sesión con tu correo y recuperas todo.</p>
              </div>
              <div className="fy-highlight-card">
                <strong>3. Monitor Fijo en tu Celular</strong>
                <p>Entras con tu correo desde tu casa. El link nunca vence aunque reinicien la PC del local.</p>
              </div>
              <div className="fy-highlight-card">
                <strong>4. Pagas en Bs por Pago Móvil</strong>
                <p>Suscripción mensual accesible sin tarjetas en divisas. Reportas los 6 dígitos y tu caja se activa.</p>
              </div>
            </div>

            <div className="fy-hero-actions">
              <button type="button" className="btn fy-btn-red fy-btn-lg" onClick={openModal}>
                Probar 14 días gratis (Descargar .EXE) →
              </button>
              <a href="#precios" className="btn fy-btn-lg">
                Ver planes ($30/mes)
              </a>
            </div>

            <p className="fy-micro-note">
              Instalador directo para Windows 10 / 11 (64-bit) · Incluye puente fiscal HKA80 listo para usar.
            </p>
          </div>

          {/* SIMULADOR INTERACTIVO DE COBRO MIXTO Y TICKET FISCAL */}
          <div className="fy-sim-card">
            <div className="fy-sim-header">
              <div>
                <span className="fy-eyebrow">Pruébalo aquí mismo</span>
                <h2>Simulador de Caja: Cobro Mixto + Máquina Fiscal</h2>
              </div>
              <span className="fy-rate-badge">BCV: {rate.toFixed(2)} Bs/$</span>
            </div>

            <div>
              <p className="fy-sim-label">
                Toca para agregar o quitar productos a la cuenta de la Mesa 4:
              </p>
              <div className="fy-sim-products">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItemQty(item.id)}
                    className={`fy-prod-btn ${item.qty > 0 ? 'active' : ''}`}
                  >
                    <div className="fy-prod-top">
                      <span>{item.name}</span>
                      <strong>{item.qty}x</strong>
                    </div>
                    <small>
                      ${item.priceUsd.toFixed(2)} · {formatBs(item.priceUsd * rate)}
                    </small>
                  </button>
                ))}
              </div>
            </div>

            <div className="fy-mix-box">
              <div className="fy-mix-header">
                <strong>¿Cómo paga el cliente? (Pago Mixto)</strong>
                <label className="fy-check">
                  <input
                    type="checkbox"
                    checked={applyIgtf}
                    onChange={(e) => setApplyIgtf(e.target.checked)}
                  />
                  <span>Aplicar IGTF 3% a divisas</span>
                </label>
              </div>

              <div className="fy-mix-grid">
                <div>
                  <small>Efectivo en Dólares ($ recibidos):</small>
                  <div className="fy-cash-pills">
                    {[0, 5, 10, 20].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCashUsd(amt)}
                        className={`btn ${cashUsd === amt ? 'fy-btn-dark' : ''}`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <small>Resto por Pago Móvil / Punto (Bs):</small>
                  <div className="fy-remaining-bs">
                    {formatBs(remainingBs)} <small>(${remainingUsd.toFixed(2)})</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Fiscal SENIAT */}
            <div className="fy-ticket">
              <div className="fy-ticket-head">
                <strong>SENIAT · J-50123456-0</strong>
                <div>BURGER & GRILL CARACAS C.A.</div>
                <div>
                  FACTURA FISCAL NRO: <strong>00048291</strong>
                </div>
              </div>

              <div className="fy-ticket-lines">
                {activeItems.length > 0 ? (
                  activeItems.map((i) => (
                    <div key={i.id} className="fy-ticket-row">
                      <span>
                        {i.qty}x {i.name.toUpperCase()} (${(i.priceUsd * i.qty).toFixed(2)})
                      </span>
                      <span>{formatBs(i.priceUsd * i.qty * rate)}</span>
                    </div>
                  ))
                ) : (
                  <div className="fy-ticket-empty">
                    Toca un producto arriba para simular la factura
                  </div>
                )}
              </div>

              <div className="fy-ticket-totals">
                <div className="fy-ticket-row">
                  <span>BASE IMPONIBLE (16%):</span>
                  <span>{formatBs(subBs)}</span>
                </div>
                <div className="fy-ticket-row">
                  <span>IVA 16%:</span>
                  <span>{formatBs(ivaBs)}</span>
                </div>
                {igtfUsd > 0 && (
                  <div className="fy-ticket-row fy-igtf">
                    <span>IGTF 3% (SOBRE ${appliedUsd.toFixed(2)}):</span>
                    <span>{formatBs(igtfBs)}</span>
                  </div>
                )}
                <div className="fy-ticket-row fy-ticket-grand">
                  <span>TOTAL (${finalUsd.toFixed(2)}):</span>
                  <span>{formatBs(totalBs)}</span>
                </div>
              </div>

              <div className="fy-ticket-foot">
                <span>MH · Z1B8049210 (HKA80)</span>
                <span className="fy-ok">✓ Lista para imprimir</span>
              </div>
            </div>
          </div>
        </section>

        {/* COMPARATIVA VENEZUELA */}
        <section id="realidad-vzla" className="fy-section">
          <div className="fy-sec-head">
            <span className="fy-eyebrow">Sin letras chiquitas</span>
            <h2>¿Por qué los restaurantes en Venezuela se están pasando a FacturasYa?</h2>
            <p>
              Los sistemas viejos cobran cientos de dólares de entrada y requieren un técnico presencial.
              Las apps web extranjeras no imprimen en máquinas fiscales del SENIAT ni sirven cuando falla ABA.
            </p>
          </div>

          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Situación real en el local</th>
                  <th>Sistemas viejos (ej. Xetux / Saint)</th>
                  <th>Apps genéricas en la nube</th>
                  <th>FacturasYa (Híbrido)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Costo para empezar hoy</strong></td>
                  <td>$450 a $1,200 + visita técnica</td>
                  <td>Tarjeta internacional obligatoria</td>
                  <td><strong className="fy-ok">14 días gratis · Luego $30/mes en Pago Móvil</strong></td>
                </tr>
                <tr>
                  <td><strong>Se cae el internet al mediodía</strong></td>
                  <td>Funciona local, dueño a ciegas</td>
                  <td>Se paraliza la caja, no puedes cobrar</td>
                  <td><strong>La caja sigue facturando y sincroniza al volver</strong></td>
                </tr>
                <tr>
                  <td><strong>Máquina Fiscal SENIAT (HKA80)</strong></td>
                  <td>Licencias y módulos aparte</td>
                  <td>No soportan máquinas fiscales de Venezuela</td>
                  <td><strong>Incluido directo por USB/Serial (Facturas, X, Z)</strong></td>
                </tr>
                <tr>
                  <td><strong>Ver las ventas desde tu teléfono</strong></td>
                  <td>Requiere IP fija o servidor caro</td>
                  <td>Sí, pero sin control fiscal</td>
                  <td><strong>Link permanente con tu correo y clave</strong></td>
                </tr>
                <tr>
                  <td><strong>Se daña o formatean la PC</strong></td>
                  <td>Pierdes datos o pagas soporte técnico</td>
                  <td>Guardado en la nube</td>
                  <td><strong>Instalas el .EXE en otra PC y todo baja solo</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* LAS 6 FUNCIONES */}
        <section id="funciones" className="fy-section">
          <div className="fy-sec-head">
            <span className="fy-eyebrow">Todo en un solo instalador</span>
            <h2>Diseñado para que tu cajero aprenda en 10 minutos</h2>
          </div>

          <div className="fy-features-grid">
            <div className="card">
              <span className="fy-eyebrow">01 · Facturación Fiscal SENIAT</span>
              <h3>Puente directo con The Factory HKA80</h3>
              <p>Emite facturas fiscales con RIF/Cédula, Notas de Crédito, Reporte X y Cierre Z diario sin salir de la pantalla.</p>
            </div>
            <div className="card">
              <span className="fy-eyebrow">02 · Mesas y Comandas QR</span>
              <h3>Toma pedidos desde tablets o teléfonos</h3>
              <p>Enlaza los teléfonos de tus mesoneros por Wi-Fi local. Toman el pedido en la mesa y sale impreso en cocina al instante.</p>
            </div>
            <div className="card">
              <span className="fy-eyebrow">03 · Contabilidad Lista</span>
              <h3>Libros de Compra y Venta en Excel</h3>
              <p>Registra compras a proveedores con retenciones y descarga a fin de mes el Excel exacto que pide tu contador.</p>
            </div>
            <div className="card">
              <span className="fy-eyebrow">04 · Inventario en 2 Minutos</span>
              <h3>Control de vasos, carnes e insumos</h3>
              <p>Sin recetas eternas. Registra entradas, mermas y el conteo físico de cierre de turno para detectar faltantes al instante.</p>
            </div>
            <div className="card">
              <span className="fy-eyebrow">05 · Monitor del Dueño</span>
              <h3>Revisa tu negocio desde el celular</h3>
              <p>Consulta cuánto efectivo en dólares hay en caja, cuánto entró por Pago Móvil o Punto y qué mesas están abiertas.</p>
            </div>
            <div className="card">
              <span className="fy-eyebrow">06 · Arqueo Cuadrado</span>
              <h3>Cierre por método de pago y turno</h3>
              <p>Separa Efectivo USD, Efectivo Bs, Pago Móvil, Punto de Venta, Zelle y gastos de caja chica sin usar hojas sueltas.</p>
            </div>
          </div>
        </section>

        {/* PRECIOS */}
        <section id="precios" className="fy-section">
          <div className="fy-sec-head">
            <span className="fy-eyebrow">Precios transparentes</span>
            <h2>Un solo sistema completo, sin cobros ocultos por módulo</h2>
          </div>

          <div className="fy-pricing-grid">
            <div className="card fy-price-card">
              <div>
                <span className="badge">Para probar en tu caja</span>
                <h3>Prueba de 14 Días</h3>
                <div className="fy-price-num">$0 <small>/ 14 días</small></div>
                <p>Instálalo en tu computadora, conecta tu máquina fiscal y pruébalo con tu equipo sin compromiso.</p>
                <ul>
                  <li>✓ Instalador completo para Windows (.EXE)</li>
                  <li>✓ Conexión con máquina fiscal HKA80</li>
                  <li>✓ Mesas, comandas QR e inventario</li>
                  <li>✓ Monitor del dueño en tiempo real</li>
                </ul>
              </div>
              <button type="button" className="btn" onClick={openModal}>
                Descargar prueba gratis
              </button>
            </div>

            <div className="card fy-price-card fy-price-featured">
              <div>
                <div className="fy-price-top">
                  <span className="badge red">Más elegido</span>
                  <strong className="fy-ok">≈ {formatBs(30 * rate)} / mes</strong>
                </div>
                <h3>Plan Mensual</h3>
                <div className="fy-price-num">$30 <small>/ mes (a tasa BCV)</small></div>
                <p>Renueva mes a mes desde la misma caja reportando los últimos 6 dígitos de tu Pago Móvil.</p>
                <ul>
                  <li>✓ <strong>Todo ilimitado</strong> sin límite de facturas</li>
                  <li>✓ Respaldo automático en la nube</li>
                  <li>✓ Libros de Compra y Venta SENIAT en Excel</li>
                  <li>✓ Activación al reportar Pago Móvil</li>
                  <li>✓ Soporte directo por WhatsApp</li>
                </ul>
              </div>
              <button type="button" className="btn fy-btn-red" onClick={openModal}>
                Empezar con 14 días gratis →
              </button>
            </div>

            <div className="card fy-price-card">
              <div>
                <span className="badge green">Ahorras 2 meses ($60)</span>
                <h3>Plan Anual</h3>
                <div className="fy-price-num">$300 <small>/ año completo</small></div>
                <p>Olvídate de renovaciones mensuales durante todo un año y congela el precio de tu licencia.</p>
                <ul>
                  <li>✓ 365 días continuos de licencia activa</li>
                  <li>✓ Acompañamiento en configuración inicial</li>
                  <li>✓ Actualizaciones prioritarias incluidas</li>
                  <li>✓ Pago Móvil BCV, Zelle o Binance</li>
                </ul>
              </div>
              <button type="button" className="btn" onClick={openModal}>
                Elegir plan anual
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* MODAL DE REGISTRO + DESCARGA DEL INSTALADOR */}
      {modalOpen && (
        <div className="fy-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="card fy-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fy-modal-head">
              <div>
                <span className="fy-eyebrow">
                  {registeredAccount ? 'Paso 2 de 2 · Descarga lista' : 'Paso 1 de 2 · 14 días gratis'}
                </span>
                <h3>
                  {registeredAccount
                    ? '¡Todo listo para instalar en tu caja!'
                    : 'Crea la cuenta de tu restaurante'}
                </h3>
              </div>
              <button type="button" className="btn" onClick={() => setModalOpen(false)}>
                Cerrar
              </button>
            </div>

            {!registeredAccount ? (
              <form className="fy-form" onSubmit={handleRegisterSubmit}>
                <label>
                  <span>Nombre del restaurante o comercio</span>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Arepera El Fogón"
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  />
                </label>
                <div className="fy-form-row">
                  <label>
                    <span>RIF Fiscal</span>
                    <input
                      type="text"
                      required
                      placeholder="J-50123456-0"
                      value={form.rif}
                      onChange={(e) => setForm({ ...form, rif: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>WhatsApp / Teléfono</span>
                    <input
                      type="text"
                      required
                      placeholder="0412-1234567"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </label>
                </div>
                <label>
                  <span>Correo electrónico (será tu usuario en la caja y en el celular)</span>
                  <input
                    type="email"
                    required
                    placeholder="dueno@mirestaurante.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </label>
                <label>
                  <span>Contraseña</span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </label>

                {formError && <p className="error">{formError}</p>}

                <button type="submit" className="btn fy-btn-red fy-btn-lg" disabled={submitting}>
                  {submitting ? 'Activando licencia…' : 'Activar 14 días gratis y bajar instalador →'}
                </button>
              </form>
            ) : (
              <div className="fy-download-box">
                <div className="fy-success-banner">
                  <strong>✓ ¡Cuenta activada con 14 días de prueba!</strong>
                  <p>
                    {registeredAccount.businessName} ({registeredAccount.rif}) · Usuario:{' '}
                    <strong>{registeredAccount.email}</strong> · Activa hasta el{' '}
                    {registeredAccount.validUntil}.
                  </p>
                </div>

                <a
                  href={INSTALLER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn primary fy-btn-lg fy-download-btn"
                >
                  ⬇ Descargar Instalador para Windows (FacturaPOS-Setup.exe)
                </a>

                <div className="fy-steps-mini">
                  <strong>¿Qué hacer al terminar la descarga?</strong>
                  <p>1. Ejecuta el instalador en la PC de tu caja.</p>
                  <p>2. Inicia sesión con el correo y contraseña que acabas de crear.</p>
                  <p>3. Conecta tu máquina fiscal HKA80 por USB o empieza en modo comanda.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
