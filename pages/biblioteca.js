// pages/biblioteca.js
// Módulo de biblioteca legal: modelos, jurisprudencia y leyes (con expansión, búsqueda y copiar)

import { useMemo, useState } from 'react';
import { ChevronDown, Copy, Plus, Search, X } from 'lucide-react';
import { getModelos, getJurisprudencia, getLeyes } from '../lib/googleSheets';

export async function getServerSideProps(context) {
  const cookies = context.req.headers.cookie || '';
  const userCookie = cookies.split(';').find((c) => c.trim().startsWith('user='));

  if (!userCookie) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  try {
    const [modelos, jurisprudencia, leyes] = await Promise.all([
      getModelos(),
      getJurisprudencia(),
      getLeyes(),
    ]);

    return {
      props: {
        modelos: modelos || [],
        jurisprudencia: jurisprudencia || [],
        leyes: leyes || [],
      },
    };
  } catch (error) {
    console.error('Error al cargar biblioteca:', error);
    return { props: { modelos: [], jurisprudencia: [], leyes: [] } };
  }
}

export default function BibliotecaPage({
  modelos: modelosIniciales,
  jurisprudencia: jurisprudenciaInicial,
  leyes: leyesIniciales,
}) {
  const [activeTab, setActiveTab] = useState('modelos');
  const [modelos, setModelos] = useState(modelosIniciales || []);
  const [jurisprudencia, setJurisprudencia] = useState(jurisprudenciaInicial || []);
  const [leyes, setLeyes] = useState(leyesIniciales || []);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [expandidos, setExpandidos] = useState({});
  const [terminoBusquedaJuris, setTerminoBusquedaJuris] = useState('');

  const [nuevoModelo, setNuevoModelo] = useState({ nombre: '', fuero: '', contenido: '' });
  const [nuevaJurisprudencia, setNuevaJurisprudencia] = useState({ tema: '', subtema: '', juzgado: '', cita: '' });
  const [nuevaLey, setNuevaLey] = useState({ numero: '', jurisdiccion: '', texto: '' });

  const handleChange = (e, setter) => {
    const { name, value } = e.target;
    setter((prev) => ({ ...prev, [name]: value }));
  };

  const toggleExpandir = (id, tipo) => {
    const key = `${tipo}_${id}`;
    setExpandidos((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const showMessage = (text) => {
    setMensaje(text);
    setTimeout(() => {
      setMensaje((curr) => (curr === text ? '' : curr));
    }, 2500);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text || '');
      showMessage('Texto copiado al portapapeles');
    } catch (error) {
      console.error('Error al copiar:', error);
      showMessage('No se pudo copiar el texto');
    }
  };

  const handleSubmitModelo = async (e) => {
    e.preventDefault();
    setMensaje('');
    setCargando(true);

    if (!nuevoModelo.nombre || !nuevoModelo.contenido) {
      setMensaje('⚠️ Nombre y Contenido son obligatorios');
      setCargando(false);
      return;
    }

    try {
      const response = await fetch('/api/biblioteca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'modelo', ...nuevoModelo }),
      });
      const resultado = await response.json();

      if (resultado.success) {
        setNuevoModelo({ nombre: '', fuero: '', contenido: '' });
        setMostrarFormulario(false);
        showMessage('Modelo agregado correctamente');

        const reload = await fetch('/api/biblioteca?tipo=modelos');
        const data = await reload.json();
        if (data.modelos) setModelos(data.modelos);
      } else {
        setMensaje(`Error: ${resultado.error || 'Error desconocido'}`);
      }
    } catch (error) {
      setMensaje(`Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const handleSubmitJurisprudencia = async (e) => {
    e.preventDefault();
    setMensaje('');
    setCargando(true);

    if (!nuevaJurisprudencia.tema || !nuevaJurisprudencia.cita) {
      setMensaje('⚠️ Tema y Cita son obligatorios');
      setCargando(false);
      return;
    }

    try {
      const response = await fetch('/api/biblioteca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'jurisprudencia', ...nuevaJurisprudencia }),
      });
      const resultado = await response.json();

      if (resultado.success) {
        setNuevaJurisprudencia({ tema: '', subtema: '', juzgado: '', cita: '' });
        setMostrarFormulario(false);
        showMessage('Jurisprudencia agregada correctamente');

        const reload = await fetch('/api/biblioteca?tipo=jurisprudencia');
        const data = await reload.json();
        if (data.jurisprudencia) setJurisprudencia(data.jurisprudencia);
      } else {
        setMensaje(`Error: ${resultado.error || 'Error desconocido'}`);
      }
    } catch (error) {
      setMensaje(`Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const handleSubmitLey = async (e) => {
    e.preventDefault();
    setMensaje('');
    setCargando(true);

    if (!nuevaLey.numero || !nuevaLey.texto) {
      setMensaje('⚠️ Número y Texto son obligatorios');
      setCargando(false);
      return;
    }

    try {
      const response = await fetch('/api/biblioteca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'ley', ...nuevaLey }),
      });
      const resultado = await response.json();

      if (resultado.success) {
        setNuevaLey({ numero: '', jurisdiccion: '', texto: '' });
        setMostrarFormulario(false);
        showMessage('Ley agregada correctamente');

        const reload = await fetch('/api/biblioteca?tipo=leyes');
        const data = await reload.json();
        if (data.leyes) setLeyes(data.leyes);
      } else {
        setMensaje(`Error: ${resultado.error || 'Error desconocido'}`);
      }
    } catch (error) {
      setMensaje(`Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const getPreview = (texto, maxLineas = 2) => {
    if (!texto) return '';
    const lineas = texto.split('\n').filter((line) => line.trim() !== '');
    return lineas.slice(0, maxLineas).join('\n');
  };

  const jurisprudenciaFiltrada = useMemo(() => {
    if (!terminoBusquedaJuris.trim()) return jurisprudencia;
    const term = terminoBusquedaJuris.toLowerCase().trim();

    return jurisprudencia.filter((j) => {
      const tema = (j.Tema || '').toLowerCase();
      const subtema = (j.Subtema || '').toLowerCase();
      const juzgado = (j.Juzgado || '').toLowerCase();
      const cita = (j.Cita || '').toLowerCase();
      return tema.includes(term) || subtema.includes(term) || juzgado.includes(term) || cita.includes(term);
    });
  }, [jurisprudencia, terminoBusquedaJuris]);

  const renderExpandible = ({ id, tipo, titulo, subtitulo, badge, contenido }) => {
    const key = `${tipo}_${id}`;
    const estaExpandido = expandidos[key] || false;
    const preview = getPreview(contenido, 2);
    const lineas = (contenido || '').split('\n').filter((l) => l.trim() !== '').length;
    const tieneMas = lineas > 2;

    return (
      <div
        key={id}
        className="act-card"
        style={{ '--act-bg': '#ffffff', '--act-bg-hover': '#f9fafb', '--act-border': 'var(--color-border-light)', '--act-accent': 'var(--color-border-strong)' }}
        onClick={() => toggleExpandir(id, tipo)}
      >
        <div className="act-head">
          <div className="act-head-main">
            <span className="act-title">{titulo}</span>
            {subtitulo ? <span className="lx-chip">{subtitulo}</span> : null}
            {badge ? <span className="act-date">{badge}</span> : null}
          </div>
          <ChevronDown size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0, transform: estaExpandido ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </div>

        {!estaExpandido && (
          <div className="act-body">
            {preview || <em className="act-empty">Sin contenido</em>}
            {preview && tieneMas && <span className="act-more"> Leer más</span>}
          </div>
        )}

        {estaExpandido && contenido && (
          <div className="act-full" onClick={(e) => e.stopPropagation()}>
            {contenido}
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="button button-secondary button-sm" onClick={() => copyToClipboard(contenido)}>
                <Copy size={14} /> Copiar texto
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const cambiarTab = (id) => {
    setActiveTab(id);
    setMostrarFormulario(false);
    setMensaje('');
  };
  const tabs = [
    { id: 'modelos', label: 'Modelos', count: modelos.length, singular: 'Modelo' },
    { id: 'jurisprudencia', label: 'Jurisprudencia', count: jurisprudencia.length, singular: 'Jurisprudencia' },
    { id: 'leyes', label: 'Leyes', count: leyes.length, singular: 'Ley' },
  ];
  const tabActual = tabs.find((t) => t.id === activeTab);
  const cancelar = () => { setMostrarFormulario(false); setMensaje(''); };
  const acciones = (textoGuardar) => (
    <div className="exp-form-actions">
      <button type="submit" className="button button-sm" disabled={cargando}>{cargando ? 'Guardando…' : textoGuardar}</button>
      <button type="button" className="button button-secondary button-sm" onClick={cancelar}>Cancelar</button>
    </div>
  );
  const campo = (label, input) => (<div><label>{label}</label>{input}</div>);

  return (
    <div className="container exp-page">
      <div className="lx-page-head">
        <div>
          <h1>Biblioteca legal</h1>
          <p>Modelos de escritos, jurisprudencia y normativa</p>
        </div>
      </div>

      <div className="exp-tabbar" style={{ marginTop: 0 }}>
        <div className="lx-tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={activeTab === t.id}
              className={`lx-tab${activeTab === t.id ? ' is-active' : ''}`} onClick={() => cambiarTab(t.id)}>
              {t.label}<span className="lx-tab-count">{t.count}</span>
            </button>
          ))}
        </div>
        <div className="exp-toolbar">
          <button className={`button button-sm${mostrarFormulario ? ' button-secondary' : ''}`} onClick={() => { setMostrarFormulario(!mostrarFormulario); setMensaje(''); }}>
            {mostrarFormulario ? <><X size={15} /> Cerrar</> : <><Plus size={15} /> {tabActual.singular}</>}
          </button>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="lx-card exp-form">
          {activeTab === 'modelos' && (
            <form onSubmit={handleSubmitModelo}>
              <h3 className="lx-card-title">Nuevo modelo de escrito</h3>
              <div className="exp-form-grid">
                {campo('Nombre *', <input type="text" name="nombre" value={nuevoModelo.nombre} onChange={(e) => handleChange(e, setNuevoModelo)} placeholder="Ej: Demanda de alimentos" required />)}
                {campo('Fuero', <input type="text" name="fuero" value={nuevoModelo.fuero} onChange={(e) => handleChange(e, setNuevoModelo)} placeholder="Ej: Familia" />)}
              </div>
              <div style={{ marginTop: '14px' }}>
                {campo('Contenido *', <textarea name="contenido" value={nuevoModelo.contenido} onChange={(e) => handleChange(e, setNuevoModelo)} placeholder="Escribí el modelo del escrito…" />)}
              </div>
              {acciones('Guardar modelo')}
            </form>
          )}
          {activeTab === 'jurisprudencia' && (
            <form onSubmit={handleSubmitJurisprudencia}>
              <h3 className="lx-card-title">Nueva jurisprudencia</h3>
              <div className="exp-form-grid">
                {campo('Tema *', <input type="text" name="tema" value={nuevaJurisprudencia.tema} onChange={(e) => handleChange(e, setNuevaJurisprudencia)} placeholder="Ej: Sucesiones" required />)}
                {campo('Subtema', <input type="text" name="subtema" value={nuevaJurisprudencia.subtema} onChange={(e) => handleChange(e, setNuevaJurisprudencia)} placeholder="Ej: Indignidad" />)}
                {campo('Tribunal', <input type="text" name="juzgado" value={nuevaJurisprudencia.juzgado} onChange={(e) => handleChange(e, setNuevaJurisprudencia)} placeholder="Ej: Cámara 1a Civ. y Com. Córdoba" />)}
              </div>
              <div style={{ marginTop: '14px' }}>
                {campo('Cita *', <textarea name="cita" value={nuevaJurisprudencia.cita} onChange={(e) => handleChange(e, setNuevaJurisprudencia)} placeholder="Escribí la cita jurisprudencial…" />)}
              </div>
              {acciones('Guardar jurisprudencia')}
            </form>
          )}
          {activeTab === 'leyes' && (
            <form onSubmit={handleSubmitLey}>
              <h3 className="lx-card-title">Nueva ley</h3>
              <div className="exp-form-grid">
                {campo('Número *', <input type="text" name="numero" value={nuevaLey.numero} onChange={(e) => handleChange(e, setNuevaLey)} placeholder="Ej: Ley 10.305" required />)}
                {campo('Jurisdicción', <input type="text" name="jurisdiccion" value={nuevaLey.jurisdiccion} onChange={(e) => handleChange(e, setNuevaLey)} placeholder="Ej: Córdoba" />)}
              </div>
              <div style={{ marginTop: '14px' }}>
                {campo('Texto *', <textarea name="texto" value={nuevaLey.texto} onChange={(e) => handleChange(e, setNuevaLey)} placeholder="Escribí el texto de la ley…" />)}
              </div>
              {acciones('Guardar ley')}
            </form>
          )}
          {mensaje && (
            <div className={`alert ${mensaje.includes('✅') ? 'alert-success' : 'alert-urgent'}`} style={{ marginTop: '16px', marginBottom: 0 }}>{mensaje}</div>
          )}
        </div>
      )}

      {activeTab === 'modelos' && (
        modelos.length === 0 ? <div className="lx-empty">No hay modelos cargados.</div> : (
          <div className="exp-feed">
            {modelos.map((m) => renderExpandible({ id: m.ID, tipo: 'modelo', titulo: m.Nombre || 'Sin nombre', subtitulo: m.Fuero || '', badge: '', contenido: m.Contenido || '' }))}
          </div>
        )
      )}

      {activeTab === 'jurisprudencia' && (
        <div>
          <div className="lx-toolbar">
            <div className="lx-search">
              <Search size={16} />
              <input type="text" value={terminoBusquedaJuris} onChange={(e) => setTerminoBusquedaJuris(e.target.value)} placeholder="Buscar por tema, subtema, tribunal o cita" />
            </div>
            {terminoBusquedaJuris && (
              <button className="button button-ghost button-sm" onClick={() => setTerminoBusquedaJuris('')}><X size={15} /> Limpiar</button>
            )}
          </div>
          {jurisprudenciaFiltrada.length === 0 ? (
            <div className="lx-empty">{terminoBusquedaJuris ? 'No hay jurisprudencia que coincida con la búsqueda.' : 'No hay jurisprudencia cargada.'}</div>
          ) : (
            <div className="exp-feed">
              {jurisprudenciaFiltrada.map((j) => renderExpandible({ id: j.ID, tipo: 'juris', titulo: j.Tema || 'Sin tema', subtitulo: j.Subtema || '', badge: j.Juzgado || '', contenido: j.Cita || '' }))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'leyes' && (
        leyes.length === 0 ? <div className="lx-empty">No hay leyes cargadas.</div> : (
          <div className="exp-feed">
            {leyes.map((l) => renderExpandible({ id: l.ID, tipo: 'ley', titulo: l.Numero || 'Sin número', subtitulo: l.Jurisdiccion || '', badge: '', contenido: l.Texto || '' }))}
          </div>
        )
      )}
    </div>
  );
}
