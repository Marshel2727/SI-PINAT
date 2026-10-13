"use client";

import { api, ApiError, send } from "@/lib/api";
import type { AdminUser } from "@/types/api";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useAdminSession() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    api<AdminUser>("/auth/me")
      .then(r => setUser(r.data))
      .catch(e => {
        if (e instanceof ApiError && e.status === 401)
          router.replace("/admin/login");
        else
          setError(e);
      });
  }, [router]);
  async function logout() {
    if (busy)
      return;
    setBusy(true);
    try {
      await send("/auth/logout");
      router.replace("/admin/login");
    }
    catch (e) {
      setError(e);
      setBusy(false);
    }
  }
  return {
    user, error, busy, pathname, logout
  };
}
