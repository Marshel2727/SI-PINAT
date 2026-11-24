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
    "Unduh template Excel/CSV resmi atau isi langsung nilai huruf mata kuliah wajib semester 1–4 sesuai daftar kurikulum aktif.",
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
        <p className="lead">
          Ikuti empat tahapan terstruktur mulai dari memilih minat awal, memasukkan nilai mata kuliah wajib semester 1–4, mengerjakan 30 soal kompetensi, hingga menelaah rekomendasi Fuzzy Mamdani.
        </p>
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
              Isi <strong>NIM</strong>, <strong>nama lengkap</strong>, <strong>semester saat ini</strong>, dan <strong>kelas</strong> (opsional). Data identitas merupakan pernyataan peserta dan belum terhubung ke verifikasi SIAKAD.
            </li>
            <li>
              Jika menggunakan NIM yang sama untuk sesi baru, pastikan nama lengkap dan kelas (kosongkan bila sebelumnya kosong) ditulis sama persis.
            </li>
            <li>
              Untuk impor transkrip, unduh template dari halaman nilai lalu isi kolom <code>semester</code>, <code>kode_mk</code>, <code>nama_mk</code>, dan <code>nilai_huruf</code> tanpa mengubah header. Unggah berkas <strong>CSV UTF-8</strong> atau <strong>XLSX</strong>, periksa pratinjau, lalu konfirmasi—atau isi nilai satu per satu secara manual.
            </li>
            <li>
              Lengkapi seluruh mata kuliah wajib sesuai model aktif; nilai akademik terkunci otomatis setelah jawaban tes kompetensi pertama disimpan.
            </li>
          </ul>
        </article>

        <article className="card">
          <span className="eyebrow">PELAKSANAAN &amp; KEAMANAN SESI</span>
          <h2>Tes Kompetensi, Pintasan &amp; Privasi Sesi</h2>
          <ul className="pillar-points">
            <li>
              Seluruh <strong>30 soal kompetensi</strong> wajib dikerjakan secara mandiri. Jawaban tersimpan otomatis ke server (auto-save)—tunggu indikator tersimpan sebelum berpindah atau menyelesaikan tes.
            </li>
            <li>
              Gunakan pintasan keyboard panah kiri/kanan (<strong>← / →</strong>) untuk berpindah soal, serta tombol huruf <strong>A–D</strong> atau angka <strong>1–4</strong> untuk memilih opsi jawaban.
            </li>
            <li>
              Akses sesi disimpan melalui cookie rahasia pada browser ini dan berlaku selama <strong>24 jam</strong> secara default. Tautan hasil saja tidak membuka akses dari browser lain, sehingga jangan menghapus cookie selama asesmen berlangsung.
            </li>
            <li>
              Bila terdapat skor tertinggi yang sama (seri), seluruh peminatan teratas ditampilkan bersama. Gunakan laporan PDF dan detail fuzzy sebagai bahan konsultasi bersama Dosen Pembimbing Akademik (PA).
            </li>
          </ul>
        </article>
      </section>

      <section className="section">
        <div className="cta-band spread wrap">
          <div>
            <h2>Siap memulai asesmen?</h2>
            <p>
              Pastikan NIM dan daftar nilai mata kuliah wajib semester 1–4 sudah tersedia sebelum memulai sesi 24 jam.
            </p>
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
