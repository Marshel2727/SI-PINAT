"use client";

import { api, ApiError, onAdminUnauthorized, send } from "@/lib/api";
import type { AdminUser } from "@/types/api";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const SESSION_CHECK_INTERVAL_MS = 60_000;
const FOCUS_THROTTLE_MS = 15_000;
const SESSION_WARNING_MS = 7 * 60 * 60 * 1000;

export function useAdminSession() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const redirectingRef = useRef(false);
  const checkingRef = useRef(false);
  const lastCheckRef = useRef(0);
  const sessionStartRef = useRef<number | null>(null);

  const redirectToLogin = useCallback((expired = true) => {
    if (redirectingRef.current)
      return;
    if (pathname === "/admin/login")
      return;
    redirectingRef.current = true;
    setUser(null);
    if (expired) {
      setSessionExpired(true);
      setSessionNotice("Sesi administrator telah berakhir. Mengalihkan ke halaman login…");
    }
    const search = typeof window !== "undefined" ? window.location.search : "";
    const currentPath = search ? `${pathname}${search}` : pathname;
    const nextPath = currentPath.startsWith("/admin") && !currentPath.startsWith("/admin/login")
      ? currentPath
      : "/admin";
    router.replace(`/admin/login?next=${encodeURIComponent(nextPath)}${expired ? "&expired=1" : ""}`);
  }, [pathname, router]);

  const verifySession = useCallback(async (force = false) => {
    if (redirectingRef.current || checkingRef.current)
      return;
    const now = Date.now();
    if (!force && now - lastCheckRef.current < FOCUS_THROTTLE_MS)
      return;
    checkingRef.current = true;
    lastCheckRef.current = now;
    try {
      const r = await api<AdminUser>("/auth/me");
      if (redirectingRef.current)
        return;
      setUser(r.data);
      setError(null);
      if (sessionStartRef.current === null) {
        sessionStartRef.current = now;
      }
      else if (now - sessionStartRef.current >= SESSION_WARNING_MS) {
        setSessionExpired(false);
        setSessionNotice("Sesi login Anda mendekati batas 8 jam. Simpan perubahan secara berkala sebelum sesi berakhir.");
      }
    }
    catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        redirectToLogin(true);
      }
      else {
        setError(e);
      }
    }
    finally {
      checkingRef.current = false;
    }
  }, [redirectToLogin]);

  useEffect(() => {
    const unregister = onAdminUnauthorized(() => {
      redirectToLogin(true);
    });
    return unregister;
  }, [redirectToLogin]);

  useEffect(() => {
    void verifySession(true);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible")
        void verifySession(true);
    }, SESSION_CHECK_INTERVAL_MS);

    const handleFocus = () => {
      void verifySession(false);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible")
        void verifySession(false);
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [verifySession]);

  async function logout() {
    if (busy)
      return;
    setBusy(true);
    setError(null);
    redirectingRef.current = true;
    try {
      await send("/auth/logout");
    }
    catch {
      // Tetap lanjutkan keluar ke halaman login meski sesi sudah kedaluwarsa (401).
    }
    finally {
      setUser(null);
      setBusy(false);
      router.replace("/admin/login");
    }
  }

  const refreshSession = useCallback(() => verifySession(true), [verifySession]);

  return {
    user,
    setUser,
    refreshSession,
    error,
    sessionNotice,
    sessionExpired,
    busy,
    pathname,
    logout
  };
}
