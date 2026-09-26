// components/SACModal.js
// Modal para sincronización con SAC - Integrado en Header

import { useState } from 'react';

export default function SACModal({ isOpen, onClose }) {
  const [paso, setPaso] = useState(1);
  const [usuario, setUsuario] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [expedientes, setExpedientes] = useState([]);
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [dniCliente, setDniCliente] = useState('');
  const [domicilioCliente, setDomicilioCliente] = useState('');

  if (!isOpen) return null;

  const handleConectarSAC = async () => {
    if (!usuario || !contraseña) {
      setMensaje('❌ Usuario y contraseña requeridos');
      return;
    }

    setCargando(true);
    setMensaje('🔐 Conectando con SAC...');

    try {
      const response = await fetch('/api/sac/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, contraseña })
      });

      const data = await response.json();

      if (data.success) {
        setExpedientes(data.expedientes || []);
        setMensaje(`✅ Conectado. Se encontraron ${data.expedientes.length} expedientes`);
        setPaso(2);
      } else {
        setMensaje(`❌ ${data.error}`);
      }
    } catch (error) {
      setMensaje(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const handleSeleccionarExpediente = async (expediente) => {
    setCargando(true);
    setMensaje('📋 Obteniendo movimientos del SAC...');

    try {
      const response = await fetch('/api/sac/obtener-movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario,
          contraseña,
          numeroSAC: expediente.numero
        })
      });

      const data = await response.json();

      if (data.success) {
        setExpedienteSeleccionado(expediente);
        setMovimientos(data.expediente.movimientos || []);
        setNombreCliente(expediente.caratula || '');
        setMensaje(`✅ Se obtuvieron ${data.expediente.totalMovimientos} movimientos`);
        setPaso(3);
      } else {
        setMensaje(`❌ ${data.error}`);
      }
    } catch (error) {
      setMensaje(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const handleGuardar = async () => {
    if (!nombreCliente) {
      setMensaje('❌ Nombre del cliente requerido');
      return;
    }

    setCargando(true);
    setMensaje('💾 Guardando en LexHub...');

    try {
      const clienteResponse = await fetch('/api/crear-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombreCliente,
          telefono: telefonoCliente,
          dni: dniCliente,
          domicilio: domicilioCliente
        })
      });

      const clienteData = await clienteResponse.json();

      if (!clienteData.success) {
        setMensaje(`❌ Error al crear cliente: ${clienteData.error}`);
        return;
      }

      const idCliente = clienteData.id;

      const expedienteResponse = await fetch('/api/agregar-expediente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idCliente: idCliente,
          numeroSAC: expedienteSeleccionado.numero,
          caratula: expedienteSeleccionado.caratula,
          movimientos: movimientos
        })
      });

      const expedienteData = await expedienteResponse.json();

      if (expedienteData.success) {
        setMensaje('✅ Expediente guardado en LexHub');
        setPaso(4);
        setTimeout(() => {
          handleReset();
          onClose();
        }, 2000);
      } else {
        setMensaje(`❌ Error al guardar expediente: ${expedienteData.error}`);
      }
    } catch (error) {
      setMensaje(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const handleReset = () => {
    setPaso(1);
    setUsuario('');
    setContraseña('');
    setMensaje('');
    setExpedientes([]);
    setExpedienteSeleccionado(null);
    setMovimientos([]);
    setNombreCliente('');
    setTelefonoCliente('');
    setDniCliente('');
    setDomicilioCliente('');
  };

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          zIndex: 2001,
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          padding: '30px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón Cerrar */}
        <button
          onClick={() => {
            handleReset();
            onClose();
          }}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          ✕
        </button>

        <h1 style={{ marginBottom: '20px', marginTop: 0, color: '#1e293b' }}>
          🔗 Sincronizar con SAC
        </h1>

        {/* PASO 1: LOGIN */}
        {paso === 1 && (
          <div>
            <h2 style={{ fontSize: '1.1rem', marginTop: 0, color: '#475569' }}>
              Paso 1: Conectar con SAC
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
              Ingresa tus credenciales del Poder Judicial de Córdoba
            </p>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#1e293b' }}>
                Usuario (matrícula):
              </label>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Tu usuario del SAC"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#1e293b' }}>
                Contraseña:
              </label>
              <input
                type="password"
                value={contraseña}
                onChange={(e) => setContraseña(e.target.value)}
                placeholder="Tu contraseña"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {mensaje && (
              <div
                style={{
                  padding: '10px',
                  borderRadius: '4px',
                  marginBottom: '15px',
                  backgroundColor: mensaje.includes('✅') ? '#c6f6d5' : '#fed7d7',
                  color: mensaje.includes('✅') ? '#22543d' : '#9b2c2c',
                  fontSize: '0.9rem'
                }}
              >
                {mensaje}
              </div>
            )}

            <button
              onClick={handleConectarSAC}
              disabled={cargando}
              style={{
                width: '100%',
                backgroundColor: '#3182ce',
                color: '#fff',
                padding: '10px',
                border: 'none',
                borderRadius: '4px',
                cursor: cargando ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '0.95rem'
              }}
            >
              {cargando ? '⏳ Conectando...' : '🔐 Conectar con SAC'}
            </button>
          </div>
        )}

        {/* PASO 2: SELECCIONAR EXPEDIENTE */}
        {paso === 2 && (
          <div>
            <h2 style={{ fontSize: '1.1rem', marginTop: 0, color: '#475569' }}>
              Paso 2: Seleccionar Expediente
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '10px' }}>
              Se encontraron {expedientes.length} expedientes
            </p>

            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '15px' }}>
              {expedientes.map((exp, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSeleccionarExpediente(exp)}
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    padding: '12px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f4f8';
                    e.currentTarget.style.borderColor = '#3182ce';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <strong style={{ color: '#1e293b' }}>{exp.numero}</strong>
                  <p style={{ margin: '5px 0', fontSize: '0.85rem', color: '#64748b' }}>
                    {exp.caratula}
                  </p>
                  {exp.fuero && (
                    <p style={{ margin: '2px 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                      Fuero: {exp.fuero}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {mensaje && (
              <div
                style={{
                  padding: '10px',
                  borderRadius: '4px',
                  marginBottom: '15px',
                  backgroundColor: mensaje.includes('✅') ? '#c6f6d5' : '#fed7d7',
                  color: mensaje.includes('✅') ? '#22543d' : '#9b2c2c',
                  fontSize: '0.9rem'
                }}
              >
                {mensaje}
              </div>
            )}

            <button
              onClick={() => {
                setPaso(1);
                setMensaje('');
              }}
              style={{
                width: '100%',
                backgroundColor: '#718096',
                color: '#fff',
                padding: '10px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.95rem'
              }}
            >
              ← Volver
            </button>
          </div>
        )}

        {/* PASO 3: DATOS DEL CLIENTE */}
        {paso === 3 && expedienteSeleccionado && (
          <div>
            <h2 style={{ fontSize: '1.1rem', marginTop: 0, color: '#475569' }}>
              Paso 3: Datos del Cliente
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '10px' }}>
              <strong>Expediente:</strong> {expedienteSeleccionado.numero}<br />
              <strong>Movimientos:</strong> {movimientos.length}
            </p>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#1e293b', fontSize: '0.9rem' }}>
                Nombre del Cliente:
              </label>
              <input
                type="text"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#1e293b', fontSize: '0.9rem' }}>
                Teléfono (opcional):
              </label>
              <input
                type="text"
                value={telefonoCliente}
                onChange={(e) => setTelefonoCliente(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#1e293b', fontSize: '0.9rem' }}>
                DNI (opcional):
              </label>
              <input
                type="text"
                value={dniCliente}
                onChange={(e) => setDniCliente(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#1e293b', fontSize: '0.9rem' }}>
                Domicilio (opcional):
              </label>
              <input
                type="text"
                value={domicilioCliente}
                onChange={(e) => setDomicilioCliente(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {mensaje && (
              <div
                style={{
                  padding: '10px',
                  borderRadius: '4px',
                  marginBottom: '15px',
                  backgroundColor: mensaje.includes('✅') ? '#c6f6d5' : '#fed7d7',
                  color: mensaje.includes('✅') ? '#22543d' : '#9b2c2c',
                  fontSize: '0.9rem'
                }}
              >
                {mensaje}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleGuardar}
                disabled={cargando}
                style={{
                  flex: 1,
                  backgroundColor: '#48bb78',
                  color: '#fff',
                  padding: '10px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: cargando ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem'
                }}
              >
                {cargando ? '⏳ Guardando...' : '💾 Guardar'}
              </button>
              <button
                onClick={() => setPaso(2)}
                style={{
                  flex: 1,
                  backgroundColor: '#718096',
                  color: '#fff',
                  padding: '10px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem'
                }}
              >
                ← Volver
              </button>
            </div>
          </div>
        )}

        {/* PASO 4: COMPLETADO */}
        {paso === 4 && (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#22863a', marginTop: 0 }}>✅ Expediente Sincronizado</h2>
            <p style={{ color: '#64748b' }}>
              El expediente se ha guardado exitosamente en LexHub
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Redirigiendo...
            </p>
          </div>
        )}
      </div>
    </>
  );
}
