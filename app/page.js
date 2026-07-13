// Ruta: app/page.js
'use client';

export const dynamic = 'force-dynamic';

import React from 'react';

export default function TestEstudio() {
  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#f0f4f8', minHeight: '100vh' }}>
      <h1 style={{ color: '#1e293b' }}>⚖️ SISTEMA JURÍDICO - MATÍAS BARONETTO</h1>
      <p style={{ color: '#64748b' }}>¡SI ESTÁS VIENDO ESTO, LOGRAMOS REVENTAR EL ERROR 404!</p>
      <div style={{ marginTop: '30px', padding: '20px', background: 'white', inlineBlock: 'block', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <p>Próximo paso: Sincronizar Google Sheets.</p>
      </div>
    </div>
  );
}
