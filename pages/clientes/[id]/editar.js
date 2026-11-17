// pages/clientes/[id]/editar.js
// Página para editar los datos de un cliente

import { useState } from 'react';
import { useRouter } from 'next/router';
import { getClientes } from '../../../lib/googleSheets';

function parseUserFromCookie(rawCookie = '') {
  const userCookie = rawCookie
    .split(';')
    .find((c) => c.trim().startsWith('user='));

  if (!userCookie) return null;

  try {
    const value = decodeURIComponent(userCookie.split('=').slice(1).join('='));
    const data = JSON.parse(value);
    return data?.email ? data : null;
  } catch {
    return null;
  }
}

export async function getServerSideProps(context) {
  const { id } = context.params;
  const userData = parseUserFromCookie(context.req.headers.cookie || '');

  if (!userData?.email) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  try {
    const clientes = await getClientes(userData.email);
    const cliente = clientes.find(c => c.ID_Cliente === id);
    if (!cliente) {
      return { notFound: true };
    }
    return {
      props: { cliente }
    };
  } catch (error) {
    console.error('Error al cargar cliente:', error);
    return { notFound: true };
  }
}

export default function EditarCliente({ cliente }) {
  const [nombre, setNombre] = useState(cliente.Nombre_Cliente || '');
  const [telefono, setTelefono] = useState(cliente.Telefono || '');
  const [dni, setDni] = useState(cliente.DNI || '');
  const [domicilio, setDomicilio] = useState(cliente.Domicilio || '');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const router = useRouter();
  const { id } = router.query;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      setCargando(false);
      return;
    }

    try {
      const response = await fetch('/api/actualizar-cliente', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          dni: dni.trim(),
          domicilio: domicilio.trim(),
        }),
      });

      const resultado = await response.json();

      if (resultado.success) {
        router.push(`/clientes/${id}`);
      } else {
        setError(resultado.error || 'Error al actualizar el cliente');
      }
    } catch (err) {
      console.error('Error en handleSubmit:', err);
      setError('Error: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="container lx-page" style={{ maxWidth: '720px' }}>
      <div className="exp-breadcrumb">
        <button type="button" className="exp-breadcrumb-link" onClick={() => router.push('/clientes')}>Clientes</button>
        <span className="exp-breadcrumb-sep">/</span>
        <button type="button" className="exp-breadcrumb-link" onClick={() => router.push(`/clientes/${id}`)}>{nombre || id}</button>
        <span className="exp-breadcrumb-sep">/</span>
        <span>Editar</span>
      </div>
      <div className="lx-page-head" style={{ marginTop: 0 }}>
        <div>
          <h1>Editar cliente</h1>
          <p>Cliente n.º {id}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="lx-card cli-form">

        <div className="form-group">
          <label className="label-required">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Juan Perez"
            required
          />
        </div>

        <div className="form-group">
          <label>Teléfono</label>
          <input
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ej: 3511234567"
          />
        </div>

        <div className="form-group">
          <label>DNI</label>
          <input
            type="text"
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
            placeholder="Ej: 12345678"
          />
        </div>

        <div className="form-group">
          <label>Domicilio</label>
          <input
            type="text"
            value={domicilio}
            onChange={(e) => setDomicilio(e.target.value)}
            placeholder="Ej: Calle Falsa 123"
          />
        </div>

        {error && (
          <div className="alert alert-urgent" style={{ marginTop: '4px' }}>{error}</div>
        )}

        <div className="cli-form-actions">
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="button button-secondary button-sm" onClick={() => router.push(`/clientes/${id}`)}>
              Cancelar
            </button>
            <button type="submit" className="button button-sm" disabled={cargando}>
              {cargando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
