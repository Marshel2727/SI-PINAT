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
          SI-PINAT dirancang untuk membantu mahasiswa Program Studi Teknik Komputer Fakultas Teknik Universitas Negeri Makassar menimbang kesesuaian peminatan keilmuan secara objektif, terukur, dan dapat ditelusuri.
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
            Untuk setiap bidang peminatan, nilai mata kuliah wajib semester 1–4 dihitung rata-rata terbobotnya menjadi skor akademik, lalu digabungkan dengan hasil 30 soal tes kompetensi melalui empat tahapan inferensi Fuzzy Mamdani hingga menghasilkan skor kesesuaian 0–100 yang jejak hitungannya dapat diaudit di halaman detail fuzzy.
          </p>
        </div>

        <article className="card">
          <span className="eyebrow">MENGAPA FUZZY MAMDANI?</span>
          <h2>Mengolah Masukan Melalui Derajat Keanggotaan</h2>
          <p>
            Skor akademik dan skor tes kompetensi dipetakan ke himpunan fuzzy <strong>Rendah</strong>, <strong>Sedang</strong>, dan <strong>Tinggi</strong> menggunakan derajat keanggotaan kontinyu, bukan batas nilai kaku. Seluruh bobot mata kuliah, paket soal, dan basis aturan mengikuti versi model aktif yang telah tervalidasi.
          </p>
          <p>
            Minat awal yang kamu pilih di tahap pertama hanya ditampilkan sebagai pembanding pada halaman hasil—tidak menambah skor, tidak memengaruhi aturan inferensi, dan tidak memecah hasil seri. Rekomendasi akhir ditujukan sebagai bahan konsultasi akademik bersama Dosen Pembimbing Akademik (PA).
          </p>
        </article>
      </section>

      <section className="section" aria-label="Detail tiga pilar peminatan">
        <span className="eyebrow">DETAIL TIGA PILAR PEMINATAN</span>
        <h2>Cakupan Bidang Keilmuan Teknik Komputer</h2>
        <p>
          Setiap bidang dievaluasi secara independen menggunakan bobot mata kuliah wajib dan butir soal kompetensi sesuai topik fokus berikut.
        </p>
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
            <p>
              Mulai sesi asesmen untuk melihat perbandingan skor ketiga peminatan beserta jejak perhitungan Fuzzy Mamdani.
            </p>
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
