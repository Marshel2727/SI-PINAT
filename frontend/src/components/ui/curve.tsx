"use client";

export function Curve({ x, y, label }: {
  x: number[];
  y: number[];
  label: string;
}) {
  const points = x.map((v, i) => (30 + v * 5.4) + "," + (170 - y[i] * 140)).join(" ");
  return (
    <svg
      className="curve"
      viewBox="0 0 600 205"
      role="img"
      aria-label={label}
    >
      <path d="M30 20V170H575" stroke="#74777F" fill="none" />
      <polyline
        points={points}
        fill="none"
        stroke="#0051D5"
        strokeWidth="3"
      />
      {[0, 20, 40, 60, 80, 100].map(n => <text
        key={n}
        x={30 + n * 5.4}
        y="192"
        textAnchor="middle"
        fontSize="12"
      >
        {n}
      </text>)}
      <text x="8" y="30" fontSize="12">1</text>
      <text x="10" y="174" fontSize="12">0</text>
    </svg>
  );
}
