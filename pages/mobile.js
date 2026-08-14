// pages/mobile.js
// Versión móvil - Input de texto para cliente + Lista de juzgados

import { useState, useEffect } from 'react';
import { readSheet } from '../lib/googleSheets';

export default function MobilePage() {
  const [clientes, setClientes] = useState([]);
  const [expedientes, setExpedientes] = useState([]);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        console.log('Iniciando carga...');
        const rows = await readSheet('Clientes_y_Expedientes');
        console.log('Rows recibidas:', rows);
        
        if (!rows) {
          setError('No se pudieron cargar los datos');
          setLoading(false);
          return;
        }

        if (rows.length < 2) {
          setError('No hay datos en el sheet');
          setLoading(false);
          return;
        }

        const headers = rows[0];
        console.log('Headers:', headers);
        
        const idxNombre = headers.indexOf('Nombre_Cliente');
        const idxSAC = headers.indexOf('Numero_SAC');
        const idxCaratula = headers.indexOf('Caratula');
        const idxJuzgado = headers.indexOf('Juzgado');
        const idxCiudad = headers.indexOf('Ciudad');
        const idxFuero = headers.indexOf('Fuero');

        if (idxNombre === -1) {
          setError('No se encontró columna Nombre_Cliente');
          setLoading(false);
          return;
        }

        const clientesMap = new Map();
        const expedientesData = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const nombre = row[idxNombre];
          
          if (!nombre) continue;

          if (!clientesMap.has(nombre)) {
            clientesMap.set(nombre, true);
          }

          expedientesData.push({
            cliente: nombre,
            sac: row[idxSAC] || '',
            caratula: row[idxCaratula] || '',
            juzgado: row[idxJuzgado] || '',
            ciudad: row[idxCiudad] || '',
            fuero: row[idxFuero] || '',
          });
        }

        const clientesList = Array.from(clientesMap.keys()).sort();
        console.log('Clientes encontrados:', clientesList.length);
        console.log('Expedientes encontrados:', expedientesData.length);

        if (clientesList.length === 0) {
          setError('No se encontraron clientes');
          setLoading(false);
          return;
        }

        setClientes(clientesList);
        setExpedientes(expedientesData);
        setError('');
      } catch (e) {
        console.error('Error:', e);
        setError('Error: ' + e.message);
      }
      setLoading(false);
    };
    cargar();
  }, []);

  if (loading) {
    return <div style={{ padding: '15px' }}>Cargando...</div>;
  }

  if (error) {
    return <div style={{ padding: '15px', color: 'red' }}>❌ {error}</div>;
  }

  if (clientes.length === 0) {
    return <div style={{ padding: '15px' }}>No hay clientes registrados.</div>;
  }

  const clientesFiltrados = clientes.filter((cli) =>
    cli.toLowerCase().includes(filtroCliente.toLowerCase())
  );

  const juzgadosDelCliente = clienteSeleccionado
    ? [...new Set(
        expedientes
          .filter((e) => e.cliente === clienteSeleccionado)
          .map((e) => e.juzgado)
          .filter(Boolean)
      )].sort()
    : [];

  const expedientesCliente = clienteSeleccionado
    ? expedientes.filter((e) => e.cliente === clienteSeleccionado)
    : [];

  return (
    <div style={{ padding: '15px', fontFamily: 'system-ui, sans-serif', maxWidth: '100%' }}>
      <h1 style={{ fontSize: '18px', marginBottom: '20px' }}>📋 Mis Casos</h1>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
          Cliente ({clientes.length}):
        </label>
        <input
          type="text"
          placeholder="Escribe para filtrar..."
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />

        {filtroCliente && clientesFiltrados.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderTop: 'none',
            borderRadius: '0 0 6px 6px',
            maxHeight: '150px',
            overflowY: 'auto'
          }}>
            {clientesFiltrados.map((cli) => (
              <div
                key={cli}
                onClick={() => {
                  setClienteSeleccionado(cli);
                  setFiltroCliente(cli);
                }}
                style={{
                  padding: '10px',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {cli}
              </div>
            ))}
          </div>
        )}
      </div>

      {clienteSeleccionado && juzgadosDelCliente.length > 0 && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
            Juzgados ({juzgadosDelCliente.length}):
          </label>
          {juzgadosDelCliente.map((juz) => {
            const expedientesJuz = expedientesCliente.filter((e) => e.juzgado === juz);
            return (
              <div
                key={juz}
                style={{
                  backgroundColor: '#f9f9f9',
                  padding: '10px',
                  marginBottom: '8px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '13px'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#1e40af' }}>
                  ⚖️ {juz}
                </div>
                <div style={{ color: '#666', fontSize: '12px' }}>
                  {expedientesJuz.length} caso{expedientesJuz.length !== 1 ? 's' : ''}
                </div>
                {expedientesJuz.map((exp) => (
                  <div key={exp.sac} style={{ fontSize: '12px', marginTop: '5px', paddingLeft: '10px', borderLeft: '2px solid #e0e0e0' }}>
                    <div style={{ color: '#333' }}>📄 {exp.sac}</div>
                    {exp.caratula && <div style={{ color: '#666', fontSize: '11px' }}>{exp.caratula}</div>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {clienteSeleccionado && juzgadosDelCliente.length === 0 && (
        <p style={{ color: '#666' }}>Sin juzgados registrados para este cliente.</p>
      )}
    </div>
  );
}
