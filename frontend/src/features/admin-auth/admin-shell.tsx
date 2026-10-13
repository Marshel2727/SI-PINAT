"use client";

import { ErrorNotice, Notice } from "@/components/ui";
import Link from "next/link";
import { type ReactNode } from "react";
import { useAdminSession } from "./use-admin-session";

const links = [
  ["/admin", "Dashboard"],
  ["/admin/mata-kuliah", "Kelola Mata Kuliah"],
  ["/admin/bank-soal", "Bank Soal Kompetensi"],
  ["/admin/model-fuzzy", "Konfigurasi Fuzzy"],
  ["/admin/validasi", "Skenario Validasi"]
];

export function AdminShell({ children }: {
  children: ReactNode;
}) {
  const { user, error, busy, pathname, logout } = useAdminSession();
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div>
          <strong style={{ fontSize: "16px", color: "var(--navy)" }}>SI-PINAT Admin</strong>
          <small style={{ display: "block", color: "var(--text-secondary)", marginTop: 2, fontSize: "11px" }}>
            MODUL EVALUASI & INSTRUMEN
          </small>
        </div>

        <nav aria-label="Modul administrasi">
          {links.map(([url, title]) => (
            <Link
              key={url}
              href={url}
              className={pathname === url ||
                (url !== "/admin" && pathname.startsWith(url))
                ? "active" : ""}
            >
              {title}
            </Link>
          ))}
        </nav>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
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
          <button className="logout" disabled={busy} onClick={logout}>
            Keluar dari Sesi
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <span>
            Sistem Rekomendasi › <strong>Panel Administrasi</strong>
          </span>
          <span className="badge" style={{ background: "#e2edff", color: "var(--primary)" }}>
            ● {user?.full_name || "Memeriksa sesi\u2026"}
          </span>
        </div>
        <ErrorNotice error={error} />
        {user
          ? children
          : !error && <Notice>Memeriksa sesi administrator…</Notice>}
      </main>
    </div>
  );
}
