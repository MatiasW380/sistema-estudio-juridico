// pages/mobile.js
// Versión móvil - Buscar por cliente O por juzgado

import { useState, useEffect } from 'react';

export default function MobilePage() {
  const [clientes, setClientes] = useState([]);
  const [expedientes, setExpedientes] = useState([]);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroJuzgado, setFiltroJuzgado] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [juzgadoSeleccionado, setJuzgadoSeleccionado] = useState('');
  const [modo, setModo] = useState('cliente'); // 'cliente' o 'juzgado'
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

  // Juzgados únicos
  const juzgadosUnicos = [...new Set(expedientes.map(e => e.juzgado).filter(Boolean))].sort();

  // MODO 1: Buscar por Cliente
  if (modo === 'cliente' && !clienteSeleccionado) {
    const clientesFiltrados = clientes.filter((cli) =>
      cli.toLowerCase().includes(filtroCliente.toLowerCase())
    );

    return (
      <div style={{ padding: '15px', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '18px', marginBottom: '20px' }}>📋 Mis Casos</h1>

        {/* Botones para cambiar modo */}
        <div style={{ marginBottom: '15px', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setModo('cliente')}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#1e40af',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Por Cliente
          </button>
          <button
            onClick={() => setModo('juzgado')}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#e2e8f0',
              color: '#333',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Por Juzgado
          </button>
        </div>

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
    );
  }

  // MODO 1: Ver expedientes del cliente seleccionado
  if (modo === 'cliente' && clienteSeleccionado) {
    const juzgadosDelCliente = [...new Set(
      expedientes
        .filter((e) => e.clienteMostrable === clienteSeleccionado)
        .map((e) => e.juzgado)
        .filter(Boolean)
    )].sort();

    const expedientesFiltered = expedientes.filter((e) => 
      e.clienteMostrable === clienteSeleccionado && 
      (juzgadoSeleccionado ? e.juzgado === juzgadoSeleccionado : true)
    );

    return (
      <div style={{ padding: '15px', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '18px', marginBottom: '20px' }}>📋 Mis Casos</h1>

        <button
          onClick={() => {
            setClienteSeleccionado('');
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

        {juzgadosDelCliente.length > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              Filtrar por juzgado:
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                const countExp = expedientes.filter(e => e.clienteMostrable === clienteSeleccionado && e.juzgado === juz).length;
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
    );
  }

  // MODO 2: Buscar por Juzgado
  if (modo === 'juzgado') {
    const juzgadosFiltrados = juzgadosUnicos.filter(juz =>
      juz.toLowerCase().includes(filtroJuzgado.toLowerCase())
    );

    if (!juzgadoSeleccionado) {
      return (
        <div style={{ padding: '15px', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ fontSize: '18px', marginBottom: '20px' }}>📋 Mis Casos</h1>

          {/* Botones para cambiar modo */}
          <div style={{ marginBottom: '15px', display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setModo('cliente')}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#e2e8f0',
                color: '#333',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Por Cliente
            </button>
            <button
              onClick={() => setModo('juzgado')}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#1e40af',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Por Juzgado
            </button>
          </div>

          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
            Juzgado:
          </label>
          <input
            type="text"
            placeholder="Escribe para filtrar..."
            value={filtroJuzgado}
            onChange={(e) => setFiltroJuzgado(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />

          {filtroJuzgado && juzgadosFiltrados.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderTop: 'none',
              borderRadius: '0 0 6px 6px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {juzgadosFiltrados.map((juz) => {
                const countExp = expedientes.filter(e => e.juzgado === juz).length;
                return (
                  <div
                    key={juz}
                    onClick={() => setJuzgadoSeleccionado(juz)}
                    style={{
                      padding: '10px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      fontSize: '14px',
                      backgroundColor: '#fff'
                    }}
                  >
                    <div>{juz}</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {countExp} expediente{countExp !== 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filtroJuzgado && juzgadosFiltrados.length === 0 && (
            <p style={{ color: '#999', marginTop: '10px' }}>No hay coincidencias</p>
          )}
        </div>
      );
    } else {
      const expedientesDelJuzgado = expedientes.filter(e => e.juzgado === juzgadoSeleccionado);
      const clientesDelJuzgado = [...new Set(expedientesDelJuzgado.map(e => e.clienteMostrable))].sort();

      return (
        <div style={{ padding: '15px', fontFamily: 'system-ui, sans-serif' }}>
          <button
            onClick={() => setJuzgadoSeleccionado('')}
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
            {juzgadoSeleccionado}
          </h2>

          <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
            {expedientesDelJuzgado.length} expediente{expedientesDelJuzgado.length !== 1 ? 's' : ''} de {clientesDelJuzgado.length} cliente{clientesDelJuzgado.length !== 1 ? 's' : ''}
          </p>

          {expedientesDelJuzgado.length > 0 ? (
            <div>
              {clientesDelJuzgado.map(cliente => {
                const expedientesCliente = expedientesDelJuzgado.filter(e => e.clienteMostrable === cliente);
                return (
                  <div key={cliente} style={{ marginBottom: '15px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>
                      👤 {cliente}
                    </div>
                    {expedientesCliente.map((exp) => (
                      <div
                        key={exp.sac}
                        style={{
                          backgroundColor: '#f9f9f9',
                          padding: '12px',
                          marginBottom: '8px',
                          marginLeft: '10px',
                          borderRadius: '6px',
                          border: '1px solid #ddd',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', color: '#1e40af', marginBottom: '5px' }}>
                          📄 {exp.sac}
                        </div>
                        {exp.caratula && (
                          <div style={{ color: '#333', marginBottom: '3px' }}>
                            {exp.caratula}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: '#666' }}>No hay expedientes en este juzgado.</p>
          )}
        </div>
      );
    }
  }
}
