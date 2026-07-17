// pages/expediente/[sac].js
// Página de detalle de un expediente con su feed de actuaciones

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getActuaciones, getClientes } from '../../lib/googleSheets';
import BotonInicio from '../../components/BotonInicio';

export async function getServerSideProps(context) {
  const { sac } = context.params;
  try {
    const clientes = await getClientes();
    let expediente = null;
    let cliente = null;

    for (const c of clientes) {
      const exp = c.expedientes?.find(e => e.Numero_SAC === sac);
      if (exp) {
        expediente = exp;
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

export default function ExpedientePage({ sac, expediente, cliente, actuaciones: actuacionesIniciales }) {
  const [actuaciones, setActuaciones] = useState(actuacionesIniciales || []);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevaActuacion, setNuevaActuacion] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'Escrito',
    origen: 'Yo',
    contenido: '',
    esBorrador: true,
  });
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

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

  const volver = () => {
    router.push(`/clientes/${cliente.ID_Cliente}`);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevaActuacion(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setCargando(true);

    if (!nuevaActuacion.fecha || !nuevaActuacion.tipo || !nuevaActuacion.contenido.trim()) {
      setMensaje('⚠️ Fecha, Tipo y Contenido son obligatorios');
      setCargando(false);
      return;
    }

    try {
      // Obtener el usuario de la cookie
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});
      let creadoPor = 'sistema';
      if (cookies.user) {
        try {
          const userData = JSON.parse(decodeURIComponent(cookies.user));
          creadoPor = userData.email || 'sistema';
        } catch (e) {}
      }

      const datos = {
        numeroSAC: sac,
        fecha: nuevaActuacion.fecha,
        tipo: nuevaActuacion.tipo,
        origen: nuevaActuacion.origen,
        contenido: nuevaActuacion.contenido,
        presentado: false,
        tienePDF: false,
        idPDFDrive: '',
        esBorrador: nuevaActuacion.esBorrador,
        creadoPor: creadoPor,
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
          origen: 'Yo',
          contenido: '',
          esBorrador: true,
        });
        setMostrarFormulario(false);
        // Recargar actuaciones
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

  // Función para obtener el color según el tipo
  const getTipoColor = (tipo) => {
    const colores = {
      'Escrito': '#3182ce',
      'Decreto': '#805ad5',
      'Pericia': '#38a169',
      'Proveído': '#ed8936',
      'Apertura': '#4a5568',
      'Otro': '#718096',
    };
    return colores[tipo] || '#718096';
  };

  // Función para obtener el color según el origen
  const getOrigenColor = (origen) => {
    const colores = {
      'Yo': '#3182ce',
      'Tribunal': '#e53e3e',
      'Otra Parte': '#ed8936',
    };
    return colores[origen] || '#4a5568';
  };

  const toggleFormulario = () => {
    setMostrarFormulario(!mostrarFormulario);
    setMensaje('');
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
        <button style={{ backgroundColor: '#3182ce' }}>🤖 Generar Escrito</button>
        <button style={{ backgroundColor: '#ed8936' }}>📅 Agregar Plazo</button>
        {expediente.ID_Carpeta_Drive && (
          <button style={{ backgroundColor: '#805ad5' }}>📥 Descargar Completo</button>
        )}
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
                  <option value="Escrito">Escrito</option>
                  <option value="Decreto">Decreto</option>
                  <option value="Pericia">Pericia</option>
                  <option value="Proveído">Proveído</option>
                  <option value="Apertura">Apertura</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label><strong>Origen</strong></label>
                <select
                  name="origen"
                  value={nuevaActuacion.origen}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                >
                  <option value="Yo">Yo</option>
                  <option value="Tribunal">Tribunal</option>
                  <option value="Otra Parte">Otra Parte</option>
                </select>
              </div>
              <div>
                <label><strong>Estado</strong></label>
                <select
                  name="esBorrador"
                  value={nuevaActuacion.esBorrador ? 'SI' : 'NO'}
                  onChange={(e) => setNuevaActuacion(prev => ({ ...prev, esBorrador: e.target.value === 'SI' }))}
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                >
                  <option value="SI">Borrador</option>
                  <option value="NO">Presentado</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '15px' }}>
              <label><strong>Contenido *</strong></label>
              <textarea
                name="contenido"
                value={nuevaActuacion.contenido}
                onChange={handleChange}
                placeholder="Escribí el contenido del escrito o resumen..."
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', minHeight: '100px' }}
                required
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
          {actuaciones.map((act, index) => (
            <div
              key={index}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '10px',
                backgroundColor: act.Es_Borrador === 'SI' ? '#fefcbf' : '#f7fafc',
                borderLeft: `4px solid ${getTipoColor(act.Tipo)}`
              }}
            >
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
                  {act.Es_Borrador === 'SI' && act.Presentado !== 'SI' && (
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
                </div>
                <span style={{ color: '#4a5568', fontSize: '0.9rem' }}>{act.Fecha || 'Sin fecha'}</span>
              </div>
              <div style={{ marginTop: '10px', whiteSpace: 'pre-wrap' }}>{act.Contenido || 'Sin contenido'}</div>
              {act.Tiene_PDF === 'SI' && act.ID_PDF_Drive && (
                <div style={{ marginTop: '10px' }}>
                  <a 
                    href={`/api/drive/descargar?fileId=${act.ID_PDF_Drive}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ color: '#3182ce' }}
                  >
                    📎 Ver PDF adjunto
                  </a>
                </div>
              )}
              {act.Creado_Por && (
                <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#4a5568' }}>
                  👤 Creado por: {act.Creado_Por}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
