// Ruta exacta en GitHub: app/Dashboard.js
'use client';

import React, { useState, useEffect } from 'react';

export default function DashboardClientes() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarClientes() {
      try {
        const respuesta = await fetch('/api/sheets');
        if (!respuesta.ok) throw new Error('Error al conectar');
        const datos = await respuesta.json();
        setClientes(Array.isArray(datos) ? datos : []);
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    }
    cargarClientes();
  }, []);

  const clientesFiltrados = clientes.filter(cliente =>
    (cliente.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (cliente.causa || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f2', color: '#1a1a1a', fontFamily: 'serif', margin: 0 }}>
      {/* Barra de Navegación Estilo Estudio */}
      <header style={{ backgroundColor: '#1a1a1a', color: '#d4af37', padding: '24px', borderBottom: '2px solid #d4af37' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', textTransform: 'uppercase', letterSpacing: '2px' }}>Estudio Jurídico</h1>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#a0a0a0' }}>Sistema de Gestión Integral</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '13px', color: '#ffffff' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>Matías Baronetto</p>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
        <section style={{ backgroundColor: '#ffffff', padding: '30px', border: '1px solid #d1d1d1', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '22px', borderBottom: '1px solid #1a1a1a', paddingBottom: '10px' }}>
            Listado de Clientes y Expedientes
          </h2>

          <input
            type="text"
            placeholder="Buscar por cliente o causa..."
            style={{ width: '100%', padding: '12px', border: '1px solid #1a1a1a', marginBottom: '20px', fontSize: '14px' }}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          {cargando ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Cargando registros...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
                  <th style={{ padding: '12px' }}>Cliente</th>
                  <th style={{ padding: '12px' }}>Expediente / Causa</th>
                  <th style={{ padding: '12px' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} style={{ borderBottom: '1px solid #d1d1d1' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 'bold' }}>{cliente.nombre}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>{cliente.dni}</div>
                    </td>
                    <td style={{ padding: '12px' }}>{cliente.causa}</td>
                    <td style={{ padding: '12px', color: '#8b4513', fontWeight: 'bold' }}>{cliente.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
