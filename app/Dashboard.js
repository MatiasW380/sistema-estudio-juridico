'use client';
import React, { useState, useEffect } from 'react';

const MODULOS = {
  Clientes: 'Clientes_y_Expedientes',
  Consultas: 'Historia_Consultas',
  Finanzas: 'Finanzas',
  Agenda: 'Agenda_Plazos',
  Biblioteca: 'Biblioteca_Leyes',
  Jurisprudencia: 'Doctrina_Jurisprudencia',
  Asistente: 'Asistente_IA'
};

export default function DashboardGeneral() {
  const [seccion, setSeccion] = useState('Clientes');
  const [datos, setDatos] = useState([]);

  useEffect(() => {
    async function fetchDatos() {
      const res = await fetch(`/api/sheets?range=${MODULOS[seccion]}`);
      const json = await res.json();
      setDatos(json);
    }
    fetchDatos();
  }, [seccion]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', color: '#1e293b', fontFamily: 'Inter, sans-serif' }}>
      <aside style={{ width: '260px', backgroundColor: '#0f172a', color: '#e2e8f0', padding: '20px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '40px', color: '#7dd3fc', textAlign: 'center' }}>SISTEMA JURÍDICO</h2>
        {Object.keys(MODULOS).map(m => (
          <button key={m} onClick={() => setSeccion(m)} style={{ 
            display: 'block', width: '100%', padding: '14px', marginBottom: '5px',
            background: seccion === m ? '#1e293b' : 'transparent', color: seccion === m ? '#7dd3fc' : '#94a3b8',
            border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '6px' 
          }}>
            {m}
          </button>
        ))}
      </aside>

      <main style={{ flex: 1, padding: '40px' }}>
        <header style={{ marginBottom: '30px', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px' }}>
          <h1 style={{ color: '#1e293b', margin: 0 }}>{seccion}</h1>
        </header>
        <div style={{ background: 'white', padding: '25px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          {datos.length > 0 ? (
            <pre style={{ overflowX: 'auto' }}>{JSON.stringify(datos, null, 2)}</pre>
          ) : (
            <p>No hay datos registrados en {seccion}.</p>
          )}
        </div>
      </main>
    </div>
  );
}
