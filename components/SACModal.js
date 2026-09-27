import { useState } from 'react';
import styles from '../styles/SACModal.module.css';

export default function SACModal({ isOpen, onClose }) {
  const [pantalla, setPantalla] = useState('inicio');
  const [usuario, setUsuario] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [expedientesExistentes, setExpedientesExistentes] = useState([]);
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState(null);
  const [clientesExistentes, setClientesExistentes] = useState([]);
  const [modoCliente, setModoCliente] = useState('existente');
  const [clienteId, setClienteId] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');

  if (!isOpen) return null;

  const handleActualizar = async () => {
    setCargando(true);
    setMensaje('');
    try {
      const res = await fetch('/api/expedientes-existentes');
      const data = await res.json();
      if (data.success) {
        setExpedientesExistentes(data.expedientes);
        setPantalla('actualizar-paso1');
        setMensaje(`Se encontraron ${data.expedientes.length} expedientes`);
      } else {
        setMensaje('❌ ' + data.error);
      }
    } catch (e) {
      setMensaje('❌ Error: ' + e.message);
    } finally {
      setCargando(false);
    }
  };

  const handleAgregar = async () => {
    setCargando(true);
    setMensaje('');
    try {
      const res = await fetch('/api/clientes-existentes');
      const data = await res.json();
      if (data.success) {
        setClientesExistentes(data.clientes);
        setPantalla('agregar-paso1');
      } else {
        setMensaje('❌ ' + data.error);
      }
    } catch (e) {
      setMensaje('❌ Error: ' + e.message);
    } finally {
      setCargando(false);
    }
  };

  const handleSeleccionarExpediente = (exp) => {
    setExpedienteSeleccionado(exp);
    setPantalla('actualizar-paso2');
  };

  // PANTALLA: INICIO
  if (pantalla === 'inicio') {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button className={styles.close} onClick={onClose}>✕</button>
          <h1>🔗 SAC - Sincronizar Expedientes</h1>
          <p>¿Qué deseas hacer?</p>
          
          <div className={styles.buttonGrid}>
            <button 
              className={`${styles.btn} ${styles.btnBlue}`}
              onClick={handleActualizar}
              disabled={cargando}
            >
              🔄 ACTUALIZAR<br/>
              <small>Agregar movimientos</small>
            </button>
            
            <button 
              className={`${styles.btn} ${styles.btnGreen}`}
              onClick={handleAgregar}
              disabled={cargando}
            >
              ➕ AGREGAR<br/>
              <small>Expediente nuevo</small>
            </button>
          </div>
          
          {mensaje && <p className={styles.error}>{mensaje}</p>}
        </div>
      </div>
    );
  }

  // PANTALLA: ACTUALIZAR - PASO 1 (Seleccionar expediente)
  if (pantalla === 'actualizar-paso1') {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button className={styles.close} onClick={onClose}>✕</button>
          <h2>🔄 Seleccionar Expediente</h2>
          <p>Elige un expediente para actualizar movimientos</p>
          
          {expedientesExistentes.length > 0 ? (
            <div className={styles.list}>
              {expedientesExistentes.map((exp, i) => (
                <div 
                  key={i} 
                  className={styles.item}
                  onClick={() => handleSeleccionarExpediente(exp)}
                >
                  <strong>{exp.numeroSAC}</strong>
                  <p>{exp.nombreCliente}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No hay expedientes</p>
          )}
          
          {mensaje && <p className={styles.success}>{mensaje}</p>}
          
          <button className={styles.btnGray} onClick={() => setPantalla('inicio')}>← Atrás</button>
        </div>
      </div>
    );
  }

  // PANTALLA: ACTUALIZAR - PASO 2 (Credenciales SAC)
  if (pantalla === 'actualizar-paso2' && expedienteSeleccionado) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button className={styles.close} onClick={onClose}>✕</button>
          <h2>🔐 Actualizar {expedienteSeleccionado.numeroSAC}</h2>
          <p>Ingresa tus credenciales del SAC</p>
          
          <div className={styles.formGroup}>
            <label>Usuario SAC:</label>
            <input 
              type="text" 
              value={usuario} 
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Tu usuario"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>Contraseña:</label>
            <input 
              type="password" 
              value={contraseña} 
              onChange={(e) => setContraseña(e.target.value)}
              placeholder="Tu contraseña"
            />
          </div>
          
          {mensaje && <p className={styles.error}>{mensaje}</p>}
          
          <button 
            className={styles.btnBlue}
            disabled={cargando || !usuario || !contraseña}
          >
            {cargando ? '⏳ Conectando...' : '🔐 Conectar'}
          </button>
          <button className={styles.btnGray} onClick={() => setPantalla('actualizar-paso1')}>← Atrás</button>
        </div>
      </div>
    );
  }

  // PANTALLA: AGREGAR - PASO 1 (Seleccionar cliente)
  if (pantalla === 'agregar-paso1') {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button className={styles.close} onClick={onClose}>✕</button>
          <h2>➕ Agregar Expediente - Cliente</h2>
          
          <div className={styles.tabs}>
            <button 
              className={modoCliente === 'existente' ? styles.tabActive : styles.tab}
              onClick={() => setModoCliente('existente')}
            >
              👥 Existente
            </button>
            <button 
              className={modoCliente === 'nuevo' ? styles.tabActive : styles.tab}
              onClick={() => setModoCliente('nuevo')}
            >
              ➕ Nuevo
            </button>
          </div>
          
          {modoCliente === 'existente' && (
            <div className={styles.formGroup}>
              <label>Seleccionar cliente:</label>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">-- Elige --</option>
                {clientesExistentes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}
          
          {modoCliente === 'nuevo' && (
            <div className={styles.formGroup}>
              <label>Nombre del cliente:</label>
              <input 
                type="text" 
                value={nombreCliente} 
                onChange={(e) => setNombreCliente(e.target.value)}
                placeholder="Nombre completo"
              />
            </div>
          )}
          
          {mensaje && <p className={styles.error}>{mensaje}</p>}
          
          <button 
            className={styles.btnBlue}
            onClick={() => setPantalla('agregar-paso2')}
            disabled={modoCliente === 'existente' ? !clienteId : !nombreCliente}
          >
            Continuar →
          </button>
          <button className={styles.btnGray} onClick={() => setPantalla('inicio')}>← Atrás</button>
        </div>
      </div>
    );
  }

  // PANTALLA: AGREGAR - PASO 2 (Credenciales SAC)
  if (pantalla === 'agregar-paso2') {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button className={styles.close} onClick={onClose}>✕</button>
          <h2>🔐 Conectar con SAC</h2>
          <p>Ingresa tus credenciales para buscar expedientes</p>
          
          <div className={styles.formGroup}>
            <label>Usuario SAC:</label>
            <input 
              type="text" 
              value={usuario} 
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Tu usuario"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>Contraseña:</label>
            <input 
              type="password" 
              value={contraseña} 
              onChange={(e) => setContraseña(e.target.value)}
              placeholder="Tu contraseña"
            />
          </div>
          
          {mensaje && <p className={styles.error}>{mensaje}</p>}
          
          <button 
            className={styles.btnGreen}
            disabled={cargando || !usuario || !contraseña}
          >
            {cargando ? '⏳ Conectando...' : '🔐 Conectar con SAC'}
          </button>
          <button className={styles.btnGray} onClick={() => setPantalla('agregar-paso1')}>← Atrás</button>
        </div>
      </div>
    );
  }

  return null;
}
