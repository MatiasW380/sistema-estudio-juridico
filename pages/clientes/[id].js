// pages/clientes/[id].js
// Ficha completa del cliente con pestañas y formulario para agregar expediente

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getClientes } from '../../lib/googleSheets';
import BotonInicio from '../../components/BotonInicio';

export async function getServerSideProps(context) {
  const { id } = context.params;
  try {
    const todosLosClientes = await getClientes();
    const cliente = todosLosClientes.find(c => c.ID_Cliente === id);
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
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoExpediente, setNuevoExpediente] = useState({
    Numero_SAC: '',
    Caratula: '',
    Fuero: '',
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

  // ==========================================
  // FUNCIONES PARA FINANZAS
  // ==========================================

  const cargarMovimientos = async () => {
    try {
      let todosMovimientos = [];
      for (const exp of expedientes) {
        const res = await fetch(`/api/finanzas?numeroSAC=${exp.Numero_SAC}`);
        const data = await res.json();
        if (data.finanzas) {
          todosMovimientos = [...todosMovimientos, ...data.finanzas];
        }
      }
      todosMovimientos.sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));
      setMovimientos(todosMovimientos);

      let totalDebe = 0;
      let totalHaber = 0;
      todosMovimientos.forEach(m => {
        const total = parseFloat(m.Monto_Total) || 0;
        const pagado = parseFloat(m.Monto_Pagado) || 0;
        if (m.Tipo === 'Honorario' || m.Tipo === 'Cuota') {
          totalDebe += total - pagado;
        }
        if (m.Tipo === 'Pago') {
          totalHaber += pagado;
        }
      });
      setSaldo({ totalDebe, totalHaber, saldo: totalDebe - totalHaber });
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
    }
  };

  const handleChangeFinanzas = (e) => {
    const { name, value } = e.target;
    setNuevoMovimiento(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitFinanzas = async (e) => {
    e.preventDefault();
    setMensajeFinanzas('');
    setCargandoFinanzas(true);

    const exp = expedientes[0];
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
        setMensajeFinanzas('✅ Movimiento agregado correctamente');
        setNuevoMovimiento({
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
        setMensajeFinanzas('❌ Error al agregar movimiento: ' + (resultado.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error en handleSubmitFinanzas:', error);
      setMensajeFinanzas('❌ Error: ' + error.message);
    } finally {
      setCargandoFinanzas(false);
    }
  };

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
      for (const exp of expedientes) {
        const res = await fetch(`/api/consultas?numeroSAC=${exp.Numero_SAC}`);
        const data = await res.json();
        if (data.consultas) {
          todasLasConsultas = [...todasLasConsultas, ...data.consultas];
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
    setNuevaConsulta(prev => ({ ...prev, [name]: value }));
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
        }),
      });

      const resultado = await response.json();
      if (resultado.success) {
        setMensajeConsultas('✅ Consulta agregada correctamente');
        setNuevaConsulta({
          fecha: new Date().toISOString().split('T')[0],
          numeroSAC: '',
          notas: '',
        });
        setMostrarFormularioConsultas(false);
        cargarConsultas();
      } else {
        setMensajeConsultas('❌ Error al agregar consulta: ' + (resultado.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error en handleSubmitConsulta:', error);
      setMensajeConsultas('❌ Error: ' + error.message);
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
    setNuevoExpediente(prev => ({ ...prev, [name]: value }));
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
        setNuevoExpediente({ Numero_SAC: '', Caratula: '', Fuero: '' });
        setMostrarFormulario(false);
        setTimeout(() => router.reload(), 1500);
      } else {
        setMensaje('❌ Error al agregar el expediente: ' + (resultado.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('❌ Error en handleSubmit:', error);
      setMensaje('❌ Error: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const listarArchivos = async (folderId) => {
    try {
      const response = await fetch(`/api/drive/listar?folderId=${folderId}`);
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

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BotonInicio />
          <div>
            <h1 style={{ marginBottom: '5px' }}>👤 {cliente.Nombre_Cliente}</h1>
            <p style={{ color: '#4a5568', margin: 0 }}>
              ID: {cliente.ID_Cliente} | Teléfono: {cliente.Telefono || 'No registrado'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href={`/clientes/${cliente.ID_Cliente}/editar`}>
            <button style={{ backgroundColor: '#ed8936' }}>✏️ Editar</button>
          </a>
          <button onClick={volver} style={{ backgroundColor: '#718096' }}>← Volver</button>
        </div>
      </div>

      {/* Pestañas */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('datos')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'datos' ? '#3182ce' : 'transparent',
            color: activeTab === 'datos' ? 'white' : '#4a5568',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📋 Datos
        </button>
        <button
          onClick={() => setActiveTab('expedientes')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'expedientes' ? '#3182ce' : 'transparent',
            color: activeTab === 'expedientes' ? 'white' : '#4a5568',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📄 Expedientes ({expedientes.length})
        </button>
        <button
          onClick={() => setActiveTab('consultas')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'consultas' ? '#3182ce' : 'transparent',
            color: activeTab === 'consultas' ? 'white' : '#4a5568',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📝 Consultas
        </button>
        <button
          onClick={() => setActiveTab('finanzas')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'finanzas' ? '#3182ce' : 'transparent',
            color: activeTab === 'finanzas' ? 'white' : '#4a5568',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          💰 Finanzas
        </button>
      </div>

      {/* Contenido de las pestañas */}
      <div style={{ minHeight: '300px' }}>
        {activeTab === 'datos' && (
          <div>
            <h2>📋 Datos Generales</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
              <div><strong>ID Cliente:</strong> {cliente.ID_Cliente}</div>
              <div><strong>Nombre:</strong> {cliente.Nombre_Cliente}</div>
              <div><strong>Teléfono:</strong> {cliente.Telefono || 'No registrado'}</div>
              <div><strong>DNI:</strong> {cliente.DNI || 'No registrado'}</div>
              <div><strong>Domicilio:</strong> {cliente.Domicilio || 'No registrado'}</div>
              <div><strong>ID Carpeta Drive:</strong> {cliente.ID_Carpeta_Drive || 'No asignada'}</div>
              <div><strong>Usuarios Compartidos:</strong> {cliente.Usuarios_Compartidos || 'Ninguno'}</div>
            </div>
          </div>
        )}

        {activeTab === 'expedientes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>📄 Expedientes del Cliente</h2>
              <button onClick={() => setMostrarFormulario(!mostrarFormulario)} style={{ backgroundColor: '#38a169' }}>
                + Agregar Expediente
              </button>
            </div>

            {mostrarFormulario && (
              <div style={{ backgroundColor: '#f7fafc', padding: '20px', borderRadius: '8px', marginTop: '15px', marginBottom: '20px' }}>
                <h3>Nuevo Expediente</h3>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label><strong>N° SAC *</strong></label>
                      <input
                        type="text"
                        name="Numero_SAC"
                        value={nuevoExpediente.Numero_SAC}
                        onChange={handleChange}
                        placeholder="Ej: 123456"
                        required
                      />
                    </div>
                    <div>
                      <label><strong>Carátula *</strong></label>
                      <input
                        type="text"
                        name="Caratula"
                        value={nuevoExpediente.Caratula}
                        onChange={handleChange}
                        placeholder="Ej: Lopez c/ Molina"
                        required
                      />
                    </div>
                    <div>
                      <label><strong>Fuero</strong></label>
                      <input
                        type="text"
                        name="Fuero"
                        value={nuevoExpediente.Fuero}
                        onChange={handleChange}
                        placeholder="Ej: Civil, Laboral, Familia"
                      />
                    </div>
                  </div>
                  {mensaje && (
                    <div style={{ marginTop: '15px', padding: '10px', borderRadius: '8px', backgroundColor: mensaje.includes('✅') ? '#c6f6d5' : '#fed7d7', color: mensaje.includes('✅') ? '#22543d' : '#9b2c2c' }}>
                      {mensaje}
                    </div>
                  )}
                  <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                    <button type="submit" style={{ backgroundColor: '#3182ce' }} disabled={cargando}>
                      {cargando ? 'Guardando...' : 'Guardar Expediente'}
                    </button>
                    <button type="button" onClick={() => { setMostrarFormulario(false); setMensaje(''); }} style={{ backgroundColor: '#718096' }}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {expedientes.length === 0 ? (
              <p style={{ color: '#4a5568' }}>Este cliente no tiene expedientes cargados.</p>
            ) : (
              <div>
                {expedientes.map((exp, index) => (
                  <div 
                    key={index}
                    style={{ 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px', 
                      padding: '15px', 
                      marginBottom: '15px',
                      backgroundColor: '#f7fafc',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => router.push(`/expediente/${exp.Numero_SAC}`)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#edf2f7'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>N° SAC:</strong> {exp.Numero_SAC || 'No registrado'}<br />
                        <strong>Carátula:</strong> {exp.Caratula || 'No registrada'}<br />
                        <strong>Fuero:</strong> {exp.Fuero || 'No registrado'}
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {exp.ID_Carpeta_Drive && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              listarArchivos(exp.ID_Carpeta_Drive);
                            }}
                            style={{ backgroundColor: '#3182ce', padding: '5px 10px', fontSize: '0.8rem' }}
                          >
                            📂 Ver Archivos
                          </button>
                        )}
                        <span style={{ color: '#4a5568', fontSize: '0.8rem' }}>▶</span>
                      </div>
                    </div>
                    {mostrarArchivos && folderIdActual === exp.ID_Carpeta_Drive && archivos.length > 0 && (
                      <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
                        <strong>Archivos en la carpeta:</strong>
                        <ul style={{ listStyle: 'none', padding: 0, marginTop: '5px' }}>
                          {archivos.map((file) => (
                            <li key={file.id} style={{ padding: '5px 0', borderBottom: '1px solid #e2e8f0' }}>
                              📄 {file.name}
                              <a 
                                href={`/api/drive/descargar?fileId=${file.id}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ marginLeft: '10px', color: '#3182ce' }}
                              >
                                Descargar
                              </a>
                            </li>
                          ))}
                        </ul>
                        <button 
                          onClick={() => { setMostrarArchivos(false); setArchivos([]); setFolderIdActual(''); }}
                          style={{ marginTop: '10px', backgroundColor: '#718096', padding: '5px 10px', fontSize: '0.8rem' }}
                        >
                          Cerrar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'consultas' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>📝 Historial de Consultas</h2>
              <button 
                onClick={() => setMostrarFormularioConsultas(!mostrarFormularioConsultas)}
                style={{ backgroundColor: '#38a169' }}
              >
                + Agregar Consulta
              </button>
            </div>

            {/* Formulario para nueva consulta */}
            {mostrarFormularioConsultas && (
              <div style={{
                backgroundColor: '#f7fafc',
                padding: '20px',
                borderRadius: '8px',
                marginTop: '15px',
                marginBottom: '20px',
                border: '1px solid #e2e8f0'
              }}>
                <h3>📝 Nueva Consulta</h3>
                <form onSubmit={handleSubmitConsulta}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label><strong>Fecha</strong></label>
                      <input
                        type="date"
                        name="fecha"
                        value={nuevaConsulta.fecha}
                        onChange={handleChangeConsulta}
                      />
                    </div>
                    <div>
                      <label><strong>Expediente (N° SAC)</strong></label>
                      <select
                        name="numeroSAC"
                        value={nuevaConsulta.numeroSAC}
                        onChange={handleChangeConsulta}
                        style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      >
                        <option value="">Sin expediente</option>
                        {expedientes.map((exp, idx) => (
                          <option key={idx} value={exp.Numero_SAC}>
                            {exp.Numero_SAC} - {exp.Caratula}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: '15px' }}>
                    <label><strong>Notas de la consulta *</strong></label>
                    <textarea
                      name="notas"
                      value={nuevaConsulta.notas}
                      onChange={handleChangeConsulta}
                      placeholder="Escribí lo que hablaste con el cliente y tu estrategia..."
                      style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', minHeight: '120px' }}
                      required
                    />
                  </div>
                  {mensajeConsultas && (
                    <div style={{ 
                      marginTop: '15px', 
                      padding: '10px', 
                      borderRadius: '8px', 
                      backgroundColor: mensajeConsultas.includes('✅') ? '#c6f6d5' : '#fed7d7', 
                      color: mensajeConsultas.includes('✅') ? '#22543d' : '#9b2c2c' 
                    }}>
                      {mensajeConsultas}
                    </div>
                  )}
                  <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                    <button type="submit" style={{ backgroundColor: '#3182ce' }} disabled={cargandoConsultas}>
                      {cargandoConsultas ? 'Guardando...' : 'Guardar Consulta'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setMostrarFormularioConsultas(false); setMensajeConsultas(''); }} 
                      style={{ backgroundColor: '#718096' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Lista de consultas */}
            {consultas.length === 0 ? (
              <p style={{ color: '#4a5568' }}>No hay consultas registradas para este cliente.</p>
            ) : (
              <div>
                {consultas.map((consulta, index) => {
                  const estaExpandida = expandidosConsultas[index] || false;
                  const resumen = consulta.Notas_Consulta?.substring(0, 150) || '';
                  const tieneMas = consulta.Notas_Consulta && consulta.Notas_Consulta.length > 150;

                  return (
                    <div
                      key={index}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '15px',
                        marginBottom: '10px',
                        backgroundColor: '#f7fafc',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => {
                        setExpandidosConsultas(prev => ({
                          ...prev,
                          [index]: !prev[index]
                        }));
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#edf2f7'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{consulta.Fecha || 'Sin fecha'}</strong>
                          {consulta.Numero_SAC && (
                            <span style={{ marginLeft: '10px', backgroundColor: '#3182ce', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem' }}>
                              SAC: {consulta.Numero_SAC}
                            </span>
                          )}
                          {consulta.Abogado_Atendio && (
                            <span style={{ marginLeft: '10px', color: '#4a5568', fontSize: '0.8rem' }}>
                              👤 {consulta.Abogado_Atendio}
                            </span>
                          )}
                        </div>
                        <span style={{ color: '#4a5568', fontSize: '0.8rem' }}>
                          {estaExpandida ? '▲' : '▼'}
                        </span>
                      </div>
                      <div style={{ marginTop: '8px', color: '#4a5568', fontSize: '0.95rem' }}>
                        {resumen}
                        {tieneMas && !estaExpandida && (
                          <span style={{ color: '#3182ce', marginLeft: '5px' }}>... <em>clic para leer más</em></span>
                        )}
                      </div>
                      {estaExpandida && consulta.Notas_Consulta && (
                        <div style={{ 
                          marginTop: '12px', 
                          paddingTop: '12px', 
                          borderTop: '1px solid #e2e8f0',
                          whiteSpace: 'pre-wrap',
                          fontSize: '0.95rem',
                          backgroundColor: 'white',
                          padding: '12px',
                          borderRadius: '4px'
                        }}>
                          {consulta.Notas_Consulta}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'finanzas' && (
          <div>
            <h2>💰 Finanzas</h2>
            
            {/* Saldo actual */}
            <div style={{
              backgroundColor: '#f7fafc',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              gap: '30px',
              flexWrap: 'wrap'
            }}>
              <div><strong>Total Adeudado:</strong> ${saldo.totalDebe.toFixed(2)}</div>
              <div><strong>Total Pagado:</strong> ${saldo.totalHaber.toFixed(2)}</div>
              <div><strong>Saldo:</strong> 
                <span style={{ color: saldo.saldo > 0 ? '#e53e3e' : '#38a169' }}>
                  ${saldo.saldo.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Formulario para nuevo movimiento */}
            <button 
              onClick={() => setMostrarFormularioFinanzas(!mostrarFormularioFinanzas)}
              style={{ backgroundColor: '#38a169', marginBottom: '20px' }}
            >
              + Agregar Movimiento
            </button>

            {mostrarFormularioFinanzas && (
              <div style={{
                backgroundColor: '#f7fafc',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #e2e8f0'
              }}>
                <h3>Nuevo Movimiento</h3>
                <form onSubmit={handleSubmitFinanzas}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label><strong>Fecha *</strong></label>
                      <input
                        type="date"
                        name="fecha"
                        value={nuevoMovimiento.fecha}
                        onChange={handleChangeFinanzas}
                        required
                      />
                    </div>
                    <div>
                      <label><strong>Categoría</strong></label>
                      <select
                        name="categoria"
                        value={nuevoMovimiento.categoria}
                        onChange={handleChangeFinanzas}
                        style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      >
                        <option value="Honorarios">Honorarios</option>
                        <option value="Caja_Abogados">Caja de Abogados</option>
                        <option value="Colegio_Abogados">Colegio de Abogados</option>
                      </select>
                    </div>
                    <div>
                      <label><strong>Tipo *</strong></label>
                      <select
                        name="tipo"
                        value={nuevoMovimiento.tipo}
                        onChange={handleChangeFinanzas}
                        style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                        required
                      >
                        <option value="Honorario">Honorario</option>
                        <option value="Cuota">Cuota</option>
                        <option value="Pago">Pago</option>
                        <option value="Aporte">Aporte</option>
                      </select>
                    </div>
                    <div>
                      <label><strong>Estado</strong></label>
                      <select
                        name="estado"
                        value={nuevoMovimiento.estado}
                        onChange={handleChangeFinanzas}
                        style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="Pagado">Pagado</option>
                        <option value="Parcial">Parcial</option>
                      </select>
                    </div>
                    <div>
                      <label><strong>Monto Total</strong></label>
                      <input
                        type="number"
                        step="0.01"
                        name="montoTotal"
                        value={nuevoMovimiento.montoTotal}
                        onChange={handleChangeFinanzas}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label><strong>Monto Pagado</strong></label>
                      <input
                        type="number"
                        step="0.01"
                        name="montoPagado"
                        value={nuevoMovimiento.montoPagado}
                        onChange={handleChangeFinanzas}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '15px' }}>
                    <label><strong>Concepto</strong></label>
                    <textarea
                      name="concepto"
                      value={nuevoMovimiento.concepto}
                      onChange={handleChangeFinanzas}
                      placeholder="Descripción del movimiento..."
                      style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', minHeight: '60px' }}
                    />
                  </div>
                  {mensajeFinanzas && (
                    <div style={{ 
                      marginTop: '15px', 
                      padding: '10px', 
                      borderRadius: '8px', 
                      backgroundColor: mensajeFinanzas.includes('✅') ? '#c6f6d5' : '#fed7d7', 
                      color: mensajeFinanzas.includes('✅') ? '#22543d' : '#9b2c2c' 
                    }}>
                      {mensajeFinanzas}
                    </div>
                  )}
                  <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                    <button type="submit" style={{ backgroundColor: '#3182ce' }} disabled={cargandoFinanzas}>
                      {cargandoFinanzas ? 'Guardando...' : 'Guardar Movimiento'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setMostrarFormularioFinanzas(false); setMensajeFinanzas(''); }} 
                      style={{ backgroundColor: '#718096' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Lista de movimientos */}
            <h3>📋 Historial de Movimientos</h3>
            {movimientos.length === 0 ? (
              <p style={{ color: '#4a5568' }}>No hay movimientos registrados para este cliente.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#edf2f7' }}>
                    <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Fecha</th>
                    <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Categoría</th>
                    <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Tipo</th>
                    <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Concepto</th>
                    <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>Pagado</th>
                    <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((mov, index) => {
                    const total = parseFloat(mov.Monto_Total) || 0;
                    const pagado = parseFloat(mov.Monto_Pagado) || 0;
                    return (
                      <tr key={index}>
                        <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{mov.Fecha || ''}</td>
                        <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{mov.Categoria || ''}</td>
                        <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{mov.Tipo || ''}</td>
                        <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{mov.Concepto || ''}</td>
                        <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                          ${total.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                          ${pagado.toFixed(2)}
                        </td>
                        <td style={{ 
                          padding: '10px', 
                          border: '1px solid #e2e8f0', 
                          textAlign: 'center',
                          color: mov.Estado === 'Pagado' ? '#38a169' : mov.Estado === 'Parcial' ? '#ed8936' : '#e53e3e'
                        }}>
                          {mov.Estado || 'Pendiente'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
