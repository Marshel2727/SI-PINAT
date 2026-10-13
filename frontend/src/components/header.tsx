import Link from "next/link";

export function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="brand">
          <img
            src="/images/e2ec3.png"
            width="32"
            height="32"
            alt="Logo SI-PINAT"
          />
          <span>
            <strong>SI-PINAT</strong>
            <small>Teknik Komputer UNM</small>
          </span>
        </Link>
        <nav aria-label="Navigasi utama">
          <Link href="/">Beranda</Link>
          <Link href="/#alur">Alur Asesmen</Link>
          <Link href="/#tentang">Tentang SI-PINAT</Link>
          <Link href="/panduan">Panduan</Link>
        </nav>
        <Link className="button secondary compact" href="/admin/login">Akses Admin</Link>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <strong>SI-PINAT UNM</strong>
      <p>Sistem pendukung keputusan peminatan mahasiswa Teknik Komputer.</p>
      <small>Rekomendasi menjadi bahan konsultasi bersama dosen pembimbing akademik.</small>
    </footer>
  );
}
