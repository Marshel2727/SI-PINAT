"use client";

import { number } from "@/lib/format";
import type { Score } from "@/types/api";

const specColors: Record<string, string> = {
  "ES-01": "var(--primary)",
  "SC-02": "var(--navy-secondary)",
  "JDF-03": "var(--teal)"
};

export function ScoreBars({ scores }: {
  scores: Score[];
}) {
  return (
    <div className="score-bars">
      {scores.map((score, i) => {
        const barColor = specColors[score.specialization_code] ||
          (i === 0 ? "var(--primary)" : i === 1 ? "var(--navy-secondary)" : "var(--teal)");

        return (
          <div key={score.specialization_code}>
            <div className="spread" style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: barColor
                  }}
                  aria-hidden="true"
                />
                <strong>{score.specialization_name}</strong>
              </div>
              <span className="mono">
                <span className="badge" style={{ padding: "1px 6px", fontSize: "11px", marginRight: 6 }}>
                  Rank #{score.rank_position}
                </span>
                <strong>{number(score.suitability_score)}</strong>
                <small className="muted">/100</small>
              </span>
            </div>
            <div className="bar" style={{ height: "10px" }}>
              <div
                style={{
                  width: Math.min(Math.max(score.suitability_score, 0), 100) + "%",
                  background: barColor,
                  borderRadius: "inherit"
                }}
              />
            </div>
            <p className="small muted" style={{ margin: "8px 0 0" }}>
              Nilai Akademik: <strong>{number(score.academic_score)}</strong> · Tes Kompetensi: <strong>{number(score.competency_score)}</strong>
            </p>
          </div>
        );
      })}
    </div>
  );
}
