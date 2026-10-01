import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import LogoLexHub from './LogoLexHub';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (typeof window !== 'undefined' && (router.pathname === '/login' || router.pathname === '/registro')) {
    return null;
  }

  const currentPath = router.pathname || '';
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
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        zIndex: 1000,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
      }}
    >
      {/* Logo + Nombre - Izquierda */}
      <Link href="/">
        <a
          style={{
            color: '#ffffff',
            fontSize: '0.95rem',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minWidth: 'fit-content',
            transition: 'opacity 0.2s',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <LogoLexHub size={28} />
          LexHub
        </a>
      </Link>

      {/* Navegación - Centro */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          flex: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollBehavior: 'smooth',
          minWidth: 0,
        }}
      >
        <NavLink href="/" icon={<IconHome size={16} />} label="Inicio" isActive={isActive('/')} />
        <NavLink href="/sac-sync" icon={<span style={{ fontSize: '14px' }}>🔗</span>} label="SAC" isActive={isActive('/sac-sync')} />
        <NavLink href="/clientes" icon={<IconUsers size={16} />} label="Clientes" isActive={isActive('/clientes')} />
        <NavLink href="/expedientes" icon={<IconExpedientes size={16} />} label="Expedientes" isActive={isActive('/expedientes')} />
        <NavLink href="/agenda" icon={<IconAgenda size={16} />} label="Agenda" isActive={isActive('/agenda')} />
        <NavLink href="/honorarios" icon={<IconHonorarios size={16} />} label="Honorarios" isActive={isActive('/honorarios')} />
        <NavLink href="/biblioteca" icon={<IconBiblioteca size={16} />} label="Biblioteca" isActive={isActive('/biblioteca')} />
        <NavLink href="/ia-general" icon={<IconIA size={16} />} label="IA" isActive={isActive('/ia-general')} />
      </nav>

      {/* Usuario - Derecha */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          minWidth: 'fit-content',
        }}
      >
        {userData?.email && (
          <span
            style={{
              color: '#cbd5e1',
              fontSize: '0.75rem',
              maxWidth: '100px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {userData.email.split('@')[0]}
          </span>
        )}
        <button
          onClick={onLogout}
          style={{
            backgroundColor: '#7c3aed',
            color: '#ffffff',
            border: 'none',
            padding: '6px 10px',
            borderRadius: '4px',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            whiteSpace: 'nowrap',
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

function NavLink({ href, icon, label, isActive }) {
  return (
    <Link href={href}>
      <a
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          color: '#e2e8f0',
          fontSize: '0.78rem',
          padding: '6px 8px',
          borderRadius: '4px',
          textDecoration: 'none',
          transition: 'all 0.2s',
          backgroundColor: isActive,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
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
        <span>{label}</span>
      </a>
    </Link>
  );
}
