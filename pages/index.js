// pages/index.js
// Página de inicio con verificación de sesión y tareas urgentes

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getTareasPendientes } from '../lib/googleSheets';

export async function getServerSideProps(context) {
  const cookies = context.req.headers.cookie || '';
  const userCookie = cookies.split(';').find(c => c.trim().startsWith('user='));
  
  if (!userCookie) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  let usuario = '';
  if (userCookie) {
    try {
      const userData = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
      usuario = userData.email || '';
    } catch (e) {}
  }

  // Obtener tareas pendientes (todas)
  const tareas = await getTareasPendientes(usuario);

  // Filtrar tareas urgentes (próximos 5 días)
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const cincoDias = new Date(hoy);
  cincoDias.setDate(cincoDias.getDate() + 5);

  const tareasUrgentes = tareas.filter(t => {
    const fechaPlazo = new Date(t.Fecha);
    fechaPlazo.setHours(0, 0, 0, 0);
    return fechaPlazo >= hoy && fechaPlazo <= cincoDias;
  });

  // Ordenar por fecha (más próximo primero)
  tareasUrgentes.sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));

  return {
    props: {
      tareasUrgentes: tareasUrgentes || [],
      usuario,
    },
  };
}

export default function Home({ tareasUrgentes, usuario }) {
  const [tareas, setTareas] = useState(tareasUrgentes || []);
  const router = useRouter();

  useEffect(() => {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    if (!cookies.user) {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    document.cookie = 'user=; path=/; max-age=0';
    router.push('/login');
  };

  // Función para obtener el color según la urgencia
  const getUrgenciaColor = (fechaStr) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaPlazo = new Date(fechaStr);
    fechaPlazo.setHours(0, 0, 0, 0);
    const diff = Math.ceil((fechaPlazo - hoy) / (1000 * 60 * 60 * 24));

    if (diff < 0) return '#e53e3e'; // Vencido
    if (diff <= 2) return '#ed8936'; // Próximo (0-2 días)
    return '#d69e2e'; // Lejano (3-5 días)
  };

  const getUrgenciaTexto = (fechaStr) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaPlazo = new Date(fechaStr);
    fechaPlazo.setHours(0, 0, 0, 0);
    const diff = Math.ceil((fechaPlazo - hoy) / (1000 * 60 * 60 * 24));

    if (diff < 0) return 'VENCIDO';
    if (diff === 0) return 'HOY';
    if (diff === 1) return 'MAÑANA';
    return `${diff} días`;
  };

  const handleTareaClick = async (tarea) => {
    if (tarea.Numero_SAC) {
      router.push(`/expediente/${tarea.Numero_SAC}`);
    } else if (tarea.Cliente) {
      // Buscar cliente por nombre
      try {
        const response = await fetch(`/api/clientes?nombre=${encodeURIComponent(tarea.Cliente)}`);
        const data = await response.json();
        if (data.clientes && data.clientes.length > 0) {
          router.push(`/clientes/${data.clientes[0].ID_Cliente}`);
        } else {
          alert('Cliente no encontrado');
        }
      } catch (error) {
        console.error('Error al buscar cliente:', error);
        alert('Error al buscar cliente');
      }
    } else {
      // Si no tiene expediente ni cliente, ir a la agenda
      router.push('/agenda');
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🏛️ Sistema de Gestión Jurídica</h1>
        <button onClick={handleLogout} style={{ backgroundColor: '#e53e3e' }}>
          Cerrar sesión
        </button>
      </div>

      <p style={{ marginTop: '20px', fontSize: '1.2rem' }}>
        Bienvenido, Matías. Tu sistema está funcionando correctamente.
      </p>
      <p style={{ marginTop: '10px', color: '#4a5568' }}>
        Gestioná clientes, expedientes, usuarios, finanzas, agenda y biblioteca desde este panel.
      </p>

      <div style={{ marginTop: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
        <a href="/clientes">
          <button style={{ backgroundColor: '#3182ce' }}>👤 Clientes</button>
        </a>
        <a href="/agenda">
          <button style={{ backgroundColor: '#3182ce' }}>📅 Agenda</button>
        </a>
        <a href="/honorarios">
          <button style={{ backgroundColor: '#3182ce' }}>💰 Finanzas</button>
        </a>
        <a href="/biblioteca">
          <button style={{ backgroundColor: '#3182ce' }}>📚 Biblioteca</button>
        </a>
        <button 
          onClick={() => router.push('/ia-general')}
          style={{ backgroundColor: '#7c3aed' }}
        >
          🤖 Asistente IA
        </button>
        <a href="/usuarios" style={{ marginLeft: 'auto' }}>
          <button style={{ backgroundColor: '#718096' }}>👥 Usuarios</button>
        </a>
      </div>

      {/* Tareas urgentes */}
      <div style={{ marginTop: '40px' }}>
        <h2 style={{ 
          fontSize: '1.3rem', 
          color: '#2d3748', 
          borderBottom: '2px solid #e2e8f0', 
          paddingBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          ⏰ Tareas Urgentes (próximos 5 días)
          {tareas.length > 0 && (
            <span style={{ 
              fontSize: '0.8rem', 
              backgroundColor: '#e53e3e', 
              color: 'white', 
              padding: '2px 10px', 
              borderRadius: '12px' 
            }}>
              {tareas.length}
            </span>
          )}
        </h2>

        {tareas.length === 0 ? (
          <div style={{
            backgroundColor: '#f7fafc',
            padding: '30px',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#4a5568',
            marginTop: '15px'
          }}>
            🎉 No hay tareas urgentes en los próximos 5 días.
          </div>
        ) : (
          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tareas.map((tarea, index) => (
              <div
                key={index}
                style={{
                  border: `2px solid ${getUrgenciaColor(tarea.Fecha)}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
                onClick={() => handleTareaClick(tarea)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f7fafc';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <span style={{
                    backgroundColor: getUrgenciaColor(tarea.Fecha),
                    color: 'white',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    minWidth: '60px',
                    textAlign: 'center'
                  }}>
                    {getUrgenciaTexto(tarea.Fecha)}
                  </span>
                  <div>
                    <strong>{tarea.Titulo || 'Sin título'}</strong>
                    <span style={{ marginLeft: '10px', color: '#4a5568', fontSize: '0.9rem' }}>
                      {tarea.Tipo || 'Otro'}
                    </span>
                    {tarea.Numero_SAC && (
                      <span style={{ 
                        marginLeft: '10px', 
                        backgroundColor: '#3182ce', 
                        color: 'white', 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '0.7rem' 
                      }}>
                        SAC: {tarea.Numero_SAC}
                      </span>
                    )}
                    {tarea.Cliente && !tarea.Numero_SAC && (
                      <span style={{ 
                        marginLeft: '10px', 
                        color: '#4a5568', 
                        fontSize: '0.8rem' 
                      }}>
                        👤 {tarea.Cliente}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ color: '#4a5568', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  {tarea.Fecha} {tarea.Hora ? `- ${tarea.Hora}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
