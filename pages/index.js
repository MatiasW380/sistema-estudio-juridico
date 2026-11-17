import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  AlertTriangle, ArrowRight, CalendarClock, CalendarDays, Clock, FolderOpen, Info, Plus, RefreshCw, Trash2, Wallet, X,
} from 'lucide-react';
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

    // Por cobrar según el mes de vencimiento (o la fecha del movimiento si no
    // tiene vencimiento cargado): este mes, el próximo y lo atrasado.
    const claveMes = (d) => d.getFullYear() * 12 + d.getMonth();
    const mesActual = claveMes(hoy);
    let porCobrarMes = 0;
    let porCobrarProximo = 0;
    let porCobrarAtrasado = 0;

    (finanzas || []).forEach((f) => {
      const total = parseFloat(f.Monto_Total) || 0;
      const pagado = parseFloat(f.Monto_Pagado) || 0;
      totalAcordado += total;
      totalPagado += pagado;
      totalPendiente += total - pagado;

      const pendiente = total - pagado;
      if (f.Estado === 'Pagado' || pendiente <= 0) return;
      const iso = parsearFechaArgentina(f.Fecha_Vencimiento || f.Fecha);
      const [a, m] = String(iso).split('-').map((x) => parseInt(x, 10));
      if (!a || !m) return;
      const mes = a * 12 + (m - 1);
      if (mes < mesActual) porCobrarAtrasado += pendiente;
      else if (mes === mesActual) porCobrarMes += pendiente;
      else if (mes === mesActual + 1) porCobrarProximo += pendiente;
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
        porCobrarMes,
        porCobrarProximo,
        porCobrarAtrasado,
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
        porCobrarMes: 0,
        porCobrarProximo: 0,
        porCobrarAtrasado: 0,
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
  porCobrarMes = 0,
  porCobrarProximo = 0,
  porCobrarAtrasado = 0,
}) {
  const [tareas_state] = useState(tareasUrgentes || []);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [movimientosSAC, setMovimientosSAC] = useState([]);
  const [cedulasSAC, setCedulasSAC] = useState([]);
  const [cargandoSAC, setCargandoSAC] = useState(true);
  const [errorSAC, setErrorSAC] = useState('');
  const [noCargadosSAC, setNoCargadosSAC] = useState(0);
  const [cedulasNoCargadasSAC, setCedulasNoCargadasSAC] = useState(0);
  const [listaCedulasNoCargadas, setListaCedulasNoCargadas] = useState([]);
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

  // Movimientos del SAC (últimos 3 días), solo de expedientes que ya
  // existen en LexHub. Se consulta cada vez que se entra al dashboard,
  // sin bloquear el resto de la página.
  useEffect(() => {
    if (!usuarioEmail) return;
    fetch('/api/sac/movimientos-dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: usuarioEmail })
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setMovimientosSAC(data.movimientos || []);
          setCedulasSAC(data.cedulas || []);
          setNoCargadosSAC(data.noCargados || 0);
          setCedulasNoCargadasSAC(data.cedulasNoCargadas || 0);
          setListaCedulasNoCargadas(data.listaCedulasNoCargadas || []);
        } else {
          setErrorSAC(data.mensaje || 'No se pudo consultar el SAC');
        }
      })
      .catch(() => setErrorSAC('No se pudo consultar el SAC'))
      .finally(() => setCargandoSAC(false));
  }, [usuarioEmail]);

  const colorMovimientoSAC = { rojo: '#d92d20', amarillo: '#dc6803', verde: '#079455' };

  // Agregar plazo manual a partir de una cédula (sin cálculo automático de
  // días hábiles: el usuario indica la fecha de vencimiento).
  const [plazoAbiertoKey, setPlazoAbiertoKey] = useState(null);
  const [fechaPlazo, setFechaPlazo] = useState('');
  const [guardandoPlazo, setGuardandoPlazo] = useState(false);
  const [mensajePlazo, setMensajePlazo] = useState('');

  const handleGuardarPlazo = async (c) => {
    if (!fechaPlazo) return;
    setGuardandoPlazo(true);
    setMensajePlazo('');
    try {
      const response = await fetch('/api/sac/agregar-plazo-cedula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeroSAC: c.numeroSAC,
          descripcion: `${c.tipoOperacion} (cédula del ${c.fecha})`,
          fechaVencimiento: fechaPlazo,
          creadoPor: usuarioEmail,
        })
      });
      const data = await response.json();
      if (data.success) {
        setMensajePlazo('✅ Plazo agregado a la Agenda');
        setTimeout(() => { setPlazoAbiertoKey(null); setFechaPlazo(''); setMensajePlazo(''); }, 1500);
      } else {
        setMensajePlazo('❌ ' + (data.error || 'No se pudo guardar'));
      }
    } catch (error) {
      setMensajePlazo('❌ Error: ' + error.message);
    } finally {
      setGuardandoPlazo(false);
    }
  };

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
          tipo: tareaSeleccionada.Tipo || 'Otro',
          titulo: tareaSeleccionada.Titulo,
          descripcion: tareaSeleccionada.Descripcion || '',
          fecha: tareaSeleccionada.Fecha,
          hora: tareaSeleccionada.Hora || '',
          horaFin: tareaSeleccionada.Hora_Fin || '',
          lugar: tareaSeleccionada.Lugar || '',
          estado: tareaSeleccionada.Estado || 'Pendiente',
          numeroSAC: tareaSeleccionada.Numero_SAC || '',
          cliente: tareaSeleccionada.Cliente || '',
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

  const hoyRef = new Date();
  hoyRef.setHours(0, 0, 0, 0);
  const proximos = tareas_state.filter((t) => {
    const f = getFechaLocalObj(t.Fecha);
    return f && f >= hoyRef;
  }).length;
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buen día' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
  const fechaLarga = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  const pesos = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
  const tinte = (hex) => ({ color: hex, backgroundColor: `${hex}14`, borderColor: `${hex}33` });
  const nombreMes = (offset) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + offset);
    const n = d.toLocaleDateString('es-AR', { month: 'long' });
    return n.charAt(0).toUpperCase() + n.slice(1);
  };
  const etiquetaDias = (d) => (d === 0 ? 'Hoy' : d === 1 ? '1 día' : `${d} días`);

  const tiposColumna = [
    { id: 'ENTREVISTA', label: 'Entrevistas' },
    { id: 'PLAZO', label: 'Plazos' },
    { id: 'AUDIENCIA', label: 'Audiencias' },
    { id: 'TAREAS', label: 'Tareas' },
    { id: 'VENCIDOS', label: 'Vencidos' },
  ];
  const columnasConDatos = tiposColumna
    .map(({ id, label }) => {
      const tareasColumna = tareas_state.filter((t) => {
        const tipo = (t.Tipo || 'OTRO').toUpperCase();
        const fecha = getFechaLocalObj(t.Fecha);
        const esVencido = fecha && fecha < hoyRef;
        if (id === 'VENCIDOS') return esVencido;
        if (id === 'TAREAS') return !esVencido && (tipo === 'OTRO' || tipo === 'TAREAS');
        return !esVencido && tipo === id;
      });
      return { id, label, tareasColumna };
    })
    .filter((c) => c.tareasColumna.length > 0);

  const campo = (label, input) => (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label>{label}</label>
      {input}
    </div>
  );

  const ItemSAC = ({ item, extra, onClick }) => (
    <div className="dash-row" onClick={onClick}>
      <span className="dash-row-bar" style={{ backgroundColor: colorMovimientoSAC[item.color] }} />
      <div className="dash-row-main">
        <div className="dash-row-title">
          <span className="dash-row-num">{item.numeroSAC}</span>
          <span className="dash-row-car">{item.caratula}</span>
        </div>
        <div className="dash-row-sub">{item.tipoOperacion} · {item.fecha}</div>
      </div>
      {extra}
      <span className="dash-badge" style={tinte(colorMovimientoSAC[item.color])}>{etiquetaDias(item.dias)}</span>
    </div>
  );

  const estadoSAC = (vacio) =>
    cargandoSAC ? (
      <div className="dash-empty"><RefreshCw size={16} className="lx-spin" /> Consultando el SAC…</div>
    ) : errorSAC ? (
      <div className="dash-empty dash-empty-warn"><AlertTriangle size={16} /> {errorSAC}</div>
    ) : (
      <div className="dash-empty">{vacio}</div>
    );

  return (
    <div className="container dash-page">
      {/* Modal de edición de tarea */}
      {mostrarModal && tareaSeleccionada && (
        <div className="lx-modal-overlay" onClick={() => { setMostrarModal(false); setMensaje(''); }}>
          <div className="lx-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lx-modal-head">
              <h2>{tareaSeleccionada.Titulo || 'Tarea'}</h2>
              <button type="button" className="lx-icon-btn" onClick={() => { setMostrarModal(false); setMensaje(''); }} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditar}>
              <div className="lx-modal-grid">
                {campo('Tipo',
                  <select value={tareaSeleccionada.Tipo || 'Otro'} onChange={(e) => setTareaSeleccionada({ ...tareaSeleccionada, Tipo: e.target.value })}>
                    <option value="Entrevista">Entrevista</option>
                    <option value="Plazo">Plazo</option>
                    <option value="Audiencia">Audiencia</option>
                    <option value="Pericia">Pericia</option>
                    <option value="Otro">Otro</option>
                  </select>)}
                {campo('Fecha',
                  <input type="date" value={parsearFechaArgentina(tareaSeleccionada.Fecha) || ''} onChange={(e) => setTareaSeleccionada({ ...tareaSeleccionada, Fecha: e.target.value })} />)}
                {campo('Hora',
                  <input type="time" value={tareaSeleccionada.Hora || ''} onChange={(e) => setTareaSeleccionada({ ...tareaSeleccionada, Hora: e.target.value })} />)}
                {campo('Estado',
                  <select value={tareaSeleccionada.Estado || 'Pendiente'} onChange={(e) => setTareaSeleccionada({ ...tareaSeleccionada, Estado: e.target.value })}>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Completado">Completado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>)}
                {campo('N° SAC',
                  <input type="text" value={tareaSeleccionada.Numero_SAC || ''} placeholder="Ej: 123456" onChange={(e) => setTareaSeleccionada({ ...tareaSeleccionada, Numero_SAC: e.target.value })} />)}
                {campo('Cliente',
                  <input type="text" value={tareaSeleccionada.Cliente || ''} placeholder="Nombre del cliente" onChange={(e) => setTareaSeleccionada({ ...tareaSeleccionada, Cliente: e.target.value })} />)}
              </div>
              <div className="lx-modal-stack">
                {campo('Título',
                  <input type="text" value={tareaSeleccionada.Titulo || ''} onChange={(e) => setTareaSeleccionada({ ...tareaSeleccionada, Titulo: e.target.value })} />)}
                {campo('Descripción',
                  <textarea className="textarea-sm" value={tareaSeleccionada.Descripcion || ''} onChange={(e) => setTareaSeleccionada({ ...tareaSeleccionada, Descripcion: e.target.value })} />)}
                {campo('Lugar',
                  <input type="text" value={tareaSeleccionada.Lugar || ''} onChange={(e) => setTareaSeleccionada({ ...tareaSeleccionada, Lugar: e.target.value })} />)}
              </div>

              {mensaje && (
                <div className={`alert ${mensaje.includes('✅') ? 'alert-success' : 'alert-urgent'}`} style={{ marginTop: '16px', marginBottom: 0 }}>
                  {mensaje}
                </div>
              )}

              <div className="lx-modal-actions">
                <button type="button" className="button button-ghost button-sm lx-text-danger" onClick={handleEliminar}>
                  <Trash2 size={15} /> Eliminar
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {tareaSeleccionada?.Numero_SAC && (
                    <button type="button" className="button button-secondary button-sm" onClick={() => router.push(`/expediente/${encodeURIComponent(tareaSeleccionada.Numero_SAC)}`)}>
                      Ir al expediente <ArrowRight size={15} />
                    </button>
                  )}
                  <button type="submit" className="button button-sm" disabled={cargando}>
                    {cargando ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className="dash-head">
        <div>
          <h1 className="dash-title">{saludo}</h1>
          <p className="dash-sub">{fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1)}</p>
        </div>
        <div className="dash-head-actions">
          <button className="button button-secondary button-sm" onClick={() => router.push('/agenda')}>
            <CalendarDays size={15} /> Agenda
          </button>
          <button className="button button-sm" onClick={() => router.push('/clientes/nuevo')}>
            <Plus size={15} /> Nuevo cliente
          </button>
        </div>
      </div>

      {/* Indicadores */}
      <div className="dash-kpis">
        <div className="dash-kpi" onClick={() => router.push('/expedientes')}>
          <div className="dash-kpi-label"><FolderOpen size={15} /> Expedientes</div>
          <div className="dash-kpi-value">{expedientesAbiertos}</div>
        </div>
        <div className="dash-kpi" onClick={() => router.push('/agenda')}>
          <div className="dash-kpi-label"><CalendarClock size={15} /> Próximos 5 días</div>
          <div className="dash-kpi-value">{proximos}</div>
        </div>
        <div className={`dash-kpi${plazosvencidos > 0 ? ' is-alert' : ''}`} onClick={() => router.push('/agenda')}>
          <div className="dash-kpi-label"><AlertTriangle size={15} /> Vencidos</div>
          <div className="dash-kpi-value">{plazosvencidos}</div>
        </div>
        <div className="dash-kpi" onClick={() => router.push('/honorarios')}>
          <div className="dash-kpi-label"><Wallet size={15} /> Por cobrar</div>
          <div className="dash-kpi-split">
            <div>
              <div className="dash-kpi-sub">{nombreMes(0)}</div>
              <div className="dash-kpi-value dash-kpi-value-sm">{pesos(porCobrarMes)}</div>
            </div>
            <div>
              <div className="dash-kpi-sub">{nombreMes(1)}</div>
              <div className="dash-kpi-value dash-kpi-value-sm">{pesos(porCobrarProximo)}</div>
            </div>
          </div>
          {porCobrarAtrasado > 0 && <div className="dash-kpi-note">+ {pesos(porCobrarAtrasado)} atrasado</div>}
        </div>
      </div>

      {/* Agenda: próximos 5 días por tipo */}
      <div className="lx-card dash-card">
        <div className="dash-card-head">
          <h2>Próximos 5 días</h2>
          <button className="button button-ghost button-sm" onClick={() => router.push('/agenda')}>
            Ver agenda <ArrowRight size={15} />
          </button>
        </div>
        {tareas_state.length === 0 ? (
          <div className="dash-empty">No hay plazos ni eventos en los próximos 5 días.</div>
        ) : (
          <div className="dash-cols" style={{ gridTemplateColumns: `repeat(${columnasConDatos.length}, minmax(0, 1fr))` }}>
            {columnasConDatos.map(({ id, label, tareasColumna }) => (
              <div key={id}>
                <div className={`dash-col-head${id === 'VENCIDOS' ? ' is-alert' : ''}`}>
                  {label}
                  <span className="lx-tab-count">{tareasColumna.length}</span>
                </div>
                <div className="dash-col-list">
                  {tareasColumna.map((tarea, index) => (
                    <div key={`${tarea.ID || 'tarea'}-${index}`} className="dash-task" onClick={() => handleTareaClick(tarea)}>
                      <div className="dash-task-top">
                        <span className="dash-task-title">{tarea.Titulo || 'Sin título'}</span>
                        <span className="dash-badge" style={tinte(getUrgenciaColor(tarea.Fecha))}>
                          {getUrgenciaTexto(tarea.Fecha).charAt(0) + getUrgenciaTexto(tarea.Fecha).slice(1).toLowerCase()}
                        </span>
                      </div>
                      {tarea.Cliente && <div className="dash-task-sub">{tarea.Cliente}</div>}
                      {(tarea.Numero_SAC || tarea.Hora) && (
                        <div className="dash-task-meta">
                          {tarea.Hora && <span><Clock size={12} /> {tarea.Hora}</span>}
                          {tarea.Numero_SAC && <span className="lx-chip">SAC {tarea.Numero_SAC}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SAC: movimientos y cédulas de los últimos 3 días */}
      <div className="dash-grid">
        <div className="lx-card dash-card">
          <div className="dash-card-head">
            <h2>Movimientos SAC <span className="lx-tab-count">{movimientosSAC.length}</span></h2>
            <span className="dash-hint">Últimos 3 días</span>
          </div>
          {movimientosSAC.length === 0 || cargandoSAC || errorSAC ? (
            estadoSAC('Sin movimientos en los últimos 3 días.')
          ) : (
            <div className="dash-list">
              {movimientosSAC.map((m) => (
                <ItemSAC key={`${m.numeroSAC}-${m.fecha}`} item={m} onClick={() => router.push(`/expediente/${encodeURIComponent(m.numeroSAC)}`)} />
              ))}
            </div>
          )}
          {!cargandoSAC && !errorSAC && noCargadosSAC > 0 && (
            <div className="dash-foot">
              <Info size={14} /> {noCargadosSAC} {noCargadosSAC === 1 ? 'expediente con novedades en el SAC no está cargado' : 'expedientes con novedades en el SAC no están cargados'} en LexHub.
            </div>
          )}
        </div>

        <div className="lx-card dash-card">
          <div className="dash-card-head">
            <h2>Cédulas SAC <span className="lx-tab-count">{cedulasSAC.length}</span></h2>
            <span className="dash-hint">Últimos 3 días</span>
          </div>
          {cedulasSAC.length === 0 || cargandoSAC || errorSAC ? (
            estadoSAC('Sin cédulas recibidas en los últimos 3 días.')
          ) : (
            <div className="dash-list">
              {cedulasSAC.map((c, i) => {
                const key = `${c.numeroSAC}-${c.fecha}-${i}`;
                return (
                  <div key={key}>
                    <ItemSAC
                      item={c}
                      onClick={() => router.push(`/expediente/${encodeURIComponent(c.numeroSAC)}`)}
                      extra={
                        <button
                          type="button"
                          className="button button-secondary button-sm dash-row-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMensajePlazo('');
                            setFechaPlazo('');
                            setPlazoAbiertoKey(plazoAbiertoKey === key ? null : key);
                          }}
                        >
                          <Plus size={14} /> Plazo
                        </button>
                      }
                    />
                    {plazoAbiertoKey === key && (
                      <div className="dash-plazo" onClick={(e) => e.stopPropagation()}>
                        <span>Vencimiento</span>
                        <input type="date" value={fechaPlazo} onChange={(e) => setFechaPlazo(e.target.value)} />
                        <button className="button button-sm" onClick={() => handleGuardarPlazo(c)} disabled={!fechaPlazo || guardandoPlazo}>
                          {guardandoPlazo ? 'Guardando…' : 'Guardar'}
                        </button>
                        {mensajePlazo && <span className="dash-plazo-msg">{mensajePlazo}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!cargandoSAC && !errorSAC && cedulasNoCargadasSAC > 0 && (
            <div className="dash-foot">
              <Info size={14} />
              <div>
                {cedulasNoCargadasSAC} {cedulasNoCargadasSAC === 1 ? 'cédula es de un expediente que no está cargado' : 'cédulas son de expedientes que no están cargados'} en LexHub.
                {listaCedulasNoCargadas.length > 0 && (
                  <details className="dash-details">
                    <summary>Ver cuáles</summary>
                    {listaCedulasNoCargadas.map((c, i) => (
                      <div key={i}>
                        <strong>{c.numeroSAC}</strong> — {c.caratula}{c.tipo ? ` · ${c.tipo}` : ''}{c.fecha ? ` · ${c.fecha}` : ''}
                      </div>
                    ))}
                  </details>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
