"use client";

import { membershipAt, validMembershipShape, type MembershipShape } from "@/lib/fuzzy-curve";
import { number } from "@/lib/format";

const colors: Record<string, string> = { LOW: "#0051d5", MEDIUM: "#18786d", HIGH: "#9c4620" };

export function MembershipPlot({ sets, crisp, degrees, label }: {
  sets: MembershipShape[];
  crisp?: number;
  degrees?: Record<string, number>;
  label: string;
}) {
  if (!sets.length || !sets.every(validMembershipShape)) {
    return <p className="small muted">Lengkapi titik keanggotaan secara berurutan untuk melihat pratinjau.</p>;
  }
  const markers = sets.flatMap(set => [set.point_a, set.point_b, set.point_c, ...(set.point_d === null ? [] : [set.point_d])]);
  const x = [...new Set([...Array.from({ length: 101 }, (_, index) => index), ...markers])].sort((a, b) => a - b);
  const position = crisp !== undefined && Number.isFinite(crisp) ? Math.max(0, Math.min(100, crisp)) : null;
  return (
    <figure className="membership-plot">
      <figcaption className="small">{label}</figcaption>
      <svg className="curve" viewBox="0 0 600 210" role="img" aria-label={label + (position === null ? "" : `, nilai crisp ${number(position)}`)}>
        <path d="M35 25V170H575" fill="none" stroke="#74777f" />
        {[0.5, 1].map(value => <line key={value} x1="35" x2="575" y1={170 - value * 140} y2={170 - value * 140} stroke="#dae2fd" strokeDasharray="3 3" />)}
        {sets.map(set => <polyline key={set.code} points={x.map(value => `${35 + value * 5.4},${170 - membershipAt(value, set) * 140}`).join(" ")} fill="none" stroke={colors[set.code] || "#142d4e"} strokeWidth="2.5" />)}
        {[0, 20, 40, 60, 80, 100].map(value => <text key={value} x={35 + value * 5.4} y="190" textAnchor="middle" fontSize="12" fill="#44474e">{value}</text>)}
        <text x="22" y="34" textAnchor="end" fontSize="12">1</text>
        <text x="22" y="174" textAnchor="end" fontSize="12">0</text>
        {position !== null && <g>
          <line x1={35 + position * 5.4} x2={35 + position * 5.4} y1="25" y2="170" stroke="#a21c27" strokeWidth="2" strokeDasharray="4 3" />
          {sets.map(set => <circle key={set.code} cx={35 + position * 5.4} cy={170 - membershipAt(position, set) * 140} r="4" fill={colors[set.code] || "#142d4e"} />)}
        </g>}
      </svg>
      <div className="actions small" aria-label="Legenda keanggotaan">
        {sets.map(set => <span key={set.code} style={{ color: colors[set.code] }}>
          <strong>{set.code}</strong>{degrees?.[set.code] !== undefined ? `: μ = ${number(degrees[set.code], 4)}` : ""}
        </span>)}
        {position !== null && <span>Nilai crisp: <strong>{number(position)}</strong></span>}
      </div>
    </figure>
  );
}
