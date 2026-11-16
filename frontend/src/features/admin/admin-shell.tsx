"use client";

import { ErrorNotice, Notice } from "@/components/ui";
import { IconClose, IconMenu } from "@/components/icons";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAdminSession } from "./use-admin-session";

const links = [
  ["/admin", "Dashboard"],
  ["/admin/mata-kuliah", "Kelola Mata Kuliah"],
  ["/admin/bank-soal", "Bank Soal Kompetensi"],
  ["/admin/model-fuzzy", "Konfigurasi Fuzzy"],
  ["/admin/validasi", "Skenario Validasi"],
  ["/admin/log-aktivitas", "Log Aktivitas"]
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
  return { current: "Panel Administrasi" };
}

export function AdminShell({ children }: {
  children: ReactNode;
}) {
  const { user, error, sessionNotice, sessionExpired, busy, pathname, logout } = useAdminSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const crumb = resolveBreadcrumb(pathname);

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="spread">
          <div>
            <strong style={{ fontSize: "16px", color: "var(--navy)" }}>SI-PINAT Admin</strong>
            <small style={{ display: "block", color: "var(--text-secondary)", marginTop: 2, fontSize: "11px" }}>
              MODUL EVALUASI &amp; INSTRUMEN
            </small>
          </div>
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-expanded={mobileMenuOpen}
            aria-controls="admin-sidebar-actions"
            aria-label={mobileMenuOpen ? "Tutup menu sesi admin" : "Buka menu sesi admin"}
            onClick={() => setMobileMenuOpen(v => !v)}
          >
            {mobileMenuOpen ? <IconClose size={18} /> : <IconMenu size={18} />}
          </button>
        </div>

        <nav aria-label="Modul administrasi">
          {links.map(([url, title]) => {
            const active = pathname === url || (url !== "/admin" && pathname.startsWith(url));
            return (
              <Link
                key={url}
                href={url}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
              >
                {title}
              </Link>
            );
          })}
        </nav>

        <div
          id="admin-sidebar-actions"
          className={mobileMenuOpen ? undefined : "desktop-only"}
          style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}
        >
          <Link
            href="/"
            style={{
              fontSize: "12px",
              color: "var(--primary)",
              padding: "8px 12px",
              borderRadius: "6px",
              display: "block",
              textDecoration: "none",
              border: "1px dashed var(--border)"
            }}
          >
            ↗ Buka Portal Mahasiswa
          </Link>
          <button type="button" className="logout" disabled={busy} onClick={logout}>
            {busy ? "Keluar\u2026" : "Keluar dari Sesi"}
          </button>
        </div>
      </aside>

      <main className="admin-main" id="admin-main-content">
        <div className="admin-topbar">
          <nav aria-label="Breadcrumb">
            <span>
              Sistem Rekomendasi › <Link href="/admin">Panel Administrasi</Link>
              {crumb.parent && (
                <>
                  {" › "}
                  <Link href={crumb.parent.href}>{crumb.parent.label}</Link>
                </>
              )}
              {" › "}
              <strong>{crumb.current}</strong>
            </span>
          </nav>
          <span className="badge" style={{ background: "#e2edff", color: "var(--primary)" }}>
            ● {user?.full_name || "Memeriksa sesi\u2026"}
          </span>
        </div>
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
  );
}
