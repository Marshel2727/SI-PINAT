import Link from "next/link";

export default function Guide() {
  return (
    <main className="container section prose">
      <span className="eyebrow">PANDUAN MAHASISWA</span>
      <h1>Cara menggunakan SI-PINAT</h1>
      <p>Mulai dari beranda dan pilih DEMO untuk mengenal alurnya, atau FULL untuk mengisi asesmen lengkap. Pada FULL, isi NIM, nama, semester, serta kelas bila diperlukan. Identitas ini merupakan pernyataan peserta dan belum terhubung ke verifikasi SIAKAD.</p>
      <h2>Peminatan dan nilai akademik</h2>
      <p>Pilih peminatan yang paling kamu minati. Pilihan ini hanya dibandingkan dengan hasil akhir. Unduh template dari halaman nilai, isi kolom semester, kode_mk, nama_mk, dan nilai_huruf tanpa mengubah header. Unggah CSV UTF-8 atau XLSX, periksa pratinjau, lalu konfirmasikan penggantian nilai. Kamu juga dapat mengisi nilai satu per satu.</p>
      <p>Lengkapi mata kuliah wajib dan perbaiki kesalahan yang ditampilkan. Konversi serta bobot selalu mengikuti versi model sesi. Nilai terkunci setelah jawaban tes pertama disimpan.</p>
      <h2>Tes kompetensi dan hasil</h2>
      <p>FULL wajib menjawab seluruh paket secara nyata. DEMO menampilkan tiga soal perwakilan; setelah ketiganya dijawab, kamu dapat memuat 27 jawaban contoh berlabel EXAMPLE. Tunggu status tersimpan sebelum berpindah soal. Jika penyimpanan gagal, coba lagi sebelum melanjutkan.</p>
      <p>Setelah konfirmasi selesai, sistem menghitung tiga skor dan menyimpan jejaknya. Hasil seri menampilkan seluruh peminatan teratas. Buka detail fuzzy untuk melihat input, aktivasi aturan, kurva agregasi, dan centroid, atau unduh PDF ringkasannya.</p>
      <h2>Privasi sesi</h2>
      <p>Akses tersimpan melalui cookie rahasia pada browser ini. Tautan hasil saja tidak memberikan akses kepada orang lain. Sesi berlaku 24 jam secara default; jangan menghapus cookie selama mengerjakan. Mengulangi asesmen membuat sesi baru.</p>
      <Link className="button" href="/">Kembali ke beranda</Link>
    </main>
  );
}
