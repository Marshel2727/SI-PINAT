---
title: "RAG Lengkap Pengembangan SI-PINAT"
version: "1.0"
updated: "2026-10-13"
language: "id"
purpose: "Dokumen konteks dan spesifikasi implementasi"
stack: ["Next.js", "FastAPI", "MySQL", "Docker"]
---

# RAG Lengkap Pengembangan SI-PINAT

Dokumen ini adalah acuan untuk AI coding assistant atau developer yang akan membangun website SI-PINAT. Istilah RAG di sini berarti paket pengetahuan proyek yang dapat dijadikan konteks implementasi. Website tidak memerlukan chatbot, vector database, atau fitur Retrieval-Augmented Generation.

Seluruh kebutuhan, struktur proyek, kontrak API, aturan database, pedoman tampilan, alur fuzzy, konfigurasi Docker, dan kriteria penerimaan dikumpulkan dalam satu file ini. Potongan kode dan perintah merupakan contoh untuk tahap implementasi; keberadaannya tidak berarti aplikasi sudah selesai atau perintah tersebut sudah dijalankan.

## Daftar isi

1. [Sumber dan batas kebenaran](#rag-01-sumber-dan-batas-kebenaran)
2. [Tujuan dan ruang lingkup produk](#rag-02-tujuan-dan-ruang-lingkup-produk)
3. [Aktor dan hak akses](#rag-03-aktor-dan-hak-akses)
4. [Alur mahasiswa dan admin](#rag-04-alur-mahasiswa-dan-admin)
5. [Kebutuhan fitur](#rag-05-kebutuhan-fitur)
6. [Desain final dan pemetaan halaman](#rag-06-desain-final-dan-pemetaan-halaman)
7. [Arsitektur dan struktur kode](#rag-07-arsitektur-dan-struktur-kode)
8. [Aturan data dan transaksi](#rag-08-aturan-data-dan-transaksi)
9. [Kontrak API](#rag-09-kontrak-api)
10. [Spesifikasi perhitungan fuzzy](#rag-10-spesifikasi-perhitungan-fuzzy)
11. [Keamanan dan pengelolaan berkas](#rag-11-keamanan-dan-pengelolaan-berkas)
12. [Pengujian dan kriteria selesai](#rag-12-pengujian-dan-kriteria-selesai)
13. [Tahapan pengerjaan](#rag-13-tahapan-pengerjaan)
14. [Prompt implementasi untuk AI](#rag-14-prompt-implementasi-untuk-ai)
15. [Kamus data dan relasi](#rag-15-kamus-data-dan-relasi)
16. [Docker dan cara menjalankan](#rag-16-docker-dan-cara-menjalankan)
17. [DDL referensi MySQL](#rag-17-ddl-referensi-mysql)
18. [Referensi teknis](#rag-18-referensi-teknis)

## RAG-01 Sumber dan batas kebenaran

### Sumber utama

| Sumber | Tautan | Fungsi |
|---|---|---|
| Desain final | https://www.figma.com/design/1VF2IX2cKulu23XYLBtHb8/Untitled?node-id=53-167 | Acuan tampilan, bahasa antarmuka, dan alur pengguna pada Page 3 |
| Beranda final | https://www.figma.com/design/1VF2IX2cKulu23XYLBtHb8/Untitled?node-id=53-168 | Titik awal alur mahasiswa |
| Login admin final | https://www.figma.com/design/1VF2IX2cKulu23XYLBtHb8/Untitled?node-id=53-2951 | Titik awal alur administrator |
| ERD MySQL | https://www.figma.com/design/1VF2IX2cKulu23XYLBtHb8/Untitled?node-id=121-3 | Tab 04 — ERD MySQL; 23 tabel aplikasi dan 34 relasi |

Desain dan ERD dibaca langsung pada 13 Oktober 2026. File Figma yang menjadi acuan adalah SI-PINAT dengan file key 1VF2IX2cKulu23XYLBtHb8. Nama folder lokal SICMA tidak mengubah identitas produk menjadi aplikasi reservasi ruangan.

### Status informasi

- **TERKONFIRMASI:** stack Next.js, FastAPI, MySQL; desain Page 3; tiga peminatan; dua input fuzzy; metode Mamdani dan centroid; ERD 23 tabel; preferensi awal hanya sebagai pembanding.
- **KEPUTUSAN IMPLEMENTASI DALAM DOKUMEN:** susunan direktori, route web dan API, sesi berbasis cookie, rumus agregasi nilai berbobot SKS, aturan penanganan ranking seri, dan konfigurasi container.
- **PERLU VALIDASI AKADEMIK:** daftar resmi mata kuliah, konversi nilai, bobot tiap peminatan, soal/kunci, parameter fungsi keanggotaan, konsekuen aturan fuzzy, serta rentang hasil yang diharapkan.

Prototipe Figma masih memakai data simulasi. Angka 38 mata kuliah, 30 soal, 9 aturan per jalur, 10 skenario, dan hasil 84,44 / 72,42 / 60,00 pada tampilan adalah acuan contoh, bukan bukti data kampus atau hasil algoritma yang sudah tervalidasi.

Urutan penyelesaian konflik: instruksi terbaru pemilik proyek → keputusan kebutuhan yang disetujui → ERD untuk struktur data → desain final untuk tampilan → usulan teknis pada dokumen ini. Jika dokumen dan Figma berbeda secara material, jelaskan perbedaannya sebelum mengubah model data atau tujuan fitur.

### Batas kerja AI

Ketika hanya diminta menganalisis, jelaskan tanpa mengubah kode. Ketika diminta mengimplementasikan suatu tahap, kerjakan tahap tersebut sesuai cakupan. Jangan menambahkan fitur di luar kebutuhan, mengganti stack, atau menganggap contoh akademik sebagai ketentuan resmi. Jangan mengklaim pengujian, publikasi, atau integrasi yang belum dilakukan.

## RAG-02 Tujuan dan ruang lingkup produk

SI-PINAT adalah sistem pendukung keputusan untuk membantu mahasiswa Teknik Komputer membandingkan kesesuaian tiga jalur peminatan melalui nilai akademik dan tes kompetensi.

| Kode | Peminatan | Cakupan informasi pada desain |
|---|---|---|
| ES-01 | Embedded System | Mikrokontroler, perangkat keras, sistem tertanam, IoT, dan robotika |
| SC-02 | Sistem Cerdas | Kecerdasan buatan, pembelajaran mesin, visi komputer, dan pengolahan data |
| JDF-03 | Jaringan & Digital Forensik | Jaringan komputer, keamanan siber, dan analisis forensik digital |

Website harus menghasilkan rekomendasi yang dihitung, tersimpan, dapat dijelaskan, dan dapat ditelusuri versinya. Hasil merupakan alat bantu akademik; keputusan peminatan tetap mengikuti kebijakan program studi dan konsultasi pembimbing.

### Cakupan wajib

- Alur mahasiswa: preferensi awal, identitas untuk asesmen penuh, nilai akademik, tes, hasil, dan detail fuzzy.
- Impor Excel/CSV dengan pratinjau serta input nilai manual.
- Mode DEMO yang jelas terpisah dari FULL.
- Login admin nyata, dashboard, pengelolaan mata kuliah/bobot, bank soal, model fuzzy, dan skenario validasi.
- Penyimpanan hasil serta jejak hitung, cetak/unduh ringkasan hasil, dan ekspor ringkasan admin.
- Docker untuk frontend, backend, MySQL, dan proses migrasi.

### Di luar cakupan awal

SSO/SIAKAD, verifikasi otomatis transkrip kampus, OCR PDF, aplikasi Android/iOS native, pembayaran, chatbot, prediksi berbasis model machine learning terlatih, dan sistem multi-kampus. Jangan memasukkannya tanpa permintaan baru.

## RAG-03 Aktor dan hak akses

| Aktor | Akses yang diizinkan |
|---|---|
| Pengunjung | Beranda, informasi peminatan, panduan, dan memulai asesmen |
| Peserta asesmen | Membaca/mengubah sesi miliknya yang belum selesai, mengunggah nilai, menjawab tes, dan melihat hasil miliknya |
| Administrator aktif | Mengelola master, draft model, bank soal, skenario validasi, dashboard, dan laporan |
| Sistem | Memvalidasi data, menghitung nilai/fuzzy, menyimpan snapshot, serta menjalankan migrasi |

Mahasiswa tidak diwajibkan memiliki akun/password pada versi awal. Tabel students menyimpan identitas, bukan akun login mahasiswa. Hak akses sesi mahasiswa diberikan melalui token rahasia; public_id saja tidak cukup untuk membaca hasil.

NIM pada asesmen FULL merupakan identitas yang dinyatakan peserta, belum merupakan verifikasi kepemilikan akun kampus. Jangan menampilkan profil atau riwayat orang lain berdasarkan pencarian NIM. Jika NIM sudah ada, cocokkan input di server tanpa membocorkan profil; perubahan profil yang telah ada tidak boleh dilakukan oleh sesi anonim sembarang.

Administrator hanya memiliki satu tingkat akses pada versi awal. Role/permission multi-level tidak boleh ditambahkan diam-diam karena belum ada dalam ERD.

## RAG-04 Alur mahasiswa dan admin

### Alur mahasiswa

1. Beranda menjelaskan tujuan, tiga peminatan, dan cara kerja rekomendasi.
2. Peserta memilih DEMO atau FULL ketika mulai. FULL meminta NIM, nama, kelas opsional, dan semester pada tahap awal; letakkan formulir sebagai bagian tahap awal tanpa mengubah jumlah empat tahap utama.
3. Sistem membuat asesmen dengan UUID publik, token akses acak, dan satu model PUBLISHED yang dikunci untuk sesi itu.
4. Peserta memilih preferensi awal. Pilihan disimpan untuk perbandingan hasil.
5. Peserta mengimpor Excel/CSV atau memasukkan nilai manual. Sistem menampilkan kesalahan per baris, konversi nilai, dan kelengkapan mata kuliah inti.
6. Setelah nilai sah, peserta masuk tes. Tampilkan satu soal per layar, navigasi soal, progres per peminatan, dan status jawaban tersimpan.
7. FULL menjawab seluruh paket, target awal 30 soal / 10 per peminatan. DEMO menampilkan 3 soal perwakilan dan dapat memuat 27 jawaban contoh dengan label EXAMPLE yang eksplisit.
8. Sebelum selesai, tampilkan konfirmasi dan jumlah jawaban nyata/contoh. Server memeriksa kelengkapan; jumlah di browser tidak menjadi bukti sah.
9. Server menghitung akademik, kompetensi, fuzzy, ranking, dan jejak untuk ketiga peminatan.
10. Halaman hasil menampilkan rekomendasi, skor, alasan, perbandingan preferensi, dan akses detail hitung serta PDF.
11. Ulangi asesmen membuat sesi baru. Hasil sesi lama tidak ditimpa.

### Status asesmen

| Status | Arti | Perubahan yang diizinkan |
|---|---|---|
| DRAFT | Sesi dibuat; identitas/preferensi/nilai belum lengkap | Mengisi tahap awal dan nilai |
| ACADEMIC_READY | Nilai telah lolos pemeriksaan | Memulai tes; revisi nilai sebelum jawaban tes pertama |
| IN_PROGRESS | Paket tes sudah mulai dijawab | Menyimpan/mengubah jawaban milik sesi; nilai terkunci |
| COMPLETED | Run sukses dan seluruh hasil/trace tersimpan | Membaca hasil dan mengunduh laporan; input terkunci |

Jika nilai diubah ketika ACADEMIC_READY, validasi ulang dan kembalikan status DRAFT jika belum sah. Setelah IN_PROGRESS, perubahan nilai memerlukan asesmen baru agar skor dan jawaban tetap dapat ditelusuri. Progres dihitung dari data server, bukan angka hardcode.

### Alur admin

Login → dashboard → kelola master atau bank soal → buat/kloning model DRAFT → atur bobot, konversi, himpunan, dan aturan → jalankan validasi → publikasikan model → pantau asesmen dan ekspor ringkasan → logout.

Model PUBLISHED dan soal PUBLISHED yang sudah dipakai tidak diedit langsung. Buat versi/revisi baru. Halaman pengelolaan bank soal, model fuzzy, dan skenario validasi perlu dirancang mengikuti tema final karena pada prototipe sebagian masih berupa fitur rencana.

## RAG-05 Kebutuhan fitur

| ID | Fitur | Perilaku dan hasil yang diharapkan |
|---|---|---|
| FR-01 | Beranda | Informasi ringkas, tiga peminatan, CTA asesmen dan panduan; kartu hasil contoh berlabel contoh |
| FR-02 | Sesi asesmen | UUID publik, token rahasia, masa berlaku, mode, dan versi model tersimpan |
| FR-03 | Preferensi dan identitas | Preferensi tersimpan; FULL wajib identitas; preferensi tidak mengubah skor |
| FR-04 | Template nilai | Unduhan CSV/XLSX dengan semester, kode_mk, nama_mk, nilai_huruf |
| FR-05 | Impor nilai | Validasi berkas, kolom, kode MK, semester, duplikasi, dan nilai; kesalahan per baris |
| FR-06 | Nilai manual | Dropdown nilai dari konversi versi sesi; hasil validasi sama dengan impor |
| FR-07 | Kelengkapan akademik | Semua MK is_required yang berlaku terpenuhi; denominator akademik setiap peminatan positif |
| FR-08 | Tes kompetensi | Paket soal tetap per sesi, satu soal per layar, autosave, navigasi, dan progres |
| FR-09 | Penyelesaian | Server menolak FULL belum lengkap atau berisi jawaban EXAMPLE |
| FR-10 | Rekomendasi | Tiga skor dihitung backend; alasan, ranking, seri, dan preferensi ditampilkan jujur |
| FR-11 | Detail fuzzy | Input, keanggotaan, semua aktivasi aturan, agregasi, serta centroid dari trace tersimpan |
| FR-12 | Laporan peserta | PDF nyata berisi ringkasan, mode, model, waktu, skor, dan penjelasan |
| FR-13 | Login/logout admin | Hash password, sesi server, pencabutan token; tidak ada akun demo untuk akses produksi |
| FR-14 | Dashboard | Jumlah dan grafik berasal dari database; DEMO dan FULL dibedakan; paginasi aktivitas |
| FR-15 | Mata kuliah dan bobot | CRUD master, filter, nonaktif, bobot 0–1 per versi/peminatan, dan audit perubahan |
| FR-16 | Bank soal | Draft/revisi, opsi tunggal, tepat satu benar, publikasi dan arsip |
| FR-17 | Model fuzzy | Versioning konversi, bobot, variabel, himpunan, aturan; validasi sebelum publish |
| FR-18 | Uji skenario | Input numerik, rentang ekspektasi, hasil aktual, dan status uji tersimpan |
| FR-19 | Ekspor admin | XLSX sesuai filter yang aktif, akses admin, dan penanganan formula injection |
| FR-20 | Infrastruktur | Container terpisah, migrasi satu kali per deploy, healthcheck, volume DB dan unggahan |

### Keadaan antarmuka wajib

Setiap formulir dan halaman data mempunyai loading, kosong, error, dan sukses. Tombol kirim mencegah pengiriman ganda; kegagalan autosave terlihat dan dapat dicoba ulang. Sesi kedaluwarsa, akses hasil tidak sah, model belum tersedia, berkas invalid, dan hasil seri mempunyai pesan yang bisa dipahami.

Data kosong tidak boleh diganti angka simulasi tanpa label. Jika model PUBLISHED belum ada, tombol asesmen menampilkan penjelasan bahwa konfigurasi belum siap.

## RAG-06 Desain final dan pemetaan halaman

### Layar utama yang sudah tersedia

| Layar Figma | Node | Route web yang direncanakan |
|---|---|---|
| Beranda | 53:168 | / |
| Pilih Peminatan Awal | 53:588 | /asesmen/[publicId]/peminatan |
| Input Nilai Akademik | 53:898 | /asesmen/[publicId]/nilai |
| Tes Kompetensi | 53:1923 | /asesmen/[publicId]/tes |
| Hasil Rekomendasi | 53:1519 | /asesmen/[publicId]/hasil |
| Detail Perhitungan Fuzzy | 53:2311 | /asesmen/[publicId]/detail-fuzzy |
| Login Admin | 53:2951 | /admin/login |
| Dashboard Admin | 53:3713 | /admin |
| Kelola Mata Kuliah | 53:3111 | /admin/mata-kuliah |

Dialog yang menjadi acuan: data belum lengkap, tes belum selesai, template, unggahan, pemilihan nilai, konfirmasi selesai, ringkasan/cetak, edit bobot, simpan, dan batal.

Route tambahan kebutuhan aplikasi: /panduan, /admin/bank-soal, /admin/bank-soal/[questionId], /admin/model-fuzzy, /admin/model-fuzzy/[versionId], /admin/validasi, dan /admin/asesmen/[publicId]. Route tambahan ini adalah rancangan implementasi, bukan klaim bahwa seluruh layarnya sudah digambar final.

### Pedoman visual

- Acuan desktop Figma berukuran 1280 × 800. Website boleh scroll; jangan mengunci semua halaman pada tinggi 800 piksel.
- Font utama Plus Jakarta Sans; JetBrains Mono untuk parameter/perhitungan bila diperlukan.
- Warna utama teridentifikasi: navy #001835, primary #0051D5, navy sekunder #142D4E, teks sekunder #44474E, surface #F2F3FF, surface lembut #EAEDFF, border #DAE2FD, dan aksen teal #2EA498.
- Ikuti jarak, bentuk kartu, hierarki judul, tombol, ikon, tabel, dan dialog dari node Figma. Ambil ukuran aktual saat implementasi; jangan menebak semua spacing dari daftar warna ini.
- Gunakan token CSS terpusat, komponen UI bersama, serta variasi tombol/input/status yang konsisten.
- Tampilan mobile dan tablet merupakan adaptasi yang harus diperiksa karena acuan utama desktop. Usulan breakpoint: <768 mobile, 768–1023 tablet, ≥1024 desktop.
- Pada mobile, tahap menjadi indikator ringkas, sidebar soal dapat dilipat, kartu peminatan ditumpuk, dan tabel lebar dapat digulir.
- Kontras terbaca, fokus keyboard terlihat, input mempunyai label, error terkait input, dan dialog mengembalikan fokus saat ditutup.
- Angka untuk pengguna memakai format Indonesia, misalnya 84,44. API dan database memakai angka numerik, bukan string angka dengan koma.
- Ganti badge simulasi hanya ketika fitur memakai data nyata. DEMO tetap selalu berlabel contoh.
- Beranda boleh mempertahankan hasil contoh untuk menjelaskan sistem, tetapi jangan menyebutnya hasil peserta aktif.

## RAG-07 Arsitektur dan struktur kode

### Pembagian tanggung jawab

Browser → Next.js → FastAPI → MySQL.

Next.js menangani route, render, formulir, visualisasi, dan perantara request dari browser. FastAPI menjadi otoritas validasi, autentikasi, kepemilikan sesi, perhitungan, transaksi, dan ekspor. MySQL menyimpan seluruh entitas ERD. Jangan menghubungkan Next.js langsung ke MySQL atau menghitung rekomendasi final di browser.

Browser menggunakan URL relatif /api/v1. Next.js meneruskan request ke API_INTERNAL_URL, yang bernilai http://backend:8000 di Docker. Server Component boleh mengakses FastAPI langsung melalui URL internal dengan meneruskan cookie yang diperlukan. URL internal dan kredensial database tidak menjadi NEXT_PUBLIC_*.

### Stack

| Bagian | Pilihan |
|---|---|
| Frontend | Next.js App Router, React, TypeScript |
| Styling | Tailwind CSS dan token CSS; komponen bersama sesuai Figma |
| Form | React Hook Form dan Zod |
| Data interaktif | TanStack Query bila diperlukan; Server Components sebagai default |
| Grafik | Recharts atau SVG untuk skor dan kurva keanggotaan |
| Backend | FastAPI, Pydantic Settings, SQLAlchemy, Alembic |
| Driver DB | PyMySQL; SQLAlchemy sinkron untuk versi awal |
| Perhitungan | Python dan NumPy; engine fuzzy murni terpisah dari HTTP/database |
| Spreadsheet | openpyxl dan modul csv |
| Password | argon2-cffi / Argon2id |
| PDF | ReportLab |
| Pengujian | pytest, HTTPX, Vitest, Playwright |
| Infrastruktur | Docker Compose, MySQL 8.4, Node 22, Python 3.12 |

Versi paket harus dikunci saat implementasi dan diuji bersama. Jangan mengubah stack hanya karena paket alternatif tersedia.

### Struktur target

~~~text
sipinat/
├── docs/
│   └── RAG_LENGKAP_SIPINAT.md
├── frontend/
│   ├── public/
│   │   ├── fonts/
│   │   └── images/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── globals.css
│   │   │   ├── (public)/page.tsx
│   │   │   ├── (public)/panduan/page.tsx
│   │   │   ├── asesmen/[publicId]/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── peminatan/page.tsx
│   │   │   │   ├── nilai/page.tsx
│   │   │   │   ├── tes/page.tsx
│   │   │   │   ├── hasil/page.tsx
│   │   │   │   └── detail-fuzzy/page.tsx
│   │   │   ├── admin/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── (protected)/
│   │   │   │       ├── layout.tsx
│   │   │   │       ├── page.tsx
│   │   │   │       ├── mata-kuliah/page.tsx
│   │   │   │       ├── bank-soal/
│   │   │   │       ├── model-fuzzy/
│   │   │   │       ├── validasi/page.tsx
│   │   │   │       └── asesmen/[publicId]/page.tsx
│   │   │   └── api/
│   │   │       ├── health/route.ts
│   │   │       ├── health/live/route.ts
│   │   │       └── v1/[...path]/route.ts
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── layout/
│   │   │   ├── charts/
│   │   │   └── feedback/
│   │   ├── features/
│   │   │   ├── assessments/
│   │   │   ├── academic-grades/
│   │   │   ├── competency-test/
│   │   │   ├── recommendations/
│   │   │   ├── admin-auth/
│   │   │   ├── courses/
│   │   │   ├── question-bank/
│   │   │   └── fuzzy-models/
│   │   ├── lib/
│   │   │   ├── api/{client,server}.ts
│   │   │   ├── env.ts
│   │   │   ├── format.ts
│   │   │   └── constants.ts
│   │   └── types/api.ts
│   ├── tests/
│   ├── package.json
│   ├── package-lock.json
│   ├── next.config.ts
│   ├── Dockerfile
│   └── .dockerignore
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/v1/
│   │   │   ├── router.py
│   │   │   └── endpoints/
│   │   │       ├── health.py
│   │   │       ├── auth.py
│   │   │       ├── specializations.py
│   │   │       ├── assessments.py
│   │   │       ├── grades.py
│   │   │       ├── questions.py
│   │   │       ├── recommendations.py
│   │   │       ├── admin_courses.py
│   │   │       ├── admin_questions.py
│   │   │       ├── admin_fuzzy.py
│   │   │       └── admin_reports.py
│   │   ├── core/{config,security,errors,logging}.py
│   │   ├── db/{base,session}.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── repositories/
│   │   ├── services/
│   │   │   ├── assessment_service.py
│   │   │   ├── grade_service.py
│   │   │   ├── import_service.py
│   │   │   ├── question_service.py
│   │   │   ├── recommendation_service.py
│   │   │   ├── model_service.py
│   │   │   ├── validation_service.py
│   │   │   ├── report_service.py
│   │   │   └── audit_service.py
│   │   ├── fuzzy/
│   │   │   ├── membership.py
│   │   │   ├── inference.py
│   │   │   ├── aggregation.py
│   │   │   ├── defuzzification.py
│   │   │   ├── scoring.py
│   │   │   ├── engine.py
│   │   │   └── types.py
│   │   └── cli/{create_admin,seed_demo}.py
│   ├── alembic/versions/
│   ├── alembic.ini
│   ├── tests/{unit,integration}/
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── Dockerfile
│   └── .dockerignore
├── compose.yaml
├── .env.example
└── README.md
~~~

Jangan membuat seluruh file sebagai stub kosong hanya untuk menyerupai pohon direktori. Buat modul ketika tanggung jawabnya mulai diimplementasikan. Folder model/schema/repository dikelompokkan per domain enam kelompok ERD agar tetap mudah ditelusuri.

Router mengurus HTTP dan dependency injection; service mengurus proses bisnis; repository mengurus query; model mengurus pemetaan tabel; schema mengurus input/output. Engine fuzzy menerima data numerik/config dan mengembalikan hasil/trace tanpa bergantung pada FastAPI atau SQLAlchemy.

## RAG-08 Aturan data dan transaksi

### Identitas, ID, dan waktu

- PK internal memakai BIGINT UNSIGNED. ID internal di JSON diserialisasi sebagai string agar aman untuk JavaScript.
- public_id asesmen memakai UUID acak. Token akses memakai nilai acak kriptografis, disimpan sebagai hash SHA-256, dan tidak dimasukkan ke URL.
- NIM berupa teks agar nol di awal tidak hilang. Nama wajib pada FULL; jangan membuat mahasiswa bernama fiktif secara otomatis untuk produksi.
- Timestamp database UTC; API mengirim ISO 8601 dengan penanda Z. Tampilan mengubah ke zona waktu aplikasi yang dikonfigurasi, tanpa hardcode label WIB.
- DECIMAL digunakan sesuai kamus data. Kalkulasi dapat memakai float64, lalu kuantisasi konsisten sebelum penyimpanan. Jangan mengurutkan ranking dari skor dua desimal yang ditampilkan.
- Semua query menggunakan binding parameter/ORM.

### Impor dan nilai

Header template wajib: semester, kode_mk, nama_mk, nilai_huruf. Satu baris per mata kuliah. Kode MK menjadi acuan master; nama hanya diperiksa kecocokannya dan tidak digunakan untuk membuat master baru otomatis.

Validasi mencakup semester 1–4, kode dikenal, kode tidak duplikat, semester sesuai master, nilai ada pada tabel konversi versi asesmen, dan MK inti lengkap. Jangan diam-diam mengambil nilai tertinggi dari duplikasi.

Gunakan transaksi agar berkas invalid tidak menyimpan sebagian nilai sah tanpa persetujuan. Baris invalid dicatat pada validation_errors; nilai lama yang sudah sah tidak ditimpa oleh impor gagal. Impor valid dapat mengganti paket nilai DRAFT secara atomik setelah konfirmasi.

Saat nilai diterima, simpan letter_grade, normalized_score, credits_snapshot, dan course_snapshot berisi kode/nama/semester yang digunakan. grade_conversion_id wajib berasal dari versi model asesmen. Snapshot dan nilai terkunci setelah tes dimulai.

Riwayat transcript_imports tetap tersimpan; storage_key bukan URL publik. Input manual menggunakan validasi yang sama dengan impor.

### Tes dan soal

Paket assessment_items dibuat sekali ketika sesi disiapkan untuk tes. Simpan revisi question_id yang tetap, urutan, dan max_points. Soal PUBLISHED yang sudah dipakai serta opsi/kuncinya tidak diubah; revisi baru membuat baris questions dan question_options baru.

Tepat satu opsi benar per soal pilihan tunggal. API peserta sebelum selesai tidak mengirim is_correct, explanation yang membocorkan kunci, atau awarded_points per jawaban.

Satu item memiliki maksimal satu jawaban. PUT jawaban bersifat upsert yang aman diulang. Client hanya mengirim option_id; server mengambil question_id, memeriksa kepemilikan opsi/item, menentukan answer_source dan awarded_points. Client FULL tidak dapat mengirim EXAMPLE.

### Versi model

Versi mencakup course_weights, grade_conversions, fuzzy_variables, fuzzy_sets, dan fuzzy_rules. Publikasi memastikan semuanya lengkap dan konsisten. Konfigurasi PUBLISHED tidak dimutasi melalui endpoint manapun; kloning menjadi DRAFT untuk perubahan.

Aturan pada satu peminatan hanya memakai set ACADEMIC, COMPETENCY, dan SUITABILITY dari versi yang sama. Model harus mempunyai cakupan keanggotaan seluruh domain, basis aturan lengkap, bobot sah, dan skenario wajib yang lolos sebelum publish.

Asesmen lama selalu memakai model_version_id miliknya; perubahan versi aktif tidak memindahkan sesi yang sedang berjalan. Memilih model terbaru tidak bergantung pada tanggal saja: pilih PUBLISHED dengan published_at terbaru dan urutan ID sebagai penentu konsisten.

### Penyelesaian dan hasil

Kunci baris asesmen saat completion, validasi status/kelengkapan, dan gunakan satu transaksi untuk seluruh skor, trace, serta status COMPLETED. Request completion yang diulang pada sesi COMPLETED mengembalikan run sukses yang sudah ada, bukan membuat skor duplikat.

Jangan membuat hasil sebagian seolah-olah sukses. Jika centroid tidak terdefinisi atau konfigurasi gagal, simpan run FAILED dengan pesan aman dan jangan tandai asesmen COMPLETED. Catatan kegagalan dapat ditulis setelah transaksi perhitungan dibatalkan.

Satu run sukses memiliki tiga recommendation_scores dan tiga fuzzy_traces. Preferensi disimpan pada assessments dan hanya dipakai saat membandingkan hasil.

Model, soal, dan master yang sudah dirujuk tidak dihapus sembarangan. Gunakan nonaktif/arsip. Penghapusan draft yang belum dipakai hanya melalui service yang memastikan dependensinya aman.

## RAG-09 Kontrak API

Semua endpoint backend berada di /api/v1. Kontrak berikut adalah spesifikasi target, bukan klaim endpoint sudah tersedia. OpenAPI FastAPI harus sesuai dengan implementasinya.

### Konvensi

- Respons objek sukses: { "data": ... }. Respons daftar menambahkan meta berisi page, page_size, total, dan total_pages.
- Error: { "error": { "code": "...", "message": "...", "details": [], "request_id": "..." } }.
- page dimulai 1; page_size default 20, maksimum 100. Filter dan sort memiliki allowlist.
- 201 untuk pembuatan, 200 untuk pembacaan/perubahan/perhitungan, 204 untuk logout/penghapusan draft.
- 401 belum login; 403 hak tidak cukup; 404 tidak ditemukan/tidak dimiliki; 409 konflik status; 422 data invalid; 429 pembatasan request; 503 layanan/model belum siap.
- Jangan mengirim password_hash, token_hash, konfigurasi rahasia, stack trace, atau detail SQL.
- API perhitungan tidak menerima academic_score atau suitability_score sebagai nilai final dari client.

### Publik dan autentikasi

| Metode | Path | Fungsi |
|---|---|---|
| GET | /health/live | Liveness proses |
| GET | /health/ready | Koneksi DB, migrasi, dan master dasar siap |
| GET | /specializations | Daftar tiga peminatan aktif |
| GET | /auth/csrf | Token CSRF untuk request yang mengubah data |
| POST | /auth/login | Login admin dan cookie sesi |
| GET | /auth/me | Identitas admin aktif |
| POST | /auth/logout | Cabut sesi dan hapus cookie |

### Asesmen peserta

| Metode | Path | Fungsi |
|---|---|---|
| POST | /assessments | Buat sesi; body mode, semester, identitas FULL, preferensi opsional |
| GET | /assessments/{publicId} | Status dan progres sesi milik peserta |
| PATCH | /assessments/{publicId}/profile | Ubah identitas/preferensi sebelum terkunci |
| GET | /assessments/{publicId}/courses | MK dan pilihan nilai untuk versi sesi |
| GET | /assessments/{publicId}/grades/template?format=csv atau xlsx | Unduh template |
| POST | /assessments/{publicId}/grades/import | multipart file; validasi dan simpan paket sah |
| PUT | /assessments/{publicId}/grades | Simpan input manual secara atomik |
| GET | /assessments/{publicId}/grades | Nilai serta kesalahan/kelengkapan |
| POST | /assessments/{publicId}/test/start | Validasi akademik dan siapkan paket tetap |
| GET | /assessments/{publicId}/test/items | Soal/opsi dan jawaban tersimpan tanpa kunci |
| PUT | /assessments/{publicId}/test/items/{itemId}/answer | Simpan option_id |
| POST | /assessments/{publicId}/demo/fill-examples | DEMO saja; isi item contoh yang belum dijawab |
| POST | /assessments/{publicId}/complete | Validasi, hitung, dan simpan hasil |
| GET | /assessments/{publicId}/result | Tiga skor, ranking, alasan, dan perbandingan |
| GET | /assessments/{publicId}/result/trace?specialization_code=ES-01 | Detail trace dari run tersimpan |
| GET | /assessments/{publicId}/result/report.pdf | PDF hasil sesi milik peserta |

Pada DEMO, fill-examples tidak menimpa jawaban USER. Mode FULL menolak endpoint contoh. Masa berlaku awal sesi peserta diusulkan 24 jam, dapat diubah sebagai kebijakan aplikasi.

### Admin

| Metode | Path | Fungsi |
|---|---|---|
| GET | /admin/dashboard | Ringkasan dan aktivitas; filter mode/periode |
| GET | /admin/assessments | Daftar asesmen dengan paginasi/filter |
| GET | /admin/assessments/{publicId} | Detail hasil untuk admin |
| GET | /admin/reports/assessments.xlsx | Ekspor hasil sesuai filter |
| GET, POST | /admin/courses | Daftar/tambah master MK |
| PATCH | /admin/courses/{courseId} | Edit metadata atau nonaktifkan master |
| GET, POST | /admin/questions | Daftar/tambah soal DRAFT |
| GET, PATCH | /admin/questions/{questionId} | Detail/edit DRAFT beserta opsi |
| POST | /admin/questions/{questionId}/revisions | Buat revisi baru |
| POST | /admin/questions/{questionId}/publish | Validasi dan publikasi |
| POST | /admin/questions/{questionId}/archive | Arsip tanpa merusak sesi lama |
| GET, POST | /admin/fuzzy-models | Daftar/buat model DRAFT |
| GET | /admin/fuzzy-models/{versionId} | Konfigurasi versi lengkap |
| POST | /admin/fuzzy-models/{versionId}/clone | Kloning menjadi DRAFT |
| PUT | /admin/fuzzy-models/{versionId}/course-weights | Matriks bobot dan is_required |
| PUT | /admin/fuzzy-models/{versionId}/grade-conversions | Konversi nilai versi |
| PUT | /admin/fuzzy-models/{versionId}/variables | Domain dan arah variabel |
| PUT | /admin/fuzzy-models/{versionId}/sets | Fungsi keanggotaan |
| PUT | /admin/fuzzy-models/{versionId}/rules | Aturan per peminatan |
| GET, POST | /admin/fuzzy-models/{versionId}/validation-cases | Daftar/tambah skenario |
| PATCH | /admin/fuzzy-models/{versionId}/validation-cases/{caseId} | Edit input/ekspektasi DRAFT |
| POST | /admin/fuzzy-models/{versionId}/validate | Jalankan kasus dan simpan hasil aktual |
| POST | /admin/fuzzy-models/{versionId}/publish | Publish jika seluruh syarat terpenuhi |

Semua endpoint admin memeriksa sesi aktif di backend. Pemeriksaan pada layout Next.js hanya membantu navigasi, bukan pengganti otorisasi server.

### Contoh completion response

~~~json
{
  "data": {
    "assessment_id": "uuid-publik",
    "mode": "FULL",
    "run_id": "101",
    "model_version": "MODEL-001",
    "engine_version": "1.0.0",
    "preferred_specialization_code": "SC-02",
    "top_specialization_codes": ["ES-01"],
    "has_tie": false,
    "scores": [
      {
        "specialization_code": "ES-01",
        "academic_score": 90.0,
        "competency_score": 90.0,
        "suitability_score": 84.44444,
        "rank_position": 1,
        "reason": "Akademik dan kompetensi HIGH mengaktifkan kesesuaian HIGH pada model contoh."
      },
      {
        "specialization_code": "SC-02",
        "academic_score": 50.0,
        "competency_score": 50.0,
        "suitability_score": 50.0,
        "rank_position": 2,
        "reason": "Input MEDIUM mengaktifkan kesesuaian MEDIUM pada model contoh."
      },
      {
        "specialization_code": "JDF-03",
        "academic_score": 90.0,
        "competency_score": 0.0,
        "suitability_score": 50.0,
        "rank_position": 2,
        "reason": "Akademik HIGH dan kompetensi LOW mengaktifkan MEDIUM pada model contoh."
      }
    ],
    "preference_comparison": {
      "matches_top": false,
      "gap_to_top": 34.44444
    },
    "completed_at": "2026-10-13T03:00:00Z"
  }
}
~~~

Contoh ilustratif ini memakai parameter DRAFT pada RAG-10 untuk memperlihatkan bentuk data, bukan hasil peserta nyata. has_tie menunjukkan seri pada posisi teratas; peringkat kedua yang sama tetap ditampilkan sebagai seri. Semua angka, termasuk gap_to_top, dihitung dari hasil aktual dan tidak boleh di-hardcode.

## RAG-10 Spesifikasi perhitungan fuzzy

### Input dan output per peminatan

Setiap peminatan j mempunyai X1 = skor akademik terkait, X2 = skor kompetensi terkait, dan Y = skor kesesuaian. Domain awal 0–100. Rekomendasi dihitung terpisah untuk ketiga peminatan.

Preferensi tidak menjadi input fuzzy, tidak menambah skor, tidak mengganti bobot, dan tidak memecahkan seri.

### Skor akademik yang diusulkan

Untuk mata kuliah i yang mempunyai nilai sah:

A_j = Σ(g_i × sks_i × w_ij) / Σ(sks_i × w_ij)

g_i adalah normalized_score dari konversi versi sesi; sks_i berasal dari credits_snapshot; w_ij adalah bobot relevansi mata kuliah terhadap peminatan j dari model versi sesi.

Rumus ini merupakan keputusan implementasi yang perlu disepakati akademik. Jika disetujui, gunakan rumus yang sama di semua jalur dan cantumkan pada laporan. Contoh konversi awal: normalized_score = grade_points / 4 × 100; daftar nilai huruf dan grade_points wajib dikonfirmasi.

Bobot nol tidak menyumbang numerator/denominator. Nilai yang belum ada tidak diperlakukan sebagai nol. MK is_required yang belum mempunyai nilai memblokir FULL. MK lain yang belum dinilai dilaporkan sebagai cakupan data yang kurang, dan tidak dimasukkan denominator. Denominator nol adalah error kelengkapan, bukan skor nol.

### Skor kompetensi

C_j = 100 × Σ(awarded_points pada item peminatan j) / Σ(max_points pada paket peminatan j)

Jawaban benar memperoleh max_points, salah memperoleh 0. FULL hanya menerima seluruh jawaban USER. DEMO dapat menghitung dari campuran USER/EXAMPLE dengan ringkasan sumber jawaban dan label contoh. Jumlah soal dan bobot setiap item berasal dari paket yang disimpan.

### Fungsi keanggotaan

Tiap variabel mempunyai LOW, MEDIUM, dan HIGH, menggunakan TRIANGLE atau TRAPEZOID.

Triangle(a,b,c): naik linear a→b, turun linear b→c, bernilai 1 pada puncak b, dan 0 di luar dukungan. Trapezoid(a,b,c,d): naik a→b, plateau b→c, turun c→d. Semua nilai keanggotaan berada pada 0–1.

Tangani shoulder a=b dan c=d secara eksplisit agar tidak membagi nol. Validasi a≤b≤c dan, untuk trapesium, c≤d. Untuk TRIANGLE, point_d NULL. Cakupan gabungan himpunan tidak boleh menyisakan celah pada domain.

### Inferensi, implikasi, agregasi, centroid

1. Hitung semua derajat keanggotaan X1 dan X2.
2. Aktivasi anteseden memakai MIN untuk AND atau MAX untuk OR.
3. Terapkan rule_weight sebagai batas aktivasi: alpha = min(aktivasi_anteseden, rule_weight). Konvensi bobot ini harus konsisten dan diuji; nilai default usulan 1.
4. Implikasi Mamdani: mu_rule(z) = min(alpha, mu_consequent(z)).
5. Agregasi: mu_output(z) = max(mu_rule(z)) untuk seluruh aturan.
6. Centroid: Y = integral(z × mu_output(z)) / integral(mu_output(z)).
7. Implementasi numerik memakai integrasi trapesium pada grid termasuk kedua batas domain. Simpan sampling_step; usulan awal 0,1. Pastikan endpoint akhir domain tepat tercakup.
8. Denominator nol menghasilkan kegagalan perhitungan yang jelas; jangan memakai fallback 50 atau skor buatan.

### Parameter contoh untuk model DRAFT

Tabel berikut adalah contoh teknis yang belum ditetapkan sebagai model akademik resmi.

| Variabel | LOW | MEDIUM | HIGH |
|---|---|---|---|
| ACADEMIC | Trapesium (0,0,20,40) | Segitiga (20,50,80) | Trapesium (60,80,100,100) |
| COMPETENCY | Trapesium (0,0,20,40) | Segitiga (20,50,80) | Trapesium (60,80,100,100) |
| SUITABILITY | Trapesium (0,0,20,40) | Segitiga (20,50,80) | Trapesium (60,80,100,100) |

Usulan sembilan aturan per peminatan:

| Akademik \ Kompetensi | LOW | MEDIUM | HIGH |
|---|---|---|---|
| LOW | LOW | LOW | MEDIUM |
| MEDIUM | LOW | MEDIUM | HIGH |
| HIGH | MEDIUM | HIGH | HIGH |

Konsekuen pada tabel di atas perlu disetujui. Jangan menyatakan ini salinan parameter final Figma; desain menunjukkan metode dan contoh hasil, bukan persetujuan seluruh konfigurasi.

Sebagai pemeriksaan matematika untuk parameter contoh ini, X1=X2=90 mengaktifkan HIGH penuh dan menghasilkan centroid sekitar 84,44444. X1=X2=50 menghasilkan 50. Angka tersebut hanya berlaku pada parameter serta aturan contoh yang dinyatakan di sini; bukan konstanta hasil aplikasi.

### Ranking dan alasan

Urutkan suitability_score yang telah dikuantisasi lima desimal. Skor sama memperoleh rank_position yang sama, dengan competition ranking: 1,1,3. Urutan kode peminatan boleh menjadi urutan tampilan yang stabil, tetapi tidak memilih pemenang tunggal dari skor seri.

Jika skor tertinggi seri, hasil menampilkan seluruh peminatan teratas dan has_tie=true. gap_to_top = skor tertinggi − skor preferensi; matches_top berarti preferensi termasuk kelompok teratas.

Alasan menyebut input akademik, kompetensi, keanggotaan dominan, dan aturan yang berkontribusi. Jangan menyebut satu aturan aktif jika sebenarnya beberapa aturan berkontribusi. Hindari kalimat bahwa skor merupakan peluang kelulusan atau jaminan karier.

### Isi trace

memberships berisi nilai crisp dan seluruh derajat keanggotaan. rule_activations berisi rule_id/rule_code, peran set, derajat anteseden, bobot, alpha, dan konsekuen. aggregated_curve berisi domain, titik z, dan nilai agregasi. Kolom numerator, denominator, serta sampling_step menyimpan nilai aktual yang digunakan.

Tambahkan versi engine dan model pada respons. Halaman detail membaca trace yang disimpan, bukan menghitung ulang dengan konfigurasi terbaru. Referensi ID dalam JSON adalah snapshot penjelasan; jangan menggambarkannya sebagai FK SQL tambahan.

## RAG-11 Keamanan dan pengelolaan berkas

- Hash password admin dengan Argon2id. Buat admin awal melalui CLI interaktif, tanpa password default yang disimpan di Git.
- Gunakan sesi opaque acak minimal 32 byte; simpan hash token pada admin_sessions. Logout mengisi revoked_at dan menghapus cookie.
- Cookie sesi HttpOnly, SameSite=Lax, Secure pada HTTPS produksi, dengan masa berlaku. Usulan admin 8 jam dan peserta 24 jam.
- Request pengubah data memeriksa CSRF token serta Origin yang diizinkan. Jangan menganggap SameSite sebagai satu-satunya perlindungan.
- Perantara Next.js meneruskan cookie dan token CSRF, mempertahankan beberapa Set-Cookie, dan meneruskan status respons. Tujuan request hanya origin internal yang dikonfigurasi, bukan URL bebas dari client.
- Backend memeriksa sesi admin/kepemilikan asesmen pada setiap request termasuk unduhan dan trace.
- Terapkan pembatasan login dan upload. Jika menggunakan beberapa replica, pembatasan tidak boleh hanya mengandalkan memori satu proses.
- Log memakai request_id dan tidak mencatat password, token, cookie, isi lengkap transkrip, atau kredensial database. Audit menyimpan perubahan konfigurasi tanpa rahasia.
- Dukung hanya .csv dan .xlsx; bukan .xls, .xlsm, PDF, atau arsip bebas. Periksa struktur isi selain nama ekstensi.
- Batas awal usulan: 10 MB per berkas, 1.000 baris data, dan batas ukuran dekompresi XLSX. Tolak formula/makro, path traversal, dan data tidak sesuai template.
- Gunakan nama storage acak, lokasi unggahan privat, serta validasi MIME/struktur. Jangan menggunakan original_filename sebagai path penyimpanan.
- Ekspor CSV/XLSX mengamankan nilai yang dapat dianggap formula. Input asli tetap dicatat apa adanya bila diperlukan; sanitasi untuk ekspor bukan mengubah nilai akademik.
- MySQL berada pada jaringan Compose dan tidak dipublikasikan port-nya. Aplikasi memakai user database khusus, bukan root.
- DDL memakai RESTRICT dan arsip/nonaktif untuk mempertahankan hasil. Masa retensi unggahan, identitas, dan penghapusan data harus ditetapkan pemilik aplikasi sebelum produksi.

## RAG-12 Pengujian dan kriteria selesai

### Pengujian per lapisan

| Lapisan | Bukti yang diperlukan |
|---|---|
| Struktur/konfigurasi | TypeScript, lint, validasi Compose, dan dependensi terkunci |
| Database | Migrasi berjalan pada MySQL 8.4; FK, UNIQUE, CHECK, serta FK komposit diuji |
| Fuzzy | Unit test matematika, shoulder/batas, MIN/MAX, agregasi, centroid dan denominator nol |
| API | Validasi status, kepemilikan sesi, admin, upload gagal, jawaban salah soal, dan completion berulang |
| UI | Alur lengkap dengan loading/kosong/error/sukses serta pemeriksaan mobile/tablet/desktop |
| Laporan | PDF/XLSX benar-benar dihasilkan dan dapat dibuka; isi sesuai data sesi/filter |
| Docker | Build bersih, startup sehat, migrasi berhasil, persistensi volume, dan restart layanan |
| Produksi | TLS, cookie Secure, secret, backup/restore, otorisasi, dan model tervalidasi |

SQLite tidak menggantikan pengujian integrasi MySQL karena tipe, ENUM, CHECK, indeks, dan perilaku FK berbeda. Jalankan pengujian migrasi pada database uji terpisah; jangan downgrade atau menghapus volume database pengguna untuk pengujian.

### Rencana minimal sepuluh skenario fuzzy

| Kasus | X1 | X2 | Fokus pemeriksaan |
|---|---:|---:|---|
| S01 | 0 | 0 | Batas bawah dan shoulder LOW |
| S02 | 50 | 50 | Puncak MEDIUM |
| S03 | 90 | 90 | HIGH penuh dan centroid |
| S04 | 100 | 100 | Batas atas dan shoulder HIGH |
| S05 | 0 | 90 | Input bertolak belakang |
| S06 | 90 | 0 | Kebalikan input bertolak belakang |
| S07 | 25 | 25 | Overlap LOW/MEDIUM |
| S08 | 70 | 70 | Overlap MEDIUM/HIGH |
| S09 | 40 | 60 | Nilai batas fungsi dan beberapa aturan |
| S10 | 20 | 80 | Batas dukungan dan puncak shoulder |

Skenario ini merupakan rencana, bukan hasil uji. Tetapkan expected_min/expected_max melalui perhitungan referensi independen yang disetujui sebelum menjalankan validasi. Jalankan untuk konfigurasi setiap peminatan yang hendak dipublikasikan. Jangan mengisi rentang sangat lebar hanya agar semua kasus lulus.

Tambahkan pengujian invariansi: data akademik, kompetensi, dan model sama tetapi preferensi berbeda harus menghasilkan tiga skor identik. Tampilkan perbandingan yang berubah saja. Tambahkan kasus denominator nol, opsi dari soal lain, FULL dengan EXAMPLE, perubahan model setelah sesi dimulai, dan skor seri.

### Definition of Done

- Sembilan layar utama berfungsi sesuai desain, serta halaman admin pendukung fitur tersedia.
- Tidak ada hasil peserta yang berasal dari angka contoh hardcode.
- Semua 23 tabel aplikasi dan 34 relasi sesuai ERD; alembic_version boleh ada sebagai tabel teknis.
- FULL tidak dapat selesai tanpa nilai wajib dan seluruh jawaban nyata.
- DEMO ditandai jelas pada hasil, dashboard, laporan, dan ekspor.
- Model serta revisi soal yang telah dipakai tetap dapat ditelusuri.
- Tiga skor dan jejak hitung tersimpan atomik; hasil seri ditampilkan tanpa bias preferensi.
- File invalid tidak merusak data sebelumnya; endpoint file terlindungi.
- Hasil pengujian dilaporkan sesuai bukti. Build sukses tidak sama dengan verifikasi database, UI, atau deployment.
- Konfigurasi akademik masih DRAFT sampai divalidasi; selesai teknis tidak otomatis berarti layak sebagai kebijakan akademik.

## RAG-13 Tahapan pengerjaan

| Tahap | Keluaran | Syarat lanjut |
|---|---|---|
| 0 — Konfirmasi acuan | Node Figma, ERD, keputusan yang perlu validasi, dan backlog | Tidak ada salah identitas proyek/stack |
| 1 — Fondasi | Struktur, konfigurasi, Docker, healthcheck, migrasi 23 tabel, admin CLI | MySQL dan stack berjalan; admin dapat login |
| 2 — Master dan model | Mata kuliah, konversi, bobot, bank soal, draft fuzzy dan validasi | Instrumen/config lengkap dan teruji |
| 3 — Sesi dan nilai | Alur awal, template, impor/manual, validasi dan snapshot | Akademik siap tanpa bypass |
| 4 — Tes | Paket tetap, satu soal per layar, autosave, progres DEMO/FULL | Jawaban aman dan lengkap |
| 5 — Engine dan hasil | Fuzzy, ranking, trace, hasil dan detail | Uji matematika/invariansi lulus |
| 6 — Admin dan laporan | Dashboard, ekspor, PDF, audit dan histori | Data/berkas sesuai sesi dan filter |
| 7 — Penerimaan | UI responsif, keamanan, migrasi, persistensi, README | Bukti terpisah tiap lapisan dan daftar batas tersisa |

Implementasikan bertahap tanpa mengarang nilai akademik resmi untuk mempercepat demo. Seed demo boleh dibuat secara terpisah dengan label jelas. Master peminatan dapat di-seed; model contoh tetap DRAFT dan jangan otomatis dipublikasikan sebagai model kampus.

## RAG-14 Prompt implementasi untuk AI

Salin blok berikut ketika benar-benar siap meminta pembuatan kode. Dokumen ini sendiri tidak memberikan izin untuk menjalankan implementasi di sesi lain.

~~~text
Anda membantu membangun SI-PINAT dengan Next.js App Router + TypeScript,
FastAPI, MySQL 8.4, dan Docker.

Baca RAG_LENGKAP_SIPINAT.md sebagai acuan proyek. Cocokkan desain final
Figma Page 3 dan ERD tab 04 pada tautan dalam dokumen. Gunakan skill Figma
yang berlaku jika mengakses atau menerapkan desain.

Mulai dari tahap yang saya minta. Jangan mengimplementasikan tahap lain
tanpa kebutuhan yang jelas. Periksa kode yang sudah ada dan pertahankan
pekerjaan pengguna. Jangan menganggap starter berarti seluruh fitur selesai.

Aturan wajib:
1. Preferensi awal hanya pembanding; jangan memengaruhi skor atau seri.
2. Skor final dihitung FastAPI dari data yang divalidasi server.
3. Pertahankan 23 tabel aplikasi dan relasi komposit sesuai ERD.
4. Bedakan DEMO/EXAMPLE dari FULL/USER pada proses, hasil, dan laporan.
5. Kunci versi model pada asesmen. Jangan mengubah versi/soal yang dipakai.
6. Hasil dan trace harus konsisten serta tersimpan atomik.
7. Ikuti tampilan final; jangan menggantinya dengan template dashboard umum.
8. Angka/data prototipe tidak menjadi data resmi atau konstanta hasil.
9. Parameter akademik yang belum disetujui tetap DRAFT.
10. Lindungi endpoint admin dan hasil peserta pada backend.
11. Sertakan migrasi, Dockerfile frontend/backend, Compose, dan .env.example
    ketika tahap infrastruktur memang diminta.
12. Jangan memasang dependensi, mengubah file, atau menjalankan Docker bila
    tugas yang saya berikan hanya meminta penjelasan/dokumen.

Setelah mengerjakan tahap yang diminta, laporkan perubahan, pemeriksaan
yang benar-benar dijalankan, fitur yang belum ada, dan batas pengujian.
Jangan menyatakan deployment/database/UI terverifikasi tanpa bukti.
~~~

Untuk penggunaan dalam sistem retrieval, pecah konteks pada heading RAG-01 sampai RAG-18. Sertakan metadata project=SI-PINAT, version=1.0, source=Figma/ERD/keputusan/usulan, dan tanggal. Saat menjawab tentang database ambil RAG-08, RAG-15, RAG-17; tentang UI ambil RAG-04 dan RAG-06; tentang algoritma ambil RAG-10 dan RAG-12; tentang Docker ambil RAG-16. Jangan menggabungkan konteks produk SICMA reservasi ruangan.

## RAG-15 Kamus data dan relasi

Bagian ini memuat seluruh **23 tabel, 171 kolom, dan 34 relasi** dari ERD. Tabel teknis alembic_version tidak dihitung sebagai entitas aplikasi. Tipe dengan NULL diizinkan hanya pada kolom yang ditandai Ya.

Semua tabel memakai InnoDB, utf8mb4, dan PK BIGINT UNSIGNED. PK bernama id memakai AUTO_INCREMENT. PK/FK pada assessment_answers dan fuzzy_traces memakai ID induk dan tidak AUTO_INCREMENT. Semua FK bertipe sama dengan kolom target.

UNIQUE, indeks komposit, default timestamp/boolean, dan CHECK pada DDL merupakan perincian fisik implementasi. Aturan lintas tabel tetap diperiksa service. FK menggunakan RESTRICT; pengarsipan dan nonaktif mempertahankan riwayat.

### admin_users

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| full_name | VARCHAR(120) | — | Tidak |
| email | VARCHAR(190) | UK | Tidak |
| password_hash | VARCHAR(255) | — | Tidak |
| is_active | BOOLEAN | — | Tidak |
| created_at | DATETIME | — | Tidak |
| updated_at | DATETIME | — | Tidak |

- UK: email. Nonaktifkan akun; pertahankan riwayat.

Batasan fisik:

- UNIQUE (email)

### admin_sessions

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| admin_id | BIGINT UNSIGNED | FK | Tidak |
| token_hash | CHAR(64) | UK | Tidak |
| expires_at | DATETIME | — | Tidak |
| revoked_at | DATETIME | — | Ya |
| created_at | DATETIME | — | Tidak |

- Token disimpan sebagai hash; logout mencabut sesi.

Batasan fisik:

- UNIQUE (token_hash)

### audit_logs

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| admin_id | BIGINT UNSIGNED | FK | Ya |
| action | VARCHAR(80) | — | Tidak |
| entity_table | VARCHAR(80) | — | Tidak |
| entity_id | BIGINT UNSIGNED | — | Ya |
| before_data | JSON | — | Ya |
| after_data | JSON | — | Ya |
| created_at | DATETIME | — | Tidak |

- entity_id adalah konteks audit, bukan FK polimorfik.

### students

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| nim | VARCHAR(20) | UK | Ya |
| full_name | VARCHAR(120) | — | Tidak |
| class_name | VARCHAR(40) | — | Ya |
| created_at | DATETIME | — | Tidak |
| updated_at | DATETIME | — | Tidak |

- NIM berupa teks agar angka nol di awal tetap tersimpan.

Batasan fisik:

- UNIQUE (nim)

### specializations

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| code | VARCHAR(30) | UK | Tidak |
| name | VARCHAR(100) | — | Tidak |
| description | TEXT | — | Ya |
| is_active | BOOLEAN | — | Tidak |

- Embedded System; Sistem Cerdas; Jaringan & Digital Forensik.

Batasan fisik:

- UNIQUE (code)

### courses

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| code | VARCHAR(20) | UK | Tidak |
| name | VARCHAR(150) | — | Tidak |
| semester | TINYINT UNSIGNED | — | Tidak |
| credits | TINYINT UNSIGNED | — | Tidak |
| is_active | BOOLEAN | — | Tidak |
| updated_at | DATETIME | — | Tidak |

- Semester dan SKS divalidasi. Master lama dinonaktifkan.

Batasan fisik:

- UNIQUE (code)
- CHECK (semester BETWEEN 1 AND 4)
- CHECK (credits BETWEEN 1 AND 12)

### grade_conversions

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| model_version_id | BIGINT UNSIGNED | FK | Tidak |
| letter_grade | VARCHAR(3) | — | Tidak |
| grade_points | DECIMAL(3,2) | — | Tidak |
| normalized_score | DECIMAL(7,4) | — | Tidak |

- UK: (model_version_id, letter_grade).
- Nilai mutu 0–4; skor normalisasi 0–100.

Batasan fisik:

- UNIQUE (model_version_id, letter_grade)
- CHECK (grade_points BETWEEN 0 AND 4)
- CHECK (normalized_score BETWEEN 0 AND 100)

### course_weights

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| model_version_id | BIGINT UNSIGNED | FK | Tidak |
| course_id | BIGINT UNSIGNED | FK | Tidak |
| specialization_id | BIGINT UNSIGNED | FK | Tidak |
| weight | DECIMAL(6,5) | — | Tidak |
| is_required | BOOLEAN | — | Tidak |

- UK: (model_version_id, course_id, specialization_id).
- CHECK: 0 <= weight <= 1.

Batasan fisik:

- UNIQUE (model_version_id, course_id, specialization_id)
- CHECK (weight BETWEEN 0 AND 1)

### assessments

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| public_id | CHAR(36) | UK | Tidak |
| student_id | BIGINT UNSIGNED | FK | Ya |
| preferred_specialization_id | BIGINT UNSIGNED | FK | Ya |
| model_version_id | BIGINT UNSIGNED | FK | Tidak |
| access_token_hash | CHAR(64) | UK | Tidak |
| mode | ENUM | — | Tidak |
| status | ENUM | — | Tidak |
| current_semester | TINYINT UNSIGNED | — | Tidak |
| question_count | SMALLINT UNSIGNED | — | Tidak |
| created_at | DATETIME | — | Tidak |
| updated_at | DATETIME | — | Tidak |
| completed_at | DATETIME | — | Ya |
| expires_at | DATETIME | — | Ya |

- mode: DEMO / FULL. UK: (id, model_version_id).
- status: DRAFT / ACADEMIC_READY / IN_PROGRESS / COMPLETED.

Nilai mode: 'DEMO', 'FULL'.

Nilai status: 'DRAFT', 'ACADEMIC_READY', 'IN_PROGRESS', 'COMPLETED'.

Batasan fisik:

- UNIQUE (public_id)
- UNIQUE (access_token_hash)
- UNIQUE (id, model_version_id)
- CHECK (current_semester BETWEEN 1 AND 14)
- CHECK (question_count > 0)

### transcript_imports

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| assessment_id | BIGINT UNSIGNED | FK | Tidak |
| original_filename | VARCHAR(255) | — | Tidak |
| storage_key | VARCHAR(255) | — | Ya |
| file_hash | CHAR(64) | — | Tidak |
| status | ENUM | — | Tidak |
| validation_errors | JSON | — | Ya |
| created_at | DATETIME | — | Tidak |

- status: PENDING / VALID / INVALID.
- Baris invalid tidak menjadi nilai asesmen yang sah.

Nilai status: 'PENDING', 'VALID', 'INVALID'.

### assessment_grades

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| assessment_id | BIGINT UNSIGNED | FK | Tidak |
| course_id | BIGINT UNSIGNED | FK | Tidak |
| grade_conversion_id | BIGINT UNSIGNED | FK | Tidak |
| letter_grade | VARCHAR(3) | — | Tidak |
| normalized_score | DECIMAL(7,4) | — | Tidak |
| credits_snapshot | TINYINT UNSIGNED | — | Tidak |
| course_snapshot | JSON | — | Tidak |
| source | ENUM | — | Tidak |
| updated_at | DATETIME | — | Tidak |

- UK: (assessment_id, course_id). source: IMPORT / MANUAL.
- Snapshot menjaga data laporan saat master MK berubah.

Nilai source: 'IMPORT', 'MANUAL'.

Batasan fisik:

- UNIQUE (assessment_id, course_id)
- CHECK (normalized_score BETWEEN 0 AND 100)
- CHECK (credits_snapshot BETWEEN 1 AND 12)

### questions

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| specialization_id | BIGINT UNSIGNED | FK | Tidak |
| code | VARCHAR(32) | — | Tidak |
| revision | INT UNSIGNED | — | Tidak |
| prompt | TEXT | — | Tidak |
| explanation | TEXT | — | Ya |
| status | ENUM | — | Tidak |
| created_at | DATETIME | — | Tidak |

- UK: (code, revision). status: DRAFT / PUBLISHED / ARCHIVED.
- Soal yang sudah dipakai direvisi sebagai baris baru.

Nilai status: 'DRAFT', 'PUBLISHED', 'ARCHIVED'.

Batasan fisik:

- UNIQUE (code, revision)
- CHECK (revision > 0)

### question_options

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| question_id | BIGINT UNSIGNED | FK | Tidak |
| label | CHAR(1) | — | Tidak |
| option_text | TEXT | — | Tidak |
| is_correct | BOOLEAN | — | Tidak |

- UK: (question_id, label); UK: (question_id, id).
- Tepat satu pilihan benar untuk soal pilihan tunggal.

Batasan fisik:

- UNIQUE (question_id, label)
- UNIQUE (question_id, id)

### assessment_items

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| assessment_id | BIGINT UNSIGNED | FK | Tidak |
| question_id | BIGINT UNSIGNED | FK | Tidak |
| order_no | SMALLINT UNSIGNED | — | Tidak |
| max_points | DECIMAL(7,4) | — | Tidak |

- UK: (assessment_id, question_id), (assessment_id, order_no).
- UK: (id, question_id) untuk FK komposit jawaban.

Batasan fisik:

- UNIQUE (assessment_id, question_id)
- UNIQUE (assessment_id, order_no)
- UNIQUE (id, question_id)
- CHECK (order_no > 0)
- CHECK (max_points > 0 AND max_points <= 100)

### assessment_answers

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| assessment_item_id | BIGINT UNSIGNED | PK / FK | Tidak |
| question_id | BIGINT UNSIGNED | FK | Tidak |
| option_id | BIGINT UNSIGNED | FK | Tidak |
| answer_source | ENUM | — | Tidak |
| awarded_points | DECIMAL(7,4) | — | Tidak |
| answered_at | DATETIME | — | Tidak |

- answer_source: USER / EXAMPLE. Satu jawaban per item.
- FK komposit memastikan opsi berasal dari soal yang benar.

Nilai answer_source: 'USER', 'EXAMPLE'.

Batasan fisik:

- CHECK (awarded_points BETWEEN 0 AND 100)

### fuzzy_model_versions

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| version_code | VARCHAR(32) | UK | Tidak |
| method | ENUM | — | Tidak |
| defuzzification | ENUM | — | Tidak |
| sampling_step | DECIMAL(8,5) | — | Tidak |
| status | ENUM | — | Tidak |
| created_by | BIGINT UNSIGNED | FK | Tidak |
| created_at | DATETIME | — | Tidak |
| published_at | DATETIME | — | Ya |

- MAMDANI / CENTROID. status: DRAFT / PUBLISHED / ARCHIVED.
- Versi PUBLISHED tidak diubah; perbaikan membuat versi baru.

Nilai method: 'MAMDANI'.

Nilai defuzzification: 'CENTROID'.

Nilai status: 'DRAFT', 'PUBLISHED', 'ARCHIVED'.

Batasan fisik:

- UNIQUE (version_code)
- CHECK (sampling_step BETWEEN 0.01 AND 1)

### fuzzy_variables

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| model_version_id | BIGINT UNSIGNED | FK | Tidak |
| code | ENUM | — | Tidak |
| direction | ENUM | — | Tidak |
| domain_min | DECIMAL(7,4) | — | Tidak |
| domain_max | DECIMAL(7,4) | — | Tidak |

- UK: (model_version_id, code). direction: INPUT / OUTPUT.
- code: ACADEMIC / COMPETENCY / SUITABILITY.

Nilai code: 'ACADEMIC', 'COMPETENCY', 'SUITABILITY'.

Nilai direction: 'INPUT', 'OUTPUT'.

Batasan fisik:

- UNIQUE (model_version_id, code)
- CHECK (domain_min >= 0 AND domain_max <= 100 AND domain_min < domain_max)

### fuzzy_sets

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| variable_id | BIGINT UNSIGNED | FK | Tidak |
| code | ENUM | — | Tidak |
| shape | ENUM | — | Tidak |
| point_a | DECIMAL(7,4) | — | Tidak |
| point_b | DECIMAL(7,4) | — | Tidak |
| point_c | DECIMAL(7,4) | — | Tidak |
| point_d | DECIMAL(7,4) | — | Ya |

- UK: (variable_id, code). code: LOW / MEDIUM / HIGH.
- TRIANGLE: a,b,c. TRAPEZOID: a,b,c,d.

Nilai code: 'LOW', 'MEDIUM', 'HIGH'.

Nilai shape: 'TRIANGLE', 'TRAPEZOID'.

Batasan fisik:

- UNIQUE (variable_id, code)
- CHECK (point_a <= point_b AND point_b <= point_c)
- CHECK ((shape = 'TRIANGLE' AND point_d IS NULL) OR (shape = 'TRAPEZOID' AND point_d IS NOT NULL AND point_c <= point_d))

### fuzzy_rules

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| model_version_id | BIGINT UNSIGNED | FK | Tidak |
| specialization_id | BIGINT UNSIGNED | FK | Tidak |
| rule_code | VARCHAR(12) | — | Tidak |
| academic_set_id | BIGINT UNSIGNED | FK | Tidak |
| competency_set_id | BIGINT UNSIGNED | FK | Tidak |
| output_set_id | BIGINT UNSIGNED | FK | Tidak |
| operator | ENUM | — | Tidak |
| rule_weight | DECIMAL(6,5) | — | Tidak |

- UK: (model_version_id, specialization_id, rule_code).
- AND = MIN; OR = MAX. Agregasi MAX. Bobot 0–1.

Nilai operator: 'AND', 'OR'.

Batasan fisik:

- UNIQUE (model_version_id, specialization_id, rule_code)
- CHECK (rule_weight BETWEEN 0 AND 1)

### fuzzy_validation_cases

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| model_version_id | BIGINT UNSIGNED | FK | Tidak |
| specialization_id | BIGINT UNSIGNED | FK | Tidak |
| case_code | VARCHAR(32) | — | Tidak |
| academic_input | DECIMAL(7,4) | — | Tidak |
| competency_input | DECIMAL(7,4) | — | Tidak |
| expected_min | DECIMAL(8,5) | — | Tidak |
| expected_max | DECIMAL(8,5) | — | Tidak |
| last_actual_score | DECIMAL(8,5) | — | Ya |
| last_passed | BOOLEAN | — | Ya |
| last_tested_at | DATETIME | — | Ya |

- UK: (model_version_id, specialization_id, case_code).
- Hasil yang diharapkan ditetapkan dan disetujui sebelum uji.

Batasan fisik:

- UNIQUE (model_version_id, specialization_id, case_code)
- CHECK (academic_input BETWEEN 0 AND 100)
- CHECK (competency_input BETWEEN 0 AND 100)
- CHECK (expected_min >= 0 AND expected_max <= 100 AND expected_min <= expected_max)
- CHECK (last_actual_score IS NULL OR last_actual_score BETWEEN 0 AND 100)

### recommendation_runs

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| assessment_id | BIGINT UNSIGNED | FK | Tidak |
| model_version_id | BIGINT UNSIGNED | FK | Tidak |
| engine_version | VARCHAR(40) | — | Tidak |
| status | ENUM | — | Tidak |
| error_message | TEXT | — | Ya |
| calculated_at | DATETIME | — | Tidak |

- status: SUCCESS / FAILED.
- FK komposit (assessment_id, model_version_id) ke assessments.

Nilai status: 'SUCCESS', 'FAILED'.

### recommendation_scores

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK | Tidak |
| run_id | BIGINT UNSIGNED | FK | Tidak |
| specialization_id | BIGINT UNSIGNED | FK | Tidak |
| academic_score | DECIMAL(7,4) | — | Tidak |
| competency_score | DECIMAL(7,4) | — | Tidak |
| suitability_score | DECIMAL(8,5) | — | Tidak |
| rank_position | SMALLINT UNSIGNED | — | Tidak |
| reason | TEXT | — | Tidak |

- UK: (run_id, specialization_id). Skor 0–100.
- Peringkat boleh sama; aturan tie-break tidak memakai preferensi.

Batasan fisik:

- UNIQUE (run_id, specialization_id)
- CHECK (academic_score BETWEEN 0 AND 100)
- CHECK (competency_score BETWEEN 0 AND 100)
- CHECK (suitability_score BETWEEN 0 AND 100)
- CHECK (rank_position > 0)

### fuzzy_traces

| Kolom | Tipe MySQL | Kunci | NULL |
|---|---|---|---|
| score_id | BIGINT UNSIGNED | PK / FK | Tidak |
| memberships | JSON | — | Tidak |
| rule_activations | JSON | — | Tidak |
| aggregated_curve | JSON | — | Tidak |
| centroid_numerator | DECIMAL(20,10) | — | Tidak |
| centroid_denominator | DECIMAL(20,10) | — | Tidak |
| sampling_step | DECIMAL(8,5) | — | Tidak |

- Snapshot input, derajat keanggotaan, aturan dan kurva output.
- Run SUCCESS harus memiliki jejak; denominator > 0.

Batasan fisik:

- CHECK (centroid_denominator > 0)
- CHECK (sampling_step BETWEEN 0.01 AND 1)

### Relasi seluruh domain

| No. | Tabel induk | Tabel anak / FK | Induk per anak | Anak per induk |
|---|---|---|---|---|
| 1 | admin_users | audit_logs.admin_id | 0..1 | 0..N |
| 2 | admin_users | admin_sessions.admin_id | 1 | 0..N |
| 3 | fuzzy_model_versions | grade_conversions.model_version_id | 1 | 0..N |
| 4 | fuzzy_model_versions | course_weights.model_version_id | 1 | 0..N |
| 5 | specializations | course_weights.specialization_id | 1 | 0..N |
| 6 | courses | course_weights.course_id | 1 | 0..N |
| 7 | grade_conversions | assessment_grades.grade_conversion_id | 1 | 0..N |
| 8 | courses | assessment_grades.course_id | 1 | 0..N |
| 9 | assessments | assessment_grades.assessment_id | 1 | 0..N |
| 10 | assessments | transcript_imports.assessment_id | 1 | 0..N |
| 11 | fuzzy_model_versions | assessments.model_version_id | 1 | 0..N |
| 12 | specializations | assessments.preferred_specialization_id | 0..1 | 0..N |
| 13 | students | assessments.student_id | 0..1 | 0..N |
| 14 | question_options | assessment_answers.option_id | 1 | 0..N |
| 15 | assessment_items | assessment_answers.assessment_item_id | 1 | 0..1 |
| 16 | questions | assessment_items.question_id | 1 | 0..N |
| 17 | assessments | assessment_items.assessment_id | 1 | 0..N |
| 18 | questions | question_options.question_id | 1 | 0..N |
| 19 | specializations | questions.specialization_id | 1 | 0..N |
| 20 | specializations | fuzzy_validation_cases.specialization_id | 1 | 0..N |
| 21 | fuzzy_model_versions | fuzzy_validation_cases.model_version_id | 1 | 0..N |
| 22 | fuzzy_sets | fuzzy_rules.output_set_id | 1 | 0..N |
| 23 | fuzzy_sets | fuzzy_rules.competency_set_id | 1 | 0..N |
| 24 | fuzzy_sets | fuzzy_rules.academic_set_id | 1 | 0..N |
| 25 | specializations | fuzzy_rules.specialization_id | 1 | 0..N |
| 26 | fuzzy_model_versions | fuzzy_rules.model_version_id | 1 | 0..N |
| 27 | fuzzy_variables | fuzzy_sets.variable_id | 1 | 0..N |
| 28 | fuzzy_model_versions | fuzzy_variables.model_version_id | 1 | 0..N |
| 29 | admin_users | fuzzy_model_versions.created_by | 1 | 0..N |
| 30 | recommendation_scores | fuzzy_traces.score_id | 1 | 0..1 |
| 31 | specializations | recommendation_scores.specialization_id | 1 | 0..N |
| 32 | recommendation_runs | recommendation_scores.run_id | 1 | 0..N |
| 33 | fuzzy_model_versions | recommendation_runs.model_version_id | 1 | 0..N |
| 34 | assessments | recommendation_runs.assessment_id | 1 | 0..N |

### FK komposit yang wajib dipertahankan

~~~text
assessment_answers(assessment_item_id, question_id)
    → assessment_items(id, question_id)

assessment_answers(question_id, option_id)
    → question_options(question_id, id)

recommendation_runs(assessment_id, model_version_id)
    → assessments(id, model_version_id)
~~~

question_id pada assessment_answers berpartisipasi dalam dua FK komposit; tidak perlu menciptakan relasi baru ke tabel JSON atau menghitungnya sebagai tiga FK terpisah. Indeks UNIQUE target komposit wajib ada sebagaimana DDL.

### Pembagian enam kelompok ERD

| Kelompok | Tabel utama |
|---|---|
| A — Akses admin & audit | admin_users, admin_sessions, audit_logs |
| B — Mahasiswa & akademik | students, specializations, courses, course_weights, grade_conversions |
| C — Asesmen & transkrip | assessments, transcript_imports, assessment_grades |
| D — Bank soal & jawaban | questions, question_options, assessment_items, assessment_answers |
| E — Model fuzzy & validasi | fuzzy_model_versions, fuzzy_variables, fuzzy_sets, fuzzy_rules, fuzzy_validation_cases |
| F — Hasil & jejak | recommendation_runs, recommendation_scores, fuzzy_traces |

Tidak diperlukan tabel dashboard terpisah karena ringkasannya merupakan query agregasi. PDF/XLSX dapat dihasilkan dari hasil yang tersimpan; tidak perlu menambahkan tabel laporan hanya untuk tombol unduh. audit_logs.entity_id merupakan konteks, bukan FK polimorfik yang dipaksakan ke semua master.

## RAG-16 Docker dan cara menjalankan

Seluruh isi pada bagian ini merupakan contoh file yang dibuat **ketika implementasi diminta**. Tidak perlu menjalankan Docker atau membuat file aplikasi hanya karena membaca RAG.

### Prasyarat dan susunan layanan

Docker Desktop harus aktif dengan Linux containers dan Docker Compose v2 atau lebih baru. Build memerlukan akses registry image serta package registry. Frontend memakai Next.js standalone, backend berjalan sebagai proses Uvicorn, dan MySQL memakai volume persisten.

Urutan startup: MySQL healthy → migrate selesai sukses → backend healthy → frontend. Migrasi adalah layanan one-shot terpisah, bukan proses yang dijalankan semua replica backend saat startup. Contoh ini memakai build produksi untuk pengembangan lokal; perubahan kode memerlukan rebuild.

### Contoh .env.example

~~~dotenv
COMPOSE_PROJECT_NAME=sipinat
APP_ENV=development
MYSQL_DATABASE=sipinat
MYSQL_USER=sipinat
MYSQL_PASSWORD=CHANGE_ME_DB_PASSWORD
MYSQL_ROOT_PASSWORD=CHANGE_ME_ROOT_PASSWORD
APP_SECRET=CHANGE_ME_APP_SECRET
PUBLIC_ORIGIN=http://localhost:3000
COOKIE_SECURE=false
FRONTEND_PORT=3000
BACKEND_PORT=8000
~~~

MYSQL_PASSWORD hanya menjadi DB_PASSWORD pada environment backend melalui Compose. Backend tidak menerima MYSQL_ROOT_PASSWORD. APP_SECRET dipakai untuk kebutuhan penandatanganan/CSRF aplikasi dan tidak menjadi variabel publik frontend. Jika port frontend diganti, sesuaikan PUBLIC_ORIGIN.

### Contoh frontend/next.config.ts

~~~typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
~~~

### Contoh frontend/Dockerfile

~~~dockerfile
# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd --gid 1001 nextjs && useradd --uid 1001 --gid nextjs --create-home nextjs
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
~~~

package.json harus mempunyai script build yang menjalankan next build dan lockfile yang sudah dihasilkan. public harus tersedia meskipun hanya berisi .gitkeep. Runtime tidak memerlukan npm start karena standalone menghasilkan server.js.

API_INTERNAL_URL dibaca saat request di server, bukan dimasukkan ke next.config.env atau NEXT_PUBLIC_*. Font dapat disimpan lokal melalui next/font/local sehingga build tidak bergantung pada unduhan font eksternal.

### Contoh frontend/.dockerignore

~~~text
node_modules
.next
.git
.env
.env.*
*.tsbuildinfo
npm-debug.log*
~~~

### Dependensi backend dan lockfile

Daftar berikut adalah contoh requirements.in, bukan lockfile transitive. Paket inti berikut telah dibaca dari registry resmi pada penyusunan konteks ini. Tambahan fitur menggunakan batas major sebagai awal resolusi, lalu seluruh dependensi dikunci dan diuji pada Python 3.12/Linux.

~~~text
fastapi==0.143.0
uvicorn==0.54.0
SQLAlchemy==2.1.4
PyMySQL==1.2.3
cryptography==50.0.2
alembic==1.20.0
pydantic-settings==2.15.0
numpy>=2,<3
openpyxl>=3.1,<4
python-multipart>=0.0.20,<1
argon2-cffi>=25.1,<26
reportlab>=4,<5
~~~

Gunakan pip-tools untuk menghasilkan requirements.txt dengan hash seluruh dependensi. Resolusi lockfile dijalankan pada target Python/Linux yang sama dengan image; jangan menganggap lock hasil platform lain otomatis setara.

Contoh perintah PowerShell pada root proyek, setelah file requirements.in benar-benar dibuat:

~~~powershell
docker run --rm -v "${PWD}/backend:/work" -w /work python:3.12-slim-bookworm sh -c "pip install pip-tools && pip-compile --generate-hashes --output-file=requirements.txt requirements.in"
~~~

Dependensi pengujian ditempatkan pada requirements-dev.txt/lock pengembangan terpisah. Perbarui versi dan digest image secara terencana setelah pemeriksaan kompatibilitas/keamanan, bukan otomatis saat setiap startup.

### Contoh backend/Dockerfile

~~~dockerfile
# syntax=docker/dockerfile:1
FROM python:3.12-slim-bookworm AS dependencies
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /build
RUN python -m venv /opt/venv
COPY requirements.txt .
RUN /opt/venv/bin/pip install --no-cache-dir --require-hashes -r requirements.txt

FROM python:3.12-slim-bookworm AS runner
ENV PATH="/opt/venv/bin:$PATH" PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY --from=dependencies /opt/venv /opt/venv
RUN groupadd --gid 10001 app && useradd --uid 10001 --gid app --create-home app \
    && mkdir -p /app/storage/uploads && chown -R app:app /app
COPY --chown=app:app app ./app
COPY --chown=app:app alembic ./alembic
COPY --chown=app:app alembic.ini .
USER app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
~~~

### Contoh backend/.dockerignore

~~~text
.venv
__pycache__
*.pyc
.git
.env
.env.*
storage
.pytest_cache
.ruff_cache
~~~

### Contoh compose.yaml

~~~yaml
name: ${COMPOSE_PROJECT_NAME:-sipinat}

x-backend: &backend
  image: sipinat-backend:local
  build:
    context: ./backend
  environment:
    APP_ENV: ${APP_ENV:-development}
    APP_SECRET: ${APP_SECRET:?Set APP_SECRET in .env}
    PUBLIC_ORIGIN: ${PUBLIC_ORIGIN:-http://localhost:3000}
    COOKIE_SECURE: "${COOKIE_SECURE:-false}"
    DB_HOST: mysql
    DB_PORT: 3306
    DB_NAME: ${MYSQL_DATABASE:-sipinat}
    DB_USER: ${MYSQL_USER:-sipinat}
    DB_PASSWORD: ${MYSQL_PASSWORD:?Set MYSQL_PASSWORD in .env}
    UPLOAD_DIR: /app/storage/uploads
  init: true

services:
  mysql:
    image: mysql:8.4
    environment:
      MYSQL_DATABASE: ${MYSQL_DATABASE:-sipinat}
      MYSQL_USER: ${MYSQL_USER:-sipinat}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:?Set MYSQL_PASSWORD in .env}
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:?Set MYSQL_ROOT_PASSWORD in .env}
      TZ: UTC
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_0900_ai_ci
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD-SHELL", "MYSQL_PWD=$$MYSQL_PASSWORD mysql --connect-timeout=2 -h 127.0.0.1 -u $$MYSQL_USER $$MYSQL_DATABASE -e 'SELECT 1' >/dev/null 2>&1"]
      interval: 5s
      timeout: 4s
      retries: 30
      start_period: 30s
    restart: unless-stopped

  migrate:
    <<: *backend
    command: ["alembic", "upgrade", "head"]
    depends_on:
      mysql:
        condition: service_healthy
    restart: "no"

  backend:
    <<: *backend
    ports:
      - "127.0.0.1:${BACKEND_PORT:-8000}:8000"
    volumes:
      - uploads:/app/storage/uploads
    depends_on:
      mysql:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health/ready', timeout=3)"]
      interval: 10s
      timeout: 4s
      retries: 12
      start_period: 15s
    restart: unless-stopped

  frontend:
    image: sipinat-frontend:local
    build:
      context: ./frontend
    environment:
      API_INTERNAL_URL: http://backend:8000
      HOSTNAME: 0.0.0.0
      PORT: 3000
    ports:
      - "127.0.0.1:${FRONTEND_PORT:-3000}:3000"
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 20s
    init: true
    restart: unless-stopped

volumes:
  mysql_data:
  uploads:
~~~

### Health endpoint yang harus diimplementasikan

- Backend /api/v1/health/live: proses API dapat melayani request.
- Backend /api/v1/health/ready: DB dapat diakses, revisi Alembic sudah sesuai target, seluruh tabel aplikasi tersedia, dan master tiga peminatan ada. Kesiapan infrastruktur tidak mensyaratkan model akademik sudah PUBLISHED.
- Frontend /api/health/live: proses Next.js hidup; tidak bergantung pada backend.
- Frontend /api/health: request server-side menuju backend ready dan mengembalikan 503 jika rantai layanan belum siap. Gunakan cache no-store, timeout, dan pesan aman.

Next.js harus mempunyai runtime Route Handler untuk perantara API. Jangan memakai rewrite yang memasukkan URL environment build secara tetap ketika dibutuhkan perubahan URL pada runtime. Endpoint file/proxy harus mempertahankan header Content-Type, Content-Disposition, status, dan cookie tanpa meneruskan header hop-by-hop.

### Langkah startup setelah aplikasi diimplementasikan

1. Pastikan Docker Desktop aktif.
2. Pastikan source, package-lock.json, requirements.txt ber-hash, migrasi Alembic, dan health endpoint telah dibuat.
3. Buat .env lokal dari contoh dengan password/secret acak. Jangan timpa .env yang sudah ada.

Contoh PowerShell yang membuat .env hanya ketika belum ada:

~~~powershell
if (Test-Path -LiteralPath '.env') { throw '.env sudah ada; tidak ditimpa.' }
function New-ProjectSecret {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
}
$content = Get-Content -LiteralPath '.env.example' -Raw
$content = $content.Replace('CHANGE_ME_DB_PASSWORD', (New-ProjectSecret))
$content = $content.Replace('CHANGE_ME_ROOT_PASSWORD', (New-ProjectSecret))
$content = $content.Replace('CHANGE_ME_APP_SECRET', (New-ProjectSecret))
[System.IO.File]::WriteAllText((Join-Path (Get-Location).Path '.env'), $content, (New-Object System.Text.UTF8Encoding($false)))
~~~

4. Validasi konfigurasi tanpa menampilkan isi secret.

~~~powershell
docker compose config --quiet
~~~

5. Build dan jalankan.

~~~powershell
docker compose up -d --build
~~~

6. Lihat status layanan dan hasil migrasi.

~~~powershell
docker compose ps -a
~~~

~~~powershell
docker compose logs --tail=100 migrate backend frontend
~~~

7. Buka http://localhost:3000, periksa http://localhost:3000/api/health, dan dokumentasi API lokal http://localhost:8000/docs.
8. Buat admin melalui CLI interaktif setelah CLI diimplementasikan. Perintah berikut adalah target, bukan perintah yang dijamin tersedia pada starter sebelumnya.

~~~powershell
docker compose exec backend python -m app.cli.create_admin
~~~

9. Masukkan dataset/config yang disetujui, jalankan validasi, dan publikasikan model dari admin. Jika belum ada model, UI menjelaskan bahwa asesmen belum siap; jangan menggantinya dengan model contoh tanpa label.

### Operasional dan produksi

- Hentikan layanan dengan docker compose down; volume data dipertahankan. Penghapusan volume adalah tindakan terpisah yang menghapus database, sehingga tidak dipakai untuk restart biasa.
- Perubahan skema memakai revisi Alembic baru. Jangan mengandalkan create_all atau file init SQL untuk upgrade database yang sudah berisi data.
- DDL MySQL tidak sepenuhnya transaksional; kegagalan migrasi perlu ditinjau dan dipulihkan, bukan ditutupi dengan drop semua tabel otomatis.
- Backup mencakup MySQL serta volume unggahan. Uji restore pada lingkungan terpisah sebelum menyatakan backup dapat diandalkan.
- Konfigurasi di atas mengikat port ke localhost untuk penggunaan lokal. Deploy VPS memerlukan reverse proxy HTTPS yang dapat menjangkau layanan, konfigurasi domain/origin, dan COOKIE_SECURE=true.
- Jangan mempublikasikan port MySQL atau backend ke internet secara otomatis. Untuk produksi, batasi akses API sesuai arsitektur proxy dan bedakan kredensial migrasi/runtime bila kebijakan operasional mengharuskannya.
- Cek liveness dan readiness secara terpisah. Kebijakan restart Compose tidak otomatis merestart container hanya karena status unhealthy.
- Build image, startup container, migrasi, persistensi data, alur UI, dan deployment dicatat sebagai bukti terpisah. Dokumen RAG ini tidak menyatakan pemeriksaan runtime tersebut sudah lulus.

## RAG-17 DDL referensi MySQL

DDL berikut adalah rancangan fisik untuk migrasi awal MySQL 8.4 berdasarkan ERD. Ini bukan bukti database telah dibuat atau diuji pada server MySQL. Buat revisi Alembic dari definisi ini dan uji pada database terpisah ketika implementasi diminta.

Default, UNIQUE komposit, dan CHECK memperinci kontrak implementasi. Pastikan domain semester/SKS serta kebijakan batas lainnya disetujui bersama kebutuhan kurikulum. Jangan menerapkan SQL ini kembali pada database yang sudah dikelola migrasi. Tidak ada password admin, mahasiswa contoh, atau model PUBLISHED yang di-seed.

~~~sql
CREATE TABLE `admin_users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `full_name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(190) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_admin_users_1` UNIQUE (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `admin_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id` BIGINT UNSIGNED NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `revoked_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_admin_sessions_1` UNIQUE (`token_hash`),
  CONSTRAINT `fk_admin_sessions_admin_id` FOREIGN KEY (`admin_id`) REFERENCES `admin_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id` BIGINT UNSIGNED NULL,
  `action` VARCHAR(80) NOT NULL,
  `entity_table` VARCHAR(80) NOT NULL,
  `entity_id` BIGINT UNSIGNED NULL,
  `before_data` JSON NULL,
  `after_data` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_audit_logs_admin_id` FOREIGN KEY (`admin_id`) REFERENCES `admin_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `students` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nim` VARCHAR(20) NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `class_name` VARCHAR(40) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_students_1` UNIQUE (`nim`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `specializations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(30) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_specializations_1` UNIQUE (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `courses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(20) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `semester` TINYINT UNSIGNED NOT NULL,
  `credits` TINYINT UNSIGNED NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_courses_1` UNIQUE (`code`),
  CONSTRAINT `ck_courses_1` CHECK (semester BETWEEN 1 AND 4),
  CONSTRAINT `ck_courses_2` CHECK (credits BETWEEN 1 AND 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `questions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `specialization_id` BIGINT UNSIGNED NOT NULL,
  `code` VARCHAR(32) NOT NULL,
  `revision` INT UNSIGNED NOT NULL,
  `prompt` TEXT NOT NULL,
  `explanation` TEXT NULL,
  `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_questions_1` UNIQUE (`code`, `revision`),
  CONSTRAINT `fk_questions_specialization_id` FOREIGN KEY (`specialization_id`) REFERENCES `specializations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_questions_1` CHECK (revision > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `question_options` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `question_id` BIGINT UNSIGNED NOT NULL,
  `label` CHAR(1) NOT NULL,
  `option_text` TEXT NOT NULL,
  `is_correct` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_question_options_1` UNIQUE (`question_id`, `label`),
  CONSTRAINT `uq_question_options_2` UNIQUE (`question_id`, `id`),
  CONSTRAINT `fk_question_options_question_id` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `fuzzy_model_versions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `version_code` VARCHAR(32) NOT NULL,
  `method` ENUM('MAMDANI') NOT NULL,
  `defuzzification` ENUM('CENTROID') NOT NULL,
  `sampling_step` DECIMAL(8,5) NOT NULL,
  `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `published_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_fuzzy_model_versions_1` UNIQUE (`version_code`),
  CONSTRAINT `fk_fuzzy_model_versions_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_fuzzy_model_versions_1` CHECK (sampling_step BETWEEN 0.01 AND 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `grade_conversions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `model_version_id` BIGINT UNSIGNED NOT NULL,
  `letter_grade` VARCHAR(3) NOT NULL,
  `grade_points` DECIMAL(3,2) NOT NULL,
  `normalized_score` DECIMAL(7,4) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_grade_conversions_1` UNIQUE (`model_version_id`, `letter_grade`),
  CONSTRAINT `fk_grade_conversions_model_version_id` FOREIGN KEY (`model_version_id`) REFERENCES `fuzzy_model_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_grade_conversions_1` CHECK (grade_points BETWEEN 0 AND 4),
  CONSTRAINT `ck_grade_conversions_2` CHECK (normalized_score BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `course_weights` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `model_version_id` BIGINT UNSIGNED NOT NULL,
  `course_id` BIGINT UNSIGNED NOT NULL,
  `specialization_id` BIGINT UNSIGNED NOT NULL,
  `weight` DECIMAL(6,5) NOT NULL,
  `is_required` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_course_weights_1` UNIQUE (`model_version_id`, `course_id`, `specialization_id`),
  CONSTRAINT `fk_course_weights_model_version_id` FOREIGN KEY (`model_version_id`) REFERENCES `fuzzy_model_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_course_weights_specialization_id` FOREIGN KEY (`specialization_id`) REFERENCES `specializations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_course_weights_course_id` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_course_weights_1` CHECK (weight BETWEEN 0 AND 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `assessments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` CHAR(36) NOT NULL,
  `student_id` BIGINT UNSIGNED NULL,
  `preferred_specialization_id` BIGINT UNSIGNED NULL,
  `model_version_id` BIGINT UNSIGNED NOT NULL,
  `access_token_hash` CHAR(64) NOT NULL,
  `mode` ENUM('DEMO', 'FULL') NOT NULL,
  `status` ENUM('DRAFT', 'ACADEMIC_READY', 'IN_PROGRESS', 'COMPLETED') NOT NULL,
  `current_semester` TINYINT UNSIGNED NOT NULL,
  `question_count` SMALLINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completed_at` DATETIME NULL,
  `expires_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_assessments_1` UNIQUE (`public_id`),
  CONSTRAINT `uq_assessments_2` UNIQUE (`access_token_hash`),
  CONSTRAINT `uq_assessments_3` UNIQUE (`id`, `model_version_id`),
  CONSTRAINT `fk_assessments_model_version_id` FOREIGN KEY (`model_version_id`) REFERENCES `fuzzy_model_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_assessments_preferred_specialization_id` FOREIGN KEY (`preferred_specialization_id`) REFERENCES `specializations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_assessments_student_id` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_assessments_1` CHECK (current_semester BETWEEN 1 AND 14),
  CONSTRAINT `ck_assessments_2` CHECK (question_count > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `transcript_imports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `assessment_id` BIGINT UNSIGNED NOT NULL,
  `original_filename` VARCHAR(255) NOT NULL,
  `storage_key` VARCHAR(255) NULL,
  `file_hash` CHAR(64) NOT NULL,
  `status` ENUM('PENDING', 'VALID', 'INVALID') NOT NULL,
  `validation_errors` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_transcript_imports_assessment_id` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `assessment_grades` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `assessment_id` BIGINT UNSIGNED NOT NULL,
  `course_id` BIGINT UNSIGNED NOT NULL,
  `grade_conversion_id` BIGINT UNSIGNED NOT NULL,
  `letter_grade` VARCHAR(3) NOT NULL,
  `normalized_score` DECIMAL(7,4) NOT NULL,
  `credits_snapshot` TINYINT UNSIGNED NOT NULL,
  `course_snapshot` JSON NOT NULL,
  `source` ENUM('IMPORT', 'MANUAL') NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_assessment_grades_1` UNIQUE (`assessment_id`, `course_id`),
  CONSTRAINT `fk_assessment_grades_grade_conversion_id` FOREIGN KEY (`grade_conversion_id`) REFERENCES `grade_conversions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_assessment_grades_course_id` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_assessment_grades_assessment_id` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_assessment_grades_1` CHECK (normalized_score BETWEEN 0 AND 100),
  CONSTRAINT `ck_assessment_grades_2` CHECK (credits_snapshot BETWEEN 1 AND 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `assessment_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `assessment_id` BIGINT UNSIGNED NOT NULL,
  `question_id` BIGINT UNSIGNED NOT NULL,
  `order_no` SMALLINT UNSIGNED NOT NULL,
  `max_points` DECIMAL(7,4) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_assessment_items_1` UNIQUE (`assessment_id`, `question_id`),
  CONSTRAINT `uq_assessment_items_2` UNIQUE (`assessment_id`, `order_no`),
  CONSTRAINT `uq_assessment_items_3` UNIQUE (`id`, `question_id`),
  CONSTRAINT `fk_assessment_items_question_id` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_assessment_items_assessment_id` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_assessment_items_1` CHECK (order_no > 0),
  CONSTRAINT `ck_assessment_items_2` CHECK (max_points > 0 AND max_points <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `assessment_answers` (
  `assessment_item_id` BIGINT UNSIGNED NOT NULL,
  `question_id` BIGINT UNSIGNED NOT NULL,
  `option_id` BIGINT UNSIGNED NOT NULL,
  `answer_source` ENUM('USER', 'EXAMPLE') NOT NULL,
  `awarded_points` DECIMAL(7,4) NOT NULL,
  `answered_at` DATETIME NOT NULL,
  PRIMARY KEY (`assessment_item_id`),
  CONSTRAINT `fk_assessment_answers_option_id` FOREIGN KEY (`question_id`, `option_id`) REFERENCES `question_options` (`question_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_assessment_answers_assessment_item_id` FOREIGN KEY (`assessment_item_id`, `question_id`) REFERENCES `assessment_items` (`id`, `question_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_assessment_answers_1` CHECK (awarded_points BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `fuzzy_variables` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `model_version_id` BIGINT UNSIGNED NOT NULL,
  `code` ENUM('ACADEMIC', 'COMPETENCY', 'SUITABILITY') NOT NULL,
  `direction` ENUM('INPUT', 'OUTPUT') NOT NULL,
  `domain_min` DECIMAL(7,4) NOT NULL,
  `domain_max` DECIMAL(7,4) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_fuzzy_variables_1` UNIQUE (`model_version_id`, `code`),
  CONSTRAINT `fk_fuzzy_variables_model_version_id` FOREIGN KEY (`model_version_id`) REFERENCES `fuzzy_model_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_fuzzy_variables_1` CHECK (domain_min >= 0 AND domain_max <= 100 AND domain_min < domain_max)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `fuzzy_sets` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `variable_id` BIGINT UNSIGNED NOT NULL,
  `code` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
  `shape` ENUM('TRIANGLE', 'TRAPEZOID') NOT NULL,
  `point_a` DECIMAL(7,4) NOT NULL,
  `point_b` DECIMAL(7,4) NOT NULL,
  `point_c` DECIMAL(7,4) NOT NULL,
  `point_d` DECIMAL(7,4) NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_fuzzy_sets_1` UNIQUE (`variable_id`, `code`),
  CONSTRAINT `fk_fuzzy_sets_variable_id` FOREIGN KEY (`variable_id`) REFERENCES `fuzzy_variables` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_fuzzy_sets_1` CHECK (point_a <= point_b AND point_b <= point_c),
  CONSTRAINT `ck_fuzzy_sets_2` CHECK ((shape = 'TRIANGLE' AND point_d IS NULL) OR (shape = 'TRAPEZOID' AND point_d IS NOT NULL AND point_c <= point_d))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `fuzzy_rules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `model_version_id` BIGINT UNSIGNED NOT NULL,
  `specialization_id` BIGINT UNSIGNED NOT NULL,
  `rule_code` VARCHAR(12) NOT NULL,
  `academic_set_id` BIGINT UNSIGNED NOT NULL,
  `competency_set_id` BIGINT UNSIGNED NOT NULL,
  `output_set_id` BIGINT UNSIGNED NOT NULL,
  `operator` ENUM('AND', 'OR') NOT NULL,
  `rule_weight` DECIMAL(6,5) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_fuzzy_rules_1` UNIQUE (`model_version_id`, `specialization_id`, `rule_code`),
  CONSTRAINT `fk_fuzzy_rules_output_set_id` FOREIGN KEY (`output_set_id`) REFERENCES `fuzzy_sets` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_fuzzy_rules_competency_set_id` FOREIGN KEY (`competency_set_id`) REFERENCES `fuzzy_sets` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_fuzzy_rules_academic_set_id` FOREIGN KEY (`academic_set_id`) REFERENCES `fuzzy_sets` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_fuzzy_rules_specialization_id` FOREIGN KEY (`specialization_id`) REFERENCES `specializations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_fuzzy_rules_model_version_id` FOREIGN KEY (`model_version_id`) REFERENCES `fuzzy_model_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_fuzzy_rules_1` CHECK (rule_weight BETWEEN 0 AND 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `fuzzy_validation_cases` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `model_version_id` BIGINT UNSIGNED NOT NULL,
  `specialization_id` BIGINT UNSIGNED NOT NULL,
  `case_code` VARCHAR(32) NOT NULL,
  `academic_input` DECIMAL(7,4) NOT NULL,
  `competency_input` DECIMAL(7,4) NOT NULL,
  `expected_min` DECIMAL(8,5) NOT NULL,
  `expected_max` DECIMAL(8,5) NOT NULL,
  `last_actual_score` DECIMAL(8,5) NULL,
  `last_passed` BOOLEAN NULL,
  `last_tested_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_fuzzy_validation_cases_1` UNIQUE (`model_version_id`, `specialization_id`, `case_code`),
  CONSTRAINT `fk_fuzzy_validation_cases_specialization_id` FOREIGN KEY (`specialization_id`) REFERENCES `specializations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_fuzzy_validation_cases_model_version_id` FOREIGN KEY (`model_version_id`) REFERENCES `fuzzy_model_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_fuzzy_validation_cases_1` CHECK (academic_input BETWEEN 0 AND 100),
  CONSTRAINT `ck_fuzzy_validation_cases_2` CHECK (competency_input BETWEEN 0 AND 100),
  CONSTRAINT `ck_fuzzy_validation_cases_3` CHECK (expected_min >= 0 AND expected_max <= 100 AND expected_min <= expected_max),
  CONSTRAINT `ck_fuzzy_validation_cases_4` CHECK (last_actual_score IS NULL OR last_actual_score BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `recommendation_runs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `assessment_id` BIGINT UNSIGNED NOT NULL,
  `model_version_id` BIGINT UNSIGNED NOT NULL,
  `engine_version` VARCHAR(40) NOT NULL,
  `status` ENUM('SUCCESS', 'FAILED') NOT NULL,
  `error_message` TEXT NULL,
  `calculated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_recommendation_runs_model_version_id` FOREIGN KEY (`model_version_id`) REFERENCES `fuzzy_model_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_recommendation_runs_assessment_id` FOREIGN KEY (`assessment_id`, `model_version_id`) REFERENCES `assessments` (`id`, `model_version_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `recommendation_scores` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `run_id` BIGINT UNSIGNED NOT NULL,
  `specialization_id` BIGINT UNSIGNED NOT NULL,
  `academic_score` DECIMAL(7,4) NOT NULL,
  `competency_score` DECIMAL(7,4) NOT NULL,
  `suitability_score` DECIMAL(8,5) NOT NULL,
  `rank_position` SMALLINT UNSIGNED NOT NULL,
  `reason` TEXT NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_recommendation_scores_1` UNIQUE (`run_id`, `specialization_id`),
  CONSTRAINT `fk_recommendation_scores_specialization_id` FOREIGN KEY (`specialization_id`) REFERENCES `specializations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_recommendation_scores_run_id` FOREIGN KEY (`run_id`) REFERENCES `recommendation_runs` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_recommendation_scores_1` CHECK (academic_score BETWEEN 0 AND 100),
  CONSTRAINT `ck_recommendation_scores_2` CHECK (competency_score BETWEEN 0 AND 100),
  CONSTRAINT `ck_recommendation_scores_3` CHECK (suitability_score BETWEEN 0 AND 100),
  CONSTRAINT `ck_recommendation_scores_4` CHECK (rank_position > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `fuzzy_traces` (
  `score_id` BIGINT UNSIGNED NOT NULL,
  `memberships` JSON NOT NULL,
  `rule_activations` JSON NOT NULL,
  `aggregated_curve` JSON NOT NULL,
  `centroid_numerator` DECIMAL(20,10) NOT NULL,
  `centroid_denominator` DECIMAL(20,10) NOT NULL,
  `sampling_step` DECIMAL(8,5) NOT NULL,
  PRIMARY KEY (`score_id`),
  CONSTRAINT `fk_fuzzy_traces_score_id` FOREIGN KEY (`score_id`) REFERENCES `recommendation_scores` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_fuzzy_traces_1` CHECK (centroid_denominator > 0),
  CONSTRAINT `ck_fuzzy_traces_2` CHECK (sampling_step BETWEEN 0.01 AND 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO specializations (code, name, description, is_active) VALUES ('ES-01', 'Embedded System', NULL, TRUE), ('SC-02', 'Sistem Cerdas', NULL, TRUE), ('JDF-03', 'Jaringan & Digital Forensik', NULL, TRUE);
~~~

## RAG-18 Referensi teknis

Referensi primer untuk implementasi dan pemeriksaan lanjutan:

- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
- [FastAPI dalam Docker](https://fastapi.tiangolo.com/deployment/docker/)
- [SQLAlchemy documentation](https://docs.sqlalchemy.org/)
- [Alembic tutorial](https://alembic.sqlalchemy.org/en/latest/tutorial.html)
- [MySQL 8.4 foreign keys](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html)
- [MySQL 8.4 data types](https://dev.mysql.com/doc/refman/8.4/en/data-types.html)
- [Docker Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/)
- [Registry resmi Next.js](https://registry.npmjs.org/next/latest)
- [Registry resmi React](https://registry.npmjs.org/react/latest)
- [PyPI FastAPI](https://pypi.org/project/fastapi/)

Periksa versi dan API terkini ketika benar-benar mengimplementasikan. Referensi ini tidak menggantikan keputusan akademik pemilik sistem.

### Checklist serah terima konteks

- [ ] Developer membaca batas simulasi dan parameter yang belum disetujui.
- [ ] Desain menggunakan Page 3 SI-PINAT, bukan file reservasi ruang SICMA.
- [ ] Perubahan terhadap 23 tabel atau alur utama dicatat dan disetujui bila material.
- [ ] Parameter resmi, soal, serta dataset mempunyai sumber yang jelas.
- [ ] Implementasi dilaporkan berdasarkan fitur yang berfungsi dan pengujian yang dijalankan.
- [ ] Status deployment dan URL live dinyatakan terpisah dari status source code.


