// pages/agenda.js
// Módulo de agenda con vista de calendario mensual y tarjetas de tareas

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import BotonInicio from '../components/BotonInicio';
import { getAgenda, getTareasPendientes } from '../lib/googleSheets';

export async function getServerSideProps(context) {
  // Obtener usuario de la cookie
  const cookies = context.req.headers.cookie || '';
  const userCookie = cookies.split(';').find(c => c.trim().startsWith('user='));
  let usuario = '';
  if (userCookie) {
    try {
      const userData = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
      usuario = userData.email || '';
    } catch (e) {}
  }

  try {
    const eventos = await getAgenda({ usuario });
    const tareas = await getTareasPendientes(usuario);
    return {
      props: {
        eventos: eventos || [],
        tareas: tareas || [],
        usuario,
      },
    };
  } catch (error) {
    console.error('Error al cargar agenda:', error);
    return { props: { eventos: [], tareas: [], usuario: '' } };
  }
}

export default function AgendaPage({ eventos: eventosIniciales, tareas: tareasIniciales, usuario }) {
  const [eventos, setEventos] = useState(eventosIniciales || []);
  const [tareas, setTareas] = useState(tareasIniciales || []);
  const [vista, setVista] = useState('calendario'); // 'calendario' | 'tareas'
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mesActual, setMesActual] = useState(new Date());
  const router = useRouter();

  const [nuevoEvento, setNuevoEvento] = useState({
    tipo: 'Otro',
    titulo: '',
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
    hora: '',
    horaFin: '',
    lugar: '',
    recordatorio: 'SI',
    diasAntes: '1',
    estado: 'Pendiente',
    cliente: '',
    numeroSAC: '',
    compartidoCon: '',
  });

  // Recargar eventos al cambiar de mes
  useEffect(() => {
    const cargarEventos = async () => {
      try {
        const response = await fetch(`/api/agenda?usuario=${encodeURIComponent(usuario)}`);
        const data = await response.json();
        if (data.eventos) {
          setEventos(data.eventos);
        }
        const tareasResponse = await fetch(`/api/agenda?pendientes=true&usuario=${encodeURIComponent(usuario)}`);
        const tareasData = await tareasResponse.json();
        if (tareasData.eventos) {
          setTareas(tareasData.eventos);
        }
      } catch (error) {
        console.error('Error al recargar eventos:', error);
      }
    };
    cargarEventos();
  }, [mesActual, usuario]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevoEvento(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setCargando(true);

    if (!nuevoEvento.fecha || !nuevoEvento.titulo) {
      setMensaje('⚠️ Fecha y Título son obligatorios');
      setCargando(false);
      return;
    }

    try {
      const response = await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nuevoEvento,
          creadoPor: usuario,
        }),
      });

      const resultado = await response.json();
      if (resultado.success) {
        setMensaje('✅ Evento agregado correctamente');
        setNuevoEvento({
          tipo: 'Otro',
          titulo: '',
          descripcion: '',
          fecha: new Date().toISOString().split('T')[0],
          hora: '',
          horaFin: '',
          lugar: '',
          recordatorio: 'SI',
          diasAntes: '1',
          estado: 'Pendiente',
          cliente: '',
          numeroSAC: '',
          compartidoCon: '',
        });
        setMostrarFormulario(false);
        // Recargar eventos
        const reload = await fetch(`/api/agenda?usuario=${encodeURIComponent(usuario)}`);
        const data = await reload.json();
        if (data.eventos) setEventos(data.eventos);
        const tareasReload = await fetch(`/api/agenda?pendientes=true&usuario=${encodeURIComponent(usuario)}`);
        const tareasData = await tareasReload.json();
        if (tareasData.eventos) setTareas(tareasData.eventos);
      } else {
        setMensaje('❌ Error: ' + (resultado.error || 'Error desconocido'));
      }
    } catch (error) {
      setMensaje('❌ Error: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  // Navegación del mes
  const cambiarMes = (delta) => {
    const nuevoMes = new Date(mesActual);
    nuevoMes.setMonth(nuevoMes.getMonth() + delta);
    setMesActual(nuevoMes);
  };

  // Obtener días del mes
  const obtenerDiasMes = (fecha) => {
    const year = fecha.getFullYear();
    const month = fecha.getMonth();
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const dias = [];
    
    // Días del mes anterior para completar la primera semana
    const primerDiaSemana = primerDia.getDay();
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
      const dia = new Date(year, month, -i);
      dias.push({ fecha: dia, esOtroMes: true });
    }
    
    // Días del mes actual
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      const dia = new Date(year, month, i);
      dias.push({ fecha: dia, esOtroMes: false });
    }
    
    return dias;
  };

  const diasMes = obtenerDiasMes(mesActual);
  const nombreMes = mesActual.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  const hoy = new Date().toISOString().split('T')[0];

  // Función para obtener el color según el tipo
  const getTipoColor = (tipo) => {
    const colores = {
      'Entrevista': '#38a169',
      'Plazo': '#e53e3e',
      'Audiencia': '#3182ce',
      'Pericia': '#d69e2e',
      'Otro': '#718096',
    };
    return colores[tipo] || '#718096';
  };

  // Función para obtener eventos de un día
  const getEventosDelDia = (fechaStr) => {
    return eventos.filter(e => e.Fecha === fechaStr);
  };

  // Función para manejar clic en tarjeta de tarea
  const handleTareaClick = async (evento) => {
    if (evento.Numero_SAC) {
      router.push(`/expediente/${evento.Numero_SAC}`);
    } else if (evento.Cliente) {
      // Buscar cliente por nombre
      try {
        const response = await fetch(`/api/clientes?nombre=${encodeURIComponent(evento.Cliente)}`);
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
      alert('Evento sin expediente ni cliente vinculado');
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BotonInicio />
          <h1>📅 Agenda</h1>
        </div>
        <a href="/" style={{ color: '#3182ce', textDecoration: 'none' }}>← Volver al inicio</a>
      </div>

      {/* Botones de vista */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setVista('calendario')}
          style={{ backgroundColor: vista === 'calendario' ? '#3182ce' : '#718096' }}
        >
          📅 Calendario
        </button>
        <button
          onClick={() => setVista('tareas')}
          style={{ backgroundColor: vista === 'tareas' ? '#3182ce' : '#718096' }}
        >
          ✅ Tareas Pendientes ({tareas.length})
        </button>
        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          style={{ backgroundColor: '#38a169' }}
        >
          + Nuevo Evento
        </button>
      </div>

      {/* Formulario para nuevo evento */}
      {mostrarFormulario && (
        <div style={{ backgroundColor: '#f7fafc', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
          <h3>📝 Nuevo Evento</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label><strong>Tipo</strong></label>
                <select name="tipo" value={nuevoEvento.tipo} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <option value="Entrevista">Entrevista</option>
                  <option value="Plazo">Plazo</option>
                  <option value="Audiencia">Audiencia</option>
                  <option value="Pericia">Pericia</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label><strong>Fecha *</strong></label>
                <input type="date" name="fecha" value={nuevoEvento.fecha} onChange={handleChange} required />
              </div>
              <div>
                <label><strong>Hora (opcional)</strong></label>
                <input type="time" name="hora" value={nuevoEvento.hora} onChange={handleChange} />
              </div>
              <div>
                <label><strong>Hora Fin (opcional)</strong></label>
                <input type="time" name="horaFin" value={nuevoEvento.horaFin} onChange={handleChange} />
              </div>
              <div>
                <label><strong>N° SAC (opcional)</strong></label>
                <input type="text" name="numeroSAC" value={nuevoEvento.numeroSAC} onChange={handleChange} placeholder="Ej: 123456" />
              </div>
              <div>
                <label><strong>Cliente (opcional)</strong></label>
                <input type="text" name="cliente" value={nuevoEvento.cliente} onChange={handleChange} placeholder="Nombre del cliente" />
              </div>
            </div>
            <div style={{ marginTop: '15px' }}>
              <label><strong>Título *</strong></label>
              <input type="text" name="titulo" value={nuevoEvento.titulo} onChange={handleChange} placeholder="Ej: Contestar demanda" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }} required />
            </div>
            <div style={{ marginTop: '15px' }}>
              <label><strong>Descripción</strong></label>
              <textarea name="descripcion" value={nuevoEvento.descripcion} onChange={handleChange} placeholder="Detalles del evento..." style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', minHeight: '60px' }} />
            </div>
            <div style={{ marginTop: '15px' }}>
              <label><strong>Lugar</strong></label>
              <input type="text" name="lugar" value={nuevoEvento.lugar} onChange={handleChange} placeholder="Dirección, link de Zoom, etc." style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '15px' }}>
              <div>
                <label><strong>Recordatorio</strong></label>
                <select name="recordatorio" value={nuevoEvento.recordatorio} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <option value="SI">SI</option>
                  <option value="NO">NO</option>
                </select>
              </div>
              <div>
                <label><strong>Días antes</strong></label>
                <input type="number" name="diasAntes" value={nuevoEvento.diasAntes} onChange={handleChange} min="1" max="30" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              </div>
              <div>
                <label><strong>Estado</strong></label>
                <select name="estado" value={nuevoEvento.estado} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Completado">Completado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '15px' }}>
              <label><strong>Compartir con (emails separados por coma)</strong></label>
              <input type="text" name="compartidoCon" value={nuevoEvento.compartidoCon} onChange={handleChange} placeholder="email1@gmail.com, email2@gmail.com" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
            </div>
            {mensaje && <div style={{ marginTop: '15px', padding: '10px', borderRadius: '8px', backgroundColor: mensaje.includes('✅') ? '#c6f6d5' : '#fed7d7', color: mensaje.includes('✅') ? '#22543d' : '#9b2c2c' }}>{mensaje}</div>}
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ backgroundColor: '#3182ce' }} disabled={cargando}>{cargando ? 'Guardando...' : 'Guardar Evento'}</button>
              <button type="button" onClick={() => { setMostrarFormulario(false); setMensaje(''); }} style={{ backgroundColor: '#718096' }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Vista de calendario */}
      {vista === 'calendario' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <button onClick={() => cambiarMes(-1)} style={{ backgroundColor: '#718096' }}>← Mes anterior</button>
            <h2 style={{ margin: 0 }}>{nombreMes}</h2>
            <button onClick={() => cambiarMes(1)} style={{ backgroundColor: '#718096' }}>Mes siguiente →</button>
          </div>

          {/* Cuadrícula del calendario */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: '2px',
            backgroundColor: '#e2e8f0',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {/* Días de la semana */}
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <div key={d} style={{ backgroundColor: '#edf2f7', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
                {d}
              </div>
            ))}

            {/* Días del mes */}
            {diasMes.map((dia, index) => {
              const fechaStr = dia.fecha.toISOString().split('T')[0];
              const eventosDia = getEventosDelDia(fechaStr);
              const esHoy = fechaStr === hoy;
              const esOtroMes = dia.esOtroMes;

              return (
                <div 
                  key={index}
                  style={{
                    backgroundColor: esOtroMes ? '#f7fafc' : esHoy ? '#ebf8ff' : 'white',
                    minHeight: '80px',
                    padding: '6px',
                    border: esHoy ? '2px solid #3182ce' : 'none',
                    opacity: esOtroMes ? 0.5 : 1,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={() => {
                    setNuevoEvento(prev => ({ ...prev, fecha: fechaStr }));
                    setMostrarFormulario(true);
                  }}
                  onMouseEnter={(e) => {
                    if (!esOtroMes) e.currentTarget.style.backgroundColor = '#edf2f7';
                  }}
                  onMouseLeave={(e) => {
                    if (!esOtroMes) e.currentTarget.style.backgroundColor = esHoy ? '#ebf8ff' : 'white';
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{dia.fecha.getDate()}</div>
                  {eventosDia.map((ev, idx) => (
                    <div 
                      key={idx}
                      style={{
                        backgroundColor: getTipoColor(ev.Tipo),
                        color: 'white',
                        fontSize: '0.65rem',
                        padding: '2px 4px',
                        borderRadius: '3px',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Mostrar detalle del evento
                        alert(`📅 ${ev.Tipo}\n📌 ${ev.Titulo}\n📝 ${ev.Descripcion || 'Sin descripción'}\n📍 ${ev.Lugar || 'Sin lugar'}`);
                      }}
                    >
                      {ev.Titulo}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vista de tareas pendientes */}
      {vista === 'tareas' && (
        <div>
          <h2>✅ Tareas Pendientes</h2>
          {tareas.length === 0 ? (
            <p style={{ color: '#4a5568' }}>No hay tareas pendientes.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tareas.map((tarea) => (
                <div
                  key={tarea.ID}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '15px',
                    backgroundColor: '#f7fafc',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderLeft: `4px solid ${getTipoColor(tarea.Tipo)}`
                  }}
                  onClick={() => handleTareaClick(tarea)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#edf2f7'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{tarea.Titulo}</strong>
                      <span style={{ marginLeft: '10px', color: '#4a5568', fontSize: '0.9rem' }}>
                        {tarea.Tipo}
                      </span>
                      {tarea.Numero_SAC && (
                        <span style={{ marginLeft: '10px', backgroundColor: '#3182ce', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem' }}>
                          SAC: {tarea.Numero_SAC}
                        </span>
                      )}
                      {tarea.Cliente && (
                        <span style={{ marginLeft: '10px', color: '#4a5568', fontSize: '0.9rem' }}>
                          👤 {tarea.Cliente}
                        </span>
                      )}
                    </div>
                    <span style={{ color: '#4a5568', fontSize: '0.9rem' }}>
                      {tarea.Fecha} {tarea.Hora ? `- ${tarea.Hora}` : ''}
                    </span>
                  </div>
                  {tarea.Descripcion && (
                    <div style={{ marginTop: '8px', color: '#4a5568', fontSize: '0.9rem' }}>
                      {tarea.Descripcion.substring(0, 100)}
                      {tarea.Descripcion.length > 100 && '...'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
