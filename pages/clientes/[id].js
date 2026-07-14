// pages/clientes/[id].js
// Ficha completa del cliente con pestañas

import { useState } from 'react';
import { useRouter } from 'next/router';
import { getClientes } from '../../lib/googleSheets';

// Esta función se ejecuta en el servidor
export async function getServerSideProps(context) {
  const { id } = context.params;
  try {
    // Obtener todos los clientes
    const todosLosClientes = await getClientes();
    
    // Buscar el cliente por ID
    const cliente = todosLosClientes.find(c => c.ID_Cliente === id);
    if (!cliente) {
      return { notFound: true };
    }

    // Obtener TODOS los expedientes de este cliente (mismo ID_Cliente)
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
            <h2>📄 Expedientes del Cliente</h2>
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
