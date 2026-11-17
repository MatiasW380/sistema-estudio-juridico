// pages/ia-general.js
// Asistente IA general con consultas sobre derecho usando la biblioteca del sistema

import { useState } from 'react';
import { useRouter } from 'next/router';
import { Copy, Sparkles } from 'lucide-react';

export default function IAGeneralPage() {
  const [consulta, setConsulta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consulta.trim()) {
      setMensaje('Escribí una consulta');
      return;
    }

    setCargando(true);
    setMensaje('');
    setRespuesta('');

    try {
      const response = await fetch('/api/ia-general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consulta: consulta.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setRespuesta(data.resultado);
        setMensaje('Consulta procesada correctamente');
      } else {
        let errorMsg = data.error || 'Error desconocido';
        if (response.status === 429) {
          errorMsg = data.error || 'Gemini está recibiendo demasiadas consultas. Esperá un minuto y probá de nuevo.';
        }
        setMensaje('Error: ' + errorMsg);
      }
    } catch (error) {
      console.error('Error en consulta IA:', error);
      setMensaje('Error: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const ejemplos = [
    '¿Qué pruebas son importantes en una privación de responsabilidad parental?',
    '¿Cómo se fija la cuota alimentaria provisoria?',
    '¿Qué plazos rigen para apelar una sentencia de familia en Córdoba?',
  ];

  return (
    <div className="container lx-page" style={{ maxWidth: '860px' }}>
      <div className="lx-page-head">
        <div>
          <h1><span className="ia-badge"><Sparkles size={16} /></span> Asistente IA</h1>
          <p>Consultas sobre derecho usando la biblioteca legal cargada en LexHub (leyes, jurisprudencia y modelos)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="lx-card ia-box">
        <textarea
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e); }}
          placeholder="Escribí tu consulta…"
          disabled={cargando}
          rows={4}
        />
        <div className="ia-box-foot">
          <span className="dash-hint">Ctrl + Enter para enviar</span>
          <button type="submit" className="button button-sm lx-button-ai" disabled={cargando || !consulta.trim()}>
            <Sparkles size={15} /> {cargando ? 'Consultando…' : 'Consultar'}
          </button>
        </div>
      </form>

      {!respuesta && !cargando && (
        <div className="ia-examples">
          {ejemplos.map((e) => (
            <button key={e} type="button" className="ia-example" onClick={() => setConsulta(e)}>{e}</button>
          ))}
        </div>
      )}

      {mensaje && mensaje.includes('Error') && (
        <div className="alert alert-urgent" style={{ marginTop: '16px' }}>{mensaje}</div>
      )}

      {cargando && <div className="lx-empty" style={{ marginTop: '16px' }}>La IA está analizando tu consulta…</div>}

      {respuesta && (
        <div className="lx-card ia-answer">
          <div className="dash-card-head" style={{ marginBottom: '10px' }}>
            <h2><Sparkles size={15} style={{ color: '#7c3aed' }} /> Respuesta</h2>
            <button type="button" className="button button-ghost button-sm" onClick={() => navigator.clipboard?.writeText(respuesta)}>
              <Copy size={14} /> Copiar
            </button>
          </div>
          <div className="ia-answer-text">{respuesta}</div>
        </div>
      )}
    </div>
  );
}
