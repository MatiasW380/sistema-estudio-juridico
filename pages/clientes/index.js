// pages/clientes/index.js
// Página para listar clientes con buscador

import { useState } from 'react';
import { useRouter } from 'next/router';
import { getClientes, buscarClientes } from '../../lib/googleSheets';

export async function getServerSideProps() {
  try {
    const clientes = await getClientes();
    return { props: { clientes: clientes || [] } };
  } catch (error) {
    console.error('Error en getServerSideProps:', error);
    return { props: { clientes: [] } };
  }
}

export default function ClientesPage({ clientes: clientesIniciales }) {
  const [clientes, setClientes] = useState(clientesIniciales);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  const handleBuscar = async () => {
    if (!terminoBusqueda.trim()) {
      setClientes(clientesIniciales);
      return;
    }

    setCargando(true);
    try {
      const resultados = await buscarClientes(terminoBusqueda);
      setClientes(resultados);
    } catch (error) {
      console.error('Error al buscar:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleBuscar();
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>👥 Clientes</h1>
        <button 
          onClick={() => router.push('/clientes/nuevo')}
          style={{ backgroundColor: '#38a169' }}
        >
          + Nuevo Cliente
        </button>
      </div>

      {/* Buscador */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          value={terminoBusqueda}
          onChange={(e) => setTerminoBusqueda(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Buscar por nombre, DNI, teléfono, N° SAC o carátula..."
          style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
        />
        <button onClick={handleBuscar} style={{ backgroundColor: '#3182ce' }} disabled={cargando}>
          {cargando ? 'Buscando...' : '🔍 Buscar'}
        </button>
        <button onClick={() => { setTerminoBusqueda(''); setClientes(clientesIniciales); }} style={{ backgroundColor: '#718096' }}>
          Limpiar
        </button>
      </div>

      {clientes.length === 0 ? (
        <p>No hay clientes cargados en la planilla.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
          <thead>
            <tr style={{ backgroundColor: '#edf2f7' }}>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>ID</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Nombre</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Teléfono</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>DNI</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Domicilio</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Expedientes</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => (
              <tr key={cliente.ID_Cliente} style={{ cursor: 'pointer' }}>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
                  <a href={`/clientes/${cliente.ID_Cliente}`} style={{ color: '#3182ce', textDecoration: 'none' }}>
                    {cliente.ID_Cliente || ''}
                  </a>
                </td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
                  <a href={`/clientes/${cliente.ID_Cliente}`} style={{ color: '#3182ce', textDecoration: 'none' }}>
                    {cliente.Nombre_Cliente || ''}
                  </a>
                </td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{cliente.Telefono || ''}</td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{cliente.DNI || ''}</td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{cliente.Domicilio || ''}</td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
                  {cliente.totalExpedientes || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: '20px' }}>
        <a href="/" style={{ color: '#3182ce', textDecoration: 'none' }}>← Volver al inicio</a>
      </div>
    </div>
  );
}
