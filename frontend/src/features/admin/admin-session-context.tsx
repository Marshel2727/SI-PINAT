"use client";

import type { AdminUser } from "@/types/api";
import { createContext, useContext, type Dispatch, type SetStateAction } from "react";

export interface AdminSessionContextValue {
  user: AdminUser | null;
  setUser: Dispatch<SetStateAction<AdminUser | null>>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  busy: boolean;
}

export const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

export function useAdminContext(): AdminSessionContextValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error("useAdminContext harus dipanggil di dalam AdminShell.");
  }
  return ctx;
}

export function getInitials(name?: string | null): string {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return "AD";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
