import { useState, useEffect } from 'react';
import styles from '../styles/SACModal.module.css';

export default function SACModal({ isOpen, onClose }) {
  const [pantalla, setPantalla] = useState('inicio'); // inicio, actualizar-paso1, actualizar-paso2, agregar-paso1, agregar-paso2
  const [usuario, setUsuario] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [expedientesExistentes, setExpedientesExistentes] = useState([]);
  const [clientesExistentes, setClientesExistentes] = useState([]);
  const [modoCliente, setModoCliente] = useState('existente');
  const [clienteId, setClienteId] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');

  if (!isOpen) return null;

  const reset = () => {
    setPantalla('inicio');
    setUsuario('');
    setContraseña('');
    setMensaje('');
    setExpedientesExistentes([]);
    setClientesExistentes([]);
    setClienteId('');
    setNombreCliente('');
  };

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

  // PANTALLA: ACTUALIZAR - PASO 1
  if (pantalla === 'actualizar-paso1') {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button className={styles.close} onClick={onClose}>✕</button>
          <h2>🔄 Seleccionar Expediente</h2>
          
          {expedientesExistentes.length > 0 ? (
            <div className={styles.list}>
              {expedientesExistentes.map((exp, i) => (
                <div key={i} className={styles.item}>
                  <strong>{exp.numeroSAC}</strong>
                  <p>{exp.nombreCliente}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No hay expedientes</p>
          )}
          
          <button className={styles.btnGray} onClick={() => setPantalla('inicio')}>← Atrás</button>
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
              <label>Nombre:</label>
              <input 
                type="text" 
                value={nombreCliente} 
                onChange={(e) => setNombreCliente(e.target.value)}
                placeholder="Nombre del cliente"
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
            {cargando ? '⏳ Conectando...' : '🔐 Conectar'}
          </button>
          <button className={styles.btnGray} onClick={() => setPantalla('agregar-paso1')}>← Atrás</button>
        </div>
      </div>
    );
  }

  return null;
}
