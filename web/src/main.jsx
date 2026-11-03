import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Rutas previstas (se implementan pieza por pieza):
//   /             -> Pieza 4: Landing + registro + descarga del instalador
//   /monitor      -> Pieza 3: Dashboard del dueño
//   /super-admin  -> Pieza 2: Panel del administrador (tú)
const Placeholder = ({ title }) => (
  <div style={{ fontFamily: 'system-ui', padding: 40 }}>
    <h1>FacturasYa</h1>
    <p>{title} — próximamente.</p>
  </div>
);

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Placeholder title="Landing" />} />
      <Route path="/monitor" element={<Placeholder title="Monitor del dueño" />} />
      <Route path="/super-admin" element={<Placeholder title="Super Admin" />} />
    </Routes>
  </BrowserRouter>
);
