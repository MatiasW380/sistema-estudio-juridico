// pages/biblioteca.js
// Módulo de biblioteca legal: modelos, jurisprudencia y leyes (con expansión, búsqueda y copiar)

import { useState } from 'react';
import { useRouter } from 'next/router';
import BotonInicio from '../components/BotonInicio';
import { getModelos, getJurisprudencia, getLeyes } from '../lib/googleSheets';

export async function getServerSideProps() {
  try {
    const modelos = await getModelos();
    const jurisprudencia = await getJurisprudencia();
    const leyes = await getLeyes();
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

export default function BibliotecaPage({ modelos: modelosIniciales, jurisprudencia: jurisprudenciaInicial, leyes: leyesIniciales }) {
  const [activeTab, setActiveTab] = useState('modelos');
  const [modelos, setModelos] = useState(modelosIniciales);
  const [jurisprudencia, setJurisprudencia] = useState(jurisprudenciaInicial);
  const [leyes, setLeyes] = useState(leyesIniciales);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [expandidos, setExpandidos] = useState({});
  // CAMBIO 4: Estados para búsqueda de jurisprudencia
  const [terminoBusquedaJuris, setTerminoBusquedaJuris] = useState('');
  const router = useRouter();

  // Estados para formularios
  const [nuevoModelo, setNuevoModelo] = useState({ nombre: '', fuero: '', contenido: '' });
  const [nuevaJurisprudencia, setNuevaJurisprudencia] = useState({ tema: '', subtema: '', juzgado: '', cita: '' });
  const [nuevaLey, setNuevaLey] = useState({ numero: '', jurisdiccion: '', texto: '' });

  const handleChange = (e, setter) => {
    const { name, value } = e.target;
    setter(prev => ({ ...prev, [name]: value }));
  };

  const toggleExpandir = (id, tipo) => {
    const key = `${tipo}_${id}`;
    setExpandidos(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
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
        setMensaje('✅ Modelo agregado correctamente');
        setNuevoModelo({ nombre: '', fuero: '', contenido: '' });
        setMostrarFormulario(false);
        const reload = await fetch('/api/biblioteca?tipo=modelos');
        const data = await reload.json();
        if (data.modelos) setModelos(data.modelos);
      } else {
        setMensaje('❌ Error: ' + (resultado.error || 'Error desconocido'));
      }
    } catch (error) {
      setMensaje('❌ Error: ' + error.message);
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
        setMensaje('✅ Jurisprudencia agregada correctamente');
        setNuevaJurisprudencia({ tema: '', subtema: '', juzgado: '', cita: '' });
        setMostrarFormulario(false);
        const reload = await fetch('/api/biblioteca?tipo=jurisprudencia');
        const data = await reload.json();
        if (data.jurisprudencia) setJurisprudencia(data.jurisprudencia);
      } else {
        setMensaje('❌ Error: ' + (resultado.error || 'Error desconocido'));
      }
    } catch (error) {
      setMensaje('❌ Error: ' + error.message);
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
        setMensaje('✅ Ley agregada correctamente');
        setNuevaLey({ numero: '', jurisdiccion: '', texto: '' });
        setMostrarFormulario(false);
        const reload = await fetch('/api/biblioteca?tipo=leyes');
        const data = await reload.json();
        if (data.leyes) setLeyes(data.leyes);
      } else {
        setMensaje('❌ Error: ' + (resultado.error || 'Error desconocido'));
      }
    } catch (error) {
      setMensaje('❌ Error: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  // Función para obtener el texto de vista previa (primeras líneas)
  const getPreview = (texto, maxLineas = 2) => {
    if (!texto) return '';
    const lineas = texto.split('\n').filter(line => line.trim() !== '');
    const primeras = lineas.slice(0, maxLineas);
    return primeras.join('\n');
  };

  // CAMBIO 4: Función para filtrar jurisprudencia
  const getJurisprudenciaFiltrada = () => {
    if (!terminoBusquedaJuris.trim()) return jurisprudencia;
    
    const termino = terminoBusquedaJuris.toLowerCase();
    return jurisprudencia.filter(j => 
      (j.Tema && j.Tema.toLowerCase().includes(termino)) ||
      (j.Subtema && j.Subtema.toLowerCase().includes(termino)) ||
      (j.Juzgado && j.Juzgado.toLowerCase().includes(termino)) ||
      (j.Cita && j.Cita.toLowerCase().includes(termino))
    );
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BotonInicio />
          <h1>📚 Biblioteca Legal</h1>
        </div>
        <a href="/" style={{ color: '#3182ce', textDecoration: 'none' }}>← Volver al inicio</a>
      </div>

      {/* Pestañas */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
        <button
          onClick={() => { setActiveTab('modelos'); setMostrarFormulario(false); setMensaje(''); }}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'modelos' ? '#3182ce' : 'transparent',
            color: activeTab === 'modelos' ? 'white' : '#4a5568',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📝 Modelos ({modelos.length})
        </button>
        <button
          onClick={() => { setActiveTab('jurisprudencia'); setMostrarFormulario(false); setMensaje(''); }}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'jurisprudencia' ? '#3182ce' : 'transparent',
            color: activeTab === 'jurisprudencia' ? 'white' : '#4a5568',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          ⚖️ Jurisprudencia ({jurisprudencia.length})
        </button>
        <button
          onClick={() => { setActiveTab('leyes'); setMostrarFormulario(false); setMensaje(''); }}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'leyes' ? '#3182ce' : 'transparent',
            color: activeTab === 'leyes' ? 'white' : '#4a5568',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📜 Leyes ({leyes.length})
        </button>
      </div>

      {/* Botón para agregar */}
      <button
        onClick={() => setMostrarFormulario(!mostrarFormulario)}
        style={{ backgroundColor: '#38a169', marginBottom: '20px' }}
      >
        + Agregar {activeTab === 'modelos' ? 'Modelo' : activeTab === 'jurisprudencia' ? 'Jurisprudencia' : 'Ley'}
      </button>

      {/* Formulario */}
      {mostrarFormulario && (
        <div style={{ backgroundColor: '#f7fafc', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
          {activeTab === 'modelos' && (
            <form onSubmit={handleSubmitModelo}>
              <h3>Nuevo Modelo de Escrito</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label><strong>Nombre *</strong></label>
                  <input type="text" name="nombre" value={nuevoModelo.nombre} onChange={(e) => handleChange(e, setNuevoModelo)} placeholder="Ej: Demanda Laboral" required />
                </div>
                <div>
                  <label><strong>Fuero</strong></label>
                  <input type="text" name="fuero" value={nuevoModelo.fuero} onChange={(e) => handleChange(e, setNuevoModelo)} placeholder="Ej: Laboral" />
                </div>
              </div>
              <div style={{ marginTop: '15px' }}>
                <label><strong>Contenido *</strong></label>
                <textarea name="contenido" value={nuevoModelo.contenido} onChange={(e) => handleChange(e, setNuevoModelo)} placeholder="Escribí el modelo del escrito..." style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', minHeight: '150px' }} />
              </div>
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ backgroundColor: '#3182ce' }} disabled={cargando}>{cargando ? 'Guardando...' : 'Guardar Modelo'}</button>
                <button type="button" onClick={() => { setMostrarFormulario(false); setMensaje(''); }} style={{ backgroundColor: '#718096' }}>Cancelar</button>
              </div>
            </form>
          )}

          {activeTab === 'jurisprudencia' && (
            <form onSubmit={handleSubmitJurisprudencia}>
              <h3>Nueva Jurisprudencia</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label><strong>Tema *</strong></label>
                  <input type="text" name="tema" value={nuevaJurisprudencia.tema} onChange={(e) => handleChange(e, setNuevaJurisprudencia)} placeholder="Ej: Sucesiones" required />
                </div>
                <div>
                  <label><strong>Subtema</strong></label>
                  <input type="text" name="subtema" value={nuevaJurisprudencia.subtema} onChange={(e) => handleChange(e, setNuevaJurisprudencia)} placeholder="Ej: Indignidad" />
                </div>
                <div>
                  <label><strong>Juzgado</strong></label>
                  <input type="text" name="juzgado" value={nuevaJurisprudencia.juzgado} onChange={(e) => handleChange(e, setNuevaJurisprudencia)} placeholder="Ej: Cámara 1a Civ. y Com. Córdoba" />
                </div>
              </div>
              <div style={{ marginTop: '15px' }}>
                <label><strong>Cita *</strong></label>
                <textarea name="cita" value={nuevaJurisprudencia.cita} onChange={(e) => handleChange(e, setNuevaJurisprudencia)} placeholder="Escribí la cita jurisprudencial..." style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', minHeight: '150px' }} />
              </div>
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ backgroundColor: '#3182ce' }} disabled={cargando}>{cargando ? 'Guardando...' : 'Guardar Jurisprudencia'}</button>
                <button type="button" onClick={() => { setMostrarFormulario(false); setMensaje(''); }} style={{ backgroundColor: '#718096' }}>Cancelar</button>
              </div>
            </form>
          )}

          {activeTab === 'leyes' && (
            <form onSubmit={handleSubmitLey}>
              <h3>Nueva Ley</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label><strong>Número *</strong></label>
                  <input type="text" name="numero" value={nuevaLey.numero} onChange={(e) => handleChange(e, setNuevaLey)} placeholder="Ej: Ley 20.744" required />
                </div>
                <div>
                  <label><strong>Jurisdicción</strong></label>
                  <input type="text" name="jurisdiccion" value={nuevaLey.jurisdiccion} onChange={(e) => handleChange(e, setNuevaLey)} placeholder="Ej: Nacional" />
                </div>
              </div>
              <div style={{ marginTop: '15px' }}>
                <label><strong>Texto *</strong></label>
                <textarea name="texto" value={nuevaLey.texto} onChange={(e) => handleChange(e, setNuevaLey)} placeholder="Escribí el texto de la ley..." style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', minHeight: '150px' }} />
              </div>
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ backgroundColor: '#3182ce' }} disabled={cargando}>{cargando ? 'Guardando...' : 'Guardar Ley'}</button>
                <button type="button" onClick={() => { setMostrarFormulario(false); setMensaje(''); }} style={{ backgroundColor: '#718096' }}>Cancelar</button>
              </div>
            </form>
          )}
          {mensaje && <div style={{ marginTop: '15px', padding: '10px', borderRadius: '8px', backgroundColor: mensaje.includes('✅') ? '#c6f6d5' : '#fed7d7', color: mensaje.includes('✅') ? '#22543d' : '#9b2c2c' }}>
            {mensaje}
          </div>}
        </div>
      )}

      {/* Listados con expansión */}
      {activeTab === 'modelos' && (
        <div>
          <h3>📋 Modelos de Escritos</h3>
          {modelos.length === 0 ? <p>No hay modelos cargados.</p> : (
            <div>
              {modelos.map((m) => {
                const key = `modelo_${m.ID}`;
                const estaExpandido = expandidos[key] || false;
                const preview = getPreview(m.Contenido, 2);
                const tieneMas = m.Contenido && m.Contenido.split('\n').filter(l => l.trim() !== '').length > 2;

                return (
                  <div
                    key={m.ID}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '15px',
                      marginBottom: '10px',
                      backgroundColor: '#f7fafc',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => toggleExpandir(m.ID, 'modelo')}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#edf2f7'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{m.Nombre || 'Sin nombre'}</strong>
                        {m.Fuero && <span style={{ marginLeft: '10px', color: '#4a5568' }}>({m.Fuero})</span>}
                      </div>
                      <span style={{ color: '#4a5568', fontSize: '0.8rem' }}>
                        {estaExpandido ? '▲' : '▼'}
                      </span>
                    </div>
                    <div style={{ marginTop: '8px', color: '#4a5568', fontSize: '0.9rem' }}>
                      {preview ? (
                        <div style={{ whiteSpace: 'pre-wrap' }}>
                          {preview}
                          {tieneMas && !estaExpandido && (
                            <span style={{ color: '#3182ce', marginLeft: '5px' }}>... <em>clic para leer más</em></span>
                          )}
                        </div>
                      ) : (
                        <em style={{ color: '#a0aec0' }}>Sin contenido</em>
                      )}
                    </div>
                    {estaExpandido && m.Contenido && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', fontSize: '0.95rem', backgroundColor: 'white', padding: '12px', borderRadius: '4px', userSelect: 'text' }}>
                        {m.Contenido}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'jurisprudencia' && (
        <div>
          <h3>⚖️ Jurisprudencia</h3>
          {/* CAMBIO 4: Agregar buscador de jurisprudencia */}
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={terminoBusquedaJuris}
              onChange={(e) => setTerminoBusquedaJuris(e.target.value)}
              placeholder="🔍 Buscar por tema, subtema, juzgado o cita..."
              style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            />
            <button 
              onClick={() => setTerminoBusquedaJuris('')}
              style={{ backgroundColor: '#718096', padding: '10px 15px' }}
            >
              Limpiar
            </button>
          </div>
          {getJurisprudenciaFiltrada().length === 0 ? <p>No hay jurisprudencia cargada {terminoBusquedaJuris && 'que coincida con la búsqueda'}.</p> : (
            <div>
              {getJurisprudenciaFiltrada().map((j) => {
                const key = `juris_${j.ID}`;
                const estaExpandido = expandidos[key] || false;
                const preview = getPreview(j.Cita, 2);
                const tieneMas = j.Cita && j.Cita.split('\n').filter(l => l.trim() !== '').length > 2;

                return (
                  <div
                    key={j.ID}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '15px',
                      marginBottom: '10px',
                      backgroundColor: '#f7fafc',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => toggleExpandir(j.ID, 'juris')}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#edf2f7'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{j.Tema || 'Sin tema'}</strong>
                        {j.Subtema && <span style={{ marginLeft: '10px', color: '#4a5568' }}>→ {j.Subtema}</span>}
                        {j.Juzgado && <span style={{ marginLeft: '10px', color: '#718096', fontSize: '0.8rem' }}>({j.Juzgado})</span>}
                      </div>
                      <span style={{ color: '#4a5568', fontSize: '0.8rem' }}>
                        {estaExpandido ? '▲' : '▼'}
                      </span>
                    </div>
                    <div style={{ marginTop: '8px', color: '#4a5568', fontSize: '0.9rem' }}>
                      {preview ? (
                        <div style={{ whiteSpace: 'pre-wrap' }}>
                          {preview}
                          {tieneMas && !estaExpandido && (
                            <span style={{ color: '#3182ce', marginLeft: '5px' }}>... <em>clic para leer más</em></span>
                          )}
                        </div>
                      ) : (
                        <em style={{ color: '#a0aec0' }}>Sin contenido</em>
                      )}
                    </div>
                    {/* CAMBIO 4: Permitir seleccionar y copiar el texto expandido */}
                    {estaExpandido && j.Cita && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', fontSize: '0.95rem', backgroundColor: 'white', padding: '12px', borderRadius: '4px', userSelect: 'text', cursor: 'text' }}>
                        {j.Cita}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'leyes' && (
        <div>
          <h3>📜 Leyes</h3>
          {leyes.length === 0 ? <p>No hay leyes cargadas.</p> : (
            <div>
              {leyes.map((l) => {
                const key = `ley_${l.ID}`;
                const estaExpandido = expandidos[key] || false;
                const preview = getPreview(l.Texto, 2);
                const tieneMas = l.Texto && l.Texto.split('\n').filter(line => line.trim() !== '').length > 2;

                return (
                  <div
                    key={l.ID}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '15px',
                      marginBottom: '10px',
                      backgroundColor: '#f7fafc',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => toggleExpandir(l.ID, 'ley')}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#edf2f7'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{l.Numero || 'Sin número'}</strong>
                        {l.Jurisdiccion && <span style={{ marginLeft: '10px', color: '#4a5568' }}>({l.Jurisdiccion})</span>}
                      </div>
                      <span style={{ color: '#4a5568', fontSize: '0.8rem' }}>
                        {estaExpandido ? '▲' : '▼'}
                      </span>
                    </div>
                    <div style={{ marginTop: '8px', color: '#4a5568', fontSize: '0.9rem' }}>
                      {preview ? (
                        <div style={{ whiteSpace: 'pre-wrap' }}>
                          {preview}
                          {tieneMas && !estaExpandido && (
                            <span style={{ color: '#3182ce', marginLeft: '5px' }}>... <em>clic para leer más</em></span>
                          )}
                        </div>
                      ) : (
                        <em style={{ color: '#a0aec0' }}>Sin contenido</em>
                      )}
                    </div>
                    {estaExpandido && l.Texto && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', fontSize: '0.95rem', backgroundColor: 'white', padding: '12px', borderRadius: '4px', userSelect: 'text', cursor: 'text' }}>
                        {l.Texto}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
