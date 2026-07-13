// Ruta exacta en GitHub: app/layout.js
import React from 'react';

export const metadata = {
  title: 'Sistema de Gestión Jurídica',
  description: 'Estudio Jurídico Serverless - Córdoba',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0, boxSizing: 'border-box' }}>
        {children}
      </body>
    </html>
  );
}
