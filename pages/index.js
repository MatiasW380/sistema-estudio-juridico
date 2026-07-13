// pages/index.js
// Página de inicio del sistema de gestión jurídica

export default function Home() {
  return (
    <div className="container">
      <h1>🏛️ Sistema de Gestión Jurídica</h1>
      <p style={{ marginTop: '20px', fontSize: '1.2rem' }}>
        Bienvenido, Matías. Tu sistema está funcionando correctamente.
      </p>
      <p style={{ marginTop: '10px', color: '#4a5568' }}>
        Este es el panel principal. Pronto podrás gestionar expedientes, clientes y generar escritos con IA.
      </p>
      <div style={{ marginTop: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
        <button>📋 Expedientes</button>
        <button>👤 Clientes</button>
        <button>🤖 Generar Escrito con IA</button>
        <button>📅 Agenda</button>
      </div>
    </div>
  );
}
