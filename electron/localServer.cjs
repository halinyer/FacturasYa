const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { getFranchiseConfig } = require('./franchisesConfig.cjs');

let httpServer = null;
let io = null;
let currentPort = 3001;
let currentIp = '127.0.0.1';
let qrDataUrl = '';
let connectedSockets = new Set();
let userDataDir = '';

// In-memory restaurant data cache
let restaurantData = null;

function getAllLocalIps() {
  const interfaces = os.networkInterfaces();
  const list = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // IPv4, not internal, and ignore Windows link-local APIPA (169.254.x.x)
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
        list.push({
          name,
          address: iface.address
        });
      }
    }
  }
  return list;
}

function detectLocalIp() {
  const ips = getAllLocalIps();
  if (ips.length === 0) return '127.0.0.1';

  // Priority 1: Wi-Fi / Hotspot / Wireless
  const wifi = ips.find(i => /wi-fi|wlan|wireless/i.test(i.name) && !/virtual|vethernet|docker|bluetooth/i.test(i.name));
  if (wifi) return wifi.address;

  // Priority 2: Physical Ethernet / LAN
  const ethernet = ips.find(i => /ethernet|local area|en0|eth0/i.test(i.name) && !/virtual|vethernet|docker|bluetooth/i.test(i.name));
  if (ethernet) return ethernet.address;

  // Priority 3: First non-virtual adapter
  const nonVirtual = ips.find(i => !/virtual|vethernet|docker|bluetooth/i.test(i.name));
  if (nonVirtual) return nonVirtual.address;

  return ips[0].address;
}

async function refreshServerIp(manualIp = null) {
  const targetIp = manualIp && typeof manualIp === 'string' && manualIp.trim() 
    ? manualIp.trim() 
    : detectLocalIp();

  if (targetIp !== currentIp || !qrDataUrl) {
    console.log(`[LocalServer] Actualizando IP de red: ${currentIp} -> ${targetIp}`);
    currentIp = targetIp;
    const waiterUrl = `http://${currentIp}:${currentPort}/waiter`;
    try {
      qrDataUrl = await qrcode.toDataURL(waiterUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' }
      });
    } catch (err) {
      console.error('Error generando QR al actualizar IP:', err);
    }
  }
  return currentIp;
}

function getOrdersPath() {
  return path.join(userDataDir || process.cwd(), 'facturapos_orders.json');
}
function getOrdersBackupPath() {
  return path.join(userDataDir || process.cwd(), 'facturapos_orders.json.bak');
}
function getOrdersTempPath() {
  return path.join(userDataDir || process.cwd(), 'facturapos_orders.json.tmp');
}

function loadOrdersData() {
  const p = getOrdersPath();
  const bkp = getOrdersBackupPath();

  if (fs.existsSync(p)) {
    try {
      const data = fs.readFileSync(p, 'utf-8');
      if (data && data.trim()) return JSON.parse(data);
    } catch (e) {
      console.warn('[Orders] Archivo primario dañado, intentando .bak:', e);
    }
  }
  if (fs.existsSync(bkp)) {
    try {
      const bkpData = fs.readFileSync(bkp, 'utf-8');
      if (bkpData && bkpData.trim()) return JSON.parse(bkpData);
    } catch (e) {}
  }

  // Initial Seed for Tables & Waiters
  return {
    waiters: [
      { id: 'w_1', name: 'Carlos Mendoza', pin: '1111', active: true },
      { id: 'w_2', name: 'Valeria Rivas', pin: '2222', active: true },
      { id: 'w_3', name: 'Andrés Suárez', pin: '3333', active: true }
    ],
    tables: [
      { id: 't_1', name: 'Mesa 1', zone: 'Salón', status: 'libre' },
      { id: 't_2', name: 'Mesa 2', zone: 'Salón', status: 'libre' },
      { id: 't_3', name: 'Mesa 3', zone: 'Salón', status: 'libre' },
      { id: 't_4', name: 'Mesa 4', zone: 'Salón', status: 'libre' },
      { id: 't_5', name: 'Mesa 5', zone: 'Salón', status: 'libre' },
      { id: 't_6', name: 'Mesa 6', zone: 'Salón', status: 'libre' },
      { id: 't_7', name: 'Terraza 1', zone: 'Terraza', status: 'libre' },
      { id: 't_8', name: 'Terraza 2', zone: 'Terraza', status: 'libre' },
      { id: 't_9', name: 'Barra', zone: 'Barra', status: 'libre' },
      { id: 't_10', name: 'Para Llevar', zone: 'Delivery', status: 'libre' }
    ],
    orders: []
  };
}

function saveOrdersData(data) {
  try {
    const p = getOrdersPath();
    const bkp = getOrdersBackupPath();
    const tmp = getOrdersTempPath();
    const str = JSON.stringify(data, null, 2);

    fs.writeFileSync(tmp, str, 'utf-8');
    if (fs.existsSync(p)) {
      try { fs.copyFileSync(p, bkp); } catch (e) {}
    }
    fs.copyFileSync(tmp, p);
    try { fs.unlinkSync(tmp); } catch (e) {}
    return true;
  } catch (err) {
    console.error('[Orders] Error guardando facturapos_orders.json atómicamente:', err);
    return false;
  }
}

const defaultSeedProducts = [
  { id: 'hd_prod_1', name: '2 Burger Mini!', category: 'Combos', priceUSD: 5.99, image: './happydays/combo_2_burger_mini.jpg' },
  { id: 'hd_prod_2', name: '4 Burger Pana!', category: 'Combos', priceUSD: 14.99, image: './happydays/combo_4_burger_pana.jpg' },
  { id: 'hd_prod_3', name: 'Happy Panita!', category: 'Combos', priceUSD: 21.99, image: './happydays/combo_happy_panita.jpg' },
  { id: 'hd_prod_4', name: 'Full Burger Happy!', category: 'Combos', priceUSD: 24.99, image: './happydays/combo_full_burger_happy.jpg' },
  { id: 'hd_prod_5', name: 'Full Pollo Happy!', category: 'Combos', priceUSD: 24.99, image: './happydays/combo_full_pollo_happy.jpg' },
  { id: 'hd_prod_6', name: 'Club House Happy!', category: 'Combos', priceUSD: 34.99, image: './happydays/combo_club_house_happy.jpg' },
  { id: 'hd_prod_7', name: 'Happy Familiar!', category: 'Combos', priceUSD: 49.99, image: './happydays/combo_happy_familiar.jpg' },
  { id: 'hd_prod_8', name: 'Parrilla Happy!', category: 'Combos', priceUSD: 49.99, image: './happydays/combo_parrilla_happy.jpg' },
  // Refrescos y Bebidas
  { id: 'hd_prod_coca_lata', name: 'Coca-Cola Original (Lata 355ml)', category: 'Refrescos y Bebidas', priceUSD: 1.50, image: './happydays/drinks/coca_cola_lata_355ml.jpg' },
  { id: 'hd_prod_coca_500', name: 'Coca-Cola Botella 500ml', category: 'Refrescos y Bebidas', priceUSD: 1.80, image: './happydays/drinks/coca_cola_botella_500ml.jpg' },
  { id: 'hd_prod_coca_15l', name: 'Coca-Cola Botella 1.5 Litros', category: 'Refrescos y Bebidas', priceUSD: 2.50, image: './happydays/drinks/coca_cola_botella_1.5l.jpg' },
  { id: 'hd_prod_coca_2l', name: 'Coca-Cola Botella 2 Litros', category: 'Refrescos y Bebidas', priceUSD: 3.00, image: './happydays/drinks/coca_cola_botella_2l.jpg' },
  { id: 'hd_prod_coca_zero', name: 'Coca-Cola Sin Azúcar (Lata 355ml)', category: 'Refrescos y Bebidas', priceUSD: 1.50, image: './happydays/drinks/coca_cola_zero_lata.jpg' },
  { id: 'hd_prod_7up_lata', name: '7Up (Lata 355ml)', category: 'Refrescos y Bebidas', priceUSD: 1.50, image: './happydays/drinks/7up_lata_355ml.jpg' },
  { id: 'hd_prod_7up_15l', name: '7Up Botella 1.5 Litros', category: 'Refrescos y Bebidas', priceUSD: 2.50, image: './happydays/drinks/7up_botella_1.5l.jpg' },
  { id: 'hd_prod_7up_2l', name: '7Up Botella 2 Litros', category: 'Refrescos y Bebidas', priceUSD: 3.00, image: './happydays/drinks/7up_botella_2l.jpg' },
  { id: 'hd_prod_pepsi_lata', name: 'Pepsi Cola (Lata 355ml)', category: 'Refrescos y Bebidas', priceUSD: 1.50, image: './happydays/drinks/pepsi_lata_355ml.jpg' },
  { id: 'hd_prod_pepsi_15l', name: 'Pepsi Botella 1.5 Litros', category: 'Refrescos y Bebidas', priceUSD: 2.50, image: './happydays/drinks/pepsi_botella_1.5l.jpg' },
  { id: 'hd_prod_pepsi_2l', name: 'Pepsi Botella 2 Litros', category: 'Refrescos y Bebidas', priceUSD: 3.00, image: './happydays/drinks/pepsi_botella_2l.jpg' },
  { id: 'hd_prod_frescolita_lata', name: 'Frescolita (Lata 355ml)', category: 'Refrescos y Bebidas', priceUSD: 1.50, image: './happydays/drinks/frescolita_lata_355ml.jpg' },
  { id: 'hd_prod_frescolita_15l', name: 'Frescolita Botella 1.5 Litros', category: 'Refrescos y Bebidas', priceUSD: 2.50, image: './happydays/drinks/frescolita_botella_1.5l.jpg' },
  { id: 'hd_prod_frescolita_2l', name: 'Frescolita Botella 2 Litros', category: 'Refrescos y Bebidas', priceUSD: 3.00, image: './happydays/drinks/frescolita_botella_2l.jpg' },
  { id: 'hd_prod_chinotto_lata', name: 'Chinotto (Lata 355ml)', category: 'Refrescos y Bebidas', priceUSD: 1.50, image: './happydays/drinks/chinotto_lata_355ml.jpg' },
  { id: 'hd_prod_chinotto_15l', name: 'Chinotto Botella 1.5 Litros', category: 'Refrescos y Bebidas', priceUSD: 2.50, image: './happydays/drinks/chinotto_botella_1.5l.jpg' },
  { id: 'hd_prod_hit_naranja_lata', name: 'Hit Naranja (Lata 355ml)', category: 'Refrescos y Bebidas', priceUSD: 1.50, image: './happydays/drinks/hit_naranja_lata.jpg' },
  { id: 'hd_prod_hit_naranja_15l', name: 'Hit Naranja Botella 1.5 Litros', category: 'Refrescos y Bebidas', priceUSD: 2.50, image: './happydays/drinks/hit_naranja_botella_1.5l.jpg' },
  { id: 'hd_prod_hit_uva_lata', name: 'Hit Uva (Lata 355ml)', category: 'Refrescos y Bebidas', priceUSD: 1.50, image: './happydays/drinks/hit_uva_lata.jpg' },
  { id: 'hd_prod_maltin_lata', name: 'Maltín Polar (Lata 355ml)', category: 'Refrescos y Bebidas', priceUSD: 1.50, image: './happydays/drinks/maltin_polar_lata.jpg' },
  { id: 'hd_prod_maltin_botella', name: 'Maltín Polar (Botella)', category: 'Refrescos y Bebidas', priceUSD: 1.50, image: './happydays/drinks/maltin_polar_botella.jpg' },
  { id: 'hd_prod_agua_600', name: 'Agua Mineral 600ml', category: 'Refrescos y Bebidas', priceUSD: 1.00, image: './happydays/drinks/agua_mineral_botella.jpg' },
  { id: 'hd_prod_agua_15l', name: 'Agua Mineral 1.5 Litros', category: 'Refrescos y Bebidas', priceUSD: 1.80, image: './happydays/drinks/agua_mineral_botella.jpg' }
];

let cachedProducts = null;
let cachedExchangeRate = 876.80;
let lastDbMtime = 0;

function getMenuData() {
  const dbFile = path.join(userDataDir || process.cwd(), 'facturapos_db.json');
  if (fs.existsSync(dbFile)) {
    try {
      const stat = fs.statSync(dbFile);
      if (stat.mtimeMs !== lastDbMtime || !cachedProducts) {
        const db = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
        if (Array.isArray(db.pos_products) && db.pos_products.length > 0) {
          cachedProducts = db.pos_products.filter(p => p.active !== false && p.image && p.image.trim());
          if (db.pos_exchange_rate && Number(db.pos_exchange_rate) > 100) {
            cachedExchangeRate = Number(db.pos_exchange_rate);
          }
          lastDbMtime = stat.mtimeMs;
        }
      }
    } catch (e) {
      console.error('Error leyendo facturapos_db.json:', e);
    }
  }

  if (cachedProducts && cachedProducts.length > 0) {
    const categories = ['Todos', ...new Set(cachedProducts.map(p => p.category || 'General'))];
    return { products: cachedProducts, categories, exchangeRate: cachedExchangeRate };
  }

  // Guaranteed fallback so tablet is NEVER empty
  cachedProducts = defaultSeedProducts;
  const categories = ['Todos', ...new Set(cachedProducts.map(p => p.category || 'General'))];
  return { products: cachedProducts, categories, exchangeRate: cachedExchangeRate };
}

// Consultar tasa oficial de Venezuela (BCV) en tiempo real con fallback multi-proveedor
async function fetchLiveBcvRate() {
  let rate = null;
  let provider = '';

  // Proveedor 1: JustCarlux Rates en tiempo real (BCV directo 876.80)
  try {
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 4500);
    const res = await fetch('https://bcv.justcarlux.dev/api/v1/rates', { signal: controller.signal });
    clearTimeout(tId);
    if (res.ok) {
      const data = await res.json();
      if (data?.rates?.usd && !isNaN(data.rates.usd)) {
        rate = Number(data.rates.usd);
        provider = 'BCV en Vivo (JustCarlux)';
      }
    }
  } catch (e) {}

  // Proveedor 2: DolarApi Oficial (BCV Respaldo)
  if (!rate) {
    try {
      const controller = new AbortController();
      const tId = setTimeout(() => controller.abort(), 4500);
      const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', { signal: controller.signal });
      clearTimeout(tId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.promedio && !isNaN(data.promedio)) {
          rate = Number(data.promedio);
          provider = 'DolarApi Oficial (BCV)';
        }
      }
    } catch (e) {}
  }

  // Proveedor 3: DolarApi lista completa
  if (!rate) {
    try {
      const controller = new AbortController();
      const tId = setTimeout(() => controller.abort(), 4500);
      const res = await fetch('https://ve.dolarapi.com/v1/dolares', { signal: controller.signal });
      clearTimeout(tId);
      if (res.ok) {
        const list = await res.json();
        const oficial = Array.isArray(list) ? list.find(d => d.fuente === 'oficial') : null;
        if (oficial && oficial.promedio && !isNaN(oficial.promedio)) {
          rate = Number(oficial.promedio);
          provider = 'DolarApi Lista (BCV)';
        }
      }
    } catch (e) {}
  }

  if (rate && rate > 0) {
    cachedExchangeRate = rate;
    if (io) {
      io.emit('tasa:actualizada', { exchangeRate: cachedExchangeRate });
      io.emit('menu:actualizado', getMenuData());
      io.emit('restaurante:sync', getFullRestaurantState());
    }
    console.log(`[LocalServer] Tasa BCV sincronizada (${provider}): Bs. ${cachedExchangeRate}`);
    return { success: true, rate: cachedExchangeRate, provider };
  }

  return { success: false, rate: (cachedExchangeRate && cachedExchangeRate > 100) ? cachedExchangeRate : 876.80, cached: true };
}

function createLocalServer() {
  const app = express();
  httpServer = http.createServer(app);

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Servir activos de marca y fotos de productos de Happy Days a tablets en red local
  const happydaysDirs = [
    path.join(__dirname, '../public/happydays'),
    path.join(__dirname, '../dist/happydays'),
    path.join(process.cwd(), 'public/happydays'),
    path.join(process.cwd(), 'dist/happydays')
  ];

  happydaysDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      app.use('/happydays', express.static(dir, {
        maxAge: '1d',
        setHeaders: (res) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      }));
    }
  });

  // Handler directo con fallback inteligente jpg <-> png
  app.get('/happydays/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);
    res.setHeader('Access-Control-Allow-Origin', '*');
    for (const dir of happydaysDirs) {
      if (!fs.existsSync(dir)) continue;
      const direct = path.join(dir, filename);
      if (fs.existsSync(direct)) return res.sendFile(direct);
      if (filename.endsWith('.jpg')) {
        const alt = path.join(dir, filename.replace(/\.jpg$/, '.png'));
        if (fs.existsSync(alt)) return res.sendFile(alt);
      } else if (filename.endsWith('.png')) {
        const alt = path.join(dir, filename.replace(/\.png$/, '.jpg'));
        if (fs.existsSync(alt)) return res.sendFile(alt);
      }
    }
    res.status(404).send('Asset not found');
  });

  const publicAssetsPath = fs.existsSync(path.join(__dirname, '../public'))
    ? path.join(__dirname, '../public')
    : path.join(__dirname, '../dist');
  app.use(express.static(publicAssetsPath));

  // Socket.io instance
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  io.on('connection', (socket) => {
    connectedSockets.add(socket.id);
    console.log(`[Socket] Conectado: ${socket.id} (Total: ${connectedSockets.size})`);

    // Emit initial restaurant state on connect
    socket.emit('restaurante:sync', getFullRestaurantState());

    socket.on('disconnect', () => {
      connectedSockets.delete(socket.id);
      console.log(`[Socket] Desconectado: ${socket.id} (Total: ${connectedSockets.size})`);
    });

    socket.on('ping:tablet', (data) => {
      socket.emit('pong:servidor', { received: data, time: Date.now() });
    });
  });

  // REST API Endpoints
  app.get('/api/status', async (req, res) => {
    try {
      await refreshServerIp();
    } catch (e) {}
    const waiterUrl = `http://${currentIp}:${currentPort}/waiter`;
    res.json({
      status: 'online',
      server: 'FacturaPOS Local LAN Server',
      ip: currentIp,
      port: currentPort,
      url: waiterUrl,
      qrCode: qrDataUrl,
      allIps: getAllLocalIps(),
      connectedDevices: connectedSockets.size,
      connectedCount: connectedSockets.size,
      time: new Date().toISOString()
    });
  });

  app.post('/api/server/refresh-ip', async (req, res) => {
    try {
      const manualIp = req.body && req.body.ip;
      await refreshServerIp(manualIp);
      res.json(await getServerInfoAsync());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/restaurant/state', (req, res) => {
    res.json(getFullRestaurantState());
  });

  // Consultar tasa oficial de Venezuela (BCV) en tiempo real
  app.get('/api/bcv/rate', async (req, res) => {
    const force = req.query.force === 'true';
    if (force || !cachedExchangeRate || cachedExchangeRate < 100) {
      const result = await fetchLiveBcvRate();
      return res.json(result);
    }
    res.json({ success: true, rate: cachedExchangeRate });
  });

  // Forzar actualización inmediata de la tasa BCV
  app.post('/api/bcv/refresh', async (req, res) => {
    const result = await fetchLiveBcvRate();
    res.json(result);
  });

  // Sync exchange rate from desktop app
  app.post('/api/restaurant/sync-rate', (req, res) => {
    const { exchangeRate } = req.body;
    if (exchangeRate && !isNaN(exchangeRate) && Number(exchangeRate) > 100) {
      cachedExchangeRate = Number(exchangeRate);
      if (io) {
        io.emit('tasa:actualizada', { exchangeRate: cachedExchangeRate });
        io.emit('menu:actualizado', getMenuData());
        io.emit('restaurante:sync', getFullRestaurantState());
      }
      console.log(`[LocalServer] Tasa de cambio sincronizada: Bs. ${cachedExchangeRate}`);
    }
    res.json({ success: true, exchangeRate: cachedExchangeRate });
  });

  // Sync menu from desktop app
  app.post('/api/restaurant/sync-menu', (req, res) => {
    const { products, exchangeRate } = req.body;
    if (exchangeRate && !isNaN(exchangeRate) && Number(exchangeRate) > 100) {
      cachedExchangeRate = Number(exchangeRate);
    }
    if (Array.isArray(products) && products.length > 0) {
      cachedProducts = products.filter(p => p.active !== false && p.image && p.image.trim());
    }
    if (io) {
      io.emit('tasa:actualizada', { exchangeRate: cachedExchangeRate });
      io.emit('menu:actualizado', getMenuData());
      io.emit('restaurante:sync', getFullRestaurantState());
    }
    res.json({ success: true, count: (cachedProducts || []).length, exchangeRate: cachedExchangeRate });
  });

  // Send a new round from Waiter Tablet or PC
  app.post('/api/restaurant/order/round', (req, res) => {
    const { tableId, waiterId, waiterName, items } = req.body;
    if (!tableId || !items || !items.length) {
      return res.status(400).json({ error: 'Mesa e ítems requeridos' });
    }

    const table = restaurantData.tables.find(t => t.id === tableId);
    if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });

    // Find active open order or create one
    let order = restaurantData.orders.find(o => o.tableId === tableId && o.status === 'open');
    if (!order) {
      order = {
        id: 'ord_' + Date.now(),
        tableId,
        tableName: table.name,
        waiterId,
        waiterName: waiterName || 'Mesero',
        status: 'open',
        createdAt: new Date().toISOString(),
        rounds: []
      };
      restaurantData.orders.push(order);
    }

    const round = {
      id: 'rnd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      sentAt: new Date().toISOString(),
      waiterId,
      waiterName: waiterName || 'Mesero',
      status: 'pendiente', // 'pendiente' -> 'lista'
      items: items.map(i => ({
        productId: i.id || i.productId,
        name: i.name || i.productName,
        priceUSD: Number(i.priceUSD || i.unitPrice || 0),
        quantity: Number(i.quantity || 1),
        note: (i.note || '').trim()
      }))
    };

    order.rounds.push(round);
    table.status = 'ocupada';
    table.activeOrderId = order.id;

    saveOrdersData(restaurantData);

    // Broadcast in real-time
    io.emit('comanda:nueva', { order, round, table });
    io.emit('mesas:actualizadas', restaurantData.tables);
    io.emit('restaurante:sync', getFullRestaurantState());

    res.json({ success: true, orderId: order.id, roundId: round.id, order });
  });

  // Request bill for table
  app.post('/api/restaurant/table/:id/bill', (req, res) => {
    const table = restaurantData.tables.find(t => t.id === req.params.id);
    if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });

    table.status = 'cuenta';
    saveOrdersData(restaurantData);
    io.emit('mesas:actualizadas', restaurantData.tables);
    io.emit('restaurante:sync', getFullRestaurantState());
    io.emit('cuenta:pedida', { tableId: table.id, tableName: table.name });
    res.json({ success: true, table });
  });

  // Reopen table from 'cuenta' back to 'ocupada' (if client wants to order more or cancelled bill request)
  app.post('/api/restaurant/table/:id/reopen', (req, res) => {
    const table = restaurantData.tables.find(t => t.id === req.params.id);
    if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });

    table.status = 'ocupada';
    saveOrdersData(restaurantData);
    io.emit('mesas:actualizadas', restaurantData.tables);
    io.emit('restaurante:sync', getFullRestaurantState());
    res.json({ success: true, table });
  });

  // Free / Close Table
  app.post('/api/restaurant/table/:id/free', (req, res) => {
    const table = restaurantData.tables.find(t => t.id === req.params.id);
    if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });

    const order = restaurantData.orders.find(o => o.tableId === req.params.id && o.status === 'open');
    if (order) {
      order.status = 'closed';
      order.closedAt = new Date().toISOString();
    }

    if (table.isTakeaway || table.id.startsWith('t_llevar_')) {
      const idx = restaurantData.tables.findIndex(t => t.id === req.params.id);
      if (idx !== -1) restaurantData.tables.splice(idx, 1);
    } else {
      table.status = 'libre';
      table.activeOrderId = null;
    }

    saveOrdersData(restaurantData);
    io.emit('mesas:actualizadas', restaurantData.tables);
    io.emit('restaurante:sync', getFullRestaurantState());
    res.json({ success: true });
  });

  // Mark round as ready (Kitchen/Cashier touches "Listo" -> vibrates waiter tablet!)
  app.post('/api/restaurant/round/:id/ready', (req, res) => {
    const roundId = req.params.id;
    let foundRound = null;
    let foundOrder = null;

    for (const order of restaurantData.orders) {
      const r = (order.rounds || []).find(rn => rn.id === roundId);
      if (r) {
        foundRound = r;
        foundOrder = order;
        r.status = 'lista';
        r.readyAt = new Date().toISOString();
        break;
      }
    }

    if (!foundRound) return res.status(404).json({ error: 'Comanda no encontrada' });

    saveOrdersData(restaurantData);

    // Broadcast to tablets that this round is ready!
    io.emit('comanda:lista', {
      roundId,
      orderId: foundOrder.id,
      tableId: foundOrder.tableId,
      tableName: foundOrder.tableName,
      waiterId: foundRound.waiterId,
      waiterName: foundRound.waiterName,
      sentAt: foundRound.sentAt,
      items: foundRound.items || []
    });
    io.emit('restaurante:sync', getFullRestaurantState());

    res.json({ success: true });
  });

  // Mark round as served/delivered (Waiters or Cashier)
  app.post('/api/restaurant/round/:id/served', (req, res) => {
    const roundId = req.params.id;
    let foundRound = null;
    let foundOrder = null;

    for (const order of restaurantData.orders) {
      const r = (order.rounds || []).find(rn => rn.id === roundId);
      if (r) {
        foundRound = r;
        foundOrder = order;
        r.status = 'servida';
        r.servedAt = new Date().toISOString();
        break;
      }
    }

    if (!foundRound) return res.status(404).json({ error: 'Comanda no encontrada' });

    saveOrdersData(restaurantData);

    io.emit('comanda:servida', {
      roundId,
      orderId: foundOrder.id,
      tableId: foundOrder.tableId,
      tableName: foundOrder.tableName,
      servedAt: foundRound.servedAt
    });
    io.emit('restaurante:sync', getFullRestaurantState());

    res.json({ success: true });
  });

  // Waiters management
  app.post('/api/restaurant/waiters', (req, res) => {
    const { name, pin } = req.body;
    if (!name || !pin) return res.status(400).json({ error: 'Nombre y PIN requeridos' });

    const newWaiter = {
      id: 'w_' + Date.now(),
      name: name.trim(),
      pin: pin.trim(),
      active: true
    };
    restaurantData.waiters.push(newWaiter);
    saveOrdersData(restaurantData);
    io.emit('restaurante:sync', getFullRestaurantState());
    res.json(newWaiter);
  });

  app.put('/api/restaurant/waiters/:id', (req, res) => {
    const waiterId = req.params.id;
    const { name, pin, active } = req.body;
    const waiter = (restaurantData.waiters || []).find(w => w.id === waiterId);
    if (!waiter) return res.status(404).json({ error: 'Mesero no encontrado' });

    if (name !== undefined && name.trim()) waiter.name = name.trim();
    if (pin !== undefined && pin.trim()) waiter.pin = pin.trim();
    if (active !== undefined) waiter.active = !!active;

    saveOrdersData(restaurantData);
    io.emit('restaurante:sync', getFullRestaurantState());
    res.json(waiter);
  });

  app.delete('/api/restaurant/waiters/:id', (req, res) => {
    const waiterId = req.params.id;
    const index = (restaurantData.waiters || []).findIndex(w => w.id === waiterId);
    if (index === -1) return res.status(404).json({ error: 'Mesero no encontrado' });

    restaurantData.waiters.splice(index, 1);
    saveOrdersData(restaurantData);
    io.emit('restaurante:sync', getFullRestaurantState());
    res.json({ success: true, id: waiterId });
  });

  // Tables management
  app.post('/api/restaurant/tables', (req, res) => {
    const { name, zone, isTakeaway } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre de mesa requerido' });

    const newTable = {
      id: isTakeaway ? ('t_llevar_' + Date.now()) : ('t_' + Date.now()),
      name: name.trim(),
      zone: zone || (isTakeaway ? 'Para Llevar' : 'Salón'),
      status: isTakeaway ? 'ocupada' : 'libre',
      isTakeaway: !!isTakeaway
    };
    restaurantData.tables.push(newTable);
    saveOrdersData(restaurantData);
    io.emit('mesas:actualizadas', restaurantData.tables);
    io.emit('restaurante:sync', getFullRestaurantState());
    res.json(newTable);
  });

  app.put('/api/restaurant/tables/:id', (req, res) => {
    const tableId = req.params.id;
    const { name, zone } = req.body;
    const table = (restaurantData.tables || []).find(t => t.id === tableId);
    if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });

    if (name !== undefined && name.trim()) table.name = name.trim();
    if (zone !== undefined && zone.trim()) table.zone = zone.trim();

    saveOrdersData(restaurantData);
    io.emit('mesas:actualizadas', restaurantData.tables);
    io.emit('restaurante:sync', getFullRestaurantState());
    res.json(table);
  });

  app.delete('/api/restaurant/tables/:id', (req, res) => {
    const tableId = req.params.id;
    const index = (restaurantData.tables || []).findIndex(t => t.id === tableId);
    if (index === -1) return res.status(404).json({ error: 'Mesa no encontrada' });

    const table = restaurantData.tables[index];
    if (table.status === 'ocupada' || table.status === 'cuenta') {
      return res.status(400).json({ error: 'No se puede eliminar una mesa que tiene pedidos activos' });
    }

    restaurantData.tables.splice(index, 1);
    saveOrdersData(restaurantData);
    io.emit('mesas:actualizadas', restaurantData.tables);
    io.emit('restaurante:sync', getFullRestaurantState());
    res.json({ success: true, id: tableId });
  });

  // Franchise Configuration & Synchronization
  app.get('/api/franchise', (req, res) => {
    if (!restaurantData) restaurantData = loadOrdersData();
    const franchise = getFranchiseConfig(restaurantData.franchiseId || 'facturapos');
    res.json(franchise);
  });

  app.post('/api/franchise', (req, res) => {
    if (!restaurantData) restaurantData = loadOrdersData();
    const { franchiseId } = req.body;
    if (franchiseId) {
      restaurantData.franchiseId = franchiseId;
      saveOrdersData(restaurantData);
      const franchise = getFranchiseConfig(franchiseId);
      io.emit('franchise:actualizada', franchise);
      io.emit('restaurante:sync', getFullRestaurantState());
    }
    res.json({ success: true, franchise: getFranchiseConfig(restaurantData.franchiseId || 'facturapos') });
  });

  // Complete Mobile/Tablet Waiter App Interface
  app.get('/waiter', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(renderWaiterView());
  });

  app.get('/waiter-manifest.json', (req, res) => {
    if (!restaurantData) restaurantData = loadOrdersData();
    const franchise = getFranchiseConfig(restaurantData.franchiseId || 'facturapos');
    res.setHeader('Content-Type', 'application/manifest+json');
    res.json({
      name: franchise.waiterApp ? franchise.waiterApp.title : franchise.name + " Comandero",
      short_name: franchise.waiterApp ? franchise.waiterApp.shortName : franchise.name,
      start_url: "/waiter",
      display: "standalone",
      background_color: "#0f172a",
      theme_color: franchise.branding.colors.dark,
      orientation: "any"
    });
  });

  return { app, httpServer, io };
}

function getFullRestaurantState() {
  if (!restaurantData) restaurantData = loadOrdersData();
  const menu = getMenuData();
  const activeOrders = (restaurantData.orders || []).filter(o => o.status === 'open');
  const franchise = getFranchiseConfig(restaurantData.franchiseId || 'facturapos');

  return {
    tables: restaurantData.tables || [],
    waiters: restaurantData.waiters || [],
    activeOrders,
    menu,
    franchise
  };
}

// Complete responsive client-side app for Waiter Tablet (Modularized in waiterView.cjs)
function renderWaiterView() {
  try {
    const waiterViewPath = require.resolve('./waiterView.cjs');
    delete require.cache[waiterViewPath];
  } catch (e) {}
  const { renderWaiterView: getView } = require('./waiterView.cjs');
  return getView(getFullRestaurantState());
}

async function startServer(port = 3001, appDataPath = '') {
  if (appDataPath) userDataDir = appDataPath;
  if (httpServer) return getServerInfo();

  currentPort = port;
  currentIp = detectLocalIp();
  restaurantData = loadOrdersData();
  createLocalServer();

  return new Promise((resolve, reject) => {
    httpServer.listen(currentPort, '0.0.0.0', async () => {
      const waiterUrl = `http://${currentIp}:${currentPort}/waiter`;
      console.log(`[LocalServer] Servidor iniciado en ${waiterUrl}`);

      try {
        qrDataUrl = await qrcode.toDataURL(waiterUrl, {
          width: 320,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' }
        });
      } catch (err) {
        console.error('Error generando QR:', err);
      }

      // Sincronizar tasa oficial BCV de Venezuela al iniciar y programar cada 30 min
      fetchLiveBcvRate().catch(() => {});
      setInterval(() => {
        fetchLiveBcvRate().catch(() => {});
      }, 30 * 60 * 1000);

      resolve(getServerInfo());
    }).on('error', (err) => {
      console.error('Error arrancando servidor local:', err);
      reject(err);
    });
  });
}

function stopServer() {
  if (httpServer) {
    httpServer.close();
    httpServer = null;
    io = null;
    connectedSockets.clear();
  }
}

async function getServerInfoAsync() {
  await refreshServerIp();
  const waiterUrl = `http://${currentIp}:${currentPort}/waiter`;
  return {
    isRunning: !!httpServer,
    ip: currentIp,
    port: currentPort,
    url: waiterUrl,
    qrCode: qrDataUrl,
    allIps: getAllLocalIps(),
    connectedDevices: connectedSockets.size,
    connectedCount: connectedSockets.size
  };
}

function getServerInfo() {
  const waiterUrl = `http://${currentIp}:${currentPort}/waiter`;
  return {
    isRunning: !!httpServer,
    ip: currentIp,
    port: currentPort,
    url: waiterUrl,
    qrCode: qrDataUrl,
    allIps: getAllLocalIps(),
    connectedDevices: connectedSockets.size,
    connectedCount: connectedSockets.size
  };
}

function broadcastEvent(eventName, payload) {
  if (io) {
    io.emit(eventName, payload);
  }
}

module.exports = {
  startServer,
  stopServer,
  getServerInfo,
  getServerInfoAsync,
  refreshServerIp,
  getAllLocalIps,
  broadcastEvent
};
