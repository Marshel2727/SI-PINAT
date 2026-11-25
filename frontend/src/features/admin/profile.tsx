"use client";

import { ErrorNotice, Field, Notice, StatusBadge } from "@/components/ui";
import {
  IconActivity,
  IconEye,
  IconEyeOff,
  IconLock,
  IconLogOut,
  IconMonitor,
  IconShield,
  IconUser,
} from "@/components/icons";
import { formatRemainingTime, time } from "@/lib/format";
import Link from "next/link";
import { useState } from "react";
import { getInitials } from "./admin-session-context";
import { evaluatePasswordStrength, useProfile } from "./use-profile";

const ENTITY_NAMES: Record<string, string> = {
  admin_sessions: "Sesi Admin",
  admin_users: "Akun Admin",
  courses: "Mata Kuliah",
  questions: "Bank Soal",
  fuzzy_model_versions: "Model Fuzzy",
  fuzzy_validation_cases: "Validasi",
  grade_conversions: "Konversi Nilai",
  course_weights: "Bobot Mata Kuliah",
  fuzzy_variables: "Variabel Fuzzy",
  fuzzy_sets: "Himpunan Fuzzy",
  fuzzy_rules: "Aturan Fuzzy",
  assessments: "Asesmen",
};

const ACTION_NAMES: Record<string, string> = {
  LOGIN: "Masuk Admin",
  LOGOUT: "Keluar Admin",
  CREATE: "Tambah Data",
  UPDATE: "Perbarui Data",
  SAVE: "Simpan",
  DELETE: "Hapus Data",
  PUBLISH: "Publikasikan",
  PUBLISHED: "Publikasikan",
  ARCHIVED: "Arsipkan",
  CLONE: "Kloning Model",
  VALIDATE: "Uji Validasi",
  CHANGE_PASSWORD: "Ubah Kata Sandi",
  REVOKE_OTHER_SESSIONS: "Akhiri Sesi Lain",
};

function badgeToneForAction(action: string): string {
  if (action === "DELETE" || action === "REVOKE_OTHER_SESSIONS")
    return "FAILED";
  if (action === "PUBLISH" || action === "PUBLISHED" || action === "CHANGE_PASSWORD")
    return "PUBLISHED";
  return action;
}

export function AdminProfile() {
  const {
    user,
    logout,
    busy,
    fullName,
    setFullName,
    isProfileDirty,
    savingProfile,
    profileError,
    profileSuccess,
    saveProfile,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    savingPassword,
    passwordError,
    passwordSuccess,
    savePassword,
    revokingSessions,
    sessionActionError,
    sessionActionSuccess,
    revokeOtherSessions,
    recentLogs,
    logsLoading,
  } = useProfile();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!user) {
    return null;
  }

  const initials = getInitials(user.full_name);
  const remaining = formatRemainingTime(user.session_expires_at);
  const strength = evaluatePasswordStrength(newPassword);
  const passwordMatches = Boolean(confirmPassword && newPassword === confirmPassword);

  return (
    <div className="profile-page">
      <section className="card profile-hero-card" aria-label="Ringkasan Profil Administrator">
        <div className="profile-hero-banner" aria-hidden="true" />
        <div className="profile-hero-body">
          <div className="profile-hero-identity">
            <div className="profile-avatar-xl" aria-hidden="true">
              {initials}
              <span className="profile-avatar-xl-badge" title="Akun Aktif" />
            </div>
            <div className="profile-hero-text">
              <div className="profile-hero-badges">
                <span className="eyebrow">PROFIL ADMINISTRATOR</span>
                <span className="badge success">● Akun Aktif</span>
              </div>
              <h1>{user.full_name}</h1>
              <p className="profile-hero-email">
                <span>{user.email}</span>
                <span aria-hidden="true">·</span>
                <span>Koordinator / Administrator SI-PINAT UNM</span>
              </p>
            </div>
          </div>

          <div className="profile-hero-actions">
            <Link href="/admin/log-aktivitas" className="button secondary compact">
              <IconActivity size={15} />
              <span>Log Aktivitas</span>
            </Link>
            <button
              type="button"
              className="secondary compact"
              disabled={busy}
              onClick={logout}
            >
              <IconLogOut size={15} />
              <span>{busy ? "Keluar\u2026" : "Keluar"}</span>
            </button>
          </div>
        </div>

        <div className="profile-meta-strip">
          <div className="profile-meta-item">
            <small>ID Akun</small>
            <strong className="mono">ADM-{String(user.id).padStart(3, "0")}</strong>
          </div>
          <div className="profile-meta-item">
            <small>Sisa Masa Sesi</small>
            <strong>{remaining ?? "Sesi Aktif"}</strong>
          </div>
          <div className="profile-meta-item">
            <small>Sesi Aktif Saat Ini</small>
            <strong>{user.active_sessions_count ?? 1} perangkat / tab</strong>
          </div>
        </div>
      </section>

      <div className="profile-grid">
        <article className="card profile-card">
          <div className="profile-card-header">
            <span className="profile-card-icon" aria-hidden="true">
              <IconUser size={18} />
            </span>
            <div>
              <h2>Informasi Akun</h2>
              <p className="small muted">Identitas administrator yang tampil pada navbar dan log audit.</p>
            </div>
          </div>

          <form onSubmit={saveProfile}>
            <Field label="Nama lengkap">
              <input
                type="text"
                name="full_name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Nama lengkap administrator"
                minLength={2}
                maxLength={120}
                required
              />
            </Field>

            <Field label="Email administrator">
              <input
                type="email"
                value={user.email}
                readOnly
                disabled
                aria-readonly="true"
              />
              <small className="muted">
                Alamat email dikelola langsung oleh koordinator sistem dan tidak dapat diubah mandiri.
              </small>
            </Field>

            <Field label="Peran akses">
              <input
                type="text"
                value="Administrator Sistem (Akses Penuh)"
                readOnly
                disabled
                aria-readonly="true"
              />
            </Field>

            {profileSuccess && <Notice tone="success">{profileSuccess}</Notice>}
            <ErrorNotice error={profileError} />

            <div className="actions" style={{ marginTop: 18 }}>
              <button
                type="submit"
                disabled={savingProfile || !isProfileDirty}
              >
                {savingProfile ? "Menyimpan\u2026" : "Simpan Perubahan Profil"}
              </button>
            </div>
          </form>
        </article>

        <article className="card profile-card">
          <div className="profile-card-header">
            <span className="profile-card-icon" aria-hidden="true">
              <IconLock size={18} />
            </span>
            <div>
              <h2>Keamanan &amp; Kata Sandi</h2>
              <p className="small muted">Gunakan kata sandi kuat minimal 8 karakter. Sesi lain otomatis diakhiri.</p>
            </div>
          </div>

          <form onSubmit={savePassword}>
            <Field label="Kata sandi saat ini">
              <div className="password-field-wrapper">
                <input
                  type={showCurrent ? "text" : "password"}
                  name="current_password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi saat ini"
                  required
                  maxLength={512}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  aria-pressed={showCurrent}
                  aria-label={showCurrent ? "Sembunyikan kata sandi saat ini" : "Tampilkan kata sandi saat ini"}
                  onClick={() => setShowCurrent(v => !v)}
                >
                  {showCurrent ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </Field>

            <Field label="Kata sandi baru">
              <div className="password-field-wrapper">
                <input
                  type={showNew ? "text" : "password"}
                  name="new_password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Minimal 8 karakter"
                  minLength={8}
                  maxLength={512}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  aria-pressed={showNew}
                  aria-label={showNew ? "Sembunyikan kata sandi baru" : "Tampilkan kata sandi baru"}
                  onClick={() => setShowNew(v => !v)}
                >
                  {showNew ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
              {newPassword.length > 0 && (
                <div className="password-strength" aria-live="polite">
                  <div className="password-strength-bars" aria-hidden="true">
                    {[1, 2, 3, 4].map(level => (
                      <span
                        key={level}
                        className={`strength-bar${strength.score >= level ? ` is-filled tone-${strength.tone}` : ""}`}
                      />
                    ))}
                  </div>
                  <small className={`strength-label tone-${strength.tone}`}>
                    Kekuatan: {strength.label}
                  </small>
                </div>
              )}
            </Field>

            <Field label="Konfirmasi kata sandi baru">
              <div className="password-field-wrapper">
                <input
                  type={showConfirm ? "text" : "password"}
                  name="confirm_password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Ulangi kata sandi baru"
                  minLength={8}
                  maxLength={512}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  aria-pressed={showConfirm}
                  aria-label={showConfirm ? "Sembunyikan konfirmasi kata sandi" : "Tampilkan konfirmasi kata sandi"}
                  onClick={() => setShowConfirm(v => !v)}
                >
                  {showConfirm ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <small className={passwordMatches ? "check-ready" : "check-missing"}>
                  {passwordMatches ? "✓ Konfirmasi kata sandi cocok." : "Konfirmasi kata sandi belum cocok."}
                </small>
              )}
            </Field>

            {passwordSuccess && <Notice tone="success">{passwordSuccess}</Notice>}
            <ErrorNotice error={passwordError} />

            <div className="actions" style={{ marginTop: 18 }}>
              <button type="submit" disabled={savingPassword}>
                <IconShield size={15} />
                <span>{savingPassword ? "Memperbarui\u2026" : "Perbarui Kata Sandi"}</span>
              </button>
            </div>
          </form>
        </article>
      </div>

      <div className="profile-grid">
        <article className="card profile-card">
          <div className="profile-card-header">
            <span className="profile-card-icon" aria-hidden="true">
              <IconMonitor size={18} />
            </span>
            <div>
              <h2>Sesi &amp; Detail Akun</h2>
              <p className="small muted">Pantau masa berlaku sesi saat ini dan kelola akses perangkat lain.</p>
            </div>
          </div>

          <dl className="profile-detail-list">
            <div className="profile-detail-row">
              <dt>Status Akun</dt>
              <dd>
                <StatusBadge status={user.is_active === false ? "FAILED" : "COMPLETED"}>
                  {user.is_active === false ? "Nonaktif" : "Aktif"}
                </StatusBadge>
              </dd>
            </div>
            <div className="profile-detail-row">
              <dt>Sesi Aktif</dt>
              <dd>{user.active_sessions_count ?? 1} sesi</dd>
            </div>
            <div className="profile-detail-row">
              <dt>Login Terakhir</dt>
              <dd>{time(user.last_login_at ?? null)}</dd>
            </div>
            <div className="profile-detail-row">
              <dt>Sesi Berakhir Pada</dt>
              <dd>{time(user.session_expires_at ?? null)}</dd>
            </div>
            <div className="profile-detail-row">
              <dt>Akun Terdaftar</dt>
              <dd>{time(user.created_at ?? null)}</dd>
            </div>
            <div className="profile-detail-row">
              <dt>Pembaruan Akun Terakhir</dt>
              <dd>{time(user.updated_at ?? null)}</dd>
            </div>
          </dl>

          {sessionActionSuccess && <Notice tone="success">{sessionActionSuccess}</Notice>}
          <ErrorNotice error={sessionActionError} />

          <div className="actions" style={{ marginTop: 18 }}>
            <button
              type="button"
              className="secondary"
              disabled={revokingSessions}
              onClick={revokeOtherSessions}
            >
              {revokingSessions ? "Mengakhiri\u2026" : "Akhiri Sesi Lain"}
            </button>
            <button
              type="button"
              className="secondary"
              style={{ color: "var(--danger)" }}
              disabled={busy}
              onClick={logout}
            >
              {busy ? "Keluar\u2026" : "Keluar dari Sesi Ini"}
            </button>
          </div>
        </article>

        <article className="card profile-card">
          <div className="spread" style={{ marginBottom: 14 }}>
            <div className="profile-card-header" style={{ marginBottom: 0 }}>
              <span className="profile-card-icon" aria-hidden="true">
                <IconActivity size={18} />
              </span>
              <div>
                <h2>Aktivitas Terbaru</h2>
                <p className="small muted">Jejak perubahan terbaru di modul administrasi.</p>
              </div>
            </div>
            <Link href="/admin/log-aktivitas" className="small" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
              Lihat Semua →
            </Link>
          </div>

          {logsLoading ? (
            <p className="small muted">Memuat riwayat aktivitas…</p>
          ) : recentLogs.length === 0 ? (
            <Notice>Belum ada catatan aktivitas yang dapat ditampilkan.</Notice>
          ) : (
            <ul className="profile-activity-list">
              {recentLogs.map(log => (
                <li key={log.id} className="profile-activity-item">
                  <div className="profile-activity-main">
                    <StatusBadge status={badgeToneForAction(log.action)}>
                      {ACTION_NAMES[log.action] ?? log.action}
                    </StatusBadge>
                    <strong>{ENTITY_NAMES[log.entity_table] ?? log.entity_table}</strong>
                    {log.entity_id && <span className="mono muted">#{log.entity_id}</span>}
                  </div>
                  <div className="profile-activity-meta">
                    <span>{log.admin_name || "Sistem"}</span>
                    <span aria-hidden="true">·</span>
                    <span>{time(log.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </div>
  );
}
