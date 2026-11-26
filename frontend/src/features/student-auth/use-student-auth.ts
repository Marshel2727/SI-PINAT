"use client";

import { send } from "@/lib/api";
import { rememberAssessment } from "@/lib/assessment-session";
import type { StudentAuthResponse } from "@/types/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStudentSession } from "./student-session-context";

export type StudentAuthTab = "login" | "register";

export function safeStudentNext(next?: string | null): string {
  if (!next) return "/";
  const trimmed = next.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    trimmed.startsWith("/masuk") ||
    trimmed.startsWith("/admin")
  ) {
    return "/";
  }
  return trimmed;
}

export function useStudentAuth(nextPath?: string) {
  const router = useRouter();
  const { student, loading, error: sessionError, setSessionData } = useStudentSession();
  const [tab, setTab] = useState<StudentAuthTab>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const target = safeStudentNext(
    nextPath ?? (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null)
  );

  useEffect(() => {
    if (!loading && student) {
      router.replace(target);
    }
  }, [loading, student, router, target]);

  function switchTab(nextTab: StudentAuthTab) {
    if (busy) return;
    setTab(nextTab);
    setError(null);
  }

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const nim = String(form.get("nim") || "").trim();
    const password = String(form.get("password") || "");

    try {
      const { data } = await send<StudentAuthResponse>("/student-auth/login", {
        nim,
        password,
      });
      setSessionData(data);
      if (data.latest_assessment) {
        const stage = data.latest_assessment.status === "COMPLETED"
          ? "hasil"
          : data.latest_assessment.status === "IN_PROGRESS"
            ? "tes"
            : data.latest_assessment.status === "ACADEMIC_READY"
              ? "nilai"
              : "peminatan";
        rememberAssessment(data.latest_assessment, stage, false);
      }
      router.replace(target);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function submitRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = new FormData(event.currentTarget);
    const nim = String(form.get("nim") || "").trim();
    const fullName = String(form.get("full_name") || "").trim();
    const className = String(form.get("class_name") || "").trim();
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirm_password") || "");

    if (password.length < 6) {
      setError(new Error("Kata sandi minimal 6 karakter."));
      return;
    }
    if (password !== confirmPassword) {
      setError(new Error("Konfirmasi kata sandi tidak cocok."));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const { data } = await send<StudentAuthResponse>("/student-auth/register", {
        nim,
        full_name: fullName,
        class_name: className || null,
        password,
        confirm_password: confirmPassword,
      });
      setSessionData(data);
      router.replace(target);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return {
    tab,
    switchTab,
    busy,
    checkingSession: loading,
    error: error ?? sessionError,
    submitLogin,
    submitRegister,
  };
}
