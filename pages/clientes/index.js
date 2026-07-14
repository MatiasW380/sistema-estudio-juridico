<tbody>
  {clientes.map((cliente, index) => (
    <tr key={index} style={{ cursor: 'pointer' }}>
      <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
        <a href={`/clientes/${cliente.ID_Cliente}`} style={{ color: '#3182ce', textDecoration: 'none' }}>
          {cliente.ID_Cliente || ''}
        </a>
      </td>
      <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>
        <a href={`/clientes/${cliente.ID_Cliente}`} style={{ color: '#3182ce', textDecoration: 'none' }}>
          {cliente.Nombre_Cliente || ''}
        </a>
      </td>
      <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{cliente.Telefono || ''}</td>
      <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{cliente.Numero_SAC || ''}</td>
      <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{cliente.Caratula || ''}</td>
    </tr>
  ))}
</tbody>
