// components/EditorTexto.js
// Editor de texto enriquecido con funciones básicas

import { useState } from 'react';

export default function EditorTexto({ 
  initialValue = '', 
  onChange = null, 
  placeholder = 'Escribí el contenido...',
  minHeight = '200px'
}) {
  const [value, setValue] = useState(initialValue);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (onChange) onChange(newValue);
  };

  const aplicarFormato = (formato) => {
    const textarea = document.getElementById('editor-textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (!selectedText) return;

    let formattedText = '';
    switch (formato) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `__${selectedText}__`;
        break;
      case 'list':
        formattedText = selectedText.split('\n').map(line => `- ${line}`).join('\n');
        break;
      default:
        return;
    }

    const newValue = value.substring(0, start) + formattedText + value.substring(end);
    setValue(newValue);
    if (onChange) onChange(newValue);

    // Restaurar foco
    setTimeout(() => {
      textarea.focus();
      const newEnd = start + formattedText.length;
      textarea.setSelectionRange(newEnd, newEnd);
    }, 10);
  };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Barra de herramientas */}
      <div style={{
        display: 'flex',
        gap: '5px',
        padding: '8px 12px',
        backgroundColor: '#f7fafc',
        borderBottom: '1px solid #e2e8f0',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => aplicarFormato('bold')}
          style={{ padding: '4px 8px', backgroundColor: 'transparent', color: '#2d3748', fontSize: '0.9rem', fontWeight: 'bold' }}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => aplicarFormato('italic')}
          style={{ padding: '4px 8px', backgroundColor: 'transparent', color: '#2d3748', fontSize: '0.9rem', fontStyle: 'italic' }}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => aplicarFormato('underline')}
          style={{ padding: '4px 8px', backgroundColor: 'transparent', color: '#2d3748', fontSize: '0.9rem', textDecoration: 'underline' }}
        >
          <u>U</u>
        </button>
        <button
          type="button"
          onClick={() => aplicarFormato('list')}
          style={{ padding: '4px 8px', backgroundColor: 'transparent', color: '#2d3748', fontSize: '0.9rem' }}
        >
          📋 Lista
        </button>
        <span style={{ marginLeft: 'auto', color: '#a0aec0', fontSize: '0.8rem' }}>
          {value.length} caracteres
        </span>
      </div>

      {/* Área de texto */}
      <textarea
        id="editor-textarea"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '12px',
          border: 'none',
          outline: 'none',
          resize: 'vertical',
          minHeight: minHeight,
          fontSize: '0.95rem',
          lineHeight: '1.6',
          fontFamily: 'inherit',
          backgroundColor: 'white'
        }}
      />
    </div>
  );
}
