// pages/index.js
// Página de inicio - Dashboard de tareas urgentes

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

  const getUrgenciaColor = (fechaStr) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaPlazo = getFechaLocalObj(fechaStr);
    if (!fechaPlazo) return '#94a3b8'; // Gris

    const diff = Math.ceil((fechaPlazo - hoy) / (1000 * 60 * 60 * 24));

    if (diff < 0) return '#991b1b';      // Rojo vino: vencido
    if (diff === 0) return '#991b1b';    // Rojo vino: HOY es el día del plazo
    if (diff === 1) return '#d97706';    // Ámbar: mañana
    if (diff >= 2 && diff <= 4) return '#d97706'; // Ámbar: 3-4 días
    if (diff === 5) return '#16a34a';    // Verde: 5 días
    return '#3b82f6';                     // Azul: otro
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
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '4px' }}>Dashboard</h1>
        <p style={{ margin: 0 }}>Resumen centralizado de tareas urgentes y estado del estudio</p>
      </div>

      <div style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
            Tareas Urgentes (próximos 5 días)
          </h2>
          {tareas_state.length > 0 && (
            <span
              style={{
                fontSize: '0.875rem',
                backgroundColor: '#e53e3e',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
              }}
            >
              {tareas_state.length} pendientes
            </span>
          )}
        </div>

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
            No hay tareas urgentes en los próximos 5 días.
          </div>
        ) : (
          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tareas.map((tarea, index) => (
              <div
                key={`${tarea.ID || 'tarea'}-${index}`}
                style={{
                  borderLeft: `4px solid ${getUrgenciaColor(tarea.Fecha)}`,
                  border: `1px solid #e2e8f0`,
                  borderLeft: `4px solid ${getUrgenciaColor(tarea.Fecha)}`,
                  borderRadius: '6px',
                  padding: '16px',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '12px',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                }}
                onClick={() => handleTareaClick(tarea)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      minWidth: '70px',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: getUrgenciaColor(tarea.Fecha),
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {getUrgenciaTexto(tarea.Fecha)}
                    </span>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                        {tarea.Titulo || 'Sin título'}
                      </strong>
                      {tarea.Tipo && (
                        <span
                          style={{
                            marginLeft: '12px',
                            color: '#64748b',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                          }}
                        >
                          {tarea.Tipo}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                      {tarea.Cliente && (
                        <span
                          style={{
                            color: '#64748b',
                            fontSize: '0.875rem',
                            fontStyle: 'italic',
                          }}
                        >
                          {tarea.Cliente}
                        </span>
                      )}

                      {tarea.Numero_SAC && (
                        <span
                          style={{
                            backgroundColor: '#dbeafe',
                            color: '#1e40af',
                            padding: '2px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          SAC: {tarea.Numero_SAC}
                        </span>
                      )}

                      {tarea.Cliente_Nombre && (
                        <span
                          style={{
                            backgroundColor: '#dcfce7',
                            color: '#166534',
                            padding: '2px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {tarea.Cliente_Nombre}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    color: '#64748b',
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    textAlign: 'right',
                    minWidth: '140px',
                  }}
                >
                  <div style={{ fontWeight: '500' }}>
                    {formatearFechaArgentina(tarea.Fecha) || 'Sin fecha'}
                  </div>
                  {tarea.Hora && <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{tarea.Hora}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
