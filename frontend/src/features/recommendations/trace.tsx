"use client";

import { Curve, ErrorNotice, Notice } from "@/components/ui";
import { names, number } from "@/lib/format";
import Link from "next/link";
import { MembershipInputs, RuleActivationTable } from "./trace-sections";
import { useFuzzyDetail } from "./use-fuzzy-detail";

export function FuzzyDetail() {
  const { assessment, code, setCode, trace, error } = useFuzzyDetail();
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link className="button secondary compact" href={"/asesmen/" + assessment.public_id + "/hasil"}>
          ← Kembali ke Hasil Rekomendasi
        </Link>
      </div>

      <section className="dark-card section">
        <span className="badge demo">TRANSPARANSI ALGORITMA PAKAR</span>
        <h1>Detail Perhitungan Fuzzy Logic Mamdani</h1>
        <p>
          Penelusuran jejak numerik matematis mencakup fuzzifikasi derajat keanggotaan, implikasi MIN, agregasi MAX, dan defuzzifikasi titik berat (centroid).
        </p>
        <small className="mono">
          {trace ? `Versi Model: ${trace.model_version} · Versi Mesin: ${trace.engine_version}` : "Memuat data jejak inferensi…"}
        </small>
      </section>

      <div className="tabs wrap">
        {Object.entries(names).map(([key, title]) => (
          <button
            key={key}
            className={code === key ? "" : "secondary"}
            onClick={() => setCode(key)}
          >
            {title} ({key})
          </button>
        ))}
      </div>

      <ErrorNotice error={error} />
      {!trace && !error && <Notice>Memuat jejak perhitungan matematis…</Notice>}

      {trace && (
        <>
          {/* Nilai Masukan & Derajat Keanggotaan */}
          <MembershipInputs trace={trace} />

          {/* Tabel Evaluasi Aturan Inferensi */}
          <article className="card section">
            <RuleActivationTable trace={trace} />
          </article>

          {/* Kurva Agregasi & Defuzzifikasi */}
          <article className="card section">
            <span className="eyebrow">DEFUZZIFIKASI CENTROID</span>
            <h2>Kurva Agregasi & Titik Berat Centroid ({names[code]})</h2>
            <p className="small muted">
              Garis merah putus-putus menunjukkan titik potong defuzzifikasi (Centroid z* = {number(Number(trace.score.suitability_score))}).
            </p>

            <Curve
              x={trace.aggregated_curve.z}
              y={trace.aggregated_curve.mu}
              label={"Kurva agregasi tersimpan " + names[code]}
              centroid={Number(trace.score.suitability_score)}
            />

            <div className="metrics" style={{ marginTop: 20 }}>
              {[
                ["Numerator ∫(z · μ(z))dz", trace.centroid_numerator],
                ["Denominator ∫μ(z)dz", trace.centroid_denominator],
                ["Langkah Sampling (dz)", trace.sampling_step],
                ["Hasil Skor Kesesuaian (z*)", trace.score.suitability_score]
              ].map(([label, value]) => (
                <div key={label}>
                  <small>{label}</small>
                  <strong className="mono" style={{ color: "var(--navy)" }}>
                    {number(Number(value), 4)}
                  </strong>
                </div>
              ))}
            </div>
            <p className="small muted" style={{ marginTop: 14 }}>
              Perhitungan defuzzifikasi menggunakan metode Centroid kontinu: z* = ∫(z · μ(z))dz / ∫μ(z)dz. Seluruh data dihitung dan dikunci secara deterministik saat asesmen diselesaikan.
            </p>
          </article>
        </>
      )}
    </>
  );
}
