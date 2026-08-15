// pages/mobile.js
// Versión móvil simplificada

import { useState, useEffect } from 'react';

export default function MobilePage() {
  const [clientes, setClientes] = useState([]);
  const [expedientes, setExpedientes] = useState([]);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [juzgadoSeleccionado, setJuzgadoSeleccionado] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch('/api/mobile-datos');
        const data = await res.json();
        
        if (res.ok) {
          const clientesUnicos = [...new Set(data.clientes || [])];
          setClientes(clientesUnicos);
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

  const expedientesFiltered = clienteSeleccionado
    ? expedientes.filter((e) => 
        e.cliente === clienteSeleccionado && 
        (juzgadoSeleccionado ? e.juzgado === juzgadoSeleccionado : true)
      )
    : [];

  return (
    <div style={{ padding: '15px', fontFamily: 'system-ui, sans-serif', maxWidth: '100%' }}>
      <h1 style={{ fontSize: '18px', marginBottom: '20px' }}>📋 Mis Casos</h1>

      {!clienteSeleccionado ? (
        // PANTALLA 1: Seleccionar cliente
        <div>
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
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {clientesFiltrados.map((cli) => (
                <div
                  key={cli}
                  onClick={() => {
                    setClienteSeleccionado(cli);
                    setFiltroCliente('');
                    setJuzgadoSeleccionado('');
                  }}
                  style={{
                    padding: '10px',
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer',
                    fontSize: '14px',
                    backgroundColor: '#fff'
                  }}
                >
                  {cli}
                </div>
              ))}
            </div>
          )}

          {filtroCliente && clientesFiltrados.length === 0 && (
            <p style={{ color: '#999', marginTop: '10px' }}>No hay coincidencias</p>
          )}
        </div>
      ) : (
        // PANTALLA 2: Ver expedientes del cliente seleccionado
        <div>
          <button
            onClick={() => {
              setClienteSeleccionado('');
              setFiltroCliente('');
              setJuzgadoSeleccionado('');
            }}
            style={{
              marginBottom: '15px',
              padding: '8px 12px',
              backgroundColor: '#718096',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← Atrás
          </button>

          <h2 style={{ fontSize: '16px', marginBottom: '15px', color: '#1e40af' }}>
            {clienteSeleccionado}
          </h2>

          {/* Filtro de juzgados */}
          {juzgadosDelCliente.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                Filtrar por juzgado:
              </label>
              <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => setJuzgadoSeleccionado('')}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: juzgadoSeleccionado === '' ? '#1e40af' : '#e2e8f0',
                    color: juzgadoSeleccionado === '' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Todos ({juzgadosDelCliente.length})
                </button>
                {juzgadosDelCliente.map((juz) => {
                  const countExp = expedientes.filter(e => e.cliente === clienteSeleccionado && e.juzgado === juz).length;
                  return (
                    <button
                      key={juz}
                      onClick={() => setJuzgadoSeleccionado(juz)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: juzgadoSeleccionado === juz ? '#1e40af' : '#e2e8f0',
                        color: juzgadoSeleccionado === juz ? 'white' : '#333',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {juz} ({countExp})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lista de expedientes */}
          {expedientesFiltered.length > 0 ? (
            <div>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
                {expedientesFiltered.length} expediente{expedientesFiltered.length !== 1 ? 's' : ''}
              </p>
              {expedientesFiltered.map((exp) => (
                <div
                  key={exp.sac}
                  style={{
                    backgroundColor: '#f9f9f9',
                    padding: '12px',
                    marginBottom: '10px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '13px'
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#1e40af', marginBottom: '5px' }}>
                    📄 {exp.sac}
                  </div>
                  {exp.caratula && (
                    <div style={{ color: '#333', marginBottom: '5px', fontSize: '13px' }}>
                      {exp.caratula}
                    </div>
                  )}
                  {exp.juzgado && (
                    <div style={{ color: '#666', fontSize: '12px', marginBottom: '3px' }}>
                      ⚖️ {exp.juzgado}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666' }}>No hay expedientes para este filtro.</p>
          )}
        </div>
      )}
    </div>
  );
}
