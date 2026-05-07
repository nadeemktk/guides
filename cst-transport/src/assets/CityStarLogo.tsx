import React from 'react'

interface Props {
  className?: string
  width?: number | string
  height?: number | string
}

export default function CityStarLogo({ className, width = 260, height = 88 }: Props) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 260 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer curved banner */}
      <path
        d="M8 4 Q130 0 252 4 Q260 44 252 84 Q130 88 8 84 Q0 44 8 4 Z"
        fill="url(#bannerGrad)"
      />
      {/* Inner highlight */}
      <path
        d="M12 8 Q130 4 248 8 Q255 44 248 80 Q130 84 12 80 Q5 44 12 8 Z"
        fill="none"
        stroke="rgba(255,200,100,0.15)"
        strokeWidth="1"
      />

      <defs>
        <linearGradient id="bannerGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9B1C1C" />
          <stop offset="50%" stopColor="#7F1D1D" />
          <stop offset="100%" stopColor="#6B1111" />
        </linearGradient>
        <linearGradient id="starGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      {/* CITY STAR text */}
      <text
        x="112"
        y="38"
        textAnchor="middle"
        fontFamily="Arial Black, Impact, sans-serif"
        fontSize="26"
        fontWeight="900"
        fontStyle="italic"
        fill="white"
        letterSpacing="1"
      >
        CITY STAR
      </text>

      {/* Gold star ★ */}
      <text
        x="216"
        y="38"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="22"
        fill="url(#starGrad)"
      >
        ★
      </text>

      {/* Decorative line under title */}
      <line x1="18" y1="45" x2="242" y2="45" stroke="rgba(252,211,77,0.4)" strokeWidth="0.5" />

      {/* Subsidiary 1 */}
      <text x="22" y="57" fontFamily="Arial, sans-serif" fontSize="7.5" fontStyle="italic" fill="#FCD34D" fontWeight="bold">▶</text>
      <text x="32" y="57" fontFamily="Arial, sans-serif" fontSize="7.5" fontStyle="italic" fill="#F5E6C8">
        DIAMOND TRANSPORT LLC (Dubai)
      </text>

      {/* Subsidiary 2 */}
      <text x="22" y="68" fontFamily="Arial, sans-serif" fontSize="7.5" fontStyle="italic" fill="#FCD34D" fontWeight="bold">▶</text>
      <text x="32" y="68" fontFamily="Arial, sans-serif" fontSize="7.5" fontStyle="italic" fill="#F5E6C8">
        Tourism LLC (Dubai)
      </text>

      {/* Subsidiary 3 */}
      <text x="22" y="79" fontFamily="Arial, sans-serif" fontSize="7.5" fontStyle="italic" fill="#FCD34D" fontWeight="bold">▶</text>
      <text x="32" y="79" fontFamily="Arial, sans-serif" fontSize="7.5" fontStyle="italic" fill="#F5E6C8">
        Passenger Transport LLC (Abu Dhabi)
      </text>
    </svg>
  )
}
