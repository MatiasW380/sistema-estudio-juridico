// pages/clientes/[id].js
// Ficha completa del cliente con pestañas y formulario para agregar expediente

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getClientes, formatearFechaArgentina, parsearFechaArgentina } from '../../lib/googleSheets';
import {
  ArrowLeft, ChevronDown, ChevronRight, Download, FileText, FolderOpen, MapPin, Pencil, Phone, Plus, X,
} from 'lucide-react';

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

export async function getServerSideProps(context) {
  const { id } = context.params;
  const userData = parseUserFromCookie(context.req.headers.cookie || '');

  if (!userData?.email) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  try {
    const todosLosClientes = await getClientes(userData.email);

const cliente = todosLosClientes.find(
  (c) => String(c.ID_Cliente) === String(id)
);

    if (!cliente) {
      return { notFound: true };
    }

    const expedientes = cliente.expedientes || [];

    return {
      props: { cliente, expedientes },
    };
  } catch (error) {
    console.error('Error al cargar cliente:', error);
    return { notFound: true };
  }
}

export default function FichaCliente({ cliente, expedientes }) {
  const [activeTab, setActiveTab] = useState('datos');
  const [movEditando, setMovEditando] = useState(null);
  const [guardandoMov, setGuardandoMov] = useState(false);
  const [mensajeMov, setMensajeMov] = useState('');
  const [montoPago, setMontoPago] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoExpediente, setNuevoExpediente] = useState({
    Numero_SAC: '',
    Caratula: '',
    Fuero: '',
    Juzgado: '',
  });
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [archivos, setArchivos] = useState([]);
  const [mostrarArchivos, setMostrarArchivos] = useState(false);
  const [folderIdActual, setFolderIdActual] = useState('');
  const router = useRouter();

  // ==========================================
  // ESTADOS PARA FINANZAS
  // ==========================================
  const [movimientos, setMovimientos] = useState([]);
  const [saldo, setSaldo] = useState({ totalDebe: 0, totalHaber: 0, saldo: 0 });
  const [mostrarFormularioFinanzas, setMostrarFormularioFinanzas] = useState(false);
  const [cargandoFinanzas, setCargandoFinanzas] = useState(false);
  const [mensajeFinanzas, setMensajeFinanzas] = useState('');
  const [nuevoMovimiento, setNuevoMovimiento] = useState({
    numeroSAC: '',
    fechaVencimiento: '',
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'Honorario',
    categoria: 'Honorarios',
    concepto: '',
    montoTotal: '',
    montoPagado: '',
    estado: 'Pendiente',
  });

  // ==========================================
  // ESTADOS PARA CONSULTAS
  // ==========================================
  const [consultas, setConsultas] = useState([]);
  const [expandidosConsultas, setExpandidosConsultas] = useState({});
  const [mostrarFormularioConsultas, setMostrarFormularioConsultas] = useState(false);
  const [cargandoConsultas, setCargandoConsultas] = useState(false);
  const [mensajeConsultas, setMensajeConsultas] = useState('');
  const [sessionEmail, setSessionEmail] = useState('');
  const [nuevaConsulta, setNuevaConsulta] = useState({
    fecha: new Date().toISOString().split('T')[0],
    numeroSAC: '',
    notas: '',
  });

  // ==========================================
  // OBTENER EMAIL DE SESIÓN
  // ==========================================
  useEffect(() => {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, ...rest] = cookie.trim().split('=');
      acc[key] = rest.join('=');
      return acc;
    }, {});
    if (cookies.user) {
      try {
        const userData = JSON.parse(decodeURIComponent(cookies.user));
        setSessionEmail(userData.email || '');
      } catch {}
    }
  }, []);

  // ==========================================
  // FUNCIONES PARA FINANZAS
  // ==========================================

  const cargarMovimientos = async () => {
    try {
      let todosMovimientos = [];
      for (const exp of expedientes) {
        const res = await fetch(`/api/finanzas?numeroSAC=${encodeURIComponent(exp.Numero_SAC)}`);
        const data = await res.json();
        if (data.finanzas) {
          todosMovimientos = [...todosMovimientos, ...data.finanzas];
        }
      }
      todosMovimientos.sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));
      setMovimientos(todosMovimientos);

      // Igual que en Honorarios: acordado = suma de montos totales,
      // pagado = suma de montos pagados, saldo = lo que falta cobrar.
      let totalDebe = 0;
      let totalHaber = 0;
      todosMovimientos.forEach((m) => {
        totalDebe += parseFloat(m.Monto_Total) || 0;
        totalHaber += parseFloat(m.Monto_Pagado) || 0;
      });
      setSaldo({ totalDebe, totalHaber, saldo: totalDebe - totalHaber });
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
    }
  };

  const handleChangeFinanzas = (e) => {
    const { name, value } = e.target;
    setNuevoMovimiento((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitFinanzas = async (e) => {
    e.preventDefault();
    setMensajeFinanzas('');
    setCargandoFinanzas(true);

    const exp = expedientes.find((e) => e.Numero_SAC === nuevoMovimiento.numeroSAC) || expedientes[0];
    if (!exp) {
      setMensajeFinanzas('⚠️ El cliente no tiene expedientes');
      setCargandoFinanzas(false);
      return;
    }

    if (!nuevoMovimiento.fecha || !nuevoMovimiento.tipo) {
      setMensajeFinanzas('⚠️ Fecha y Tipo son obligatorios');
      setCargandoFinanzas(false);
      return;
    }

    try {
      const response = await fetch('/api/finanzas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeroSAC: exp.Numero_SAC,
          fecha: nuevoMovimiento.fecha,
          fechaVencimiento: nuevoMovimiento.fechaVencimiento || '',
          tipo: nuevoMovimiento.tipo,
          categoria: nuevoMovimiento.categoria,
          concepto: nuevoMovimiento.concepto,
          montoTotal: nuevoMovimiento.montoTotal || '',
          montoPagado: nuevoMovimiento.montoPagado || '',
          estado: nuevoMovimiento.estado,
        }),
      });

      const resultado = await response.json();
      if (resultado.success) {
        setMensajeFinanzas('Movimiento agregado correctamente');
        setNuevoMovimiento({
          numeroSAC: '',
          fechaVencimiento: '',
          fecha: new Date().toISOString().split('T')[0],
          tipo: 'Honorario',
          categoria: 'Honorarios',
          concepto: '',
          montoTotal: '',
          montoPagado: '',
          estado: 'Pendiente',
        });
        setMostrarFormularioFinanzas(false);
        cargarMovimientos();
      } else {
        setMensajeFinanzas('Error al agregar movimiento: ' + (resultado.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error en handleSubmitFinanzas:', error);
      setMensajeFinanzas('Error: ' + error.message);
    } finally {
      setCargandoFinanzas(false);
    }
  };

  // ---------- Edición de un movimiento ----------
  const estadoSegunMontos = (total, pagado) => {
    const t = parseFloat(total) || 0;
    const p = parseFloat(pagado) || 0;
    if (t > 0 && p >= t) return 'Pagado';
    if (p > 0) return 'Parcial';
    return 'Pendiente';
  };

  // Fecha de la hoja (DD/MM/AAAA, D/M/AAAA o AAAA-MM-DD) -> AAAA-MM-DD para el campo de fecha
  const aISO = (f) => {
    const iso = parsearFechaArgentina(f);
    const [a, m, d] = String(iso || '').split('-');
    return a && m && d ? `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : '';
  };

  const abrirEdicionMovimiento = (mov) => {
    setMensajeMov('');
    setMontoPago('');
    setMovEditando({
      ID: mov.ID,
      Numero_SAC: mov.Numero_SAC,
      Fecha: aISO(mov.Fecha),
      Fecha_Vencimiento: aISO(mov.Fecha_Vencimiento),
      Tipo: mov.Tipo || 'Honorario',
      Categoria: mov.Categoria || 'Honorarios',
      Concepto: mov.Concepto || '',
      Monto_Total: mov.Monto_Total || '',
      Monto_Pagado: mov.Monto_Pagado || '',
      Estado: mov.Estado || 'Pendiente',
    });
  };

  const cambiarMov = (campo, valor) => {
    setMovEditando((prev) => {
      const nuevo = { ...prev, [campo]: valor };
      if (campo === 'Monto_Total' || campo === 'Monto_Pagado') {
        nuevo.Estado = estadoSegunMontos(nuevo.Monto_Total, nuevo.Monto_Pagado);
      }
      return nuevo;
    });
  };

  const sumarPago = () => {
    const monto = parseFloat(String(montoPago).replace(/\./g, '').replace(',', '.'));
    if (!monto || monto <= 0) return;
    const pagado = (parseFloat(movEditando.Monto_Pagado) || 0) + monto;
    cambiarMov('Monto_Pagado', String(pagado));
    setMontoPago('');
  };

  const guardarMovimiento = async (e) => {
    e.preventDefault();
    setGuardandoMov(true);
    setMensajeMov('');
    try {
      const { ID, Numero_SAC, ...campos } = movEditando;
      const response = await fetch('/api/finanzas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ID, ...campos }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'No se pudo guardar');
      setMovEditando(null);
      cargarMovimientos();
    } catch (error) {
      setMensajeMov(`❌ ${error.message}`);
    } finally {
      setGuardandoMov(false);
    }
  };

  // Abrir directamente una pestaña desde la URL (p. ej. ?tab=finanzas)
  useEffect(() => {
    const tab = router.query?.tab;
    if (tab && ['datos', 'expedientes', 'consultas', 'finanzas'].includes(tab)) setActiveTab(tab);
  }, [router.query?.tab]);

  // Cargar movimientos al entrar a la pestaña finanzas
  useEffect(() => {
    if (activeTab === 'finanzas' && expedientes.length > 0) {
      cargarMovimientos();
    }
  }, [activeTab, expedientes]);

  // ==========================================
  // FUNCIONES PARA CONSULTAS
  // ==========================================

  const cargarConsultas = async () => {
    try {
      let todasLasConsultas = [];
      
      // Cargar consultas por expedientes
      for (const exp of expedientes) {
        const res = await fetch(`/api/consultas?numeroSAC=${encodeURIComponent(exp.Numero_SAC)}`);
        const data = await res.json();
        if (data.consultas) {
          todasLasConsultas = [...todasLasConsultas, ...data.consultas];
        }
      }
      
      // Cargar consultas del cliente (sin expediente)
      if (cliente?.ID_Cliente) {
        const res = await fetch(`/api/consultas?clienteId=${encodeURIComponent(cliente.ID_Cliente)}`);
        const data = await res.json();
        if (data.consultas) {
          // Agregar solo consultas que no están ya cargadas
          todasLasConsultas = [...todasLasConsultas, ...data.consultas].filter(
            (consulta, index, self) =>
              index === self.findIndex((c) => c.ID === consulta.ID)
          );
        }
      }
      
      todasLasConsultas.sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));
      setConsultas(todasLasConsultas);
    } catch (error) {
      console.error('Error al cargar consultas:', error);
    }
  };

  const handleChangeConsulta = (e) => {
    const { name, value } = e.target;
    setNuevaConsulta((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitConsulta = async (e) => {
    e.preventDefault();
    setMensajeConsultas('');
    setCargandoConsultas(true);

    if (!nuevaConsulta.notas.trim()) {
      setMensajeConsultas('⚠️ Las notas son obligatorias');
      setCargandoConsultas(false);
      return;
    }

    try {
      const response = await fetch('/api/consultas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeroSAC: nuevaConsulta.numeroSAC,
          fecha: nuevaConsulta.fecha || new Date().toISOString().split('T')[0],
          abogado: sessionEmail,
          notas: nuevaConsulta.notas,
          clienteId: cliente?.ID_Cliente || '',
        }),
      });

      const resultado = await response.json();
      if (resultado.success) {
        setMensajeConsultas('Consulta agregada correctamente');
        setNuevaConsulta({
          fecha: new Date().toISOString().split('T')[0],
          numeroSAC: '',
          notas: '',
        });
        setMostrarFormularioConsultas(false);
        cargarConsultas();
      } else {
        setMensajeConsultas('Error al agregar consulta: ' + (resultado.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error en handleSubmitConsulta:', error);
      setMensajeConsultas('Error: ' + error.message);
    } finally {
      setCargandoConsultas(false);
    }
  };

  // Cargar consultas al cambiar a la pestaña consultas
  useEffect(() => {
    if (activeTab === 'consultas') {
      cargarConsultas();
    }
  }, [activeTab, expedientes]);

  if (!cliente) {
    return (
      <div className="container">
        <h1>Cliente no encontrado</h1>
        <a href="/clientes">← Volver a la lista</a>
      </div>
    );
  }

  const volver = () => {
    router.push('/clientes');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevoExpediente((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setCargando(true);

    if (!nuevoExpediente.Numero_SAC || !nuevoExpediente.Caratula) {
      setMensaje('⚠️ N° SAC y Carátula son obligatorios');
      setCargando(false);
      return;
    }

    try {
      const datos = {
        clienteId: cliente.ID_Cliente,
        nombre: cliente.Nombre_Cliente,
        telefono: cliente.Telefono || '',
        numeroSAC: nuevoExpediente.Numero_SAC,
        caratula: nuevoExpediente.Caratula,
        fuero: nuevoExpediente.Fuero || '',
        juzgado: nuevoExpediente.Juzgado || '',
        usuariosCompartidos: cliente.Usuarios_Compartidos || '',
      };

      const response = await fetch('/api/agregar-expediente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });

      const resultado = await response.json();

      if (resultado.success) {
        let mensajeExito = '✅ Expediente agregado correctamente';
        if (resultado.folderId) {
          mensajeExito += ' y carpeta creada en Drive';
        } else if (resultado.mensaje && resultado.mensaje.includes('problema con Drive')) {
          mensajeExito = '⚠️ Expediente agregado, pero hubo un problema al crear la carpeta en Drive';
        }
        setMensaje(mensajeExito);
        setNuevoExpediente({ Numero_SAC: '', Caratula: '', Fuero: '', Juzgado: '' });
        setMostrarFormulario(false);
        setTimeout(() => router.reload(), 1500);
      } else {
        setMensaje('Error al agregar el expediente: ' + (resultado.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      setMensaje('Error: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const listarArchivos = async (folderId) => {
    try {
      const response = await fetch(`/api/drive/listar?folderId=${encodeURIComponent(folderId)}`);
      if (!response.ok) {
        alert('Error al listar archivos');
        return;
      }
      const data = await response.json();
      setArchivos(data.files || []);
      setFolderIdActual(folderId);
      setMostrarArchivos(true);
    } catch (error) {
      console.error('Error al listar archivos:', error);
      alert('Error al listar archivos');
    }
  };

  const iniciales = (cliente.Nombre_Cliente || '')
    .split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('') || '?';
  const pesos = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n || 0);
  const alerta = (m) => (
    <div className={`alert ${m.includes('✅') ? 'alert-success' : 'alert-urgent'}`} style={{ marginTop: '16px', marginBottom: 0 }}>{m}</div>
  );
  const badgeEstado = (estado = 'Pendiente') =>
    estado === 'Pagado' ? 'badge-success' : estado === 'Parcial' ? 'badge-warning' : 'badge-urgent';

  const tabs = [
    { id: 'datos', label: 'Datos', count: null },
    { id: 'expedientes', label: 'Expedientes', count: expedientes.length },
    { id: 'consultas', label: 'Consultas', count: consultas.length || null },
    { id: 'finanzas', label: 'Finanzas', count: null },
  ];
  const accionTab = {
    expedientes: { label: 'Expediente', abierto: mostrarFormulario, toggle: () => { setMostrarFormulario(!mostrarFormulario); setMensaje(''); } },
    consultas: { label: 'Consulta', abierto: mostrarFormularioConsultas, toggle: () => { setMostrarFormularioConsultas(!mostrarFormularioConsultas); setMensajeConsultas(''); } },
    finanzas: { label: 'Movimiento', abierto: mostrarFormularioFinanzas, toggle: () => { setMostrarFormularioFinanzas(!mostrarFormularioFinanzas); setMensajeFinanzas(''); } },
  }[activeTab];

  const dato = (label, valor) => (
    <div className="cli-field">
      <div className="cli-field-label">{label}</div>
      <div className={`cli-field-value${valor ? '' : ' is-empty'}`}>{valor || 'No registrado'}</div>
    </div>
  );

  return (
    <div className="container exp-page">
      {/* Encabezado */}
      <div className="exp-head">
        <div className="exp-head-main">
          <div className="exp-breadcrumb">
            <button type="button" className="exp-breadcrumb-link" onClick={volver}>Clientes</button>
            <span className="exp-breadcrumb-sep">/</span>
            <span>{cliente.Nombre_Cliente}</span>
          </div>
          <div className="cli-title">
            <span className="lx-avatar cli-avatar">{iniciales}</span>
            <h1 className="exp-title" style={{ margin: 0 }}>{cliente.Nombre_Cliente}</h1>
          </div>
          <div className="exp-meta" style={{ marginTop: '12px' }}>
            {cliente.DNI && <span className="exp-meta-item"><span className="exp-meta-label">DNI</span>{cliente.DNI}</span>}
            {cliente.Telefono && <span className="exp-meta-item"><Phone size={13} style={{ color: 'var(--color-text-tertiary)' }} />{cliente.Telefono}</span>}
            {cliente.Domicilio && <span className="exp-meta-item"><MapPin size={13} style={{ color: 'var(--color-text-tertiary)' }} />{cliente.Domicilio}</span>}
          </div>
        </div>
        <div className="exp-head-actions">
          <button className="button button-secondary button-sm" onClick={volver}>
            <ArrowLeft size={15} /> Volver
          </button>
          <button className="button button-secondary button-sm" onClick={() => router.push(`/clientes/${cliente.ID_Cliente}/editar`)}>
            <Pencil size={15} /> Editar
          </button>
        </div>
      </div>

      {/* Pestañas */}
      <div className="exp-tabbar">
        <div className="lx-tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              className={`lx-tab${activeTab === t.id ? ' is-active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
              {t.count !== null && <span className="lx-tab-count">{t.count}</span>}
            </button>
          ))}
        </div>
        {accionTab && (
          <div className="exp-toolbar">
            <button className={`button button-sm${accionTab.abierto ? ' button-secondary' : ''}`} onClick={accionTab.toggle}>
              {accionTab.abierto ? <><X size={15} /> Cerrar</> : <><Plus size={15} /> {accionTab.label}</>}
            </button>
          </div>
        )}
      </div>

      {/* ---------- Datos ---------- */}
      {activeTab === 'datos' && (
        <div className="lx-card">
          <div className="cli-fields">
            {dato('Nombre', cliente.Nombre_Cliente)}
            {dato('DNI', cliente.DNI)}
            {dato('Teléfono', cliente.Telefono)}
            {dato('Domicilio', cliente.Domicilio)}
            {dato('Compartido con', cliente.Usuarios_Compartidos)}
            <div className="cli-field">
              <div className="cli-field-label">Carpeta de Drive</div>
              <div className={`cli-field-value${cliente.ID_Carpeta_Drive ? '' : ' is-empty'}`}>
                {cliente.ID_Carpeta_Drive ? (
                  <a href={`https://drive.google.com/drive/folders/${cliente.ID_Carpeta_Drive}`} target="_blank" rel="noopener noreferrer" className="act-link">
                    <FolderOpen size={14} /> Abrir carpeta
                  </a>
                ) : 'No asignada'}
              </div>
            </div>
            {dato('N.º de cliente', cliente.ID_Cliente)}
          </div>
        </div>
      )}

      {/* ---------- Expedientes ---------- */}
      {activeTab === 'expedientes' && (
        <div>
          {mostrarFormulario && (
            <div className="lx-card exp-form">
              <h3 className="lx-card-title">Nuevo expediente</h3>
              <form onSubmit={handleSubmit}>
                <div className="exp-form-grid">
                  <div>
                    <label>N.º SAC *</label>
                    <input type="text" name="Numero_SAC" value={nuevoExpediente.Numero_SAC} onChange={handleChange} placeholder="Ej: 123456" required />
                  </div>
                  <div>
                    <label>Carátula *</label>
                    <input type="text" name="Caratula" value={nuevoExpediente.Caratula} onChange={handleChange} placeholder="Ej: Lopez c/ Molina" required />
                  </div>
                  <div>
                    <label>Fuero</label>
                    <input type="text" name="Fuero" value={nuevoExpediente.Fuero} onChange={handleChange} placeholder="Ej: Civil, Laboral, Familia" />
                  </div>
                  <div>
                    <label>Juzgado</label>
                    <input type="text" name="Juzgado" value={nuevoExpediente.Juzgado} onChange={handleChange} placeholder="Ej: Juzgado de Familia de 3° Nominación" />
                  </div>
                </div>
                {mensaje && alerta(mensaje)}
                <div className="exp-form-actions">
                  <button type="submit" className="button button-sm" disabled={cargando}>
                    {cargando ? 'Guardando…' : 'Guardar expediente'}
                  </button>
                  <button type="button" className="button button-secondary button-sm" onClick={() => { setMostrarFormulario(false); setMensaje(''); }}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {expedientes.length === 0 ? (
            <div className="lx-empty">Este cliente no tiene expedientes cargados.</div>
          ) : (
            <div className="lx-table-wrap">
              {expedientes.map((exp, index) => (
                <div key={index} className="cli-exp">
                  <div className="cli-exp-row" onClick={() => router.push(`/expediente/${encodeURIComponent(exp.Numero_SAC)}`)}>
                    <span className="lx-cell-num cli-exp-num">{exp.Numero_SAC || '—'}</span>
                    <div className="cli-exp-main">
                      <div className="lx-cell-strong lx-cell-clamp">{exp.Caratula || 'Sin carátula'}</div>
                      <div className="lx-cell-sub">{[exp.Fuero, exp.Juzgado].filter(Boolean).join(' · ') || 'Sin juzgado registrado'}</div>
                    </div>
                    {exp.ID_Carpeta_Drive && (
                      <button
                        type="button"
                        className="button button-secondary button-sm"
                        onClick={(e) => { e.stopPropagation(); listarArchivos(exp.ID_Carpeta_Drive); }}
                      >
                        <FolderOpen size={15} /> Archivos
                      </button>
                    )}
                    <ChevronRight size={16} className="lx-row-chevron" />
                  </div>

                  {mostrarArchivos && folderIdActual === exp.ID_Carpeta_Drive && archivos.length > 0 && (
                    <div className="cli-files">
                      <div className="cli-files-head">
                        <span>Archivos en la carpeta</span>
                        <button type="button" className="lx-icon-btn" aria-label="Cerrar" onClick={() => { setMostrarArchivos(false); setArchivos([]); setFolderIdActual(''); }}>
                          <X size={15} />
                        </button>
                      </div>
                      {archivos.map((file) => (
                        <div key={file.id} className="cli-file">
                          <FileText size={15} />
                          <span className="cli-file-name">{file.name}</span>
                          <a href={`/api/drive/descargar?fileId=${encodeURIComponent(file.id)}`} target="_blank" rel="noopener noreferrer" className="act-link">
                            <Download size={14} /> Descargar
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- Consultas ---------- */}
      {activeTab === 'consultas' && (
        <div>
          {mostrarFormularioConsultas && (
            <div className="lx-card exp-form">
              <h3 className="lx-card-title">Nueva consulta</h3>
              <form onSubmit={handleSubmitConsulta}>
                <div className="exp-form-grid">
                  <div>
                    <label>Fecha</label>
                    <input type="date" name="fecha" value={nuevaConsulta.fecha} onChange={handleChangeConsulta} />
                  </div>
                  <div>
                    <label>Expediente</label>
                    <select name="numeroSAC" value={nuevaConsulta.numeroSAC} onChange={handleChangeConsulta}>
                      <option value="">Sin expediente</option>
                      {expedientes.map((exp, idx) => (
                        <option key={idx} value={exp.Numero_SAC}>{exp.Numero_SAC} - {exp.Caratula}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <label>Notas de la consulta *</label>
                  <textarea
                    name="notas"
                    value={nuevaConsulta.notas}
                    onChange={handleChangeConsulta}
                    placeholder="Escribí lo que hablaste con el cliente y tu estrategia…"
                    required
                  />
                </div>
                {mensajeConsultas && alerta(mensajeConsultas)}
                <div className="exp-form-actions">
                  <button type="submit" className="button button-sm" disabled={cargandoConsultas}>
                    {cargandoConsultas ? 'Guardando…' : 'Guardar consulta'}
                  </button>
                  <button type="button" className="button button-secondary button-sm" onClick={() => { setMostrarFormularioConsultas(false); setMensajeConsultas(''); }}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {consultas.length === 0 ? (
            <div className="lx-empty">No hay consultas registradas para este cliente.</div>
          ) : (
            <div className="exp-feed">
              {consultas.map((consulta, index) => {
                const estaExpandida = expandidosConsultas[index] || false;
                const textoConsulta = consulta.Notas_Consulta || consulta.Notas || '';
                const tieneMas = textoConsulta.length > 220;
                return (
                  <div
                    key={index}
                    className="act-card"
                    style={{ '--act-bg': '#ffffff', '--act-bg-hover': '#f9fafb', '--act-border': 'var(--color-border-light)', '--act-accent': 'var(--color-cobalt)' }}
                    onClick={() => setExpandidosConsultas((prev) => ({ ...prev, [index]: !prev[index] }))}
                  >
                    <div className="act-head">
                      <div className="act-head-main">
                        <span className="act-title">{formatearFechaArgentina(consulta.Fecha) || 'Sin fecha'}</span>
                        {consulta.Numero_SAC && <span className="lx-chip">SAC {consulta.Numero_SAC}</span>}
                        {(consulta.Abogado_Atendio || consulta.Abogado) && (
                          <span className="act-date">{consulta.Abogado_Atendio || consulta.Abogado}</span>
                        )}
                      </div>
                      {tieneMas && (
                        <ChevronDown size={16} style={{ color: 'var(--color-text-tertiary)', transform: estaExpandida ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                      )}
                    </div>
                    {estaExpandida ? (
                      <div className="act-full" onClick={(e) => e.stopPropagation()}>{textoConsulta}</div>
                    ) : (
                      <div className="act-body">
                        {textoConsulta || <em className="act-empty">Sin notas</em>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------- Finanzas ---------- */}
      {activeTab === 'finanzas' && (
        <div>
          <div className="dash-kpis" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <div className="dash-kpi" style={{ cursor: 'default' }}>
              <div className="dash-kpi-label">Total acordado</div>
              <div className="dash-kpi-value">{pesos(saldo.totalDebe)}</div>
            </div>
            <div className="dash-kpi" style={{ cursor: 'default' }}>
              <div className="dash-kpi-label">Total pagado</div>
              <div className="dash-kpi-value">{pesos(saldo.totalHaber)}</div>
            </div>
            <div className={`dash-kpi${saldo.saldo > 0 ? ' is-alert' : ''}`} style={{ cursor: 'default' }}>
              <div className="dash-kpi-label">Saldo</div>
              <div className="dash-kpi-value" style={saldo.saldo > 0 ? undefined : { color: '#079455' }}>{pesos(saldo.saldo)}</div>
            </div>
          </div>

          {mostrarFormularioFinanzas && (
            <div className="lx-card exp-form">
              <h3 className="lx-card-title">Nuevo movimiento</h3>
              <form onSubmit={handleSubmitFinanzas}>
                <div className="exp-form-grid">
                  {expedientes.length > 1 && (
                    <div>
                      <label>Expediente</label>
                      <select name="numeroSAC" value={nuevoMovimiento.numeroSAC} onChange={handleChangeFinanzas}>
                        {expedientes.map((exp) => (
                          <option key={exp.Numero_SAC} value={exp.Numero_SAC}>{exp.Numero_SAC} - {exp.Caratula}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label>Fecha *</label>
                    <input type="date" name="fecha" value={nuevoMovimiento.fecha} onChange={handleChangeFinanzas} required />
                  </div>
                  <div>
                    <label>Vence el</label>
                    <input type="date" name="fechaVencimiento" value={nuevoMovimiento.fechaVencimiento} onChange={handleChangeFinanzas} />
                  </div>
                  <div>
                    <label>Categoría</label>
                    <select name="categoria" value={nuevoMovimiento.categoria} onChange={handleChangeFinanzas}>
                      <option value="Honorarios">Honorarios</option>
                      <option value="Caja_Abogados">Caja de Abogados</option>
                      <option value="Colegio_Abogados">Colegio de Abogados</option>
                    </select>
                  </div>
                  <div>
                    <label>Tipo *</label>
                    <select name="tipo" value={nuevoMovimiento.tipo} onChange={handleChangeFinanzas} required>
                      <option value="Honorario">Honorario</option>
                      <option value="Cuota">Cuota</option>
                      <option value="Pago">Pago</option>
                      <option value="Aporte">Aporte</option>
                    </select>
                  </div>
                  <div>
                    <label>Estado</label>
                    <select name="estado" value={nuevoMovimiento.estado} onChange={handleChangeFinanzas}>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Pagado">Pagado</option>
                      <option value="Parcial">Parcial</option>
                    </select>
                  </div>
                  <div>
                    <label>Monto total</label>
                    <input type="number" step="0.01" name="montoTotal" value={nuevoMovimiento.montoTotal} onChange={handleChangeFinanzas} placeholder="0,00" />
                  </div>
                  <div>
                    <label>Monto pagado</label>
                    <input type="number" step="0.01" name="montoPagado" value={nuevoMovimiento.montoPagado} onChange={handleChangeFinanzas} placeholder="0,00" />
                  </div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <label>Concepto</label>
                  <textarea className="textarea-sm" name="concepto" value={nuevoMovimiento.concepto} onChange={handleChangeFinanzas} placeholder="Descripción del movimiento…" />
                </div>
                {mensajeFinanzas && alerta(mensajeFinanzas)}
                <div className="exp-form-actions">
                  <button type="submit" className="button button-sm" disabled={cargandoFinanzas}>
                    {cargandoFinanzas ? 'Guardando…' : 'Guardar movimiento'}
                  </button>
                  <button type="button" className="button button-secondary button-sm" onClick={() => { setMostrarFormularioFinanzas(false); setMensajeFinanzas(''); }}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}


          {movEditando && (
            <div className="lx-modal-overlay" onClick={() => setMovEditando(null)}>
              <div className="lx-modal" onClick={(e) => e.stopPropagation()}>
                <div className="lx-modal-head">
                  <h2>Modificar movimiento</h2>
                  <button type="button" className="lx-icon-btn" onClick={() => setMovEditando(null)} aria-label="Cerrar"><X size={18} /></button>
                </div>
                <form onSubmit={guardarMovimiento}>
                  <div className="fin-pago">
                    <div>
                      <div className="fin-pago-label">Registrar un pago</div>
                      <div className="fin-pago-help">Se suma a lo ya pagado y el estado se actualiza solo.</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="number"
                        step="0.01"
                        value={montoPago}
                        onChange={(e) => setMontoPago(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sumarPago(); } }}
                        placeholder="Monto"
                        style={{ width: '150px' }}
                      />
                      <button type="button" className="button button-secondary button-sm" onClick={sumarPago} disabled={!montoPago}>
                        <Plus size={14} /> Sumar
                      </button>
                    </div>
                  </div>
                  <div className="lx-modal-grid">
                    <div><label>Fecha</label><input type="date" value={movEditando.Fecha} onChange={(e) => cambiarMov('Fecha', e.target.value)} /></div>
                    <div><label>Vence el</label><input type="date" value={movEditando.Fecha_Vencimiento} onChange={(e) => cambiarMov('Fecha_Vencimiento', e.target.value)} /></div>
                    <div>
                      <label>Categoría</label>
                      <select value={movEditando.Categoria} onChange={(e) => cambiarMov('Categoria', e.target.value)}>
                        <option value="Honorarios">Honorarios</option>
                        <option value="Caja_Abogados">Caja de Abogados</option>
                        <option value="Colegio_Abogados">Colegio de Abogados</option>
                      </select>
                    </div>
                    <div>
                      <label>Tipo</label>
                      <select value={movEditando.Tipo} onChange={(e) => cambiarMov('Tipo', e.target.value)}>
                        <option value="Honorario">Honorario</option>
                        <option value="Cuota">Cuota</option>
                        <option value="Pago">Pago</option>
                        <option value="Aporte">Aporte</option>
                      </select>
                    </div>
                    <div><label>Monto total</label><input type="number" step="0.01" value={movEditando.Monto_Total} onChange={(e) => cambiarMov('Monto_Total', e.target.value)} placeholder="0" /></div>
                    <div><label>Monto pagado</label><input type="number" step="0.01" value={movEditando.Monto_Pagado} onChange={(e) => cambiarMov('Monto_Pagado', e.target.value)} placeholder="0" /></div>
                    <div>
                      <label>Estado</label>
                      <select value={movEditando.Estado} onChange={(e) => cambiarMov('Estado', e.target.value)}>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Parcial">Parcial</option>
                        <option value="Pagado">Pagado</option>
                      </select>
                    </div>
                    <div>
                      <label>Falta cobrar</label>
                      <div className="fin-falta">{pesos(Math.max((parseFloat(movEditando.Monto_Total) || 0) - (parseFloat(movEditando.Monto_Pagado) || 0), 0))}</div>
                    </div>
                  </div>
                  <div className="lx-modal-stack">
                    <div><label>Concepto</label><input type="text" value={movEditando.Concepto} onChange={(e) => cambiarMov('Concepto', e.target.value)} placeholder="Ej: 2.ª cuota de honorarios" /></div>
                  </div>
                  {mensajeMov && <div className="alert alert-urgent" style={{ marginTop: '16px', marginBottom: 0 }}>{mensajeMov}</div>}
                  <div className="lx-modal-actions">
                    <span className="dash-hint">Expediente {movEditando.Numero_SAC}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="button button-secondary button-sm" onClick={() => setMovEditando(null)}>Cancelar</button>
                      <button type="submit" className="button button-sm" disabled={guardandoMov}>{guardandoMov ? 'Guardando…' : 'Guardar cambios'}</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
          <h2 className="exp-feed-title" style={{ margin: '8px 0 12px' }}>Movimientos</h2>
          {movimientos.length === 0 ? (
            <div className="lx-empty">No hay movimientos registrados para este cliente.</div>
          ) : (
            <div className="lx-table-wrap">
              <table className="lx-table cli-mov">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Categoría</th>
                    <th>Tipo</th>
                    <th>Concepto</th>
                    <th className="numeric">Total</th>
                    <th className="numeric">Pagado</th>
                    <th>Estado</th>
                    <th aria-label="Editar" />
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((mov, index) => (
                    <tr key={index} className="is-clickable" onClick={() => abrirEdicionMovimiento(mov)} title="Clic para modificar este movimiento">
                      <td className="lx-cell-muted" style={{ whiteSpace: 'nowrap' }}>{formatearFechaArgentina(mov.Fecha) || ''}</td>
                      <td>{(mov.Categoria || '').replace(/_/g, ' ')}</td>
                      <td>{mov.Tipo || ''}</td>
                      <td className="lx-cell-muted">{mov.Concepto || ''}</td>
                      <td className="numeric">{pesos(parseFloat(mov.Monto_Total) || 0)}</td>
                      <td className="numeric">{pesos(parseFloat(mov.Monto_Pagado) || 0)}</td>
                      <td><span className={`badge ${badgeEstado(mov.Estado)}`}>{mov.Estado || 'Pendiente'}</span></td>
                      <td className="lx-cell-actions"><Pencil size={14} className="lx-row-chevron" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
