"use client";

import { Curve, ErrorNotice, Notice } from "@/components/ui";
import { names, number } from "@/lib/format";
import Link from "next/link";
import { useFuzzyDetail } from "./use-fuzzy-detail";

export function FuzzyDetail() {
  const { assessment, code, setCode, trace, error } = useFuzzyDetail();
  return (
    <>
      <Link className="button secondary" href={"/asesmen/" + assessment.public_id + "/hasil"}>← Kembali ke hasil rekomendasi</Link>
      <section className="dark-card section">
        <span className="badge demo">TRANSPARANSI PERHITUNGAN</span>
        <h1>Detail Perhitungan Fuzzy Logic Mamdani</h1>
        <p>Fuzzifikasi, implikasi MIN, agregasi MAX, dan defuzzifikasi centroid dari jejak yang tersimpan.</p>
        <small>
          {trace ? "Model " + trace.model_version + " \u00B7 Engine " + trace.engine_version : "Memuat versi hasil\u2026"}
        </small>
      </section>
      <div className="tabs wrap">
        {Object.entries(names).map(([key, title]) => <button key={key} className={code === key ? "" : "secondary"} onClick={() => setCode(key)}>
          {title}
        </button>)}
      </div>
      <ErrorNotice error={error} />
      {!trace && !error && <Notice>Memuat jejak perhitungan…</Notice>}
      {trace && <>
        <div className="two-columns section">
          {[["ACADEMIC", "Nilai Akademik Terkait"], ["COMPETENCY", "Skor Tes Kompetensi"]].map(([key, title]) => <article className="card" key={key}>
            <h2>
              {title}
            </h2>
            <strong className="big-number">
              {number(trace.memberships[key].crisp)}
            </strong>
            <div className="actions">
              {Object.entries(trace.memberships[key].degrees).map(([set, degree]) => <span className="badge mono" key={set}>{set}: {number(Number(degree), 4)}</span>)}
            </div>
          </article>)}
        </div>
        <article className="card section">
          <h2>Aktivasi seluruh aturan</h2>
          <p>α = min(aktivasi anteseden, bobot aturan). AND memakai MIN, OR memakai MAX.</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Aturan</th>
                  <th>Akademik</th>
                  <th>Kompetensi</th>
                  <th>Operator</th>
                  <th>Bobot</th>
                  <th>α</th>
                  <th>Konsekuen</th>
                </tr>
              </thead>
              <tbody>
                {trace.rule_activations.map((r) => <tr key={r.rule_id}>
                  <td className="mono">
                    {r.rule_code}
                  </td>
                  <td>{r.academic_set} ({number(r.academic_degree, 3)})</td>
                  <td>{r.competency_set} ({number(r.competency_degree, 3)})</td>
                  <td>
                    {r.operator}
                  </td>
                  <td>
                    {number(r.rule_weight, 3)}
                  </td>
                  <td>
                    {number(r.alpha, 3)}
                  </td>
                  <td>
                    {r.output_set}
                  </td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </article>
        <article className="card section">
          <h2>Agregasi output dan centroid</h2>
          <Curve
            x={trace.aggregated_curve.z}
            y={trace.aggregated_curve.mu}
            label={"Kurva agregasi tersimpan " + names[code]}
          />
          <div className="metrics">
            {[
              ["Numerator", trace.centroid_numerator], ["Denominator", trace.centroid_denominator], ["Sampling step", trace.sampling_step], ["Centroid", trace.score.suitability_score]
            ].map(([label, value]) => <div key={label}>
              <small>
                {label}
              </small>
              <strong className="mono">
                {number(Number(value), 5)}
              </strong>
            </div>)}
          </div>
          <p>Centroid = integral(z × μ(z)) / integral(μ(z)). Nilai halaman ini dibaca dari trace sesi, sehingga tetap mengikuti versi saat asesmen selesai.</p>
        </article>
      </>}
    </>
  );
}
