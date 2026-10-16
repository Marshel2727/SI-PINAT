"use client";

import { MembershipPlot } from "@/components/ui";
import { number } from "@/lib/format";
import type { FuzzyTrace } from "@/types/api";

const inputs = [
  ["ACADEMIC", "Nilai Akademik Prasyarat (X1)"],
  ["COMPETENCY", "Skor Tes Kompetensi (X2)"]
] as const;

/** Kartu masukan crisp X1/X2 beserta derajat keanggotaan dan kurvanya. */
export function MembershipInputs({ trace }: { trace: FuzzyTrace; }) {
  return (
    <div className="two-columns section">
      {inputs.map(([key, title]) => {
        const membership = trace.memberships[key];
        if (!membership) return null;
        return (
          <article className="card" key={key}>
            <span className="eyebrow">MASUKAN CRISP &amp; FUZZIFIKASI</span>
            <h2>{title}</h2>
            <strong className="big-number" style={{ color: "var(--primary)" }}>
              {number(membership.crisp)}
            </strong>
            <p className="small muted">Derajat Keanggotaan Himpunan Fuzzy (μ):</p>
            <div className="actions">
              {Object.entries(membership.degrees).map(([set, degree]) => {
                const value = Number(degree);
                return (
                  <span
                    className="badge mono"
                    key={set}
                    style={{
                      background: value > 0 ? "var(--soft)" : "#f0f1f5",
                      fontWeight: value > 0 ? 700 : 400,
                      border: value > 0 ? "1px solid var(--border)" : "none"
                    }}
                  >
                    μ({set}): {number(value, 4)}
                  </span>
                );
              })}
            </div>
            {trace.input_sets?.[key] && (
              <MembershipPlot sets={trace.input_sets[key]} crisp={membership.crisp}
                degrees={membership.degrees} label={"Fungsi keanggotaan " + title} />
            )}
          </article>
        );
      })}
    </div>
  );
}

/** Tabel aktivasi aturan IF-THEN dengan penanda aturan aktif (α > 0). */
export function RuleActivationTable({ trace }: { trace: FuzzyTrace; }) {
  const activeCount = trace.rule_activations.filter(r => r.alpha > 0).length;
  return (
    <>
      <div className="spread wrap" style={{ marginBottom: 12 }}>
        <div>
          <h2>Aktivasi Seluruh Aturan Inferensi (IF-THEN)</h2>
          <p className="small muted" style={{ margin: "2px 0 0" }}>
            Formula: α = min(anteseden, bobot). Baris yang memiliki nilai α &gt; 0 diberi tanda aktif.
          </p>
        </div>
        <span className="badge">
          {activeCount} dari {trace.rule_activations.length} Aturan Aktif
        </span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Aturan</th>
              <th>Himpunan Akademik</th>
              <th>Himpunan Kompetensi</th>
              <th>Operator</th>
              <th>Bobot Aturan</th>
              <th>Nilai Potong (α)</th>
              <th>Konsekuen (Output)</th>
            </tr>
          </thead>
          <tbody>
            {trace.rule_activations.map(r => {
              const isActive = r.alpha > 0;
              return (
                <tr key={r.rule_id} id={"rule-" + r.rule_code} className={isActive ? "rule-active-row" : ""}>
                  <td className="mono">
                    <strong>{r.rule_code}</strong>
                    {isActive && <span className="badge-active">AKTIF</span>}
                  </td>
                  <td>{r.academic_set} ({number(r.academic_degree, 3)})</td>
                  <td>{r.competency_set} ({number(r.competency_degree, 3)})</td>
                  <td><span className="badge">{r.operator}</span></td>
                  <td className="mono">{number(r.rule_weight, 2)}</td>
                  <td className="mono">
                    <strong style={{ color: isActive ? "var(--primary)" : "inherit" }}>
                      {number(r.alpha, 4)}
                    </strong>
                  </td>
                  <td><strong>{r.output_set}</strong></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
