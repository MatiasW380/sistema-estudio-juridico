// pages/expediente/[sac].js
// Página de detalle de un expediente con actuaciones, plazos y herramientas IA

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getActuaciones, getClientes } from '../../lib/googleSheets';
import BotonInicio from '../../components/BotonInicio';
import EditorTexto from '../../components/EditorTexto';

export async function getServerSideProps(context) {
  const { sac } = context.params;
  try {
    const clientes = await getClientes();
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
    const fechaPlazo = new Date(plazo.Fecha);
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
          {plazo.Fecha} {plazo.Hora ? `- ${plazo.Hora}` : ''}
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

  // Filtrar plazos
  const plazosPendientes = plazos.filter(p => p.Estado !== 'Completado' && new Date(p.Fecha) >= new Date());
  const plazosVencidos = plazos.filter(p => p.Estado !== 'Completado' && new Date(p.Fecha) < new Date());
  const plazosCompletados = plazos.filter(p => p.Estado === 'Completado');

  // Obtener el email de la sesión
  useEffect(() => {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('='');
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

  const volver = () => {
    router.push(`/clientes/${cliente.ID_Cliente}`);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevaActuacion(prev => ({ ...prev, [name]: value }));
  };

  const [nuevaActuacion, setNuevaActuacion] = useState({
    fecha: new Date().toISOString().split('T')[0],
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
        fecha: nuevaActuacion.fecha,
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
        setMensaje('✅ Actuación agregada correctamente');
        setNuevaActuacion({
          fecha: new Date().toISOString().split('T')[0],
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
        setMensaje('❌ Error al agregar la actuación: ' + (resultado.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('❌ Error en handleSubmit:', error);
      setMensaje('❌ Error: ' + error.message);
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
      const fecha = document.getElementById(`edit_fecha_${index}`).value;
      const tipo = document.getElementById(`edit_tipo_${index}`).value;
      const origen = document.getElementById(`edit_origen_${index}`).value;

      try {
        const response = await fetch('/api/actuaciones', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: act.ID,
            numeroSAC: sac,
            fecha,
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
        setMensaje(`✅ ${accion} completado correctamente`);
      } else {
        let errorMsg = data.error || 'Error desconocido';
        
        if (response.status === 429) {
          errorMsg = '⚠️ Límite de uso de Gemini alcanzado. Esperá 24 horas o verificá tu API Key.';
        } else if (response.status === 403) {
          errorMsg = '⚠️ API Key inválida o sin permisos. Verificá tu clave en Google AI Studio.';
        }
        
        console.error('❌ Error en IA:', errorMsg);
        setMensaje('❌ Error en IA: ' + errorMsg);
      }
    } catch (error) {
      console.error('❌ Error en ejecutarIA:', error);
      setMensaje('❌ Error: ' + error.message);
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
        setMensaje('✅ Análisis de sentencia completado');
      } else {
        let errorMsg = data.error || 'Error desconocido';
        
        if (response.status === 429) {
          errorMsg = '⚠️ Límite de uso de Gemini alcanzado. Esperá 24 horas o verificá tu API Key.';
        }
        
        console.error('❌ Error en IA:', errorMsg);
        setMensaje('❌ Error en IA: ' + errorMsg);
      }
    } catch (error) {
      console.error('❌ Error en ejecutarAnalisisSentencia:', error);
      setMensaje('❌ Error: ' + error.message);
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
      setMensaje('❌ Análisis descartado');
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
        fecha: new Date().toISOString().split('T')[0],
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
        setMensaje('✅ Análisis guardado como actuación');
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
        setMensaje('❌ Error al guardar: ' + (resultado.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      setMensaje('❌ Error: ' + error.message);
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
      console.log('✅ Corrección guardada');
    } catch (error) {
      console.error('Error al guardar corrección:', error);
    }
  };

  const agregarPlazo = () => {
    router.push(`/agenda?numeroSAC=${sac}&cliente=${cliente.Nombre_Cliente}&tipo=Plazo`);
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
        setMensajeCompartir('✅ Expediente compartido correctamente');
        setEmailCompartir('');
        setTimeout(() => router.reload(), 1500);
      } else {
        setMensajeCompartir('❌ Error al compartir: ' + (resultado.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error al compartir:', error);
      setMensajeCompartir('❌ Error: ' + error.message);
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

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BotonInicio />
          <div>
            <h1 style={{ marginBottom: '5px' }}>📄 Expediente {sac}</h1>
            <p style={{ color: '#4a5568', margin: 0 }}>
              Cliente: {cliente.Nombre_Cliente} | Carátula: {expediente.Caratula || 'No registrada'}
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
                <span style={{ color: '#4a5568' }}>👥 Compartido con:</span>
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
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={eliminarExpediente}
            style={{
              backgroundColor: '#e53e3e',
              opacity: cargando ? 0.7 : 1,
              cursor: cargando ? 'not-allowed' : 'pointer'
            }}
            disabled={cargando}
          >
            {cargando ? 'Eliminando...' : '🗑️ Eliminar Expediente'}
          </button>
          <button onClick={volver} style={{ backgroundColor: '#718096' }}>
            ← Volver al cliente
          </button>
        </div>
      </div>

      {/* Pestañas */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('actuaciones')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'actuaciones' ? '#3182ce' : 'transparent',
            color: activeTab === 'actuaciones' ? 'white' : '#4a5568',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📋 Actuaciones ({actuaciones.length})
        </button>
        <button
          onClick={() => setActiveTab('plazos')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'plazos' ? '#3182ce' : 'transparent',
            color: activeTab === 'plazos' ? 'white' : '#4a5568',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📅 Plazos ({plazosPendientes.length + plazosVencidos.length})
        </button>
      </div>

      {/* Contenido de las pestañas */}
      <div style={{ minHeight: '300px' }}>
        {/* Pestaña Actuaciones */}
        {activeTab === 'actuaciones' && (
          <div>
            {/* Botones de acción */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button 
                onClick={toggleFormulario} 
                style={{ 
                  backgroundColor: mostrarFormulario ? '#e53e3e' : '#38a169',
                  cursor: 'pointer'
                }}
              >
                {mostrarFormulario ? '❌ Cerrar Formulario' : '📝 Nueva Actuación'}
              </button>
              <button 
                onClick={() => ejecutarIA('resumir')} 
                style={{ backgroundColor: '#805ad5' }}
                disabled={cargandoIA}
              >
                {cargandoIA ? 'Generando...' : '📄 Resumir'}
              </button>
              <button 
                onClick={() => ejecutarIA('analizar-sentencia')} 
                style={{ backgroundColor: '#e53e3e' }}
                disabled={cargandoIA}
              >
                {cargandoIA ? 'Analizando...' : '⚖️ Analizar Sentencia'}
              </button>
              <button 
                onClick={() => ejecutarIA('estrategia')} 
                style={{ backgroundColor: '#38a169' }}
                disabled={cargandoIA}
              >
                {cargandoIA ? 'Pensando...' : '💡 Estrategia'}
              </button>
              <button onClick={agregarPlazo} style={{ backgroundColor: '#ed8936' }}>
                📅 Agregar Plazo
              </button>
              <button 
                onClick={() => setMostrarModalCompartir(true)} 
                style={{ backgroundColor: '#9f7aea' }}
              >
                👥 Compartir
              </button>
            </div>

            {/* Formulario para nueva actuación */}
            {mostrarFormulario && (
              <div style={{ 
                backgroundColor: '#f7fafc', 
                padding: '20px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                border: '1px solid #e2e8f0'
              }}>
                <h3>📝 Nueva Actuación</h3>
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
                    <button type="submit" style={{ backgroundColor: '#3182ce' }} disabled={cargando}>
                      {cargando ? 'Guardando...' : 'Guardar Actuación'}
                    </button>
                    <button 
                      type="button" 
                      onClick={toggleFormulario} 
                      style={{ backgroundColor: '#718096' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Feed de actuaciones */}
            <h2>📋 Historial de Actuaciones ({actuaciones.length})</h2>
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
                                defaultValue={act.Fecha}
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
                            <button onClick={() => editarActuacion(act, index)} style={{ backgroundColor: '#38a169' }}>
                              💾 Guardar
                            </button>
                            <button onClick={() => setEditando(null)} style={{ backgroundColor: '#718096' }}>
                              ❌ Cancelar
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
                                  ✅ Presentado
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
                                  📝 Borrador
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
                                {act.Fecha || 'Sin fecha'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {puedeEditarAct && (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); editarActuacion(act, index); }}
                                    style={{ backgroundColor: '#ed8936', padding: '4px 8px', fontSize: '0.75rem' }}
                                  >
                                    ✏️ Editar
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); eliminarActuacion(act); }}
                                    style={{ backgroundColor: '#e53e3e', padding: '4px 8px', fontSize: '0.75rem' }}
                                  >
                                    🗑️
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
            <h2>📅 Plazos del Expediente</h2>
            {cargandoPlazos ? (
              <p>Cargando plazos...</p>
            ) : plazos.length === 0 ? (
              <p style={{ color: '#4a5568' }}>No hay plazos registrados para este expediente.</p>
            ) : (
              <div>
                {/* Plazos vencidos */}
                {plazosVencidos.length > 0 && (
                  <>
                    <h3 style={{ color: '#e53e3e' }}>🔴 Vencidos ({plazosVencidos.length})</h3>
                    {plazosVencidos.map((plazo, index) => (
                      <PlazoCard key={index} plazo={plazo} onClick={() => abrirModalEditarPlazo(plazo)} vencido />
                    ))}
                  </>
                )}
                
                {/* Plazos pendientes */}
                {plazosPendientes.length > 0 && (
                  <>
                    <h3>⏳ Pendientes ({plazosPendientes.length})</h3>
                    {plazosPendientes.map((plazo, index) => (
                      <PlazoCard key={index} plazo={plazo} onClick={() => abrirModalEditarPlazo(plazo)} />
                    ))}
                  </>
                )}
                
                {/* Plazos completados */}
                {plazosCompletados.length > 0 && (
                  <>
                    <h3>✅ Completados ({plazosCompletados.length})</h3>
                    {plazosCompletados.map((plazo, index) => (
                      <PlazoCard key={index} plazo={plazo} onClick={() => abrirModalEditarPlazo(plazo)} completado />
                    ))}
                  </>
                )}
              </div>
            )}
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
            <h2>⚖️ Seleccionar Sentencia</h2>
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
                  <strong>{sent.Tipo}</strong> - {sent.Fecha}
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
                {accionIA === 'resumir' && '📄 Resumen del Expediente'}
                {accionIA === 'analizar-sentencia' && '⚖️ Análisis de Sentencia'}
                {accionIA === 'estrategia' && '💡 Estrategia Sugerida'}
              </h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                {editandoIA && (
                  <>
                    {guardarAnalisis && (
                      <button 
                        onClick={guardarAnalisisIA} 
                        style={{ backgroundColor: '#38a169' }}
                        disabled={cargando}
                      >
                        {cargando ? 'Guardando...' : '💾 Guardar como Actuación'}
                      </button>
                    )}
                    <button 
                      onClick={guardarCorreccionIA} 
                      style={{ backgroundColor: '#ed8936' }}
                    >
                      📝 Guardar Corrección
                    </button>
                  </>
                )}
                <button 
                  onClick={() => { setMostrarIA(false); setResultadoIA(''); setEditorIA(''); setGuardarAnalisis(false); }} 
                  style={{ backgroundColor: '#718096' }}
                >
                  ❌ Cerrar
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
            <h2>👥 Compartir Expediente</h2>
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
              <button onClick={compartirExpediente} style={{ backgroundColor: '#3182ce' }}>
                Compartir
              </button>
              <button onClick={() => { setMostrarModalCompartir(false); setMensajeCompartir(''); }} style={{ backgroundColor: '#718096' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
