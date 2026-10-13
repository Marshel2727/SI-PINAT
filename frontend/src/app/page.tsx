import { StartAssessment } from "@/features/assessments/start";
import { descriptions, icons, names } from "@/lib/format";
import Link from "next/link";

export default function Home() {
  return (
    <main>
      <section className="hero" data-node-id="53:171">
        <div className="container hero-grid">
          <div>
            <span className="badge"><img
              src="/images/50188.svg"
              width="22"
              height="21"
              alt=""
            />SISTEM PENDUKUNG KEPUTUSAN • FT UNM</span>
            <h1>Temukan Jalur Peminatan yang Sesuai dengan Potensimu</h1>
            <p className="lead">Kenali peminatan yang sesuai melalui nilai akademik dan tes kompetensi. Pilihan awalmu digunakan sebagai pembanding hasil.</p>
            <div className="actions">
              <StartAssessment />
              <Link className="button white" href="/panduan"><img
                src="/images/943f4.svg"
                width="17"
                height="22"
                alt=""
              />Cara kerja rekomendasi</Link>
            </div>
            <div className="metrics">
              {[
                ["3", "Peminatan Keilmuan"], ["Mamdani", "Metode Rekomendasi"], ["3 Soal", "DEMO Terpandu"], ["100%", "Bebas Akses Mahasiswa"]
              ].map(([n, t]) => <div key={t}>
                <strong>
                  {n}
                </strong>
                <small>
                  {t}
                </small>
              </div>)}
            </div>
          </div>
          <article className="card example-card">
            <div className="spread">
              <strong>● Contoh hasil rekomendasi</strong>
              <small className="mono">DEMO / Mamdani</small>
            </div>
            <div className="score-bars">
              {[["Embedded System", 84.44], ["Sistem Cerdas", 60], ["Jaringan & Digital Forensik", 72.42]].map(([label, n], i) => <div key={label}>
                <div className="spread">
                  <small>
                    {label}
                  </small>
                  <span className="mono">Skor {Number(n).toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="bar">
                  <div
                    style={{
                      width: n + "%", background: i === 0 ? "var(--primary)" : i === 1 ? "var(--navy-secondary)" : "var(--teal)"
                    }}
                  />
                </div>
              </div>)}
            </div>
            <div className="notice">
              <small>SKOR KESESUAIAN CONTOH</small>
              <p className="mono">Embedded System · 84,44 dari 100</p>
            </div>
            <small>Data ilustrasi dari prototipe; bukan hasil peserta.</small>
          </article>
        </div>
      </section>
      <section className="container section">
        <span className="eyebrow">TAKSONOMI KURIKULUM</span>
        <h2>Tiga Pilar Peminatan Keilmuan</h2>
        <p>Kenali bidang yang akan dibandingkan dalam asesmen.</p>
        <div className="three-columns">
          {Object.entries(names).map(([code, name]) => <article className="card specialization" key={code}>
            <span className="mono muted">
              {code}
            </span>
            <div className="title-icon">
              <span className="icon-box">
                <img src={"/images/" + icons[code]} alt="" />
              </span>
              <h3>
                {name}
              </h3>
            </div>
            <p>
              {descriptions[code]}
            </p>
            <Link href="/panduan">Pelajari alur asesmen →</Link>
          </article>)}
        </div>
      </section>
      <section className="container section" id="alur">
        <span className="eyebrow">ALUR ASESMEN</span>
        <h2>Empat langkah untuk mengenali potensimu</h2>
        <div className="four-columns">
          {[
            ["Peminatan awal", "Pilih bidang yang diminati sebagai pembanding."], ["Nilai akademik", "Impor transkrip Excel/CSV atau masukkan nilai manual."], ["Tes kompetensi", "Jawab soal dari tiga bidang. Jawaban disimpan pada server."], ["Hasil rekomendasi", "Bandingkan skor dan telusuri detail perhitungan fuzzy."]
          ].map(([title, description], i) => <article className="card" key={title}>
            <span className="step-number">
              {i + 1}
            </span>
            <h3>
              {title}
            </h3>
            <p>
              {description}
            </p>
          </article>)}
        </div>
      </section>
      <section className="container section two-columns" id="tentang">
        <div className="dark-card">
          <span className="eyebrow">TRANSPARAN DAN DAPAT DITELUSURI</span>
          <h2>Nilai akademik + kompetensi</h2>
          <p>Fuzzifikasi → aturan MIN–MAX → agregasi → centroid</p>
        </div>
        <div>
          <span className="eyebrow">MENGAPA FUZZY MAMDANI?</span>
          <h2>Mengolah Masukan Melalui Derajat Keanggotaan</h2>
          <p>Skor akademik dan kompetensi dipetakan menjadi derajat Rendah, Sedang, dan Tinggi. Aturan yang tersimpan pada versi model menghasilkan skor kesesuaian untuk setiap peminatan.</p>
          <p>Preferensi awal tidak menambah skor atau memecahkan hasil seri. Instrumen akademik harus ditinjau pengelola sebelum digunakan.</p>
        </div>
      </section>
    </main>
  );
}
