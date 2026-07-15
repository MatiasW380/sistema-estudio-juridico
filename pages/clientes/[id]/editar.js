// pages/clientes/[id]/editar.js
// Página para editar los datos de un cliente

import { useState } from 'react';
import { useRouter } from 'next/router';
import { getClientes } from '../../../lib/googleSheets';
import BotonInicio from '../../../components/BotonInicio';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '15
