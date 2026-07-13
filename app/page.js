// Ruta exacta en GitHub: app/page.js
'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';

export default function DashboardClientes() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarClientes() {
      try {
        const respuesta = await fetch('/api/sheets');
        if (!respuesta.ok) throw new Error('API responde con error técnico');
        const datos = await respuesta.json();
        setClientes(Array.isArray(datos) ? datos : []);
      } catch (err) {
        console.warn("Cargando datos locales debido a error de credenciales.");
        setClientes([
          { id: "1", nombre: "Juan Carlos Pérez", dni: "24.532.112", telefono: "3516554433", email: "jcperez@gmail.com", causa: "Pérez c/ EPEC - Ordinario", estado: "En Trámite" },
          { id: "2", nombre: "María Laura Martínez", dni: "32.114.982", telefono: "3541223344", email: "marialauramartinez@hotmail.com", causa: "Martínez c/ Tarjeta Naranja - Defensa Consumidor", estado: "Audiencia" }
        ]);
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#1e293b', fontFamily: 'sans-serif', margin: 0 }}>
      <header style={{ backgroundColor: '#0f172a', color: 'white', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>SISTEMA DE GESTIÓN JURÍDICA</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Jurisdicción Provincia de Córdoba | Serverless v1.0</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px' }}>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#60a5fa' }}>Matías Baronetto</p>
            <p style={{ margin: 0, color: '#94a3b8' }}>matiasbaronetto@gmail.com</p>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 16px' }}>
        <section style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>Fichas de Clientes y Expedientes</h2>
          <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#64748b' }}>Búsqueda y estado de causas vigentes en Córdoba.</p>

          <div style={{ marginBottom: '24px' }}>
            <input
              type="text"
              placeholder="🔍 Buscar por nombre o carátula del expediente..."
              style={{ width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', backgroundColor: '#f1f5f9' }}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {cargando ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b', fontSize: '14px' }}>Cargando base de datos jurídica...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px' }}>Cliente / Datos de Contacto</th>
                    <th style={{ padding: '12px' }}>Carátula / Expediente (SAC)</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map((cliente) => (
                    <tr key={cliente.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                      <td style={{ padding: '12px' }}>
                        <p style={{ margin: 0, fontWeight: 'bold', color: '#0f172a' }}>{cliente.nombre}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>DNI: {cliente.dni} | 📞 {cliente.telefono}</p>
                      </td>
                      <td style={{ padding: '12px', color: '#334155' }}>{cliente.causa}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                          {cliente.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
