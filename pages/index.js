// pages/ia-general.js
// Asistente IA general con consultas sobre derecho usando la biblioteca del sistema

import { useState } from 'react';
import { useRouter } from 'next/router';
import BotonInicio from '../components/BotonInicio';

export default function IAGeneralPage() {
  const [consulta, setConsulta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consulta.trim()) {
      setMensaje('⚠️ Escribí una consulta');
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
        setMensaje('✅ Consulta procesada correctamente');
      } else {
        let errorMsg = data.error || 'Error desconocido';
        if (response.status === 429) {
          errorMsg = '⚠️ Límite de uso de Gemini alcanzado. Esperá 24 horas o verificá tu API Key.';
        }
        setMensaje('❌ Error: ' + errorMsg);
      }
    } catch (error) {
      console.error('Error en consulta IA:', error);
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
          <h1>🤖 Asistente IA General</h1>
        </div>
        <a href="/" style={{ color: '#3182ce', textDecoration: 'none' }}>← Volver al inicio</a>
      </div>

      <p style={{ color: '#4a5568', marginBottom: '20px' }}>
        Hacé consultas generales sobre derecho. La IA usará exclusivamente la biblioteca legal cargada en el sistema (leyes, jurisprudencia y doctrina).
      </p>

      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Ej: ¿Qué pruebas son importantes para una privación de responsabilidad parental en el Juzgado de Familia 2 de Córdoba?"
            style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '1rem' }}
            disabled={cargando}
          />
          <button type="submit" style={{ backgroundColor: '#3182ce' }} disabled={cargando}>
            {cargando ? 'Consultando...' : '🔍 Consultar'}
          </button>
        </div>
      </form>

      {mensaje && (
        <div style={{ 
          padding: '10px', 
          borderRadius: '8px', 
          backgroundColor: mensaje.includes('✅') ? '#c6f6d5' : '#fed7d7', 
          color: mensaje.includes('✅') ? '#22543d' : '#9b2c2c',
          marginBottom: '20px'
        }}>
          {mensaje}
        </div>
      )}

      {respuesta && (
        <div style={{
          backgroundColor: '#f7fafc',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.6',
          maxHeight: '500px',
          overflow: 'auto'
        }}>
          {respuesta}
        </div>
      )}
    </div>
  );
}
