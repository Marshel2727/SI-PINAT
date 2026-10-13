"use client";

import { Curve, ErrorNotice, Notice, ScoreBars } from "@/components/ui";
import { names, number, time } from "@/lib/format";
import Link from "next/link";
import { useAdminAssessment } from "./use-admin-assessment";

export function AdminAssessment({ id }: {
  id: string;
}) {
  const { value, trace, setTrace, code, setCode, error } = useAdminAssessment({ id });
  return (
    <>
      <Link href="/admin">← Dashboard</Link>
      <h1>Detail Asesmen</h1>
      <ErrorNotice error={error} />
      {!value && !error && <Notice>Memuat asesmen…</Notice>}
      {value && (
        <>
          <article className="card">
            <span className="badge">
              {value.assessment.mode} · {value.assessment.status}
            </span>
            <h2>
              {value.assessment.student?.full_name || "Peserta DEMO"}
            </h2>
            <p className="mono">
              {id}
            </p>
            <p>
              NIM: {value.assessment.student?.nim || "\u2014"} · Model{" "}
              {value.assessment.model_version}
            </p>
            <p>Selesai: {time(value.assessment.completed_at)}</p>
          </article>
          <article className="card section">
            <h2>Nilai akademik tersimpan</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Mata kuliah</th>
                    <th>SKS</th>
                    <th>Nilai</th>
                    <th>Normalisasi</th>
                  </tr>
                </thead>
                <tbody>
                  {value.grades.map(g => (
                    <tr key={g.id}>
                      <td>
                        {g.course_snapshot.code}
                      </td>
                      <td>
                        {g.course_snapshot.name}
                      </td>
                      <td>
                        {g.credits_snapshot}
                      </td>
                      <td>
                        {g.letter_grade}
                      </td>
                      <td>
                        {number(g.normalized_score)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
          {value.result ? (
            <>
              <article className="card">
                <h2>Hasil tersimpan</h2>
                <ScoreBars scores={value.result.scores} />
                <p>
                  {value.result.answer_sources.USER} USER ·{" "}
                  {value.result.answer_sources.EXAMPLE} EXAMPLE
                </p>
              </article>
              <article className="card section">
                <h2>Jejak perhitungan</h2>
                <div className="tabs wrap">
                  {Object.entries(names).map(([key, name]) => (
                    <button
                      className={key === code ? "" : "secondary"}
                      key={key}
                      onClick={() => {
                        setCode(key);
                        setTrace(null);
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                {trace && (
                  <>
                    <Curve
                      x={trace.aggregated_curve.z}
                      y={trace.aggregated_curve.mu}
                      label="Kurva hasil asesmen tersimpan"
                    />
                    <p>
                      Numerator {number(trace.centroid_numerator, 5)} /
                      denominator {number(trace.centroid_denominator, 5)} ={" "}
                      {number(trace.score.suitability_score, 5)}
                    </p>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Aturan</th>
                            <th>Alpha</th>
                            <th>Konsekuen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trace.rule_activations.map(r => (
                            <tr key={r.rule_id}>
                              <td>
                                {r.rule_code}
                              </td>
                              <td>
                                {number(r.alpha, 5)}
                              </td>
                              <td>
                                {r.output_set}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </article>
            </>
          ) : (
            <Notice>Asesmen ini belum memiliki hasil.</Notice>
          )}
        </>
      )}
    </>
  );
}
