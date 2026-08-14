// pages/mobile.js
// Versión móvil - Input de texto para cliente + Lista de juzgados

import { useState, useEffect } from 'react';
import { readSheet } from '../lib/googleSheets';

export default function MobilePage() {
  const [datos, setDatos] = useState([]);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const rows = await readSheet('Clientes_y_Expedientes');
        console.log('Datos cargados:', rows);
        setDatos(rows || []);
      } catch (e) {
        console.error('Error cargando:', e);
      }
      setLoading(false);
    };
    cargar();
  }, []);

  // Extraer clientes únicos
  const clientesUnicos = datos.length > 0
    ? [...new Set(
        datos
          .slice(1)
          .map((row) => row[1]) // Nombre_Cliente generalmente está en índice 1
          .filter(Boolean)
      )].sort()
    : [];

  // Filtrar clientes por búsqueda
  const clientesFiltrados = clientesUnicos.filter((cli) =>
    cli.toLowerCase().includes(filtroCliente.toLowerCase())
  );

  // Extraer juzgados únicos del cliente seleccionado
  const juzgadosDelCliente = clienteSeleccionado && datos.length > 0
    ? [...new Set(
        datos
          .slice(1)
          .filter((row) => row[1] === clienteSeleccionado)
          .map((row) => row[8]) // Juzgado generalmente en índice 8
          .filter(Boolean)
      )].sort()
    : [];

  // Expedientes filtrados
  const expedientes = clienteSeleccionado && datos.length > 0
    ? datos
        .slice(1)
        .filter((row) => row[1] === clienteSeleccionado)
        .map((row) => ({
          sac: row[4],
          caratula: row[5],
          juzgado: row[8],
          ciudad: row[9],
          fuero: row[7],
        }))
    : [];

  return (
    <div style={{ padding: '15px', fontFamily: 'system-ui, sans-serif', maxWidth: '100%' }}>
      <h1 style={{ fontSize: '18px', marginBottom: '20px' }}>📋 Mis Casos</h1>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <>
          {/* Búsqueda de cliente */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
              Cliente:
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

          {/* Lista de juzgados */}
          {clienteSeleccionado && juzgadosDelCliente.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
                Juzgados ({juzgadosDelCliente.length}):
              </label>
              {juzgadosDelCliente.map((juz) => {
                const expedientesJuz = expedientes.filter((e) => e.juzgado === juz);
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
        </>
      )}
    </div>
  );
}
