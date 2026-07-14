// pages/clientes/[id].js
// Ficha completa del cliente con pestañas

import { useState } from 'react';
import { useRouter } from 'next/router';
import { getClientes } from '../../lib/googleSheets';

// Esta función se ejecuta en el servidor
export async function getServerSideProps(context) {
  const { id } = context.params;
  try {
    const clientes = await getClientes();
    const cliente = clientes.find(c => c.ID_Cliente === id);
    if (!cliente) {
      return { notFound: true };
    }
    return {
      props: {
        cliente,
      },
    };
  } catch (error) {
    console.error('Error al cargar cliente:', error);
    return { notFound: true };
  }
}

// Componente principal de la ficha
export default function FichaCliente({ cliente }) {
  const [activeTab, setActiveTab] = useState('datos');
  const router = useRouter();

  // Si no hay cliente, mostrar mensaje
  if (!cliente) {
    return (
      <div className="container">
        <h1>Cliente no encontrado</h1>
        <a href="/clientes">← Volver a la lista</a>
      </div>
    );
  }

  // Función para volver a la lista de clientes
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
          📄 Expedientes
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
              <div><strong>N° SAC:</strong> {cliente.Numero_SAC || 'No registrado'}</div>
              <div><strong>Carátula:</strong> {cliente.Caratula || 'No registrada'}</div>
              <div><strong>Fuero:</strong> {cliente.Fuero || 'No registrado'}</div>
            </div>
            <div style={{ marginTop: '20px' }}>
              <p><strong>ID Carpeta Drive:</strong> {cliente.ID_Carpeta_Drive || 'No asignada'}</p>
              <p><strong>Usuarios Compartidos:</strong> {cliente.Usuarios_Compartidos || 'Ninguno'}</p>
            </div>
          </div>
        )}

        {activeTab === 'expedientes' && (
          <div>
            <h2>📄 Expedientes</h2>
            <p style={{ color: '#4a5568', marginBottom: '15px' }}>
              Aquí se listarán los archivos PDF del SAC y documentos extra del cliente.
            </p>
            <div style={{
              backgroundColor: '#f7fafc',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#4a5568'
            }}>
              <p>🔜 Próximamente: integración con Google Drive para listar archivos.</p>
              <p style={{ fontSize: '0.9rem' }}>Podrás subir, ver y descargar PDFs de este cliente.</p>
            </div>
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
