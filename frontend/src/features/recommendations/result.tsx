"use client";

import { ErrorNotice, Notice, ScoreBars } from "@/components/ui";
import { IconSparkles } from "@/components/icons";
import { names, number, time } from "@/lib/format";
import { contributingRuleCodes, explainScore } from "@/lib/score-explanation";
import Link from "next/link";
import { useRecommendation } from "./use-recommendation";

export function Recommendation() {
  const { assessment, result, error, downloadingPdf, pdfError, downloadPdf } = useRecommendation();

  if (!result)
    return (
      <>
        <ErrorNotice error={error} />
        {!error && <Notice>Memuat hasil perhitungan inferensi tersimpan…</Notice>}
      </>
    );

  const best = result.scores.filter(s => s.rank_position === 1);
  const student = result.student ?? assessment.student;
  const currentSemester = result.current_semester ?? assessment.current_semester;

  return (
    <>
      <div className="notice" style={{ background: "#f8faff", border: "1px solid var(--border)", margin: "0 0 20px" }}>
        <div className="spread wrap">
          <div>
            <span className="eyebrow" style={{ marginBottom: 4 }}>IDENTITAS PESERTA &amp; SUMBER JAWABAN</span>
            <strong>{student ? student.full_name : "Peserta Asesmen"}</strong>
            <p className="small muted" style={{ margin: "2px 0 0" }}>
              {student
                ? `NIM: ${student.nim || "—"}${student.class_name ? ` · Kelas: ${student.class_name}` : ""} · Semester ${currentSemester}`
                : `Semester ${currentSemester}`}
            </p>
          </div>
          <div className="small">
            <div>
              Sumber jawaban tes: <strong>{result.answer_sources.USER} soal terjawab</strong>
            </div>
            <div className="muted">Model {result.model_version} · Selesai {time(result.completed_at)}</div>
          </div>
        </div>
      </div>

      <div className="two-columns">
        {/* Kartu Utama Hasil Rekomendasi */}
        <article className="card recommendation-card">
          <div className="spread">
            <span className="badge" style={{ background: "#e2edff", color: "var(--primary)" }}>
              <IconSparkles size={14} style={{ marginRight: 4 }} />
              HASIL REKOMENDASI PEMINATAN
            </span>
            <span className="badge accent">METODE FUZZY MAMDANI</span>
          </div>

          <div className="recommendation-title">
            <div>
              <span className="eyebrow">
                {result.has_tie ? "HASIL PERINGKAT TERATAS (SERI)" : "PEMINATAN YANG PALING SESUAI"}
              </span>
              <h1>
                {best.map(s => s.specialization_name).join(" & ")}
              </h1>
            </div>
            <div className="score-tile">
              <small>SKOR KESESUAIAN</small>
              <strong>
                {number(best[0].suitability_score)}
                <small>/100</small>
              </strong>
              <small style={{ opacity: 0.85, fontSize: "11px" }}>Metode Centroid</small>
            </div>
          </div>

          {result.has_tie && (
            <Notice tone="info">
              Hasil seri terdeteksi: Peminatan di atas memiliki nilai centroid yang sama pada peringkat 1.
            </Notice>
          )}

          {best.map(s => (
            <div
              key={s.specialization_code}
              className="notice"
              style={{ background: "#f8faff", border: "1px solid #dce8fc", margin: "14px 0" }}
            >
              <strong style={{ color: "var(--navy)" }}>Alasan Rekomendasi ({s.specialization_name}):</strong>
              <p style={{ margin: "6px 0 0", color: "var(--text-secondary)" }}>
                {explainScore(s)}
              </p>
              <div className="actions small no-print" style={{ marginTop: 8 }}>
                {contributingRuleCodes(s.reason).map(rule => (
                  <Link
                    className="badge"
                    key={rule}
                    href={`/asesmen/${assessment.public_id}/detail-fuzzy?specialization_code=${encodeURIComponent(s.specialization_code)}#rule-${encodeURIComponent(rule)}`}
                  >
                    Aturan {rule} →
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <div className="no-print" style={{ marginTop: 20 }}>
            <Link
              className="button"
              href={`/asesmen/${assessment.public_id}/detail-fuzzy?specialization_code=${encodeURIComponent(best[0].specialization_code)}`}
            >
              Telusuri Rincian Perhitungan Fuzzy →
            </Link>
          </div>
        </article>

        {/* Kartu Perbandingan Skor Semua Peminatan */}
        <article className="card">
          <span className="eyebrow">DISTRIBUSI SKOR</span>
          <h2>Perbandingan Tiga Bidang Peminatan</h2>
          <ScoreBars scores={result.scores} />
        </article>

        {/* Perbandingan Pilihan Awal Mahasiswa vs Hasil Sistem */}
        <article className="card">
          <span className="eyebrow">ANALISIS PREFERENSI AWAL</span>
          <h2>Pilihan Minat Awal vs Hasil Inferensi</h2>
          <p>
            Preferensi yang Kamu Pilih:{" "}
            <strong>
              {names[result.preferred_specialization_code ?? ""] || "Belum ditentukan"}
            </strong>
          </p>
          {result.preference_comparison && (
            <Notice tone={result.preference_comparison.matches_top ? "success" : "info"}>
              <strong>
                {result.preference_comparison.matches_top
                  ? "✓ Selaras dengan Rekomendasi Sistem"
                  : "ℹ Terdapat Perbedaan dengan Rekomendasi Tertinggi"}
              </strong>
              <p style={{ margin: "4px 0 0" }}>
                {result.preference_comparison.matches_top
                  ? "Minat awalmu berada pada kelompok peminatan dengan skor kesesuaian teratas."
                  : `Minat awalmu berbeda dengan hasil teratas (selisih ${number(result.preference_comparison.gap_to_top)} poin terhadap peringkat 1).`}
              </p>
            </Notice>
          )}
        </article>

        {/* Panduan Tindak Lanjut Mahasiswa */}
        <article className="card">
          <span className="eyebrow">PANDUAN AKADEMIK</span>
          <h2>Langkah Selanjutnya untuk Mahasiswa</h2>
          <ul style={{ paddingLeft: 20, margin: "10px 0 18px", color: "var(--text-secondary)", fontSize: "13px", lineHeight: 1.7 }}>
            <li><strong>Konsultasi Dosen PA:</strong> Unduh PDF hasil ini untuk didiskusikan saat pengisian KRS.</li>
            <li><strong>Perencanaan KRS:</strong> Prioritaskan mata kuliah peminatan pilihan pada semester berikutnya.</li>
            <li><strong>Portofolio:</strong> Ikuti proyek praktikum atau sertifikasi sesuai peminatan yang disarankan.</li>
          </ul>

          <div className="no-print">
            <p className="small muted" style={{ marginBottom: 12 }}>
              Tes kompetensi dikerjakan 1 kali per akun, dan nilai akademik tetap dapat diperbarui untuk menghitung ulang rekomendasi.
            </p>
            <ErrorNotice error={pdfError} />
            <div className="actions">
              <button type="button" disabled={downloadingPdf} onClick={downloadPdf}>
                {downloadingPdf ? "Menyiapkan PDF…" : "Unduh Laporan PDF"}
              </button>
              <button type="button" className="secondary" onClick={() => window.print()}>
                Cetak Ringkasan
              </button>
              <Link className="button secondary" href={`/asesmen/${assessment.public_id}/nilai`}>
                Edit Nilai Akademik
              </Link>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}
