// components/BotonInicio.js
// Componente reutilizable para el botón de inicio

import Link from 'next/link';

export default function BotonInicio() {
  return (
    <Link href="/">
      <button style={{ 
        backgroundColor: '#4a5568', 
        padding: '8px 16px', 
        fontSize: '0.9rem',
        marginRight: '10px'
      }}>
        🏠 Inicio
      </button>
    </Link>
  );
}
