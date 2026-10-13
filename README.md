# SI-PINAT

Implementasi sistem rekomendasi peminatan Teknik Komputer berdasarkan RAG_LENGKAP_SIPINAT.md. Frontend menggunakan Next.js App Router, React, TypeScript, token CSS, dan formulir HTML native; validasi otoritatif dilakukan FastAPI/Pydantic. Backend menggunakan SQLAlchemy Core, Alembic, MySQL 8.4, Argon2id, openpyxl, dan ReportLab.

## Struktur kode

Setiap tabel memiliki file sendiri pada tiga lapisan berikut. Nama file mengikuti nama tabel, misalnya courses.py, assessments.py, dan fuzzy_traces.py.

- backend/app/models/: 23 file pemetaan tabel, metadata bersama, dan registri impor.
- backend/app/services/: 23 file service tabel. _draft_config.py berisi helper bersama untuk transaksi konfigurasi.
- backend/app/api/v1/routes/: 23 file router tabel serta health.py.
- backend/app/api/v1/router.py: hanya merangkai router dan dependency CSRF.
- backend/app/repositories/store.py: operasi SQLAlchemy Core, serialisasi ID, dan audit.
- backend/app/fuzzy/: engine numerik mandiri dan referensi integral analitik untuk contoh teknis.
- backend/alembic/versions/: migrasi awal dari DDL RAG, 23 tabel dan 34 FK.
- frontend/src/features/: tampilan interaktif per fitur; frontend/src/app/ berisi route.
- compose.yaml: stack aplikasi. compose.test.yaml: stack pengujian dengan MySQL sementara yang terpisah.

RAG asli tetap menjadi acuan. Tabel teknis alembic_version tidak dihitung sebagai tabel aplikasi.

## Fitur kode

Alur peserta mencakup DEMO/FULL, preferensi, identitas FULL, input manual, template CSV/XLSX, pratinjau impor, paket tes tetap, autosave, jawaban contoh DEMO, completion, hasil, detail trace, PDF, dan cetak. Kunci jawaban tidak dikirim melalui API peserta.

Panel admin mencakup login/logout nyata, dashboard database, filter/paginasi asesmen, ekspor XLSX sesuai filter, pengelolaan mata kuliah, revisi soal/opsi, kloning model, editor bobot/konversi/variabel/himpunan/aturan, skenario validasi, dan publikasi.

Preferensi tidak masuk perhitungan fuzzy. Skor final memakai Mamdani, MIN/MAX, centroid, dan competition ranking. Versi model terpublikasi terkunci. Penyelesaian memegang kunci baris asesmen dan menyimpan tiga skor serta tiga trace dalam transaksi yang sama. Request completion berulang mengembalikan hasil sukses sebelumnya.

Hak peserta memakai cookie rahasia HttpOnly per asesmen, bukan UUID saja. Admin memakai sesi server, hash token, Argon2id, pemeriksaan Origin/CSRF, dan pencabutan sesi. Unggahan dibatasi, formula/makro ditolak, lokasi berkas privat, dan ekspor mengamankan formula injection.

## Jalankan dengan Docker — lakukan sendiri

Pastikan Docker Desktop aktif dengan Linux containers. Instalasi dependensi terjadi ketika Anda menjalankan build Docker; tidak diperlukan npm/pip lokal untuk menjalankan stack ini.

Buka PowerShell pada project:

~~~powershell
Set-Location -LiteralPath 'C:\PROJECT WEB\SI-PINAT'
~~~

Buat .env dengan secret acak. Skrip menolak menimpa .env yang sudah ada:

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\create-env.ps1
~~~

Jika akan push ke Docker Hub, tentukan username sebelum build. Ganti nilai contoh berikut dengan username Anda:

~~~powershell
$env:DOCKER_NAMESPACE = 'USERNAME_DOCKER_HUB_ANDA'
~~~

Variabel ini mengalahkan nilai DOCKER_NAMESPACE di .env pada sesi PowerShell yang sama. Tanpa penggantian, image memakai namespace lokal sipinat-local.

Periksa konfigurasi tanpa mencetak secret:

~~~powershell
docker compose config --quiet
~~~

Build dan jalankan:

~~~powershell
docker compose up -d --build
~~~

Periksa layanan. migrate seharusnya selesai dengan exit code 0; layanan lain menjadi healthy:

~~~powershell
docker compose ps -a
~~~

Bila ada layanan gagal:

~~~powershell
docker compose logs --tail=100 migrate backend frontend
~~~

Buat administrator secara interaktif; tidak ada password default:

~~~powershell
docker compose exec backend python -m app.cli.create_admin
~~~

Buka http://localhost:3000. Login admin ada pada http://localhost:3000/admin/login. Kesiapan seluruh rantai layanan ada pada http://localhost:3000/api/health. Dokumentasi OpenAPI lokal ada pada http://localhost:8000/docs.

Urutan startup adalah MySQL healthy → migrasi berhasil → backend healthy → frontend. MySQL tidak memublikasikan port. Volume database dan unggahan dipertahankan.

## Data dan model sebelum asesmen

Migrasi hanya mengisi tiga peminatan. Tanpa model PUBLISHED, pembuatan asesmen menampilkan bahwa konfigurasi belum siap.

Untuk penggunaan akademik, masukkan master, soal, konversi, bobot, parameter, dan ekspektasi skenario yang disetujui. Publikasikan soal yang sudah ditinjau. Jalankan validasi model dan konfirmasikan peninjauan sebelum publikasi. Persyaratan skenario meliputi sepuluh pasangan input batas/overlap per peminatan pada RAG-12; semua kasus harus lulus.

Seed contoh bersifat opsional. Ganti email dengan akun admin yang sudah Anda buat:

~~~powershell
docker compose exec backend python -m app.cli.seed_demo --admin-email 'EMAIL_ADMIN_ANDA'
~~~

Seed membuat tiga mata kuliah contoh, 30 soal DRAFT, model DEMO-EXAMPLE-001 DRAFT, serta 30 skenario matematika teknis. Tidak ada model atau soal yang otomatis dipublikasikan. Rentang skenario berasal dari integral analitik independen terhadap engine sampling dan bukan bukti validasi akademik. Semua prompt/metadata contoh diberi label.

Untuk mencoba DEMO setelah seed, tinjau/publikasikan soal melalui admin, jalankan seluruh skenario model, lalu publikasikan secara eksplisit setelah peninjauan tujuan demonstrasi. FULL tidak memilih versi berkode DEMO atau EXAMPLE. Seed tidak menyediakan kurikulum resmi 38 mata kuliah.

Master Teknik Komputer semester I-IV dari *Buku Panduan Academic Culture Orientation Volume 7*, halaman cetak 64-65 (halaman PDF 73-74), tersedia melalui impor terpisah: 32 mata kuliah, total 90 SKS. Semester V-VIII dan PTIK tidak diimpor karena master asesmen saat ini dibatasi semester 1-4. Kode dan nama mengikuti PDF, termasuk `21B10C101` untuk Rangkaian Elektronika.

Setelah memperbarui image backend, jalankan:

~~~powershell
docker compose exec backend python -m app.cli.seed_courses --admin-email 'EMAIL_ADMIN_ANDA'
~~~

Impor ini dapat dijalankan ulang: data yang identik dilewati, sedangkan kode yang sama dengan metadata berbeda membatalkan seluruh transaksi tanpa menimpa master. Setiap penambahan tercatat dalam audit. Mata kuliah contoh DEMO dan bobot model tetap; mata kuliah baru tampil pada asesmen setelah dirujuk bobot model versi tersebut.

### Tambahan bank soal berbasis referensi

Alur peserta mendukung pemulihan sesi terakhir dari Beranda. Browser hanya menyimpan UUID sesi, mode, dan tahap; akses tetap memerlukan cookie rahasia HttpOnly dan status diperiksa ulang ke server. Sesi yang kedaluwarsa/tidak dapat diakses dihapus dari penunjuk lokal. Membuka “Mulai Baru” tidak menghapus progres server; penunjuk diganti setelah sesi baru berhasil dibuat.

Pada input nilai, perubahan manual dapat disimpan sekaligus dilanjutkan ke tes setelah validasi server. DEMO memiliki pengisian nilai contoh sesuai konversi versi sesi dan selalu berlabel data contoh. Navigasi tes tetap aktif saat penyimpanan jawaban berjalan; request bersamaan dibatasi satu per soal, kegagalan dapat dicoba ulang, dan completion menunggu seluruh jawaban tersimpan. Tersedia pintasan menuju soal belum terjawab. Hasil menampilkan skor akademik/kompetensi dan tautan aturan per peminatan.

Bank soal admin menyediakan pencarian kode/pertanyaan, filter peminatan/status, dan kuota kode soal unik PUBLISHED per bidang. Checklist publikasi mengambil kesiapan dari backend; endpoint publikasi memakai pemeriksaan yang sama dan tetap memerlukan konfirmasi peninjauan. API tambahan: `GET /api/v1/admin/questions/summary`, parameter `search` pada daftar soal, dan `GET /api/v1/admin/fuzzy-models/{id}/readiness`. Tidak diperlukan migrasi database untuk perubahan UX ini.

`backend/app/cli/data/questions_references.json` memuat 30 soal orisinal dalam bahasa Indonesia: 10 Embedded System (`ES-01`), 10 Sistem Cerdas (`SC-02`), dan 10 Jaringan & Forensik Digital (`JDF-03`). Masing-masing memiliki empat pilihan, tepat satu kunci, pembahasan, topik, tingkat rancangan, serta referensi beserta bagian sumber. Sumber primer meliputi Espressif, FreeRTOS, scikit-learn, IETF RFC 1918/9293/1035/8446/4632, NIST SP 800-86, dan OWASP Cheat Sheet Series. Tingkat rancangan belum merupakan hasil kalibrasi psikometrik.

Setelah memperbarui image backend, jalankan:

~~~powershell
docker compose exec backend python -m app.cli.seed_questions --admin-email 'EMAIL_ADMIN_ANDA'
~~~

Impor menyimpan soal ke `questions`, pilihan/kunci ke `question_options`, referensi ke `explanation`, dan penambahan ke audit dalam satu transaksi. Semua soal berstatus DRAFT; tinjau isi dan kunci melalui Bank Soal sebelum publikasi. Kode berawalan `REF-` terpisah dari soal DEMO. Jika kode sudah memiliki revisi apa pun, impor melewatinya tanpa menimpa perubahan admin. Tidak ada perubahan model atau pemublikasian otomatis. Asesmen baru mengambil soal PUBLISHED sesuai mekanisme paket yang sudah ada; menambah bank soal tidak memperbesar paket menjadi 60 soal.

### Model fuzzy untuk master mata kuliah ACO

`seed_fuzzy_model` membuat `TEKOM-ACO-001` berstatus DRAFT dengan 32 mata kuliah Teknik Komputer, 3 variabel domain 0-100, 9 himpunan, 27 aturan (9 per peminatan), 5 konversi nilai, serta 30 skenario teknis. Jalankan setelah `seed_courses` dan pembaruan image backend:

~~~powershell
docker compose exec backend python -m app.cli.seed_fuzzy_model --admin-email 'EMAIL_ADMIN_ANDA'
~~~

Usulan bobot beserta alasan tiap mata kuliah ada di `backend/app/cli/data/fuzzy_model_proposal.json`. Bobot 0 berarti tidak dipakai pada skor, 0,2 pendukung ringan, 0,4 pendukung, 0,6 relevan, 0,8 sangat relevan, dan 1 inti. Semua 32 master mendapat tiga bobot; mata kuliah aktif tambahan (termasuk contoh DEMO) mendapat bobot 0 dan tidak diwajibkan agar matriks tetap lengkap tanpa mengubah master/model lama. Pada usulan awal ini, 25 mata kuliah dengan bobot positif wajib diisi jika semesternya sudah berlaku pada sesi. Mata kuliah berbobot nol tetap bisa tampil pada formulir tetapi tidak memengaruhi skor.

Bobot merupakan rancangan awal berdasarkan topik, bukan bobot resmi kampus. Konversi awal A/B/C/D/E adalah 4/3/2/1/0 dengan normalisasi poin × 25; tambahkan nilai antara sesuai kebijakan kampus sebelum publikasi. Nilai akademik dihitung dengan rata-rata berbobot SKS × relevansi; skor kompetensi berasal dari jawaban tes per peminatan. Preferensi awal tidak ikut dalam skor.

Profil teknis mengikuti `app/fuzzy/reference.py`: LOW trapesium [0,0,20,40], MEDIUM segitiga [20,50,80], HIGH trapesium [60,80,100,100]. Konsekuen berdasarkan baris akademik LOW/MEDIUM/HIGH dan kolom kompetensi LOW/MEDIUM/HIGH adalah:

| Akademik / Kompetensi | LOW | MEDIUM | HIGH |
| --- | --- | --- | --- |
| LOW | LOW | LOW | MEDIUM |
| MEDIUM | LOW | MEDIUM | HIGH |
| HIGH | MEDIUM | HIGH | HIGH |

Operator AND menggunakan MIN, implikasi MIN, agregasi MAX, dan centroid dengan sampling step 0,1. Konsep variabel/aturan dan centroid dapat dibaca pada [contoh resmi scikit-fuzzy](https://scikit-fuzzy.readthedocs.io/en/latest/auto_examples/plot_tipping_problem_newapi.html) serta [dokumentasi centroid](https://scikit-fuzzy.readthedocs.io/en/latest/api/skfuzzy.defuzzify.html); sumber tersebut tidak menetapkan bobot atau batas keanggotaan akademik SI-PINAT.

Skenario teknis memuat 10 pasangan input per peminatan dan rentang ±0,002 dari integral analitik independen terhadap sampling engine. Skenario diimpor tanpa `last_passed` atau hasil pengujian; jalankan melalui admin. Lulusnya uji numerik tidak membuktikan ketepatan rekomendasi akademik. Tinjau bobot, konversi, himpunan, konsekuen, ekspektasi, dan soal; publikasikan minimal 10 kode soal per peminatan, jalankan seluruh skenario, lalu konfirmasikan peninjauan sebelum publikasi model. Setelah disetujui dan PUBLISHED, versi ini dapat dipilih untuk DEMO/FULL sesuai pemilihan versi terbaru yang sudah ada. Sesi lama tetap memakai versi semula.

Impor aman diulang: jika kode versi sudah ada, model dan seluruh perubahan admin dilewati tanpa ditimpa. Untuk rancangan berbeda, kloning model melalui admin. Importer tidak mempublikasikan model/soal atau mengubah pemilihan paket soal. Jika soal DEMO masih PUBLISHED, kode DEMO mendahului REF dalam urutan paket; arsipkan soal contoh melalui admin bila hendak menggantinya dengan soal referensi.

## Push Docker Hub — lakukan sendiri

Pastikan DOCKER_NAMESPACE sudah memakai username Docker Hub Anda. Login secara interaktif:

~~~powershell
docker login
~~~

Jika namespace baru diubah setelah build awal, build dengan tag namespace yang benar:

~~~powershell
docker compose build backend frontend
~~~

Push dua image aplikasi:

~~~powershell
docker compose push backend frontend
~~~

Image yang dikirim adalah USERNAME/sipinat-backend:latest dan USERNAME/sipinat-frontend:latest. MySQL memakai image resmi dan tidak ikut di-push. Tidak ada login registry atau push yang dijalankan otomatis oleh asisten.

## Pengujian

Pemeriksaan yang sudah dilakukan pada source ini: TypeScript dan build produksi frontend. Beranda serta dialog awal diperiksa melalui browser lokal. Beranda dan login admin juga diperiksa pada viewport mobile 390 x 844; aset beranda termuat dan tidak ada overflow horizontal. Struktur source diperiksa memiliki 23 file model, 23 service tabel, dan 23 router tabel; SQL migrasi mempertahankan 34 FK.

Python lokal yang tersedia menunjuk executable yang tidak dapat diakses. Pengujian pytest, migrasi MySQL, pembuatan PDF/XLSX pada runtime, alur asesmen lengkap, dan build/startup Docker belum dijalankan. Keberadaan kode tes tidak berarti tes telah lulus.

Jalankan unit/integrasi menggunakan stack uji terpisah. Database uji berada di tmpfs dan tidak memakai volume database aplikasi:

~~~powershell
docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from tests
~~~

Setelah pengujian selesai, hentikan stack uji:

~~~powershell
docker compose -f compose.test.yaml down
~~~

Tes integrasi sengaja menolak database yang sudah berisi tabel atau namanya tidak berakhiran _test. Jangan mengarahkannya ke database aplikasi. Untuk mengulang tes, hentikan stack uji agar tmpfs kosong, lalu jalankan lagi.

Untuk pemeriksaan frontend dengan dependensi lokal, jalankan sendiri:

~~~powershell
npm --prefix frontend ci
~~~

~~~powershell
npm --prefix frontend run typecheck
~~~

~~~powershell
npm --prefix frontend run build
~~~

requirements.txt mengunci 35 paket runtime beserta hash artefak dari PyPI. Kompatibilitas resolver dan instalasi Linux/Python 3.12 tetap harus dibuktikan dengan build Docker. requirements-dev.txt dipasang setelah requirements.txt oleh target tests.

## Batas implementasi dan operasional

Implementasi formulir memakai kontrol native dan validasi server; Tailwind, React Hook Form, Zod, ESLint, dan Playwright/Vitest belum dipasang. Tampilannya mengadaptasi node Figma pada RAG dengan CSS bersama, font lokal, dan aset asli. Kesesuaian seluruh layar terhadap Figma, tablet/mobile, serta alur admin terautentikasi tetap memerlukan penerimaan setelah backend aktif.

Tidak ada SSO/SIAKAD, verifikasi kepemilikan NIM, OCR, atau dataset akademik resmi. Nama/NIM yang sudah tersimpan dicocokkan tanpa membocorkan profil dan tidak ditimpa oleh peserta anonim. Akses sesi peserta berlaku 24 jam secara default dan cookie terikat browser.

Pembatasan login/unggahan menggunakan database bersama dan MySQL advisory lock. Backend berada di belakang proxy Next.js; pembatasan pembuatan sesi juga membatasi trafik proxy secara agregat. Sesuaikan kebijakan trusted proxy bila sistem diperluas untuk trafik produksi.

Port Compose terikat localhost. Deploy publik memerlukan reverse proxy HTTPS, PUBLIC_ORIGIN yang sesuai, COOKIE_SECURE=true, secret yang aman, serta kebijakan backup/restore dan retensi data. Push image bukan deployment website.

Restart tanpa menghapus data:

~~~powershell
docker compose restart
~~~

Hentikan layanan tanpa menghapus volume:

~~~powershell
docker compose down
~~~

Jangan gunakan penghapusan volume untuk restart biasa.

## Acuan

Spesifikasi: RAG_LENGKAP_SIPINAT.md. Desain: https://www.figma.com/design/1VF2IX2cKulu23XYLBtHb8/Untitled?node-id=53-167. Dokumentasi teknis yang diperiksa: [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route), [SQLAlchemy Core](https://docs.sqlalchemy.org/en/20/core/connections.html), dan [FastAPI dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/).
