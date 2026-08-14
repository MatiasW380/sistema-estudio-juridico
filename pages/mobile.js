// pages/mobile.js
// Versión móvil simplificada - Solo dos desplegables

import { useState, useEffect } from 'react';
import { getClientes, getExpedientes } from '../lib/googleSheets';

export default function MobilePage() {
  const [clientes, setClientes] = useState([]);
  const [expedientes, setExpedientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [juzgado, setJuzgado] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const cls = await getClientes();
        console.log('Clientes cargados:', cls);
        setClientes(cls || []);
      } catch (e) {
        console.error('Error cargando clientes:', e);
      }
      setLoading(false);
    };
    cargar();
  }, []);

  const manejarCambioCliente = async (id) => {
    setClienteId(id);
    setJuzgado('');
    if (id) {
      try {
        const exps = await getExpedientes(id);
        console.log('Expedientes:', exps);
        setExpedientes(exps || []);
      } catch (e) {
        console.error('Error cargando expedientes:', e);
      }
    } else {
      setExpedientes([]);
    }
  };

  const juzgadosUnicos = [...new Set(expedientes.map((e) => e.Juzgado).filter(Boolean))].sort();

  const expedientesFiltrados = juzgado
    ? expedientes.filter((e) => e.Juzgado === juzgado)
    : expedientes;

  return (
    <div style={{ padding: '15px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '18px', marginBottom: '20px' }}>📋 Mis Casos</h1>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
              Cliente:
            </label>
            <select
              value={clienteId}
              onChange={(e) => manejarCambioCliente(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                fontSize: '14px'
              }}
            >
              <option value="">-- Selecciona un cliente --</option>
              {clientes.map((cli) => (
                <option key={cli.ID_Cliente} value={cli.ID_Cliente}>
                  {cli.Nombre_Cliente}
                </option>
              ))}
            </select>
          </div>

          {clienteId && juzgadosUnicos.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
                Juzgado:
              </label>
              <select
                value={juzgado}
                onChange={(e) => setJuzgado(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  fontSize: '14px'
                }}
              >
                <option value="">-- Todos los juzgados --</option>
                {juzgadosUnicos.map((juz) => (
                  <option key={juz} value={juz}>
                    {juz}
                  </option>
                ))}
              </select>
            </div>
          )}

          {clienteId && expedientesFiltrados.length > 0 && (
            <div>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
                {expedientesFiltrados.length} expediente{expedientesFiltrados.length !== 1 ? 's' : ''}
              </p>
              {expedientesFiltrados.map((exp) => (
                <div
                  key={exp.Numero_SAC}
                  style={{
                    backgroundColor: '#f9f9f9',
                    padding: '10px',
                    marginBottom: '10px',
                    borderRadius: '6px',
                    border: '1px solid #e0e0e0',
                    fontSize: '13px'
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#1e40af' }}>
                    {exp.Numero_SAC}
                  </div>
                  {exp.Caratula && <div>📝 {exp.Caratula}</div>}
                  {exp.Juzgado && <div>⚖️ {exp.Juzgado}</div>}
                  {exp.Ciudad && <div>📍 {exp.Ciudad}</div>}
                  {exp.Fuero && <div>📋 {exp.Fuero}</div>}
                </div>
              ))}
            </div>
          )}

          {clienteId && expedientesFiltrados.length === 0 && expedientes.length > 0 && (
            <p style={{ color: '#666' }}>No hay expedientes para este juzgado.</p>
          )}

          {clienteId && expedientes.length === 0 && (
            <p style={{ color: '#666' }}>Este cliente no tiene expedientes.</p>
          )}
        </>
      )}
    </div>
  );
}
