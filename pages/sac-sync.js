import { useState } from 'react';
import { useRouter } from 'next/router';

export default function SACSync() {
  const router = useRouter();
  const [paso, setPaso] = useState(1); // 1: Login, 2: Seleccionar expediente, 3: Datos cliente, 4: Confirmación
  
  // Paso 1: Login
  const [usuario, setUsuario] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [expedientes, setExpedientes] = useState([]);
  const [diagnostico, setDiagnostico] = useState(null);

  // Paso 2: Seleccionar expediente
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState(null);
  const [movimientos, setMovimientos] = useState([]);

  // Paso 3: Datos del cliente
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [dniCliente, setDniCliente] = useState('');
  const [domicilioCliente, setDomicilioCliente] = useState('');

  // Conectar con SAC y obtener expedientes
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
      console.log('[SAC auth] respuesta completa:', data);

      if (data.success) {
        setExpedientes(data.expedientes || []);
        setDiagnostico(data.diagnosticoTexto || data.diagnosticoOperaciones || data.diagnosticoExpedientes || null);
        setMensaje(`✅ ${data.mensaje || 'Conectado al SAC'}`);
      } else {
        setDiagnostico(data.diagnostico || null);
        setMensaje(`❌ ${data.mensaje || data.error || 'No se pudo conectar'}`);
      }
    } catch (error) {
      setMensaje(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const [resultadoSync, setResultadoSync] = useState(null);
  const [resultadoReparar, setResultadoReparar] = useState(null);

  const handleReparar = async () => {
    if (!usuario || !contraseña) {
      setMensaje('❌ Usuario y contraseña requeridos');
      return;
    }
    setCargando(true);
    setMensaje('🛠️ Reparando movimientos viejos...');
    setResultadoReparar(null);

    try {
      const response = await fetch('/api/sac/reparar-contenido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, contraseña })
      });
      const texto = await response.text();
      let data;
      try {
        data = JSON.parse(texto);
      } catch {
        throw new Error(`Respuesta no válida (status ${response.status}): ${texto.slice(0, 200)}`);
      }
      setResultadoReparar(data);
      setMensaje(data.success ? `✅ ${data.mensaje}` : `❌ ${data.mensaje || data.error}`);
    } catch (error) {
      setMensaje(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const handleSincronizar = async () => {
    if (!usuario || !contraseña) {
      setMensaje('❌ Usuario y contraseña requeridos');
      return;
    }
    setCargando(true);
    setMensaje('🔄 Sincronizando movimientos con LexHub...');
    setResultadoSync(null);

    try {
      const response = await fetch('/api/sac/sincronizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, contraseña })
      });
      const texto = await response.text();
      let data;
      try {
        data = JSON.parse(texto);
      } catch {
        throw new Error(
          `El servidor no devolvió una respuesta válida (status ${response.status}). Puede haber excedido el tiempo máximo. Detalle: ${texto.slice(0, 200)}`
        );
      }
      console.log('[SAC sincronizar] respuesta completa:', data);
      setResultadoSync(data);
      setMensaje(data.success ? `✅ ${data.mensaje}` : `❌ ${data.mensaje || data.error}`);
    } catch (error) {
      setMensaje(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  // Obtener movimientos del expediente seleccionado
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

  // Guardar en LexHub
  const handleGuardar = async () => {
    if (!nombreCliente) {
      setMensaje('❌ Nombre del cliente requerido');
      return;
    }

    setCargando(true);
    setMensaje('💾 Guardando en LexHub...');

    try {
      // 1. Crear el cliente
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

      // 2. Guardar expediente con movimientos
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
          router.push(`/clientes/${idCliente}`);
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

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
      <h1>🔗 Sincronizar con SAC</h1>

      {/* PASO 1: LOGIN */}
      {paso === 1 && (
        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px' }}>
          <h2>Paso 1: Conectar con SAC</h2>
          <p>Ingresa tus credenciales del Poder Judicial de Córdoba</p>

          <div style={{ marginBottom: '15px' }}>
            <label>
              <strong>Usuario (matrícula):</strong>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Tu usuario del SAC"
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px'
                }}
              />
            </label>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>
              <strong>Contraseña:</strong>
              <input
                type="password"
                value={contraseña}
                onChange={(e) => setContraseña(e.target.value)}
                placeholder="Tu contraseña"
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px'
                }}
              />
            </label>
          </div>

          {mensaje && (
            <div
              style={{
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '15px',
                backgroundColor: mensaje.includes('✅') ? '#c6f6d5' : '#fed7d7',
                color: mensaje.includes('✅') ? '#22543d' : '#9b2c2c'
              }}
            >
              {mensaje}
            </div>
          )}

          <button
            onClick={handleConectarSAC}
            disabled={cargando}
            style={{
              backgroundColor: '#3182ce',
              color: '#fff',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: cargando ? 'not-allowed' : 'pointer'
            }}
          >
            {cargando ? '⏳ Conectando...' : '🔐 Conectar con SAC'}
          </button>

          <button
            onClick={handleSincronizar}
            disabled={cargando}
            style={{
              backgroundColor: '#2f855a',
              color: '#fff',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: cargando ? 'not-allowed' : 'pointer',
              marginLeft: '10px'
            }}
          >
            {cargando ? '⏳ Sincronizando...' : '🔄 Sincronizar movimientos con LexHub'}
          </button>

          <button
            onClick={handleReparar}
            disabled={cargando}
            style={{
              backgroundColor: '#b7791f',
              color: '#fff',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: cargando ? 'not-allowed' : 'pointer',
              marginLeft: '10px'
            }}
          >
            {cargando ? '⏳ Reparando...' : '🛠️ Reparar movimientos viejos (sin texto real)'}
          </button>

          {resultadoReparar && (
            <p style={{ marginTop: '10px' }}>
              <strong>Reparación:</strong> {resultadoReparar.mensaje}
            </p>
          )}

          {resultadoSync && resultadoSync.resultados && (
            <div style={{ marginTop: '20px' }}>
              <p><strong>Resultado de la sincronización:</strong></p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
                    <th style={{ padding: '6px' }}>N° Expediente</th>
                    <th style={{ padding: '6px' }}>Carátula</th>
                    <th style={{ padding: '6px' }}>Movimientos en SAC</th>
                    <th style={{ padding: '6px' }}>Nuevos agregados</th>
                  </tr>
                </thead>
                <tbody>
                  {resultadoSync.resultados.map((r) => (
                    <tr key={r.numeroSAC} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '6px' }}>{r.numeroSAC}</td>
                      <td style={{ padding: '6px' }}>{r.caratula}</td>
                      <td style={{ padding: '6px' }}>{r.totalOperacionesSAC}</td>
                      <td style={{ padding: '6px', fontWeight: r.movimientosNuevos > 0 ? 'bold' : 'normal' }}>
                        {r.movimientosNuevos}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {expedientes.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <p><strong>Expedientes con movimientos recientes en el SAC ({expedientes.length}):</strong></p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
                    <th style={{ padding: '6px' }}>N° Expediente</th>
                    <th style={{ padding: '6px' }}>Carátula</th>
                    <th style={{ padding: '6px' }}>Dependencia</th>
                    <th style={{ padding: '6px' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {expedientes.map((e) => (
                    <tr key={e.idExpediente} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '6px' }}>{e.numeroExpediente}</td>
                      <td style={{ padding: '6px' }}>{e.caratula}</td>
                      <td style={{ padding: '6px' }}>{e.dependencia}</td>
                      <td style={{ padding: '6px' }}>{e.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {diagnostico && (
            <div style={{ marginTop: '20px' }}>
              <p><strong>Diagnóstico (para revisar qué pasó):</strong></p>
              <pre style={{
                backgroundColor: '#1a202c',
                color: '#f6e05e',
                padding: '15px',
                borderRadius: '4px',
                overflowX: 'auto',
                fontSize: '0.8rem',
                maxHeight: '400px',
                whiteSpace: 'pre-wrap'
              }}>
                {JSON.stringify(diagnostico, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* PASO 2: SELECCIONAR EXPEDIENTE */}
      {paso === 2 && (
        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px' }}>
          <h2>Paso 2: Seleccionar Expediente</h2>
          <p>Se encontraron {expedientes.length} expedientes</p>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {expedientes.map((exp, idx) => (
              <div
                key={idx}
                onClick={() => handleSeleccionarExpediente(exp)}
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  padding: '15px',
                  marginBottom: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#f0f4f8')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#fff')}
              >
                <strong>{exp.numero}</strong>
                <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#666' }}>
                  {exp.caratula}
                </p>
                {exp.fuero && <p style={{ margin: '5px 0', fontSize: '0.85rem', color: '#999' }}>Fuero: {exp.fuero}</p>}
              </div>
            ))}
          </div>

          {mensaje && (
            <div
              style={{
                padding: '10px',
                borderRadius: '4px',
                marginTop: '15px',
                backgroundColor: mensaje.includes('✅') ? '#c6f6d5' : '#fed7d7',
                color: mensaje.includes('✅') ? '#22543d' : '#9b2c2c'
              }}
            >
              {mensaje}
            </div>
          )}

          <button
            onClick={() => setPaso(1)}
            style={{
              backgroundColor: '#718096',
              color: '#fff',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              marginTop: '15px',
              cursor: 'pointer'
            }}
          >
            ← Volver
          </button>
        </div>
      )}

      {/* PASO 3: DATOS DEL CLIENTE */}
      {paso === 3 && expedienteSeleccionado && (
        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px' }}>
          <h2>Paso 3: Datos del Cliente</h2>
          <p>Expediente: <strong>{expedienteSeleccionado.numero}</strong></p>
          <p>Se traerán {movimientos.length} movimientos del SAC</p>

          <div style={{ marginBottom: '15px' }}>
            <label>
              <strong>Nombre del Cliente:</strong>
              <input
                type="text"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px'
                }}
              />
            </label>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>
              <strong>Teléfono (opcional):</strong>
              <input
                type="text"
                value={telefonoCliente}
                onChange={(e) => setTelefonoCliente(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px'
                }}
              />
            </label>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>
              <strong>DNI (opcional):</strong>
              <input
                type="text"
                value={dniCliente}
                onChange={(e) => setDniCliente(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px'
                }}
              />
            </label>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>
              <strong>Domicilio (opcional):</strong>
              <input
                type="text"
                value={domicilioCliente}
                onChange={(e) => setDomicilioCliente(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px'
                }}
              />
            </label>
          </div>

          {mensaje && (
            <div
              style={{
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '15px',
                backgroundColor: mensaje.includes('✅') ? '#c6f6d5' : '#fed7d7',
                color: mensaje.includes('✅') ? '#22543d' : '#9b2c2c'
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
                backgroundColor: '#48bb78',
                color: '#fff',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: cargando ? 'not-allowed' : 'pointer'
              }}
            >
              {cargando ? '⏳ Guardando...' : '💾 Guardar en LexHub'}
            </button>
            <button
              onClick={() => setPaso(2)}
              style={{
                backgroundColor: '#718096',
                color: '#fff',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ← Volver
            </button>
          </div>
        </div>
      )}

      {/* PASO 4: COMPLETADO */}
      {paso === 4 && (
        <div style={{ backgroundColor: '#c6f6d5', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <h2>✅ Expediente Sincronizado</h2>
          <p>El expediente se ha guardado exitosamente en LexHub</p>
          <p>Redirigiendo...</p>
        </div>
      )}
    </div>
  );
}
