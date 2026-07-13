// Ruta exacta en GitHub: app/page.js
import React from 'react';
import DashboardClientes from './Dashboard';

// Forzado estricto de nivel de servidor
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function PrincipalPage() {
  return <DashboardClientes />;
}
