// pages/clientes/[id].js
// Ficha completa del cliente con pestañas y formulario para agregar expediente

import { useState } from 'react';
import { useRouter } from 'next/router';
import { getClientes, appendToSheet } from '../../lib/googleSheets';

// Esta función se ejecuta en el servidor
export async function getServerSideProps(context) {
  const { id } = context.params;
  try {
    const todosLosClientes = await getClientes();
    const cliente = todosLosClientes.find(c => c.ID_Cliente === id);
    if (!cliente) {
      return { notFound: true };
    }

    const expedientes = todosLosClientes.filter(c => c.ID_Cliente === id);

    return {
      props: {
        cliente,
        expedientes,
      },
    };
  } catch (error) {
    console.error('Error al cargar cliente:', error);
    return { notFound: true };
  }
}

// Componente principal de la ficha
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
  const router = useRouter();

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
      console.log('📦 Preparando datos para appendToSheet...');
      console.log('Cliente ID:', cliente.ID_Cliente);
      console.log('Nombre:', cliente.Nombre_Cliente);
      console.log('Teléfono:', cliente.Telefono);
      console.log('Nuevo SAC:', nuevoExpediente.Numero_SAC);
      console.log('Nueva Carátula:', nuevoExpediente.Caratula);
      console.log('Nuevo Fuero:', nuevoExpediente.Fuero);

      const fila = [
        cliente.ID_Cliente,
        cliente.Nombre_Cliente,
        cliente.Telefono || '',
        nuevoExpediente.Numero_SAC,
        nuevoExpediente.Caratula,
        nuevoExpediente.Fuero || '',
        '',
        cliente.Usuarios_Compartidos || '',
      ];

      console.log('📤 Enviando fila:', fila);

      const resultado = await appendToSheet('Clientes_y_Expedientes', fila);
      console.log('📥 Resultado de appendToSheet:', resultado);

      if (resultado) {
        setMensaje('✅ Expediente agregado correctamente');
        setNuevoExpediente({ Numero_SAC: '', Caratula: '', Fuero: '' });
        setMostrarFormulario(false);
        setTimeout(() => router.reload(), 1500);
      } else {
        setMensaje('❌ Error al agregar el expediente. Revisá los logs.');
      }
    } catch (error) {
      console.error('❌ Error en handleSubmit:', error);
      setMensaje('❌ Error: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="container">
      {/* Encabezado con datos básicos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ marginBottom: '5px' }}>
            👤 {cliente.Nombre_Cliente}
          </h1>
          <p style={{ color: '#4a5568', margin: 0 }}>
            ID: {cliente.ID_Cliente} | Teléfono: {cliente.Telefono || 'No registrado'}
          </p>
        </div>
        <button onClick={volver} style={{ backgroundColor: '#718096' }}>
          ← Volver
        </button>
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
              <div><strong>ID Carpeta Drive:</strong> {cliente.ID_Carpeta_Drive || 'No asignada'}</div>
              <div><strong>Usuarios Compartidos:</strong> {cliente.Usuarios_Compartidos || 'Ninguno'}</div>
            </div>
          </div>
        )}

        {activeTab === 'expedientes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>📄 Expedientes del Cliente</h2>
              <button 
                onClick={() => setMostrarFormulario(!mostrarFormulario)}
                style={{ backgroundColor: '#38a169' }}
              >
                + Agregar Expediente
              </button>
            </div>

            {mostrarFormulario && (
              <div style={{
                backgroundColor: '#f7fafc',
                padding: '20px',
                borderRadius: '8px',
                marginTop: '15px',
                marginBottom: '20px'
              }}>
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
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#edf2f7' }}>
                    <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>N° SAC</th>
                    <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Carátula</th>
                    <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Fuero</th>
                  </tr>
                </thead>
                <tbody>
                  {expedientes.map((exp, index) => (
                    <tr key={index}>
                      <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{exp.Numero_SAC || 'No registrado'}</td>
                      <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{exp.Caratula || 'No registrada'}</td>
                      <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{exp.Fuero || 'No registrado'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'consultas' && (
          <div>
            <h2>📝 Historial de Consultas</h2>
            <p style={{ color: '#4a5568', marginBottom: '15px' }}>
              Registro de reuniones y conversaciones con el cliente.
            </p>
            <div style={{
              backgroundColor: '#f7fafc',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#4a5568'
            }}>
              <p>🔜 Próximamente: carga y visualización de consultas.</p>
              <p style={{ fontSize: '0.9rem' }}>Podrás agregar notas de cada reunión con fecha y abogado que atendió.</p>
            </div>
          </div>
        )}

        {activeTab === 'finanzas' && (
          <div>
            <h2>💰 Finanzas</h2>
            <p style={{ color: '#4a5568', marginBottom: '15px' }}>
              Control de honorarios, pagos y gastos del cliente.
            </p>
            <div style={{
              backgroundColor: '#f7fafc',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#4a5568'
            }}>
              <p>🔜 Próximamente: registro de honorarios, cuotas, pagos y gastos.</p>
              <p style={{ fontSize: '0.9rem' }}>Podrás generar reportes por períodos.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
