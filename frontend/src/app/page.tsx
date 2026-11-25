import { StartAssessment } from "@/features/assessments/start";
import { ResumeAssessment } from "@/features/assessments/resume";
import { descriptions, icons, names, number } from "@/lib/format";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Beranda",
};

export default function Home() {
  return (
    <main id="main-content">
      <ResumeAssessment />
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="badge">
              <img
                src="/images/50188.svg"
                width="22"
                height="21"
                alt=""
              />
              SISTEM PENDUKUNG KEPUTUSAN • TEKNIK KOMPUTER UNM
            </span>
            <h1>Tentukan Peminatan Teknik Komputer Sesuai Potensimu</h1>
            <div className="actions">
              <StartAssessment label="Mulai Tentukan Peminatan" />
              <Link className="button white" href="/panduan">
                <img
                  src="/images/943f4.svg"
                  width="17"
                  height="22"
                  alt=""
                />
                Lihat Alur &amp; Panduan
              </Link>
            </div>
            <div className="metrics">
              {[
                ["3 Bidang", "Peminatan Keilmuan"],
                ["30 Soal", "Tes Kompetensi"],
                ["Smt 1–4", "Nilai Akademik Wajib"],
                ["Mamdani", "Inferensi Transparan"],
              ].map(([n, t]) => (
                <div key={t}>
                  <strong>{n}</strong>
                  <small>{t}</small>
                </div>
              ))}
            </div>
          </div>
          <article className="card example-card">
            <div className="spread">
              <strong>Ilustrasi Hasil Rekomendasi</strong>
              <small className="mono">Fuzzy Mamdani</small>
            </div>
            <div className="score-bars">
              {[
                ["Embedded System", 84.44],
                ["Sistem Cerdas", 60],
                ["Jaringan & Digital Forensik", 72.42],
              ].map(([label, n], i) => (
                <div key={label}>
                  <div className="spread">
                    <small>{label}</small>
                    <span className="mono">
                      Skor {number(Number(n))}
                    </span>
                  </div>
                  <div className="bar">
                    <div
                      style={{
                        width: n + "%",
                        background:
                          i === 0
                            ? "var(--primary)"
                            : i === 1
                              ? "var(--navy-secondary)"
                              : "var(--teal)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="notice">
              <small>REKOMENDASI TERATAS (ILUSTRASI)</small>
              <p className="mono">Embedded System · 84,44 dari 100</p>
            </div>
          </article>
        </div>
      </section>

      <section className="container section">
        <span className="eyebrow">TAKSONOMI KURIKULUM</span>
        <h2>Tiga Pilar Peminatan Keilmuan</h2>
        <div className="three-columns">
          {Object.entries(names).map(([code, name]) => (
            <article className="card specialization" key={code}>
              <span className="mono muted">{code}</span>
              <div className="title-icon">
                <span className="icon-box">
                  <img src={"/images/" + icons[code]} alt="" />
                </span>
                <h3>{name}</h3>
              </div>
              <p>{descriptions[code]}</p>
              <Link href="/tentang">Lihat cakupan &amp; metode →</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="container section">
        <div className="cta-band spread wrap">
          <div>
            <h2>Siap mengetahui peminatan yang paling sesuai?</h2>
          </div>
          <div className="actions">
            <StartAssessment triggerOnly label="Mulai Tentukan Peminatan" />
            <Link className="button secondary" href="/panduan">
              Pelajari Panduan Dulu
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
