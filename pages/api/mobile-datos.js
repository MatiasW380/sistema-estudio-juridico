// pages/api/mobile-datos.js
import { getClientes } from '../../lib/googleSheets';

export default async function handler(req, res) {
  try {
    const clientes = await getClientes();
    
    if (!clientes || clientes.length === 0) {
      return res.status(200).json({ clientes: [], expedientes: [] });
    }

    // PASO 1: Deduplicar clientes por nombre normalizado
    const clientesMap = new Map(); // nombre_normalizado -> nombre_mostrable
    
    for (const cliente of clientes) {
      const nombre = cliente.Nombre_Cliente.trim();
      
      // Normalizar: ordenar palabras alfabéticamente
      const palabras = nombre.split(' ').filter(Boolean);
      const normalizado = palabras.sort().join(' ').toLowerCase();
      
      // Guardar nombre más largo (más completo)
      if (!clientesMap.has(normalizado) || nombre.length > clientesMap.get(normalizado).length) {
        clientesMap.set(normalizado, nombre);
      }
    }

    // PASO 2: Construir lista de clientes únicos
    const clientesList = Array.from(clientesMap.values()).sort();

    // PASO 3: Construir expedientes con nombre deduplicado
    const expedientesData = [];
    const nombreOriginalANormalizado = new Map();
    
    // Mapear nombre original -> normalizado
    for (const [normalizado, mostrable] of clientesMap.entries()) {
      nombreOriginalANormalizado.set(mostrable, normalizado);
    }

    for (const cliente of clientes) {
      const nombre = cliente.Nombre_Cliente.trim();
      const nombreNormalizado = nombreOriginalANormalizado.get(nombre) || 
                                nombre.split(' ').filter(Boolean).sort().join(' ').toLowerCase();

      if (cliente.expedientes && cliente.expedientes.length > 0) {
        for (const exp of cliente.expedientes) {
          expedientesData.push({
            cliente: nombreNormalizado,
            clienteMostrable: clientesMap.get(nombreNormalizado),
            sac: exp.Numero_SAC || '',
            caratula: exp.Caratula || '',
            juzgado: exp.Juzgado || '',
            fuero: exp.Fuero || '',
          });
        }
      }
    }

    console.log(`📱 Mobile: ${clientesList.length} clientes únicos, ${expedientesData.length} expedientes`);

    res.status(200).json({
      clientes: clientesList,
      expedientes: expedientesData
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
