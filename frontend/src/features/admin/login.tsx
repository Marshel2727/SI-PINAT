"use client";

import { ErrorNotice, Notice } from "@/components/ui";
import { IconEye, IconEyeOff } from "@/components/icons";
import Link from "next/link";
import { useState } from "react";
import { useLogin } from "./use-login";

export function Login({ nextPath, expired = false }: {
  nextPath?: string;
  expired?: boolean;
} = {}) {
  const { busy, checkingSession, error, submit } = useLogin(nextPath);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main id="main-content" className="login-background">
      <article className="login-form-container">
        <img
          className="login-logo"
          src="/images/e2ec3.png"
          width="40"
          height="40"
          alt="Logo SI-PINAT"
        />
        <h1 className="login-title">Selamat Datang</h1>
        <p className="login-subtitle">Masuk ke Panel Administrator SI-PINAT</p>

        {expired && (
          <Notice>
            Sesi administrator Anda telah berakhir atau belum terautentikasi. Silakan masuk kembali untuk melanjutkan.
          </Notice>
        )}
        {checkingSession && (
          <p className="small muted login-status-text">Memeriksa sesi administrator aktif…</p>
        )}

        <form className="login-form" onSubmit={submit}>
          <div className="login-field-group">
            <label htmlFor="admin-email" className="visually-hidden">
              Email administrator
            </label>
            <input
              id="admin-email"
              type="email"
              name="email"
              className="login-input"
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Email administrator"
              required
              maxLength={190}
            />
          </div>

          <div className="login-field-group">
            <label htmlFor="admin-password" className="visually-hidden">
              Kata sandi
            </label>
            <div className="password-field-wrapper">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                name="password"
                className="login-input"
                autoComplete="current-password"
                placeholder="Kata sandi"
                required
                maxLength={512}
              />
              <button
                type="button"
                className="password-toggle-btn"
                aria-pressed={showPassword}
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
          </div>

          <p className="login-page-link">
            <span className="login-page-link-label">Maks. 10 percobaan / 5 menit</span>
          </p>

          <ErrorNotice error={error} />

          <button type="submit" className="login-form-btn" disabled={busy}>
            {busy ? "Memeriksa kredensial\u2026" : "Masuk"}
          </button>
        </form>

        <p className="login-sign-up-label">
          Belum memiliki akses?
          <span className="login-sign-up-highlight">Hubungi Koordinator</span>
        </p>

        <div className="login-buttons-container">
          <Link href="/" className="login-portal-btn">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Kembali ke Portal Mahasiswa</span>
          </Link>
        </div>
      </article>
    </main>
  );
}
