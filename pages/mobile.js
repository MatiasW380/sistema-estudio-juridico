// pages/mobile.js
// Versión móvil - Llama al endpoint /api/mobile-datos

import { useState, useEffect } from 'react';

export default function MobilePage() {
  const [clientes, setClientes] = useState([]);
  const [expedientes, setExpedientes] = useState([]);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch('/api/mobile-datos');
        const data = await res.json();
        
        if (res.ok) {
          setClientes(data.clientes || []);
          setExpedientes(data.expedientes || []);
          setError('');
        } else {
          setError(data.error || 'Error cargando datos');
        }
      } catch (e) {
        setError('Error: ' + e.message);
      }
      setLoading(false);
    };
    cargar();
  }, []);

  if (loading) {
    return <div style={{ padding: '15px' }}>Cargando...</div>;
  }

  if (error) {
    return <div style={{ padding: '15px', color: 'red' }}>❌ {error}</div>;
  }

  if (clientes.length === 0) {
    return <div style={{ padding: '15px' }}>No hay clientes.</div>;
  }

  const clientesFiltrados = clientes.filter((cli) =>
    cli.toLowerCase().includes(filtroCliente.toLowerCase())
  );

  const juzgadosDelCliente = clienteSeleccionado
    ? [...new Set(
        expedientes
          .filter((e) => e.cliente === clienteSeleccionado)
          .map((e) => e.juzgado)
          .filter(Boolean)
      )].sort()
    : [];

  const expedientesCliente = clienteSeleccionado
    ? expedientes.filter((e) => e.cliente === clienteSeleccionado)
    : [];

  return (
    <div style={{ padding: '15px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '18px', marginBottom: '20px' }}>📋 Mis Casos</h1>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
          Cliente:
        </label>
        <input
          type="text"
          placeholder="Escribe para filtrar..."
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />

        {filtroCliente && clientesFiltrados.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderTop: 'none',
            borderRadius: '0 0 6px 6px',
            maxHeight: '150px',
            overflowY: 'auto'
          }}>
            {clientesFiltrados.map((cli) => (
              <div
                key={cli}
                onClick={() => {
                  setClienteSeleccionado(cli);
                  setFiltroCliente(cli);
                }}
                style={{
                  padding: '10px',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {cli}
              </div>
            ))}
          </div>
        )}
      </div>

      {clienteSeleccionado && juzgadosDelCliente.length > 0 && (
        <div>
          <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
            Juzgados:
          </label>
          {juzgadosDelCliente.map((juz) => {
            const expedientesJuz = expedientesCliente.filter((e) => e.juzgado === juz);
            return (
              <div
                key={juz}
                style={{
                  backgroundColor: '#f9f9f9',
                  padding: '10px',
                  marginBottom: '8px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '13px'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#1e40af' }}>
                  ⚖️ {juz}
                </div>
                {expedientesJuz.map((exp) => (
                  <div key={exp.sac} style={{ fontSize: '12px', marginTop: '5px', paddingLeft: '10px' }}>
                    <div style={{ color: '#333' }}>📄 {exp.sac}</div>
                    {exp.caratula && <div style={{ color: '#666', fontSize: '11px' }}>{exp.caratula}</div>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
