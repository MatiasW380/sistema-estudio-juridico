'use client';
import React, { useState, useEffect } from 'react';
// En app/Dashboard.js
import ClienteCard from '../components/ClienteCard';


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
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function fetchDatos() {
      setCargando(true);
      try {
        const res = await fetch(`/api/sheets?range=${MODULOS[seccion]}`);
        const json = await res.json();
        // Si no hay datos, inicializamos como array vacío
        setDatos(Array.isArray(json) ? json : []);
      } catch (e) {
        console.error("Error cargando datos:", e);
        setDatos([]);
      } finally {
        setCargando(false);
      }
    }
    fetchDatos();
  }, [seccion]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f0f4f8', color: '#1e293b', fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Sidebar - Azul Profesional */}
      <aside style={{ width: '260px', backgroundColor: '#0f172a', color: '#cbd5e1', padding: '20px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '40px', color: '#7dd3fc' }}>ESTUDIO BARONETTO</h2>
        {Object.keys(MODULOS).map(m => (
          <button 
            key={m} 
            onClick={() => setSeccion(m)} 
            style={{ 
              display: 'block', width: '100%', padding: '12px', marginBottom: '8px',
              background: seccion === m ? '#1e293b' : 'transparent',
              color: seccion === m ? '#ffffff' : '#94a3b8',
              border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontWeight: '500' 
            }}>
            {m}
          </button>
        ))}
      </aside>

      {/* Contenido Principal */}
      <main style={{ flex: 1, padding: '40px' }}>
        <header style={{ marginBottom: '30px' }}>
          <h1 style={{ color: '#0f172a', fontSize: '28px', margin: 0 }}>{seccion}</h1>
        </header>

        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '400px' }}>
          {cargando ? (
            <p>Cargando información...</p>
          ) : datos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
              <p style={{ fontSize: '20px' }}>No hay registros en esta sección.</p>
              <p>La base de datos de <b>{seccion}</b> está vacía. Puedes comenzar a cargar información en tu planilla de Google.</p>
            </div>
          ) : (
            <div>
              {/* Aquí se renderizarán tus tarjetas de gestión cuando cargues datos */}
              <pre>{JSON.stringify(datos, null, 2)}</pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
