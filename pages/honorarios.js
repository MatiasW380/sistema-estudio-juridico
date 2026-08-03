// pages/honorarios.js
// Página de gestión de honorarios y aportes con nombre del cliente

import { useState } from 'react';
import BotonInicio from '../components/BotonInicio';
import { getFinanzas, getResumenFinanzas, formatearFechaArgentina } from '../lib/googleSheets';

export async function getServerSideProps(context) {
  const cookies = context.req.headers.cookie || '';
  const userCookie = cookies.split(';').find((c) => c.trim().startsWith('user='));

  if (!userCookie) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  try {
    const finanzas = await getFinanzas(); // Ya viene enriquecido con Cliente desde lib/googleSheets.js
    const resumen = await getResumenFinanzas();
    return { props: { finanzas: finanzas || [], resumen: resumen || {} } };
  } catch (error) {
    console.error('Error al cargar finanzas:', error);
    return { props: { finanzas: [], resumen: {} } };
  }
}

function formatMoney(value) {
  const n = parseFloat(value || 0);
  return `$${Number.isNaN(n) ? '0.00' : n.toFixed(2)}`;
}

export default function HonorariosPage({ finanzas: finanzasIniciales, resumen: resumenInicial }) {
  const [finanzas, setFinanzas] = useState(finanzasIniciales || []);
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [resumen, setResumen] = useState(resumenInicial || {});

  const categorias = ['Todos', 'Honorarios', 'Caja_Abogados', 'Colegio_Abogados'];
  const estados = ['Todos', 'Pendiente', 'Pagado', 'Parcial'];

  const aplicarFiltros = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroCategoria !== 'Todos') params.append('categoria', filtroCategoria);
      if (filtroEstado !== 'Todos') params.append('estado', filtroEstado);
      if (fechaInicio) params.append('fechaInicio', fechaInicio);
      if (fechaFin) params.append('fechaFin', fechaFin);
      if (filtroCliente.trim()) params.append('cliente', filtroCliente.trim());

      const response = await fetch(`/api/finanzas?${params.toString()}`);
      const data = await response.json();

      if (data.finanzas) {
        let finanzasFiltradas = data.finanzas;

        // Soporte por si API todavía no filtra por cliente
        if (filtroCliente.trim()) {
          const q = filtroCliente.toLowerCase().trim();
          finanzasFiltradas = finanzasFiltradas.filter((f) =>
            (f.Cliente || f.Nombre_Cliente || '').toLowerCase().includes(q),
          );
        }

        setFinanzas(finanzasFiltradas);
      }

      const resResponse = await fetch(`/api/finanzas?resumen=true&${params.toString()}`);
      const resData = await resResponse.json();
      if (resData.resumen) setResumen(resData.resumen);
    } catch (error) {
      console.error('Error al aplicar filtros:', error);
    }
  };

  const limpiarFiltros = () => {
    setFiltroCategoria('Todos');
    setFiltroEstado('Todos');
    setFiltroCliente('');
    setFechaInicio('');
    setFechaFin('');
    setFinanzas(finanzasIniciales || []);
    setResumen(resumenInicial || {});
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BotonInicio />
          <h1>💰 Honorarios y Aportes</h1>
        </div>
        <a href="/" style={{ color: '#3182ce', textDecoration: 'none' }}>
          ← Volver al inicio
        </a>
      </div>

      {/* Resumen */}
      <div
        style={{
          backgroundColor: '#f7fafc',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          gap: '30px',
          flexWrap: 'wrap',
        }}
      >
        <div><strong>Total Pendiente:</strong> {formatMoney(resumen.totalPendiente)}</div>
        <div><strong>Total Pagado:</strong> {formatMoney(resumen.totalPagado)}</div>
        <div><strong>Total Parcial:</strong> {formatMoney(resumen.totalParcial)}</div>
      </div>

      {/* Filtros */}
      <div
        style={{
          display: 'flex',
          gap: '15px',
          flexWrap: 'wrap',
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#f7fafc',
          borderRadius: '8px',
          alignItems: 'center',
        }}
      >
        <div>
          <label><strong>Cliente</strong></label>
          <input
            type="text"
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
            placeholder="Buscar por nombre..."
            style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', marginLeft: '5px' }}
          />
        </div>

        <div>
          <label><strong>Categoría</strong></label>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', marginLeft: '5px' }}
          >
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label><strong>Estado</strong></label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', marginLeft: '5px' }}
          >
            {estados.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>

        <div>
          <label><strong>Desde</strong></label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', marginLeft: '5px' }}
          />
        </div>

        <div>
          <label><strong>Hasta</strong></label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', marginLeft: '5px' }}
          />
        </div>

        <button onClick={aplicarFiltros} style={{ backgroundColor: '#3182ce' }}>
          Aplicar Filtros
        </button>
        <button onClick={limpiarFiltros} style={{ backgroundColor: '#718096' }}>
          Limpiar
        </button>
      </div>

      {/* Tabla */}
      <h3>📋 Movimientos</h3>
      {finanzas.length === 0 ? (
        <p style={{ color: '#4a5568' }}>No hay movimientos registrados.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#edf2f7' }}>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Fecha</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Cliente</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Categoría</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Tipo</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Concepto</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>Pagado</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {finanzas.map((f, index) => {
              const cliente = f.Cliente || f.Nombre_Cliente || 'Sin cliente';
              const estado = f.Estado || 'Pendiente';

              return (
                <tr key={`${f.ID || 'fin'}-${index}`}>
                  <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{formatearFechaArgentina(f.Fecha) || ''}</td>
                  <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
                    <strong>{cliente}</strong>
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{f.Categoria || ''}</td>
                  <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{f.Tipo || ''}</td>
                  <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{f.Concepto || ''}</td>
                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                    {formatMoney(f.Monto_Total)}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                    {formatMoney(f.Monto_Pagado)}
                  </td>
                  <td
                    style={{
                      padding: '10px',
                      border: '1px solid #e2e8f0',
                      textAlign: 'center',
                      color: estado === 'Pagado' ? '#38a169' : estado === 'Parcial' ? '#ed8936' : '#e53e3e',
                    }}
                  >
                    {estado}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
