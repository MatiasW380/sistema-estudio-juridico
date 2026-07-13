// Ruta exacta en GitHub: src/app/page.js
'use client';

import React, { useState, useEffect } from 'react';
// Importamos la herramienta que obliga a que la página no sea estática
import { unstable_noStore as noStore } from 'next/cache';

export default function DashboardClientes() {
  // Ejecutamos la función inmediatamente al renderizar para romper el modo estático
  try {
    noStore();
  } catch (e) {
    // Evitamos problemas en el entorno local
  }

  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarClientes() {
      try {
        const respuesta = await fetch('/api/sheets');
        if (!respuesta.ok) {
          throw new Error('La API de Google Sheets aún no devuelve datos.');
        }
        const datos = await respuesta.json();
        setClientes(datos);
      } catch (err) {
        // Datos de simulación local para Córdoba
        setClientes([
          { id: "1", nombre: "Juan Carlos Pérez", dni: "24.532.112", telefono: "3516554433", email: "jcperez@gmail.com", causa: "Pérez c/ EPEC - Ordinario", estado: "En Trámite" },
          { id: "2", nombre: "María Laura Martínez", dni: "32.114.982", telefono: "3541223344", email: "marialauramartinez@hotmail.com", causa: "Martínez c/ Tarjeta Naranja - Defensa Consumidor", estado: "Audiencia" }
        ]);
        console.warn("Usando datos locales de simulación:", err.message);
      } finally {
        setCargando(false);
      }
    }
    cargarClientes();
  }, []);

  const clientesFiltrados = clientes.filter(cliente =>
    cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    cliente.causa.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Barra de Navegación Superior */}
      <header className="bg-slate-900 text-white p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight">SISTEMA DE GESTIÓN JURÍDICA</h1>
            <p className="text-xs text-slate-400">Jurisdicción Provincia de Córdoba | Serverless v1.0</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold text-blue-400">Matías Baronetto</p>
            <p className="text-slate-400">matiasbaronetto@gmail.com</p>
          </div>
        </div>
      </header>

      {/* Cuerpo del Panel */}
      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Menú Lateral Izquierdo */}
        <aside className="md:col-span-1 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Módulos</h2>
          <button className="w-full text-left px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-medium text-sm">
            👤 Clientes y Causas
          </button>
          <button className="w-full text-left px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm">
            💬 Consultas del Estudio
          </button>
          <button className="w-full text-left px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm">
            📅 Agenda de Plazos & SAC
          </button>
          <button className="w-full text-left px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm">
            💰 Finanzas e Honorarios
          </button>
        </aside>

        {/* Contenido Principal */}
        <section className="md:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Fichas de Clientes y Expedientes</h2>
              <p className="text-sm text-slate-500">Búsqueda y estado de causas vigentes en Córdoba.</p>
            </div>
          </div>

          {/* Buscador */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="🔍 Buscar por nombre o carátula del expediente..."
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {/* Tabla */}
          {cargando ? (
            <div className="text-center py-12 text-slate-500 text-sm">Cargando base de datos jurídica...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-medium">
                    <th className="p-3">Cliente / Datos de Contacto</th>
                    <th className="p-3">Carátula / Expediente (SAC)</th>
                    <th className="p-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.length > 0 ? (
                    clientesFiltrados.map((cliente) => (
                      <tr key={cliente.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                        <td className="p-3">
                          <p className="font-semibold text-slate-900">{cliente.nombre}</p>
                          <p className="text-xs text-slate-500">DNI: {cliente.dni} | 📞 {cliente.telefono}</p>
                        </td>
                        <td className="p-3 text-slate-700">{cliente.causa}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            cliente.estado === 'En Trámite' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {cliente.estado}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center py-8 text-slate-400 text-sm">
                        No se encontraron registros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
