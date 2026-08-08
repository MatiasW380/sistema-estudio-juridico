// components/ButtonShowcase.js
// Componente para demostrar todos los estilos de botones disponibles
// Uso: Solo para desarrollo/demostración

export default function ButtonShowcase() {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
      <h2 style={{ marginBottom: '20px' }}>Galería de Botones</h2>

      {/* Primarios */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          BOTONES PRIMARIOS (Azul Cobalto)
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button>Guardar</button>
          <button disabled>Guardando...</button>
          <button className="button-sm">Pequeño</button>
          <button className="button-lg">Grande</button>
          <button className="button-loading">Cargando</button>
        </div>
      </div>

      {/* Secundarios */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          BOTONES SECUNDARIOS (Gris Transparente)
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="button-secondary">Cancelar</button>
          <button className="button-secondary" disabled>Deshabilitado</button>
          <button className="button-secondary button-sm">Pequeño</button>
          <button className="button-secondary button-lg">Grande</button>
        </div>
      </div>

      {/* Ghost */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          BOTONES GHOST (Muy Discretos)
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="button-ghost">Expandir</button>
          <button className="button-ghost" disabled>Deshabilitado</button>
          <button className="button-ghost button-sm">Pequeño</button>
        </div>
      </div>

      {/* Danger */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          BOTONES DANGER (Rojo - Acciones Destructivas)
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="button-danger">Eliminar</button>
          <button className="button-danger" disabled>Eliminando...</button>
          <button className="button-danger button-sm">Del</button>
          <button className="button-danger button-lg">Eliminar Permanentemente</button>
        </div>
      </div>

      {/* Success */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          BOTONES SUCCESS (Verde - Confirmación)
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="button-success">Confirmar</button>
          <button className="button-success" disabled>Guardado</button>
          <button className="button-success button-sm">OK</button>
          <button className="button-success button-lg">Guardar Cambios</button>
        </div>
      </div>

      {/* Warning */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          BOTONES WARNING (Ámbar - Precaución)
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="button-warning">Atención Requerida</button>
          <button className="button-warning" disabled>Procesando...</button>
          <button className="button-warning button-sm">⚠</button>
          <button className="button-warning button-lg">Revisar Antes de Continuar</button>
        </div>
      </div>

      {/* Info */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          BOTONES INFO (Azul - Información)
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="button-info">Más Información</button>
          <button className="button-info" disabled>Cargando Info...</button>
          <button className="button-info button-sm">ℹ</button>
          <button className="button-info button-lg">Ver Detalles Completos</button>
        </div>
      </div>

      {/* Outline */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          BOTONES OUTLINE (Solo Borde)
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="button-outline">Primario</button>
          <button className="button-outline button-danger">Danger</button>
          <button className="button-outline button-success">Success</button>
          <button className="button-outline button-warning">Warning</button>
          <button className="button-outline button-info">Info</button>
        </div>
      </div>

      {/* Button Groups */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          GRUPOS DE BOTONES (Horizontal)
        </h3>
        <div className="button-group">
          <button>Aceptar</button>
          <button className="button-secondary">Cancelar</button>
          <button className="button-danger button-sm">Eliminar</button>
        </div>
      </div>

      {/* Button Groups Vertical */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          GRUPOS DE BOTONES (Vertical)
        </h3>
        <div className="button-group vertical" style={{ maxWidth: '300px' }}>
          <button>Opción 1</button>
          <button>Opción 2</button>
          <button>Opción 3</button>
        </div>
      </div>

      {/* Button Groups Compact */}
      <div>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          GRUPOS DE BOTONES (Compacto)
        </h3>
        <div className="button-group compact" style={{ maxWidth: '300px' }}>
          <button className="button-secondary">Izquierda</button>
          <button className="button-secondary">Centro</button>
          <button className="button-secondary">Derecha</button>
        </div>
      </div>
    </div>
  );
}
