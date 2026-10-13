"use client";

import { useId } from "react";

export function Curve({ x, y, label, centroid }: {
  x: number[];
  y: number[];
  label: string;
  centroid?: number;
}) {
  const gradientId = useId();
  const points = x.map((v, i) => (30 + v * 5.4) + "," + (170 - (y[i] || 0) * 140)).join(" ");
  const fillPoints = "30,170 " + points + " 570,170";

  const centroidX = centroid !== undefined ? 30 + Math.min(Math.max(centroid, 0), 100) * 5.4 : null;

  return (
    <svg
      className="curve"
      viewBox="0 0 600 215"
      role="img"
      aria-label={label}
      style={{ overflow: "visible", background: "#fbfdff", borderRadius: 8, padding: 8 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0051D5" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0051D5" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid Lines Horisontal */}
      <line x1="30" y1="100" x2="570" y2="100" stroke="#E5E9F5" strokeDasharray="3 3" />
      <line x1="30" y1="30" x2="570" y2="30" stroke="#E5E9F5" strokeDasharray="3 3" />

      {/* Sumbu X & Y */}
      <path d="M30 25V170H575" stroke="#74777F" strokeWidth="1.5" fill="none" />

      {/* Area Di Bawah Kurva Agregasi */}
      <polygon points={fillPoints} fill={`url(#${gradientId})`} />

      {/* Garis Kurva μ(z) */}
      <polyline
        points={points}
        fill="none"
        stroke="#0051D5"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Angka Sumbu X */}
      {[0, 20, 40, 60, 80, 100].map(n => (
        <g key={n}>
          <line x1={30 + n * 5.4} y1="170" x2={30 + n * 5.4} y2="175" stroke="#74777F" />
          <text
            x={30 + n * 5.4}
            y="190"
            textAnchor="middle"
            fontSize="11"
            fill="#525660"
          >
            {n}
          </text>
        </g>
      ))}

      {/* Label Nilai Sumbu Y */}
      <text x="16" y="34" fontSize="11" fill="#525660" textAnchor="end">1.0</text>
      <text x="16" y="104" fontSize="11" fill="#525660" textAnchor="end">0.5</text>
      <text x="16" y="174" fontSize="11" fill="#525660" textAnchor="end">0.0</text>

      {/* Label Sumbu Kategori */}
      <text x="5" y="16" fontSize="11" fill="#001835" fontWeight="bold">μ(z)</text>
      <text x="300" y="208" fontSize="11" fill="#525660" textAnchor="middle" fontWeight="600">
        z (Skor Kesesuaian 0–100)
      </text>

      {/* Penanda Titik Garis Centroid */}
      {centroidX !== null && centroid !== undefined && (
        <g>
          <line
            x1={centroidX}
            y1="30"
            x2={centroidX}
            y2="170"
            stroke="#A21C27"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <circle cx={centroidX} cy="170" r="4" fill="#A21C27" />
          <rect
            x={Math.min(Math.max(centroidX - 44, 30), 480)}
            y="6"
            width="88"
            height="20"
            rx="4"
            fill="#A21C27"
          />
          <text
            x={Math.min(Math.max(centroidX, 74), 524)}
            y="20"
            fill="white"
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
          >
            z* = {centroid.toFixed(2)}
          </text>
        </g>
      )}
    </svg>
  );
}
