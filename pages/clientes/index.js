// pages/clientes/index.js
// Página para listar clientes con buscador y eliminar

import { useState } from 'react';
import { useRouter } from 'next/router';
import { getClientes } from '../../lib/googleSheets';
import { ChevronRight, Plus, Search, Trash2, X } from 'lucide-react';

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

  const iniciales = (nombre = '') =>
    nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('') || '?';

  return (
    <div className="container lx-page">
      <div className="lx-page-head">
        <div>
          <h1>Clientes <span className="lx-tab-count">{clientesIniciales.length}</span></h1>
          <p>Gestión de clientes y sus expedientes</p>
        </div>
        <button className="button button-sm" onClick={() => router.push('/clientes/nuevo')}>
          <Plus size={15} /> Nuevo cliente
        </button>
      </div>

      <div className="lx-toolbar">
        <div className="lx-search">
          <Search size={16} />
          <input
            type="text"
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Buscar por nombre, DNI o teléfono y presioná Enter"
          />
        </div>
        <button className="button button-secondary button-sm" onClick={handleBuscar} disabled={cargando}>
          {cargando ? 'Buscando…' : 'Buscar'}
        </button>
        {terminoBusqueda && (
          <button className="button button-ghost button-sm" onClick={() => { setTerminoBusqueda(''); setClientes(clientesIniciales); }}>
            <X size={15} /> Limpiar
          </button>
        )}
      </div>

      {clientes.length === 0 ? (
        <div className="lx-empty">
          {terminoBusqueda ? 'No hay clientes que coincidan con la búsqueda.' : 'Todavía no hay clientes. Creá el primero con “Nuevo cliente”.'}
        </div>
      ) : (
        <div className="lx-table-wrap">
          <table className="lx-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>DNI</th>
                <th>Teléfono</th>
                <th>Domicilio</th>
                <th className="numeric">Expedientes</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.ID_Cliente} onClick={() => router.push(`/clientes/${cliente.ID_Cliente}`)}>
                  <td>
                    <div className="lx-cell-person">
                      <span className="lx-avatar lx-avatar-sm">{iniciales(cliente.Nombre_Cliente)}</span>
                      <span className="lx-cell-strong">{cliente.Nombre_Cliente || 'Sin nombre'}</span>
                    </div>
                  </td>
                  <td className="lx-cell-muted">{cliente.DNI || '—'}</td>
                  <td className="lx-cell-muted">{cliente.Telefono || '—'}</td>
                  <td className="lx-cell-muted lx-cell-trunc">{cliente.Domicilio || '—'}</td>
                  <td className="numeric"><span className="lx-tab-count">{cliente.totalExpedientes || 0}</span></td>
                  <td className="lx-cell-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="lx-icon-btn lx-text-danger"
                      onClick={() => eliminarCliente(cliente.ID_Cliente, cliente.Nombre_Cliente)}
                      disabled={eliminando === cliente.ID_Cliente}
                      title="Eliminar cliente"
                      aria-label="Eliminar cliente"
                    >
                      <Trash2 size={15} />
                    </button>
                    <ChevronRight size={16} className="lx-row-chevron" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
