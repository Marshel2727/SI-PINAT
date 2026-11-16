# Panduan deploy SI-PINAT: backend dan MySQL di VPS, frontend di Vercel

Panduan ini mengikuti source project dan pemeriksaan langsung VPS melalui SSH pada 17 Oktober 2026. Asisten hanya menjalankan pemeriksaan baca-saja: deployment, instalasi, konfigurasi Nginx, dan perubahan database belum dilakukan.

VPS Anda memakai **Ubuntu 24.04.4 LTS** dan alias SSH `marshel2727`, dengan user `marshel2727` pada `70.153.24.74`, port 22. Docker 29.1.3, Docker Compose 2.40.3, Nginx, dan Certbot sudah tersedia. Aplikasi portfolio dan BP Sport sedang berjalan. SI-PINAT memakai folder `/opt/sipinat`, project Compose `sipinat`, dan virtual host Nginx terpisah.

**Kapasitas saat diperiksa:** RAM total 842 MiB, tersedia sekitar 281 MiB; swap 2 GiB sudah terpakai 1,1 GiB. Menambah backend dan satu MySQL baru berisiko kehabisan memori atau membuat aplikasi lama lambat. Tambah kapasitas RAM sebelum menjalankan stack tambahan untuk produksi. Panduan tidak menghentikan atau memakai database aplikasi lama.

## 1. Pembagian layanan dan nilai yang harus diganti

| Bagian | Lokasi | Contoh alamat |
| --- | --- | --- |
| Frontend Next.js | Vercel | `https://si-pinat.vercel.app` |
| Backend FastAPI | VPS, container Docker | `https://api-sipinat.marshelportfolio.me` |
| MySQL 8.4 | VPS, container Docker | Jaringan internal Docker |
| Berkas unggahan | Volume Docker `uploads` | Privat, di VPS |
| Backup | VPS dan salinan di komputer/tempat lain | `/opt/sipinat-backups` |

Ganti `EMAIL_ADMIN_ANDA` dengan email akun Anda. Alias `marshel2727` dan backend `api-sipinat.marshelportfolio.me` mengikuti pilihan Anda. Target frontend adalah `https://si-pinat.vercel.app`; pastikan Vercel benar-benar memberikan alamat itu. Jika nama tersebut tidak tersedia, sesuaikan `PUBLIC_ORIGIN` dengan alamat Production yang diberikan Vercel.

Alur permintaan mengikuti kode saat ini:

```text
Browser → frontend Vercel /api/v1/... → HTTPS backend VPS → MySQL
```

Frontend memiliki route proxy Next.js. `API_INTERNAL_URL` di Vercel menunjuk alamat HTTPS backend. Browser tetap mengakses API melalui domain frontend, sehingga cookie login dan CSRF mengikuti domain frontend. Tidak perlu mengganti kode agar browser langsung memanggil domain backend atau menambahkan CORS untuk alur ini.

Backend hanya mendengarkan port host `127.0.0.1:8000`; Nginx meneruskan HTTPS ke port tersebut. Port 8000 belum terpakai saat diperiksa. MySQL SI-PINAT memakai container dan volume sendiri tanpa memublikasikan port 3306. Anda tidak perlu menjalankan container frontend di VPS.

**Pilih satu jalur database:** jika belum ada database/backup, gunakan jalur **database baru** pada bagian 7. Jika ada dump database SI-PINAT yang benar-benar berisi data, gunakan jalur **restore** pada bagian 8. File `backend/alembic/versions/0001_initial.sql` adalah skema migrasi, bukan backup data lama.

## 2. Siapkan domain dan project Vercel

Di pengaturan DNS domain Anda, buat record berikut:

| Tipe | Nama | Nilai |
| --- | --- | --- |
| A | `api-sipinat` | `70.153.24.74` |

Gunakan DNS biasa terlebih dahulu jika memakai Cloudflare. Jangan memasang record AAAA kecuali IPv6 VPS juga sudah dikonfigurasi. Pastikan domain backend mengarah ke VPS sebelum mengaktifkan HTTPS.

Di dashboard Vercel, pilih **Add New → Project**, lalu import repository `Marshel2727/SI-PINAT`. Isi pengaturan berikut:

| Pengaturan | Nilai |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | `frontend` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | Biarkan default Next.js |
| Node.js Version | `22.x` |
| Production Branch | `main` |

Tambahkan environment variable untuk **Production**:

```dotenv
API_INTERNAL_URL=https://api-sipinat.marshelportfolio.me
```

Nilainya cukup origin backend, tanpa `/api/v1`. Jangan memakai `http://backend:8000` atau `localhost`, karena alamat itu hanya berlaku di jaringan lokal/container. Jangan menambahkan awalan `NEXT_PUBLIC_` pada variabel ini.

Deploy frontend untuk mendapatkan alamat Production yang sebenarnya. Pada tahap ini halaman dapat terbuka sementara API belum siap. Catat domain Production tetap, misalnya `https://si-pinat.vercel.app`, lalu pakai nilai yang sama pada `PUBLIC_ORIGIN` backend. Jika nama project tersebut tidak tersedia, gunakan alamat yang benar-benar diberikan Vercel.

Jangan memilih static export atau output directory `out`: route proxy membutuhkan runtime Next.js. Root Directory dan perintah build mengikuti [dokumentasi build Vercel](https://vercel.com/docs/builds/configure-a-build). Node.js 22.x tersedia dalam [versi Node.js yang didukung Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## 3. Masuk ke VPS yang sudah tersedia

Docker, Compose, Nginx, Python 3, dan Certbot sudah terpasang. Lewati langkah instalasi ulang dari panduan server baru.

**PowerShell di komputer Anda:**

```powershell
ssh marshel2727
```

**Setelah masuk ke terminal VPS:**

```bash
sudo -i
```

Seluruh perintah VPS dalam panduan ini dijalankan setelah `sudo -i`, sebagai root. Perintah PowerShell dijalankan pada komputer Windows, bukan di terminal VPS.

```bash
free -h
```

```bash
docker compose version
```

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

Perintah di atas hanya memeriksa keadaan server. Jangan menjalankan `docker stop` pada container portfolio atau BP Sport. Jika kapasitas RAM sudah ditambah dan server siap menerima layanan baru, lanjutkan ke bagian 5.

## 4. Port dan layanan lama

Port 22, 80, dan 443 sudah melayani SSH serta Nginx. UFW terdeteksi tidak aktif. Panduan ini tidak mengubah firewall yang ada; jika panel provider memakai security group, pastikan port 80/443 tetap dapat diakses.

Port backend SI-PINAT tetap dibatasi pada `127.0.0.1:8000`. Port MySQL tidak dipublikasikan. Tidak perlu membuka port 8000/3306 ke internet.

Konfigurasi Nginx lama yang terdeteksi melayani `api-jersey.marshelportfolio.me` dan `api-v2.marshelportfolio.me`. Buat file khusus `sipinat`; jangan mengganti file kedua aplikasi lama atau menginstal Caddy pada server ini.

## 5. Ambil source project SI-PINAT

**Terminal VPS, setelah `sudo -i`:**

```bash
git clone --branch main https://github.com/Marshel2727/SI-PINAT.git /opt/sipinat
```

```bash
chmod 700 /opt/sipinat
```

```bash
cd /opt/sipinat
```

```bash
install -d -m 700 /opt/sipinat-backups/incoming
```

Folder `/opt/sipinat` belum ada saat pemeriksaan. Jika kelak sudah ada, masuk ke folder itu dan gunakan alur update pada bagian 12; jangan mengulang clone ke folder berisi data.

Jika repository private, gunakan autentikasi GitHub melalui SSH deploy key atau HTTPS dengan personal access token saat diminta. Jangan memasukkan token ke URL repository, file panduan, atau source code. Gunakan akses yang mengizinkan pembacaan repository tersebut.

## 6. Buat konfigurasi produksi

### Jika belum ada database lokal atau backup

**Terminal VPS:** buat `.env` dengan secret acak. Blok ini menolak menimpa `.env` yang sudah ada.

```bash
python3 - <<'PY'
from pathlib import Path
import secrets

target = Path('.env')
if target.exists():
    raise SystemExit('.env sudah ada; edit file tersebut, jangan ditimpa.')
content = Path('.env.example').read_text()
for placeholder in ('CHANGE_ME_DB_PASSWORD', 'CHANGE_ME_ROOT_PASSWORD', 'CHANGE_ME_APP_SECRET'):
    content = content.replace(placeholder, secrets.token_hex(32))
target.write_text(content)
target.chmod(0o600)
print('.env dibuat dengan secret acak.')
PY
```

Ubuntu biasanya menyediakan Python 3. Jika `python3` belum tersedia, pasang dengan `apt-get install -y python3`, lalu ulangi blok tersebut.

### Jika akan memindahkan database lokal beserta `.env` lama

Lewati generator di atas. Dari **PowerShell komputer Anda**, kirim `.env` lokal melalui SSH:

```powershell
Set-Location -LiteralPath 'C:\PROJECT WEB\SI-PINAT'
```

```powershell
scp .env marshel2727:~/sipinat.env
```

**Terminal VPS, sebagai root:**

```bash
install -m 600 /home/marshel2727/sipinat.env /opt/sipinat/.env
```

Pertahankan `APP_SECRET` lama jika ingin mempertahankan validitas token CSRF yang ditandatangani secret tersebut. Akun dan data tetap berasal dari dump database; sesi browser juga bergantung pada cookie, domain, dan masa berlaku. Tidak semua sesi browser lokal otomatis berpindah ke domain Production.

### Sesuaikan konfigurasi untuk kedua jalur

**Kembali ke terminal VPS:**

```bash
cd /opt/sipinat
```

```bash
chmod 600 .env
```

```bash
nano .env
```

Sesuaikan baris berikut. Ganti origin frontend dengan alamat Production Anda yang sebenarnya, tanpa slash terakhir:

```dotenv
COMPOSE_PROJECT_NAME=sipinat
APP_ENV=production
PUBLIC_ORIGIN=https://si-pinat.vercel.app
COOKIE_SECURE=true
BACKEND_PORT=8000
```

Pertahankan `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, dan `APP_SECRET` yang sudah dibuat/disalin. Nilai contoh pada `.env.example` tidak boleh dipakai sebagai secret. Simpan dengan `Ctrl+O`, Enter, lalu keluar dengan `Ctrl+X`.

`PUBLIC_ORIGIN` adalah alamat **frontend**, bukan domain API. Kode backend membandingkan header Origin dengan nilai tersebut secara persis. Jika Anda mengganti domain utama frontend, sesuaikan nilai ini dan buat ulang container backend.

```bash
docker compose config --quiet
```

Jika perintah gagal, perbaiki `.env` sebelum melanjutkan. Jangan menjalankan `docker compose config` tanpa `--quiet` untuk dibagikan, karena hasil lengkap dapat memuat secret.

## 7. Jalur database baru: langsung buat MySQL dan backend

Gunakan bagian ini jika belum ada database yang perlu dipindahkan. Jika memakai backup lama, lewati bagian ini dan lakukan bagian 8 terlebih dahulu.

**Terminal VPS, di `/opt/sipinat`:**

```bash
docker compose up -d --build backend
```

Perintah tersebut menjalankan MySQL, menunggu MySQL healthy, menjalankan service migrasi, lalu memulai backend. Karena hanya service `backend` yang dipilih, container frontend tidak ikut dijalankan.

```bash
docker compose ps -a
```

Tunggu sampai `mysql` dan `backend` healthy. Service `migrate` seharusnya selesai dengan exit code 0.

```bash
curl --fail --show-error http://127.0.0.1:8000/api/v1/health/ready
```

Setelah backend siap, buat administrator:

```bash
docker compose exec backend python -m app.cli.create_admin
```

Masukkan nama, email, dan password minimal 12 karakter ketika diminta. Password tidak tampil saat diketik.

Untuk mengisi master mata kuliah, soal referensi, dan rancangan awal model fuzzy:

```bash
docker compose exec backend python -m app.cli.seed_courses --admin-email 'EMAIL_ADMIN_ANDA'
```

```bash
docker compose exec backend python -m app.cli.seed_questions --admin-email 'EMAIL_ADMIN_ANDA'
```

```bash
docker compose exec backend python -m app.cli.seed_fuzzy_model --admin-email 'EMAIL_ADMIN_ANDA'
```

Data tersebut mengikuti importer yang sudah tersedia di project: 32 mata kuliah, 30 soal referensi, dan model `TEKOM-ACO-001`. Soal dan model baru masih **DRAFT**. Setelah frontend tersambung, login admin, tinjau/publikasikan minimal 10 kode soal per peminatan, jalankan semua skenario validasi model, lalu publikasikan model setelah peninjauan. Sebelum ada model PUBLISHED yang memenuhi syarat, asesmen dapat menampilkan konfigurasi belum siap meskipun server sudah sehat.

Bobot dan parameter model adalah rancangan awal yang membutuhkan peninjauan akademik. Panduan deploy ini tidak menjadikannya parameter resmi kampus.

Setelah selesai, lanjutkan ke bagian 9.

## 8. Jalur backup lama: ekspor dan restore sebelum migrasi

Gunakan bagian ini hanya jika ada data SI-PINAT lokal yang ingin dipindahkan. Restore awal ditujukan ke database VPS baru yang belum berisi tabel aplikasi. Jangan menjalankan restore ini pada database Production yang sudah menerima data baru.

### 8.1. Ekspor jika database lokal memakai Docker Compose project ini

Aktifkan Docker Desktop. **PowerShell di komputer Anda:**

```powershell
Set-Location -LiteralPath 'C:\PROJECT WEB\SI-PINAT'
```

```powershell
New-Item -ItemType Directory -Force -Path 'C:\SI-PINAT-BACKUP'
```

```powershell
docker compose ps -a
```

Jika MySQL lokal belum berjalan tetapi volume datanya sudah ada, mulai hanya MySQL:

```powershell
docker compose up -d mysql
```

Tunggu MySQL healthy. Hentikan frontend dan backend lokal agar tidak ada perubahan selama database serta berkas unggahan disalin:

```powershell
docker compose stop frontend backend
```

```powershell
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump --single-transaction --quick --no-tablespaces --set-gtid-purged=OFF --default-character-set=utf8mb4 -u "$MYSQL_USER" "$MYSQL_DATABASE" > /tmp/sipinat-initial.sql'
```

Lanjutkan hanya jika dump berhasil tanpa error. Perintah membuat dump di dalam container supaya output SQL tidak diubah encoding-nya oleh redirection PowerShell.

```powershell
docker compose cp mysql:/tmp/sipinat-initial.sql 'C:\SI-PINAT-BACKUP\sipinat-initial.sql'
```

Untuk backup unggahan, image backend lokal harus sudah tersedia:

```powershell
docker compose run --rm --no-deps --user 0:0 -v 'C:\SI-PINAT-BACKUP:/backup' --entrypoint tar backend -czf /backup/sipinat-uploads.tar.gz -C /app/storage/uploads .
```

```powershell
Get-Item -LiteralPath 'C:\SI-PINAT-BACKUP\sipinat-initial.sql','C:\SI-PINAT-BACKUP\sipinat-uploads.tar.gz'
```

```powershell
Select-String -LiteralPath 'C:\SI-PINAT-BACKUP\sipinat-initial.sql' -SimpleMatch -Pattern 'CREATE TABLE `alembic_version`','Dump completed'
```

Dump seluruh database seharusnya menyertakan tabel `alembic_version`. Jika tabel tersebut hilang dari database sumber, periksa kesesuaian skemanya dahulu; jangan langsung memberi stamp migrasi atau mengimpor skema awal ke atas tabel yang sudah ada.

Setelah file staging `.env`/backup di `/home/marshel2727` selesai dipakai dan sudah ada salinan aman, hapus salinan staging tersebut secara manual. Anda dapat menyalakan kembali aplikasi lokal setelah backup selesai:

```powershell
docker compose up -d backend frontend
```

Jika ini merupakan pemindahan final, jangan menerima data baru di aplikasi lokal sesudah backup terakhir. Data yang ditambahkan setelah dump dibuat tidak masuk ke VPS.

### 8.2. Alternatif jika MySQL lokal bukan Docker

Lewati bagian 8.1. Jika MySQL berjalan langsung di Windows/Laragon, gunakan `mysqldump.exe` dari instalasi **MySQL** Anda. Sesuaikan lokasi executable, port, user, dan nama database. Contoh ini mengasumsikan executable sudah ada di PATH:

```powershell
New-Item -ItemType Directory -Force -Path 'C:\SI-PINAT-BACKUP'
```

```powershell
mysqldump.exe --host=127.0.0.1 --port=3306 --user=root --password --single-transaction --quick --no-tablespaces --set-gtid-purged=OFF --default-character-set=utf8mb4 --result-file='C:\SI-PINAT-BACKUP\sipinat-initial.sql' sipinat
```

Masukkan password ketika diminta. Pilih seluruh database SI-PINAT, termasuk struktur, data, dan `alembic_version`. Jangan mengekspor database sistem `mysql` untuk dipindahkan ke instance baru. Berkas unggahan harus disalin terpisah dari lokasi `UPLOAD_DIR` yang dipakai backend Anda; pada runtime non-Docker lokasi itu biasanya `backend/storage/uploads`.

Opsi `--single-transaction` digunakan untuk dump konsisten tabel InnoDB. Selama dump, jangan menjalankan perubahan skema. Lihat [dokumentasi mysqldump MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html).

### 8.3. Kirim backup ke VPS

**PowerShell:**

```powershell
scp 'C:\SI-PINAT-BACKUP\sipinat-initial.sql' marshel2727:~/sipinat-initial.sql
```

Jika backup unggahan dibuat melalui bagian 8.1:

```powershell
scp 'C:\SI-PINAT-BACKUP\sipinat-uploads.tar.gz' marshel2727:~/sipinat-uploads.tar.gz
```

Jika database lokal sudah punya `.env` yang valid, gunakan jalur penyalinan `.env` pada bagian 6. Jika hanya memiliki dump, buat `.env` baru sesuai bagian 6; akun aplikasi tetap berasal dari dump, sedangkan user koneksi MySQL dibuat oleh konfigurasi instance VPS.

### 8.4. Restore database SI-PINAT yang masih kosong

**Terminal VPS, sebagai root:** pindahkan dump dari home user SSH ke folder privat. Jika tidak mengirim backup unggahan, lewati perintah kedua.

```bash
install -m 600 /home/marshel2727/sipinat-initial.sql /opt/sipinat-backups/incoming/sipinat-initial.sql
```

```bash
install -m 600 /home/marshel2727/sipinat-uploads.tar.gz /opt/sipinat-backups/incoming/sipinat-uploads.tar.gz
```

**Terminal VPS:**

```bash
cd /opt/sipinat
```

```bash
docker compose up -d mysql
```

```bash
docker compose ps -a
```

Tunggu MySQL healthy. Backend dan migrasi belum dijalankan pada tahap ini. Periksa tabel yang sudah ada:

```bash
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u "$MYSQL_USER" "$MYSQL_DATABASE" -e "SHOW TABLES;"'
```

Jika belum ada tabel aplikasi, lanjutkan:

```bash
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql --default-character-set=utf8mb4 -u "$MYSQL_USER" "$MYSQL_DATABASE"' < /opt/sipinat-backups/incoming/sipinat-initial.sql
```

Hentikan langkah berikutnya jika import menghasilkan error. Jangan memakai `--force` untuk melewati error import.

```bash
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u "$MYSQL_USER" "$MYSQL_DATABASE" -e "SHOW TABLES; SELECT version_num FROM alembic_version; SELECT COUNT(*) AS admins FROM admin_users; SELECT COUNT(*) AS courses FROM courses; SELECT COUNT(*) AS questions FROM questions; SELECT COUNT(*) AS assessments FROM assessments;"'
```

Bandingkan jumlah data dengan database sumber. Source saat ini memakai revisi `0001_initial`, dengan 23 tabel aplikasi dan tabel teknis `alembic_version`.

```bash
docker compose build backend
```

Jika punya arsip unggahan, periksa isinya dan restore hanya arsip yang Anda buat sendiri:

```bash
tar -tzf /opt/sipinat-backups/incoming/sipinat-uploads.tar.gz
```

```bash
docker compose run --rm --no-deps --user 0:0 -v /opt/sipinat-backups/incoming:/backup:ro --entrypoint sh backend -c 'tar -xzf /backup/sipinat-uploads.tar.gz -C /app/storage/uploads && chown -R 10001:10001 /app/storage/uploads'
```

```bash
docker compose up -d backend
```

```bash
docker compose ps -a
```

```bash
curl --fail --show-error http://127.0.0.1:8000/api/v1/health/ready
```

Migrasi berjalan setelah restore. Jika dump lengkap menyertakan revisi yang benar, migrasi yang sudah diterapkan tidak dijalankan ulang. Gunakan akun admin yang sudah ada dalam backup; tidak perlu membuat admin atau menjalankan seluruh seed lagi.

## 9. Aktifkan domain backend melalui Nginx dan Certbot yang sudah terpasang

Domain backend yang dipilih adalah **`api-sipinat.marshelportfolio.me`**. Buat record A `api-sipinat` yang menunjuk ke **`70.153.24.74`** pada panel DNS `marshelportfolio.me`. Subdomain ini belum berhasil di-resolve saat pemeriksaan, sehingga record DNS masih perlu dibuat/diverifikasi.

**PowerShell di komputer Anda:**

```powershell
Resolve-DnsName api-sipinat.marshelportfolio.me -Type A
```

Lanjutkan penerbitan sertifikat setelah alamat A yang diterima sesuai IP VPS. Jika memakai Cloudflare, gunakan DNS only terlebih dahulu.

**Terminal VPS, sebagai root:** backup konfigurasi Nginx sebelum menambah virtual host:

```bash
tar -czf "/opt/sipinat-backups/nginx-before-sipinat-$(date -u +%Y%m%d-%H%M%S).tar.gz" -C /etc nginx
```

```bash
nano /etc/nginx/sites-available/sipinat
```

Isi file baru tersebut dengan:

```nginx
server {
    listen 80;
    server_name api-sipinat.marshelportfolio.me;

    client_max_body_size 11m;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 65s;
        proxy_send_timeout 65s;
    }
}
```

Simpan dengan `Ctrl+O`, Enter, lalu keluar dengan `Ctrl+X`. Header `Origin`, `Cookie`, dan `X-CSRF-Token` diteruskan oleh proxy; jangan mengubah Origin menjadi domain backend. Konfigurasi mengikuti [dokumentasi reverse proxy Nginx](https://nginx.org/en/docs/http/ngx_http_proxy_module.html).

```bash
ln -s /etc/nginx/sites-available/sipinat /etc/nginx/sites-enabled/sipinat
```

Jika symlink sudah ada, jangan membuat ulang atau menimpa targetnya tanpa pemeriksaan. Validasi sebelum reload:

```bash
nginx -t
```

Lanjutkan hanya jika tes konfigurasi berhasil:

```bash
systemctl reload nginx
```

Pasang HTTPS khusus subdomain SI-PINAT. Certbot sudah tersedia; tidak perlu diinstal ulang:

```bash
certbot --nginx --redirect -d api-sipinat.marshelportfolio.me
```

Isi email/notifikasi ketika diminta. Jangan memilih/mengubah domain aplikasi lain. Penggunaan `certbot --nginx -d` mengikuti [panduan TLS Ubuntu](https://ubuntu.com/server/docs/how-to/security/obtain-tls-certificates/).

```bash
nginx -t
```

```bash
curl --fail --show-error https://api-sipinat.marshelportfolio.me/api/v1/health/ready
```

Jika DNS belum mengarah ke VPS atau port 80 tidak dapat diakses dari internet, penerbitan sertifikat akan gagal. Perbaiki penyebab tersebut sebelum mengulang Certbot.

## 10. Sambungkan frontend Vercel dan periksa aplikasi

Pastikan environment Vercel Production sudah berisi:

```dotenv
API_INTERNAL_URL=https://api-sipinat.marshelportfolio.me
```

Pastikan `.env` VPS berisi origin frontend Production yang sama persis dengan alamat yang digunakan browser:

```dotenv
APP_ENV=production
PUBLIC_ORIGIN=https://si-pinat.vercel.app
COOKIE_SECURE=true
```

Jika `.env` backend diubah, terapkan dengan:

```bash
cd /opt/sipinat
```

```bash
docker compose up -d --force-recreate backend
```

Di Vercel, lakukan **Redeploy** setelah menambah/mengubah environment variable. Perubahan environment berlaku untuk deployment berikutnya, sebagaimana dijelaskan pada [dokumentasi environment variables Vercel](https://vercel.com/docs/environment-variables).

**PowerShell di komputer Anda:**

```powershell
Invoke-RestMethod -Uri 'https://api-sipinat.marshelportfolio.me/api/v1/health/ready'
```

```powershell
Invoke-RestMethod -Uri 'https://si-pinat.vercel.app/api/health'
```

Kemudian buka alamat frontend Production di browser. Periksa login admin, kesiapan/publikasi soal dan model, pembuatan asesmen, penyimpanan nilai/jawaban, hasil, serta unduh PDF/XLSX. Untuk data hasil restore, periksa juga beberapa record lama melalui panel admin.

`health/ready` hanya membuktikan kesiapan koneksi database, tabel, revisi migrasi, dan master peminatan. Endpoint itu tidak membuktikan model fuzzy sudah dipublikasikan atau seluruh fitur sudah lulus uji.

Preview URL Vercel biasanya berbeda dari origin Production. Backend saat ini menerima satu `PUBLIC_ORIGIN`, sehingga permintaan perubahan data dari Preview dapat ditolak. Gunakan alamat Production tetap untuk pengujian alur login/asesmen ini; staging terpisah memerlukan konfigurasi tersendiri.

## 11. Backup rutin database, unggahan, dan konfigurasi

Volume Docker mempertahankan data saat container diganti, tetapi volume bukan salinan backup. Buat backup berkala dan simpan salinan di luar VPS agar data tetap tersedia bila VPS rusak.

Script berikut membuat satu folder backup bertimestamp, mencatat commit aplikasi, menyalin `.env`, mengekspor database, dan mengarsipkan unggahan. Backend dihentikan sementara untuk menjaga kesesuaian database dan unggahan, lalu dihidupkan kembali. Pengguna akan mengalami gangguan singkat selama backup. Script tidak menghapus backup lama secara otomatis.

**Terminal VPS:**

```bash
nano /usr/local/sbin/sipinat-backup
```

Isi file dengan:

```bash
#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

exec 9>/run/lock/sipinat-maintenance.lock
flock -n 9 || { echo 'Backup/update SI-PINAT lain sedang berjalan.' >&2; exit 1; }

cd /opt/sipinat
stamp=$(date -u +%Y%m%d-%H%M%S)
backup_dir="/opt/sipinat-backups/$stamp"
mkdir -m 700 "$backup_dir"
git rev-parse HEAD > "$backup_dir/git-commit.txt"
cp .env "$backup_dir/app.env"

backend_id=$(docker compose ps -q backend)
if [ -z "$backend_id" ] || [ "$(docker inspect -f '{{.State.Running}}' "$backend_id")" != true ]; then
    echo 'Backend belum berjalan. Backup rutin dibatalkan.' >&2
    exit 1
fi

resume_backend() {
    docker compose start backend
}
trap resume_backend EXIT
docker compose stop backend

docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump --single-transaction --quick --no-tablespaces --set-gtid-purged=OFF --default-character-set=utf8mb4 -u "$MYSQL_USER" "$MYSQL_DATABASE"' > "$backup_dir/database.sql.partial"
test -s "$backup_dir/database.sql.partial"
grep -q 'Dump completed' "$backup_dir/database.sql.partial"
mv "$backup_dir/database.sql.partial" "$backup_dir/database.sql"

docker compose run --rm --no-deps --user 0:0 -v "$backup_dir:/backup" --entrypoint tar backend -czf /backup/uploads.tar.gz -C /app/storage/uploads .
tar -tzf "$backup_dir/uploads.tar.gz" >/dev/null

(
    cd "$backup_dir"
    sha256sum database.sql uploads.tar.gz app.env git-commit.txt > SHA256SUMS
    touch COMPLETE
)
echo "Backup selesai: $backup_dir"
```

Simpan file, lalu jalankan:

```bash
chmod 700 /usr/local/sbin/sipinat-backup
```

```bash
/usr/local/sbin/sipinat-backup
```

```bash
ls -lt /opt/sipinat-backups
```

Anggap backup lengkap hanya jika script berhasil dan folder memiliki penanda `COMPLETE`. Pengecekan checksum/arsip belum membuktikan database dapat direstore; lakukan uji restore pada instance terpisah sebelum mengandalkan backup sebagai pemulihan utama.

### Jadwalkan backup setiap hari pukul 02.00 UTC+8

**Terminal VPS:**

```bash
nano /etc/systemd/system/sipinat-backup.service
```

Isi dengan:

```ini
[Unit]
Description=Backup database dan unggahan SI-PINAT
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/sipinat-backup
```

```bash
nano /etc/systemd/system/sipinat-backup.timer
```

Isi dengan:

```ini
[Unit]
Description=Jadwal backup harian SI-PINAT

[Timer]
OnCalendar=*-*-* 02:00:00 Asia/Shanghai
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
systemctl daemon-reload
```

```bash
systemctl enable --now sipinat-backup.timer
```

```bash
systemctl list-timers sipinat-backup.timer
```

Untuk membaca hasil backup otomatis:

```bash
journalctl -u sipinat-backup.service -n 50 --no-pager
```

### Salin backup ke komputer Anda

Ganti `NAMA_FOLDER_BACKUP` dengan folder timestamp yang memiliki penanda `COMPLETE`. Folder backup di `/opt` hanya bisa dibaca root. **Terminal VPS, sebagai root:** buat arsip untuk dipindahkan melalui user SSH Anda:

```bash
tar -czf /home/marshel2727/sipinat-backup-NAMA_FOLDER_BACKUP.tar.gz -C /opt/sipinat-backups NAMA_FOLDER_BACKUP
```

```bash
chown marshel2727:marshel2727 /home/marshel2727/sipinat-backup-NAMA_FOLDER_BACKUP.tar.gz
```

```bash
chmod 600 /home/marshel2727/sipinat-backup-NAMA_FOLDER_BACKUP.tar.gz
```

**PowerShell di komputer Anda:**

```powershell
New-Item -ItemType Directory -Force -Path 'C:\SI-PINAT-BACKUP'
```

```powershell
scp marshel2727:~/sipinat-backup-NAMA_FOLDER_BACKUP.tar.gz 'C:\SI-PINAT-BACKUP\'
```

Arsip ini memuat database dan `.env` yang berisi secret. Simpan pada lokasi privat dan jangan masukkan ke GitHub. Pertahankan, misalnya, backup harian 14 hari dan beberapa salinan bulanan sesuai kebutuhan data/ruang disk. Hapus salinan lama secara terencana setelah memastikan ada backup yang telah diuji dan salinan di luar VPS.

## 12. Update kode setelah aplikasi online

Update kode tidak perlu mengimpor ulang dump database. Database Production tetap menggunakan volume yang sama. Restore dump lama setiap update justru dapat menghapus perubahan data yang baru masuk.

### 12.1. Kirim pembaruan dari komputer ke GitHub

**PowerShell:**

```powershell
Set-Location -LiteralPath 'C:\PROJECT WEB\SI-PINAT'
```

```powershell
git add .
```

```powershell
git status
```

Pastikan daftar perubahan sesuai, lalu:

```powershell
git commit -m "Perbarui SI-PINAT"
```

```powershell
git push origin main
```

Vercel dengan Git integration akan memicu deployment dari branch Production. Untuk perubahan backend saja, lanjutkan ke VPS. Jika pembaruan mengubah kontrak API/skema, koordinasikan rilis backend dan frontend sesuai kompatibilitasnya; push ke GitHub dapat membuat frontend terdeploy sebelum backend selesai diperbarui.

### 12.2. Update backend pada VPS

**Terminal VPS:** periksa status dan buat backup lebih dahulu. Lakukan di luar jadwal backup otomatis dan jangan menjalankan dua pekerjaan pemeliharaan bersamaan.

```bash
cd /opt/sipinat
```

```bash
git status --short
```

```bash
/usr/local/sbin/sipinat-backup
```

Lanjutkan hanya jika backup berhasil. Catat folder backup untuk pemulihan bila diperlukan.

```bash
git pull --ff-only origin main
```

Jika pull gagal karena perubahan lokal atau history berbeda, tangani penyebabnya; jangan langsung melakukan reset paksa.

```bash
docker compose build backend
```

Jika build berhasil, hentikan backend sebelum migrasi. Blok berikut memegang lock yang sama dengan backup otomatis. Jika migrasi gagal, backend tetap berhenti sampai masalah ditangani agar tidak melayani data dengan skema yang belum siap.

```bash
(
    set -e
    exec 9>/run/lock/sipinat-maintenance.lock
    flock -n 9 || { echo 'Backup/update lain sedang berjalan.' >&2; exit 1; }
    docker compose stop backend
    docker compose run --rm --no-deps migrate
    docker compose up -d --no-deps backend
)
```

```bash
docker compose ps -a
```

```bash
curl --fail --show-error https://api-sipinat.marshelportfolio.me/api/v1/health/ready
```

```bash
docker compose logs --tail=100 backend
```

Setelah kedua deployment selesai, periksa `/api/health` pada frontend dan alur yang berubah. Jangan menjalankan ulang seed atau restore kecuali memang ada perubahan data yang Anda rencanakan.

## 13. Pemulihan dari backup rutin

Untuk kehilangan VPS, siapkan VPS pengganti. Pasang Docker melalui [panduan resmi Ubuntu](https://docs.docker.com/engine/install/ubuntu/) serta Nginx dan Certbot sebelum mengikuti langkah project di panduan ini; bagian 3 mengasumsikan perangkat tersebut sudah tersedia pada VPS yang diperiksa. Sesuaikan alias SSH dan DNS jika IP server berubah. Gunakan source pada commit yang dicatat di `git-commit.txt` agar cocok dengan backup database. Ambil repository terlebih dahulu, lalu pilih commit itu sebelum membangun image. Pastikan penyesuaian skema dilakukan melalui migrasi yang sesuai.

Salin folder backup yang memiliki `COMPLETE` ke VPS baru. **Terminal VPS**, masuk ke folder backup tersebut:

```bash
cd /opt/sipinat-backups/NAMA_FOLDER_BACKUP
```

```bash
sha256sum --check SHA256SUMS
```

Pada VPS baru yang belum memiliki `.env` produksi, salin konfigurasi backup:

```bash
cp /opt/sipinat-backups/NAMA_FOLDER_BACKUP/app.env /opt/sipinat/.env
```

```bash
chmod 600 /opt/sipinat/.env
```

Sesuaikan `PUBLIC_ORIGIN` jika domain berubah. Untuk restore, gunakan urutan bagian 8.4 dengan `database.sql` sebagai dump dan `uploads.tar.gz` sebagai arsip unggahan. Mulai **MySQL saja → periksa database kosong → import SQL → build backend → restore unggahan dengan pemilik 10001:10001 → jalankan backend → periksa health**.

Jangan menimpa database Production yang masih berjalan tanpa jadwal pemulihan dan backup kondisi terkini. Dump dapat memuat `DROP TABLE`; restore mengembalikan data ke kondisi saat backup dibuat. Data setelah waktu backup tidak otomatis ikut pulih.

## 14. Kendala yang paling relevan

| Gejala | Pemeriksaan/tindakan |
| --- | --- |
| Frontend terbuka, API 503 | Periksa `API_INTERNAL_URL` Vercel, HTTPS backend, dan status backend/MySQL. |
| `INVALID_ORIGIN` / HTTP 403 saat login atau simpan | `PUBLIC_ORIGIN` harus persis origin frontend, tanpa slash terakhir; gunakan domain Production tetap. |
| Login berhasil lalu kembali ke halaman login | Periksa HTTPS, `COOKIE_SECURE=true`, cookie browser, dan apakah domain yang dibuka berubah. |
| MySQL access denied | Cocokkan `.env` dengan kredensial instance. Mengganti `MYSQL_PASSWORD` pada `.env` tidak otomatis mengganti password user di volume MySQL lama. |
| Migrasi mengeluh tabel sudah ada | Kemungkinan restore tanpa `alembic_version`, skema berbeda, atau migrasi dijalankan sebelum restore. Jangan menjatuhkan tabel atau melakukan stamp tanpa pemeriksaan skema. |
| Backend healthy tetapi asesmen belum bisa dimulai | Periksa soal PUBLISHED, kuota per peminatan, validasi, dan model PUBLISHED melalui admin. |
| HTTPS gagal terbit | Periksa A/AAAA DNS, port 80/443, dan apakah ada web server lain yang sudah memakai port tersebut. |
| Unggahan/ekspor besar gagal di Vercel | Route proxy berjalan sebagai Vercel Function. Payload memiliki batas platform di bawah batas 10 MB aplikasi. |

**Batas ukuran Vercel:** dokumentasi saat diperiksa menetapkan maksimum body request atau response Vercel Function **4,5 MB**. Karena file dan ekspor lewat proxy Next.js, file 10 MB yang diizinkan aplikasi tidak otomatis bisa lewat Vercel. Untuk penggunaan awal, pakai berkas yang total request multipart-nya di bawah 4,5 MB, misalnya file kurang dari 4 MB, dan periksa ukuran ekspor. Dukungan penuh 10 MB memerlukan perubahan jalur upload/download atau arsitektur; perubahan itu tidak dilakukan dalam panduan ini. Lihat [Vercel Functions Limits](https://vercel.com/docs/functions/limitations).

Untuk diagnosis pada VPS:

```bash
cd /opt/sipinat
```

```bash
docker compose logs --tail=100 mysql migrate backend
```

```bash
journalctl -u nginx -n 100 --no-pager
```

Untuk restart backend tanpa mengganti konfigurasi:

```bash
docker compose restart backend
```

Untuk menerapkan perubahan `.env`, gunakan `docker compose up -d --force-recreate backend`; restart biasa tidak memuat environment baru ke container.

Pertahankan nama project Compose `sipinat` agar perintah memakai volume yang sama. Jangan menggunakan `docker compose down -v` atau pembersihan volume sebagai langkah update/restart, karena volume berisi database dan unggahan.

## 15. Urutan pelaksanaan yang disarankan

1. Gunakan VPS melalui `ssh marshel2727`, siapkan DNS `api-sipinat`, dan import frontend di Vercel agar origin Production diketahui.
2. Perhatikan kapasitas RAM VPS; Docker/Nginx sudah ada. Clone SI-PINAT tanpa mengubah aplikasi lama.
3. Buat `.env` produksi dengan secret acak dan origin frontend yang benar.
4. Jika belum punya data: jalankan backend beserta MySQL/migrasi, buat admin, dan impor data awal. Jika punya data: restore pada MySQL baru sebelum migrasi/backend berjalan.
5. Aktifkan virtual host Nginx dan HTTPS Certbot, periksa health backend, lalu redeploy Vercel dengan `API_INTERNAL_URL` yang benar.
6. Login admin, tinjau/publikasikan soal dan model jika database masih baru, lalu periksa alur asesmen.
7. Jalankan backup pertama, aktifkan jadwal harian, dan simpan salinan di luar VPS.
8. Pada update berikutnya: backup, pull source, build, migrasi terkontrol, jalankan backend, dan periksa hasil deploy frontend.
