import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';


export default function SACSync() {
  const router = useRouter();

  const [usuario, setUsuario] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [emailUsuario, setEmailUsuario] = useState('');
  const [autoIntentado, setAutoIntentado] = useState(false);

  // Estado de la conexión: 'verificando' | 'conectado' | 'desconectado'
  const [estadoConexion, setEstadoConexion] = useState('verificando');
  const [mensajeConexion, setMensajeConexion] = useState('');
  const [diagnosticoConexion, setDiagnosticoConexion] = useState(null);

  const [sincronizando, setSincronizando] = useState(false);
  const [resultadoSync, setResultadoSync] = useState(null);
  const [errorSync, setErrorSync] = useState('');
  const [probandoCedulas, setProbandoCedulas] = useState(false);
  const [diagnosticoCedulas, setDiagnosticoCedulas] = useState(null);

  const handleProbarCedulas = async () => {
    const cuerpo = cuerpoCredenciales();
    if (!cuerpo) return;
    setProbandoCedulas(true);
    setDiagnosticoCedulas(null);
    try {
      const response = await fetch('/api/sac/test-cedulas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo)
      });
      const data = await response.json();
      setDiagnosticoCedulas(data.diagnostico || data);
    } catch (error) {
      setDiagnosticoCedulas({ error: error.message });
    } finally {
      setProbandoCedulas(false);
    }
  };

  // Leer el usuario logueado (cookie "user") para poder conectar
  // automáticamente con las credenciales del SAC que ya tenga guardadas.
  useEffect(() => {
    try {
      const cookies = document.cookie.split(';').reduce((acc, c) => {
        const [k, ...rest] = c.trim().split('=');
        acc[k] = rest.join('=');
        return acc;
      }, {});
      if (cookies.user) {
        const u = JSON.parse(decodeURIComponent(cookies.user));
        if (u?.email) setEmailUsuario(u.email);
      }
    } catch (e) {
      // sin cookie de sesión: queda el login manual
    }
  }, []);

  const cuerpoCredenciales = () => {
    if (usuario && contraseña) return { usuario, contraseña };
    if (emailUsuario) return { email: emailUsuario };
    return null;
  };

  const verificarConexion = async (cuerpo) => {
    setEstadoConexion('verificando');
    setMensajeConexion('');
    try {
      const response = await fetch('/api/sac/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo)
      });
      const data = await response.json();
      setDiagnosticoConexion(data);
      if (data.success) {
        setEstadoConexion('conectado');
        setMensajeConexion(data.mensaje || 'Conectado al SAC');
      } else {
        setEstadoConexion('desconectado');
        setMensajeConexion(data.mensaje || data.error || 'No se pudo conectar');
      }
    } catch (error) {
      setEstadoConexion('desconectado');
      setMensajeConexion(`Error: ${error.message}`);
    }
  };

  // Al entrar a la página, si tenemos el email del usuario logueado,
  // probamos conectar solos con las credenciales guardadas.
  useEffect(() => {
    if (emailUsuario && !autoIntentado) {
      setAutoIntentado(true);
      verificarConexion({ email: emailUsuario });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailUsuario]);

  const handleConectarManual = () => {
    const cuerpo = cuerpoCredenciales();
    if (!cuerpo) {
      setMensajeConexion('Ingresá usuario y contraseña del SAC');
      return;
    }
    verificarConexion(cuerpo);
  };

  const handleSincronizar = async () => {
    const cuerpo = cuerpoCredenciales();
    if (!cuerpo) {
      setErrorSync('No hay credenciales del SAC disponibles');
      return;
    }
    setSincronizando(true);
    setErrorSync('');
    setResultadoSync(null);

    try {
      const response = await fetch('/api/sac/sincronizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo)
      });
      const texto = await response.text();
      let data;
      try {
        data = JSON.parse(texto);
      } catch {
        throw new Error(
          `El servidor no devolvió una respuesta válida (status ${response.status}). Puede haber excedido el tiempo máximo.`
        );
      }
      setResultadoSync(data);
      if (!data.success) {
        setErrorSync(data.mensaje || data.error || 'No se pudo sincronizar');
      }
    } catch (error) {
      setErrorSync(error.message);
    } finally {
      setSincronizando(false);
    }
  };

  const card = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border-light)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-sm)',
    padding: '20px',
  };

  const botonPrimario = (size) => ({
    backgroundColor: 'var(--color-cobalt)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    padding: size === 'lg' ? '12px 28px' : '8px 16px',
    fontSize: size === 'lg' ? '0.95rem' : '0.85rem',
  });

  return (
    <div style={{ maxWidth: '720px', margin: '40px auto', padding: '0 20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
          🔗 Sincronización con SAC
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Trae los movimientos nuevos del Poder Judicial de Córdoba a los expedientes que ya tenés en LexHub.
        </p>
      </div>

      {/* Estado de conexión */}
      <div style={{ ...card, marginBottom: '16px' }}>
        {estadoConexion === 'verificando' && (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⏳ Conectando con el SAC...
          </div>
        )}

        {estadoConexion === 'conectado' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-success-text)', display: 'inline-block' }} />
              <span style={{ color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>
                Conectado al SAC
              </span>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>{emailUsuario}</span>
          </div>
        )}

        {estadoConexion === 'desconectado' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-urgent-text)', display: 'inline-block' }} />
              <span style={{ color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>
                No conectado
              </span>
            </div>
            {mensajeConexion && (
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
                {mensajeConexion}
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Usuario (matrícula) del SAC"
                style={{
                  flex: '1 1 220px',
                  padding: '9px 12px',
                  border: '1px solid var(--color-border-light)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.88rem',
                }}
              />
              <input
                type="password"
                value={contraseña}
                onChange={(e) => setContraseña(e.target.value)}
                placeholder="Contraseña del SAC"
                style={{
                  flex: '1 1 220px',
                  padding: '9px 12px',
                  border: '1px solid var(--color-border-light)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.88rem',
                }}
              />
            </div>
            <button
              onClick={handleConectarManual}
              style={botonPrimario('sm')}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-cobalt-dark)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-cobalt)'; }}
            >
              Conectar
            </button>
          </div>
        )}
      </div>

      {/* Acción principal: sincronizar */}
      {estadoConexion === 'conectado' && (
        <div style={{ ...card, marginBottom: '16px', textAlign: 'center' }}>
          <button
            onClick={handleSincronizar}
            disabled={sincronizando}
            style={{
              ...botonPrimario('lg'),
              opacity: sincronizando ? 0.7 : 1,
              cursor: sincronizando ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => { if (!sincronizando) e.currentTarget.style.backgroundColor = 'var(--color-cobalt-dark)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-cobalt)'; }}
          >
            {sincronizando ? '⏳ Sincronizando...' : '🔄 Sincronizar movimientos nuevos'}
          </button>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginTop: '10px' }}>
            Revisa tus expedientes en el SAC y agrega a LexHub los movimientos nuevos que tengan contenido.
          </p>
        </div>
      )}

      {/* Error de sincronización */}
      {errorSync && (
        <div style={{ ...card, marginBottom: '16px', borderColor: 'var(--color-urgent-border)', backgroundColor: 'var(--color-urgent-bg)' }}>
          <p style={{ color: 'var(--color-urgent-text)', fontSize: '0.85rem', margin: 0 }}>{errorSync}</p>
        </div>
      )}

      {/* Resultado de la sincronización */}
      {resultadoSync && resultadoSync.success && (
        <div style={{ ...card, marginBottom: '16px', borderColor: 'var(--color-success-border)', backgroundColor: 'var(--color-success-bg)' }}>
          <p style={{ color: 'var(--color-success-text)', fontSize: '0.88rem', fontWeight: 600, margin: 0 }}>
            {resultadoSync.mensaje}
          </p>
        </div>
      )}

      {resultadoSync && resultadoSync.agregados && resultadoSync.agregados.length > 0 && (
        <div style={{ ...card, marginBottom: '16px', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border-light)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
            Movimientos agregados ({resultadoSync.agregados.length})
          </div>
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            {resultadoSync.agregados.map((a, i) => (
              <div
                key={i}
                onClick={() => router.push(`/expediente/${encodeURIComponent(a.numeroSAC)}`)}
                style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--color-border-light)',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                  Exp. {a.numeroSAC} — {a.tipoOperacion}
                  <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)' }}> ({a.fecha})</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  {a.caratula}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-primary)' }}>{a.resumen}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detalle técnico, por si hace falta diagnosticar algo */}
      {diagnosticoConexion && (
        <details style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginTop: '20px' }}>
          <summary style={{ cursor: 'pointer' }}>Ver detalle técnico de la conexión</summary>
          <pre style={{
            whiteSpace: 'pre-wrap',
            backgroundColor: 'var(--color-bg-primary)',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            marginTop: '8px',
            maxHeight: '300px',
            overflowY: 'auto',
          }}>
            {JSON.stringify(diagnosticoConexion, null, 2)}
          </pre>
        </details>
      )}

      {/* Prueba aislada: formato de ObtenerCedulas (en construcción) */}
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={handleProbarCedulas}
          disabled={probandoCedulas}
          style={{
            fontSize: '0.78rem',
            color: 'var(--color-text-tertiary)',
            background: 'none',
            border: '1px solid var(--color-border-light)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 10px',
            cursor: probandoCedulas ? 'not-allowed' : 'pointer',
          }}
        >
          {probandoCedulas ? 'Probando...' : '🔍 Probar formato de cédulas (diagnóstico)'}
        </button>
        {diagnosticoCedulas && (
          <pre style={{
            whiteSpace: 'pre-wrap',
            backgroundColor: 'var(--color-bg-primary)',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            marginTop: '8px',
            maxHeight: '300px',
            overflowY: 'auto',
            fontSize: '0.75rem',
            color: 'var(--color-text-tertiary)',
          }}>
            {JSON.stringify(diagnosticoCedulas, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
