const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const os = require('os');
const path = require('path');
const fs = require('fs');

let httpServer = null;
let io = null;
let currentPort = 3001;
let currentIp = '127.0.0.1';
let qrDataUrl = '';
let connectedSockets = new Set();
let userDataDir = '';

// In-memory restaurant data cache
let restaurantData = null;

function detectLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
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
      try { fs.unlinkSync(p); } catch (e) {}
    }
    fs.renameSync(tmp, p);
    return true;
  } catch (err) {
    console.error('[Orders] Error guardando facturapos_orders.json atómicamente:', err);
    return false;
  }
}

const defaultSeedProducts = [
  { id: 'prod_1', name: 'Barquilla Simple', category: 'Barquillas', priceUSD: 1.5, image: 'https://images.unsplash.com/photo-1557142046-c704a3adf8f6?auto=format&fit=crop&w=400' },
  { id: 'prod_2', name: 'Barquilla Doble', category: 'Barquillas', priceUSD: 2.5, image: 'https://images.unsplash.com/photo-1563805042-7684c8a9e9ce?auto=format&fit=crop&w=400' },
  { id: 'prod_3', name: 'Barquilla Premium', category: 'Barquillas', priceUSD: 3.5, image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=400' },
  { id: 'prod_4', name: 'Helado 1 Litro', category: 'Litros', priceUSD: 6.0, image: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=400' },
  { id: 'prod_5', name: 'Helado 2 Litros', category: 'Litros', priceUSD: 11.0, image: 'https://images.unsplash.com/photo-1553177595-4de2bb0842b9?auto=format&fit=crop&w=400' },
  { id: 'prod_6', name: 'Helado 4.5 Litros (Tinetta)', category: 'Litros', priceUSD: 20.0, image: 'https://images.unsplash.com/photo-1570197781417-0a82375c9371?auto=format&fit=crop&w=400' },
  { id: 'prod_7', name: 'Sundae Sencillo', category: 'Sundaes', priceUSD: 2.0, image: 'https://images.unsplash.com/photo-1560008581-09826d1de69e?auto=format&fit=crop&w=400' },
  { id: 'prod_8', name: 'Sundae Especial', category: 'Sundaes', priceUSD: 3.5, image: 'https://images.unsplash.com/photo-1563805042-7684c8a9e9ce?auto=format&fit=crop&w=400' },
  { id: 'prod_9', name: 'Banana Split', category: 'Sundaes', priceUSD: 5.0, image: 'https://images.unsplash.com/photo-1529124479902-1596706e232e?auto=format&fit=crop&w=400' },
  { id: 'prod_10', name: 'Sirope Extra', category: 'Toppings/Extras', priceUSD: 0.5 },
  { id: 'prod_11', name: 'Lluvia de Chocolate', category: 'Toppings/Extras', priceUSD: 0.5 },
  { id: 'prod_12', name: 'Galleta Adicional', category: 'Toppings/Extras', priceUSD: 0.8 }
];

let cachedProducts = null;
let cachedExchangeRate = 876.80;

function getMenuData() {
  if (cachedProducts && cachedProducts.length > 0) {
    const categories = ['Todos', ...new Set(cachedProducts.map(p => p.category || 'General'))];
    return { products: cachedProducts, categories, exchangeRate: cachedExchangeRate };
  }

  const dbFile = path.join(userDataDir || process.cwd(), 'facturapos_db.json');
  if (fs.existsSync(dbFile)) {
    try {
      const db = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
      if (Array.isArray(db.pos_products) && db.pos_products.length > 0) {
        cachedProducts = db.pos_products.filter(p => p.active !== false);
        cachedExchangeRate = (db.pos_exchange_rate && Number(db.pos_exchange_rate) > 100) ? Number(db.pos_exchange_rate) : 876.80;
        const categories = ['Todos', ...new Set(cachedProducts.map(p => p.category || 'General'))];
        return { products: cachedProducts, categories, exchangeRate: cachedExchangeRate };
      }
    } catch (e) {
      console.error('Error leyendo productos:', e);
    }
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
  app.get('/api/status', (req, res) => {
    const waiterUrl = `http://${currentIp}:${currentPort}/waiter`;
    res.json({
      status: 'online',
      server: 'FacturaPOS Local LAN Server',
      ip: currentIp,
      port: currentPort,
      url: waiterUrl,
      qrCode: qrDataUrl,
      connectedDevices: connectedSockets.size,
      connectedCount: connectedSockets.size,
      time: new Date().toISOString()
    });
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
      cachedProducts = products.filter(p => p.active !== false);
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

    res.json({ success: true, orderId: order.id, roundId: round.id });
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

    table.status = 'libre';
    table.activeOrderId = null;

    const order = restaurantData.orders.find(o => o.tableId === req.params.id && o.status === 'open');
    if (order) {
      order.status = 'closed';
      order.closedAt = new Date().toISOString();
    }

    saveOrdersData(restaurantData);
    io.emit('mesas:actualizadas', restaurantData.tables);
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
    const { name, zone } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre de mesa requerido' });

    const newTable = {
      id: 't_' + Date.now(),
      name: name.trim(),
      zone: zone || 'Salón',
      status: 'libre'
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

  // Complete Mobile/Tablet Waiter App Interface
  app.get('/waiter', (req, res) => {
    res.send(renderWaiterView());
  });

  return { app, httpServer, io };
}

function getFullRestaurantState() {
  if (!restaurantData) restaurantData = loadOrdersData();
  const menu = getMenuData();
  const activeOrders = (restaurantData.orders || []).filter(o => o.status === 'open');

  return {
    tables: restaurantData.tables || [],
    waiters: restaurantData.waiters || [],
    activeOrders,
    menu
  };
}

// Complete responsive client-side app for Waiter Tablet
function renderWaiterView() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>FacturaPOS Comandero</title>
  <link rel="manifest" href="data:application/manifest+json;utf8,{'name':'FacturaPOS','short_name':'Comandas','display':'standalone','start_url':'/waiter'}">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background: #f1f5f9; color: #0f172a; height: 100vh; display: flex; flex-direction: column; overflow: hidden; user-select: none; }
    
    header { background: #0f172a; color: #ffffff; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); flex-shrink: 0; z-index: 50; }
    .brand { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 1.05rem; }
    .header-actions { display: flex; align-items: center; gap: 10px; }
    .rate-badge { background: #1e293b; border: 1px solid #334155; color: #34d399; font-weight: 800; font-size: 0.78rem; padding: 5px 10px; border-radius: 10px; display: flex; align-items: center; gap: 4px; white-space: nowrap; }
    .bell-btn { position: relative; background: #1e293b; border: 1px solid #334155; color: #ffffff; width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.15rem; cursor: pointer; transition: all 0.15s; }
    .bell-btn:active { transform: scale(0.92); background: #334155; }
    .notif-badge { position: absolute; top: -4px; right: -4px; background: #ef4444; color: #ffffff; font-size: 0.72rem; font-weight: 800; min-width: 19px; height: 19px; border-radius: 999px; display: flex; align-items: center; justify-content: center; padding: 0 4px; border: 2px solid #0f172a; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4); animation: pulseBadge 1.8s infinite; }
    @keyframes pulseBadge { 0% { transform: scale(1); } 50% { transform: scale(1.18); box-shadow: 0 0 10px rgba(239, 68, 68, 0.8); } 100% { transform: scale(1); } }
    .waiter-badge { background: #334155; padding: 6px 12px; border-radius: 999px; font-size: 0.82rem; font-weight: 700; display: flex; align-items: center; gap: 6px; cursor: pointer; }
    
    main { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; position: relative; }
    
    .login-container { margin: auto; max-width: 360px; width: 100%; text-align: center; }
    .waiter-card-btn { width: 100%; padding: 15px 18px; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 14px; font-weight: 800; font-size: 1rem; color: #0f172a; cursor: pointer; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.03); transition: all 0.15s; margin-bottom: 10px; }
    .waiter-card-btn:active { transform: scale(0.98); background: #f8fafc; border-color: #2563eb; }

    /* Touch PIN Keypad */
    .pin-modal-card { background: #ffffff; border-radius: 24px; padding: 24px; width: 100%; max-width: 330px; margin: auto; text-align: center; box-shadow: 0 15px 35px rgba(0,0,0,0.25); animation: zoomIn 0.2s ease; }
    @keyframes zoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .pin-dots { display: flex; justify-content: center; gap: 14px; margin: 18px 0 22px 0; }
    .pin-dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #cbd5e1; transition: all 0.15s; }
    .pin-dot.filled { background: #2563eb; border-color: #2563eb; transform: scale(1.15); }
    .pin-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .pin-key { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px 0; font-size: 1.5rem; font-weight: 800; color: #1e293b; cursor: pointer; transition: all 0.1s; user-select: none; }
    .pin-key:active { background: #2563eb; color: #ffffff; transform: scale(0.95); }
    .pin-key.key-action { font-size: 1.1rem; background: #f1f5f9; color: #64748b; }

    /* Tables Grid */
    .zones-bar { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 8px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
    .zones-bar::-webkit-scrollbar { display: none; }
    .zone-pill { flex-shrink: 0; padding: 7px 15px; border-radius: 999px; background: #ffffff; color: #475569; font-weight: 700; font-size: 0.84rem; border: 1.5px solid #cbd5e1; white-space: nowrap; cursor: pointer; transition: all 0.15s; }
    .zone-pill:active { transform: scale(0.95); }
    .zone-pill.active { background: #0f172a; color: #ffffff; border-color: #0f172a; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2); }
    .tables-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; }
    .table-card { background: #ffffff; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; min-height: 110px; border: 2px solid #e2e8f0; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.03); transition: all 0.15s; position: relative; }
    .table-card:active { transform: scale(0.97); }
    .table-card.libre { border-color: #86efac; background: #f0fdf4; }
    .table-card.ocupada { border-color: #fdba74; background: #fff7ed; }
    .table-card.cuenta { border-color: #93c5fd; background: #eff6ff; }
    .table-card.ready-dish { border-color: #10b981; animation: pulseCard 2s infinite; }
    @keyframes pulseCard { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
    .table-name { font-weight: 800; font-size: 1.1rem; color: #0f172a; }
    .table-status { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; padding: 3px 8px; border-radius: 6px; width: fit-content; margin-top: 4px; }
    .status-libre { background: #dcfce7; color: #166534; }
    .status-ocupada { background: #ffedd5; color: #9a3412; }
    .status-cuenta { background: #dbeafe; color: #1e40af; }
    .table-total { font-weight: 800; font-size: 0.95rem; margin-top: 8px; color: #d97706; text-align: right; }

    /* Ordering Screen */
    .menu-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .back-btn { background: #e2e8f0; border: none; padding: 8px 14px; border-radius: 10px; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
    .sticky-order-bar { position: sticky; top: -14px; background: #f1f5f9; z-index: 25; padding-top: 4px; padding-bottom: 6px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    .search-box { width: 100%; margin-bottom: 8px; }
    .search-input { width: 100%; padding: 10px 14px; border-radius: 12px; border: 1.5px solid #cbd5e1; font-size: 0.9rem; background: #fff; outline: none; }
    .search-input:focus { border-color: #2563eb; }
    .prods-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; padding-bottom: 150px; }
    .prod-card { background: #ffffff; border-radius: 14px; padding: 10px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: space-between; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.03); transition: transform 0.1s; position: relative; overflow: hidden; }
    .prod-card:active { transform: scale(0.97); }
    .prod-img-box { width: 100%; aspect-ratio: 1 / 1; max-height: 140px; border-radius: 10px; overflow: hidden; background: #ffffff; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; position: relative; padding: 4px; box-sizing: border-box; }
    .prod-img { width: 100%; height: 100%; object-fit: contain; object-position: center; display: block; border-radius: 6px; }
    .prod-img-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; background: linear-gradient(135deg, #fef3c7, #fde68a); color: #d97706; }
    .prod-cart-badge { position: absolute; top: 6px; right: 6px; background: #f59e0b; color: #ffffff; font-weight: 800; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; box-shadow: 0 2px 6px rgba(0,0,0,0.25); z-index: 5; }
    .prod-cat-tag { display: inline-block; font-size: 0.7rem; font-weight: 700; color: #2563eb; background: #eff6ff; border: 1px solid #dbeafe; border-radius: 6px; padding: 2px 7px; margin-bottom: 5px; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .prod-name { font-weight: 700; font-size: 0.88rem; color: #0f172a; margin-bottom: 4px; line-height: 1.25; }
    .prod-price { font-weight: 800; color: #059669; font-size: 0.95rem; }

    /* Bottom Cart Bar */
    .cart-bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(15, 23, 42, 0.97); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); color: #fff; padding: 12px 18px; padding-bottom: max(14px, env(safe-area-inset-bottom)); display: flex; justify-content: space-between; align-items: center; box-shadow: 0 -4px 20px rgba(0,0,0,0.2); z-index: 100; }
    .send-btn { background: #10b981; color: #0f172a; border: none; padding: 12px 20px; border-radius: 12px; font-weight: 800; font-size: 0.95rem; cursor: pointer; }
    .send-btn:active { transform: scale(0.97); }

    /* Modal / Drawer */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: flex-end; z-index: 200; backdrop-filter: blur(2px); animation: fadeIn 0.2s ease; }
    .modal-overlay.center { align-items: center; justify-content: center; padding: 20px; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .modal-sheet { background: #ffffff; width: 100%; border-radius: 24px 24px 0 0; padding: 20px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 -10px 25px rgba(0,0,0,0.2); animation: slideUp 0.25s ease; }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .cart-item-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .qty-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: 800; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; }

    .alert-banner { position: fixed; top: 12px; left: 14px; right: 14px; background: #10b981; color: #ffffff; padding: 12px 16px; border-radius: 14px; font-weight: 800; display: flex; align-items: center; justify-content: space-between; z-index: 1000; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: slideDown 0.3s ease; }
    @keyframes slideDown { from { transform: translateY(-50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  </style>
  <script src="/socket.io/socket.io.js"></script>
</head>
<body>

  <header>
    <div class="brand">
      <span style="font-size: 1.25rem;">🍦</span>
      <span id="headerTitle">FacturaPOS</span>
    </div>
    <div class="header-actions">
      <div id="tabletRateBadge" class="rate-badge" title="Tasa BCV del Día">💵 Bs. --</div>
      <button id="notifBellBtn" class="bell-btn" onclick="openNotifsModal()" title="Avisos de Cocina">
        <span>🔔</span>
        <span id="notifBadge" class="notif-badge" style="display: none;">0</span>
      </button>
      <div id="waiterBtn" class="waiter-badge" onclick="logoutWaiter()">
        <span>👤</span>
        <span id="currentWaiterName">Seleccionar</span>
      </div>
    </div>
  </header>

  <main id="appContent">
    <div style="margin: auto; text-align: center; color: #64748b; padding: 40px;">
      <div style="font-size: 2rem; margin-bottom: 10px;">⏳</div>
      <div>Conectando con FacturaPOS...</div>
    </div>
  </main>

  <div id="cartBar" class="cart-bottom-bar" style="display: none;">
    <div>
      <div style="font-size: 0.75rem; color: #94a3b8;">Items: <span id="cartCount" style="font-weight: 800; color: #fff;">0</span></div>
      <div style="font-size: 1.1rem; font-weight: 800; color: #34d399;" id="cartTotal">$0.00</div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="back-btn" onclick="openCartModal()" style="background: #334155; color: #fff;">Ver Detalle</button>
      <button class="send-btn" onclick="sendOrderRound()">Enviar Pedido 🚀</button>
    </div>
  </div>

  <div id="alertBox"></div>

  <script>
    const socket = io();
    let state = {
      waiters: [],
      tables: [],
      activeOrders: [],
      menu: { products: [], categories: ['Todos'], exchangeRate: 876.80 }
    };

    let currentWaiter = null;
    let selectedTable = null;
    let selectedZone = 'Todos';
    let selectedCategory = 'Todos';
    let prodSearchQuery = '';
    let currentCart = [];
    let currentScreen = 'login';

    // Touch PIN Modal State
    let pinTargetWaiter = null;
    let currentPinInput = '';

    // Persistent notifications
    let savedNotifs = [];
    try {
      savedNotifs = JSON.parse(localStorage.getItem('waiter_notifs') || '[]');
      if (!Array.isArray(savedNotifs)) savedNotifs = [];
    } catch (e) {
      savedNotifs = [];
    }

    function persistNotifs() {
      try {
        localStorage.setItem('waiter_notifs', JSON.stringify(savedNotifs));
      } catch (e) {}
      updateNotifBadge();
    }

    function updateNotifBadge() {
      const badge = document.getElementById('notifBadge');
      const count = savedNotifs.filter(function(n) { return !n.served; }).length;
      if (badge) {
        if (count > 0) {
          badge.innerText = count > 9 ? '9+' : count;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }
    }

    function updateRateDisplay() {
      const badge = document.getElementById('tabletRateBadge');
      const raw = state && state.menu ? Number(state.menu.exchangeRate) : 876.80;
      const rate = (!isNaN(raw) && raw > 100) ? raw : 876.80;
      if (badge) {
        badge.innerText = '💵 Bs. ' + rate.toFixed(2);
      }
    }

    function playKitchenChime() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        
        const o1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        o1.type = 'triangle';
        o1.frequency.setValueAtTime(587.33, now);
        g1.gain.setValueAtTime(0.4, now);
        g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        o1.connect(g1);
        g1.connect(ctx.destination);
        o1.start(now);
        o1.stop(now + 0.45);

        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.type = 'sine';
        o2.frequency.setValueAtTime(880, now + 0.12);
        g2.gain.setValueAtTime(0.5, now + 0.12);
        g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
        o2.connect(g2);
        g2.connect(ctx.destination);
        o2.start(now + 0.12);
        o2.stop(now + 0.7);
      } catch (err) {}
    }

    function onImgError(img) {
      img.style.display = 'none';
      if (img.nextElementSibling) img.nextElementSibling.style.display = 'flex';
    }

    function closeModal(id) {
      const el = document.getElementById(id);
      if (el) el.remove();
    }

    function closePinModal() { closeModal('pinModal'); }
    function closeNotifsModal() { closeModal('notifsModal'); }
    function closeCartModal() { closeModal('cartModal'); }

    // Socket Handlers
    socket.on('restaurante:sync', function(data) {
      state = data;
      if (currentWaiter && Array.isArray(state.waiters)) {
        const stillValid = state.waiters.find(function(w) { return w.id === currentWaiter.id && w.active !== false; });
        if (!stillValid) {
          currentWaiter = null;
          localStorage.removeItem('waiter_logged_id');
        } else {
          currentWaiter = stillValid;
        }
      }
      updateRateDisplay();
      if (Array.isArray(state.activeOrders)) {
        state.activeOrders.forEach(function(o) {
          (o.rounds || []).forEach(function(r) {
            if (r.status === 'lista') {
              const exists = savedNotifs.some(function(n) { return n.roundId === r.id; });
              if (!exists) {
                savedNotifs.unshift({
                  id: 'notif_' + r.id,
                  roundId: r.id,
                  tableName: o.tableName,
                  waiterName: r.waiterName || 'Mesero',
                  waiterId: r.waiterId,
                  sentAt: r.sentAt,
                  time: new Date(r.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  items: r.items || [],
                  served: false,
                  timestamp: new Date(r.sentAt).getTime()
                });
              }
            } else if (r.status === 'servida') {
              savedNotifs = savedNotifs.filter(function(n) { return n.roundId !== r.id; });
            }
          });
        });
        persistNotifs();
      }
      renderCurrentScreen();
    });

    socket.on('mesas:actualizadas', function(tables) {
      state.tables = tables;
      if (currentScreen === 'tables') renderTablesScreen();
    });

    socket.on('menu:actualizado', function(menu) {
      state.menu = menu;
      updateRateDisplay();
      if (currentScreen === 'order') renderOrderScreen();
    });

    socket.on('tasa:actualizada', function(data) {
      if (data && data.exchangeRate) {
        if (!state.menu) state.menu = {};
        state.menu.exchangeRate = Number(data.exchangeRate);
        updateRateDisplay();
        if (currentScreen === 'order') renderOrderScreen();
      }
    });

    socket.on('comanda:lista', function(data) {
      playKitchenChime();
      if (navigator.vibrate) navigator.vibrate([350, 150, 350, 150, 500]);

      const notifObj = {
        id: 'notif_' + (data.roundId || Date.now()),
        roundId: data.roundId,
        tableName: data.tableName,
        waiterName: data.waiterName || 'Mesero',
        waiterId: data.waiterId,
        sentAt: data.sentAt,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        items: data.items || [],
        served: false,
        timestamp: Date.now()
      };

      const existingIdx = savedNotifs.findIndex(function(n) { return n.roundId === data.roundId; });
      if (existingIdx >= 0) {
        savedNotifs[existingIdx] = notifObj;
      } else {
        savedNotifs.unshift(notifObj);
      }
      persistNotifs();

      showAlertWithAction('🔔 ¡Plato listo en ' + data.tableName + '!', 'Ver Avisos', openNotifsModal, '#2563eb');
      if (currentScreen === 'tables') renderTablesScreen();
    });

    socket.on('comanda:servida', function(data) {
      savedNotifs = savedNotifs.filter(function(n) { return n.roundId !== data.roundId; });
      persistNotifs();
      if (currentScreen === 'tables') renderTablesScreen();
      if (document.getElementById('notifsModal')) openNotifsModal();
    });

    function showAlertWithAction(msg, actionLabel, actionFn, bg) {
      bg = bg || '#10b981';
      const box = document.getElementById('alertBox');
      const alertEl = document.createElement('div');
      alertEl.className = 'alert-banner';
      alertEl.style.background = bg;
      alertEl.innerHTML = 
        '<div style="display:flex; align-items:center; gap:8px; flex:1;">' +
          '<span>' + msg + '</span>' +
        '</div>' +
        '<div style="display:flex; align-items:center; gap:8px;">' +
          (actionLabel ? '<button class="alert-action-btn" style="background:#ffffff; color:#0f172a; border:none; font-weight:800; font-size:0.8rem; padding:6px 12px; border-radius:8px; cursor:pointer;">' + actionLabel + '</button>' : '') +
          '<span class="alert-close-btn" style="cursor:pointer; font-size:1.3rem; padding:0 4px;">&times;</span>' +
        '</div>';
      
      const actBtn = alertEl.querySelector('.alert-action-btn');
      if (actBtn && actionFn) {
        actBtn.onclick = function() {
          alertEl.remove();
          actionFn();
        };
      }
      const closeBtn = alertEl.querySelector('.alert-close-btn');
      if (closeBtn) {
        closeBtn.onclick = function() {
          alertEl.remove();
        };
      }

      box.innerHTML = '';
      box.appendChild(alertEl);
      setTimeout(function() { if (alertEl.parentElement) alertEl.remove(); }, 6000);
    }

    function showAlert(msg, bg) {
      showAlertWithAction(msg, null, null, bg || '#10b981');
    }

    // Modal: Bandeja de Notificaciones de Cocina
    function openNotifsModal() {
      closeNotifsModal();
      const activeNotifs = savedNotifs.filter(function(n) { return !n.served; });

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'notifsModal';
      modal.innerHTML = 
        '<div class="modal-sheet" style="max-height: 85vh;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid #e2e8f0; padding-bottom:12px;">' +
            '<div style="display:flex; align-items:center; gap:8px;">' +
              '<span style="font-size:1.4rem;">🔔</span>' +
              '<h3 style="font-size:1.15rem; font-weight:800; color:#0f172a;">Avisos de Cocina</h3>' +
              (activeNotifs.length > 0 ? '<span style="background:#ef4444; color:#fff; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:999px;">' + activeNotifs.length + ' pendientes</span>' : '') +
            '</div>' +
            '<button onclick="closeNotifsModal()" style="border:none; background:#f1f5f9; width:34px; height:34px; border-radius:50%; font-size:1.2rem; cursor:pointer; display:flex; align-items:center; justify-content:center;">&times;</button>' +
          '</div>' +

          '<div style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:12px; padding-bottom:10px;">' +
            (activeNotifs.length === 0 ? 
              '<div style="text-align:center; padding:36px 16px; color:#64748b;">' +
                '<div style="font-size:2.5rem; margin-bottom:10px;">✨</div>' +
                '<div style="font-weight:700; font-size:1rem; color:#1e293b; margin-bottom:4px;">No hay pedidos pendientes por servir</div>' +
                '<div style="font-size:0.82rem;">Cuando cocina o caja marque una comanda lista, aparecerá aquí.</div>' +
              '</div>' :
              activeNotifs.map(function(n) {
                return '<div style="background:#ffffff; border:1.5px solid #10b981; border-radius:14px; padding:14px; box-shadow:0 3px 8px rgba(16, 185, 129, 0.08); display:flex; flex-direction:column; gap:10px;">' +
                  '<div style="display:flex; justify-content:space-between; align-items:center;">' +
                    '<div style="display:flex; align-items:center; gap:8px;">' +
                      '<span style="background:#10b981; color:#fff; font-weight:800; font-size:0.95rem; padding:4px 10px; border-radius:8px;">🍽️ ' + n.tableName + '</span>' +
                      '<span style="font-size:0.78rem; color:#64748b; font-weight:600;">' + (n.time || '') + '</span>' +
                    '</div>' +
                    '<span style="font-size:0.75rem; color:#2563eb; font-weight:700;">Mesero: ' + (n.waiterName || '') + '</span>' +
                  '</div>' +
                  (n.items && n.items.length > 0 ? 
                    '<div style="background:#f8fafc; border-radius:8px; padding:8px 10px; font-size:0.85rem; color:#334155;">' +
                      n.items.map(function(it) {
                        return '<div><strong>' + (it.quantity || 1) + 'x</strong> ' + (it.name || it.productName) + (it.note ? ' <span style="color:#d97706; font-style:italic;">(' + it.note + ')</span>' : '') + '</div>';
                      }).join('') +
                    '</div>' : '') +
                  '<button data-round-id="' + n.roundId + '" onclick="markNotifServedFromBtn(this)" style="background:#10b981; color:#ffffff; border:none; padding:11px; border-radius:10px; font-weight:800; font-size:0.88rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">' +
                    '<span>✓</span> Marcar como Servido / Entregado' +
                  '</button>' +
                '</div>';
              }).join('')
            ) +
          '</div>' +

          (activeNotifs.length > 1 ?
            '<div style="margin-top:10px; border-top:1px solid #e2e8f0; padding-top:10px;">' +
              '<button onclick="clearAllNotifications()" style="width:100%; background:#f1f5f9; color:#64748b; border:none; padding:10px; border-radius:10px; font-weight:700; font-size:0.85rem; cursor:pointer;">Limpiar todos los avisos</button>' +
            '</div>' : '') +
        '</div>';

      document.body.appendChild(modal);
    }

    function markNotifServedFromBtn(btn) {
      const roundId = btn.getAttribute('data-round-id');
      markNotificationServed(roundId);
    }

    function markNotificationServed(roundId) {
      fetch('/api/restaurant/round/' + roundId + '/served', { method: 'POST' }).catch(function() {});
      savedNotifs = savedNotifs.filter(function(n) { return n.roundId !== roundId; });
      persistNotifs();
      openNotifsModal();
      if (currentScreen === 'tables') renderTablesScreen();
    }

    function clearAllNotifications() {
      if (confirm('¿Limpiar todos los avisos de la bandeja?')) {
        savedNotifs.forEach(function(n) {
          fetch('/api/restaurant/round/' + n.roundId + '/served', { method: 'POST' }).catch(function() {});
        });
        savedNotifs = [];
        persistNotifs();
        closeNotifsModal();
        if (currentScreen === 'tables') renderTablesScreen();
      }
    }

    // Initial Load from Server
    fetch('/api/restaurant/state')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        state = data;
        const savedWaiterId = localStorage.getItem('waiter_logged_id');
        if (savedWaiterId && Array.isArray(state.waiters)) {
          const w = state.waiters.find(function(x) { return x.id === savedWaiterId; });
          if (w) currentWaiter = w;
        }
        updateNotifBadge();
        updateRateDisplay();
        renderCurrentScreen();
      })
      .catch(function(err) {
        console.error('Error cargando estado:', err);
        renderLoginScreen();
      });

    function renderCurrentScreen() {
      updateNotifBadge();
      if (!currentWaiter) {
        renderLoginScreen();
      } else if (selectedTable) {
        renderOrderScreen();
      } else {
        renderTablesScreen();
      }
    }

    // 1. SCREEN: LOGIN WAITERS
    function renderLoginScreen() {
      currentScreen = 'login';
      document.getElementById('cartBar').style.display = 'none';
      document.getElementById('currentWaiterName').innerText = 'Seleccionar';
      
      const app = document.getElementById('appContent');
      const waitersList = (state.waiters || []).filter(function(w) { return w.active !== false; });

      if (waitersList.length === 0) {
        app.innerHTML = 
          '<div class="login-container">' +
            '<h2 style="font-size: 1.3rem; font-weight: 800; margin-bottom: 6px;">Meseros</h2>' +
            '<p style="color: #64748b; font-size: 0.88rem; margin-bottom: 16px;">No hay meseros activos configurados en la PC.</p>' +
            '<button onclick="location.reload()" style="padding:10px 18px; border-radius:10px; background:#0f172a; color:#fff; border:none; font-weight:700; cursor:pointer;">Reintentar</button>' +
          '</div>';
        return;
      }

      app.innerHTML = 
        '<div class="login-container">' +
          '<h2 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 6px;">Bienvenido</h2>' +
          '<p style="color: #64748b; font-size: 0.88rem; margin-bottom: 20px;">Toca tu nombre para iniciar tu turno:</p>' +
          '<div style="display: flex; flex-direction: column; gap: 4px;">' +
            waitersList.map(function(w) {
              return '<button class="waiter-card-btn" data-id="' + w.id + '" onclick="selectWaiterFromBtn(this)">' +
                '<span style="display:flex; align-items:center; gap:10px;">' +
                  '<span style="font-size:1.4rem;">👤</span>' +
                  '<span style="font-size:1.05rem;">' + w.name + '</span>' +
                '</span>' +
                '<span style="color: #2563eb; font-weight:800; font-size: 0.9rem;">Ingresar &rarr;</span>' +
              '</button>';
            }).join('') +
          '</div>' +
        '</div>';
    }

    function selectWaiterFromBtn(btn) {
      const waiterId = btn.getAttribute('data-id');
      openPinModal(waiterId);
    }

    // On-Screen Tactile Numeric Keypad Modal
    function openPinModal(waiterId) {
      pinTargetWaiter = (state.waiters || []).find(function(w) { return w.id === waiterId; });
      if (!pinTargetWaiter) return;

      currentPinInput = '';
      closePinModal();

      const modal = document.createElement('div');
      modal.className = 'modal-overlay center';
      modal.id = 'pinModal';
      modal.innerHTML = 
        '<div class="pin-modal-card">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">' +
            '<span style="font-size:0.8rem; font-weight:800; text-transform:uppercase; color:#64748b;">Acceso de Mesero</span>' +
            '<button onclick="closePinModal()" style="border:none; background:none; font-size:1.4rem; cursor:pointer; color:#94a3b8;">&times;</button>' +
          '</div>' +
          '<h3 style="font-size:1.25rem; font-weight:800; color:#0f172a; margin-bottom:4px;">' + pinTargetWaiter.name + '</h3>' +
          '<p style="font-size:0.82rem; color:#64748b;">Introduce tu PIN de 4 dígitos:</p>' +
          
          '<div class="pin-dots" id="pinDotsRow">' +
            '<div class="pin-dot" id="dot0"></div>' +
            '<div class="pin-dot" id="dot1"></div>' +
            '<div class="pin-dot" id="dot2"></div>' +
            '<div class="pin-dot" id="dot3"></div>' +
          '</div>' +

          '<div class="pin-grid">' +
            ['1','2','3','4','5','6','7','8','9','✕','0','⌫'].map(function(k) {
              if (k === '✕') {
                return '<button class="pin-key pin-key-action" onclick="closePinModal()">✕</button>';
              } else if (k === '⌫') {
                return '<button class="pin-key pin-key-action" data-key="DEL" onclick="onPinKeyBtn(this)">⌫</button>';
              } else {
                return '<button class="pin-key" data-key="' + k + '" onclick="onPinKeyBtn(this)">' + k + '</button>';
              }
            }).join('') +
          '</div>' +
        '</div>';

      document.body.appendChild(modal);
    }

    function onPinKeyBtn(btn) {
      const key = btn.getAttribute('data-key');
      onPinKeyPress(key);
    }

    function onPinKeyPress(key) {
      if (!pinTargetWaiter) return;

      if (key === 'DEL') {
        currentPinInput = currentPinInput.slice(0, -1);
      } else if (currentPinInput.length < 4) {
        currentPinInput += key;
      }

      if (navigator.vibrate) navigator.vibrate(25);
      renderPinDots();

      if (currentPinInput.length === 4) {
        setTimeout(function() {
          if (currentPinInput === pinTargetWaiter.pin) {
            currentWaiter = pinTargetWaiter;
            localStorage.setItem('waiter_logged_id', currentWaiter.id);
            closePinModal();
            document.getElementById('currentWaiterName').innerText = currentWaiter.name;
            renderTablesScreen();
          } else {
            if (navigator.vibrate) navigator.vibrate([150, 100, 150]);
            currentPinInput = '';
            renderPinDots();
            alert('PIN incorrecto. Intenta de nuevo.');
          }
        }, 120);
      }
    }

    function renderPinDots() {
      for (let i = 0; i < 4; i++) {
        const dot = document.getElementById('dot' + i);
        if (dot) {
          if (i < currentPinInput.length) {
            dot.className = 'pin-dot filled';
          } else {
            dot.className = 'pin-dot';
          }
        }
      }
    }

    function logoutWaiter() {
      if (confirm('¿Cerrar turno de ' + (currentWaiter ? currentWaiter.name : '') + '?')) {
        currentWaiter = null;
        localStorage.removeItem('waiter_logged_id');
        selectedTable = null;
        currentCart = [];
        renderLoginScreen();
      }
    }

    // 2. SCREEN: TABLES MAP
    function renderTablesScreen() {
      currentScreen = 'tables';
      selectedTable = null;
      document.getElementById('cartBar').style.display = 'none';
      document.getElementById('headerTitle').innerText = 'Mesas en Sala';
      if (currentWaiter) document.getElementById('currentWaiterName').innerText = currentWaiter.name;

      const zones = ['Todos'].concat(Array.from(new Set(state.tables.map(function(t) { return t.zone || 'Salón'; }))));
      const filteredTables = selectedZone === 'Todos' ? state.tables : state.tables.filter(function(t) { return t.zone === selectedZone; });

      const app = document.getElementById('appContent');
      app.innerHTML = 
        '<div class="zones-bar">' +
          zones.map(function(z) {
            return '<button class="zone-pill ' + (selectedZone === z ? 'active' : '') + '" data-zone="' + z + '" onclick="filterZoneFromBtn(this)">' + z + '</button>';
          }).join('') +
        '</div>' +
        '<div class="tables-grid">' +
          filteredTables.map(function(t) {
            const order = (state.activeOrders || []).find(function(o) { return o.tableId === t.id; });
            const total = order ? order.rounds.reduce(function(acc, r) {
              return acc + r.items.reduce(function(sum, i) { return sum + (i.priceUSD * i.quantity); }, 0);
            }, 0) : 0;
            const hasReadyRound = order && (order.rounds || []).some(function(r) { return r.status === 'lista'; });

            return '<div class="table-card ' + t.status + (hasReadyRound ? ' ready-dish' : '') + '" data-id="' + t.id + '" onclick="openTableFromCard(this)">' +
              '<div>' +
                '<div class="table-name">' + t.name + '</div>' +
                '<div class="table-status status-' + t.status + '">' + t.status + '</div>' +
                (hasReadyRound ? '<div style="background:#10b981; color:#fff; font-size:0.68rem; font-weight:800; padding:2px 6px; border-radius:6px; display:inline-flex; align-items:center; gap:3px; margin-top:5px;">🔔 ¡Plato Listo!</div>' : '') +
              '</div>' +
              (total > 0 ? '<div class="table-total">$' + total.toFixed(2) + '</div>' : '<div style="font-size:0.75rem; color:#94a3b8; margin-top:8px;">' + (t.zone || '') + '</div>') +
            '</div>';
          }).join('') +
        '</div>';
    }

    function filterZoneFromBtn(btn) {
      filterZone(btn.getAttribute('data-zone'));
    }

    function filterZone(z) {
      selectedZone = z;
      renderTablesScreen();
    }

    function openTableFromCard(card) {
      const tableId = card.getAttribute('data-id');
      openTable(tableId);
    }

    function openTable(tableId) {
      selectedTable = state.tables.find(function(t) { return t.id === tableId; });
      currentCart = [];
      prodSearchQuery = '';
      renderOrderScreen();
    }

    // 3. SCREEN: MENU & ORDERING
    function renderOrderScreen() {
      currentScreen = 'order';
      document.getElementById('headerTitle').innerText = selectedTable.name;
      document.getElementById('cartBar').style.display = 'flex';
      updateCartBar();

      const cats = state.menu.categories || ['Todos'];
      const q = prodSearchQuery.toLowerCase().trim();
      const prods = (state.menu.products || []).filter(function(p) {
        const matchesCat = selectedCategory === 'Todos' || p.category === selectedCategory;
        const matchesQuery = !q || (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
        return matchesCat && matchesQuery;
      });

      const existingOrder = (state.activeOrders || []).find(function(o) { return o.tableId === selectedTable.id; });

      const app = document.getElementById('appContent');
      app.innerHTML = 
        '<div class="menu-header">' +
          '<button class="back-btn" onclick="renderTablesScreen()">&larr; Volver a Mesas</button>' +
          (existingOrder ? (selectedTable.status === 'cuenta' ? '<span style="background:#dbeafe; color:#1e40af; font-weight:800; font-size:0.8rem; padding:6px 12px; border-radius:10px;">💳 Cuenta Pedida en Caja</span>' : '<button class="back-btn" onclick="requestBill()" style="background:#2563eb; color:#ffffff; font-weight:800; border:none; box-shadow:0 2px 6px rgba(37,99,235,0.25);">🧾 Pedir Cuenta</button>') : '') +
        '</div>' +

        '<div class="sticky-order-bar">' +
          '<div class="search-box">' +
            '<input type="text" id="prodSearchInput" class="search-input" placeholder="🔍 Buscar producto o sabor..." value="' + prodSearchQuery.replace(/"/g, '&quot;') + '" oninput="onProductSearch(this.value)">' +
          '</div>' +

          '<div class="zones-bar">' +
            cats.map(function(c) {
              return '<button class="zone-pill ' + (selectedCategory === c ? 'active' : '') + '" data-cat="' + c + '" onclick="filterCatFromBtn(this)">' + c + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +

        '<div class="prods-grid">' +
          renderProductsGrid(prods) +
        '</div>';
    }

    function filterCatFromBtn(btn) {
      filterCategory(btn.getAttribute('data-cat'));
    }

    function renderProductsGrid(prods) {
      if (prods.length === 0) {
        return '<div style="grid-column: 1 / -1; text-align:center; padding:36px 16px; color:#94a3b8;"><div style="font-size:2.2rem; margin-bottom:8px;">🔍</div><div style="font-weight:700;">No se encontraron productos</div></div>';
      }

      return prods.map(function(p) {
        const hasImg = p.image && typeof p.image === 'string' && p.image.trim().length > 5;
        const safeImg = hasImg ? p.image.replace(/"/g, '&quot;') : '';
        const safeName = (p.name || 'Producto').replace(/"/g, '&quot;');
        const inCartItem = currentCart.find(function(i) { return i.id === p.id; });
        const rate = Number(state.menu.exchangeRate || 36.5);
        const bsPrice = (Number(p.priceUSD || 0) * rate).toFixed(2);

        return '<div class="prod-card" data-id="' + p.id + '" onclick="addToCartFromCard(this)">' +
          '<div class="prod-img-box">' +
            (inCartItem ? '<div class="prod-cart-badge">' + inCartItem.quantity + '</div>' : '') +
            (hasImg
              ? '<img class="prod-img" src="' + safeImg + '" alt="' + safeName + '" loading="lazy" onerror="onImgError(this)">' +
                '<div class="prod-img-fallback" style="display:none;">🍨</div>'
              : '<div class="prod-img-fallback">🍨</div>'
            ) +
          '</div>' +
          '<div style="flex:1; display:flex; flex-direction:column; justify-content:space-between;">' +
            '<div>' +
              '<span class="prod-cat-tag">' + (p.category || 'General') + '</span>' +
              '<div class="prod-name">' + safeName + '</div>' +
            '</div>' +
            '<div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:8px;">' +
              '<div class="prod-price">$' + Number(p.priceUSD || 0).toFixed(2) + '</div>' +
              '<div style="font-size:0.72rem; color:#64748b; font-weight:600;">Bs. ' + bsPrice + '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('') + '<div style="grid-column: 1 / -1; height: 80px; pointer-events: none;" aria-hidden="true"></div>';
    }

    function addToCartFromCard(card) {
      const prodId = card.getAttribute('data-id');
      addToCart(prodId);
    }

    function onProductSearch(val) {
      prodSearchQuery = val;
      const grid = document.querySelector('.prods-grid');
      const q = prodSearchQuery.toLowerCase().trim();
      const prods = (state.menu.products || []).filter(function(p) {
        const matchesCat = selectedCategory === 'Todos' || p.category === selectedCategory;
        const matchesQuery = !q || (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
        return matchesCat && matchesQuery;
      });

      if (grid) {
        grid.innerHTML = renderProductsGrid(prods);
      }
    }

    function filterCategory(c) {
      selectedCategory = c;
      renderOrderScreen();
    }

    function addToCart(prodId) {
      const prod = state.menu.products.find(function(p) { return p.id === prodId; });
      if (!prod) return;

      const existing = currentCart.find(function(i) { return i.id === prodId; });
      if (existing) {
        existing.quantity += 1;
      } else {
        currentCart.push({
          id: prod.id,
          name: prod.name,
          priceUSD: Number(prod.priceUSD),
          quantity: 1,
          note: ''
        });
      }
      if (navigator.vibrate) navigator.vibrate(35);
      updateCartBar();
      const searchBox = document.getElementById('prodSearchInput');
      if (searchBox) onProductSearch(searchBox.value);
    }

    function updateCartBar() {
      const count = currentCart.reduce(function(acc, i) { return acc + i.quantity; }, 0);
      const total = currentCart.reduce(function(acc, i) { return acc + (i.priceUSD * i.quantity); }, 0);
      document.getElementById('cartCount').innerText = count;
      document.getElementById('cartTotal').innerText = '$' + total.toFixed(2);
    }

    function openCartModal() {
      if (currentCart.length === 0) {
        alert('No has agregado ítems a la comanda todavía.');
        return;
      }

      closeCartModal();

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'cartModal';
      modal.innerHTML = 
        '<div class="modal-sheet">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">' +
            '<h3 style="font-size:1.1rem; font-weight:800;">Comanda: ' + selectedTable.name + '</h3>' +
            '<button onclick="closeCartModal()" style="border:none; background:none; font-size:1.4rem; cursor:pointer;">&times;</button>' +
          '</div>' +
          '<div style="flex:1; overflow-y:auto; max-height:45vh;">' +
            currentCart.map(function(i, idx) {
              const prod = (state.menu.products || []).find(function(p) { return p.id === i.id; });
              const hasImg = prod && prod.image && typeof prod.image === 'string' && prod.image.trim().length > 5;
              const safeImg = hasImg ? prod.image.replace(/"/g, '&quot;') : '';
              return '<div class="cart-item-row">' +
                '<div style="width:38px; height:38px; border-radius:8px; overflow:hidden; background:#ffffff; border:1px solid #e2e8f0; margin-right:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; padding:2px; box-sizing:border-box;">' +
                  (hasImg ? '<img src="' + safeImg + '" style="width:100%; height:100%; object-fit:contain; object-position:center; display:block;">' : '<span style="font-size:1.1rem;">🍨</span>') +
                '</div>' +
                '<div style="flex:1;">' +
                  '<div style="font-weight:700; font-size:0.92rem;">' + i.name + '</div>' +
                  '<div style="font-size:0.8rem; color:#059669; font-weight:700;">$' + (i.priceUSD * i.quantity).toFixed(2) + '</div>' +
                  '<input type="text" placeholder="Nota: ej. sin maní, extra sirope..." value="' + (i.note || '').replace(/"/g, '&quot;') + '" onchange="currentCart[' + idx + '].note = this.value" style="width:92%; padding:5px 8px; font-size:0.78rem; border:1px solid #cbd5e1; border-radius:6px; margin-top:4px;">' +
                '</div>' +
                '<div style="display:flex; align-items:center; gap:6px;">' +
                  '<button class="qty-btn" data-idx="' + idx + '" onclick="changeQtyFromBtn(this, -1)">&minus;</button>' +
                  '<span style="font-weight:800; min-width:20px; text-align:center;">' + i.quantity + '</span>' +
                  '<button class="qty-btn" data-idx="' + idx + '" onclick="changeQtyFromBtn(this, 1)">&plus;</button>' +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
          '<div style="margin-top:14px;">' +
            '<button class="send-btn" style="width:100%; padding:14px;" onclick="closeCartModal(); sendOrderRound();">Confirmar y Enviar 🚀</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
    }

    function changeQtyFromBtn(btn, delta) {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      changeQty(idx, delta);
    }

    function changeQty(idx, delta) {
      currentCart[idx].quantity += delta;
      if (currentCart[idx].quantity <= 0) {
        currentCart.splice(idx, 1);
      }
      updateCartBar();
      if (document.getElementById('cartModal')) {
        closeCartModal();
        if (currentCart.length > 0) openCartModal();
      }
      const searchBox = document.getElementById('prodSearchInput');
      if (searchBox) onProductSearch(searchBox.value);
    }

    function sendOrderRound() {
      if (currentCart.length === 0) {
        alert('Agrega al menos un ítem al pedido.');
        return;
      }

      fetch('/api/restaurant/order/round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: selectedTable.id,
          waiterId: currentWaiter.id,
          waiterName: currentWaiter.name,
          items: currentCart
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (res.success) {
          showAlert('✅ ¡Comanda enviada a Caja y Cocina con éxito!');
          currentCart = [];
          renderTablesScreen();
        } else {
          alert('Error: ' + res.error);
        }
      })
      .catch(function(err) {
        alert('Error de conexión al enviar el pedido');
      });
    }

    function requestBill() {
      if (confirm('¿Marcar ' + selectedTable.name + ' como Pidiendo Cuenta?')) {
        fetch('/api/restaurant/table/' + selectedTable.id + '/bill', { method: 'POST' })
          .then(function() {
            showAlert('Mesa marcada para cobro en Caja');
            renderTablesScreen();
          });
      }
    }
  </script>
</body>
</html>`;
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

function getServerInfo() {
  const waiterUrl = `http://${currentIp}:${currentPort}/waiter`;
  return {
    isRunning: !!httpServer,
    ip: currentIp,
    port: currentPort,
    url: waiterUrl,
    qrCode: qrDataUrl,
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
  broadcastEvent
};
