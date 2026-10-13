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
        <strong>SI-PINAT Admin</strong>
        <small>MODUL EVALUASI</small>
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
        <button className="logout" disabled={busy} onClick={logout}>
          Keluar
        </button>
      </aside>
      <main className="admin-main">
        <div className="admin-topbar">
          <span>
            Sistem Rekomendasi › <strong>Panel Administrasi</strong>
          </span>
          <span className="badge">
            {user?.full_name || "Memeriksa sesi\u2026"}
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
