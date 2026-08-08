// components/SelectShowcase.js
// Componente para demostrar todos los estilos de selectores disponibles
// Uso: Solo para desarrollo/demostración

import { useState } from 'react';

export default function SelectShowcase() {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [toggleNotifications, setToggleNotifications] = useState(true);
  const [hobbies, setHobbies] = useState([]);

  const handleHobbyChange = (hobby) => {
    setHobbies(prev =>
      prev.includes(hobby)
        ? prev.filter(h => h !== hobby)
        : [...prev, hobby]
    );
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', maxWidth: '800px' }}>
      <h2 style={{ marginBottom: '20px' }}>Galería de Selectores</h2>

      {/* SELECT BASIC */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          SELECT (DROPDOWN)
        </h3>

        <div className="form-group">
          <label>País</label>
          <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)}>
            <option value="">Selecciona un país...</option>
            <option value="ar">Argentina</option>
            <option value="br">Brasil</option>
            <option value="cl">Chile</option>
            <option value="co">Colombia</option>
            <option value="mx">México</option>
          </select>
          <span className="input-helper">Selecciona tu país de residencia</span>
        </div>

        <div className="form-group">
          <label>Select Pequeño</label>
          <select className="select-sm">
            <option>Opción 1</option>
            <option>Opción 2</option>
            <option>Opción 3</option>
          </select>
        </div>

        <div className="form-group">
          <label>Select Grande</label>
          <select className="select-lg">
            <option>Opción 1</option>
            <option>Opción 2</option>
            <option>Opción 3</option>
          </select>
        </div>

        <div className="form-group">
          <label>Select Deshabilitado</label>
          <select disabled>
            <option>No disponible</option>
          </select>
        </div>
      </div>

      {/* SELECT VALIDATION */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          SELECT CON VALIDACIÓN
        </h3>

        <div className="form-group">
          <label>Con Error</label>
          <select className="select-error">
            <option value="">Este select tiene error</option>
            <option>Opción 1</option>
            <option>Opción 2</option>
          </select>
          <span className="form-error">Por favor selecciona una opción</span>
        </div>

        <div className="form-group">
          <label>Con Éxito</label>
          <select className="select-success">
            <option value="ar" selected>Argentina (Seleccionado)</option>
            <option>Otra opción</option>
          </select>
          <span className="form-success">✓ Opción válida seleccionada</span>
        </div>
      </div>

      {/* CHECKBOXES */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          CHECKBOXES
        </h3>

        <div className="checkbox-group">
          <label className="checkbox-label">
            <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
            Acepto los términos y condiciones
          </label>

          <label className="checkbox-label">
            <input type="checkbox" defaultChecked />
            Recordar mis preferencias
          </label>

          <label className="checkbox-label">
            <input type="checkbox" disabled />
            Opción deshabilitada
          </label>

          <label className="checkbox-label">
            <input type="checkbox" disabled checked />
            Seleccionado pero deshabilitado
          </label>
        </div>

        <h4 style={{ fontSize: '12px', fontWeight: '500', marginTop: '20px', marginBottom: '12px', color: '#94a3b8' }}>
          Grupo de Checkboxes
        </h4>
        <div className="checkbox-group">
          <div className="checkbox-item">
            <label className="checkbox-label">
              <input type="checkbox" onChange={(e) => handleHobbyChange('lectura')} checked={hobbies.includes('lectura')} />
              Lectura
            </label>
          </div>
          <div className="checkbox-item">
            <label className="checkbox-label">
              <input type="checkbox" onChange={(e) => handleHobbyChange('deporte')} checked={hobbies.includes('deporte')} />
              Deporte
            </label>
          </div>
          <div className="checkbox-item">
            <label className="checkbox-label">
              <input type="checkbox" onChange={(e) => handleHobbyChange('musica')} checked={hobbies.includes('musica')} />
              Música
            </label>
          </div>
          <div className="checkbox-item">
            <label className="checkbox-label">
              <input type="checkbox" onChange={(e) => handleHobbyChange('viajes')} checked={hobbies.includes('viajes')} />
              Viajes
            </label>
          </div>
        </div>
        {hobbies.length > 0 && (
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
            Seleccionados: {hobbies.join(', ')}
          </p>
        )}

        <h4 style={{ fontSize: '12px', fontWeight: '500', marginTop: '20px', marginBottom: '12px', color: '#94a3b8' }}>
          Checkboxes Horizontales
        </h4>
        <div className="checkbox-group horizontal">
          <label className="checkbox-label">
            <input type="checkbox" />
            Opción A
          </label>
          <label className="checkbox-label">
            <input type="checkbox" />
            Opción B
          </label>
          <label className="checkbox-label">
            <input type="checkbox" />
            Opción C
          </label>
        </div>
      </div>

      {/* RADIOS */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          RADIO BUTTONS
        </h3>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500' }}>Estado</label>
          <div className="radio-group">
            <label className="radio-label">
              <input type="radio" name="status" value="active" checked={selectedStatus === 'active'} onChange={(e) => setSelectedStatus(e.target.value)} />
              Activo
            </label>
            <label className="radio-label">
              <input type="radio" name="status" value="pending" checked={selectedStatus === 'pending'} onChange={(e) => setSelectedStatus(e.target.value)} />
              Pendiente
            </label>
            <label className="radio-label">
              <input type="radio" name="status" value="inactive" checked={selectedStatus === 'inactive'} onChange={(e) => setSelectedStatus(e.target.value)} />
              Inactivo
            </label>
          </div>
        </div>

        <h4 style={{ fontSize: '12px', fontWeight: '500', marginBottom: '12px', color: '#94a3b8' }}>
          Radios Horizontales
        </h4>
        <div className="radio-group horizontal">
          <label className="radio-label">
            <input type="radio" name="size" value="small" />
            Pequeño
          </label>
          <label className="radio-label">
            <input type="radio" name="size" value="medium" defaultChecked />
            Mediano
          </label>
          <label className="radio-label">
            <input type="radio" name="size" value="large" />
            Grande
          </label>
        </div>
      </div>

      {/* TOGGLE SWITCH */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          TOGGLE SWITCH
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={toggleNotifications}
              onChange={(e) => setToggleNotifications(e.target.checked)}
            />
            <span className="toggle-switch-slider"></span>
            Notificaciones Habilitadas
          </label>

          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={subscribed}
              onChange={(e) => setSubscribed(e.target.checked)}
            />
            <span className="toggle-switch-slider"></span>
            Suscrito a Boletín
          </label>

          <label className="toggle-switch">
            <input type="checkbox" disabled />
            <span className="toggle-switch-slider"></span>
            Opción Deshabilitada
          </label>
        </div>
      </div>

      {/* FIELDSET */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
          FIELDSET (Agrupación)
        </h3>

        <fieldset>
          <legend>Preferencias de Contacto</legend>
          <div className="radio-group" style={{ marginTop: '12px' }}>
            <label className="radio-label">
              <input type="radio" name="contact" value="email" defaultChecked />
              Email
            </label>
            <label className="radio-label">
              <input type="radio" name="contact" value="phone" />
              Teléfono
            </label>
            <label className="radio-label">
              <input type="radio" name="contact" value="sms" />
              SMS
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Información Visible</legend>
          <div className="checkbox-group" style={{ marginTop: '12px' }}>
            <label className="checkbox-label">
              <input type="checkbox" defaultChecked />
              Mostrar perfil públicamente
            </label>
            <label className="checkbox-label">
              <input type="checkbox" defaultChecked />
              Permitir mensajes
            </label>
            <label className="checkbox-label">
              <input type="checkbox" />
              Mostrar ubicación
            </label>
          </div>
        </fieldset>
      </div>

      {/* SUMMARY */}
      <div style={{ padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ marginBottom: '8px', color: '#0f172a' }}>Resumen de Selecciones</h4>
        <ul style={{ fontSize: '14px', color: '#64748b', margin: '0', paddingLeft: '20px' }}>
          <li>País: {selectedCountry || 'No seleccionado'}</li>
          <li>Estado: {selectedStatus}</li>
          <li>Pasatiempos: {hobbies.length > 0 ? hobbies.join(', ') : 'Ninguno'}</li>
          <li>Términos aceptados: {acceptTerms ? 'Sí' : 'No'}</li>
          <li>Notificaciones: {toggleNotifications ? 'Habilitadas' : 'Deshabilitadas'}</li>
        </ul>
      </div>
    </div>
  );
}
