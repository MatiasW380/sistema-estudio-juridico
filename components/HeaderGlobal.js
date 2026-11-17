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
  IconSAC,
  IconSalir,
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

    let primera = true;
    const verificar = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const r = await fetch('/api/sac/estado-sesion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, probarLogin: primera }),
        });
        primera = false;
        const d = await r.json();
        if (cancelado) return;
        const ahora = Date.now();
        if (d.activa === true && d.modo === 'login') {
          setEstadoSAC('activa');
          setDetalleSAC('Conexión al SAC activa (entra con usuario y contraseña)');
          return;
        }
        if (!d.tieneSesion && d.activa !== true) { setEstadoSAC('sin'); setDetalleSAC('No hay una sesión del SAC guardada'); return; }
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
  const activo = (path) => (path === '/' ? currentPath === '/' : currentPath === path || currentPath.startsWith(`${path}/`));

  const nombre = (userData?.nombre || userData?.email?.split('@')[0] || '').trim();
  const iniciales = nombre
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || 'LH';

  const colorSAC = estadoSAC === 'activa' ? '#17b26a' : estadoSAC === 'vencida' ? '#f04438' : '#98a2b3';

  return (
    <header className="lx-header">
      <Link href="/" className="lx-brand">
        <LogoLexHub size={26} />
        LexHub
      </Link>

      <span className="lx-divider" />

      <nav className="lx-nav">
        <NavLink href="/" icon={<IconHome size={16} />} label="Inicio" activo={activo('/')} />
        <NavLink href="/sac-sync" icon={<IconSAC size={16} />} label="SAC" activo={activo('/sac-sync')} />
        <NavLink href="/clientes" icon={<IconUsers size={16} />} label="Clientes" activo={activo('/clientes')} />
        <NavLink href="/expedientes" icon={<IconExpedientes size={16} />} label="Expedientes" activo={activo('/expedientes') || activo('/expediente')} />
        <NavLink href="/agenda" icon={<IconAgenda size={16} />} label="Agenda" activo={activo('/agenda')} />
        <NavLink href="/honorarios" icon={<IconHonorarios size={16} />} label="Honorarios" activo={activo('/honorarios')} />
        <NavLink href="/biblioteca" icon={<IconBiblioteca size={16} />} label="Biblioteca" activo={activo('/biblioteca')} />
        <NavLink href="/ia-general" icon={<IconIA size={16} />} label="IA" activo={activo('/ia-general')} />
      </nav>

      <div className="lx-user">
        {estadoSAC && (
          <Link href="/sac-sync" className="lx-sac-pill" title={detalleSAC}>
            <span className="lx-dot" style={{ backgroundColor: colorSAC }} />
            SAC
          </Link>
        )}
        {userData?.email && (
          <>
            <span className="lx-avatar" title={userData.email}>{iniciales}</span>
            <span className="lx-username">{nombre}</span>
          </>
        )}
        <button className="button-ghost button-sm" onClick={onLogout} title="Cerrar sesión" style={{ gap: '6px' }}>
          <IconSalir size={15} />
          Salir
        </button>
      </div>
    </header>
  );
}

function NavLink({ href, icon, label, activo }) {
  return (
    <Link href={href} className={`lx-nav-link${activo ? ' is-active' : ''}`}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}
