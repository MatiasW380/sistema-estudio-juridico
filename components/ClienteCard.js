// Si es un archivo separado: components/ClienteCard.js
export default function ClienteCard({ cliente, onVerExpediente }) {
  return (
    <div className="bg-white border border-blue-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
      <h3 className="text-xl font-bold text-blue-900 mb-2">{cliente.nombre}</h3>
      <p className="text-gray-600 mb-4 text-sm">Expediente: {cliente.nro_expediente}</p>
      
      <button 
        onClick={() => onVerExpediente(cliente.folderId)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
      >
        Ver Expediente
      </button>
    </div>
  );
}
