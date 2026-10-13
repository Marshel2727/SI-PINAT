"use client";

import { api } from "@/lib/api";
import type { AdminAssessmentRow, DashboardStats } from "@/types/api";
import { useEffect, useState } from "react";

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [records, setRecords] = useState<AdminAssessmentRow[]>([]);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const query = new URLSearchParams();
  if (mode)
    query.set("mode", mode);
  if (from)
    query.set("date_from", from + "T00:00:00Z");
  if (to) {
    const next = new Date(to + "T00:00:00Z");
    next.setUTCDate(next.getUTCDate() + 1);
    query.set("date_to", next.toISOString());
  }
  const filters = query.toString();
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      api<DashboardStats>("/admin/dashboard?" + filters),
      api<AdminAssessmentRow[]>("/admin/assessments?" + filters + "&page=" + page)
    ])
      .then(([a, b]) => {
        if (!active)
          return;
        setStats(a.data);
        setRecords(b.data);
        setPages(b.meta?.total_pages || 1);
      })
      .catch(e => active && setError(e))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [filters, page]);
  return {
    stats, records, pages, page, setPage, mode, setMode, from, setFrom, to, setTo, error, loading, filters
  };
}
