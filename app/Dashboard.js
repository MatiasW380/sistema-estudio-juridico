'use client';
import React, { useState, useEffect } from 'react';

export default function DashboardGeneral() {
  const [seccion, setSeccion] = useState('Clientes');
  const [datos, setDatos] = useState(null); // Empezamos en null para saber si cargó
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDatos() {
      try {
        const res = await fetch(`/api/sheets?range=${seccion}`);
        if (!res.ok) throw new Error('Error al conectar');
        const json = await res.json();
        // Si json no es un array, lo forzamos a array vacío
        setDatos(Array.isArray(json) ? json : []);
      } catch (e) {
        setError(e.message);
      }
    }
    fetchDatos();
  }, [seccion]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', color: '#1e293b' }}>
      {/* ... (sidebar igual) ... */}
      <main style={{ flex: 1, padding: '40px' }}>
        <h1>{seccion}</h1>
        {error ? (
          <div style={{ color: 'red' }}>Error: {error}</div>
        ) : !datos ? (
          <div>Cargando sistema...</div>
        ) : (
          <pre>{JSON.stringify(datos, null, 2)}</pre>
        )}
      </main>
    </div>
  );
}
