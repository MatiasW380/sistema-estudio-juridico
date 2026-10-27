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

  // Estado de la sesión del SAC (se consulta cada 4 minutos mientras la
  // pestaña está visible; la consulta además mantiene la sesión en uso).
  const [estadoSAC, setEstadoSAC] = useState(null); // null | 'activa' | 'vencida' | 'sin'
  const [detalleSAC, setDetalleSAC] = useState('');
  const email = userData?.email;
  useEffect(() => {
    if (!email) return undefined;
    let cancelado = false;
    const leer = (k) => { try { return window.localStorage.getItem(k); } catch { return null; } };
    const escribir = (k, v) => { try { if (v === null) window.localStorage.removeItem(k); else window.localStorage.setItem(k, v); } catch { /* sin storage */ } };

    const verificar = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const r = await fetch('/api/sac/estado-sesion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const d = await r.json();
        if (cancelado) return;
        const ahora = Date.now();
        if (!d.tieneSesion) { setEstadoSAC('sin'); setDetalleSAC('No hay una sesión del SAC guardada'); return; }
        if (d.activa === true) {
          if (!leer('sac_desde')) escribir('sac_desde', String(ahora));
          escribir('sac_ultimo_ok', String(ahora));
          setEstadoSAC('activa');
          setDetalleSAC('Sesión del SAC activa (se verifica cada 4 minutos)');
        } else if (d.activa === false) {
          const desde = Number(leer('sac_desde'));
          const ultimo = Number(leer('sac_ultimo_ok'));
          const duro = desde && ultimo ? Math.max(0, Math.round((ultimo - desde) / 60000)) : null;
          escribir('sac_desde', null);
          setEstadoSAC('vencida');
          setDetalleSAC(`La sesión del SAC venció${duro !== null ? ` (se vio activa durante unos ${duro} min)` : ''}. Pegá una cookie nueva en la pantalla SAC.`);
        }
      } catch {
        // sin conexión: se mantiene el último estado
      }
    };
    verificar();
    const t = setInterval(verificar, 4 * 60 * 1000);
    const alVolver = () => { if (document.visibilityState === 'visible') verificar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { cancelado = true; clearInterval(t); document.removeEventListener('visibilitychange', alVolver); };
  }, [email]);

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
        {estadoSAC && (
          <Link href="/sac-sync">
            <a
              title={detalleSAC}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#cbd5e1',
                fontSize: '0.72rem',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  display: 'inline-block',
                  backgroundColor: estadoSAC === 'activa' ? '#22c55e' : estadoSAC === 'vencida' ? '#ef4444' : '#94a3b8',
                }}
              />
              SAC
            </a>
          </Link>
        )}
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
