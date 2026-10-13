"use client";

import { ErrorNotice, Field } from "@/components/ui";
import Link from "next/link";
import { useLogin } from "./use-login";

export function Login() {
  const { busy, error, submit } = useLogin();
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
          Kelola mata kuliah, instrumen kompetensi, dan versi model fuzzy
          SI-PINAT.
        </p>
        <form onSubmit={submit}>
          <Field label="Email administrator">
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              maxLength={190}
            />
          </Field>
          <Field label="Kata sandi">
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              maxLength={512}
            />
          </Field>
          <ErrorNotice error={error} />
          <button className="full" disabled={busy}>
            {busy ? "Memeriksa akun\u2026" : "Masuk ke panel admin"}
          </button>
        </form>
        <p className="small muted">
          Gunakan akun yang dibuat pengelola. Tidak tersedia akun atau kata
          sandi bawaan.
        </p>
        <Link href="/">← Kembali ke portal mahasiswa</Link>
      </article>
    </main>
  );
}
