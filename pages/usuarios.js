// pages/usuarios.js
// Panel de administración de usuarios (solo admin)

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import BotonInicio from '../components/BotonInicio';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoPin, setNuevoPin] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [session, setSession] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    if (cookies.user) {
      try {
        const userData = JSON.parse(decodeURIComponent(cookies.user));
        setSession(userData);
        if (userData.rol !== 'admin') {
          router.push('/');
        } else {
          cargarUsuarios(userData);
        }
      } catch (e) {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, []);

  const cargarUsuarios = async (userSession) => {
    try {
      const response = await fetch('/api/usuarios', {
        headers: {
          'email': userSession.email,
          'pin': '3543'
        }
      });
      const data = await response.json();
      if (data.usuarios) {
        setUsuarios(data.usuarios);
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    setCargando(true);

    if (!nuevoEmail || !nuevoPin) {
      setError('Email y PIN son obligatorios');
      setCargando(false);
      return;
    }
    if (nuevoPin.length !== 4 || !/^\d+$/.test(nuevoPin)) {
      setError('El PIN debe ser de 4 dígitos numéricos');
      setCargando(false);
      return;
    }

    try {
      const response = await fetch('/api/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'email': session.email,
          'pin': '3543'
        },
        body: JSON.stringify({ email: nuevoEmail, pin: nuevoPin })
      });
      const data = await response.json();
      if (data.success) {
        setMensaje('✅ Usuario creado correctamente');
        setNuevoEmail('');
        setNuevoPin('');
        cargarUsuarios(session);
      } else {
        setError(data.error || 'Error al crear usuario');
      }
    } catch (error) {
      setError('Error: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const handleToggleActivo = async (email, activo) => {
    try {
      const response = await fetch('/api/usuarios', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'email': session.email,
          'pin': '3543'
        },
        body: JSON.stringify({ email, activo: !activo })
      });
      const data = await response.json();
      if (data.success) {
        cargarUsuarios(session);
      } else {
        setError(data.error || 'Error al actualizar');
      }
    } catch (error) {
      setError('Error: ' + error.message);
    }
  };

  if (!session) {
    return <div className="container"><p>Cargando...</p></div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BotonInicio />
          <h1>👥 Administración de Usuarios</h1>
        </div>
        <a href="/" style={{ color: '#3182ce', textDecoration: 'none' }}>← Volver al inicio</a>
      </div>

      <div style={{ backgroundColor: '#f7fafc', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2>➕ Crear Nuevo Usuario</h2>
        <form onSubmit={handleCrearUsuario} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="email"
            value={nuevoEmail}
            onChange={(e) => setNuevoEmail(e.target.value)}
            placeholder="Email del usuario"
            style={{ flex: 2, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            required
          />
          <input
            type="password"
            value={nuevoPin}
            onChange={(e) => setNuevoPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="PIN (4 dígitos)"
            style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            required
          />
          <button type="submit" style={{ backgroundColor: '#38a169' }} disabled={cargando}>
            {cargando ? 'Creando...' : 'Crear Usuario'}
          </button>
        </form>
        {error && <div style={{ color: '#e53e3e', marginTop: '10px' }}>{error}</div>}
        {mensaje && <div style={{ color: '#38a169', marginTop: '10px' }}>{mensaje}</div>}
      </div>

      <h2>📋 Usuarios Registrados</h2>
      {usuarios.length === 0 ? (
        <p>No hay usuarios registrados.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#edf2f7' }}>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Rol</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Estado</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((user) => (
              <tr key={user.Email}>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{user.Email}</td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{user.Rol || 'usuario'}</td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: user.Activo === 'SI' ? '#38a169' : '#e53e3e' }}>
                    {user.Activo === 'SI' ? '✅ Activo' : '❌ Inactivo'}
                  </span>
                </td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
                  {user.Email !== 'matiasbaronetto@gmail.com' && (
                    <button
                      onClick={() => handleToggleActivo(user.Email, user.Activo === 'SI')}
                      style={{
                        backgroundColor: user.Activo === 'SI' ? '#e53e3e' : '#38a169',
                        padding: '5px 10px',
                        fontSize: '0.8rem'
                      }}
                    >
                      {user.Activo === 'SI' ? 'Desactivar' : 'Activar'}
                    </button>
                  )}
                  {user.Email === 'matiasbaronetto@gmail.com' && (
                    <span style={{ color: '#4a5568' }}>👑 Admin</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
