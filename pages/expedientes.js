import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ChevronRight, Search, X } from 'lucide-react';

export default function ExpedientesPage() {
  const router = useRouter();
  const [expedientes, setExpedientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroJuzgado, setFiltroJuzgado] = useState('');
  const [filtroFuero, setFiltroFuero] = useState('');

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

  const juzgadosUnicos = [...new Set(expedientes.map(e => e.juzgado))].filter(Boolean).sort();
  const fuerosUnicos = [...new Set(expedientes.map(e => e.fuero))].filter(Boolean).sort();

  const normalizar = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const expedientesFiltrados = expedientes.filter((exp) => {
    const q = normalizar(busqueda.trim());
    const coincideTexto = !q || [exp.cliente, exp.caratula, exp.sac].some((v) => normalizar(v).includes(q));
    const coincideJuzgado = !filtroJuzgado || exp.juzgado === filtroJuzgado;
    const coincideFuero = !filtroFuero || exp.fuero === filtroFuero;
    return coincideTexto && coincideJuzgado && coincideFuero;
  });
  const hayFiltros = busqueda || filtroJuzgado || filtroFuero;

  return (
    <div className="container lx-page">
      <div className="lx-page-head">
        <div>
          <h1>Expedientes <span className="lx-tab-count">{expedientes.length}</span></h1>
          <p>Todos tus expedientes y casos en un solo lugar</p>
        </div>
      </div>

      <div className="lx-toolbar">
        <div className="lx-search">
          <Search size={16} />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, carátula o número"
          />
        </div>
        <select className="lx-filter" value={filtroFuero} onChange={(e) => setFiltroFuero(e.target.value)}>
          <option value="">Todos los fueros</option>
          {fuerosUnicos.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="lx-filter" value={filtroJuzgado} onChange={(e) => setFiltroJuzgado(e.target.value)}>
          <option value="">Todos los juzgados</option>
          {juzgadosUnicos.map((j) => <option key={j} value={j}>{j}</option>)}
        </select>
        {hayFiltros && (
          <button className="button button-ghost button-sm" onClick={() => { setBusqueda(''); setFiltroFuero(''); setFiltroJuzgado(''); }}>
            <X size={15} /> Limpiar
          </button>
        )}
      </div>

      {cargando ? (
        <div className="lx-empty">Cargando expedientes…</div>
      ) : expedientesFiltrados.length === 0 ? (
        <div className="lx-empty">
          {hayFiltros ? 'No hay expedientes que coincidan con los filtros.' : 'Todavía no hay expedientes cargados.'}
        </div>
      ) : (
        <>
          {hayFiltros && (
            <div className="lx-result-count">{expedientesFiltrados.length} de {expedientes.length} expedientes</div>
          )}
          <div className="lx-table-wrap">
            <table className="lx-table">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>N.º SAC</th>
                  <th>Carátula</th>
                  <th style={{ width: '120px' }}>Fuero</th>
                  <th style={{ width: '220px' }}>Juzgado</th>
                  <th aria-label="Abrir" style={{ width: '40px' }} />
                </tr>
              </thead>
              <tbody>
                {expedientesFiltrados.map((exp) => (
                  <tr key={exp.sac} onClick={() => router.push(`/expediente/${exp.sac}`)}>
                    <td className="lx-cell-num">{exp.sac}</td>
                    <td>
                      <div className="lx-cell-strong lx-cell-clamp">{exp.caratula || 'Sin carátula'}</div>
                      <div className="lx-cell-sub">{exp.cliente}</div>
                    </td>
                    <td>{exp.fuero ? <span className="lx-chip">{exp.fuero}</span> : <span className="lx-cell-muted">—</span>}</td>
                    <td className="lx-cell-muted">{exp.juzgado || '—'}</td>
                    <td className="lx-cell-actions"><ChevronRight size={16} className="lx-row-chevron" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
