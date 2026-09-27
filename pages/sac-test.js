import { useState } from 'react';

export default function SACTest() {
  const [usuario, setUsuario] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  const handleTest = async () => {
    setError('');
    setResultado(null);
    setCargando(true);

    try {
      const res = await fetch('/api/sac/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, contraseña })
      });

      const data = await res.json();
      setResultado(data);

      if (!data.success) {
        setError(data.error);
      }
    } catch (e) {
      setError('Error: ' + e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ padding: '60px 20px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🧪 Prueba de Conexión al SAC</h1>
      
      <div style={{ 
        backgroundColor: '#f0f4f8', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>Credenciales SAC</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
            Usuario (matrícula):
          </label>
          <input
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Tu usuario del SAC"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
            Contraseña:
          </label>
          <input
            type="password"
            value={contraseña}
            onChange={(e) => setContraseña(e.target.value)}
            placeholder="Tu contraseña"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          onClick={handleTest}
          disabled={cargando || !usuario || !contraseña}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: cargando ? 'not-allowed' : 'pointer',
            opacity: (cargando || !usuario || !contraseña) ? 0.5 : 1
          }}
        >
          {cargando ? '⏳ Conectando...' : '🔐 Conectar y Ver Datos'}
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          padding: '15px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h3>❌ Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {resultado && (
        <div style={{
          backgroundColor: '#ecfdf5',
          color: '#065f46',
          padding: '15px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h3>✅ Resultado:</h3>
          <p>{resultado.message}</p>

          {resultado.debug && (
            <div style={{ marginTop: '15px' }}>
              <h4>📊 Información Técnica:</h4>
              <pre style={{
                backgroundColor: '#f3f4f6',
                padding: '10px',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '400px',
                fontSize: '0.85rem'
              }}>
                {JSON.stringify({
                  urlActual: resultado.debug.urlActual,
                  htmlLengthAntes: resultado.debug.htmlLengthAntes,
                  htmlLengthDespues: resultado.debug.htmlLengthDespues
                }, null, 2)}
              </pre>

              <h4>📝 HTML de la página (primeros 5000 caracteres):</h4>
              <pre style={{
                backgroundColor: '#f3f4f6',
                padding: '10px',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '500px',
                fontSize: '0.75rem',
                color: '#666'
              }}>
                {resultado.debug.htmlSnippetDespues}
              </pre>

              <h4>👁️ Texto visible en la página:</h4>
              <pre style={{
                backgroundColor: '#f3f4f6',
                padding: '10px',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '500px',
                fontSize: '0.8rem',
                color: '#1f2937'
              }}>
                {resultado.debug.textoVisiblePrimeras500lineas}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
