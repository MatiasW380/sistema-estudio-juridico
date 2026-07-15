// pages/clientes/[id]/editar.js
// Página para editar los datos de un cliente

import { useState } from 'react';
import { useRouter } from 'next/router';
import { getClientes } from '../../../lib/googleSheets';

export async function getServerSideProps(context) {
  const { id } = context.params;
  try {
    const clientes = await getClientes();
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
      console.error('❌ Error en handleSubmit:', err);
      setError('Error: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>✏️ Editar Cliente</h1>
        <a href={`/clientes/${id}`} style={{ color: '#3182ce', textDecoration: 'none' }}>← Volver a la ficha</a>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label><strong>ID Cliente:</strong></label>
          <input type="text" value={id} disabled style={{ backgroundColor: '#f7fafc' }} />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label><strong>Nombre *</strong></label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Juan Perez"
            required
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label><strong>Teléfono</strong></label>
          <input
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ej: 3511234567"
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label><strong>DNI</strong></label>
          <input
            type="text"
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
            placeholder="Ej: 12345678"
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label><strong>Domicilio</strong></label>
          <input
            type="text"
            value={domicilio}
            onChange={(e) => setDomicilio(e.target.value)}
            placeholder="Ej: Calle Falsa 123"
          />
        </div>

        {error && (
          <div style={{ backgroundColor: '#fed7d7', color: '#9b2c2c', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" style={{ backgroundColor: '#3182ce' }} disabled={cargando}>
            {cargando ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button type="button" onClick={() => router.push(`/clientes/${id}`)} style={{ backgroundColor: '#718096' }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
