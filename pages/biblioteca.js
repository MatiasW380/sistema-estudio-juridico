// pages/biblioteca.js
// Módulo de biblioteca legal: modelos, jurisprudencia y leyes (con expansión, búsqueda y copiar)

import { useMemo, useState } from 'react';
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
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '10px',
          backgroundColor: '#f7fafc',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onClick={() => toggleExpandir(id, tipo)}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#edf2f7')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f7fafc')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong>{titulo}</strong>
            {subtitulo ? <span style={{ color: '#64748b' }}>{subtitulo}</span> : null}
            {badge ? <span style={{ color: '#718096', fontSize: '0.8rem' }}>{badge}</span> : null}
          </div>
          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{estaExpandido ? '▲' : '▼'}</span>
        </div>

        <div style={{ marginTop: '8px', color: '#64748b', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
          {preview ? (
            <>
              {preview}
              {tieneMas && !estaExpandido && (
                <span style={{ color: '#2563eb', marginLeft: '5px' }}>
                  ... <em>clic para leer más</em>
                </span>
              )}
            </>
          ) : (
            <em style={{ color: '#a0aec0' }}>Sin contenido</em>
          )}
        </div>

        {estaExpandido && contenido && (
          <div
            style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: 'white',
              padding: '12px',
              borderRadius: '4px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                whiteSpace: 'pre-wrap',
                fontSize: '0.95rem',
                userSelect: 'text',
                cursor: 'text',
                WebkitUserSelect: 'text',
                MozUserSelect: 'text',
                msUserSelect: 'text',
              }}
            >
              {contenido}
            </div>

            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => copyToClipboard(contenido)}
                style={{ backgroundColor: '#2563eb', padding: '8px 12px' }}
              >
                Copiar texto
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '4px' }}>Biblioteca Legal</h1>
        <p style={{ margin: 0 }}>Modelos, jurisprudencia y normativas legales</p>
      </div>

      {/* Pestañas */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
        <button
          onClick={() => {
            setActiveTab('modelos');
            setMostrarFormulario(false);
            setMensaje('');
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'modelos' ? '#2563eb' : 'transparent',
            color: activeTab === 'modelos' ? 'white' : '#64748b',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.9rem',
            transition: 'all 0.2s',
          }}
        >
          Modelos ({modelos.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('jurisprudencia');
            setMostrarFormulario(false);
            setMensaje('');
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'jurisprudencia' ? '#2563eb' : 'transparent',
            color: activeTab === 'jurisprudencia' ? 'white' : '#64748b',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.9rem',
            transition: 'all 0.2s',
          }}
        >
          Jurisprudencia ({jurisprudencia.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('leyes');
            setMostrarFormulario(false);
            setMensaje('');
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'leyes' ? '#2563eb' : 'transparent',
            color: activeTab === 'leyes' ? 'white' : '#64748b',
            border: 'none',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.9rem',
            transition: 'all 0.2s',
          }}
        >
          Leyes ({leyes.length})
        </button>
      </div>

      <button
        onClick={() => setMostrarFormulario(!mostrarFormulario)}
        style={{ backgroundColor: '#38a169', marginBottom: '20px' }}
      >
        + Agregar {activeTab === 'modelos' ? 'Modelo' : activeTab === 'jurisprudencia' ? 'Jurisprudencia' : 'Ley'}
      </button>

      {/* Formulario */}
      {mostrarFormulario && (
        <div
          style={{
            backgroundColor: '#f7fafc',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #e2e8f0',
          }}
        >
          {activeTab === 'modelos' && (
            <form onSubmit={handleSubmitModelo}>
              <h3>Nuevo Modelo de Escrito</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label><strong>Nombre *</strong></label>
                  <input
                    type="text"
                    name="nombre"
                    value={nuevoModelo.nombre}
                    onChange={(e) => handleChange(e, setNuevoModelo)}
                    placeholder="Ej: Demanda Laboral"
                    required
                  />
                </div>
                <div>
                  <label><strong>Fuero</strong></label>
                  <input
                    type="text"
                    name="fuero"
                    value={nuevoModelo.fuero}
                    onChange={(e) => handleChange(e, setNuevoModelo)}
                    placeholder="Ej: Laboral"
                  />
                </div>
              </div>
              <div style={{ marginTop: '15px' }}>
                <label><strong>Contenido *</strong></label>
                <textarea
                  name="contenido"
                  value={nuevoModelo.contenido}
                  onChange={(e) => handleChange(e, setNuevoModelo)}
                  placeholder="Escribí el modelo del escrito..."
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', minHeight: '150px' }}
                />
              </div>
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ backgroundColor: '#2563eb' }} disabled={cargando}>
                  {cargando ? 'Guardando...' : 'Guardar Modelo'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarFormulario(false);
                    setMensaje('');
                  }}
                  style={{ backgroundColor: '#718096' }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {activeTab === 'jurisprudencia' && (
            <form onSubmit={handleSubmitJurisprudencia}>
              <h3>Nueva Jurisprudencia</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label><strong>Tema *</strong></label>
                  <input
                    type="text"
                    name="tema"
                    value={nuevaJurisprudencia.tema}
                    onChange={(e) => handleChange(e, setNuevaJurisprudencia)}
                    placeholder="Ej: Sucesiones"
                    required
                  />
                </div>
                <div>
                  <label><strong>Subtema</strong></label>
                  <input
                    type="text"
                    name="subtema"
                    value={nuevaJurisprudencia.subtema}
                    onChange={(e) => handleChange(e, setNuevaJurisprudencia)}
                    placeholder="Ej: Indignidad"
                  />
                </div>
                <div>
                  <label><strong>Juzgado</strong></label>
                  <input
                    type="text"
                    name="juzgado"
                    value={nuevaJurisprudencia.juzgado}
                    onChange={(e) => handleChange(e, setNuevaJurisprudencia)}
                    placeholder="Ej: Cámara 1a Civ. y Com. Córdoba"
                  />
                </div>
              </div>
              <div style={{ marginTop: '15px' }}>
                <label><strong>Cita *</strong></label>
                <textarea
                  name="cita"
                  value={nuevaJurisprudencia.cita}
                  onChange={(e) => handleChange(e, setNuevaJurisprudencia)}
                  placeholder="Escribí la cita jurisprudencial..."
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', minHeight: '150px' }}
                />
              </div>
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ backgroundColor: '#2563eb' }} disabled={cargando}>
                  {cargando ? 'Guardando...' : 'Guardar Jurisprudencia'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarFormulario(false);
                    setMensaje('');
                  }}
                  style={{ backgroundColor: '#718096' }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {activeTab === 'leyes' && (
            <form onSubmit={handleSubmitLey}>
              <h3>Nueva Ley</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label><strong>Número *</strong></label>
                  <input
                    type="text"
                    name="numero"
                    value={nuevaLey.numero}
                    onChange={(e) => handleChange(e, setNuevaLey)}
                    placeholder="Ej: Ley 20.744"
                    required
                  />
                </div>
                <div>
                  <label><strong>Jurisdicción</strong></label>
                  <input
                    type="text"
                    name="jurisdiccion"
                    value={nuevaLey.jurisdiccion}
                    onChange={(e) => handleChange(e, setNuevaLey)}
                    placeholder="Ej: Nacional"
                  />
                </div>
              </div>
              <div style={{ marginTop: '15px' }}>
                <label><strong>Texto *</strong></label>
                <textarea
                  name="texto"
                  value={nuevaLey.texto}
                  onChange={(e) => handleChange(e, setNuevaLey)}
                  placeholder="Escribí el texto de la ley..."
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', minHeight: '150px' }}
                />
              </div>
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ backgroundColor: '#2563eb' }} disabled={cargando}>
                  {cargando ? 'Guardando...' : 'Guardar Ley'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarFormulario(false);
                    setMensaje('');
                  }}
                  style={{ backgroundColor: '#718096' }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {mensaje && (
            <div
              style={{
                marginTop: '15px',
                padding: '10px',
                borderRadius: '8px',
                backgroundColor: mensaje.includes('✅') ? '#c6f6d5' : '#fed7d7',
                color: mensaje.includes('✅') ? '#22543d' : '#9b2c2c',
              }}
            >
              {mensaje}
            </div>
          )}
        </div>
      )}

      {/* Listados */}
      {activeTab === 'modelos' && (
        <div>
          <h3>Modelos de Escritos</h3>
          {modelos.length === 0 ? (
            <p>No hay modelos cargados.</p>
          ) : (
            <div>
              {modelos.map((m) =>
                renderExpandible({
                  id: m.ID,
                  tipo: 'modelo',
                  titulo: m.Nombre || 'Sin nombre',
                  subtitulo: m.Fuero ? `(${m.Fuero})` : '',
                  badge: '',
                  contenido: m.Contenido || '',
                }),
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'jurisprudencia' && (
        <div>
          <h3>Jurisprudencia</h3>

          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={terminoBusquedaJuris}
              onChange={(e) => setTerminoBusquedaJuris(e.target.value)}
              placeholder="Buscar por tema, subtema, juzgado o cita..."
              style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            />
            <button onClick={() => setTerminoBusquedaJuris('')} style={{ backgroundColor: '#718096', padding: '10px 15px' }}>
              Limpiar
            </button>
          </div>

          {jurisprudenciaFiltrada.length === 0 ? (
            <p>No hay jurisprudencia cargada {terminoBusquedaJuris ? 'que coincida con la búsqueda' : ''}.</p>
          ) : (
            <div>
              {jurisprudenciaFiltrada.map((j) =>
                renderExpandible({
                  id: j.ID,
                  tipo: 'juris',
                  titulo: j.Tema || 'Sin tema',
                  subtitulo: j.Subtema ? `→ ${j.Subtema}` : '',
                  badge: j.Juzgado ? `(${j.Juzgado})` : '',
                  contenido: j.Cita || '',
                }),
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'leyes' && (
        <div>
          <h3>📜 Leyes</h3>
          {leyes.length === 0 ? (
            <p>No hay leyes cargadas.</p>
          ) : (
            <div>
              {leyes.map((l) =>
                renderExpandible({
                  id: l.ID,
                  tipo: 'ley',
                  titulo: l.Numero || 'Sin número',
                  subtitulo: l.Jurisdiccion ? `(${l.Jurisdiccion})` : '',
                  badge: '',
                  contenido: l.Texto || '',
                }),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
