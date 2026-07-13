'use client';
import React, { useState } from 'react';

export default function DashboardGeneral() {
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // Simulación de la estructura que vamos a conectar
  const clientes = [
    { id: 1, nombre: "Juan Carlos Pérez", causa: "Pérez c/ EPEC", estado: "En Trámite" },
    { id: 2, nombre: "María Laura Martínez", causa: "Martínez c/ Naranja", estado: "Audiencia" }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f0f4f8' }}>
      {/* Sidebar - Gestión de Módulos */}
      <aside style={{ width: '260px', backgroundColor: '#0f172a', color: '#fff', padding: '20px' }}>
        <h2 style={{ fontSize: '18px', color: '#38bdf8' }}>Estudio Jurídico</h2>
        {['Clientes', 'Agenda', 'Jurisprudencia', 'IA Escritor'].map(m => (
          <div style={{ padding: '15px 0', cursor: 'pointer', borderBottom: '1px solid #1e293b' }}>{m}</div>
        ))}
      </aside>

      {/* Contenido - Vista de Fichas */}
      <main style={{ flex: 1, padding: '40px' }}>
        {!clienteSeleccionado ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {clientes.map(c => (
              <div onClick={() => setClienteSeleccionado(c)} style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                <h3 style={{ margin: 0 }}>{c.nombre}</h3>
                <p style={{ color: '#64748b' }}>{c.causa}</p>
                <span style={{ color: '#0369a1', fontSize: '12px', fontWeight: 'bold' }}>{c.estado}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: 'white', padding: '40px', borderRadius: '12px' }}>
            <button onClick={() => setClienteSeleccionado(null)}>← Volver al listado</button>
            <h1>Expediente: {clienteSeleccionado.nombre}</h1>
            {/* AQUÍ VINCULAREMOS EL VISOR DE PDFS DE DRIVE */}
            <div style={{ border: '2px dashed #cbd5e1', padding: '40px', textAlign: 'center' }}>
              Arrastra aquí los PDF del expediente
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
