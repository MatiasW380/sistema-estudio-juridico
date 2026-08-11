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

function getFechaLocalObj(fechaStr) {
  if (!fechaStr) return null;
  const isoStr = parsearFechaArgentina(fechaStr);
  const partes = isoStr.split('-');
  if (partes.length !== 3) return null;
  
  const anio = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1;
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

  try {
    const [tareas, clientes, finanzas] = await Promise.all([
      getTareasPendientes(usuario),
      getClientes(usuario),
      (await import('../lib/googleSheets')).getFinanzas(null, null, null, null, null, usuario),
    ]);

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

    // Traer TODOS los plazos sin filtro de 5 días
    const tareasUrgentes = (tareas || [])
      .sort((a, b) => {
        const da = getFechaLocalObj(a.Fecha);
        const db = getFechaLocalObj(b.Fecha);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da - db;
      })
      .map((t) => {
        const sac = t.Numero_SAC || '';
        const clienteDesdeSac = sac ? sacToCliente.get(sac) : null;
        return {
          ...t,
          Cliente_ID: clienteDesdeSac?.idCliente || null,
          Cliente_Nombre: clienteDesdeSac?.nombreCliente || t.Cliente || '',
        };
      });

    let totalAcordado = 0;
    let totalPagado = 0;
    let totalPendiente = 0;

    (finanzas || []).forEach((f) => {
      const total = parseFloat(f.Monto_Total) || 0;
      const pagado = parseFloat(f.Monto_Pagado) || 0;
      totalAcordado += total;
      totalPagado += pagado;
      totalPendiente += total - pagado;
    });

    const expedientesAbiertos = clientes.reduce((sum, c) => sum + (c.expedientes?.length || 0), 0);
    const plazosvencidos = (tareas || []).filter((t) => {
      const fechaPlazo = getFechaLocalObj(t.Fecha);
      return fechaPlazo && fechaPlazo < hoy && t.Estado !== 'Completado';
    }).length;

    return {
      props: {
        tareasUrgentes,
        usuario,
        usuarioEmail: userData.email,
        expedientesAbiertos,
        plazosvencidos,
        totalAcordado,
        totalPagado,
        totalPendiente,
      },
    };
  } catch (error) {
    console.error('Error en dashboard:', error);
    return {
      props: {
        tareasUrgentes: [],
        usuario: userData.email,
        usuarioEmail: userData.email,
        expedientesAbiertos: 0,
        plazosvencidos: 0,
        totalAcordado: 0,
        totalPagado: 0,
        totalPendiente: 0,
      },
    };
  }
}

export default function Home({
  tareasUrgentes,
  usuarioEmail,
  expedientesAbiertos,
  plazosvencidos,
  totalAcordado,
  totalPagado,
  totalPendiente,
}) {
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

  const formatMoney = (value) => {
    const n = parseFloat(value || 0);
    return `$${Number.isNaN(n) ? '0.00' : n.toFixed(2)}`;
  };

  const getUrgenciaColor = (fechaStr) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaPlazo = getFechaLocalObj(fechaStr);
    if (!fechaPlazo) return '#94a3b8';

    const diff = Math.ceil((fechaPlazo - hoy) / (1000 * 60 * 60 * 24));

    if (diff < 0) return '#991b1b';
    if (diff === 0) return '#991b1b';
    if (diff === 1) return '#d97706';
    if (diff >= 2 && diff <= 4) return '#d97706';
    if (diff === 5) return '#16a34a';
    return '#3b82f6';
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
    if (tarea.Numero_SAC) {
      router.push(`/expediente/${encodeURIComponent(tarea.Numero_SAC)}`);
      return;
    }

    if (tarea.Cliente_ID) {
      router.push(`/clientes/${encodeURIComponent(tarea.Cliente_ID)}`);
      return;
    }

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

    router.push('/agenda');
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ marginBottom: '4px' }}>Dashboard</h1>
        <p style={{ margin: 0 }}>Próximos plazos y tareas urgentes</p>
      </div>

      {/* Próximos Plazos - 5 Columnas por Tipo */}
      <div style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px' }}>
          Próximos Plazos
        </h2>

        {tareas_state.length === 0 ? (
          <div style={{ backgroundColor: '#f8fafc', padding: '30px', borderRadius: '6px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
            No hay plazos en los próximos 5 días.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginTop: '15px' }}>
            {['ENTREVISTA', 'PLAZO', 'AUDIENCIA', 'TAREAS', 'VENCIDOS'].map((tipoColumna) => {
              const hoy = new Date();
              hoy.setHours(0, 0, 0, 0);
              
              const tareasColumnna = tareas_state.filter((t) => {
                const tipo = (t.Tipo || 'OTRO').toUpperCase();
                const fecha = getFechaLocalObj(t.Fecha);
                const esVencido = fecha && fecha < hoy;
                
                if (tipoColumna === 'VENCIDOS') return esVencido;
                if (tipoColumna === 'TAREAS') return !esVencido && (tipo === 'OTRO' || tipo === 'TAREAS');
                return !esVencido && tipo === tipoColumna;
              });
              
              return (
                <div key={tipoColumna}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingBottom: '6px', borderBottom: '2px solid #e2e8f0' }}>
                    {tipoColumna}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {tareasColumnna.map((tarea, index) => (
                      <div
                        key={`${tarea.ID || 'tarea'}-${index}`}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderLeft: `3px solid ${getUrgenciaColor(tarea.Fecha)}`,
                          borderRadius: '4px',
                          padding: '6px 8px',
                          backgroundColor: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                          fontSize: '0.8rem',
                        }}
                        onClick={() => handleTareaClick(tarea)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                          <strong style={{ color: '#0f172a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tarea.Titulo || 'Sin título'}
                          </strong>
                          <span style={{ backgroundColor: getUrgenciaColor(tarea.Fecha), color: 'white', padding: '2px 6px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {getUrgenciaTexto(tarea.Fecha)}
                          </span>
                        </div>
                        {tarea.Cliente && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tarea.Cliente}
                          </div>
                        )}
                        {tarea.Numero_SAC && (
                          <div style={{ fontSize: '0.7rem', backgroundColor: '#dbeafe', color: '#1e40af', padding: '1px 4px', borderRadius: '8px', display: 'inline-block', marginTop: '2px' }}>
                            SAC: {tarea.Numero_SAC}
                          </div>
                        )}
                      </div>
                    ))}
                    {tareasColumnna.length === 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#cbd5e1', textAlign: 'center', padding: '12px 0' }}>
                        —
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
