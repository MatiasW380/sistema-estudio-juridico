// pages/honorarios.js
// Página de gestión de honorarios y aportes con nombre del cliente

import { useState } from 'react';
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
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ marginBottom: '4px' }}>Honorarios y Aportes</h1>
        <p>Seguimiento de honorarios, caja y aportes a colegios</p>
      </div>

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-light)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Total Pendiente</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-urgent)' }}>{formatMoney(resumen.totalPendiente)}</div>
        </div>
        <div style={{ padding: '16px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-light)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Total Pagado</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-success)' }}>{formatMoney(resumen.totalPagado)}</div>
        </div>
        <div style={{ padding: '16px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-light)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Total Parcial</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-warning)' }}>{formatMoney(resumen.totalParcial)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#0f172a' }}>Filtros</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Cliente</label>
            <input
              type="text"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              placeholder="Buscar por nombre..."
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Categoría</label>
            <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
              {categorias.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Estado</label>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              {estados.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Desde</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Hasta</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="button button-sm" onClick={aplicarFiltros}>
            Aplicar Filtros
          </button>
          <button className="button button-secondary button-sm" onClick={limpiarFiltros}>
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', margin: '0 0 12px 0' }}>
          Movimientos
        </h2>
        {finanzas.length === 0 ? (
          <p style={{ color: '#64748b' }}>No hay movimientos registrados.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Categoría</th>
                  <th>Tipo</th>
                  <th>Concepto</th>
                  <th className="numeric">Total</th>
                  <th className="numeric">Pagado</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {finanzas.map((f, index) => {
                  const cliente = f.Cliente || f.Nombre_Cliente || 'Sin cliente';
                  const estado = f.Estado || 'Pendiente';
                  const statusClass = estado === 'Pagado' ? 'table-status-active' : estado === 'Parcial' ? 'table-status-pending' : 'table-status-urgent';

                  return (
                    <tr key={`${f.ID || 'fin'}-${index}`}>
                      <td>{formatearFechaArgentina(f.Fecha) || ''}</td>
                      <td style={{ fontWeight: '600' }}>{cliente}</td>
                      <td>{f.Categoria || ''}</td>
                      <td>{f.Tipo || ''}</td>
                      <td>{f.Concepto || ''}</td>
                      <td className="numeric">{formatMoney(f.Monto_Total)}</td>
                      <td className="numeric">{formatMoney(f.Monto_Pagado)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={statusClass}>{estado}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
