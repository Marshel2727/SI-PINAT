"use client";

import { ApiError, api, send } from "@/lib/api";
import { forgetAssessment } from "@/lib/assessment-session";
import type { Assessment, StudentAccount, StudentAuthResponse } from "@/types/api";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export interface StudentSessionContextValue {
  student: StudentAccount | null;
  latestAssessment: Assessment | null;
  loading: boolean;
  error: unknown;
  refreshSession: () => Promise<StudentAuthResponse | null>;
  setSessionData: (data: StudentAuthResponse | null) => void;
  logout: () => Promise<void>;
  loggingOut: boolean;
}

const StudentSessionContext = createContext<StudentSessionContextValue | null>(null);

export function StudentSessionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdminRoute = pathname.startsWith("/admin");

  const [student, setStudent] = useState<StudentAccount | null>(null);
  const [latestAssessment, setLatestAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(!isAdminRoute);
  const [error, setError] = useState<unknown>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const setSessionData = useCallback((data: StudentAuthResponse | null) => {
    setStudent(data?.student ?? null);
    setLatestAssessment(data?.latest_assessment ?? null);
    setError(null);
  }, []);

  const refreshSession = useCallback(async (): Promise<StudentAuthResponse | null> => {
    if (pathname.startsWith("/admin")) {
      setLoading(false);
      return null;
    }

    try {
      const res = await api<StudentAuthResponse>("/student-auth/me");
      setStudent(res.data.student);
      setLatestAssessment(res.data.latest_assessment ?? null);
      setError(null);
      return res.data;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setStudent(null);
        setLatestAssessment(null);
        setError(null);
        return null;
      }
      if (err instanceof ApiError && err.status === 403) {
        setStudent(null);
        setLatestAssessment(null);
        setError(err);
        return null;
      }
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (isAdminRoute) {
      setLoading(false);
      return;
    }
    void refreshSession();
  }, [isAdminRoute, refreshSession]);

  const logout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await send("/student-auth/logout");
    } catch {
      // Tetap bersihkan sesi lokal dan arahkan ke halaman masuk
    } finally {
      forgetAssessment();
      setStudent(null);
      setLatestAssessment(null);
      setError(null);
      setLoggingOut(false);
      router.replace("/masuk");
    }
  }, [loggingOut, router]);

  return (
    <StudentSessionContext.Provider
      value={{
        student,
        latestAssessment,
        loading,
        error,
        refreshSession,
        setSessionData,
        logout,
        loggingOut,
      }}
    >
      {children}
    </StudentSessionContext.Provider>
  );
}

export function useStudentSession(): StudentSessionContextValue {
  const ctx = useContext(StudentSessionContext);
  if (!ctx) {
    throw new Error("useStudentSession harus dipanggil di dalam StudentSessionProvider.");
  }
  return ctx;
}
