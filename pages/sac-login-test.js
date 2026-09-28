import { useState } from 'react';

export default function SACLoginTest() {
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
      const res = await fetch('/api/sac/login-simple', {
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
    <div style={{ padding: '60px 20px 20px', maxWidth: '100%' }}>
      <h1>🔐 Prueba de Login POST Simple</h1>
      <p style={{ color: '#666' }}>
        Intenta hacer login sin Playwright. Si funciona, podemos automatizar todo.
      </p>
      
      <div style={{ 
        backgroundColor: '#f0f4f8', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px',
        maxWidth: '500px'
      }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Usuario:</label>
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
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Contraseña:</label>
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
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          onClick={handleTest}
          disabled={cargando || !usuario || !contraseña}
          style={{
            width: '100%',
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '12px',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: cargando ? 'not-allowed' : 'pointer',
            opacity: (cargando || !usuario || !contraseña) ? 0.5 : 1
          }}
        >
          {cargando ? '⏳ Intentando...' : '🔐 Intentar Login'}
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
          <strong>❌ Error:</strong>
          <p>{error}</p>
        </div>
      )}

      {resultado && (
        <div style={{
          backgroundColor: '#ecfdf5',
          color: '#065f46',
          padding: '15px',
          borderRadius: '4px'
        }}>
          <h3>📊 Resultado del Login</h3>
          
          <p><strong>¿Logueado?</strong> {resultado.estaLogueado ? '✅ Sí' : '❌ No'}</p>
          <p><strong>Status HTTP:</strong> {resultado.debug.statusCode}</p>
          <p><strong>HTML antes:</strong> {resultado.debug.htmlLengthAntes} bytes</p>
          <p><strong>HTML después:</strong> {resultado.debug.htmlLengthDespues} bytes</p>
          
          {resultado.debug.htmlLengthDespues > resultado.debug.htmlLengthAntes && (
            <p style={{ color: '#059669', fontWeight: 'bold' }}>✅ El HTML después es más grande (probablemente logueado)</p>
          )}

          <h4>HTML después (primeros 3000 caracteres):</h4>
          <pre style={{
            backgroundColor: '#f3f4f6',
            padding: '10px',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '400px',
            fontSize: '0.8rem'
          }}>
            {resultado.debug.htmlSnippetDespues}
          </pre>
        </div>
      )}
    </div>
  );
}
