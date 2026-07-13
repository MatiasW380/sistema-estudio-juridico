// pages/_app.js
// Este archivo es el componente principal que envuelve todas las páginas de la aplicación.
// Aquí se configuran los estilos globales y los providers (como el de autenticación).

import '../styles/globals.css'; // Importamos los estilos globales (los crearemos después)

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

export default MyApp;
