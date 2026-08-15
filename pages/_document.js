// pages/_document.js
// Documento HTML base de Next.js - Incluye favicon y configuración global

import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        {/* Favicon LexHub */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" />
        
        {/* Meta tags */}
        <meta charSet="utf-8" />
        <meta name="description" content="LexHub - Sistema de Gestión Jurídica" />
        <meta name="theme-color" content="#1e40af" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
