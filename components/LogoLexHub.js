// components/LogoLexHub.js
// Logo SVG de LexHub - Versión escalable

export default function LogoLexHub({ size = 40, showText = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Techo/Casa */}
      <path
        d="M20 60 L50 30 L80 60"
        stroke="#1e40af"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Paredes */}
      <rect x="25" y="60" width="50" height="25" stroke="#1e40af" strokeWidth="2" fill="none" />

      {/* Puerta */}
      <rect x="45" y="70" width="10" height="15" stroke="#1e40af" strokeWidth="1.5" fill="none" />

      {/* Puntos de la red */}
      <circle cx="50" cy="45" r="2.5" fill="#1e40af" />
      <circle cx="35" cy="55" r="2" fill="#2563eb" />
      <circle cx="65" cy="55" r="2" fill="#2563eb" />
      <circle cx="30" cy="70" r="2" fill="#2563eb" />
      <circle cx="70" cy="70" r="2" fill="#2563eb" />
      <circle cx="50" cy="75" r="2" fill="#1e40af" />

      {/* Conexiones de la red */}
      <line x1="50" y1="45" x2="35" y2="55" stroke="#1e40af" strokeWidth="1" opacity="0.6" />
      <line x1="50" y1="45" x2="65" y2="55" stroke="#1e40af" strokeWidth="1" opacity="0.6" />
      <line x1="35" y1="55" x2="30" y2="70" stroke="#1e40af" strokeWidth="1" opacity="0.6" />
      <line x1="65" y1="55" x2="70" y2="70" stroke="#1e40af" strokeWidth="1" opacity="0.6" />
      <line x1="30" y1="70" x2="50" y2="75" stroke="#1e40af" strokeWidth="1" opacity="0.6" />
      <line x1="70" y1="70" x2="50" y2="75" stroke="#1e40af" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}
