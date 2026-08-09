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
    <div className="container">
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ marginBottom: '4px' }}>Editar Cliente</h1>
        <p>Modifica la información del cliente</p>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
        <div className="form-group">
          <label>ID Cliente</label>
          <input type="text" value={id} disabled />
          <span className="input-helper">ID asignado automáticamente</span>
        </div>

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
          <div className="form-note error" style={{ marginBottom: '16px' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="form-actions">
          <div className="form-actions-left" />
          <div className="form-actions-right">
            <button 
              type="button" 
              className="button button-secondary"
              onClick={() => router.push(`/clientes/${id}`)}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="button button-success"
              disabled={cargando}
            >
              {cargando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
