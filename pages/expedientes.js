import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ExpedientesPage() {
  const router = useRouter();
  const [expedientes, setExpedientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroJuzgado, setFiltroJuzgado] = useState('');
  const [filtroFuero, setFiltroFuero] = useState('');
  const [filtroCaratula, setFiltroCaratula] = useState('');

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

  const clientesUnicos = [...new Set(expedientes.map(e => e.cliente))].filter(Boolean).sort();
  const juzgadosUnicos = [...new Set(expedientes.map(e => e.juzgado))].filter(Boolean).sort();
  const fuerosUnicos = [...new Set(expedientes.map(e => e.fuero))].filter(Boolean).sort();

  const expedientesFiltrados = expedientes.filter(exp => {
    const coincideCliente = !filtroCliente || exp.cliente.toLowerCase().includes(filtroCliente.toLowerCase());
    const coincideJuzgado = !filtroJuzgado || exp.juzgado === filtroJuzgado;
    const coincideFuero = !filtroFuero || exp.fuero === filtroFuero;
    const coincideCaratula = !filtroCaratula || exp.caratula.toLowerCase().includes(filtroCaratula.toLowerCase());
    
    return coincideCliente && coincideJuzgado && coincideFuero && coincideCaratula;
  });

  return (
    <div className="container" style={{ minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '4px' }}>Expedientes</h1>
        <p style={{ margin: 0 }}>Gestión centralizada de todos tus expedientes y casos</p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#0f172a' }}>
          Filtros
        </h2>
          
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '15px',
          marginBottom: '15px'
        }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Cliente (búsqueda)</label>
            <input
              type="text"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              placeholder="Buscar cliente..."
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Juzgado</label>
            <select value={filtroJuzgado} onChange={(e) => setFiltroJuzgado(e.target.value)}>
              <option value="">Todos</option>
              {juzgadosUnicos.map(juzgado => (
                <option key={juzgado} value={juzgado}>{juzgado}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Fuero</label>
            <select value={filtroFuero} onChange={(e) => setFiltroFuero(e.target.value)}>
              <option value="">Todos</option>
              {fuerosUnicos.map(fuero => (
                <option key={fuero} value={fuero}>{fuero}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Carátula (búsqueda)</label>
            <input
              type="text"
              value={filtroCaratula}
              onChange={(e) => setFiltroCaratula(e.target.value)}
              placeholder="Buscar por carátula..."
            />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#0f172a' }}>
          Expedientes ({expedientesFiltrados.length})
        </h2>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            Cargando expedientes...
          </div>
        ) : expedientesFiltrados.length === 0 ? (
          <div style={{
            backgroundColor: '#f8fafc',
            padding: '30px',
            borderRadius: '6px',
            textAlign: 'center',
            color: '#64748b',
            border: '1px solid #e2e8f0'
          }}>
            No hay expedientes que coincidan con los filtros aplicados.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>SAC</th>
                  <th>Cliente</th>
                  <th>Carátula</th>
                  <th>Fuero</th>
                  <th>Juzgado</th>
                  <th style={{ textAlign: 'center', width: '100px' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {expedientesFiltrados.map((exp) => (
                  <tr key={exp.sac} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: '600', color: '#2563eb' }}>{exp.sac}</td>
                    <td>{exp.cliente}</td>
                    <td>{exp.caratula}</td>
                    <td>{exp.fuero}</td>
                    <td>{exp.juzgado}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="button button-sm"
                        onClick={() => router.push(`/expediente/${exp.sac}`)}
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
  );
}
