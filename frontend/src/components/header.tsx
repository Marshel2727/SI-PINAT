"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconClose, IconMenu } from "./icons";

const PUBLIC_NAV_LINKS = [
  { href: "/", label: "Beranda" },
  { href: "/panduan", label: "Alur & Panduan" },
  { href: "/tentang", label: "Tentang & Metode" },
] as const;

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
        <nav className="desktop-nav" aria-label="Utama">
          {PUBLIC_NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={active ? "nav-active" : undefined}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="header-actions">
          <Link className="button secondary compact desktop-only" href="/admin/login">
            Portal Admin
          </Link>

          {/* Tombol Hamburger untuk Mobile */}
          <button
            ref={toggleRef}
            type="button"
            className="mobile-menu-toggle"
            aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
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
        <div id="mobile-nav-drawer" className="mobile-drawer">
          <nav aria-label="Utama mobile">
            {PUBLIC_NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={active ? "nav-active" : undefined}
                  aria-current={active ? "page" : undefined}
                  onClick={closeMenu}
                >
                  {label}
                </Link>
              );
            })}
            <hr className="drawer-divider" />
            <Link className="button secondary compact full" href="/admin/login" onClick={closeMenu}>
              Portal Admin
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
          <p>Teknik Komputer — Universitas Negeri Makassar.</p>
        </div>
        <div className="footer-links">
          <Link href="/">Beranda</Link>
          <Link href="/panduan">Alur &amp; Panduan</Link>
          <Link href="/tentang">Tentang &amp; Metode</Link>
          <Link href="/admin/login">Portal Admin</Link>
        </div>
      </div>
    </footer>
  );
}
