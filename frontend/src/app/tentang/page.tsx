import { StartAssessment } from "@/features/assessments/start";
import { descriptions, icons, names } from "@/lib/format";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tentang & Metode",
};

const PILLAR_TOPICS: Record<string, readonly string[]> = {
  "ES-01": [
    "Konversi sinyal ADC, antarmuka sensor I2C, dan modulasi PWM",
    "Konfigurasi GPIO serta kendali perangkat keras mikrokontroler",
    "Sinkronisasi tugas RTOS dan mekanisme watchdog system",
  ],
  "SC-02": [
    "Pra-pemrosesan data, standardisasi fitur, dan pencegahan data leakage",
    "Evaluasi model klasifikasi dengan Precision, Recall, dan K-fold cross-validation",
    "Pemodelan klastering K-means, decision tree, serta validasi deret waktu",
  ],
  "JDF-03": [
    "Pengalamatan subnet CIDR, DNS, protokol TCP, dan perlindungan TLS",
    "Keamanan aplikasi web, pengelolaan kredensial, dan prinsip least privilege",
    "Penanganan barang bukti digital, integritas hash, dan write blocker",
  ],
};

export default function AboutMethodPage() {
  return (
    <main id="main-content" className="container section">
      <header className="page-intro">
        <span className="eyebrow">TENTANG SI-PINAT</span>
        <h1>Transparansi Metode Fuzzy Mamdani</h1>
        <p className="lead">
          Sistem pendukung keputusan pemilihan peminatan Teknik Komputer UNM berbasis Fuzzy Mamdani.
        </p>
      </header>

      <section className="section two-columns" aria-label="Penjelasan metode Fuzzy Mamdani">
        <div className="dark-card">
          <span className="eyebrow">TRANSPARAN DAN DAPAT DITELUSURI</span>
          <h2>Nilai akademik + tes kompetensi</h2>
          <p className="mono" style={{ color: "#87e5dc", fontWeight: 600 }}>
            Fuzzifikasi → Aturan MIN–MAX → Agregasi → Centroid
          </p>
          <p>
            Nilai mata kuliah wajib semester 1–4 digabungkan dengan hasil 30 soal kompetensi untuk menghasilkan skor kesesuaian 0–100 yang dapat ditelusuri.
          </p>
        </div>

        <article className="card">
          <span className="eyebrow">MENGAPA FUZZY MAMDANI?</span>
          <h2>Mengolah Masukan Melalui Derajat Keanggotaan</h2>
          <p>
            Skor akademik dan kompetensi dipetakan ke himpunan fuzzy <strong>Rendah</strong>, <strong>Sedang</strong>, dan <strong>Tinggi</strong> secara kontinyu, lalu diinferensi menggunakan bobot dan basis aturan model aktif yang telah tervalidasi.
          </p>
        </article>
      </section>

      <section className="section" aria-label="Detail tiga pilar peminatan">
        <span className="eyebrow">DETAIL TIGA PILAR PEMINATAN</span>
        <h2>Cakupan Bidang Keilmuan Teknik Komputer</h2>
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
              <ul className="pillar-points">
                {(PILLAR_TOPICS[code] ?? []).map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="cta-band spread wrap">
          <div>
            <h2>Siap mengevaluasi kesesuaian peminatanmu?</h2>
          </div>
          <div className="actions">
            <StartAssessment label="Mulai Tentukan Peminatan" />
            <Link className="button secondary" href="/panduan">
              Baca Alur &amp; Panduan
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
