// pages/agenda.js
// Módulo de agenda con vista de calendario mensual y tarjetas de tareas

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
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

    return dias;
  };

  const diasMes = useMemo(() => obtenerDiasMes(mesActual), [mesActual]);
  const nombreMes = mesActual.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  const hoy = getFechaHoyISO();

  const getTipoColor = (tipo) => {
    const colores = {
      Entrevista: '#38a169',
      Plazo: '#e53e3e',
      Audiencia: '#3182ce',
      Pericia: '#d69e2e',
      Otro: '#718096',
    };
    return colores[tipo] || '#718096';
  };

  // Convertimos la fecha del evento (DD/MM/AAAA) a YYYY-MM-DD para poder comparar con el calendario
  const getEventosDelDia = (fechaStr) => 
    eventos.filter((e) => parsearFechaArgentina(e.Fecha) === fechaStr);

  return (
    <div className="container">
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ marginBottom: '4px' }}>Agenda</h1>
        <p>Calendario de eventos y tareas pendientes</p>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button className={`button button-sm ${vista === 'calendario' ? '' : 'button-secondary'}`} onClick={() => setVista('calendario')}>
          Calendario
        </button>
        <button className={`button button-sm ${vista === 'tareas' ? '' : 'button-secondary'}`} onClick={() => setVista('tareas')}>
          Tareas Pendientes ({tareas.length})
        </button>
        <button className="button button-sm button-success" onClick={() => setMostrarFormulario(!mostrarFormulario)}>
          + Nuevo Evento
        </button>
      </div>

      {tareaSeleccionada && (
        <div style={{ backgroundColor: '#ebf8ff', border: '1px solid #3182ce', borderRadius: '6px', padding: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#0c3c26' }}>{tareaSeleccionada.Titulo}</h3>
            {tareaSeleccionada.Descripcion && (
              <p style={{ margin: '0 0 8px 0', color: '#1e3a8a', fontSize: '0.95rem', lineHeight: '1.4' }}>
                {tareaSeleccionada.Descripcion}
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', fontSize: '0.85rem', color: '#1e3a8a' }}>
              <div><strong>Tipo:</strong> {tareaSeleccionada.Tipo}</div>
              <div><strong>Fecha:</strong> {tareaSeleccionada.Fecha}</div>
              {tareaSeleccionada.Cliente && <div><strong>Cliente:</strong> {tareaSeleccionada.Cliente}</div>}
              {tareaSeleccionada.Numero_SAC && <div><strong>SAC:</strong> {tareaSeleccionada.Numero_SAC}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {tareaSeleccionada.Numero_SAC && (
              <button 
                className="button button-sm button-primary"
                onClick={() => router.push(`/expediente/${encodeURIComponent(tareaSeleccionada.Numero_SAC)}`)}
              >
                IR AL EXPEDIENTE
              </button>
            )}
            <button 
              className="button button-sm button-secondary"
              onClick={() => setTareaSeleccionada(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {mostrarFormulario && (
        <div style={{ backgroundColor: 'var(--color-surface)', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '24px', border: '1px solid var(--color-border-light)' }}>
          <h3 style={{ marginTop: 0 }}>Nuevo Evento</h3>
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
              <input
                type="text"
                name="titulo"
                value={nuevoEvento.titulo}
                onChange={handleChange}
                placeholder="Ej: Contestar demanda"
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                required
              />
            </div>

            <div style={{ marginTop: '15px' }}>
              <label><strong>Descripción</strong></label>
              <textarea
                name="descripcion"
                value={nuevoEvento.descripcion}
                onChange={handleChange}
                placeholder="Detalles del evento..."
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', minHeight: '60px' }}
              />
            </div>

            <div style={{ marginTop: '15px' }}>
              <label><strong>Lugar</strong></label>
              <input
                type="text"
                name="lugar"
                value={nuevoEvento.lugar}
                onChange={handleChange}
                placeholder="Dirección, link de Zoom, etc."
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
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
                <input
                  type="number"
                  name="diasAntes"
                  value={nuevoEvento.diasAntes}
                  onChange={handleChange}
                  min="1"
                  max="30"
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
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
              <input
                type="text"
                name="compartidoCon"
                value={nuevoEvento.compartidoCon}
                onChange={handleChange}
                placeholder="email1@gmail.com, email2@gmail.com"
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
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

            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ backgroundColor: '#3182ce' }} disabled={cargando}>
                {cargando ? 'Guardando...' : 'Guardar Evento'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarFormulario(false);
                  setMensaje('');
                }}
                style={{ backgroundColor: '#718096' }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {mostrarModal && eventoSeleccionado && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={() => setMostrarModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>{eventoSeleccionado.Titulo}</h2>
            <form onSubmit={handleEditar}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label><strong>Tipo</strong></label>
                  <select
                    value={eventoSeleccionado.Tipo || 'Otro'}
                    onChange={(e) => setEventoSeleccionado({ ...eventoSeleccionado, Tipo: e.target.value })}
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
                    value={parsearFechaArgentina(eventoSeleccionado.Fecha) || ''}
                    onChange={(e) => setEventoSeleccionado({ ...eventoSeleccionado, Fecha: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label><strong>Hora</strong></label>
                  <input
                    type="time"
                    value={eventoSeleccionado.Hora || ''}
                    onChange={(e) => setEventoSeleccionado({ ...eventoSeleccionado, Hora: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label><strong>Estado</strong></label>
                  <select
                    value={eventoSeleccionado.Estado || 'Pendiente'}
                    onChange={(e) => setEventoSeleccionado({ ...eventoSeleccionado, Estado: e.target.value })}
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
                    value={eventoSeleccionado.Numero_SAC || ''}
                    onChange={(e) => setEventoSeleccionado({ ...eventoSeleccionado, Numero_SAC: e.target.value })}
                    placeholder="Ej: 123456"
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label><strong>Cliente</strong></label>
                  <input
                    type="text"
                    value={eventoSeleccionado.Cliente || ''}
                    onChange={(e) => setEventoSeleccionado({ ...eventoSeleccionado, Cliente: e.target.value })}
                    placeholder="Nombre del cliente"
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '15px' }}>
                <label><strong>Título</strong></label>
                <input
                  type="text"
                  value={eventoSeleccionado.Titulo || ''}
                  onChange={(e) => setEventoSeleccionado({ ...eventoSeleccionado, Titulo: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginTop: '15px' }}>
                <label><strong>Descripción</strong></label>
                <textarea
                  value={eventoSeleccionado['Descripción'] || ''}
                  onChange={(e) => setEventoSeleccionado({ ...eventoSeleccionado, 'Descripción': e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', minHeight: '60px' }}
                />
              </div>

              <div style={{ marginTop: '15px' }}>
                <label><strong>Lugar</strong></label>
                <input
                  type="text"
                  value={eventoSeleccionado.Lugar || ''}
                  onChange={(e) => setEventoSeleccionado({ ...eventoSeleccionado, Lugar: e.target.value })}
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
                {eventoSeleccionado?.Numero_SAC && (
                  <button 
                    type="button" 
                    onClick={() => router.push(`/expediente/${encodeURIComponent(eventoSeleccionado.Numero_SAC)}`)}
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

      {vista === 'calendario' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <button onClick={() => cambiarMes(-1)} style={{ backgroundColor: '#718096' }}>← Mes anterior</button>
            <h2 style={{ margin: 0 }}>{nombreMes}</h2>
            <button onClick={() => cambiarMes(1)} style={{ backgroundColor: '#718096' }}>Mes siguiente →</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', backgroundColor: '#e2e8f0', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
              <div key={d} style={{ backgroundColor: '#edf2f7', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
                {d}
              </div>
            ))}

            {diasMes.map((dia, index) => {
              const fechaStr = toIsoDateOnly(dia.fecha);
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
                    transition: 'background-color 0.2s',
                  }}
                  onClick={() => {
                    setNuevoEvento((prev) => ({ ...prev, fecha: fechaStr }));
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
                      key={`${ev.ID || 'ev'}-${idx}`}
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
                        cursor: 'pointer',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirModal(ev);
                      }}
                      title={`${ev.Titulo}${ev.Cliente ? ` | Cliente: ${ev.Cliente}` : ''}${ev.Numero_SAC ? ` | SAC: ${ev.Numero_SAC}` : ''}`}
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

      {vista === 'tareas' && (
        <div>
          <h2>Tareas Pendientes</h2>
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
                    borderLeft: `4px solid ${getTipoColor(tarea.Tipo)}`,
                  }}
                  onClick={() => handleTareaClick(tarea)}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#edf2f7')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f7fafc')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div>
                      <strong>{tarea.Titulo}</strong>
                      <span style={{ marginLeft: '10px', color: '#4a5568', fontSize: '0.9rem' }}>{tarea.Tipo}</span>

                      {tarea.Numero_SAC && (
                        <span style={{ marginLeft: '10px', backgroundColor: '#3182ce', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem' }}>
                          SAC: {tarea.Numero_SAC}
                        </span>
                      )}

                      {tarea.Cliente && (
                        <span style={{ marginLeft: '10px', backgroundColor: '#38a169', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem' }}>
                          👤 {tarea.Cliente}
                        </span>
                      )}
                    </div>

                    <span style={{ color: '#4a5568', fontSize: '0.9rem' }}>
                      {/* Mostramos la fecha en formato DD/MM/AAAA */}
                      {formatearFechaArgentina(tarea.Fecha)} {tarea.Hora ? `- ${tarea.Hora}` : ''}
                    </span>
                  </div>

                  {tarea['Descripción'] && (
                    <div style={{ marginTop: '8px', color: '#4a5568', fontSize: '0.9rem' }}>
                      {tarea['Descripción'].substring(0, 100)}
                      {tarea['Descripción'].length > 100 && '...'}
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
