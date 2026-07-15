// pages/clientes/nuevo.js
// Formulario para crear un nuevo cliente

import { useState } from 'react';
import { useRouter } from 'next/router';
import { crearCliente, getNextClienteId } from '../../lib/googleSheets';

export async function getServerSideProps() {
  const nextId = await getNextClienteId();
  return { props: { nextId } };
}

export default function NuevoCliente({ nextId }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [dni, setDni] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

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
      const resultado = await crearCliente(nombre, telefono, dni, domicilio);
      
      if (resultado.success) {
        router.push(`/clientes/${resultado.id}`);
      } else {
        setError(resultado.error || 'Error al crear el cliente');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>➕ Nuevo Cliente</h1>
        <a href="/clientes" style={{ color: '#3182ce', textDecoration: 'none' }}>← Volver a la lista</a>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label><strong>ID Asignado:</strong></label>
          <input type="text" value={nextId} disabled style={{ backgroundColor: '#f7fafc' }} />
          <small style={{ color: '#4a5568' }}>El ID se asigna automáticamente</small>
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
            {cargando ? 'Guardando...' : 'Guardar Cliente'}
          </button>
          <button type="button" onClick={() => router.push('/clientes')} style={{ backgroundColor: '#718096' }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
