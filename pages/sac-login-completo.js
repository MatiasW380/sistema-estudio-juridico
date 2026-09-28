import { useState } from 'react';

export default function SACLoginCompleto() {
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
      const res = await fetch('/api/sac/login-completo', {
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
      <h1>🔐 Login Completo - Buscando Segundo Menú</h1>
      
      <div style={{ 
        backgroundColor: '#f0f4f8', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px',
        maxWidth: '500px'
      }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Usuario:</label>
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
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Contraseña:</label>
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
          {cargando ? '⏳ Conectando...' : '🔐 Login Completo'}
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
          <h3>✅ {resultado.message}</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <p><strong>HTML primer login:</strong> {resultado.debug.htmlLoginLength} bytes</p>
            <p><strong>HTML después login:</strong> {resultado.debug.htmlDespuesLoginLength} bytes</p>
          </div>

          {resultado.debug.selectsEncontrados && resultado.debug.selectsEncontrados.length > 0 && (
            <div style={{ marginBottom: '20px', backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '4px' }}>
              <h4>🔽 Selects encontrados:</h4>
              <pre style={{
                backgroundColor: '#f3f4f6',
                padding: '10px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '0.8rem'
              }}>
                {JSON.stringify(resultado.debug.selectsEncontrados, null, 2)}
              </pre>
            </div>
          )}

          {resultado.debug.linksConSAC && resultado.debug.linksConSAC.length > 0 && (
            <div style={{ marginBottom: '20px', backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '4px' }}>
              <h4>🔗 Links con SAC:</h4>
              <pre style={{
                backgroundColor: '#f3f4f6',
                padding: '10px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '0.8rem'
              }}>
                {JSON.stringify(resultado.debug.linksConSAC, null, 2)}
              </pre>
            </div>
          )}

          {resultado.debug.botonesConSAC && resultado.debug.botonesConSAC.length > 0 && (
            <div style={{ marginBottom: '20px', backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '4px' }}>
              <h4>🔘 Botones con SAC:</h4>
              <pre style={{
                backgroundColor: '#f3f4f6',
                padding: '10px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '0.8rem'
              }}>
                {JSON.stringify(resultado.debug.botonesConSAC, null, 2)}
              </pre>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <h4>📝 HTML Snippet (primeros 4000 caracteres):</h4>
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
        </div>
      )}
    </div>
  );
}
