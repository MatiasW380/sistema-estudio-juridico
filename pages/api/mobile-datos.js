// pages/api/mobile-datos.js
// Endpoint que devuelve clientes y expedientes para la versión móvil

import { getClientes, readSheet } from '../../lib/googleSheets';

export default async function handler(req, res) {
  try {
    // Usar getClientes que ya agrupa por ID_Cliente
    const clientes = await getClientes();
    
    if (!clientes || clientes.length === 0) {
      return res.status(200).json({ clientes: [], expedientes: [] });
    }

    // Extraer todos los expedientes de los clientes
    const expedientesData = [];
    const clientesList = [];

    for (const cliente of clientes) {
      clientesList.push(cliente.Nombre_Cliente);
      
      if (cliente.expedientes && cliente.expedientes.length > 0) {
        for (const exp of cliente.expedientes) {
          expedientesData.push({
            cliente: cliente.Nombre_Cliente,
            sac: exp.Numero_SAC || '',
            caratula: exp.Caratula || '',
            juzgado: exp.Juzgado || '',
            fuero: exp.Fuero || '',
            ciudad: '', // No está en la función getClientes
          });
        }
      }
    }

    console.log(`📱 Mobile: ${clientesList.length} clientes, ${expedientesData.length} expedientes`);

    res.status(200).json({
      clientes: clientesList,
      expedientes: expedientesData
    });
  } catch (error) {
    console.error('Error en mobile-datos:', error);
    res.status(500).json({ error: error.message });
  }
}
