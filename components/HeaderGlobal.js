// components/HeaderGlobal.js
// Header global persistente - Azul Navy con navegación y usuario

import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  IconHome,
  IconUsers,
  IconExpedientes,
  IconAgenda,
  IconHonorarios,
  IconBiblioteca,
  IconIA,
} from './Icons';

export default function HeaderGlobal({ userData, onLogout }) {
  const router = useRouter();
  const currentPath = router.pathname;

  // Ocultar header en páginas de autenticación
  if (currentPath === '/login' || currentPath === '/registro') {
    return null;
  }

  const isActive = (path) => currentPath === path ? '#2563eb' : 'transparent';

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        zIndex: 1000,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Logo/Nombre del Estudio - Izquierda */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '200px',
        }}
      >
        <Link href="/">
          <a
            style={{
              color: '#ffffff',
              fontSize: '1.1rem',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'opacity 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <IconHome size={24} />
            Estudio Jurídico
          </a>
        </Link>
      </div>

      {/* Navegación Principal - Centro */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <NavLink
          href="/clientes"
          icon={<IconUsers size={18} />}
          label="Clientes"
          isActive={isActive('/clientes')}
        />
        <NavLink
          href="/expedientes"
          icon={<IconExpedientes size={18} />}
          label="Expedientes"
          isActive={isActive('/expedientes')}
        />
        <NavLink
          href="/agenda"
          icon={<IconAgenda size={18} />}
          label="Agenda"
          isActive={isActive('/agenda')}
        />
        <NavLink
          href="/honorarios"
          icon={<IconHonorarios size={18} />}
          label="Finanzas"
          isActive={isActive('/honorarios')}
        />
        <NavLink
          href="/biblioteca"
          icon={<IconBiblioteca size={18} />}
          label="Biblioteca"
          isActive={isActive('/biblioteca')}
        />
        <NavLink
          href="/ia-general"
          icon={<IconIA size={18} />}
          label="Asistente IA"
          isActive={isActive('/ia-general')}
        />
      </nav>

      {/* Usuario y Logout - Derecha */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          minWidth: '200px',
          justifyContent: 'flex-end',
        }}
      >
        {userData?.email && (
          <span
            style={{
              color: '#cbd5e1',
              fontSize: '0.875rem',
              maxWidth: '150px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {userData.email}
          </span>
        )}
        <button
          onClick={onLogout}
          style={{
            backgroundColor: '#7c3aed',
            color: '#ffffff',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6d28d9')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#7c3aed')}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

// Componente auxiliar para links de navegación
function NavLink({ href, icon, label, isActive }) {
  return (
    <Link href={href}>
      <a
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#e2e8f0',
          fontSize: '0.875rem',
          padding: '8px 12px',
          borderRadius: '6px',
          textDecoration: 'none',
          transition: 'all 0.2s',
          backgroundColor: isActive,
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          if (isActive === 'transparent') {
            e.currentTarget.style.backgroundColor = '#1e293b';
            e.currentTarget.style.color = '#ffffff';
          }
        }}
        onMouseLeave={(e) => {
          if (isActive === 'transparent') {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#e2e8f0';
          }
        }}
      >
        {icon}
        <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
      </a>
    </Link>
  );
}
