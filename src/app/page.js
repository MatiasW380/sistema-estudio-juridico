'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function cargarDatos() {
      try {
        const res = await fetch('/api/sheets');
        const resultado = await res.json();
        
        if (resultado.success && resultado.data) {
          setClientes(resultado.data);
        } else {
          setError(resultado.error || 'No se pudieron traer los datos.');
        }
      } catch (err) {
        setError('Error de conexión con el servidor.');
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      <header style={{ marginBottom: '30px', borderBottom: '2px solid #0056b3', paddingBottom: '10px' }}>
        <h1 style={{ color: '#0056b3', margin: 0 }}>Estudio Jurídico Baronetto</h1>
        <p style={{ color: '#666', margin: '5px 0 0 0' }}>Sistema de Gestión Jurídica Serverless (Córdoba, Argentina)</p>
      </header>

      <main>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginTop: 0, color: '#333' }}>📋 Panel General: Pestaña Clientes</h2>
          
          {cargando && <p style={{ color: '#888', fontStyle: 'italic' }}>Cargando datos desde Google Sheets...</p>}
          
          {error && (
            <div style={{ backgroundColor: '#ffe3e3', color: '#c30000', padding: '15px', borderRadius: '5px', marginBottom: '15px' }}>
              <strong>Aviso de Conexión:</strong> {error}
              <br />
              <small style={{ display: 'block', marginTop: '5px' }}>
                Nota: Si pide autorización de Google, recordá que el sistema requiere iniciar sesión en las API del estudio.
              </small>
            </div>
          )}

          {!cargando && !error && clientes.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0056b3', color: '#fff', textAlign: 'left' }}>
                  {clientes[0].map((encabezado, index) => (
                    <th key={index} style={{ padding: '12px', border: '1px solid #ddd' }}>{encabezado}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientes.slice(1).map((fila, filaIndex) => (
                  <tr key={filaIndex} style={{ backgroundColor: filaIndex % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                    {fila.map((celda, celdaIndex) => (
                      <td key={celdaIndex} style={{ padding: '12px', border: '1px solid #ddd', color: '#444' }}>{celda}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!cargando && !error && clientes.length === 0 && (
            <p style={{ color: '#666' }}>No se encontraron filas cargadas en la pestaña Clientes.</p>
          )}
        </div>
      </main>
    </div>
  );
}
