// pages/index.js
// Página de inicio con verificación de sesión

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export async function getServerSideProps(context) {
  const cookies = context.req.headers.cookie || '';
  const userCookie = cookies.split(';').find(c => c.trim().startsWith('user='));
  
  if (!userCookie) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    if (!cookies.user) {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    document.cookie = 'user=; path=/; max-age=0';
    router.push('/login');
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🏛️ Sistema de Gestión Jurídica</h1>
        <button onClick={handleLogout} style={{ backgroundColor: '#e53e3e' }}>
          Cerrar sesión
        </button>
      </div>
      <p style={{ marginTop: '20px', fontSize: '1.2rem' }}>
        Bienvenido. Tu sistema está funcionando correctamente.
      </p>
      <p style={{ marginTop: '10px', color: '#4a5568' }}>
        Gestioná clientes, expedientes, usuarios, finanzas, agenda y biblioteca desde este panel.
      </p>
      <div style={{ marginTop: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
        <a href="/clientes">
          <button>👤 Clientes</button>
        </a>
        <a href="/agenda">
          <button>📅 Agenda</button>
        </a>
        <a href="/honorarios">
          <button>💰 Finanzas</button>
        </a>
        <a href="/biblioteca">
          <button>📚 Biblioteca</button>
        </a>
        <button 
          onClick={() => router.push('/ia-general')}
          style={{ backgroundColor: '#9f7aea' }}
        >
          🤖 Asistente IA
        </button>
        <a href="/usuarios" style={{ marginLeft: 'auto' }}>
          <button>👥 Usuarios</button>
        </a>
      </div>
    </div>
  );
}
