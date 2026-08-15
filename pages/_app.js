// pages/_app.js
// Componente principal - Envuelve todas las páginas con Header global y autenticación

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import '../styles/globals.css';
import HeaderGlobal from '../components/HeaderGlobal';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Detectar si es móvil
    const isMobile = () => {
      return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    };

    // Si es móvil y NO está en /mobile, redirigir
    if (isMobile() && router.pathname !== '/mobile' && router.pathname !== '/login') {
      router.push('/mobile');
    }
  }, [router.pathname, router]);

  useEffect(() => {
    // Leer usuario de la cookie
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, ...rest] = cookie.trim().split('=');
      acc[key] = rest.join('=');
      return acc;
    }, {});

    if (cookies.user) {
      try {
        const user = JSON.parse(decodeURIComponent(cookies.user));
        setUserData(user);
      } catch (e) {
        console.error('Error parsing user cookie:', e);
      }
    }

    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    document.cookie = 'user=; path=/; max-age=0';
    setUserData(null);
    router.push('/login');
  };

  // Agregar padding-top al body si el header está visible
  const shouldShowHeader = userData && router.pathname !== '/login' && router.pathname !== '/registro' && router.pathname !== '/mobile';

  return (
    <>
      {shouldShowHeader && (
        <HeaderGlobal userData={userData} onLogout={handleLogout} />
      )}
      <div
        style={{
          paddingTop: shouldShowHeader ? '60px' : '0',
          transition: 'padding-top 0.2s',
        }}
      >
        <Component {...pageProps} />
      </div>
    </>
  );
}

export default MyApp;

