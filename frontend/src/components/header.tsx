"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconClose, IconMenu } from "./icons";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        toggleRef.current?.focus();
      }
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && headerRef.current && !headerRef.current.contains(target)) {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [mobileMenuOpen]);

  // Jangan render header publik di modul admin
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="header" ref={headerRef}>
      <div className="header-inner">
        <Link href="/" className="brand" onClick={closeMenu}>
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

        {/* Navigasi Desktop */}
        <nav className="desktop-nav" aria-label="Navigasi utama">
          <Link href="/" className={pathname === "/" ? "nav-active" : ""}>
            Beranda
          </Link>
          <Link href="/#alur">Alur Asesmen</Link>
          <Link href="/#tentang">Tentang SI-PINAT</Link>
          <Link href="/panduan" className={pathname === "/panduan" ? "nav-active" : ""}>
            Panduan
          </Link>
        </nav>

        <div className="header-actions">
          <Link className="button secondary compact desktop-only" href="/admin/login">
            Akses Admin
          </Link>

          {/* Tombol Hamburger untuk Mobile */}
          <button
            ref={toggleRef}
            type="button"
            className="mobile-menu-toggle"
            aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu navigasi"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <IconClose size={22} /> : <IconMenu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="mobile-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi mobile"
        >
          <nav aria-label="Navigasi mobile">
            <Link href="/" onClick={closeMenu}>
              Beranda
            </Link>
            <Link href="/#alur" onClick={closeMenu}>
              Alur Asesmen
            </Link>
            <Link href="/#tentang" onClick={closeMenu}>
              Tentang SI-PINAT
            </Link>
            <Link href="/panduan" onClick={closeMenu}>
              Panduan Penggunaan
            </Link>
            <hr className="drawer-divider" />
            <Link className="button secondary compact full" href="/admin/login" onClick={closeMenu}>
              Akses Admin Portal
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  const pathname = usePathname();

  // Jangan render footer publik di modul admin
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="footer">
      <div className="container footer-content">
        <div>
          <strong>SI-PINAT UNM</strong>
          <p>Sistem pendukung keputusan peminatan mahasiswa Teknik Komputer Universitas Negeri Makassar.</p>
          <small>Rekomendasi bersifat sebagai bahan konsultasi dan telaah akademik bersama Dosen Pembimbing Akademik (PA).</small>
        </div>
        <div className="footer-links">
          <Link href="/panduan">Panduan Asesmen</Link>
          <Link href="/admin/login">Portal Administrator</Link>
        </div>
      </div>
    </footer>
  );
}
