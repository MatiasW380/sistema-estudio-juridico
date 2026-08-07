// components/BotonInicio.js
// Componente reutilizable para el botón de inicio

import Link from 'next/link';
import { Home } from 'lucide-react';

export default function BotonInicio() {
  return (
    <Link href="/">
      <button style={{ 
        backgroundColor: '#4a5568', 
        padding: '8px 16px', 
        fontSize: '0.9rem',
        marginRight: '10px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <Home size={18} />
        Inicio
      </button>
    </Link>
  );
}
