"use client";

import { ErrorNotice, Notice, ScoreBars } from "@/components/ui";
import { IconSparkles, IconInfo } from "@/components/icons";
import { names, number, time } from "@/lib/format";
import { contributingRuleCodes, explainScore } from "@/lib/score-explanation";
import Link from "next/link";
import { useRecommendation } from "./use-recommendation";

export function Recommendation() {
  const { assessment, base, result, error } = useRecommendation();

  if (!result)
    return (
      <>
        <ErrorNotice error={error} />
        {!error && <Notice>Memuat hasil perhitungan inferensi tersimpan…</Notice>}
      </>
    );

  const best = result.scores.filter(s => s.rank_position === 1);

  return (
    <>
      <div className="two-columns">
        {/* Kartu Utama Hasil Rekomendasi */}
        <article className="card recommendation-card">
          <div className="spread">
            <span className="badge" style={{ background: "#e2edff", color: "var(--primary)" }}>
              <IconSparkles size={14} style={{ marginRight: 4 }} />
              HASIL REKOMENDASI PEMINATAN
            </span>
            <span className="badge demo">
              {result.mode === "DEMO" ? "SIMULASI DEMO" : "ASESMEN FULL"}
            </span>
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
              <div className="actions small" style={{ marginTop: 8 }}>
                {contributingRuleCodes(s.reason).map(rule => <Link className="badge" key={rule}
                  href={`/asesmen/${assessment.public_id}/detail-fuzzy?specialization_code=${encodeURIComponent(s.specialization_code)}#rule-${encodeURIComponent(rule)}`}>
                  Aturan {rule} →
                </Link>)}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 20 }}>
            <Link className="button" href={"/asesmen/" + assessment.public_id + "/detail-fuzzy"}>
              Telusuri Detail Perhitungan Fuzzy Mamdani →
            </Link>
          </div>
        </article>

        {/* Kartu Perbandingan Skor Semua Peminatan */}
        <article className="card">
          <span className="eyebrow">DISTRIBUSI SKOR</span>
          <h2>Perbandingan Tiga Bidang Peminatan</h2>
          <p className="small muted">
            Nilai akademik dan hasil tes kompetensi diolah melalui aturan pada versi model fuzzy sesi ini.
          </p>
          <ScoreBars scores={result.scores} />
          <p className="small muted" style={{ marginTop: 12 }}>
            Skala 0–100 · Peringkat menggunakan standar competition ranking (1224) dengan presisi 5 desimal.
          </p>
        </article>

        {/* Perbandingan Pilihan Awal Mahasiswa vs Hasil Sistem */}
        <article className="card">
          <span className="eyebrow">ANALISIS PREFERENSI AWAL</span>
          <h2>Pilihan Minat Awal vs Hasil Inferensi</h2>
          <p>
            Preferensi yang Kamu Pilih: <strong>
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
            <li><strong>Konsultasi Dosen PA:</strong> Unduh ringkasan PDF hasil rekomendasi ini dan diskusikan bersama Dosen Pembimbing Akademik saat pengisian KRS.</li>
            <li><strong>Perencanaan KRS:</strong> Prioritaskan mata kuliah peminatan pilihan pada semester berikutnya untuk memperdalam kompetensi.</li>
            <li><strong>Pengembangan Portofolio:</strong> Ikuti proyek praktikum atau sertifikasi kompetensi terkait peminatan yang disarankan.</li>
          </ul>

          <div className="actions">
            <a className="button" href={"/api/v1" + base + "/result/report.pdf"}>
              Unduh Ringkasan PDF
            </a>
            <button className="secondary" onClick={() => window.print()}>
              Cetak Dokumen
            </button>
            <Link className="button secondary" href="/?mulai=baru">
              Mulai Asesmen Baru
            </Link>
          </div>

          <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <p className="small muted" style={{ margin: 0 }}>
              Sesi: Mode {result.mode} · Model {result.model_version} · Engine {result.engine_version} · {time(result.completed_at)}
            </p>
          </div>
        </article>
      </div>
    </>
  );
}
