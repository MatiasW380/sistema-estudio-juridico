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
      
      if (!data.success) {
        setError(data.error);
      } else {
        setResultado(data);
      }
    } catch (e) {
      setError('Error: ' + e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ padding: '60px 20px 20px', maxWidth: '100%', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>🧪 Prueba de Conexión al SAC</h1>
      <p style={{ color: '#666', fontSize: '0.95rem' }}>
        Ingresa tus credenciales del SAC para ver exactamente qué información contiene
      </p>
      
      <div style={{ 
        backgroundColor: '#f0f4f8', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px',
        maxWidth: '600px'
      }}>
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
          {cargando ? '⏳ Conectando...' : '🔐 Conectar y Ver HTML'}
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
          <p><strong>{error}</strong></p>
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
          <h3>✅ {resultado.message}</h3>
          
          {resultado.debug && (
            <div style={{ marginTop: '15px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h4>📊 Información:</h4>
                <p><strong>Tamaño del HTML:</strong> {resultado.debug.htmlLength} bytes</p>
                <p><strong>Form Action:</strong> {resultado.debug.formAction}</p>
                <p><strong>Form Method:</strong> {resultado.debug.formMethod}</p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4>👁️ Texto visible en la página:</h4>
                <pre style={{
                  backgroundColor: '#f3f4f6',
                  padding: '10px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '400px',
                  fontSize: '0.9rem',
                  color: '#1f2937'
                }}>
                  {resultado.debug.textoVisible}
                </pre>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4>📝 HTML (primeros 5000 caracteres):</h4>
                <pre style={{
                  backgroundColor: '#f3f4f6',
                  padding: '10px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '600px',
                  fontSize: '0.8rem',
                  color: '#666'
                }}>
                  {resultado.debug.htmlSnippet}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '40px', color: '#666', fontSize: '0.9rem' }}>
        <p>
          <strong>¿Qué hace esta página?</strong><br/>
          1. Se conecta al SAC<br/>
          2. Obtiene el HTML de la página<br/>
          3. Muestra exactamente qué estructura tiene<br/>
          4. Muestra el texto visible<br/>
          <br/>
          Con esta información podemos escribir el scraping correcto.
        </p>
      </div>
    </div>
  );
}
