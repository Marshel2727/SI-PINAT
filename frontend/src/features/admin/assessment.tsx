"use client";

import { Curve, ErrorNotice, Notice, ScoreBars, StatusBadge, statusLabel } from "@/components/ui";
import { names, number, time } from "@/lib/format";
import type { SpecializationCode } from "@/types/api";
import Link from "next/link";
import { MembershipInputs, RuleActivationTable } from "@/features/recommendations/trace-sections";
import { useAdminAssessment } from "./use-admin-assessment";

export function AdminAssessment({ id }: {
  id: string;
}) {
  const { value, trace, code, setCode, loading, traceLoading, error } = useAdminAssessment({ id });
  const preferredCode = value?.result?.preferred_specialization_code ?? value?.assessment.preferred_specialization_code;
  const preferredLabel = preferredCode ? `${names[preferredCode] || preferredCode} (${preferredCode})` : "Tidak dipilih";

  return (
    <>
      <Link href="/admin">← Dashboard</Link>
      <h1>Detail Asesmen</h1>
      <ErrorNotice error={error} />
      {loading && !value && !error && <Notice>Memuat asesmen…</Notice>}
      {value && (
        <>
          <article className="card">
            <StatusBadge status={value.assessment.status}>
              {value.assessment.mode === "FULL" ? "Resmi" : "Simulasi"} · {statusLabel(value.assessment.status)}
            </StatusBadge>
            <h2 style={{ marginTop: 10 }}>
              {value.assessment.student?.full_name || "Peserta Asesmen"}
            </h2>
            <p className="mono muted">
              {id}
            </p>
            <div className="metrics">
              <div>
                <small className="muted">NIM</small>
                <strong className="mono">{value.assessment.student?.nim || "\u2014"}</strong>
              </div>
              <div>
                <small className="muted">Kelas</small>
                <strong>{value.assessment.student?.class_name || "\u2014"}</strong>
              </div>
              <div>
                <small className="muted">Semester aktif</small>
                <strong>Semester {value.assessment.current_semester}</strong>
              </div>
              <div>
                <small className="muted">Progres tes</small>
                <strong>
                  {value.assessment.progress.answered}/{value.assessment.progress.total} soal
                </strong>
              </div>
            </div>
            <p style={{ marginTop: 16, marginBottom: 6 }}>
              Model: <strong>{value.assessment.model_version}</strong> · Preferensi awal:{" "}
              <strong>{preferredLabel}</strong>
            </p>
            <p className="small muted" style={{ marginBottom: 0 }}>
              Selesai: {time(value.assessment.completed_at)} · Jawaban mandiri: {value.assessment.progress.user}
              {value.assessment.progress.example > 0 ? ` · ${value.assessment.progress.example} contoh` : ""}
            </p>
          </article>

          <article className="card section">
            <h2>Nilai akademik tersimpan</h2>
            {!value.grades.length ? (
              <Notice>
                Belum ada nilai akademik tersimpan untuk asesmen ini (status saat ini: {statusLabel(value.assessment.status)}).
              </Notice>
            ) : (
              <div className="table-scroll" role="region" tabIndex={0} aria-label="Tabel nilai akademik peserta">
                <table>
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Mata kuliah</th>
                      <th>Semester</th>
                      <th>SKS</th>
                      <th>Nilai</th>
                      <th>Normalisasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {value.grades.map(g => (
                      <tr key={g.id ?? g.course_id}>
                        <td className="mono">
                          {g.course_snapshot.code}
                        </td>
                        <td>
                          {g.course_snapshot.name}
                        </td>
                        <td>
                          Semester {g.course_snapshot.semester}
                        </td>
                        <td>
                          {g.credits_snapshot}
                        </td>
                        <td>
                          <span className="badge mono">{g.letter_grade}</span>
                        </td>
                        <td>
                          {number(g.normalized_score)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          {value.result ? (
            <>
              <article className="card">
                <h2>Hasil tersimpan</h2>
                <ScoreBars scores={value.result.scores} />
                <p className="small" style={{ marginTop: 12 }}>
                  Sumber jawaban: <strong>{value.result.answer_sources.USER}</strong> jawaban mandiri
                  {value.result.answer_sources.EXAMPLE > 0 ? (
                    <> · <strong>{value.result.answer_sources.EXAMPLE}</strong> jawaban contoh</>
                  ) : null}
                </p>
                {value.result.preferred_specialization_code && value.result.preference_comparison && (
                  <Notice tone={value.result.preference_comparison.matches_top ? "success" : "info"}>
                    <strong>Pembanding Preferensi Awal ({preferredLabel}):</strong>{" "}
                    {value.result.preference_comparison.matches_top
                      ? "Sesuai dengan rekomendasi peringkat teratas (#1)."
                      : `Berada di bawah rekomendasi teratas dengan selisih ${number(value.result.preference_comparison.gap_to_top)} poin.`}
                  </Notice>
                )}
              </article>
              <article className="card section">
                <div className="spread wrap">
                  <h2>Jejak perhitungan</h2>
                  {traceLoading && <span className="small muted">Memuat jejak perhitungan…</span>}
                </div>
                <div className="tablist-scroll" role="tablist" aria-label="Jejak perhitungan per peminatan">
                  {Object.entries(names).map(([key, name]) => {
                    const isTop = value.result?.top_specialization_codes?.includes(key as SpecializationCode);
                    const selected = key === code;
                    return (
                      <button
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        className={selected ? "" : "secondary"}
                        key={key}
                        onClick={() => {
                          if (key === code) return;
                          setCode(key);
                        }}
                      >
                        {name}{isTop ? " ★" : ""}
                      </button>
                    );
                  })}
                </div>
                {!trace && <Notice>Memuat jejak perhitungan…</Notice>}
                {trace && (
                  <>
                    <MembershipInputs trace={trace} />
                    <RuleActivationTable trace={trace} />
                    <h3 style={{ marginTop: 24 }}>Kurva agregasi &amp; centroid</h3>
                    <Curve
                      x={trace.aggregated_curve.z}
                      y={trace.aggregated_curve.mu}
                      label="Kurva hasil asesmen tersimpan"
                      centroid={Number(trace.score.suitability_score)}
                    />
                    <p>
                      Numerator {number(trace.centroid_numerator, 5)} /
                      denominator {number(trace.centroid_denominator, 5)} ={" "}
                      <strong>{number(trace.score.suitability_score, 5)}</strong>
                    </p>
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
