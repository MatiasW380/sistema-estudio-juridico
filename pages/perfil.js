// pages/perfil.js
// Página de perfil del abogado

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

function parseUserFromCookie(rawCookie = '') {
  const userCookie = rawCookie
    .split(';')
    .find((c) => c.trim().startsWith('user='));

  if (!userCookie) return null;

  try {
    const value = decodeURIComponent(userCookie.split('=').slice(1).join('='));
    const data = JSON.parse(value);
    if (!data?.email) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getServerSideProps(context) {
  const cookies = context.req.headers.cookie || '';
  const userData = parseUserFromCookie(cookies);

  if (!userData?.email) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return {
    props: {
      usuarioEmail: userData.email,
    },
  };
}

export default function PerfilPage({ usuarioEmail }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const [nombre, setNombre] = useState('');
  const [domicilioConstituido, setDomicilioConstituido] = useState('');
  const [matricula, setMatricula] = useState('');

  useEffect(() => {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, ...rest] = cookie.trim().split('=');
      acc[key] = rest.join('=');
      return acc;
    }, {});

    if (!cookies.user) {
      router.push('/login');
      return;
    }

    cargarPerfil();
  }, [router]);

  const cargarPerfil = async () => {
    try {
      const response = await fetch('/api/perfil');
      const data = await response.json();

      if (data.perfil) {
        setNombre(data.perfil.nombre || '');
        setDomicilioConstituido(data.perfil.domicilioConstituido || '');
        setMatricula(data.perfil.matricula || '');
      }
    } catch (err) {
      console.error('Error al cargar perfil:', err);
      setError('Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    if (!nombre.trim() || !domicilioConstituido.trim() || !matricula.trim()) {
      setError('Todos los campos son requeridos');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          domicilioConstituido: domicilioConstituido.trim(),
          matricula: matricula.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al guardar perfil');
        return;
      }

      setMensaje('Perfil actualizado correctamente');
      setTimeout(() => setMensaje(''), 3000);
    } catch (err) {
      console.error('Error al guardar perfil:', err);
      setError('Error al guardar perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p>Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ marginBottom: '4px' }}>Mi Perfil</h1>
        <p style={{ margin: 0 }}>Información profesional y de contacto</p>
      </div>

      <div style={{ maxWidth: '500px' }}>
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #fca5a5' }}>
              {error}
            </div>
          )}

          {mensaje && (
            <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #86efac' }}>
              {mensaje}
            </div>
          )}

          <div className="form-group">
            <label className="label-required">Nombre Completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Juan García López"
              required
            />
          </div>

          <div className="form-group">
            <label className="label-required">Domicilio Constituido</label>
            <textarea
              value={domicilioConstituido}
              onChange={(e) => setDomicilioConstituido(e.target.value)}
              placeholder="Ej: Calle Principal 123, piso 2, Córdoba"
              rows="3"
              required
              style={{ fontFamily: 'inherit' }}
            />
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Domicilio para notificaciones y escritos
            </div>
          </div>

          <div className="form-group">
            <label className="label-required">Matrícula Profesional</label>
            <input
              type="text"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder="Ej: CAC 12345"
              required
            />
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Número de matrícula ante el Colegio de Abogados
            </div>
          </div>

          <div style={{ marginTop: '32px' }}>
            <button
              type="submit"
              className="button"
              disabled={saving}
              style={{ width: '100%' }}
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>

          <div style={{ marginTop: '12px' }}>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => router.back()}
              style={{ width: '100%' }}
            >
              Volver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
