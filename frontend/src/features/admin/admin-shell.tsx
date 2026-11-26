"use client";

import { ErrorNotice, Notice } from "@/components/ui";
import {
  IconActivity,
  IconBookOpen,
  IconCheckCircle,
  IconChevronDown,
  IconClose,
  IconExternalLink,
  IconFileText,
  IconLayoutGrid,
  IconLogOut,
  IconMenu,
  IconSliders,
  IconUser,
} from "@/components/icons";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AdminSessionContext, getInitials } from "./admin-session-context";
import { useAdminSession } from "./use-admin-session";

const PRIMARY_LINKS = [
  { href: "/admin", label: "Dashboard", Icon: IconLayoutGrid },
  { href: "/admin/mata-kuliah", label: "Kelola Mata Kuliah", Icon: IconBookOpen },
  { href: "/admin/bank-soal", label: "Bank Soal Kompetensi", Icon: IconFileText },
  { href: "/admin/model-fuzzy", label: "Konfigurasi Fuzzy", Icon: IconSliders },
  { href: "/admin/validasi", label: "Skenario Validasi", Icon: IconCheckCircle },
  { href: "/admin/log-aktivitas", label: "Log Aktivitas", Icon: IconActivity },
] as const;

function resolveBreadcrumb(pathname: string): {
  parent?: { label: string; href: string };
  current: string;
} {
  if (pathname === "/admin")
    return { current: "Dashboard" };
  if (pathname.startsWith("/admin/asesmen"))
    return { parent: { label: "Dashboard", href: "/admin" }, current: "Detail Asesmen" };
  if (pathname.startsWith("/admin/mata-kuliah"))
    return { current: "Kelola Mata Kuliah" };
  if (pathname === "/admin/bank-soal/baru")
    return { parent: { label: "Bank Soal Kompetensi", href: "/admin/bank-soal" }, current: "Tambah Soal" };
  if (pathname.startsWith("/admin/bank-soal/"))
    return { parent: { label: "Bank Soal Kompetensi", href: "/admin/bank-soal" }, current: "Detail & Revisi Soal" };
  if (pathname.startsWith("/admin/bank-soal"))
    return { current: "Bank Soal Kompetensi" };
  if (pathname.startsWith("/admin/model-fuzzy/"))
    return { parent: { label: "Konfigurasi Fuzzy", href: "/admin/model-fuzzy" }, current: "Editor Model Fuzzy" };
  if (pathname.startsWith("/admin/model-fuzzy"))
    return { current: "Konfigurasi Fuzzy" };
  if (pathname.startsWith("/admin/validasi"))
    return { current: "Skenario Validasi" };
  if (pathname.startsWith("/admin/log-aktivitas"))
    return { current: "Log Aktivitas" };
  if (pathname.startsWith("/admin/profil"))
    return { current: "Profil Administrator" };
  return { current: "Panel Administrasi" };
}

export function AdminShell({ children }: {
  children: ReactNode;
}) {
  const {
    user,
    setUser,
    refreshSession,
    error,
    sessionNotice,
    sessionExpired,
    busy,
    pathname,
    logout,
  } = useAdminSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!profileMenuOpen && !mobileMenuOpen)
      return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        setMobileMenuOpen(false);
      }
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (
        profileMenuOpen &&
        target instanceof Node &&
        profileWrapperRef.current &&
        !profileWrapperRef.current.contains(target)
      ) {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [profileMenuOpen, mobileMenuOpen]);

  const crumb = resolveBreadcrumb(pathname);
  const initials = getInitials(user?.full_name);

  return (
    <AdminSessionContext.Provider value={{ user, setUser, refreshSession, logout, busy }}>
      <div className="admin-layout">
        <a href="#admin-main-content" className="skip-link visually-hidden">
          Lewati ke konten utama admin
        </a>

        <header className="admin-navbar">
          <div className="admin-navbar-inner">
            <div className="admin-navbar-left">
              <button
                type="button"
                className="admin-mobile-toggle"
                aria-expanded={mobileMenuOpen}
                aria-controls="admin-sidebar"
                aria-label={mobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
                onClick={() => setMobileMenuOpen(v => !v)}
              >
                {mobileMenuOpen ? <IconClose size={18} /> : <IconMenu size={18} />}
              </button>

              <Link href="/admin" className="admin-brand">
                <img
                  src="/images/e2ec3.png"
                  width="32"
                  height="32"
                  alt="Logo SI-PINAT"
                />
                <span>
                  <span className="admin-brand-title">
                    <strong>SI-PINAT</strong>
                    <span className="admin-brand-pill">ADMIN</span>
                  </span>
                  <small>Teknik Komputer UNM</small>
                </span>
              </Link>

              <span className="admin-navbar-divider" aria-hidden="true" />

              <nav className="admin-navbar-breadcrumb" aria-label="Breadcrumb">
                <Link href="/admin">Panel Admin</Link>
                {crumb.parent && (
                  <>
                    <span className="admin-crumb-sep" aria-hidden="true">/</span>
                    <Link href={crumb.parent.href}>{crumb.parent.label}</Link>
                  </>
                )}
                <span className="admin-crumb-sep" aria-hidden="true">/</span>
                <strong>{crumb.current}</strong>
              </nav>
            </div>

            <div className="admin-navbar-right">
              <Link href="/" className="admin-portal-link desktop-only">
                <span>Portal Mahasiswa</span>
                <IconExternalLink size={14} />
              </Link>

              <div className="admin-profile-wrapper" ref={profileWrapperRef}>
                <button
                  type="button"
                  className="admin-profile-trigger"
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  aria-controls="admin-profile-menu"
                  aria-label="Menu profil administrator"
                  onClick={() => setProfileMenuOpen(v => !v)}
                >
                  <span className="admin-avatar" aria-hidden="true">
                    {initials}
                    <span className="admin-avatar-status" />
                  </span>
                  <span className="admin-profile-meta">
                    <strong className="admin-profile-name">
                      {user?.full_name || "Memeriksa sesi\u2026"}
                    </strong>
                    <small className="admin-profile-role">Administrator</small>
                  </span>
                  <IconChevronDown
                    size={15}
                    className={`admin-profile-chevron${profileMenuOpen ? " is-open" : ""}`}
                  />
                </button>

                {profileMenuOpen && (
                  <div
                    id="admin-profile-menu"
                    className="admin-profile-dropdown"
                    role="menu"
                    aria-label="Menu akun administrator"
                  >
                    <div className="admin-dropdown-header">
                      <span className="admin-avatar lg" aria-hidden="true">
                        {initials}
                        <span className="admin-avatar-status" />
                      </span>
                      <div className="admin-dropdown-identity">
                        <strong>{user?.full_name || "Administrator"}</strong>
                        <span>{user?.email || "Memuat email\u2026"}</span>
                        <span className="admin-dropdown-status">● Sesi Aktif</span>
                      </div>
                    </div>

                    <div className="admin-dropdown-divider" />

                    <Link
                      href="/admin/profil"
                      role="menuitem"
                      className={`admin-dropdown-item${pathname.startsWith("/admin/profil") ? " is-active" : ""}`}
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <IconUser size={16} />
                      <span>Profil &amp; Keamanan</span>
                    </Link>

                    <Link
                      href="/admin/log-aktivitas"
                      role="menuitem"
                      className={`admin-dropdown-item${pathname.startsWith("/admin/log-aktivitas") ? " is-active" : ""}`}
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <IconActivity size={16} />
                      <span>Log Aktivitas</span>
                    </Link>

                    <Link
                      href="/"
                      role="menuitem"
                      className="admin-dropdown-item"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <IconExternalLink size={16} />
                      <span>Portal Mahasiswa</span>
                    </Link>

                    <div className="admin-dropdown-divider" />

                    <button
                      type="button"
                      role="menuitem"
                      className="admin-dropdown-item is-danger"
                      disabled={busy}
                      onClick={() => {
                        setProfileMenuOpen(false);
                        void logout();
                      }}
                    >
                      <IconLogOut size={16} />
                      <span>{busy ? "Keluar\u2026" : "Keluar dari Sesi"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="admin-shell-body">
          {mobileMenuOpen && (
            <div
              className="admin-mobile-backdrop"
              aria-hidden="true"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          <aside
            id="admin-sidebar"
            className={`admin-sidebar${mobileMenuOpen ? " is-open" : ""}`}
            aria-label="Navigasi panel admin"
          >
            <div className="admin-sidebar-section">
              <span className="admin-sidebar-label">MENU UTAMA</span>
              <nav aria-label="Modul administrasi">
                {PRIMARY_LINKS.map(({ href, label, Icon }) => {
                  const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={active ? "active" : ""}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon size={16} />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="admin-sidebar-footer">
              <Link
                href="/"
                className="admin-sidebar-portal"
                onClick={() => setMobileMenuOpen(false)}
              >
                <IconExternalLink size={15} />
                <span>Portal Mahasiswa</span>
              </Link>
              <button type="button" className="logout" disabled={busy} onClick={logout}>
                <IconLogOut size={16} />
                <span>{busy ? "Keluar\u2026" : "Keluar dari Sesi"}</span>
              </button>
            </div>
          </aside>

          <main className="admin-main" id="admin-main-content">
            <nav className="admin-mobile-breadcrumb" aria-label="Breadcrumb mobile">
              <Link href="/admin">Panel Admin</Link>
              {crumb.parent && (
                <>
                  <span aria-hidden="true">/</span>
                  <Link href={crumb.parent.href}>{crumb.parent.label}</Link>
                </>
              )}
              <span aria-hidden="true">/</span>
              <strong>{crumb.current}</strong>
            </nav>

            {sessionNotice && (
              <Notice tone={sessionExpired ? "error" : "info"}>
                {sessionNotice}
              </Notice>
            )}
            <ErrorNotice error={error} />
            {user
              ? children
              : !error && !sessionExpired && <Notice>Memeriksa sesi administrator…</Notice>}
          </main>
        </div>
      </div>
    </AdminSessionContext.Provider>
  );
}
