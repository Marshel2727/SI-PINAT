"use client";

import { api, send } from "@/lib/api";
import type { AdminUser } from "@/types/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function safeAdminNext(next?: string | null): string {
  if (!next)
    return "/admin";
  const trimmed = next.trim();
  if (
    !/^\/admin(?:$|\/|\?)/.test(trimmed) ||
    trimmed.includes("//") ||
    trimmed.includes("\\") ||
    trimmed.startsWith("/admin/login")
  ) {
    return "/admin";
  }
  return trimmed;
}

export function useLogin(nextPath?: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    const rawNext = nextPath ?? (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null);
    const target = safeAdminNext(rawNext);
    api<AdminUser>("/auth/me")
      .then(() => {
        if (active)
          router.replace(target);
      })
      .catch(() => {
        // Belum masuk; tetap di halaman login.
      })
      .finally(() => {
        if (active)
          setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, [nextPath, router]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy)
      return;
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const rawNext = nextPath ?? (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null);
    const target = safeAdminNext(rawNext);
    try {
      await send("/auth/login", {
        email: form.get("email"),
        password: form.get("password")
      });
      router.replace(target);
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }

  return { busy, checkingSession, error, submit };
}
