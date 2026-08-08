// components/FormShowcase.js
// Componente para demostrar todos los estilos de formularios disponibles
// Uso: Solo para desarrollo/demostración

import { useState } from 'react';

export default function FormShowcase() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    website: '',
    birthday: '',
    searchQuery: '',
    message: '',
    withError: '',
    withSuccess: '',
    withWarning: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', maxWidth: '800px' }}>
      <h2 style={{ marginBottom: '20px' }}>Galería de Formularios</h2>

      {/* INPUTS BÁSICOS */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          INPUTS BÁSICOS
        </h3>

        <div className="form-group">
          <label>Nombre Completo</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Ej: Juan García López"
          />
          <span className="input-helper">Ingresa tu nombre tal como aparece en tus documentos</span>
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="correo@ejemplo.com"
          />
        </div>

        <div className="form-group">
          <label>Contraseña</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
          />
          <span className="input-helper">Mínimo 8 caracteres, incluye números y símbolos</span>
        </div>
      </div>

      {/* INPUTS ESPECIALIZADOS */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          INPUTS ESPECIALIZADOS
        </h3>

        <div className="form-row two-columns">
          <div className="form-group">
            <label>Teléfono</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+54 351 4444444"
            />
          </div>

          <div className="form-group">
            <label>Sitio Web</label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://ejemplo.com"
            />
          </div>
        </div>

        <div className="form-row two-columns">
          <div className="form-group">
            <label>Fecha de Nacimiento</label>
            <input
              type="date"
              name="birthday"
              value={formData.birthday}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Búsqueda</label>
            <input
              type="search"
              name="searchQuery"
              value={formData.searchQuery}
              onChange={handleChange}
              placeholder="Buscar en el sistema..."
            />
          </div>
        </div>
      </div>

      {/* TEXTAREA */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          TEXTAREAS
        </h3>

        <div className="form-group">
          <label>Mensaje (Normal)</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Escribe tu mensaje aquí..."
          />
        </div>

        <div className="form-group">
          <label>Textarea Pequeño</label>
          <textarea
            className="textarea-sm"
            placeholder="Texto corto..."
          />
        </div>

        <div className="form-group">
          <label>Textarea Grande</label>
          <textarea
            className="textarea-lg"
            placeholder="Texto extenso..."
          />
        </div>
      </div>

      {/* VALIDACIÓN */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          ESTADOS DE VALIDACIÓN
        </h3>

        <div className="form-group">
          <label>Con Error</label>
          <input
            type="text"
            className="input-error"
            placeholder="Este campo tiene error"
          />
          <span className="form-error">Este campo es obligatorio</span>
        </div>

        <div className="form-group">
          <label>Con Éxito</label>
          <input
            type="text"
            className="input-success"
            value="correo@ejemplo.com"
            readOnly
          />
          <span className="form-success">✓ Email verificado correctamente</span>
        </div>

        <div className="form-group">
          <label>Con Advertencia</label>
          <input
            type="text"
            className="input-warning"
            placeholder="Requiere revisión"
          />
          <span className="form-warning">⚠ Este campo necesita atención</span>
        </div>
      </div>

      {/* INPUT GROUPS */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          INPUT GROUPS (Con Addon)
        </h3>

        <div className="form-group">
          <label>Teléfono con País</label>
          <div className="input-group">
            <span className="input-group-addon">+54</span>
            <input
              type="tel"
              placeholder="351 4444444"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Búsqueda con Icono</label>
          <div className="input-group">
            <input
              type="search"
              placeholder="Buscar expedientes..."
            />
            <span className="input-group-addon right">🔍</span>
          </div>
        </div>

        <div className="form-group">
          <label>Precio con Moneda</label>
          <div className="input-group">
            <span className="input-group-addon">$</span>
            <input
              type="number"
              placeholder="1.000,00"
              step="0.01"
            />
            <span className="input-group-addon right">ARS</span>
          </div>
        </div>
      </div>

      {/* STATES ESPECIALES */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          ESTADOS ESPECIALES
        </h3>

        <div className="form-group">
          <label>Input Deshabilitado</label>
          <input
            type="text"
            value="No se puede editar"
            disabled
          />
        </div>

        <div className="form-group">
          <label>Input Solo Lectura</label>
          <input
            type="text"
            value="Sistema Jurídico v1.0"
            readOnly
          />
        </div>
      </div>

      {/* FORM NOTES */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          NOTAS Y MENSAJES
        </h3>

        <div className="form-note">
          <strong>ℹ️ Nota Informativa:</strong> Completa todos los campos marcados con * para continuar.
        </div>

        <div className="form-note warning">
          <strong>⚠️ Advertencia:</strong> Los cambios en esta sección afectarán todos los expedientes.
        </div>

        <div className="form-note error">
          <strong>❌ Error:</strong> No se pudo guardar los cambios. Por favor, revisa los errores.
        </div>

        <div className="form-note success">
          <strong>✓ Éxito:</strong> Los datos se han guardado correctamente.
        </div>
      </div>

      {/* FORM LAYOUT */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          LAYOUTS DE FORMULARIO
        </h3>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '12px', fontWeight: '500', marginBottom: '12px', color: '#94a3b8' }}>
            Fila de 2 Columnas
          </h4>
          <div className="form-row two-columns">
            <div className="form-group">
              <label>Primera</label>
              <input type="text" placeholder="Campo 1" />
            </div>
            <div className="form-group">
              <label>Segunda</label>
              <input type="text" placeholder="Campo 2" />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '12px', fontWeight: '500', marginBottom: '12px', color: '#94a3b8' }}>
            Fila de 3 Columnas
          </h4>
          <div className="form-row three-columns">
            <div className="form-group">
              <label>Primera</label>
              <input type="text" placeholder="Campo 1" />
            </div>
            <div className="form-group">
              <label>Segunda</label>
              <input type="text" placeholder="Campo 2" />
            </div>
            <div className="form-group">
              <label>Tercera</label>
              <input type="text" placeholder="Campo 3" />
            </div>
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: '12px', fontWeight: '500', marginBottom: '12px', color: '#94a3b8' }}>
            Fila Ancho Completo
          </h4>
          <div className="form-row full-width">
            <div className="form-group">
              <label>Campo Ancho Completo</label>
              <input type="text" placeholder="Ocupa 100% del ancho" />
            </div>
          </div>
        </div>
      </div>

      {/* FORM SECTIONS */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          SECCIONES DE FORMULARIO
        </h3>

        <div className="form-section">
          <h4 className="form-section-title">Información Personal</h4>
          <div className="form-group">
            <label>Nombre</label>
            <input type="text" placeholder="Tu nombre" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="Tu email" />
          </div>
        </div>

        <div className="form-section">
          <h4 className="form-section-title">Información de Contacto</h4>
          <div className="form-group">
            <label>Teléfono</label>
            <input type="tel" placeholder="Tu teléfono" />
          </div>
          <div className="form-group">
            <label>Domicilio</label>
            <input type="text" placeholder="Tu domicilio" />
          </div>
        </div>
      </div>

      {/* FORM ACTIONS */}
      <div>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          BOTONES DE ACCIÓN
        </h3>

        <div className="form-actions">
          <div className="form-actions-left">
            <button className="button-ghost">← Atrás</button>
          </div>
          <div className="form-actions-right">
            <button className="button-secondary">Cancelar</button>
            <button className="button-success">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
