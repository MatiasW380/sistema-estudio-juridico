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
  const [mostrarModal, setMostrarModal] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
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

  const handleTareaClick = (tarea) => {
    setTareaSeleccionada(tarea);
    setMostrarModal(true);
    setMensaje('');
  };

  const handleEditar = async (e) => {
    e.preventDefault();
    setMensaje('');
    setCargando(true);

    if (!tareaSeleccionada.Fecha || !tareaSeleccionada.Titulo) {
      setMensaje('⚠️ Fecha y Título son obligatorios');
      setCargando(false);
      return;
    }

    try {
      const response = await fetch('/api/agenda', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tareaSeleccionada.ID,
          numeroSAC: tareaSeleccionada.Numero_SAC || '',
          cliente: tareaSeleccionada.Cliente || '',
          tipo: tareaSeleccionada.Tipo || 'Otro',
          titulo: tareaSeleccionada.Titulo,
          descripcion: tareaSeleccionada.Descripcion || '',
          fecha: tareaSeleccionada.Fecha,
          hora: tareaSeleccionada.Hora || '',
          horaFin: tareaSeleccionada.Hora_Fin || '',
          lugar: tareaSeleccionada.Lugar || '',
          recordatorio: tareaSeleccionada.Recordatorio || 'SI',
          diasAntes: tareaSeleccionada.Dias_Antes || '1',
          estado: tareaSeleccionada.Estado || 'Pendiente',
          compartidoCon: tareaSeleccionada.Compartido_Con || '',
        }),
      });

      const resultado = await response.json();
      if (resultado.success) {
        setMensaje('✅ Evento actualizado correctamente');
        setTimeout(() => {
          setMostrarModal(false);
          window.location.reload();
        }, 1000);
      } else {
        setMensaje(`❌ Error: ${resultado.error || 'Error desconocido'}`);
      }
    } catch (error) {
      setMensaje(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este evento?')) return;
    
    setCargando(true);
    setMensaje('');
    
    try {
      const response = await fetch(`/api/agenda?id=${encodeURIComponent(tareaSeleccionada.ID)}`, {
        method: 'DELETE',
      });
      
      const resultado = await response.json();
      if (resultado.success) {
        setMensaje('✅ Evento eliminado correctamente');
        setTimeout(() => {
          setMostrarModal(false);
          window.location.reload();
        }, 1000);
      } else {
        setMensaje(`❌ Error: ${resultado.error}`);
      }
    } catch (error) {
      setMensaje(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const parsearFechaArgentina = (fecha) => {
    if (!fecha) return '';
    const [dia, mes, anio] = fecha.split('/');
    if (dia && mes && anio) {
      return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
    return fecha;
  };

  return (
    <div className="container">
      {/* Modal de Edición de Tarea */}
      {mostrarModal && tareaSeleccionada && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={() => { setMostrarModal(false); setMensaje(''); }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>{tareaSeleccionada.Titulo}</h2>
            <form onSubmit={handleEditar}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label><strong>Tipo</strong></label>
                  <select
                    value={tareaSeleccionada.Tipo || 'Otro'}
                    onChange={(e) => setTareaSeleccionada({ ...tareaSeleccionada, Tipo: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                  >
                    <option value="Entrevista">Entrevista</option>
                    <option value="Plazo">Plazo</option>
                    <option value="Audiencia">Audiencia</option>
                    <option value="Pericia">Pericia</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label><strong>Fecha</strong></label>
                  <input
                    type="date"
                    value={parsearFechaArgentina(tareaSeleccionada.Fecha) || ''}
                    onChange={(e) => setTareaSeleccionada({ ...tareaSeleccionada, Fecha: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label><strong>Hora</strong></label>
                  <input
                    type="time"
                    value={tareaSeleccionada.Hora || ''}
                    onChange={(e) => setTareaSeleccionada({ ...tareaSeleccionada, Hora: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label><strong>Estado</strong></label>
                  <select
                    value={tareaSeleccionada.Estado || 'Pendiente'}
                    onChange={(e) => setTareaSeleccionada({ ...tareaSeleccionada, Estado: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Completado">Completado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label><strong>N° SAC</strong></label>
                  <input
                    type="text"
                    value={tareaSeleccionada.Numero_SAC || ''}
                    onChange={(e) => setTareaSeleccionada({ ...tareaSeleccionada, Numero_SAC: e.target.value })}
                    placeholder="Ej: 123456"
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label><strong>Cliente</strong></label>
                  <input
                    type="text"
                    value={tareaSeleccionada.Cliente || ''}
                    onChange={(e) => setTareaSeleccionada({ ...tareaSeleccionada, Cliente: e.target.value })}
                    placeholder="Nombre del cliente"
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '15px' }}>
                <label><strong>Título</strong></label>
                <input
                  type="text"
                  value={tareaSeleccionada.Titulo || ''}
                  onChange={(e) => setTareaSeleccionada({ ...tareaSeleccionada, Titulo: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginTop: '15px' }}>
                <label><strong>Descripción</strong></label>
                <textarea
                  value={tareaSeleccionada.Descripcion || ''}
                  onChange={(e) => setTareaSeleccionada({ ...tareaSeleccionada, Descripcion: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', minHeight: '60px' }}
                />
              </div>

              <div style={{ marginTop: '15px' }}>
                <label><strong>Lugar</strong></label>
                <input
                  type="text"
                  value={tareaSeleccionada.Lugar || ''}
                  onChange={(e) => setTareaSeleccionada({ ...tareaSeleccionada, Lugar: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                />
              </div>

              {mensaje && (
                <div
                  style={{
                    marginTop: '15px',
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: mensaje.includes('✅') ? '#c6f6d5' : '#fed7d7',
                    color: mensaje.includes('✅') ? '#22543d' : '#9b2c2c',
                  }}
                >
                  {mensaje}
                </div>
              )}

              <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button type="submit" style={{ backgroundColor: '#3182ce' }} disabled={cargando}>
                  {cargando ? 'Guardando...' : '💾 Guardar Cambios'}
                </button>
                {tareaSeleccionada?.Numero_SAC && (
                  <button 
                    type="button" 
                    onClick={() => router.push(`/expediente/${encodeURIComponent(tareaSeleccionada.Numero_SAC)}`)}
                    style={{ backgroundColor: '#2563eb' }}
                  >
                    📋 IR AL EXPEDIENTE
                  </button>
                )}
                <button type="button" onClick={handleEliminar} style={{ backgroundColor: '#e53e3e' }}>
                  🗑️ Eliminar
                </button>
                <button type="button" onClick={() => { setMostrarModal(false); setMensaje(''); }} style={{ backgroundColor: '#718096' }}>
                  ❌ Cerrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '32px' }}>
        <h1>Dashboard</h1>
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
