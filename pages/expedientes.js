import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ExpedientesPage() {
  const router = useRouter();
  const [expedientes, setExpedientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Filtros
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroJuzgado, setFiltroJuzgado] = useState('');
  const [filtroFuero, setFiltroFuero] = useState('');
  const [filtroCaratula, setFiltroCaratula] = useState('');

  // Cargar expedientes al montar
  useEffect(() => {
    cargarExpedientes();
  }, []);

  const cargarExpedientes = async () => {
    setCargando(true);
    try {
      const response = await fetch('/api/obtener-expedientes');
      const data = await response.json();
      setExpedientes(data.expedientes || []);
    } catch (error) {
      console.error('Error al cargar expedientes:', error);
      setExpedientes([]);
    } finally {
      setCargando(false);
    }
  };

  // Obtener listas únicas para filtros
  const clientesUnicos = [...new Set(expedientes.map(e => e.cliente))].filter(Boolean).sort();
  const juzgadosUnicos = [...new Set(expedientes.map(e => e.juzgado))].filter(Boolean).sort();
  const fuerosUnicos = [...new Set(expedientes.map(e => e.fuero))].filter(Boolean).sort();

  // Filtrar expedientes
  const expedientesFiltrados = expedientes.filter(exp => {
    const coincideCliente = !filtroCliente || exp.cliente.toLowerCase().includes(filtroCliente.toLowerCase());
    const coincideJuzgado = !filtroJuzgado || exp.juzgado === filtroJuzgado;
    const coincideFuero = !filtroFuero || exp.fuero === filtroFuero;
    const coincideCaratula = !filtroCaratula || exp.caratula.toLowerCase().includes(filtroCaratula.toLowerCase());
    
    return coincideCliente && coincideJuzgado && coincideFuero && coincideCaratula;
  });

  return (
    <div style={{ padding: '20px', backgroundColor: '#f7fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, color: '#2d3748' }}>📂 Expedientes</h1>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#718096',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ← Volver a Inicio
          </button>
        </div>

        {/* Filtros */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h2 style={{ marginTop: 0, color: '#2d3748' }}>🔍 Filtros</h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '15px',
            marginBottom: '15px'
          }}>
            {/* Filtro Cliente - Búsqueda */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#2d3748' }}>
                👤 Cliente (búsqueda)
              </label>
              <input
                type="text"
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                placeholder="Escriba nombre del cliente..."
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
              {filtroCliente && clientesUnicos.filter(c => c.toLowerCase().includes(filtroCliente.toLowerCase())).length > 0 && (
                <div style={{
                  marginTop: '5px',
                  fontSize: '0.85rem',
                  color: '#718096',
                  maxHeight: '100px',
                  overflowY: 'auto'
                }}>
                  {clientesUnicos
                    .filter(c => c.toLowerCase().includes(filtroCliente.toLowerCase()))
                    .slice(0, 5)
                    .map(cliente => (
                      <div
                        key={cliente}
                        onClick={() => setFiltroCliente(cliente)}
                        style={{
                          padding: '5px',
                          cursor: 'pointer',
                          backgroundColor: '#f0f0f0',
                          borderRadius: '3px',
                          marginBottom: '3px'
                        }}
                      >
                        {cliente}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Filtro Juzgado */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#2d3748' }}>
                ⚖️ Juzgado
              </label>
              <select
                value={filtroJuzgado}
                onChange={(e) => setFiltroJuzgado(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  fontFamily: 'inherit'
                }}
              >
                <option value="">Todos</option>
                {juzgadosUnicos.map(juzgado => (
                  <option key={juzgado} value={juzgado}>{juzgado}</option>
                ))}
              </select>
            </div>

            {/* Filtro Fuero */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#2d3748' }}>
                📋 Fuero
              </label>
              <select
                value={filtroFuero}
                onChange={(e) => setFiltroFuero(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  fontFamily: 'inherit'
                }}
              >
                <option value="">Todos</option>
                {fuerosUnicos.map(fuero => (
                  <option key={fuero} value={fuero}>{fuero}</option>
                ))}
              </select>
            </div>

            {/* Búsqueda Caratula */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#2d3748' }}>
                🔎 Buscar en Carátula
              </label>
              <input
                type="text"
                value={filtroCaratula}
                onChange={(e) => setFiltroCaratula(e.target.value)}
                placeholder="Buscar..."
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Botón limpiar filtros */}
          <button
            onClick={() => {
              setFiltroCliente('');
              setFiltroJuzgado('');
              setFiltroFuero('');
              setFiltroCaratula('');
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#718096',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Limpiar Filtros
          </button>
        </div>

        {/* Tabla de Expedientes */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f7fafc' }}>
            <h2 style={{ margin: 0, color: '#2d3748' }}>
              📊 Resultados: {expedientesFiltrados.length} expediente{expedientesFiltrados.length !== 1 ? 's' : ''}
            </h2>
          </div>

          {cargando ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>
              ⏳ Cargando expedientes...
            </div>
          ) : expedientesFiltrados.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>
              No hay expedientes que coincidan con los filtros.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#edf2f7' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: '#2d3748' }}>SAC</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: '#2d3748' }}>Cliente</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: '#2d3748' }}>Carátula</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: '#2d3748' }}>Fuero</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: '#2d3748' }}>Juzgado</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: '#2d3748' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {expedientesFiltrados.map((exp, index) => (
                    <tr
                      key={index}
                      style={{
                        backgroundColor: index % 2 === 0 ? 'white' : '#f7fafc',
                        borderBottom: '1px solid #e2e8f0'
                      }}
                    >
                      <td style={{ padding: '12px', color: '#2d3748', fontWeight: 'bold' }}>{exp.sac}</td>
                      <td style={{ padding: '12px', color: '#2d3748' }}>{exp.cliente}</td>
                      <td style={{ padding: '12px', color: '#2d3748', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {exp.caratula}
                      </td>
                      <td style={{ padding: '12px', color: '#2d3748' }}>{exp.fuero}</td>
                      <td style={{ padding: '12px', color: '#2d3748' }}>{exp.juzgado}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => router.push(`/expediente/${exp.sac}`)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#3182ce',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 'bold'
                          }}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
