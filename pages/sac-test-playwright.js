import { useState } from 'react';

export default function SACTestPlaywright() {
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
      const res = await fetch('/api/sac/login-playwright', {
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
      <h1>🎭 Prueba con Playwright</h1>
      <p style={{ color: '#666' }}>
        Usando Playwright (navegador real) para manejar CloudFlare Turnstile
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
            Usuario:
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
            opacity: (cargando || !usuario || !contraseña) ? 0.5 : 1,
            width: '100%'
          }}
        >
          {cargando ? '⏳ Conectando con Playwright...' : '🎭 Probar Playwright'}
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
          <h3>✅ {resultado.message}</h3>
          
          {resultado.debug && (
            <div style={{ marginTop: '15px' }}>
              <p><strong>URL antes:</strong> {resultado.debug.urlAntes}</p>
              <p><strong>URL después:</strong> {resultado.debug.urlDespues}</p>
              <p><strong>HTML length:</strong> {resultado.debug.htmlLength} bytes</p>
              
              <h4>HTML Snippet:</h4>
              <pre style={{
                backgroundColor: '#f3f4f6',
                padding: '10px',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '400px',
                fontSize: '0.75rem'
              }}>
                {resultado.debug.htmlSnippet}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
