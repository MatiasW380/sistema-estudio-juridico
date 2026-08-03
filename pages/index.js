// pages/index.js
// Página de inicio con verificación de sesión y tareas urgentes (cliente + SAC)

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getTareasPendientes, getClientes, formatearFechaArgentina, parsearFechaArgentina } from '../lib/googleSheets';

function parseUserFromCookie(rawCookie = '') {
  const userCookie = rawCookie
    .split(';')
    .find((c) => c.trim().startsWith('user='));

  if (!userCookie) return null;

  try {
    const value = decodeURIComponent(userCookie.split('=').slice(1).join('='));
    const data = JSON.parse(value);
    if (!data?.email) return null;
    return data;
  } catch {
    return null;
  }
}

// Función local para obtener un objeto Date sin desfase UTC
function getFechaLocalObj(fechaStr) {
  if (!fechaStr) return null;
  const isoStr = parsearFechaArgentina(fechaStr); // Asegura YYYY-MM-DD
  const partes = isoStr.split('-');
  if (partes.length !== 3) return null;
  
  const anio = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1; // Mes es 0-index
  const dia = parseInt(partes[2], 10);
  
  if (Number.isNaN(anio) || Number.isNaN(mes) || Number.isNaN(dia)) return null;
  
  const d = new Date(anio, mes, dia);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getServerSideProps(context) {
  const cookies = context.req.headers.cookie || '';
  const userData = parseUserFromCookie(cookies);

  if (!userData?.email) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const usuario = userData.email;
  const usuarioEmail = userData.email;

  const [tareas, clientes] = await Promise.all([
    getTareasPendientes(usuario),
    getClientes(usuario),
  ]);

  // Mapa SAC -> { idCliente, nombreCliente }
  const sacToCliente = new Map();
  clientes.forEach((cliente) => {
    const id = cliente.ID_Cliente || null;
    const nombre = cliente.Nombre_Cliente || '';
    (cliente.expedientes || []).forEach((exp) => {
      if (exp?.Numero_SAC) {
        sacToCliente.set(exp.Numero_SAC, {
          idCliente: id,
          nombreCliente: nombre,
        });
      }
    });
  });

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const cincoDias = new Date(hoy);
  cincoDias.setDate(cincoDias.getDate() + 5);

  const tareasUrgentes = (tareas || []).filter((t) => {
    const fecha = getFechaLocalObj(t.Fecha);
    if (!fecha) return false;
    return fecha >= hoy && fecha <= cincoDias;
  });

  // Enriquecer: siempre intentar tener ambos (Cliente + SAC)
  const tareasEnriquecidas = tareasUrgentes
    .map((t) => {
      const sac = t.Numero_SAC || '';
      const clienteDesdeSac = sac ? sacToCliente.get(sac) : null;

      return {
        ...t,
        Cliente_ID: clienteDesdeSac?.idCliente || null,
        Cliente_Nombre:
          clienteDesdeSac?.nombreCliente ||
          t.Cliente ||
          '',
      };
    })
    .sort((a, b) => {
      const da = getFechaLocalObj(a.Fecha);
      const db = getFechaLocalObj(b.Fecha);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da - db;
    });

  return {
    props: {
      tareasUrgentes: tareasEnriquecidas,
      usuario,
      usuarioEmail,
      clientes,
      tareas,
    },
  };
}

export default function Home({ tareasUrgentes, usuarioEmail, clientes, tareas }) {
  const [tareas_state] = useState(tareasUrgentes || []);
  const router = useRouter();

  useEffect(() => {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, ...rest] = cookie.trim().split('=');
      acc[key] = rest.join('=');
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

  const getUrgenciaColor = (fechaStr) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaPlazo = getFechaLocalObj(fechaStr);
    if (!fechaPlazo) return '#718096';

    const diff = Math.ceil((fechaPlazo - hoy) / (1000 * 60 * 60 * 24));

    if (diff < 0) return '#e53e3e';      // Rojo: vencido
    if (diff === 0) return '#f687b3';    // Rosa: hoy (vence hoy)
    if (diff === 1) return '#fc8cc9';    // Rosa: mañana
    if (diff >= 2 && diff <= 4) return '#ed8936'; // Amarillo: 3-4 días
    if (diff === 5) return '#38a169';    // Verde: 5 días
    return '#718096';                     // Gris: otro
  };

  const getUrgenciaTexto = (fechaStr) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaPlazo = getFechaLocalObj(fechaStr);
    if (!fechaPlazo) return 'SIN FECHA';

    const diff = Math.ceil((fechaPlazo - hoy) / (1000 * 60 * 60 * 24));

    if (diff < 0) return 'VENCIDO';
    if (diff === 0) return 'HOY';
    if (diff === 1) return 'MAÑANA';
    return `${diff} días`;
  };

  const handleTareaClick = async (tarea) => {
    // Prioridad 1: expediente por SAC
    if (tarea.Numero_SAC) {
      router.push(`/expediente/${encodeURIComponent(tarea.Numero_SAC)}`);
      return;
    }

    // Prioridad 2: cliente por ID enriquecido
    if (tarea.Cliente_ID) {
      router.push(`/clientes/${encodeURIComponent(tarea.Cliente_ID)}`);
      return;
    }

    // Prioridad 3: búsqueda por nombre de cliente
    const clienteNombre = tarea.Cliente_Nombre || tarea.Cliente || '';
    if (clienteNombre) {
      try {
        const response = await fetch(`/api/clientes?nombre=${encodeURIComponent(clienteNombre)}`);
        const data = await response.json();
        if (data?.clientes?.length > 0) {
          router.push(`/clientes/${encodeURIComponent(data.clientes[0].ID_Cliente)}`);
          return;
        }
      } catch (error) {
        console.error('Error al buscar cliente:', error);
      }
    }

    // Fallback
    router.push('/agenda');
  };

  // === FUNCIONES PARA DASHBOARD ===
  const calcularEstadisticas = () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let expedientesAbiertos = 0;
    let plazosVencidos = 0;
    const juiciosPorJuzgado = {};

    // Contar expedientes y juicios por juzgado
    (clientes || []).forEach((cliente) => {
      (cliente.expedientes || []).forEach((exp) => {
        expedientesAbiertos++;
        
        // Contar por juzgado
        const juzgado = exp.Juzgado || 'Sin juzgado';
        juiciosPorJuzgado[juzgado] = (juiciosPorJuzgado[juzgado] || 0) + 1;
      });
    });

    // Contar plazos vencidos
    (tareas || []).forEach((tarea) => {
      const fechaPlazo = getFechaLocalObj(tarea.Fecha);
      if (fechaPlazo && fechaPlazo < hoy && tarea.Estado !== 'Completado') {
        plazosVencidos++;
      }
    });

    return { expedientesAbiertos, plazosVencidos, juiciosPorJuzgado };
  };

  const stats = calcularEstadisticas();

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: 0 }}>🏛️ Sistema de Gestión Jurídica</h1>
          <p style={{ marginTop: '4px', color: '#4a5568', fontSize: '0.95rem' }}>
            👤 Usuario: <strong>{usuarioEmail || 'No identificado'}</strong>
          </p>
        </div>
        <button onClick={handleLogout} style={{ backgroundColor: '#e53e3e' }}>
          Cerrar sesión
        </button>
      </div>

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

      <div style={{ marginTop: '40px' }}>
        {/* === DASHBOARD === */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.3rem', color: '#2d3748', marginBottom: '20px' }}>📊 Resumen</h2>
          
          {/* Tarjetas de estadísticas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            {/* Expedientes abiertos */}
            <div style={{
              backgroundColor: '#ebf8ff',
              border: '1px solid #bee3f8',
              borderRadius: '8px',
              padding: '15px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3182ce' }}>
                {stats.expedientesAbiertos}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#4a5568', marginTop: '5px' }}>Expedientes Abiertos</div>
            </div>

            {/* Plazos vencidos */}
            <div style={{
              backgroundColor: '#fff5f5',
              border: '1px solid #feb2b2',
              borderRadius: '8px',
              padding: '15px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e53e3e' }}>
                {stats.plazosVencidos}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#4a5568', marginTop: '5px' }}>Plazos Vencidos</div>
            </div>

            {/* Tareas próximos 5 días */}
            <div style={{
              backgroundColor: '#fef5e7',
              border: '1px solid #f9e79f',
              borderRadius: '8px',
              padding: '15px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ed8936' }}>
                {tareas_state.length}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#4a5568', marginTop: '5px' }}>Próximos 5 Días</div>
            </div>
          </div>
        </div>

        {/* === FIN DASHBOARD === */}
        <h2
          style={{
            fontSize: '1.3rem',
            color: '#2d3748',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          ⏰ Tareas Urgentes (próximos 5 días)
          {tareas_state.length > 0 && (
            <span
              style={{
                fontSize: '0.8rem',
                backgroundColor: '#e53e3e',
                color: 'white',
                padding: '2px 10px',
                borderRadius: '12px',
              }}
            >
              {tareas_state.length}
            </span>
          )}
        </h2>

        {tareas_state.length === 0 ? (
          <div
            style={{
              backgroundColor: '#f7fafc',
              padding: '30px',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#4a5568',
              marginTop: '15px',
            }}
          >
            🎉 No hay tareas urgentes en los próximos 5 días.
          </div>
        ) : (
          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tareas.map((tarea, index) => (
              <div
                key={`${tarea.ID || 'tarea'}-${index}`}
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
                  gap: '10px',
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
                  <span
                    style={{
                      backgroundColor: getUrgenciaColor(tarea.Fecha),
                      color: 'white',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      minWidth: '60px',
                      textAlign: 'center',
                    }}
                  >
                    {getUrgenciaTexto(tarea.Fecha)}
                  </span>

                  <div>
                    <strong>{tarea.Titulo || 'Sin título'}</strong>
                    <span style={{ marginLeft: '10px', color: '#4a5568', fontSize: '0.9rem' }}>
                      {tarea.Tipo || 'Otro'}
                    </span>

                    {tarea.Numero_SAC && (
                      <span
                        style={{
                          marginLeft: '10px',
                          backgroundColor: '#3182ce',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                        }}
                      >
                        SAC: {tarea.Numero_SAC}
                      </span>
                    )}

                    {tarea.Cliente_Nombre && (
                      <span
                        style={{
                          marginLeft: '10px',
                          backgroundColor: '#38a169',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                        }}
                      >
                        👤 {tarea.Cliente_Nombre}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ color: '#4a5568', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  {formatearFechaArgentina(tarea.Fecha) || 'Sin fecha'} {tarea.Hora ? `- ${tarea.Hora}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
