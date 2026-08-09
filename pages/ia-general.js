// pages/ia-general.js
// Asistente IA general con consultas sobre derecho usando la biblioteca del sistema

import { useState } from 'react';
import { useRouter } from 'next/router';

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
          errorMsg = 'Límite de uso de Gemini alcanzado. Esperá 24 horas o verificá tu API Key.';
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

  return (
    <div className="container">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '4px' }}>Asistente IA General</h1>
        <p style={{ margin: 0 }}>Consultas sobre derecho usando la biblioteca legal del sistema</p>
      </div>

      <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '0.95rem' }}>
        Hacé consultas generales sobre derecho. La IA usará exclusivamente la biblioteca legal cargada en el sistema (leyes, jurisprudencia y doctrina).
      </p>

      <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
        <div className="form-group">
          <input
            type="text"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Ej: ¿Qué pruebas son importantes para una privación de responsabilidad parental?"
            disabled={cargando}
          />
        </div>
        <button type="submit" className="button button-primary" disabled={cargando}>
          {cargando ? 'Consultando...' : 'Consultar'}
        </button>
      </form>

      {mensaje && (
        <div className={`form-note ${mensaje.includes('Error') ? 'error' : 'success'}`} style={{ marginBottom: '24px' }}>
          {mensaje}
        </div>
      )}

      {respuesta && (
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '20px',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.6',
          maxHeight: '500px',
          overflow: 'auto',
          fontSize: '0.95rem',
          color: '#334155'
        }}>
          {respuesta}
        </div>
      )}
    </div>
  );
}
