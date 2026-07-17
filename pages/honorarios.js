// pages/honorarios.js
// Página de gestión de honorarios y aportes

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import BotonInicio from '../components/BotonInicio';
import { getFinanzas, getResumenFinanzas } from '../lib/googleSheets';

export async function getServerSideProps() {
  try {
    const finanzas = await getFinanzas();
    const resumen = await getResumenFinanzas();
    return { props: { finanzas: finanzas || [], resumen: resumen || {} } };
  } catch (error) {
    console.error('Error al cargar finanzas:', error);
    return { props: { finanzas: [], resumen: {} } };
  }
}

export default function HonorariosPage({ finanzas: finanzasIniciales, resumen: resumenInicial }) {
  const [finanzas, setFinanzas] = useState(finanzasIniciales);
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [resumen, setResumen] = useState(resumenInicial);
  const router = useRouter();

  const categorias = ['Todos', 'Honorarios', 'Caja_Abogados', 'Colegio_Abogados'];
  const estados = ['Todos', 'Pendiente', 'Pagado', 'Parcial'];

  const aplicarFiltros = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroCategoria !== 'Todos') params.append('categoria', filtroCategoria);
      if (filtroEstado !== 'Todos') params.append('estado', filtroEstado);
      if (fechaInicio) params.append('fechaInicio', fechaInicio);
      if (fechaFin) params.append('fechaFin', fechaFin);

      const response = await fetch(`/api/finanzas?${params.toString()}`);
      const data = await response.json();
      if (data.finanzas) {
        setFinanzas(data.finanzas);
      }

      // Actualizar resumen
      const resResponse = await fetch(`/api/finanzas?resumen=true&${params.toString()}`);
      const resData = await resResponse.json();
      if (resData.resumen) {
        setResumen(resData.resumen);
      }
    } catch (error) {
      console.error('Error al aplicar filtros:', error);
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BotonInicio />
          <h1>💰 Honorarios y Aportes</h1>
        </div>
        <a href="/" style={{ color: '#3182ce', textDecoration: 'none' }}>← Volver al inicio</a>
      </div>

      {/* Resumen */}
      <div style={{
        backgroundColor: '#f7fafc',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'flex',
        gap: '30px',
        flexWrap: 'wrap'
      }}>
        <div><strong>Total Pendiente:</strong> ${resumen.totalPendiente?.toFixed(2) || '0.00'}</div>
        <div><strong>Total Pagado:</strong> ${resumen.totalPagado?.toFixed(2) || '0.00'}</div>
        <div><strong>Total Parcial:</strong> ${resumen.totalParcial?.toFixed(2) || '0.00'}</div>
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex',
        gap: '15px',
        flexWrap: 'wrap',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f7fafc',
        borderRadius: '8px',
        alignItems: 'center'
      }}>
        <div>
          <label><strong>Categoría</strong></label>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', marginLeft: '5px' }}
          >
            {categorias.map(c => (
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
            {estados.map(e => (
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
        <button onClick={aplicarFiltros} style={{ backgroundColor: '#3182ce' }}>Aplicar Filtros</button>
        <button onClick={() => {
          setFiltroCategoria('Todos');
          setFiltroEstado('Todos');
          setFechaInicio('');
          setFechaFin('');
          aplicarFiltros();
        }} style={{ backgroundColor: '#718096' }}>Limpiar</button>
      </div>

      {/* Tabla de movimientos */}
      <h3>📋 Movimientos</h3>
      {finanzas.length === 0 ? (
        <p style={{ color: '#4a5568' }}>No hay movimientos registrados.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#edf2f7' }}>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Fecha</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Categoría</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Tipo</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Concepto</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>Pagado</th>
              <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {finanzas.map((f, index) => (
              <tr key={index}>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{f.Fecha || ''}</td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{f.Categoria || ''}</td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{f.Tipo || ''}</td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{f.Concepto || ''}</td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                  ${parseFloat(f.Monto_Total || 0).toFixed(2)}
                </td>
                <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                  ${parseFloat(f.Monto_Pagado || 0).toFixed(2)}
                </td>
                <td style={{ 
                  padding: '10px', 
                  border: '1px solid #e2e8f0', 
                  textAlign: 'center',
                  color: f.Estado === 'Pagado' ? '#38a169' : f.Estado === 'Parcial' ? '#ed8936' : '#e53e3e'
                }}>
                  {f.Estado || 'Pendiente'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
