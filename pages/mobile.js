// pages/mobile.js
// Versión móvil simplificada - Solo lectura de clientes y expedientes

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getClientes, getExpedientes } from '../lib/googleSheets';

export default function MobilePage() {
  const router = useRouter();
  const [clientes, setClientes] = useState([]);
  const [expedientes, setExpedientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [juzgadoFiltro, setJuzgadoFiltro] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      const cls = await getClientes();
      setClientes(cls || []);
      setLoading(false);
    };
    cargar();
  }, []);

  const manejarSeleccionCliente = async (cliente) => {
    setClienteSeleccionado(cliente);
    const exps = await getExpedientes(cliente.ID_Cliente);
    setExpedientes(exps || []);
    setJuzgadoFiltro('');
  };

  const expedienteFiltrados = clienteSeleccionado
    ? expedientes.filter((e) =>
        juzgadoFiltro ? e.Juzgado === juzgadoFiltro : true
      )
    : [];

  const juzgadosUnicos = clienteSeleccionado
    ? [...new Set(expedientes.map((e) => e.Juzgado).filter(Boolean))]
    : [];

  return (
    <div style={{ 
      padding: '15px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      <h1 style={{ fontSize: '20px', marginBottom: '20px', color: '#1e40af' }}>
        📋 Mis Casos
      </h1>

      {loading ? (
        <p>Cargando...</p>
      ) : !clienteSeleccionado ? (
        <div>
          <p style={{ color: '#64748b', marginBottom: '15px' }}>Selecciona un cliente:</p>
          {clientes.map((cliente) => (
            <button
              key={cliente.ID_Cliente}
              onClick={() => manejarSeleccionCliente(cliente)}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px',
                marginBottom: '10px',
                backgroundColor: '#white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px'
              }}
            >
              <strong>{cliente.Nombre_Cliente}</strong>
              <br />
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {cliente.expedientes?.length || 0} expedientes
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <button
            onClick={() => {
              setClienteSeleccionado(null);
              setExpedientes([]);
            }}
            style={{
              marginBottom: '15px',
              padding: '8px 12px',
              backgroundColor: '#718096',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← Atrás
          </button>

          <h2 style={{ fontSize: '16px', marginBottom: '10px', color: '#1e40af' }}>
            {clienteSeleccionado.Nombre_Cliente}
          </h2>

          {juzgadosUnicos.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                Filtrar por juzgado:
              </label>
              <select
                value={juzgadoFiltro}
                onChange={(e) => setJuzgadoFiltro(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px'
                }}
              >
                <option value="">Todos los juzgados</option>
                {juzgadosUnicos.map((juz) => (
                  <option key={juz} value={juz}>
                    {juz}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: '15px' }}>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
              {expedienteFiltrados.length} expediente{expedienteFiltrados.length !== 1 ? 's' : ''}
            </p>

            {expedienteFiltrados.map((exp) => (
              <div
                key={exp.Numero_SAC}
                style={{
                  backgroundColor: 'white',
                  padding: '12px',
                  marginBottom: '10px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ fontSize: '14px', color: '#1e40af' }}>
                    {exp.Numero_SAC}
                  </strong>
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                  {exp.Caratula && (
                    <div><strong>Carátula:</strong> {exp.Caratula}</div>
                  )}
                  {exp.Juzgado && (
                    <div><strong>Juzgado:</strong> {exp.Juzgado}</div>
                  )}
                  {exp.Ciudad && (
                    <div><strong>Ciudad:</strong> {exp.Ciudad}</div>
                  )}
                  {exp.Fuero && (
                    <div><strong>Fuero:</strong> {exp.Fuero}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
