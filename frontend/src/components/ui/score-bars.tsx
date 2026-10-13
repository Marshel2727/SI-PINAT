"use client";

import { number } from "@/lib/format";
import type { Score } from "@/types/api";

export function ScoreBars({ scores }: {
  scores: Score[];
}) {
  return (
    <div className="score-bars">
      {scores.map((score, i) => <div key={score.specialization_code}>
        <div className="spread">
          <strong>
            {score.specialization_name}
          </strong>
          <span className="mono">#{score.rank_position} · {number(score.suitability_score)}</span>
        </div>
        <div className="bar">
          <div
            style={{
              width: score.suitability_score + "%", background: i === 0 ? "var(--primary)" : i === 1 ? "var(--navy-secondary)" : "var(--teal)"
            }}
          />
        </div>
      </div>)}
    </div>
  );
}
