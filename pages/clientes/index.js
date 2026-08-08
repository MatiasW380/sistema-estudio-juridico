// pages/clientes/index.js
// Página para listar clientes con buscador y eliminar

import { useState } from 'react';
import { useRouter } from 'next/router';
import { getClientes } from '../../lib/googleSheets';
import BotonInicio from '../../components/BotonInicio';

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
  const [eliminando, setEliminando] = useState(null);
  const router = useRouter();

  const handleBuscar = async () => {
    if (!terminoBusqueda.trim()) {
      setClientes(clientesIniciales);
      return;
    }

    setCargando(true);
    try {
      const response = await fetch(`/api/buscar-clientes?q=${encodeURIComponent(terminoBusqueda)}`);
      const data = await response.json();
      setClientes(data.clientes || []);
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

  const eliminarCliente = async (id, nombre) => {
    if (!confirm(`¿Estás seguro de eliminar al cliente "${nombre}" y todos sus expedientes?`)) {
      return;
    }

    setEliminando(id);
    try {
      const response = await fetch(`/api/eliminar?tipo=cliente&id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      
      if (data.success) {
        alert('Cliente eliminado correctamente');
        router.reload();
      } else {
        alert(data.error || 'Error al eliminar el cliente');
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar el cliente');
    } finally {
      setEliminando(null);
    }
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ marginBottom: '4px' }}>Clientes</h1>
        <p>Gestión de clientes y expedientes asociados</p>
      </div>

      {/* Buscador y acciones */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={terminoBusqueda}
          onChange={(e) => setTerminoBusqueda(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Buscar por nombre, DNI, teléfono, N° SAC o carátula..."
          style={{ flex: 1, minWidth: '200px' }}
        />
        <button onClick={handleBuscar} disabled={cargando}>
          {cargando ? 'Buscando...' : 'Buscar'}
        </button>
        <button onClick={() => { setTerminoBusqueda(''); setClientes(clientesIniciales); }} className="button-secondary">
          Limpiar
        </button>
        <button 
          onClick={() => router.push('/clientes/nuevo')}
          style={{ backgroundColor: '#16a34a' }}
        >
          + Nuevo Cliente
        </button>
      </div>

      {clientes.length === 0 ? (
        <div className="table-empty">
          <div className="table-empty-icon">📋</div>
          <div className="table-empty-text">No hay clientes</div>
          <div className="table-empty-subtext">Crea un nuevo cliente para comenzar</div>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>DNI</th>
              <th>Domicilio</th>
              <th className="numeric">Expedientes</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => (
              <tr key={cliente.ID_Cliente}>
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
                <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
                  <button
                    onClick={() => eliminarCliente(cliente.ID_Cliente, cliente.Nombre_Cliente)}
                    style={{
                      backgroundColor: '#e53e3e',
                      padding: '5px 10px',
                      fontSize: '0.8rem',
                      opacity: eliminando === cliente.ID_Cliente ? 0.7 : 1,
                      cursor: eliminando === cliente.ID_Cliente ? 'not-allowed' : 'pointer'
                    }}
                    disabled={eliminando === cliente.ID_Cliente}
                  >
                    {eliminando === cliente.ID_Cliente ? 'Eliminando...' : '🗑️ Eliminar'}
                  </button>
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
