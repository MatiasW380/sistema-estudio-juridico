'use client';
import React, { useState } from 'react';

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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', color: '#334155', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Sidebar - Azul Profundo */}
      <aside style={{ width: '260px', backgroundColor: '#0f172a', color: '#e2e8f0', padding: '20px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '40px', color: '#7dd3fc', textAlign: 'center' }}>ESTUDIO JURÍDICO</h2>
        {Object.keys(MODULOS).map(m => (
          <button 
            key={m}
            onClick={() => setSeccion(m)}
            style={{ 
              display: 'block', width: '100%', padding: '14px', marginBottom: '5px',
              background: seccion === m ? '#1e293b' : 'transparent',
              color: seccion === m ? '#7dd3fc' : '#94a3b8',
              border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '6px' 
            }}
          >
            {m}
          </button>
        ))}
      </aside>

      {/* Contenido - Celeste y Gris suave */}
      <main style={{ flex: 1, padding: '40px' }}>
        <header style={{ marginBottom: '30px', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px' }}>
          <h1 style={{ color: '#1e293b', margin: 0 }}>{seccion}</h1>
          <p style={{ color: '#64748b' }}>Panel de gestión integral - Matías Baronetto</p>
        </header>
        
        <div style={{ background: 'white', padding: '25px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <p>Bienvenido al módulo de <strong>{seccion}</strong>. Estamos listos para integrar los datos de tu planilla <em>{MODULOS[seccion]}</em> aquí.</p>
          {/* Aquí cargaremos el contenido dinámico de cada sección */}
        </div>
      </main>
    </div>
  );
}
