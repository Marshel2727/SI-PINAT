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
