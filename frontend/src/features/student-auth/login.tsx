"use client";

import { IconEye, IconEyeOff } from "@/components/icons";
import { ErrorNotice, Field } from "@/components/ui";
import Link from "next/link";
import { useState } from "react";
import { useStudentAuth } from "./use-student-auth";

export function StudentLogin({ nextPath }: { nextPath?: string }) {
  const {
    tab,
    switchTab,
    busy,
    checkingSession,
    error,
    submitLogin,
    submitRegister,
  } = useStudentAuth(nextPath);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <main id="main-content" className="student-auth-page">
      <article className="student-auth-card">
        <div className="student-auth-brand">
          <img
            src="/images/e2ec3.png"
            width="40"
            height="40"
            alt="Logo SI-PINAT"
          />
          <div>
            <h1>SI-PINAT TEKOM</h1>
            <p className="small muted">Portal Penentuan Peminatan Teknik Komputer UNM</p>
          </div>
        </div>

        <div className="student-auth-tabs" role="tablist" aria-label="Akses akun mahasiswa">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "login"}
            className={tab === "login" ? "is-active" : "secondary"}
            disabled={busy}
            onClick={() => switchTab("login")}
          >
            Masuk
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "register"}
            className={tab === "register" ? "is-active" : "secondary"}
            disabled={busy}
            onClick={() => switchTab("register")}
          >
            Daftar Akun TEKOM
          </button>
        </div>

        {checkingSession && (
          <p className="small muted student-auth-status">Memeriksa sesi mahasiswa…</p>
        )}

        {tab === "login" ? (
          <form className="student-auth-form" onSubmit={submitLogin}>
            <Field label="NIM Mahasiswa TEKOM">
              <input
                name="nim"
                type="text"
                inputMode="numeric"
                autoComplete="username"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Contoh: 250210501029"
                required
                minLength={4}
                maxLength={20}
                disabled={busy}
              />
            </Field>
            <p className="small muted student-auth-hint">
              Khusus mahasiswa Program Studi Teknik Komputer UNM (kode prodi <span className="mono">021050</span>).
            </p>

            <Field label="Kata Sandi">
              <div className="password-field-wrapper">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                  required
                  maxLength={512}
                  disabled={busy}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </Field>

            <ErrorNotice error={error} />

            <button type="submit" className="full" disabled={busy}>
              {busy ? "Memeriksa akun…" : "Masuk ke Portal"}
            </button>
          </form>
        ) : (
          <form className="student-auth-form" onSubmit={submitRegister}>
            <Field label="NIM Mahasiswa TEKOM">
              <input
                name="nim"
                type="text"
                inputMode="numeric"
                autoComplete="username"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Contoh: 250210501029"
                required
                minLength={4}
                maxLength={20}
                disabled={busy}
              />
            </Field>
            <p className="small muted student-auth-hint">
              Format NIM UNM Prodi Teknik Komputer: <span className="mono">XX021050XXXX</span> (mis. <span className="mono">250210501029</span>).
            </p>

            <Field label="Nama Lengkap">
              <input
                name="full_name"
                type="text"
                autoComplete="name"
                placeholder="Sesuai data akademik SIAKAD"
                required
                minLength={2}
                maxLength={120}
                disabled={busy}
              />
            </Field>

            <Field label="Kelas (opsional)">
              <input
                name="class_name"
                type="text"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Contoh: TEKOM A"
                maxLength={40}
                disabled={busy}
              />
            </Field>

            <Field label="Kata Sandi (minimal 6 karakter)">
              <div className="password-field-wrapper">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Buat kata sandi"
                  required
                  minLength={6}
                  maxLength={512}
                  disabled={busy}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </Field>

            <Field label="Konfirmasi Kata Sandi">
              <div className="password-field-wrapper">
                <input
                  name="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Ulangi kata sandi"
                  required
                  minLength={6}
                  maxLength={512}
                  disabled={busy}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  aria-pressed={showConfirmPassword}
                  aria-label={showConfirmPassword ? "Sembunyikan konfirmasi kata sandi" : "Tampilkan konfirmasi kata sandi"}
                  onClick={() => setShowConfirmPassword(v => !v)}
                >
                  {showConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </Field>

            <ErrorNotice error={error} />

            <button type="submit" className="full" disabled={busy}>
              {busy ? "Mendaftarkan akun…" : "Daftar Akun TEKOM & Masuk"}
            </button>
          </form>
        )}

        <div className="student-auth-footer">
          <Link href="/admin/login">Portal Admin</Link>
        </div>
      </article>
    </main>
  );
}
