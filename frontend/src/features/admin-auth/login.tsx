"use client";

import { ErrorNotice, Field } from "@/components/ui";
import { IconEye, IconEyeOff } from "@/components/icons";
import Link from "next/link";
import { useState } from "react";
import { useLogin } from "./use-login";

export function Login() {
  const { busy, error, submit } = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="login-background">
      <article className="card login-card">
        <span className="badge">PORTAL MANAJEMEN AKADEMIK</span>
        <img
          className="login-logo"
          src="/images/e2ec3.png"
          width="64"
          height="64"
          alt="SI-PINAT"
        />
        <h1>Masuk sebagai Administrator</h1>
        <p>
          Kelola mata kuliah kurikulum, bank instrumen kompetensi, dan konfigurasi versi model fuzzy SI-PINAT.
        </p>

        <form onSubmit={submit}>
          <Field label="Email administrator">
            <input
              type="email"
              name="email"
              autoComplete="username"
              placeholder="admin@unm.ac.id"
              required
              maxLength={190}
            />
          </Field>

          <Field label="Kata sandi">
            <div className="password-field-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Masukkan kata sandi"
                required
                maxLength={512}
              />
              <button
                type="button"
                className="password-toggle-btn"
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
          </Field>

          <ErrorNotice error={error} />

          <button className="full" disabled={busy} style={{ marginTop: 8 }}>
            {busy ? "Memeriksa kredensial\u2026" : "Masuk ke Panel Admin →"}
          </button>
        </form>

        <p className="small muted" style={{ marginTop: 20 }}>
          Gunakan akun terdaftar yang dibuat oleh koordinator sistem.
        </p>
        <Link href="/">← Kembali ke Portal Mahasiswa</Link>
      </article>
    </main>
  );
}
