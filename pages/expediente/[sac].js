// pages/expediente/[sac].js
// Página de detalle de un expediente con su feed de actuaciones

import { useState } from 'react';
import { useRouter } from 'next/router';
import { getActuaciones, getClientes } from '../../lib/googleSheets';
import BotonInicio from '../../components/BotonInicio';

export async function getServerSideProps(context) {
  const { sac } = context.params;
  try {
    const clientes = await getClientes();
    let expediente = null;
    let cliente = null;

    for (const c of clientes) {
      const exp = c.expedientes?.find(e => e.Numero_SAC === sac);
      if (exp) {
        expediente = exp;
        cliente = c;
        break;
      }
    }

    if (!expediente) {
      return { notFound: true };
    }

    const actuaciones = await getActuaciones(sac);

    return {
      props: {
        sac,
        expediente,
        cliente: {
          ID_Cliente: cliente.ID_Cliente,
          Nombre_Cliente: cliente.Nombre_Cliente,
        },
        actuaciones,
      },
    };
  } catch (error) {
    console.error('Error al cargar expediente:', error);
    return { notFound: true };
  }
}

export default function ExpedientePage({ sac, expediente, cliente, actuaciones }) {
  const router = useRouter();
  const [eliminando, setEliminando] = useState(false);

  const volver = () => {
    router.push(`/clientes/${cliente.ID_Cliente}`);
  };

  const eliminarExpediente = async () => {
    if (!confirm(`¿Estás seguro de eliminar el expediente ${sac}?`)) {
      return;
    }

    setEliminando(true);
    try {
      const response = await fetch(`/api/eliminar?tipo=expediente&sac=${sac}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      
      if (data.success) {
        alert('Expediente eliminado correctamente');
        router.push(`/clientes/${cliente.ID_Cliente}`);
      } else {
        alert(data.error || 'Error al eliminar el expediente');
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar el expediente');
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BotonInicio />
          <div>
            <h1 style={{ marginBottom: '5px' }}>📄 Expediente {sac}</h1>
            <p style={{ color: '#4a5568', margin: 0 }}>
              Cliente: {cliente.Nombre_Cliente} | Carátula: {expediente.Caratula || 'No registrada'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={eliminarExpediente}
            style={{
              backgroundColor: '#e53e3e',
              opacity: eliminando ? 0.7 : 1,
              cursor: eliminando ? 'not-allowed' : 'pointer'
            }}
            disabled={eliminando}
          >
            {eliminando ? 'Eliminando...' : '🗑️ Eliminar Expediente'}
          </button>
          <button onClick={volver} style={{ backgroundColor: '#718096' }}>
            ← Volver al cliente
          </button>
        </div>
      </div>

      {/* Botones de acción */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button style={{ backgroundColor: '#38a169' }}>📝 Nueva Actuación</button>
        <button style={{ backgroundColor: '#3182ce' }}>🤖 Generar Escrito</button>
        <button style={{ backgroundColor: '#ed8936' }}>📅 Agregar Plazo</button>
        {expediente.ID_Carpeta_Drive && (
          <button style={{ backgroundColor: '#805ad5' }}>📥 Descargar Completo</button>
        )}
      </div>

      {/* Feed de actuaciones */}
      <h2>📋 Historial de Actuaciones</h2>
      {actuaciones.length === 0 ? (
        <p style={{ color: '#4a5568' }}>No hay actuaciones registradas para este expediente.</p>
      ) : (
        <div>
          {actuaciones.map((act, index) => (
            <div
              key={index}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '10px',
                backgroundColor: act.Es_Borrador === 'SI' ? '#fefcbf' : '#f7fafc',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{act.Tipo || 'Actuación'}</strong>
                  {act.Origen && <span style={{ marginLeft: '10px', color: '#4a5568' }}>📌 {act.Origen}</span>}
                  {act.Presentado === 'SI' && (
                    <span style={{ marginLeft: '10px', backgroundColor: '#38a169', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
                      Presentado
                    </span>
                  )}
                  {act.Es_Borrador === 'SI' && (
                    <span style={{ marginLeft: '10px', backgroundColor: '#ed8936', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
                      Borrador
                    </span>
                  )}
                </div>
                <span style={{ color: '#4a5568', fontSize: '0.9rem' }}>{act.Fecha || 'Sin fecha'}</span>
              </div>
              <div style={{ marginTop: '10px', whiteSpace: 'pre-wrap' }}>{act.Contenido || 'Sin contenido'}</div>
              {act.Tiene_PDF === 'SI' && act.ID_PDF_Drive && (
                <div style={{ marginTop: '10px' }}>
                  <a href={`/api/drive/descargar?fileId=${act.ID_PDF_Drive}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce' }}>
                    📎 Ver PDF adjunto
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
