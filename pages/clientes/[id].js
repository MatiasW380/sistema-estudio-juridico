const handleSubmit = async (e) => {
  e.preventDefault();
  setMensaje('');
  setCargando(true);

  if (!nuevoExpediente.Numero_SAC || !nuevoExpediente.Caratula) {
    setMensaje('⚠️ N° SAC y Carátula son obligatorios');
    setCargando(false);
    return;
  }

  try {
    const datos = {
      clienteId: cliente.ID_Cliente,
      nombre: cliente.Nombre_Cliente,
      telefono: cliente.Telefono || '',
      numeroSAC: nuevoExpediente.Numero_SAC,
      caratula: nuevoExpediente.Caratula,
      fuero: nuevoExpediente.Fuero || '',
      usuariosCompartidos: cliente.Usuarios_Compartidos || '',
    };

    console.log('📤 Enviando datos:', datos);

    const response = await fetch('/api/agregar-expediente', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos),
    });

    const resultado = await response.json();
    console.log('📥 Respuesta del servidor:', resultado);

    if (resultado.success) {
      let mensajeExito = '✅ Expediente agregado correctamente';
      if (resultado.folderId) {
        mensajeExito += ' y carpeta creada en Drive';
      } else if (resultado.mensaje && resultado.mensaje.includes('problema con Drive')) {
        mensajeExito = '⚠️ Expediente agregado, pero hubo un problema al crear la carpeta en Drive';
      }
      setMensaje(mensajeExito);
      setNuevoExpediente({ Numero_SAC: '', Caratula: '', Fuero: '' });
      setMostrarFormulario(false);
      setTimeout(() => router.reload(), 1500);
    } else {
      setMensaje('❌ Error al agregar el expediente: ' + (resultado.error || 'Error desconocido'));
    }
  } catch (error) {
    console.error('❌ Error en handleSubmit:', error);
    setMensaje('❌ Error: ' + error.message);
  } finally {
    setCargando(false);
  }
};
