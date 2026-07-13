// Ruta exacta en GitHub: app/page.js
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import React from 'react';
import DashboardClientes from './Dashboard';

export default function Home() {
  return <DashboardClientes />;
}
