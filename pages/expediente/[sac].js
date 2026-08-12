// pages/expediente/[sac].js
// Página de detalle de un expediente con actuaciones, plazos y herramientas IA

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getActuaciones, getClientes, formatearFechaArgentina, parsearFechaArgentina } from '../../lib/googleSheets';
import EditorTexto from '../../components/EditorTexto';

// Helper para obtener la fecha de hoy en formato YYYY-MM-DD (para inputs type=date) sin desfase UTC
const getFechaHoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Helper para comparar fechas devolviendo un objeto Date local sin desfase UTC
const getFechaObj = (fechaStr) => {
  if (!fechaStr) return new Date(0);
  const isoStr = parsearFechaArgentina(fechaStr); // Devuelve YYYY-MM-DD
  if (typeof isoStr !== 'string' || !isoStr.includes('-')) return new Date(0);
  const partes = isoStr.split('-');
  if (partes.length === 3) {
    // new Date(año, mes, dia) respeta la hora local y evita el desfase UTC
    return new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
  }
  return new Date(0);
};

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
  const { sac } = context.params;
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
    const clientes = await getClientes(userData.email);
    let expediente = null;
    let cliente = null;

    for (const c of clientes) {
      const exp = c.expedientes?.find(e => e.Numero_SAC === sac);
      if (exp) {
        expediente = {
          ...exp,
          Usuarios_Compartidos: exp.Usuarios_Compartidos || '',
        };
        cliente = c;
        break;
      }
    }

    if (!expediente) {
      return { notFound: true };
    }

    const actuaciones = await getActuaciones(sac);

    return {
      props: {
        sac,
        expediente,
        cliente: {
          ID_Cliente: cliente.ID_Cliente,
          Nombre_Cliente: cliente.Nombre_Cliente,
        },
        actuaciones: actuaciones || [],
      },
    };
  } catch (error) {
    console.error('Error al cargar expediente:', error);
    return { notFound: true };
  }
}

// Componente PlazoCard
const PlazoCard = ({ plazo, onClick, vencido, completado }) => {
  const getColor = () => {
    if (completado) return '#38a169';
    if (vencido) return '#e53e3e';
    const hoy = new Date();
    const fechaPlazo = getFechaObj(plazo.Fecha);
    const diff = Math.ceil((fechaPlazo - hoy) / (1000 * 60 * 60 * 24));
    if (diff <= 3) return '#ed8936';
    return '#3182ce';
  };

  return (
    <div
      style={{
        border: `1px solid ${getColor()}`,
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '10px',
        backgroundColor: vencido ? '#fff5f5' : completado ? '#f0fff4' : '#f7fafc',
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
      onClick={onClick}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#edf2f7'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = vencido ? '#fff5f5' : completado ? '#f0fff4' : '#f7fafc'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{plazo.Titulo || 'Sin título'}</strong>
          <span style={{ marginLeft: '10px', color: '#4a5568' }}>
            {plazo.Tipo || 'Otro'}
          </span>
          {plazo.Estado === 'Completado' && (
            <span style={{ marginLeft: '10px', backgroundColor: '#38a169', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem' }}>
              Completado
            </span>
          )}
          {vencido && (
            <span style={{ marginLeft: '10px', backgroundColor: '#e53e3e', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem' }}>
              Vencido
            </span>
          )}
        </div>
        <span style={{ color: '#4a5568' }}>
          {formatearFechaArgentina(plazo.Fecha)} {plazo.Hora ? `- ${plazo.Hora}` : ''}
        </span>
      </div>
      {plazo.Descripcion && (
        <div style={{ marginTop: '8px', color: '#4a5568', fontSize: '0.9rem' }}>
          {plazo.Descripcion}
        </div>
      )}
    </div>
  );
};

export default function ExpedientePage({ sac, expediente, cliente, actuaciones: actuacionesIniciales }) {
  const [actuaciones, setActuaciones] = useState(actuacionesIniciales || []);
  const [activeTab, setActiveTab] = useState('actuaciones');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [expandidos, setExpandidos] = useState({});
  const [editando, setEditando] = useState(null);
  const [sessionEmail, setSessionEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  // Estados para IA
  const [mostrarMenuIA, setMostrarMenuIA] = useState(false);
  const [mostrarIA, setMostrarIA] = useState(false);
  const [accionIA, setAccionIA] = useState('');
  const [resultadoIA, setResultadoIA] = useState('');
  const [editandoIA, setEditandoIA] = useState(false);
  const [cargandoIA, setCargandoIA] = useState(false);
  const [editorIA, setEditorIA] = useState('');
  const [sentencias, setSentencias] = useState([]);
  const [mostrarSeleccionSentencia, setMostrarSeleccionSentencia] = useState(false);
  const [guardarAnalisis, setGuardarAnalisis] = useState(false);

  // Estados para compartir
  const [mostrarModalCompartir, setMostrarModalCompartir] = useState(false);
  const [emailCompartir, setEmailCompartir] = useState('');
  const [mensajeCompartir, setMensajeCompartir] = useState('');

  // Estados para plazos
  const [plazos, setPlazos] = useState([]);
  const [cargandoPlazos, setCargandoPlazos] = useState(false);
  const [mostrarModalEditarPlazo, setMostrarModalEditarPlazo] = useState(false);
  const [plazoSeleccionado, setPlazoSeleccionado] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [cargandoComentarios, setCargandoComentarios] = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [cargandoGuardarComentario, setCargandoGuardarComentario] = useState(false);

  // Filtrar plazos usando la función segura sin desfase
  const plazosPendientes = plazos.filter(p => p.Estado !== 'Completado' && getFechaObj(p.Fecha) >= new Date());
  const plazosVencidos = plazos.filter(p => p.Estado !== 'Completado' && getFechaObj(p.Fecha) < new Date());
  const plazosCompletados = plazos.filter(p => p.Estado === 'Completado');

  // Obtener el email de la sesión
  useEffect(() => {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    if (cookies.user) {
      try {
        const userData = JSON.parse(decodeURIComponent(cookies.user));
        setSessionEmail(userData.email || '');
      } catch (e) {}
    }
  }, []);

  // Recargar actuaciones cuando cambia el SAC
  useEffect(() => {
    const cargarActuaciones = async () => {
      try {
        const response = await fetch(`/api/actuaciones?numeroSAC=${sac}`);
        const data = await response.json();
        if (data.actuaciones) {
          setActuaciones(data.actuaciones);
        }
      } catch (error) {
        console.error('Error al recargar actuaciones:', error);
      }
    };
    cargarActuaciones();
  }, [sac]);

  // Cargar plazos al entrar a la pestaña
  useEffect(() => {
    if (activeTab === 'plazos') {
      cargarPlazos();
    }
  }, [activeTab, sac]);

  // Cargar comentarios cuando monta la ficha (para mostrar badge)
  useEffect(() => {
    if (sac) {
      cargarComentarios();
    }
  }, [sac]);

  // Cargar comentarios al entrar a la pestaña
  useEffect(() => {
    if (activeTab === 'comentarios') {
      cargarComentarios();
    }
  }, [activeTab, sac]);

  const volver = () => {
    router.push(`/clientes/${cliente.ID_Cliente}`);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevaActuacion(prev => ({ ...prev, [name]: value }));
  };

  const [nuevaActuacion, setNuevaActuacion] = useState({
    fecha: getFechaHoyISO(), // Sin desfase
    tipo: 'Escrito',
    tipoOtro: '',
    origen: 'Yo',
    contenido: '',
    estado: 'Borrador',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setCargando(true);

    if (!nuevaActuacion.fecha || !nuevaActuacion.contenido.trim()) {
      setMensaje('⚠️ Fecha y Contenido son obligatorios');
      setCargando(false);
      return;
    }

    if (nuevaActuacion.tipo === 'Otro' && !nuevaActuacion.tipoOtro.trim()) {
      setMensaje('⚠️ Especificá el nombre del tipo cuando seleccionás "Otro"');
      setCargando(false);
      return;
    }

    try {
      const datos = {
        numeroSAC: sac,
        fecha: formatearFechaArgentina(nuevaActuacion.fecha), // Enviamos DD/MM/AAAA a la API
        tipo: nuevaActuacion.tipo,
        tipoOtro: nuevaActuacion.tipoOtro,
        origen: nuevaActuacion.origen,
        contenido: nuevaActuacion.contenido,
        presentado: nuevaActuacion.estado === 'Presentado',
        enviado: nuevaActuacion.estado === 'Enviado',
        tienePDF: false,
        idPDFDrive: '',
        esBorrador: nuevaActuacion.estado === 'Borrador',
        creadoPor: sessionEmail || 'sistema',
        compartidoCon: '',
      };

      const response = await fetch('/api/actuaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });

      const resultado = await response.json();

      if (resultado.success) {
        setMensaje('Actuación agregada correctamente');
        setNuevaActuacion({
          fecha: getFechaHoyISO(),
          tipo: 'Escrito',
          tipoOtro: '',
          origen: 'Yo',
          contenido: '',
          estado: 'Borrador',
        });
        setMostrarFormulario(false);
        const reloadResponse = await fetch(`/api/actuaciones?numeroSAC=${sac}`);
        const reloadData = await reloadResponse.json();
        if (reloadData.actuaciones) {
          setActuaciones(reloadData.actuaciones);
        }
      } else {
        setMensaje('Error al agregar la actuación: ' + (resultado.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      setMensaje('Error: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const eliminarExpediente = async () => {
    if (!confirm(`¿Estás seguro de eliminar el expediente ${sac}?`)) {
      return;
    }

    setCargando(true);
    try {
      const response = await fetch(`/api/eliminar?tipo=expediente&sac=${sac}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      
      if (data.success) {
        alert('Expediente eliminado correctamente');
        router.push(`/clientes/${cliente.ID_Cliente}`);
      } else {
        alert(data.error || 'Error al eliminar el expediente');
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar el expediente');
    } finally {
      setCargando(false);
    }
  };

  const editarActuacion = async (act, index) => {
    if (editando === index) {
      const contenido = document.getElementById(`edit_contenido_${index}`).value;
      const fecha = document.getElementById(`edit_fecha_${index}`).value; // Viene como YYYY-MM-DD del input
      const tipo = document.getElementById(`edit_tipo_${index}`).value;
      const origen = document.getElementById(`edit_origen_${index}`).value;

      try {
        const response = await fetch('/api/actuaciones', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: act.ID,
            numeroSAC: sac,
            fecha: formatearFechaArgentina(fecha), // Enviamos DD/MM/AAAA
            tipo,
            origen,
            contenido,
            esBorrador: true,
          }),
        });

        const resultado = await response.json();
        if (resultado.success) {
          setEditando(null);
          const reloadResponse = await fetch(`/api/actuaciones?numeroSAC=${sac}`);
          const reloadData = await reloadResponse.json();
          if (reloadData.actuaciones) {
            setActuaciones(reloadData.actuaciones);
          }
        } else {
          alert('Error al editar: ' + (resultado.error || 'Error desconocido'));
        }
      } catch (error) {
        console.error('Error al editar:', error);
        alert('Error al editar la actuación');
      }
    } else {
      setEditando(index);
    }
  };

  const eliminarActuacion = async (act) => {
    if (!confirm(`¿Estás seguro de eliminar esta actuación?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/actuaciones?id=${act.ID}&numeroSAC=${sac}`, {
        method: 'DELETE',
      });

      const resultado = await response.json();
      if (resultado.success) {
        const reloadResponse = await fetch(`/api/actuaciones?numeroSAC=${sac}`);
        const reloadData = await reloadResponse.json();
        if (reloadData.actuaciones) {
          setActuaciones(reloadData.actuaciones);
        }
      } else {
        alert('Error al eliminar: ' + (resultado.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar la actuación');
    }
  };

  const toggleExpandir = (index) => {
    if (editando !== null) return;
    setExpandidos(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getResumen = (contenido, maxChars = 200) => {
    if (!contenido) return '';
    if (contenido.length <= maxChars) return contenido;
    return contenido.substring(0, maxChars) + '...';
  };

  const getTipoColor = (tipo) => {
    const colores = {
      'Escrito': '#3182ce',
      'Decreto': '#805ad5',
      'Pericia': '#38a169',
      'Proveído': '#ed8936',
      'Apertura': '#4a5568',
      'Sentencia': '#e53e3e',
      'Resolución': '#d69e2e',
      'Fijación de Audiencia': '#9f7aea',
      'Admisión de la Demanda': '#38a169',
      'Decreto de Autos': '#2b6cb0',
      'Admisión de Apelación': '#dd6b20',
      'Cédula de Notificación': '#9f7aea',
      'Demanda': '#38a169',
      'Dictamen': '#d69e2e',
      'Análisis': '#805ad5',
      'Otro': '#718096',
    };
    return colores[tipo] || '#718096';
  };

  const getOrigenColor = (origen) => {
    const colores = {
      'Yo': '#3182ce',
      'Tribunal': '#e53e3e',
      'Otra Parte': '#ed8936',
      'Perito': '#9f7aea',
      'Respuesta a Oficio': '#38a169',
      'Equipo Técnico': '#805ad5',
      'Representante Complementario': '#2b6cb0',
    };
    return colores[origen] || '#4a5568';
  };

  const toggleFormulario = () => {
    setMostrarFormulario(!mostrarFormulario);
    setMensaje('');
  };

  const tiposActuacion = [
    'Escrito',
    'Decreto',
    'Pericia',
    'Proveído',
    'Apertura',
    'Sentencia',
    'Resolución',
    'Fijación de Audiencia',
    'Admisión de la Demanda',
    'Decreto de Autos',
    'Admisión de Apelación',
    'Cédula de Notificación',
    'Demanda',
    'Dictamen',
    'Análisis',
    'Otro'
  ];

  const origenes = [
    'Yo',
    'Tribunal',
    'Otra Parte',
    'Perito',
    'Respuesta a Oficio',
    'Equipo Técnico',
    'Representante Complementario'
  ];

  const puedeEditar = (act) => {
    if (act.Tipo === 'Apertura') return true;
    return act.Es_Borrador === 'SI' && act.Creado_Por === sessionEmail;
  };

  // ==========================================
  // FUNCIONES DE IA
  // ==========================================

  const ejecutarIA = async (accion) => {
    console.log('🔍 ejecutarIA llamado con accion:', accion);
    setCargandoIA(true);
    setMensaje('');
    setResultadoIA('');
    setEditandoIA(false);
    setAccionIA(accion);
    setGuardarAnalisis(false);
    setMostrarSeleccionSentencia(false);

    try {
      if (accion === 'analizar-sentencia') {
        const sentenciasEncontradas = actuaciones.filter(a => 
          a.Tipo === 'Sentencia' || a.Tipo === 'Resolución'
        );

        if (sentenciasEncontradas.length === 0) {
          setMensaje('⚠️ No hay sentencias o resoluciones en este expediente.');
          setCargandoIA(false);
          return;
        }

        if (sentenciasEncontradas.length === 1) {
          await ejecutarAnalisisSentencia(sentenciasEncontradas[0].Contenido);
          return;
        }

        setSentencias(sentenciasEncontradas);
        setMostrarSeleccionSentencia(true);
        setCargandoIA(false);
        return;
      }

      const body = {
        accion,
        numeroSAC: sac,
        usuario: sessionEmail,
      };

      console.log('📤 Enviando a /api/ia:', { accion, numeroSAC: sac });

      const response = await fetch('/api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log('📥 Respuesta data:', data);

      if (data.success) {
        setResultadoIA(data.resultado);
        setEditorIA(data.resultado);
        setEditandoIA(true);
        setMostrarIA(true);
        setMensaje(`${accion} completado correctamente`);
      } else {
        let errorMsg = data.error || 'Error desconocido';
        
        if (response.status === 429) {
          errorMsg = '⚠️ Límite de uso de Gemini alcanzado. Esperá 24 horas o verificá tu API Key.';
        } else if (response.status === 403) {
          errorMsg = '⚠️ API Key inválida o sin permisos. Verificá tu clave en Google AI Studio.';
        }
        
        console.error('Error en IA:', errorMsg);
        setMensaje('Error en IA: ' + errorMsg);
      }
    } catch (error) {
      console.error('Error en ejecutarIA:', error);
      setMensaje('Error: ' + error.message);
    } finally {
      setCargandoIA(false);
    }
  };

  const ejecutarAnalisisSentencia = async (textoSentencia) => {
    setCargandoIA(true);
    setMensaje('');

    try {
      const body = {
        accion: 'analizar-sentencia',
        numeroSAC: sac,
        texto: textoSentencia,
        usuario: sessionEmail,
      };

      console.log('📤 Enviando a /api/ia (análisis de sentencia)...');

      const response = await fetch('/api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log('📥 Respuesta data:', data);

      if (data.success) {
        setResultadoIA(data.resultado);
        setEditorIA(data.resultado);
        setEditandoIA(true);
        setMostrarIA(true);
        setGuardarAnalisis(true);
        setMensaje('Análisis de sentencia completado');
      } else {
        let errorMsg = data.error || 'Error desconocido';
        
        if (response.status === 429) {
          errorMsg = '⚠️ Límite de uso de Gemini alcanzado. Esperá 24 horas o verificá tu API Key.';
        }
        
        console.error('Error en IA:', errorMsg);
        setMensaje('Error en IA: ' + errorMsg);
      }
    } catch (error) {
      console.error('Error en ejecutarAnalisisSentencia:', error);
      setMensaje('Error: ' + error.message);
    } finally {
      setCargandoIA(false);
    }
  };

  const guardarAnalisisIA = async () => {
    if (!editorIA.trim()) {
      setMensaje('⚠️ No hay contenido para guardar');
      return;
    }

    if (!confirm('¿Guardar este análisis como actuación en el expediente?')) {
      setMensaje('Análisis descartado');
      setMostrarIA(false);
      setResultadoIA('');
      setEditorIA('');
      setGuardarAnalisis(false);
      return;
    }

    setCargando(true);
    try {
      const datos = {
        numeroSAC: sac,
        fecha: formatearFechaArgentina(getFechaHoyISO()), // Sin desfase y en DD/MM/AAAA
        tipo: 'Análisis',
        origen: 'Yo',
        contenido: editorIA,
        presentado: false,
        enviado: false,
        tienePDF: false,
        idPDFDrive: '',
        esBorrador: true,
        creadoPor: sessionEmail || 'sistema',
        compartidoCon: '',
      };

      const response = await fetch('/api/actuaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });

      const resultado = await response.json();

      if (resultado.success) {
        setMensaje('Análisis guardado como actuación');
        setMostrarIA(false);
        setResultadoIA('');
        setEditorIA('');
        setGuardarAnalisis(false);
        const reloadResponse = await fetch(`/api/actuaciones?numeroSAC=${sac}`);
        const reloadData = await reloadResponse.json();
        if (reloadData.actuaciones) {
          setActuaciones(reloadData.actuaciones);
        }
      } else {
        setMensaje('Error al guardar: ' + (resultado.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      setMensaje('Error: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const guardarCorreccionIA = async () => {
    if (!resultadoIA || !editorIA || resultadoIA === editorIA) return;

    try {
      await fetch('/api/correcciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeroSAC: sac,
          tipo: accionIA === 'generar-escrito' ? 'Escrito' : accionIA,
          promptOriginal: '',
          textoGenerado: resultadoIA,
          textoCorregido: editorIA,
          usuario: sessionEmail,
        }),
      });
      console.log('Corrección guardada');
    } catch (error) {
      console.error('Error al guardar corrección:', error);
    }
  };

  const agregarPlazo = () => {
    // Limpiar el plazo y abrir modal en el expediente
    setPlazoSeleccionado({
      Numero_SAC: sac,
      Titulo: '',
      Descripcion: '',
      Fecha_Vencimiento: '',
      Estado: 'Pendiente',
    });
    setMostrarModalEditarPlazo(true);
  };

  // ==========================================
  // FUNCIONES PARA COMPARTIR
  // ==========================================

  const compartirExpediente = async () => {
    if (!emailCompartir.trim()) {
      setMensajeCompartir('⚠️ Ingresá un email válido');
      return;
    }

    try {
      const compartidosActuales = expediente.Usuarios_Compartidos ? expediente.Usuarios_Compartidos.split(',').map(e => e.trim()) : [];
      
      if (compartidosActuales.includes(emailCompartir.trim())) {
        setMensajeCompartir('⚠️ El usuario ya está compartido');
        return;
      }

      const nuevosCompartidos = [...compartidosActuales, emailCompartir.trim()];
      const nuevoValor = nuevosCompartidos.join(', ');

      const response = await fetch('/api/actualizar-expediente', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeroSAC: sac,
          usuariosCompartidos: nuevoValor,
        }),
      });

      const resultado = await response.json();
      if (resultado.success) {
        setMensajeCompartir('Expediente compartido correctamente');
        setEmailCompartir('');
        setTimeout(() => router.reload(), 1500);
      } else {
        setMensajeCompartir('Error al compartir: ' + (resultado.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error al compartir:', error);
      setMensajeCompartir('Error: ' + error.message);
    }
  };

  // ==========================================
  // FUNCIONES PARA PLAZOS
  // ==========================================

  const cargarPlazos = async () => {
    setCargandoPlazos(true);
    try {
      const response = await fetch(`/api/agenda?numeroSAC=${sac}`);
      const data = await response.json();
      if (data.eventos) {
        setPlazos(data.eventos);
      }
    } catch (error) {
      console.error('Error al cargar plazos:', error);
    } finally {
      setCargandoPlazos(false);
    }
  };

  const abrirModalEditarPlazo = (plazo) => {
    setPlazoSeleccionado(plazo);
    setMostrarModalEditarPlazo(true);
  };

  const handleEditarPlazo = async (e) => {
    e.preventDefault();
    setMensaje('');
    setCargando(true);

    try {
      const datosActualizados = {
        id: plazoSeleccionado.ID,
        numeroSAC: expediente?.Numero_SAC || '',
        cliente: cliente?.Nombre_Cliente || '',
        tipo: plazoSeleccionado.Tipo || 'Plazo',
        titulo: plazoSeleccionado.Titulo || '',
        descripcion: plazoSeleccionado.Descripcion || '',
        fecha: plazoSeleccionado.Fecha || '',
        hora: plazoSeleccionado.Hora || '',
        horaFin: plazoSeleccionado.Hora_Fin || '',
        lugar: plazoSeleccionado.Lugar || '',
        recordatorio: plazoSeleccionado.Recordatorio || 'SI',
        diasAntes: plazoSeleccionado.Dias_Antes || '1',
        estado: plazoSeleccionado.Estado || 'Pendiente',
        compartidoCon: plazoSeleccionado.Compartido_Con || '',
      };

      const response = await fetch('/api/agenda', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosActualizados),
      });

      const resultado = await response.json();

      if (resultado.success) {
        setMensaje('Plazo actualizado correctamente');
        setMostrarModalEditarPlazo(false);
        cargarPlazos();
      } else {
        setMensaje(`Error: ${resultado.error || 'Error desconocido'}`);
      }
    } catch (error) {
      setMensaje(`Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const handleEliminarPlazo = async () => {
    if (!confirm('¿Estás seguro de eliminar este plazo?')) return;

    try {
      const response = await fetch(`/api/agenda?id=${plazoSeleccionado.ID}`, {
        method: 'DELETE',
      });
      const resultado = await response.json();

      if (resultado.success) {
        setMensaje('Plazo eliminado correctamente');
        setMostrarModalEditarPlazo(false);
        cargarPlazos();
      } else {
        setMensaje(`Error: ${resultado.error || 'Error desconocido'}`);
      }
    } catch (error) {
      setMensaje(`Error: ${error.message}`);
    }
  };

  const cargarComentarios = async () => {
    setCargandoComentarios(true);
    try {
      const response = await fetch(`/api/obtener-comentarios?numeroSAC=${encodeURIComponent(sac)}`);
      const data = await response.json();
      setComentarios(data.comentarios || []);
    } catch (error) {
      console.error('Error al cargar comentarios:', error);
      setComentarios([]);
    } finally {
      setCargandoComentarios(false);
    }
  };

  const handleAgregarComentario = async (e) => {
    e.preventDefault();
    if (!nuevoComentario.trim()) {
      return;
    }

    setCargandoGuardarComentario(true);

    try {
      const response = await fetch('/api/agregar-comentario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeroSAC: sac,
          comentario: nuevoComentario,
        }),
      });

      const resultado = await response.json();

      if (resultado.success) {
        setNuevoComentario('');
        // Pequeño delay para asegurar que Sheets sincronice
        setTimeout(() => {
          cargarComentarios();
        }, 200);
      } else {
        console.error('Error al agregar comentario:', resultado.error);
      }
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      setCargandoGuardarComentario(false);
    }
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div>
            <h1 style={{ marginBottom: '4px' }}>Expediente {sac}</h1>
            <p style={{ margin: 0 }}>
              Ficha completa del expediente con actuaciones, plazos y herramientas IA
            </p>
            <div style={{ marginTop: '12px', fontSize: '14px', color: '#64748b' }}>
              <p style={{ margin: '4px 0' }}>
                <strong>Cliente:</strong> {cliente.Nombre_Cliente}
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Carátula:</strong> {expediente.Caratula || 'No registrada'}
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Juzgado:</strong> {expediente.Juzgado || 'No registrado'}
              </p>
              {expediente.Usuarios_Compartidos && (
                <div style={{ 
                  marginTop: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px', 
                  flexWrap: 'wrap',
                  fontSize: '0.85rem'
                }}>
                  <span style={{ color: '#4a5568' }}>Compartido con:</span>
                  {expediente.Usuarios_Compartidos.split(',').map((email, idx) => (
                    <span 
                      key={idx} 
                      style={{ 
                        backgroundColor: '#e2e8f0', 
                        padding: '2px 10px', 
                        borderRadius: '12px',
                        color: '#2d3748'
                      }}
                    >
                      {email.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Botones Eliminar y Volver - ARRIBA A LA DERECHA */}
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              className="button button-danger button-sm"
              onClick={eliminarExpediente}
              disabled={cargando}
            >
              {cargando ? 'Eliminando...' : 'Eliminar'}
            </button>
            <button 
              className="button button-secondary button-sm"
              onClick={volver}
            >
              ← Volver
            </button>
          </div>
        </div>
      </div>

      {/* Pestañas */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', marginBottom: '16px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* PESTAÑAS */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setActiveTab('actuaciones')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'actuaciones' ? '#2563eb' : 'transparent',
              color: activeTab === 'actuaciones' ? 'white' : '#64748b',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
          >
            Actuaciones ({actuaciones.length})
          </button>
          <button
            onClick={() => setActiveTab('plazos')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'plazos' ? '#2563eb' : 'transparent',
              color: activeTab === 'plazos' ? 'white' : '#64748b',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
          >
            Plazos
          </button>
          <button
            onClick={() => setActiveTab('comentarios')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'comentarios' ? '#2563eb' : 'transparent',
              color: activeTab === 'comentarios' ? 'white' : '#64748b',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            💬 Comentarios
            {comentarios.length > 0 && (
              <span
                style={{
                  marginLeft: '8px',
                  fontSize: '0.8rem',
                  backgroundColor: activeTab === 'comentarios' ? 'rgba(255,255,255,0.3)' : '#3182ce',
                  color: activeTab === 'comentarios' ? 'white' : 'white',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                {comentarios.length}
              </span>
            )}
          </button>
        </div>

        {/* BOTONES DE ACCIÓN - SOLO EN PESTAÑA ACTUACIONES */}
        {activeTab === 'actuaciones' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            <button 
              onClick={toggleFormulario} 
              className={`button button-sm ${mostrarFormulario ? 'button-danger' : 'button-success'}`}
            >
              {mostrarFormulario ? 'Cerrar' : '+ Actuación'}
            </button>
            <button onClick={agregarPlazo} className="button button-warning button-sm">
              + Plazo
            </button>
            <button 
              onClick={() => setMostrarModalCompartir(true)} 
              className="button button-primary button-sm"
            >
              Compartir
            </button>
            
            {/* Dropdown para Herramientas IA */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setMostrarMenuIA(!mostrarMenuIA)}
                className="button button-info button-sm"
                style={{ marginRight: '0' }}
              >
                {cargandoIA ? 'IA...' : 'IA ▼'}
              </button>
              {mostrarMenuIA && (
                <div style={{
                  position: 'absolute',
                  top: '36px',
                  right: '0',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  zIndex: 100,
                  minWidth: '140px'
                }}>
                  <button
                    onClick={() => {
                      ejecutarIA('resumir');
                      setMostrarMenuIA(false);
                    }}
                    disabled={cargandoIA}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#2d3748',
                      cursor: cargandoIA ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      borderBottom: '1px solid #e2e8f0',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => !cargandoIA && (e.target.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    {cargandoIA ? '⏳ Resumir' : 'Resumir'}
                  </button>
                  <button
                    onClick={() => {
                      ejecutarIA('analizar-sentencia');
                      setMostrarMenuIA(false);
                    }}
                    disabled={cargandoIA}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#2d3748',
                      cursor: cargandoIA ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      borderBottom: '1px solid #e2e8f0',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => !cargandoIA && (e.target.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    {cargandoIA ? '⏳ Analizar' : 'Analizar'}
                  </button>
                  <button
                    onClick={() => {
                      ejecutarIA('estrategia');
                      setMostrarMenuIA(false);
                    }}
                    disabled={cargandoIA}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#2d3748',
                      cursor: cargandoIA ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => !cargandoIA && (e.target.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    {cargandoIA ? '⏳ Estrategia' : 'Estrategia'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Contenido de las pestañas */}
      <div style={{ minHeight: '300px' }}>
        {/* Pestaña Actuaciones */}
        {activeTab === 'actuaciones' && (
          <div>
            {/* Formulario para nueva actuación */}
            {mostrarFormulario && (
              <div style={{ 
                backgroundColor: '#f7fafc', 
                padding: '20px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                border: '1px solid #e2e8f0'
              }}>
                <h3>Nueva Actuación</h3>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label><strong>Fecha *</strong></label>
                      <input
                        type="date"
                        name="fecha"
                        value={nuevaActuacion.fecha}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div>
                      <label><strong>Tipo *</strong></label>
                      <select
                        name="tipo"
                        value={nuevaActuacion.tipo}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                        required
                      >
                        {tiposActuacion.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    {nuevaActuacion.tipo === 'Otro' && (
                      <div>
                        <label><strong>Especificar Tipo *</strong></label>
                        <input
                          type="text"
                          name="tipoOtro"
                          value={nuevaActuacion.tipoOtro}
                          onChange={handleChange}
                          placeholder="Ej: Oficio, Nota, etc."
                          style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                          required
                        />
                      </div>
                    )}
                    <div>
                      <label><strong>Origen</strong></label>
                      <select
                        name="origen"
                        value={nuevaActuacion.origen}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      >
                        {origenes.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label><strong>Estado *</strong></label>
                      <select
                        name="estado"
                        value={nuevaActuacion.estado}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      >
                        <option value="Borrador">Borrador</option>
                        <option value="Presentado">Presentado</option>
                        <option value="Enviado">Enviado</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: '15px' }}>
                    <label><strong>Contenido *</strong></label>
                    <EditorTexto
                      initialValue={nuevaActuacion.contenido}
                      onChange={(value) => setNuevaActuacion(prev => ({ ...prev, contenido: value }))}
                      minHeight="150px"
                    />
                  </div>

                  {mensaje && (
                    <div style={{ 
                      marginTop: '15px', 
                      padding: '10px', 
                      borderRadius: '8px', 
                      backgroundColor: mensaje.includes('✅') ? '#c6f6d5' : '#fed7d7', 
                      color: mensaje.includes('✅') ? '#22543d' : '#9b2c2c' 
                    }}>
                      {mensaje}
                    </div>
                  )}
                  <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                    <button type="submit" className="button button-primary button-sm" disabled={cargando}>
                      {cargando ? 'Guardando...' : 'Guardar Actuación'}
                    </button>
                    <button 
                      type="button" 
                      onClick={toggleFormulario} 
                      className="button button-secondary button-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Feed de actuaciones */}
            <h2>Historial de Actuaciones ({actuaciones.length})</h2>
            {actuaciones.length === 0 ? (
              <p style={{ color: '#4a5568' }}>No hay actuaciones registradas para este expediente.</p>
            ) : (
              <div>
                {actuaciones.map((act, index) => {
                  const resumen = getResumen(act.Contenido, 200);
                  const estaExpandido = expandidos[index] || false;
                  const tieneMas = act.Contenido && act.Contenido.length > 200;
                  const esBorrador = act.Es_Borrador === 'SI';
                  const esCreador = act.Creado_Por === sessionEmail;
                  const esApertura = act.Tipo === 'Apertura';
                  const puedeEditarAct = esApertura || (esBorrador && esCreador);
                  const estaEditando = editando === index;
                  const tienePDF = act.Tiene_PDF === 'SI' && act.ID_PDF_Drive;

                  return (
                    <div
                      key={index}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '15px',
                        marginBottom: '10px',
                        backgroundColor: esBorrador ? '#fefcbf' : '#f7fafc',
                        borderLeft: `4px solid ${getTipoColor(act.Tipo)}`,
                        cursor: estaEditando ? 'default' : 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => !estaEditando && toggleExpandir(index)}
                      onMouseEnter={(e) => {
                        if (!estaEditando) {
                          e.currentTarget.style.backgroundColor = esBorrador ? '#fde68a' : '#edf2f7';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!estaEditando) {
                          e.currentTarget.style.backgroundColor = esBorrador ? '#fefcbf' : '#f7fafc';
                        }
                      }}
                    >
                      {estaEditando ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                            <div>
                              <label><strong>Fecha</strong></label>
                              <input
                                id={`edit_fecha_${index}`}
                                type="date"
                                defaultValue={parsearFechaArgentina(act.Fecha)} // Convertimos DD/MM/AAAA a YYYY-MM-DD para el input
                                style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                              />
                            </div>
                            <div>
                              <label><strong>Tipo</strong></label>
                              <select
                                id={`edit_tipo_${index}`}
                                defaultValue={act.Tipo}
                                style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                              >
                                {tiposActuacion.map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label><strong>Origen</strong></label>
                              <select
                                id={`edit_origen_${index}`}
                                defaultValue={act.Origen || 'Yo'}
                                style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                              >
                                {origenes.map(o => (
                                  <option key={o} value={o}>{o}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label><strong>Contenido</strong></label>
                            <textarea
                              id={`edit_contenido_${index}`}
                              defaultValue={act.Contenido || ''}
                              style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', minHeight: '80px' }}
                            />
                          </div>
                          <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                            <button onClick={() => editarActuacion(act, index)} className="button button-success button-sm">
                              💾 Guardar
                            </button>
                            <button onClick={() => setEditando(null)} className="button button-secondary button-sm">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong style={{ color: getTipoColor(act.Tipo) }}>
                                {act.Tipo || 'Actuación'}
                              </strong>
                              <span style={{ 
                                marginLeft: '10px', 
                                backgroundColor: getOrigenColor(act.Origen), 
                                color: 'white', 
                                padding: '2px 10px', 
                                borderRadius: '12px', 
                                fontSize: '0.8rem' 
                              }}>
                                {act.Origen || 'Sin origen'}
                              </span>
                              {act.Presentado === 'SI' && (
                                <span style={{ 
                                  marginLeft: '10px', 
                                  backgroundColor: '#38a169', 
                                  color: 'white', 
                                  padding: '2px 8px', 
                                  borderRadius: '12px', 
                                  fontSize: '0.8rem' 
                                }}>
                                  Presentado
                                </span>
                              )}
                              {act.Enviado === 'SI' && (
                                <span style={{ 
                                  marginLeft: '10px', 
                                  backgroundColor: '#805ad5', 
                                  color: 'white', 
                                  padding: '2px 8px', 
                                  borderRadius: '12px', 
                                  fontSize: '0.8rem' 
                                }}>
                                  📨 Enviado
                                </span>
                              )}
                              {esBorrador && act.Presentado !== 'SI' && act.Enviado !== 'SI' && (
                                <span style={{ 
                                  marginLeft: '10px', 
                                  backgroundColor: '#ed8936', 
                                  color: 'white', 
                                  padding: '2px 8px', 
                                  borderRadius: '12px', 
                                  fontSize: '0.8rem' 
                                }}>
                                  Borrador
                                </span>
                              )}
                              {tienePDF && (
                                <span style={{ 
                                  marginLeft: '10px', 
                                  backgroundColor: '#805ad5', 
                                  color: 'white', 
                                  padding: '2px 8px', 
                                  borderRadius: '12px', 
                                  fontSize: '0.8rem' 
                                }}>
                                  📎 PDF
                                </span>
                              )}
                              <span style={{ marginLeft: '15px', color: '#4a5568', fontSize: '0.9rem' }}>
                                {formatearFechaArgentina(act.Fecha) || 'Sin fecha'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {puedeEditarAct && (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); editarActuacion(act, index); }}
                                    style={{ backgroundColor: '#ed8936', padding: '4px 8px', fontSize: '0.75rem' }}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); eliminarActuacion(act); }}
                                    style={{ backgroundColor: '#e53e3e', padding: '4px 8px', fontSize: '0.75rem' }}
                                  >
                                    Eliminar
                                  </button>
                                </>
                              )}
                              <span style={{ color: '#4a5568', fontSize: '0.8rem' }}>
                                {estaExpandido ? '▲' : '▼'}
                              </span>
                            </div>
                          </div>

                          <div style={{ marginTop: '8px', color: '#4a5568', fontSize: '0.95rem' }}>
                            {resumen ? (
                              <div style={{ whiteSpace: 'pre-wrap' }}>
                                {resumen}
                                {tieneMas && !estaExpandido && (
                                  <span style={{ color: '#3182ce', marginLeft: '5px' }}>... <em>clic para leer más</em></span>
                                )}
                              </div>
                            ) : (
                              <em style={{ color: '#a0aec0' }}>Sin contenido</em>
                            )}
                          </div>

                          {estaExpandido && act.Contenido && (
                            <div 
                              style={{ 
                                marginTop: '12px', 
                                paddingTop: '12px', 
                                borderTop: '1px solid #e2e8f0',
                                whiteSpace: 'pre-wrap',
                                fontSize: '0.95rem',
                                backgroundColor: 'white',
                                padding: '12px',
                                borderRadius: '4px'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {act.Contenido}
                            </div>
                          )}

                          {tienePDF && (
                            <div style={{ marginTop: '10px' }}>
                              <a 
                                href={`https://drive.google.com/file/d/${act.ID_PDF_Drive}/view`}
                                target="_blank" 
                                rel="noopener noreferrer" 
                                style={{ color: '#3182ce', fontSize: '0.9rem' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                📎 Ver PDF adjunto
                              </a>
                            </div>
                          )}

                          {act.Creado_Por && (
                            <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#a0aec0' }}>
                              👤 {act.Creado_Por}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pestaña Plazos */}
        {activeTab === 'plazos' && (
          <div>
            <h2>Plazos del Expediente</h2>
            {cargandoPlazos ? (
              <p>Cargando plazos...</p>
            ) : plazos.length === 0 ? (
              <p style={{ color: '#4a5568' }}>No hay plazos registrados para este expediente.</p>
            ) : (
              <div>
                {/* Plazos vencidos */}
                {plazosVencidos.length > 0 && (
                  <>
                    <h3 style={{ color: '#991b1b' }}>Vencidos ({plazosVencidos.length})</h3>
                    {plazosVencidos.map((plazo, index) => (
                      <PlazoCard key={index} plazo={plazo} onClick={() => abrirModalEditarPlazo(plazo)} vencido />
                    ))}
                  </>
                )}
                
                {/* Plazos pendientes */}
                {plazosPendientes.length > 0 && (
                  <>
                    <h3 style={{ color: '#d97706' }}>Pendientes ({plazosPendientes.length})</h3>
                    {plazosPendientes.map((plazo, index) => (
                      <PlazoCard key={index} plazo={plazo} onClick={() => abrirModalEditarPlazo(plazo)} />
                    ))}
                  </>
                )}
                
                {/* Plazos completados */}
                {plazosCompletados.length > 0 && (
                  <>
                    <h3>Completados ({plazosCompletados.length})</h3>
                    {plazosCompletados.map((plazo, index) => (
                      <PlazoCard key={index} plazo={plazo} onClick={() => abrirModalEditarPlazo(plazo)} completado />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pestaña Comentarios */}
        {activeTab === 'comentarios' && (
          <div>
            <h2>Comentarios del Expediente</h2>
            
            {/* Formulario para agregar comentario */}
            <div style={{
              backgroundColor: '#f7fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <form onSubmit={handleAgregarComentario}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Nuevo Comentario
                </label>
                <textarea
                  value={nuevoComentario}
                  onChange={(e) => setNuevoComentario(e.target.value)}
                  placeholder="Escribe un comentario interno..."
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <button
                  type="submit"
                  disabled={!nuevoComentario.trim() || cargandoGuardarComentario}
                  style={{
                    marginTop: '10px',
                    backgroundColor: '#38a169',
                    color: 'white',
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {cargandoGuardarComentario ? '📤 Guardando...' : '📤 Agregar Comentario'}
                </button>
              </form>
            </div>

            {/* Lista de comentarios */}
            <div>
              {cargandoComentarios ? (
                <p>Cargando comentarios...</p>
              ) : comentarios.length === 0 ? (
                <p style={{ color: '#4a5568' }}>No hay comentarios aún. ¡Sé el primero en comentar!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {comentarios.map((comentario, index) => (
                    <div
                      key={index}
                      style={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <strong style={{ color: '#2d3748' }}>👤 {comentario.autor}</strong>
                        <span style={{ fontSize: '0.85rem', color: '#718096' }}>
                          {comentario.fecha}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: '#4a5568', lineHeight: '1.5' }}>
                        {comentario.comentario}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modales que ya existían */}
      {/* Modal de selección de sentencia */}
      {mostrarSeleccionSentencia && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }} onClick={() => setMostrarSeleccionSentencia(false)}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }} onClick={(e) => e.stopPropagation()}>
            <h2>Seleccionar Sentencia</h2>
            <p style={{ color: '#4a5568', marginBottom: '15px' }}>
              Hay múltiples sentencias en este expediente. Seleccioná cuál querés analizar:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sentencias.map((sent, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setMostrarSeleccionSentencia(false);
                    ejecutarAnalisisSentencia(sent.Contenido);
                  }}
                  style={{
                    backgroundColor: '#f7fafc',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#edf2f7'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                >
                  <strong>{sent.Tipo}</strong> - {formatearFechaArgentina(sent.Fecha)}
                  <div style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '4px' }}>
                    {sent.Contenido?.substring(0, 100)}...
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setMostrarSeleccionSentencia(false)}
              style={{ marginTop: '15px', backgroundColor: '#718096' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal de IA */}
      {mostrarIA && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }} onClick={() => {
          if (!editandoIA) setMostrarIA(false);
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '800px',
            width: '95%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2>
                {accionIA === 'resumir' && 'Resumen del Expediente'}
                {accionIA === 'analizar-sentencia' && 'Análisis de Sentencia'}
                {accionIA === 'estrategia' && '💡 Estrategia Sugerida'}
              </h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                {editandoIA && (
                  <>
                    {guardarAnalisis && (
                      <button 
                        onClick={guardarAnalisisIA} 
                        className="button button-success button-sm"
                        disabled={cargando}
                      >
                        {cargando ? 'Guardando...' : '💾 Guardar como Actuación'}
                      </button>
                    )}
                    <button 
                      onClick={guardarCorreccionIA} 
                      className="button button-warning button-sm"
                    >
                      Guardar Corrección
                    </button>
                  </>
                )}
                <button 
                  onClick={() => { setMostrarIA(false); setResultadoIA(''); setEditorIA(''); setGuardarAnalisis(false); }} 
                  className="button button-secondary button-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>

            {editandoIA ? (
              <>
                <EditorTexto 
                  initialValue={editorIA}
                  onChange={(value) => setEditorIA(value)}
                  minHeight="300px"
                />
                <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#a0aec0' }}>
                  {accionIA === 'resumir' && '💡 Podés editar el resumen antes de guardarlo.'}
                  {accionIA === 'analizar-sentencia' && '💡 Podés editar el análisis antes de guardarlo como actuación.'}
                  {accionIA === 'estrategia' && '💡 Podés editar la estrategia antes de guardarla.'}
                </div>
              </>
            ) : (
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', lineHeight: '1.6', maxHeight: '500px', overflow: 'auto' }}>
                {resultadoIA || 'Generando respuesta...'}
              </div>
            )}

            {mensaje && (
              <div style={{ 
                marginTop: '15px', 
                padding: '10px', 
                borderRadius: '8px', 
                backgroundColor: mensaje.includes('✅') ? '#c6f6d5' : '#fed7d7', 
                color: mensaje.includes('✅') ? '#22543d' : '#9b2c2c' 
              }}>
                {mensaje}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de compartir */}
      {mostrarModalCompartir && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }} onClick={() => setMostrarModalCompartir(false)}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }} onClick={(e) => e.stopPropagation()}>
            <h2>Compartir Expediente</h2>
            <p style={{ color: '#4a5568', marginBottom: '15px' }}>
              Ingresá el email del usuario con quien querés compartir este expediente.
            </p>
            <input
              type="email"
              value={emailCompartir}
              onChange={(e) => setEmailCompartir(e.target.value)}
              placeholder="email@ejemplo.com"
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px' }}
            />
            {mensajeCompartir && (
              <div style={{ 
                padding: '10px', 
                borderRadius: '8px', 
                backgroundColor: mensajeCompartir.includes('✅') ? '#c6f6d5' : '#fed7d7', 
                color: mensajeCompartir.includes('✅') ? '#22543d' : '#9b2c2c',
                marginBottom: '10px'
              }}>
                {mensajeCompartir}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={compartirExpediente} className="button button-primary button-sm">
                Compartir
              </button>
              <button onClick={() => { setMostrarModalCompartir(false); setMensajeCompartir(''); }} className="button button-secondary button-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición de plazo */}
      {mostrarModalEditarPlazo && plazoSeleccionado && (
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
          onClick={() => setMostrarModalEditarPlazo(false)}
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
            <h2>{plazoSeleccionado.Titulo}</h2>
            <form onSubmit={handleEditarPlazo}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label><strong>Tipo</strong></label>
                  <select
                    value={plazoSeleccionado.Tipo || 'Plazo'}
                    onChange={(e) => setPlazoSeleccionado({ ...plazoSeleccionado, Tipo: e.target.value })}
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
                    value={parsearFechaArgentina(plazoSeleccionado.Fecha) || ''}
                    onChange={(e) => setPlazoSeleccionado({ ...plazoSeleccionado, Fecha: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label><strong>Hora</strong></label>
                  <input
                    type="time"
                    value={plazoSeleccionado.Hora || ''}
                    onChange={(e) => setPlazoSeleccionado({ ...plazoSeleccionado, Hora: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label><strong>Estado</strong></label>
                  <select
                    value={plazoSeleccionado.Estado || 'Pendiente'}
                    onChange={(e) => setPlazoSeleccionado({ ...plazoSeleccionado, Estado: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Completado">Completado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '15px' }}>
                <label><strong>Título</strong></label>
                <input
                  type="text"
                  value={plazoSeleccionado.Titulo || ''}
                  onChange={(e) => setPlazoSeleccionado({ ...plazoSeleccionado, Titulo: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginTop: '15px' }}>
                <label><strong>Descripción</strong></label>
                <textarea
                  value={plazoSeleccionado.Descripcion || ''}
                  onChange={(e) => setPlazoSeleccionado({ ...plazoSeleccionado, Descripcion: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', minHeight: '60px' }}
                />
              </div>

              <div style={{ marginTop: '15px' }}>
                <label><strong>Lugar</strong></label>
                <input
                  type="text"
                  value={plazoSeleccionado.Lugar || ''}
                  onChange={(e) => setPlazoSeleccionado({ ...plazoSeleccionado, Lugar: e.target.value })}
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
                <button type="submit" className="button button-primary button-sm" disabled={cargando}>
                  {cargando ? 'Guardando...' : '💾 Guardar Cambios'}
                </button>
                <button type="button" onClick={handleEliminarPlazo} className="button button-danger button-sm">
                  Eliminar Eliminar
                </button>
                <button type="button" onClick={() => { setMostrarModalEditarPlazo(false); setMensaje(''); }} className="button button-secondary button-sm">
                  Cerrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
