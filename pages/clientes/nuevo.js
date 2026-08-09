// pages/clientes/nuevo.js
// Formulario para crear un nuevo cliente

import { useState } from 'react';
import { useRouter } from 'next/router';
import { getNextClienteId } from '../../lib/googleSheets';

export async function getServerSideProps() {
  const nextId = await getNextClienteId();
  return { props: { nextId } };
}

export default function NuevoCliente({ nextId }) {
  const [nombre, setNombre] = useState('');
  const [tipoCliente, setTipoCliente] = useState('persona');
  const [telefono, setTelefono] = useState('');
  const [dni, setDni] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('📤 ====== FORMULARIO ENVIADO ======');
    console.log('📤 nombre:', nombre);
    console.log('📤 telefono:', telefono);
    console.log('📤 dni:', dni);
    console.log('📤 domicilio:', domicilio);
    
    setError('');
    setCargando(true);

    if (!nombre.trim()) {
      console.log('Nombre vacío');
      setError('El nombre es obligatorio');
      setCargando(false);
      return;
    }

    try {
      const datos = {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        dni: dni.trim(),
        domicilio: domicilio.trim(),
      };

      console.log('📤 Enviando a /api/crear-cliente:', datos);

      const response = await fetch('/api/crear-cliente', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datos),
      });

      console.log('📥 Respuesta status:', response.status);

      const resultado = await response.json();
      console.log('📥 Respuesta JSON:', resultado);
      
      if (resultado.success) {
        console.log('Cliente creado, ID:', resultado.id);
        router.push(`/clientes/${resultado.id}`);
      } else {
        console.log('Error del servidor:', resultado.error);
        setError(resultado.error || 'Error al crear el cliente');
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
        <h1 style={{ marginBottom: '4px' }}>Nuevo Cliente</h1>
        <p>Crea un nuevo registro de cliente en el sistema</p>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
        <div className="form-section">
          <h2 className="form-section-title">Información Básica</h2>

          <div className="form-group">
            <label>ID Asignado</label>
            <input
              type="text"
              value={nextId}
              disabled
            />
            <span className="input-helper">El ID se asigna automáticamente al crear el cliente</span>
          </div>

          <div className="form-group">
            <label>Tipo de Cliente</label>
            <select value={tipoCliente} onChange={(e) => setTipoCliente(e.target.value)}>
              <option value="persona">Persona Física</option>
              <option value="empresa">Persona Jurídica</option>
            </select>
            <span className="input-helper">Selecciona el tipo de cliente que estás registrando</span>
          </div>

          <div className="form-group">
            <label className="label-required">Nombre Completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Juan García López"
              className={error && !nombre.trim() ? 'input-error' : ''}
              required
            />
            {error && !nombre.trim() && (
              <span className="form-error">{error}</span>
            )}
          </div>

          <div className="form-group">
            <label>Teléfono</label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+54 351 4444444"
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
            <span className="input-helper">Solo números, sin puntos ni guiones</span>
          </div>

          <div className="form-group">
            <label>Domicilio</label>
            <input
              type="text"
              value={domicilio}
              onChange={(e) => setDomicilio(e.target.value)}
              placeholder="Ej: Calle Falsa 123, Depto 4A"
            />
          </div>
        </div>

        {error && (
          <div className="form-note error">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="form-actions">
          <div className="form-actions-left" />
          <div className="form-actions-right">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => router.push('/clientes')}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="button button-success"
              disabled={cargando}
            >
              {cargando ? 'Guardando...' : 'Guardar Cliente'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
