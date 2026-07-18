// components/Button.js
// Botón reutilizable con estilos consistentes

import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  onClick, 
  type = 'button',
  disabled = false,
  className = '',
  ...props 
}) => {
  const variants = {
    primary: 'var(--color-primary)',
    success: 'var(--color-success)',
    danger: 'var(--color-danger)',
    warning: 'var(--color-warning)',
    secondary: 'var(--color-gray-500)',
    ia: '#7c3aed',
    outline: 'transparent',
  };

  const sizes = {
    sm: { padding: '4px 12px', fontSize: '0.8rem' },
    md: { padding: '8px 16px', fontSize: '0.9rem' },
    lg: { padding: '12px 24px', fontSize: '1rem' },
  };

  const isOutline = variant === 'outline';
  const bgColor = isOutline ? 'transparent' : variants[variant] || variants.primary;
  const textColor = isOutline ? 'var(--color-primary)' : 'white';
  const border = isOutline ? '1px solid var(--color-primary)' : 'none';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: sizes[size].padding,
        fontSize: sizes[size].fontSize,
        backgroundColor: bgColor,
        color: textColor,
        border: border,
        borderRadius: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.2s ease',
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isOutline) {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
