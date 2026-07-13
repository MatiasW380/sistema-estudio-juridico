'use client';
import React, { useState, useEffect } from 'react';

// Estructura de navegación basada en tus 7 pestañas
const MODULOS = {
  Clientes: 'Clientes_y_Expedientes',
  Consultas: 'Historia_Consultas',
  Finanzas: 'Finanzas',
  Agenda: 'Agenda_Plazos',
  Biblioteca: 'Biblioteca_Leyes',
  Jurisprudencia: 'Doctrina_Jurisprudencia',
  Asistente: 'Asistente_IA'
};

export default function DashboardGeneral() {
  const [seccion, setSeccion] = useState('Clientes');
  const [datos, setDatos] = useState([]);

  // Esta función leerá la pestaña correspondiente según el menú
  const cargarDatos = async (nombrePestana) => {
    try {
      const res = await fetch(`/api/sheets?range=${nombrePestana}`);
      const json = await res.json();
      setDatos(json);
    } catch (e) {
      console.error("Error al cargar módulo", e);
    }
  };

  useEffect(() => {
    cargarDatos(MODULOS[seccion]);
  }, [seccion]);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar de Gestión */}
      <nav style={{ width: '260px', background: '#1a1a1a', color: '#d4af37', padding: '20px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '40px' }}>ESTUDIO BARONETTO</h2>
        {Object.keys(MODULOS).map(m => (
          <div key={m} onClick={() => setSeccion(m)} style={{ padding: '15px', cursor: 'pointer', borderBottom: '1px solid #333' }}>
            {m}
          </div>
        ))}
      </nav>

      {/* Contenido Dinámico */}
      <main style={{ flex: 1, padding: '40px', background: '#f4f4f2' }}>
        <h1>{seccion}</h1>
        {/* Aquí renderizaremos la vista dinámica según la sección */}
        <pre>{JSON.stringify(datos, null, 2)}</pre> 
      </main>
    </div>
  );
}
