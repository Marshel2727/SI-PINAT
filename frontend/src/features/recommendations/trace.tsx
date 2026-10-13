"use client";

import { Curve, ErrorNotice, MembershipPlot, Notice } from "@/components/ui";
import { names, number } from "@/lib/format";
import Link from "next/link";
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
          <div className="two-columns section">
            {[["ACADEMIC", "Nilai Akademik Prasyarat (X1)"], ["COMPETENCY", "Skor Tes Kompetensi (X2)"]].map(([key, title]) => (
              <article className="card" key={key}>
                <span className="eyebrow">MASUKAN CRISP & FUZZIFIKASI</span>
                <h2>{title}</h2>
                <strong className="big-number" style={{ color: "var(--primary)" }}>
                  {number(trace.memberships[key].crisp)}
                </strong>
                <p className="small muted">Derajat Keanggotaan Himpunan Fuzzy (μ):</p>
                <div className="actions">
                  {Object.entries(trace.memberships[key].degrees).map(([set, degree]) => {
                    const numDegree = Number(degree);
                    return (
                      <span
                        className="badge mono"
                        key={set}
                        style={{
                          background: numDegree > 0 ? "var(--soft)" : "#f0f1f5",
                          fontWeight: numDegree > 0 ? 700 : 400,
                          border: numDegree > 0 ? "1px solid var(--border)" : "none"
                        }}
                      >
                        μ({set}): {number(numDegree, 4)}
                      </span>
                    );
                  })}
                </div>
                {trace.input_sets?.[key] && (
                  <MembershipPlot sets={trace.input_sets[key]} crisp={trace.memberships[key].crisp}
                    degrees={trace.memberships[key].degrees} label={"Fungsi keanggotaan " + title} />
                )}
              </article>
            ))}
          </div>

          {/* Tabel Evaluasi Aturan Inferensi */}
          <article className="card section">
            <div className="spread wrap" style={{ marginBottom: 12 }}>
              <div>
                <h2>Aktivasi Seluruh Aturan Inferensi (IF-THEN)</h2>
                <p className="small muted" style={{ margin: "2px 0 0" }}>
                  Formula: α = min(anteseden, bobot). Baris yang memiliki nilai α &gt; 0 diberi tanda aktif.
                </p>
              </div>
              <span className="badge">
                {trace.rule_activations.filter(r => r.alpha > 0).length} dari {trace.rule_activations.length} Aturan Aktif
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
                  {trace.rule_activations.map((r) => {
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
