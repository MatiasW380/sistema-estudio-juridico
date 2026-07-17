// pages/biblioteca.js
// Módulo de biblioteca legal: modelos, jurisprudencia y leyes

import { useState, useEffect } from 'react';
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
  const router = useRouter();

  // Estados para formularios
  const [nuevoModelo, setNuevoModelo] = useState({ nombre: '', fuero: '', contenido: '' });
  const [nuevaJurisprudencia, setNuevaJurisprudencia] = useState({ tema: '', subtema: '', juzgado: '', cita: '' });
  const [nuevaLey, setNuevaLey] = useState({ numero: '', jurisdiccion: '', texto: '' });

  const handleChange = (e, setter) => {
    const { name, value } = e.target;
    setter(prev => ({ ...prev, [name]: value }));
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
                <textarea name="contenido" value={nuevoModelo.contenido} onChange={(e) => handleChange(e, setNuevoModelo)} placeholder="Escribí el modelo del escrito..." style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', minHeight: '150px' }} required />
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
                <textarea name="cita" value={nuevaJurisprudencia.cita} onChange={(e) => handleChange(e, setNuevaJurisprudencia)} placeholder="Escribí la cita jurisprudencial..." style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', minHeight: '100px' }} required />
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
                <textarea name="texto" value={nuevaLey.texto} onChange={(e) => handleChange(e, setNuevaLey)} placeholder="Escribí el texto de la ley..." style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', minHeight: '100px' }} required />
              </div>
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ backgroundColor: '#3182ce' }} disabled={cargando}>{cargando ? 'Guardando...' : 'Guardar Ley'}</button>
                <button type="button" onClick={() => { setMostrarFormulario(false); setMensaje(''); }} style={{ backgroundColor: '#718096' }}>Cancelar</button>
              </div>
            </form>
          )}
          {mensaje && <div style={{ marginTop: '15px', padding: '10px', borderRadius: '8px', backgroundColor: mensaje.includes('✅') ? '#c6f6d5' : '#fed7d7', color: mensaje.includes('✅') ? '#22543d' : '#9b2c2c' }}>{mensaje}</div>}
        </div>
      )}

      {/* Listados */}
      {activeTab === 'modelos' && (
        <div>
          <h3>📋 Modelos de Escritos</h3>
          {modelos.length === 0 ? <p>No hay modelos cargados.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ backgroundColor: '#edf2f7' }}>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>ID</th>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Nombre</th>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Fuero</th>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Contenido</th>
              </tr></thead>
              <tbody>
                {modelos.map((m, i) => (
                  <tr key={i}>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{m.ID}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{m.Nombre}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{m.Fuero || '-'}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.Contenido?.substring(0, 100)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'jurisprudencia' && (
        <div>
          <h3>⚖️ Jurisprudencia</h3>
          {jurisprudencia.length === 0 ? <p>No hay jurisprudencia cargada.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ backgroundColor: '#edf2f7' }}>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>ID</th>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Tema</th>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Subtema</th>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Juzgado</th>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Cita</th>
              </tr></thead>
              <tbody>
                {jurisprudencia.map((j, i) => (
                  <tr key={i}>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{j.ID}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{j.Tema}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{j.Subtema || '-'}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{j.Juzgado || '-'}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.Cita?.substring(0, 80)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'leyes' && (
        <div>
          <h3>📜 Leyes</h3>
          {leyes.length === 0 ? <p>No hay leyes cargadas.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ backgroundColor: '#edf2f7' }}>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>ID</th>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Número</th>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Jurisdicción</th>
                <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Texto</th>
              </tr></thead>
              <tbody>
                {leyes.map((l, i) => (
                  <tr key={i}>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{l.ID}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{l.Numero}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{l.Jurisdiccion || '-'}</td>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.Texto?.substring(0, 80)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
