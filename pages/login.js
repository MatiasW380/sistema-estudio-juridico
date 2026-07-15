// pages/login.js
// Página de login con email + PIN de 4 números

import { useState } from 'react';
import { useRouter } from 'next/router';
import { verificarUsuario } from '../lib/googleSheets';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    console.log('🔍 Intentando login con:', email, pin);

    if (!email || !pin) {
      setError('Completá todos los campos');
      setCargando(false);
      return;
    }
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      setError('El PIN debe ser de 4 dígitos numéricos');
      setCargando(false);
      return;
    }

    try {
      console.log('📤 Llamando a verificarUsuario...');
      const usuario = await verificarUsuario(email, pin);
      console.log('📥 Resultado de verificarUsuario:', usuario);

      if (usuario) {
        document.cookie = `user=${encodeURIComponent(JSON.stringify(usuario))}; path=/; max-age=86400`;
        router.push('/');
      } else {
        setError('Email o PIN incorrecto');
      }
    } catch (err) {
      console.error('❌ Error en handleSubmit:', err);
      setError('Error al verificar: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      backgroundColor: '#f4f7fc'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px', color: '#2d3748' }}>
          🏛️ Sistema de Gestión
        </h1>
        <p style={{ textAlign: 'center', color: '#4a5568', marginBottom: '30px' }}>
          Ingresá con tu email y PIN de 4 dígitos
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              disabled={cargando}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="1234"
              maxLength="4"
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #e2e8f0', 
                borderRadius: '8px',
                fontSize: '1.5rem',
                letterSpacing: '8px',
                textAlign: 'center'
              }}
              disabled={cargando}
              required
            />
            <small style={{ color: '#4a5568', display: 'block', marginTop: '5px', textAlign: 'center' }}>
              PIN de 4 dígitos numéricos
            </small>
          </div>

          {error && (
            <div style={{ 
              backgroundColor: '#fed7d7', 
              color: '#9b2c2c', 
              padding: '10px', 
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            style={{ 
              width: '100%', 
              padding: '12px', 
              backgroundColor: '#3182ce', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: cargando ? 'not-allowed' : 'pointer',
              opacity: cargando ? 0.7 : 1
            }}
            disabled={cargando}
          >
            {cargando ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
