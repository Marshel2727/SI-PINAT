import { StartAssessment } from "@/features/assessments/start";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Alur & Panduan",
};

const ASSESSMENT_STEPS = [
  [
    "Pilih Minat Awal",
    "Pilih bidang peminatan yang paling kamu minati saat ini sebagai pembanding pada halaman hasil akhir (tidak menambah skor).",
  ],
  [
    "Masukkan Nilai Akademik",
    "Unggah PDF Transkrip SIAKAD UNM, gunakan template Excel (.xlsx), atau isi langsung nilai huruf mata kuliah wajib semester 1–4.",
  ],
  [
    "Kerjakan 30 Soal Kompetensi",
    "Jawab seluruh 30 butir soal pilihan ganda dari tiga bidang keilmuan. Jawaban tersimpan otomatis ke server secara real-time.",
  ],
  [
    "Telaah Hasil & Unduh PDF",
    "Bandingkan skor kesesuaian ketiga bidang, telusuri rincian perhitungan Fuzzy Mamdani, dan unduh laporan PDF ringkasannya.",
  ],
] as const;

export default function Guide() {
  return (
    <main id="main-content" className="container section">
      <header className="page-intro">
        <span className="eyebrow">PANDUAN PENGGUNAAN</span>
        <h1>Alur &amp; Panduan Menentukan Peminatan</h1>
      </header>

      <section className="section" aria-label="Empat tahapan asesmen">
        <div className="four-columns">
          {ASSESSMENT_STEPS.map(([title, description], index) => (
            <article className="card step-card" key={title}>
              <span className="step-number">{index + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section two-columns" aria-label="Ketentuan teknis asesmen">
        <article className="card">
          <span className="eyebrow">PERSIAPAN &amp; DATA AKADEMIK</span>
          <h2>Identitas &amp; Prasyarat Nilai</h2>
          <ul className="pillar-points">
            <li>
              Isi <strong>NIM</strong>, <strong>nama lengkap</strong>, <strong>semester saat ini</strong>, dan <strong>kelas</strong> (opsional) sesuai data akademik.
            </li>
            <li>
              Isi nilai secara manual, unggah langsung <strong>PDF Transkrip SIAKAD UNM</strong>, atau gunakan template <strong>Excel (.xlsx)</strong>.
            </li>
            <li>
              Lengkapi seluruh mata kuliah wajib sebelum melanjutkan; nilai terkunci otomatis saat tes kompetensi dimulai.
            </li>
          </ul>
        </article>

        <article className="card">
          <span className="eyebrow">PELAKSANAAN &amp; KEAMANAN SESI</span>
          <h2>Tes Kompetensi, Pintasan &amp; Privasi Sesi</h2>
          <ul className="pillar-points">
            <li>
              Kerjakan <strong>30 soal kompetensi</strong> secara mandiri; jawaban tersimpan otomatis ke server dan mendukung pintasan <strong>← / →</strong> serta <strong>A–D</strong> / <strong>1–4</strong>.
            </li>
            <li>
              Sesi asesmen berlaku selama <strong>24 jam</strong> di browser yang sama.
            </li>
            <li>
              Unduh laporan PDF hasil rekomendasi sebagai bahan konsultasi bersama Dosen Pembimbing Akademik (PA).
            </li>
          </ul>
        </article>
      </section>

      <section className="section">
        <div className="cta-band spread wrap">
          <div>
            <h2>Siap memulai asesmen?</h2>
          </div>
          <div className="actions">
            <StartAssessment label="Mulai Tentukan Peminatan" />
            <Link className="button secondary" href="/tentang">
              Pelajari Metode Fuzzy →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
