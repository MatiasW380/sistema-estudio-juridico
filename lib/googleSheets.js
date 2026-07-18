// ==========================================
// FUNCIONES DE AGENDA
// ==========================================

export async function getAgenda(filtros = {}) {
  try {
    const data = await fetchSheetData('Agenda');
    if (!data || data.length <= 1) return [];

    const headers = data[0];
    const rows = data.slice(1);

    let eventos = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    // Filtros
    if (filtros.numeroSAC) {
      eventos = eventos.filter(e => e.Numero_SAC === filtros.numeroSAC);
    }
    if (filtros.cliente) {
      eventos = eventos.filter(e => e.Cliente?.toLowerCase().includes(filtros.cliente.toLowerCase()));
    }
    if (filtros.tipo) {
      eventos = eventos.filter(e => e.Tipo === filtros.tipo);
    }
    if (filtros.estado) {
      eventos = eventos.filter(e => e.Estado === filtros.estado);
    }
    if (filtros.fechaInicio) {
      eventos = eventos.filter(e => e.Fecha >= filtros.fechaInicio);
    }
    if (filtros.fechaFin) {
      eventos = eventos.filter(e => e.Fecha <= filtros.fechaFin);
    }
    if (filtros.usuario) {
      eventos = eventos.filter(e => 
        e.Creado_Por === filtros.usuario || 
        e.Compartido_Con?.includes(filtros.usuario)
      );
    }

    // Ordenar por fecha
    eventos.sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));
    return eventos;
  } catch (error) {
    console.error('❌ Error al obtener agenda:', error.message);
    return [];
  }
}

export async function agregarEvento(numeroSAC, cliente, tipo, titulo, descripcion, fecha, hora, horaFin, lugar, recordatorio, diasAntes, estado, creadoPor, compartidoCon) {
  try {
    const eventos = await getAgenda();
    const nextId = eventos.length > 0 
      ? String(Math.max(...eventos.map(e => parseInt(e.ID) || 0)) + 1)
      : '1';

    const fila = [
      nextId,
      numeroSAC || '',
      cliente || '',
      tipo || 'Otro',
      titulo || '',
      descripcion || '',
      fecha || '',
      hora || '',
      horaFin || '',
      lugar || '',
      recordatorio || 'SI',
      diasAntes || '1',
      estado || 'Pendiente',
      creadoPor || '',
      compartidoCon || '',
      'NO', // Notificacion_Enviada
      '',   // Google_Calendar_ID
    ];

    return await appendToSheet('Agenda', fila);
  } catch (error) {
    console.error('❌ Error al agregar evento:', error.message);
    return false;
  }
}

export async function actualizarEvento(id, campos) {
  // Implementación pendiente - similar a actualizar actuaciones
  console.log('🔧 actualizarEvento pendiente de implementación');
  return false;
}

export async function eliminarEvento(id) {
  console.log('🔧 eliminarEvento pendiente de implementación');
  return false;
}

export async function getTareasPendientes(usuario) {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const eventos = await getAgenda({
      estado: 'Pendiente',
      usuario: usuario,
    });
    
    // Filtrar eventos con fecha >= hoy
    return eventos.filter(e => e.Fecha >= hoy);
  } catch (error) {
    console.error('❌ Error al obtener tareas pendientes:', error.message);
    return [];
  }
}
