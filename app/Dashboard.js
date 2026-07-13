// app/Dashboard.js
'use client';
import React, { useState, useEffect } from 'react';
import ClienteCard from '../components/ClienteCard';

const MODULOS = {
  Clientes: 'Clientes_y_Expedientes',
  Consultas: 'Historia_Consultas',
  Finanzas: 'Finanzas',
  Agenda: 'Agenda_Plazos',
  Biblioteca: 'Biblioteca_Leyes',
  Jurisprudencia: 'Doctrina_Jurisprudencia',
  Asistente: 'Asistente_IA' // Para futuro
};

export default function DashboardGeneral() {
  const [seccion, setSeccion] = useState('Clientes');
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDatos() {
      setCargando(true);
      setError(null);
      try {
        const range = MODULOS[seccion];
        if (!range) {
          setError('Módulo no encontrado');
          setDatos([]);
          setCargando(false);
          return;
        }

        const res = await fetch(`/api/sheets?range=${range}!A1:Z100`);
        const json = await res.json();
        
        if (json.success) {
          setDatos(json.data || []);
        } else {
          setError(json.message || 'Error al cargar datos');
          setDatos([]);
        }
      } catch (e) {
        console.error("Error cargando datos:", e);
        setError('Error de conexión al servidor');
        setDatos([]);
      } finally {
        setCargando(false);
      }
    }
    fetchDatos();
  }, [seccion]);

  // Función para renderizar tarjetas según el módulo
  const renderCards = () => {
    if (datos.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
          <p style={{ fontSize: '20px' }}>No hay registros en {seccion}</p>
          <p>La base de datos está vacía. Puedes agregar información en la planilla de Google.</p>
        </div>
      );
    }

    if (seccion === 'Clientes') {
      return datos.map((cliente, index) => (
        <ClienteCard key={index} cliente={cliente} />
      ));
    }

    // Renderizado genérico para otros módulos
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              {Object.keys(datos[0] || {}).map((key) => (
                <th key={key} style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  borderBottom: '2px solid #e2e8f0',
                  fontWeight: 600,
                  color: '#0f172a'
                }}>
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.map((item, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                {Object.values(item).map((value, i) => (
                  <td key={i} style={{ padding: '12px', color: '#1e293b' }}>
                    {value || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: '16px', color: '#64748b', fontSize: '14px' }}>
          Total: {datos.length} registros
        </p>
      </div>
    );
  };

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh', 
      backgroundColor: '#f0f4f8', 
      color: '#1e293b', 
      fontFamily: 'Segoe UI, sans-serif' 
    }}>
      {/* Sidebar - Azul Profesional */}
      <aside style={{ 
        width: '260px', 
        backgroundColor: '#0f172a', 
        color: '#cbd5e1', 
        padding: '20px',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ 
          fontSize: '18px', 
          marginBottom: '40px', 
          color: '#7dd3fc',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '16px'
        }}>
          ESTUDIO BARONETTO
        </h2>
        {Object.keys(MODULOS).map(m => (
          <button 
            key={m} 
            onClick={() => setSeccion(m)} 
            style={{ 
              display: 'block', 
              width: '100%', 
              padding: '12px', 
              marginBottom: '8px',
              background: seccion === m ? '#1e293b' : 'transparent',
              color: seccion === m ? '#ffffff' : '#94a3b8',
              border: 'none', 
              textAlign: 'left', 
              cursor: 'pointer', 
              borderRadius: '4px', 
              fontWeight: seccion === m ? '600' : '400',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (seccion !== m) {
                e.target.style.backgroundColor = '#1e293b';
                e.target.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (seccion !== m) {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#94a3b8';
              }
            }}
          >
            {m}
          </button>
        ))}
      </aside>

      {/* Contenido Principal */}
      <main style={{ 
        flex: 1, 
        padding: '40px', 
        marginLeft: '260px',
        minHeight: '100vh'
      }}>
        <header style={{ marginBottom: '30px' }}>
          <h1 style={{ color: '#0f172a', fontSize: '28px', margin: 0 }}>
            {seccion}
          </h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>
            Módulo: {MODULOS[seccion]}
          </p>
        </header>

        <div style={{ 
          background: 'white', 
          padding: '30px', 
          borderRadius: '12px', 
          border: '1px solid #e2e8f0', 
          minHeight: '400px' 
        }}>
          {cargando ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                border: '4px solid #e2e8f0',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              }} />
              <p style={{ marginTop: '16px', color: '#64748b' }}>
                Cargando información...
              </p>
            </div>
          ) : error ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '50px', 
              color: '#ef4444' 
            }}>
              <p style={{ fontSize: '18px' }}>⚠️ {error}</p>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                Verifica la conexión a Google Sheets y las credenciales
              </p>
            </div>
          ) : (
            renderCards()
          )}
        </div>
      </main>

      {/* Estilos globales para animación */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
