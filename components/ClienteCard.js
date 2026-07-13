// components/ClienteCard.js
'use client';
import React from 'react';

const ClienteCard = ({ cliente }) => {
  if (!cliente) return null;
  
  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      backgroundColor: '#f8fafc',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      ':hover': {
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        transform: 'translateY(-2px)'
      }
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
            {cliente.Nombre_Cliente || 'Sin nombre'}
          </h3>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            ID: {cliente.ID_Cliente || 'N/A'} • Tel: {cliente.Telefono || 'N/A'}
          </p>
          {cliente.Caratula && (
            <p style={{ margin: '4px 0 0 0', color: '#475569', fontSize: '14px' }}>
              Carátula: {cliente.Caratula}
            </p>
          )}
        </div>
        {cliente.Numero_SAC && (
          <span style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 500
          }}>
            SAC: {cliente.Numero_SAC}
          </span>
        )}
      </div>
    </div>
  );
};

export default ClienteCard;
