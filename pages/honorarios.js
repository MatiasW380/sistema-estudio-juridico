// pages/honorarios.js
// Página de gestión de honorarios y aportes con nombre del cliente

import { useState } from 'react';
import { useRouter } from 'next/router';
import { Filter, Search, X } from 'lucide-react';
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
    // Extraer usuario del cookie para filtrar finanzas
    const userValue = decodeURIComponent(userCookie.split('=').slice(1).join('='));
    const userData = JSON.parse(userValue);
    const usuarioEmail = userData?.email || null;

    const finanzas = await getFinanzas(null, null, null, null, null, usuarioEmail); // Pasar usuario para filtrar acceso
    const resumen = await getResumenFinanzas(null, null, null, usuarioEmail); // Pasar usuario para filtrar acceso
    return { props: { finanzas: finanzas || [], resumen: resumen || {} } };
  } catch (error) {
    console.error('Error al cargar finanzas:', error);
    return { props: { finanzas: [], resumen: {} } };
  }
}

function formatMoney(value) {
  const n = parseFloat(value || 0);
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(Number.isNaN(n) ? 0 : n);
}

const NOMBRE_CATEGORIA = { Todos: 'Todas las categorías', Honorarios: 'Honorarios', Caja_Abogados: 'Caja de Abogados', Colegio_Abogados: 'Colegio de Abogados' };

export default function HonorariosPage({ finanzas: finanzasIniciales, resumen: resumenInicial }) {
  const [finanzas, setFinanzas] = useState(finanzasIniciales || []);
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [resumen, setResumen] = useState(resumenInicial || {});
  const router = useRouter();

  const categorias = ['Todos', 'Honorarios', 'Caja_Abogados', 'Colegio_Abogados'];
  const estados = ['Todos', 'Pendiente', 'Pagado', 'Parcial'];

  // Detectar si hay filtros activos
  const hayFiltrosActivos = () => {
    return (
      filtroCategoria !== 'Todos' ||
      filtroEstado !== 'Todos' ||
      filtroCliente.trim() !== '' ||
      fechaInicio !== '' ||
      fechaFin !== ''
    );
  };

  const filtrosActivos = hayFiltrosActivos();

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
    <div className="container lx-page">
      <div className="lx-page-head">
        <div>
          <h1>Honorarios y aportes</h1>
          <p>Seguimiento de honorarios, Caja de Abogados y aportes al Colegio</p>
        </div>
      </div>

      <div className="dash-kpis" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div className="dash-kpi" style={{ cursor: 'default' }}>
          <div className="dash-kpi-label">Total acordado{filtrosActivos ? ' (filtrado)' : ''}</div>
          <div className="dash-kpi-value">{formatMoney(resumen.totalAcordado)}</div>
        </div>
        <div className="dash-kpi" style={{ cursor: 'default' }}>
          <div className="dash-kpi-label">Total cobrado{filtrosActivos ? ' (filtrado)' : ''}</div>
          <div className="dash-kpi-value" style={{ color: '#079455' }}>{formatMoney(resumen.totalPagado)}</div>
        </div>
        <div className={`dash-kpi${parseFloat(resumen.totalPendiente) > 0 ? ' is-alert' : ''}`} style={{ cursor: 'default' }}>
          <div className="dash-kpi-label">Pendiente de cobro{filtrosActivos ? ' (filtrado)' : ''}</div>
          <div className="dash-kpi-value">{formatMoney(resumen.totalPendiente)}</div>
        </div>
      </div>

      <div className="lx-toolbar">
        <div className="lx-search">
          <Search size={16} />
          <input
            type="text"
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
            placeholder="Buscar por cliente"
          />
        </div>
        <select className="lx-filter" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
          {categorias.map((c) => <option key={c} value={c}>{NOMBRE_CATEGORIA[c] || c}</option>)}
        </select>
        <select className="lx-filter" style={{ minWidth: '150px' }} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          {estados.map((e) => <option key={e} value={e}>{e === 'Todos' ? 'Todos los estados' : e}</option>)}
        </select>
        <div className="lx-daterange">
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} title="Desde" />
          <span>a</span>
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} title="Hasta" />
        </div>
        <button className="button button-secondary button-sm" onClick={aplicarFiltros}>
          <Filter size={15} /> Aplicar
        </button>
        {filtrosActivos && (
          <button className="button button-ghost button-sm" onClick={limpiarFiltros}>
            <X size={15} /> Limpiar
          </button>
        )}
      </div>

      {finanzas.length === 0 ? (
        <div className="lx-empty">{filtrosActivos ? 'No hay movimientos que coincidan con los filtros.' : 'No hay movimientos registrados.'}</div>
      ) : (
        <div className="lx-table-wrap">
          <table className="lx-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Categoría</th>
                <th>Tipo</th>
                <th>Concepto</th>
                <th className="numeric">Total</th>
                <th className="numeric">Pagado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {finanzas.map((f, index) => {
                const cliente = f.Cliente || f.Nombre_Cliente || 'Sin cliente';
                const estado = f.Estado || 'Pendiente';
                const badge = estado === 'Pagado' ? 'badge-success' : estado === 'Parcial' ? 'badge-warning' : 'badge-urgent';
                return (
                  <tr
                    key={`${f.ID || 'fin'}-${index}`}
                    onClick={() => f.Cliente_ID && router.push(`/clientes/${encodeURIComponent(f.Cliente_ID)}?tab=finanzas`)}
                    title={f.Cliente_ID ? 'Ver las finanzas de este cliente' : ''}
                  >
                    <td className="lx-cell-muted" style={{ whiteSpace: 'nowrap' }}>{formatearFechaArgentina(f.Fecha) || ''}</td>
                    <td className="lx-cell-strong">{cliente}</td>
                    <td>{NOMBRE_CATEGORIA[f.Categoria] || f.Categoria || ''}</td>
                    <td>{f.Tipo || ''}</td>
                    <td className="lx-cell-muted">{f.Concepto || ''}</td>
                    <td className="numeric" style={{ whiteSpace: 'nowrap' }}>{formatMoney(f.Monto_Total)}</td>
                    <td className="numeric" style={{ whiteSpace: 'nowrap' }}>{formatMoney(f.Monto_Pagado)}</td>
                    <td><span className={`badge ${badge}`}>{estado}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
