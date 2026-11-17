// pages/agenda.js
// Módulo de agenda con vista de calendario mensual y tarjetas de tareas

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock, ListTodo, MapPin, Plus, Trash2, X } from 'lucide-react';
import { getAgenda, getTareasPendientes, getClientes, formatearFechaArgentina, parsearFechaArgentina, getFechaHoyISO } from '../lib/googleSheets';

function parseUserFromCookie(rawCookie = '') {
  const userCookie = rawCookie
    .split(';')
    .find((c) => c.trim().startsWith('user='));

  if (!userCookie) return null;

  try {
    const value = decodeURIComponent(userCookie.split('=').slice(1).join('='));
    const data = JSON.parse(value);
    return data?.email ? data : null;
  } catch {
    return null;
  }
}

function toIsoDateOnly(dateObj) {
  if (!(dateObj instanceof Date) || isNaN(dateObj)) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
    const [eventos, tareas, clientes] = await Promise.all([
      getAgenda({ usuario }),
      getTareasPendientes(usuario),
      getClientes(usuario),
    ]);

    // Mapa SAC -> cliente para enriquecer cuando falte Cliente
    const sacToCliente = new Map();
    (clientes || []).forEach((c) => {
      (c.expedientes || []).forEach((exp) => {
        if (exp?.Numero_SAC) {
          sacToCliente.set(exp.Numero_SAC, {
            id: c.ID_Cliente,
            nombre: c.Nombre_Cliente || '',
          });
        }
      });
    });

    const enriquecer = (item) => {
      const fromSac = item.Numero_SAC ? sacToCliente.get(item.Numero_SAC) : null;
      return {
        ...item,
        Cliente: item.Cliente || fromSac?.nombre || '',
        Cliente_ID: item.Cliente_ID || fromSac?.id || null,
        Fecha: formatearFechaArgentina(item.Fecha), // Aseguramos formato DD/MM/AAAA
      };
    };

    return {
      props: {
        eventos: (eventos || []).map(enriquecer),
        tareas: (tareas || []).map(enriquecer),
        usuario,
      },
    };
  } catch (error) {
    console.error('Error al cargar agenda:', error);
    return { props: { eventos: [], tareas: [], usuario } };
  }
}

export default function AgendaPage({ eventos: eventosIniciales, tareas: tareasIniciales, usuario }) {
  const [eventos, setEventos] = useState(eventosIniciales || []);
  const [tareas, setTareas] = useState(tareasIniciales || []);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [vista, setVista] = useState('calendario');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mesActual, setMesActual] = useState(new Date());
  const router = useRouter();

  const [nuevoEvento, setNuevoEvento] = useState({
    tipo: 'Otro',
    titulo: '',
    descripcion: '',
    fecha: getFechaHoyISO(),
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const numeroSAC = params.get('numeroSAC');
    const cliente = params.get('cliente');
    const tipo = params.get('tipo');
    const tareaId = params.get('tareaId');

    if (tareaId) {
      // Buscar la tarea en el array (se cargará cuando recargarEventos ejecute)
      const tarea = tareas.find(t => t.ID === tareaId || t.Numero_SAC === tareaId);
      if (tarea) {
        setTareaSeleccionada(tarea);
      }
    } else if (numeroSAC || cliente || tipo) {
      setNuevoEvento((prev) => ({
        ...prev,
        numeroSAC: numeroSAC || '',
        cliente: cliente || '',
        tipo: tipo || 'Otro',
      }));
      setMostrarFormulario(true);
    }
  }, [tareas]);

  const recargarEventos = async () => {
    try {
      const [resEventos, resPendientes] = await Promise.all([
        fetch(`/api/agenda?usuario=${encodeURIComponent(usuario)}`),
        fetch(`/api/agenda?pendientes=true&usuario=${encodeURIComponent(usuario)}`),
      ]);

      const dataEventos = await resEventos.json();
      const dataPendientes = await resPendientes.json();

      if (dataEventos?.eventos) setEventos(dataEventos.eventos);
      if (dataPendientes?.eventos) setTareas(dataPendientes.eventos);
    } catch (error) {
      console.error('Error al recargar eventos:', error);
    }
  };

  useEffect(() => {
    recargarEventos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesActual, usuario]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevoEvento((prev) => ({ ...prev, [name]: value }));
  };

  const limpiarFormulario = () => {
    setNuevoEvento({
      tipo: 'Otro',
      titulo: '',
      descripcion: '',
      fecha: getFechaHoyISO(),
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
        body: JSON.stringify({ ...nuevoEvento, creadoPor: usuario }),
      });

      const resultado = await response.json();
      if (resultado.success) {
        setMensaje('✅ Evento agregado correctamente');
        limpiarFormulario();
        setMostrarFormulario(false);
        await recargarEventos();
      } else {
        setMensaje(`❌ Error: ${resultado.error || 'Error desconocido'}`);
      }
    } catch (error) {
      setMensaje(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const handleEditar = async (e) => {
    e.preventDefault();
    setMensaje('');
    setCargando(true);

    try {
      const datosActualizados = {
        id: eventoSeleccionado.ID,
        numeroSAC: eventoSeleccionado.Numero_SAC || '',
        cliente: eventoSeleccionado.Cliente || '',
        tipo: eventoSeleccionado.Tipo || 'Otro',
        titulo: eventoSeleccionado.Titulo || '',
        descripcion: eventoSeleccionado['Descripción'] || '',
        fecha: eventoSeleccionado.Fecha || '', // Puede ser DD/MM/AAAA o YYYY-MM-DD (si se editó)
        hora: eventoSeleccionado.Hora || '',
        horaFin: eventoSeleccionado.Hora_Fin || '',
        lugar: eventoSeleccionado.Lugar || '',
        recordatorio: eventoSeleccionado.Recordatorio || 'SI',
        diasAntes: eventoSeleccionado.Dias_Antes || '1',
        estado: eventoSeleccionado.Estado || 'Pendiente',
        compartidoCon: eventoSeleccionado.Compartido_Con || '',
      };

      const response = await fetch('/api/agenda', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosActualizados),
      });

      const resultado = await response.json();

      if (resultado.success) {
        setMensaje('✅ Evento actualizado correctamente');
        setMostrarModal(false);
        await recargarEventos();
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
    if (!confirm('¿Estás seguro de eliminar este evento?')) return;

    try {
      const response = await fetch(`/api/agenda?id=${eventoSeleccionado.ID}`, {
        method: 'DELETE',
      });
      const resultado = await response.json();

      if (resultado.success) {
        setMensaje('✅ Evento eliminado correctamente');
        setMostrarModal(false);
        await recargarEventos();
      } else {
        setMensaje(`❌ Error: ${resultado.error || 'Error desconocido'}`);
      }
    } catch (error) {
      setMensaje(`❌ Error: ${error.message}`);
    }
  };

  const abrirModal = (evento) => {
    setEventoSeleccionado({ ...evento });
    setMostrarModal(true);
    setMensaje('');
  };

  // Click en tarea: priorizar SAC y luego cliente
  const handleTareaClick = async (tarea) => {
    if (tarea.Numero_SAC) {
      router.push(`/expediente/${encodeURIComponent(tarea.Numero_SAC)}`);
      return;
    }

    if (tarea.Cliente_ID) {
      router.push(`/clientes/${encodeURIComponent(tarea.Cliente_ID)}`);
      return;
    }

    if (tarea.Cliente) {
      try {
        const res = await fetch(`/api/clientes?nombre=${encodeURIComponent(tarea.Cliente)}`);
        const data = await res.json();

        if (data?.clientes?.length > 0) {
          router.push(`/clientes/${encodeURIComponent(data.clientes[0].ID_Cliente)}`);
          return;
        }
      } catch (err) {
        console.error('Error al buscar cliente:', err);
      }
    }

    abrirModal(tarea);
  };

  const cambiarMes = (delta) => {
    const nuevoMes = new Date(mesActual);
    nuevoMes.setMonth(nuevoMes.getMonth() + delta);
    setMesActual(nuevoMes);
  };

  const obtenerDiasMes = (fecha) => {
    const year = fecha.getFullYear();
    const month = fecha.getMonth();
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const dias = [];

    const primerDiaSemana = primerDia.getDay();

    for (let i = primerDiaSemana - 1; i >= 0; i--) {
      const dia = new Date(year, month, -i);
      dias.push({ fecha: dia, esOtroMes: true });
    }

    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      const dia = new Date(year, month, i);
      dias.push({ fecha: dia, esOtroMes: false });
    }

    // Completar la última semana con los primeros días del mes siguiente
    let siguiente = 1;
    while (dias.length % 7 !== 0) {
      dias.push({ fecha: new Date(year, month + 1, siguiente++), esOtroMes: true });
    }

    return dias;
  };

  const diasMes = useMemo(() => obtenerDiasMes(mesActual), [mesActual]);
  const nombreMes = mesActual.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  const hoy = getFechaHoyISO();

  const getTipoColor = (tipo) => {
    const colores = {
      Entrevista: '#079455',
      Plazo: '#d92d20',
      Audiencia: '#1570ef',
      Pericia: '#dc6803',
      Otro: '#667085',
    };
    return colores[tipo] || '#667085';
  };
  const tipos = ['Entrevista', 'Plazo', 'Audiencia', 'Pericia', 'Otro'];

  // Convertimos la fecha del evento (DD/MM/AAAA) a YYYY-MM-DD para poder comparar con el calendario
  const getEventosDelDia = (fechaStr) => 
    eventos.filter((e) => parsearFechaArgentina(e.Fecha) === fechaStr);

  const campo = (label, input, extra = {}) => (
    <div style={extra}>
      <label>{label}</label>
      {input}
    </div>
  );
  const alerta = (m) => (
    <div className={`alert ${m.includes('✅') ? 'alert-success' : 'alert-urgent'}`} style={{ marginTop: '16px', marginBottom: 0 }}>{m}</div>
  );
  const opcionesTipo = tipos.map((t) => <option key={t} value={t}>{t}</option>);
  const opcionesEstado = ['Pendiente', 'Completado', 'Cancelado'].map((t) => <option key={t} value={t}>{t}</option>);
  const tituloMes = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

  return (
    <div className="container lx-page">
      <div className="lx-page-head">
        <div>
          <h1>Agenda</h1>
          <p>Calendario de eventos, plazos y tareas pendientes</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className="lx-segmented" role="tablist">
            <button type="button" className={`lx-segment${vista === 'calendario' ? ' is-active' : ''}`} onClick={() => setVista('calendario')}>
              <CalendarDays size={15} /> Calendario
            </button>
            <button type="button" className={`lx-segment${vista === 'tareas' ? ' is-active' : ''}`} onClick={() => setVista('tareas')}>
              <ListTodo size={15} /> Pendientes <span className="lx-tab-count">{tareas.length}</span>
            </button>
          </div>
          <button className={`button button-sm${mostrarFormulario ? ' button-secondary' : ''}`} onClick={() => setMostrarFormulario(!mostrarFormulario)}>
            {mostrarFormulario ? <><X size={15} /> Cerrar</> : <><Plus size={15} /> Nuevo evento</>}
          </button>
        </div>
      </div>

      {tareaSeleccionada && (
        <div className="lx-card ag-selected">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 className="lx-card-title" style={{ marginBottom: '6px' }}>{tareaSeleccionada.Titulo}</h3>
            {tareaSeleccionada.Descripcion && <p style={{ margin: '0 0 10px' }}>{tareaSeleccionada.Descripcion}</p>}
            <div className="exp-meta">
              <span className="exp-meta-item"><span className="exp-meta-label">Tipo</span>{tareaSeleccionada.Tipo}</span>
              <span className="exp-meta-item"><span className="exp-meta-label">Fecha</span>{formatearFechaArgentina(tareaSeleccionada.Fecha)}</span>
              {tareaSeleccionada.Cliente && <span className="exp-meta-item"><span className="exp-meta-label">Cliente</span>{tareaSeleccionada.Cliente}</span>}
              {tareaSeleccionada.Numero_SAC && <span className="exp-meta-item"><span className="exp-meta-label">SAC</span>{tareaSeleccionada.Numero_SAC}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {tareaSeleccionada.Numero_SAC && (
              <button className="button button-sm" onClick={() => router.push(`/expediente/${encodeURIComponent(tareaSeleccionada.Numero_SAC)}`)}>
                Ir al expediente <ArrowRight size={15} />
              </button>
            )}
            <button className="lx-icon-btn" onClick={() => setTareaSeleccionada(null)} aria-label="Cerrar"><X size={16} /></button>
          </div>
        </div>
      )}

      {mostrarFormulario && (
        <div className="lx-card exp-form">
          <h3 className="lx-card-title">Nuevo evento</h3>
          <form onSubmit={handleSubmit}>
            <div className="exp-form-grid">
              {campo('Tipo', <select name="tipo" value={nuevoEvento.tipo} onChange={handleChange}>{opcionesTipo}</select>)}
              {campo('Fecha *', <input type="date" name="fecha" value={nuevoEvento.fecha} onChange={handleChange} required />)}
              {campo('Hora', <input type="time" name="hora" value={nuevoEvento.hora} onChange={handleChange} />)}
              {campo('Hora de fin', <input type="time" name="horaFin" value={nuevoEvento.horaFin} onChange={handleChange} />)}
              {campo('N.º SAC', <input type="text" name="numeroSAC" value={nuevoEvento.numeroSAC} onChange={handleChange} placeholder="Ej: 123456" />)}
              {campo('Cliente', <input type="text" name="cliente" value={nuevoEvento.cliente} onChange={handleChange} placeholder="Nombre del cliente" />)}
            </div>
            <div className="lx-modal-stack">
              {campo('Título *', <input type="text" name="titulo" value={nuevoEvento.titulo} onChange={handleChange} placeholder="Ej: Contestar demanda" required />)}
              {campo('Descripción', <textarea className="textarea-sm" name="descripcion" value={nuevoEvento.descripcion} onChange={handleChange} placeholder="Detalles del evento…" />)}
              {campo('Lugar', <input type="text" name="lugar" value={nuevoEvento.lugar} onChange={handleChange} placeholder="Dirección, link de Zoom, etc." />)}
            </div>
            <div className="exp-form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginTop: '14px' }}>
              {campo('Recordatorio', <select name="recordatorio" value={nuevoEvento.recordatorio} onChange={handleChange}><option value="SI">Sí</option><option value="NO">No</option></select>)}
              {campo('Días antes', <input type="number" name="diasAntes" value={nuevoEvento.diasAntes} onChange={handleChange} min="1" max="30" />)}
              {campo('Estado', <select name="estado" value={nuevoEvento.estado} onChange={handleChange}>{opcionesEstado}</select>)}
            </div>
            <div style={{ marginTop: '14px' }}>
              {campo('Compartir con (emails separados por coma)', <input type="text" name="compartidoCon" value={nuevoEvento.compartidoCon} onChange={handleChange} placeholder="email1@gmail.com, email2@gmail.com" />)}
            </div>
            {mensaje && !mostrarModal && alerta(mensaje)}
            <div className="exp-form-actions">
              <button type="submit" className="button button-sm" disabled={cargando}>{cargando ? 'Guardando…' : 'Guardar evento'}</button>
              <button type="button" className="button button-secondary button-sm" onClick={() => { setMostrarFormulario(false); setMensaje(''); }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {mostrarModal && eventoSeleccionado && (
        <div className="lx-modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="lx-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lx-modal-head">
              <h2>{eventoSeleccionado.Titulo || 'Evento'}</h2>
              <button type="button" className="lx-icon-btn" onClick={() => { setMostrarModal(false); setMensaje(''); }} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <form onSubmit={handleEditar}>
              <div className="lx-modal-grid">
                {campo('Tipo', <select value={eventoSeleccionado.Tipo || 'Otro'} onChange={(e) => setEventoSeleccionado({ ...eventoSeleccionado, Tipo: e.target.value })}>{opcionesTipo}</select>)}
                {campo('Fecha', <input type="date" value={parsearFechaArgentina(eventoSeleccionado.Fecha) || ''} onChange={(e) => setEventoSeleccionado({ ...eventoSeleccionado, Fecha: e.target.value })} />)}
                {campo('Hora', <input type="time" value={eventoSeleccionado.Hora || ''} onChange={(e) => setEventoSeleccionado({ ...eventoSeleccionado, Hora: e.target.value })} />)}
                {campo('Estado', <select value={eventoSeleccionado.Estado || 'Pendiente'} onChange={(e) => setEventoSeleccionado({ ...eventoSeleccionado, Estado: e.target.value })}>{opcionesEstado}</select>)}
                {campo('N.º SAC', <input type="text" value={eventoSeleccionado.Numero_SAC || ''} placeholder="Ej: 123456" onChange={(e) => setEventoSeleccionado({ ...eventoSeleccionado, Numero_SAC: e.target.value })} />)}
                {campo('Cliente', <input type="text" value={eventoSeleccionado.Cliente || ''} placeholder="Nombre del cliente" onChange={(e) => setEventoSeleccionado({ ...eventoSeleccionado, Cliente: e.target.value })} />)}
              </div>
              <div className="lx-modal-stack">
                {campo('Título', <input type="text" value={eventoSeleccionado.Titulo || ''} onChange={(e) => setEventoSeleccionado({ ...eventoSeleccionado, Titulo: e.target.value })} />)}
                {campo('Descripción', <textarea className="textarea-sm" value={eventoSeleccionado['Descripción'] || ''} onChange={(e) => setEventoSeleccionado({ ...eventoSeleccionado, 'Descripción': e.target.value })} />)}
                {campo('Lugar', <input type="text" value={eventoSeleccionado.Lugar || ''} onChange={(e) => setEventoSeleccionado({ ...eventoSeleccionado, Lugar: e.target.value })} />)}
              </div>
              {mensaje && alerta(mensaje)}
              <div className="lx-modal-actions">
                <button type="button" className="button button-ghost button-sm lx-text-danger" onClick={handleEliminar}>
                  <Trash2 size={15} /> Eliminar
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {eventoSeleccionado?.Numero_SAC && (
                    <button type="button" className="button button-secondary button-sm" onClick={() => router.push(`/expediente/${encodeURIComponent(eventoSeleccionado.Numero_SAC)}`)}>
                      Ir al expediente <ArrowRight size={15} />
                    </button>
                  )}
                  <button type="submit" className="button button-sm" disabled={cargando}>{cargando ? 'Guardando…' : 'Guardar cambios'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {vista === 'calendario' && (
        <div className="lx-card ag-cal">
          <div className="ag-cal-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="ag-month">{tituloMes}</h2>
            </div>
            <div className="ag-legend">
              {tipos.map((t) => (
                <span key={t}><span className="lx-dot" style={{ backgroundColor: getTipoColor(t) }} /> {t}</span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button type="button" className="button button-secondary button-sm" onClick={() => setMesActual(new Date())}>Hoy</button>
              <button type="button" className="lx-icon-btn" onClick={() => cambiarMes(-1)} aria-label="Mes anterior"><ChevronLeft size={18} /></button>
              <button type="button" className="lx-icon-btn" onClick={() => cambiarMes(1)} aria-label="Mes siguiente"><ChevronRight size={18} /></button>
            </div>
          </div>

          <div className="ag-grid">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
              <div key={d} className="ag-dow">{d}</div>
            ))}
            {diasMes.map((dia, index) => {
              const fechaStr = toIsoDateOnly(dia.fecha);
              const eventosDia = getEventosDelDia(fechaStr);
              const esHoy = fechaStr === hoy;
              return (
                <div
                  key={index}
                  className={`ag-day${dia.esOtroMes ? ' is-other' : ''}${esHoy ? ' is-today' : ''}`}
                  onClick={() => {
                    setNuevoEvento((prev) => ({ ...prev, fecha: fechaStr }));
                    setMostrarFormulario(true);
                  }}
                  title="Clic para agregar un evento este día"
                >
                  <div className="ag-day-num">{dia.fecha.getDate()}</div>
                  {eventosDia.slice(0, 4).map((ev, idx) => (
                    <div
                      key={`${ev.ID || 'ev'}-${idx}`}
                      className="ag-event"
                      style={{ '--ev': getTipoColor(ev.Tipo) }}
                      onClick={(e) => { e.stopPropagation(); abrirModal(ev); }}
                      title={`${ev.Titulo}${ev.Cliente ? ` | Cliente: ${ev.Cliente}` : ''}${ev.Numero_SAC ? ` | SAC: ${ev.Numero_SAC}` : ''}`}
                    >
                      {ev.Hora && <span className="ag-event-time">{ev.Hora}</span>}
                      {ev.Titulo}
                    </div>
                  ))}
                  {eventosDia.length > 4 && <div className="ag-more">+{eventosDia.length - 4} más</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {vista === 'tareas' && (
        <div>
          {tareas.length === 0 ? (
            <div className="lx-empty">No hay tareas pendientes.</div>
          ) : (
            <div className="lx-table-wrap">
              {tareas.map((tarea) => (
                <div key={tarea.ID} className="cli-exp">
                  <div className="cli-exp-row" onClick={() => handleTareaClick(tarea)}>
                    <span className="lx-dot" style={{ backgroundColor: getTipoColor(tarea.Tipo), width: 8, height: 8 }} />
                    <div className="cli-exp-main">
                      <div className="lx-cell-strong">{tarea.Titulo}</div>
                      <div className="lx-cell-sub">
                        {tarea.Tipo}
                        {tarea['Descripción'] ? ` · ${tarea['Descripción'].substring(0, 100)}${tarea['Descripción'].length > 100 ? '…' : ''}` : ''}
                      </div>
                    </div>
                    {tarea.Cliente && <span className="lx-chip">{tarea.Cliente}</span>}
                    {tarea.Numero_SAC && <span className="lx-chip">SAC {tarea.Numero_SAC}</span>}
                    <span className="ag-task-date">
                      {formatearFechaArgentina(tarea.Fecha)}
                      {tarea.Hora && <><Clock size={12} /> {tarea.Hora}</>}
                    </span>
                    <ChevronRight size={16} className="lx-row-chevron" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
