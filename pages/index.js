// pages/index.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';

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
        Bienvenido, Matías. Tu sistema está funcionando correctamente.
      </p>
      <p style={{ marginTop: '10px', color: '#4a5568' }}>
        Este es el panel principal. Pronto podrás gestionar expedientes, clientes y generar escritos con IA.
      </p>
      <div style={{ marginTop: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
        <a href="/clientes">
          <button>📋 Expedientes</button>
        </a>
        <button>👤 Clientes</button>
        <button>🤖 Generar Escrito con IA</button>
        <button>📅 Agenda</button>
      </div>
    </div>
  );
}
