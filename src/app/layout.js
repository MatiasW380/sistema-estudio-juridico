export const metadata = {
  title: 'Estudio Jurídico Baronetto',
  description: 'Sistema de Gestión Serverless',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f4f6f9' }}>
        {children}
      </body>
    </html>
  );
}
