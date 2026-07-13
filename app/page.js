// Ruta exacta en GitHub: app/page.js
import React from 'react';
import DashboardClientes from './Dashboard';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function Home() {
  return <DashboardClientes />;
}
