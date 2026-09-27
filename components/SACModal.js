import { useState, useEffect } from 'react';

export default function SACModal({ isOpen, onClose }) {
  const [modo, setModo] = useState(null); // 'actualizar' o 'agregar'
  const [paso, setPaso] = useState(1);
  const [usuario, setUsuario] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  
  // Para ACTUALIZAR
  const [expedientesExistentes, setExpedientesExistentes] = useState([]);
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState(null);
  
  // Para AGREGAR
  const [expedientesDisponibles, setExpedientesDisponibles] = useState([]);
  const [clientesExistentes, setClientesExistentes] = useState([]);
  const [modoCliente, setModoCliente] = useState('existente'); // 'existente' o 'nuevo'
  const [clienteExistenteId, setClienteExistenteId] = useState('');
  const [nombreClienteNuevo, setNombreClienteNuevo] = useState('');

  if (!isOpen) return null;

  const handlePantallaPrincipal = () => {
    setModo(null);
    setPaso(1);
    setMensaje('');
    setUsuario('');
    setContraseña('');
  };

  const handleSeleccionarModo = async (modoSeleccionado) => {
    setModo(modoSeleccionado);
    setPaso(2);
    
    if (modoSeleccionado === 'actualizar') {
      // Obtener expedientes existentes
      try {
        const res = await fetch('/api/expedientes-existentes');
        const data = await res.json();
        if (data.success) {
          setExpedientesExistentes(data.expedientes);
          setMensaje(`✅ Se encontraron ${data.expedientes.length} expedientes`);
        }
      } catch (e) {
        setMensaje('❌ Error al cargar expedientes: ' + e.message);
      }
    } else {
      // Obtener clientes existentes
      try {
        const res = await fetch('/api/clientes-existentes');
        const data = await res.json();
        if (data.success) {
          setClientesExistentes(data.clientes);
        }
      } catch (e) {
        setMensaje('❌ Error al cargar clientes: ' + e.message);
      }
    }
  };

  const handleConectar = async () => {
    if (!usuario || !contraseña) {
      setMensaje('❌ Usuario y contraseña requeridos');
      return;
    }
    
    setCargando(true);
    setMensaje('🔐 Conectando con SAC...');
    
    try {
      const res = await fetch('/api/sac/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, contraseña })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setExpedientesDisponibles(data.expedientes || []);
        setMensaje(`✅ Conectado. ${data.expedientes.length} expedientes disponibles`);
        setPaso(3);
      } else {
        setMensaje(`❌ ${data.error}`);
      }
    } catch (e) {
      setMensaje(`❌ Error: ${e.message}`);
    } finally {
      setCargando(false);
    }
  };

  // INTERFAZ - Pantalla principal (modo null)
  if (modo === null) {
    return (
      <>
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000}} onClick={onClose} />
        <div style={{position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#fff', borderRadius: '12px', zIndex: 2001, maxWidth: '500px', width: '90%', padding: '30px'}} onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} style={{position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'}}>✕</button>
          
          <h1 style={{marginTop: 0, color: '#1e293b'}}>🔗 SAC - Sincronizar Expedientes</h1>
          
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '30px'}}>
            <button
              onClick={() => handleSeleccionarModo('actualizar')}
              style={{padding: '20px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem'}}
            >
              🔄 ACTUALIZAR
              <p style={{margin: '10px 0 0 0', fontSize: '0.85rem', opacity: 0.9}}>Agregar movimientos a expedientes existentes</p>
            </button>
            
            <button
              onClick={() => handleSeleccionarModo('agregar')}
              style={{padding: '20px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem'}}
            >
              ➕ AGREGAR EXPEDIENTE
              <p style={{margin: '10px 0 0 0', fontSize: '0.85rem', opacity: 0.9}}>Traer expediente nuevo desde SAC</p>
            </button>
          </div>
        </div>
      </>
    );
  }

  // ACTUALIZAR - Seleccionar expediente existente
  if (modo === 'actualizar' && paso === 2) {
    return (
      <>
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000}} onClick={onClose} />
        <div style={{position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#fff', borderRadius: '12px', zIndex: 2001, maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto', padding: '30px'}} onClick={(e) => e.stopPropagation()}>
          <button onClick={handlePantallaPrincipal} style={{position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'}}>✕</button>
          
          <h2 style={{marginTop: 0, color: '#1e293b'}}>🔄 Seleccionar Expediente</h2>
          <p style={{color: '#64748b'}}>Elige un expediente existente para actualizar movimientos</p>
          
          {mensaje && <div style={{padding: '10px', backgroundColor: mensaje.includes('✅') ? '#c6f6d5' : '#fed7d7', color: mensaje.includes('✅') ? '#22543d' : '#9b2c2c', borderRadius: '4px', marginBottom: '15px'}}>{mensaje}</div>}
          
          <div style={{maxHeight: '300px', overflowY: 'auto', marginBottom: '15px'}}>
            {expedientesExistentes.map((exp, i) => (
              <div key={i} onClick={() => {setExpedienteSeleccionado(exp); setPaso(3);}} style={{backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '12px', marginBottom: '8px', cursor: 'pointer'}}>
                <strong style={{color: '#1e293b'}}>{exp.numeroSAC}</strong>
                <p style={{margin: '5px 0', fontSize: '0.85rem', color: '#64748b'}}>{exp.nombreCliente}</p>
              </div>
            ))}
          </div>
          
          <button onClick={handlePantallaPrincipal} style={{width: '100%', backgroundColor: '#718096', color: '#fff', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600'}}>← Volver</button>
        </div>
      </>
    );
  }

  // ACTUALIZAR - Conectar SAC y obtener movimientos
  if (modo === 'actualizar' && paso === 3 && expedienteSeleccionado) {
    return (
      <>
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000}} onClick={onClose} />
        <div style={{position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#fff', borderRadius: '12px', zIndex: 2001, maxWidth: '500px', width: '90%', padding: '30px'}} onClick={(e) => e.stopPropagation()}>
          <button onClick={handlePantallaPrincipal} style={{position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'}}>✕</button>
          
          <h2 style={{marginTop: 0, color: '#1e293b'}}>🔐 Actualizar {expedienteSeleccionado.numeroSAC}</h2>
          
          <div style={{marginBottom: '15px'}}>
            <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#1e293b'}}>Usuario:</label>
            <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} style={{width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '4px', boxSizing: 'border-box'}} />
          </div>
          
          <div style={{marginBottom: '15px'}}>
            <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#1e293b'}}>Contraseña:</label>
            <input type="password" value={contraseña} onChange={(e) => setContraseña(e.target.value)} style={{width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '4px', boxSizing: 'border-box'}} />
          </div>
          
          {mensaje && <div style={{padding: '10px', backgroundColor: mensaje.includes('✅') ? '#c6f6d5' : '#fed7d7', color: mensaje.includes('✅') ? '#22543d' : '#9b2c2c', borderRadius: '4px', marginBottom: '15px'}}>{mensaje}</div>}
          
          <button onClick={handleConectar} disabled={cargando} style={{width: '100%', backgroundColor: '#3b82f6', color: '#fff', padding: '10px', border: 'none', borderRadius: '4px', cursor: cargando ? 'not-allowed' : 'pointer', fontWeight: '600', marginBottom: '10px'}}>
            {cargando ? '⏳ Conectando...' : '🔐 Conectar y Actualizar'}
          </button>
          
          <button onClick={() => setPaso(2)} style={{width: '100%', backgroundColor: '#718096', color: '#fff', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600'}}>← Volver</button>
        </div>
      </>
    );
  }

  // AGREGAR EXPEDIENTE - Modo cliente (paso 2)
  if (modo === 'agregar' && paso === 2) {
    return (
      <>
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000}} onClick={onClose} />
        <div style={{position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#fff', borderRadius: '12px', zIndex: 2001, maxWidth: '500px', width: '90%', padding: '30px'}} onClick={(e) => e.stopPropagation()}>
          <button onClick={handlePantallaPrincipal} style={{position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'}}>✕</button>
          
          <h2 style={{marginTop: 0, color: '#1e293b'}}>➕ Agregar Expediente - Seleccionar Cliente</h2>
          
          <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
            <button onClick={() => setModoCliente('existente')} style={{flex: 1, padding: '10px', backgroundColor: modoCliente === 'existente' ? '#3b82f6' : '#e2e8f0', color: modoCliente === 'existente' ? '#fff' : '#1e293b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600'}}>
              👥 Cliente Existente
            </button>
            <button onClick={() => setModoCliente('nuevo')} style={{flex: 1, padding: '10px', backgroundColor: modoCliente === 'nuevo' ? '#10b981' : '#e2e8f0', color: modoCliente === 'nuevo' ? '#fff' : '#1e293b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600'}}>
              ➕ Cliente Nuevo
            </button>
          </div>
          
          {modoCliente === 'existente' && (
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#1e293b'}}>Seleccionar cliente:</label>
              <select value={clienteExistenteId} onChange={(e) => setClienteExistenteId(e.target.value)} style={{width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '4px', boxSizing: 'border-box'}}>
                <option value="">-- Elige un cliente --</option>
                {clientesExistentes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}
          
          {modoCliente === 'nuevo' && (
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#1e293b'}}>Nombre del nuevo cliente:</label>
              <input type="text" value={nombreClienteNuevo} onChange={(e) => setNombreClienteNuevo(e.target.value)} style={{width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '4px', boxSizing: 'border-box'}} />
            </div>
          )}
          
          <button onClick={() => setPaso(3)} disabled={modoCliente === 'existente' ? !clienteExistenteId : !nombreClienteNuevo} style={{width: '100%', backgroundColor: '#3b82f6', color: '#fff', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', marginBottom: '10px', opacity: (modoCliente === 'existente' ? !clienteExistenteId : !nombreClienteNuevo) ? 0.5 : 1}}>
            Continuar →
          </button>
          
          <button onClick={handlePantallaPrincipal} style={{width: '100%', backgroundColor: '#718096', color: '#fff', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600'}}>← Volver</button>
        </div>
      </>
    );
  }

  // AGREGAR EXPEDIENTE - Conectar y seleccionar (paso 3)
  if (modo === 'agregar' && paso === 3) {
    return (
      <>
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000}} onClick={onClose} />
        <div style={{position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#fff', borderRadius: '12px', zIndex: 2001, maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto', padding: '30px'}} onClick={(e) => e.stopPropagation()}>
          <button onClick={handlePantallaPrincipal} style={{position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'}}>✕</button>
          
          <h2 style={{marginTop: 0, color: '#1e293b'}}>🔐 Conectar con SAC</h2>
          
          <div style={{marginBottom: '15px'}}>
            <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#1e293b'}}>Usuario:</label>
            <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} style={{width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '4px', boxSizing: 'border-box'}} />
          </div>
          
          <div style={{marginBottom: '15px'}}>
            <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#1e293b'}}>Contraseña:</label>
            <input type="password" value={contraseña} onChange={(e) => setContraseña(e.target.value)} style={{width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '4px', boxSizing: 'border-box'}} />
          </div>
          
          {mensaje && <div style={{padding: '10px', backgroundColor: mensaje.includes('✅') ? '#c6f6d5' : '#fed7d7', color: mensaje.includes('✅') ? '#22543d' : '#9b2c2c', borderRadius: '4px', marginBottom: '15px'}}>{mensaje}</div>}
          
          <button onClick={handleConectar} disabled={cargando} style={{width: '100%', backgroundColor: '#10b981', color: '#fff', padding: '10px', border: 'none', borderRadius: '4px', cursor: cargando ? 'not-allowed' : 'pointer', fontWeight: '600', marginBottom: '10px'}}>
            {cargando ? '⏳ Conectando...' : '🔐 Conectar con SAC'}
          </button>
          
          <button onClick={() => setPaso(2)} style={{width: '100%', backgroundColor: '#718096', color: '#fff', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600'}}>← Volver</button>
        </div>
      </>
    );
  }

  return null;
}
