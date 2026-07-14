// pages/clientes/index.js
const { getClientes } = require('../../lib/googleSheets');

export async function getServerSideProps() {
  try {
    const clientes = await getClientes();
    return {
      props: {
        clientes,
        error: null,
      },
    };
  } catch (error) {
    console.error('Error en getServerSideProps:', error);
    return {
      props: {
        clientes: [],
        error: 'Error al cargar los clientes: ' + error.message,
      },
    };
  }
}

export default function ClientesPage({ clientes, error }) {
  return (
    <div className="container">
      <h1>👥 Clientes</h1>
      <p style={{ marginBottom: '20px', color: '#4a5568' }}>
        Lista de clientes cargada desde Google Sheets
      </p>

      {error && (
        <div style={{ backgroundColor: '#fed7d7', color: '#9b2c2c', padding: '15px', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {!error && (
        <>
          {clientes.length === 0 ? (
            <p>No hay clientes cargados en la planilla.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
              <thead>
                <tr style={{ backgroundColor: '#edf2f7' }}>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Nombre</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Teléfono</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>N° SAC</th>
                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Carátula</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente, index) => (
                  <tr key={index}>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{cliente.ID_Cliente || ''}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{cliente.Nombre_Cliente || ''}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{cliente.Telefono || ''}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{cliente.Numero_SAC || ''}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{cliente.Caratula || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      <div style={{ marginTop: '20px' }}>
        <a href="/" style={{ color: '#3182ce', textDecoration: 'none' }}>← Volver al inicio</a>
      </div>
    </div>
  );
}
