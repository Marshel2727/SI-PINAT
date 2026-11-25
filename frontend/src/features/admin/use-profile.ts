"use client";

import { api, ApiError, send } from "@/lib/api";
import type { AdminUser, AuditLogRow } from "@/types/api";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAdminContext } from "./admin-session-context";

const BACKEND_SYNC_NOTICE =
  "Layanan profil belum tersedia di backend aktif. Pastikan backend terbaru sudah dijalankan.";

function friendlyProfileError(err: unknown): unknown {
  if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
    return new ApiError(BACKEND_SYNC_NOTICE, err.status, err.details);
  }
  return err;
}

export interface PasswordStrength {
  score: number;
  label: string;
  tone: "weak" | "fair" | "good" | "strong";
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "Belum diisi", tone: "weak" };
  }
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  else if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 0.5;

  const rounded = Math.max(1, Math.min(4, Math.round(score)));
  if (rounded <= 1) return { score: 1, label: "Lemah", tone: "weak" };
  if (rounded === 2) return { score: 2, label: "Cukup", tone: "fair" };
  if (rounded === 3) return { score: 3, label: "Kuat", tone: "good" };
  return { score: 4, label: "Sangat Kuat", tone: "strong" };
}

export function useProfile() {
  const { user, setUser, refreshSession, logout, busy } = useAdminContext();

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<unknown>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<unknown>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [revokingSessions, setRevokingSessions] = useState(false);
  const [sessionActionError, setSessionActionError] = useState<unknown>(null);
  const [sessionActionSuccess, setSessionActionSuccess] = useState<string | null>(null);

  const [recentLogs, setRecentLogs] = useState<AuditLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    setFullName(user?.full_name ?? "");
  }, [user?.full_name]);

  const loadRecentLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const response = await api<AuditLogRow[]>("/admin/audit-logs?page=1&page_size=6");
      setRecentLogs(response.data ?? []);
    } catch {
      setRecentLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecentLogs();
  }, [loadRecentLogs]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = fullName.trim();
    if (cleaned.length < 2) {
      setProfileError(new Error("Nama lengkap minimal 2 karakter."));
      return;
    }
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const response = await send<AdminUser>("/auth/me", { full_name: cleaned }, "PATCH");
      setUser(response.data);
      setProfileSuccess("Nama profil administrator berhasil diperbarui.");
      void loadRecentLogs();
    } catch (err) {
      setProfileError(friendlyProfileError(err));
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError(new Error("Kata sandi baru minimal 8 karakter."));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(new Error("Konfirmasi kata sandi baru tidak cocok."));
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError(new Error("Kata sandi baru harus berbeda dari kata sandi saat ini."));
      return;
    }

    setSavingPassword(true);
    try {
      const response = await send<{ message: string; revoked_other_sessions: number }>(
        "/auth/change-password",
        {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        },
        "POST"
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      const revoked = response.data?.revoked_other_sessions ?? 0;
      setPasswordSuccess(
        revoked > 0
          ? `Kata sandi berhasil diperbarui dan ${revoked} sesi lain telah diakhiri.`
          : "Kata sandi berhasil diperbarui."
      );
      await refreshSession();
      void loadRecentLogs();
    } catch (err) {
      setPasswordError(friendlyProfileError(err));
    } finally {
      setSavingPassword(false);
    }
  }

  async function revokeOtherSessions() {
    setRevokingSessions(true);
    setSessionActionError(null);
    setSessionActionSuccess(null);
    try {
      const response = await send<{ revoked_count: number }>(
        "/auth/logout-other-sessions",
        undefined,
        "POST"
      );
      const count = response.data?.revoked_count ?? 0;
      setSessionActionSuccess(
        count > 0
          ? `${count} sesi lain yang masih aktif berhasil diakhiri.`
          : "Tidak ada sesi aktif lain selain sesi ini."
      );
      await refreshSession();
      void loadRecentLogs();
    } catch (err) {
      setSessionActionError(friendlyProfileError(err));
    } finally {
      setRevokingSessions(false);
    }
  }

  const trimmedName = fullName.trim();
  const isProfileDirty = Boolean(user && trimmedName && trimmedName !== user.full_name);

  return {
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
  };
}
