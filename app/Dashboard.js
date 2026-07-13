// Ruta: app/Dashboard.js
'use client';
import React, { useState } from 'react';

export default function FichaCliente({ cliente }) {
  const [archivos, setArchivos] = useState([]);

  // Carga los documentos del cliente desde Drive al abrir la ficha
  const cargarExpediente = async (folderId) => {
    const res = await fetch(`/api/drive?folderId=${folderId}`);
    const data = await res.json();
    setArchivos(data);
  };

  return (
    <div style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <h2>Expediente: {cliente.nombre}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        
        {/* Panel Izquierdo: Datos */}
        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
          <p><strong>DNI:</strong> {cliente.dni}</p>
          <p><strong>Causa:</strong> {cliente.causa}</p>
          <button onClick={() => cargarExpediente(cliente.id_carpeta)}>Ver Expediente Completo</button>
        </div>

        {/* Panel Derecho: Documentos */}
        <div style={{ borderLeft: '2px solid #e2e8f0', paddingLeft: '20px' }}>
          <h3>Documentos en Drive</h3>
          {archivos.map(f => (
            <a key={f.id} href={f.webViewLink} target="_blank" style={{ display: 'block', margin: '10px 0' }}>
              📄 {f.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
