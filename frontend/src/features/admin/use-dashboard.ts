"use client";

import { api, downloadFile } from "@/lib/api";
import type {
  AdminAssessmentRow,
  DashboardStats,
  FuzzyModelSummary,
  PublishedQuestionSummary
} from "@/types/api";
import { useEffect, useState } from "react";

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [records, setRecords] = useState<AdminAssessmentRow[]>([]);
  const [questionSummary, setQuestionSummary] = useState<PublishedQuestionSummary[]>([]);
  const [fuzzyModels, setFuzzyModels] = useState<FuzzyModelSummary[]>([]);
  const [readinessLoading, setReadinessLoading] = useState(true);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [exportError, setExportError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    setReadinessLoading(true);
    Promise.allSettled([
      api<PublishedQuestionSummary[]>("/admin/questions/summary"),
      api<FuzzyModelSummary[]>("/admin/fuzzy-models?page_size=50")
    ])
      .then(([summaryRes, modelsRes]) => {
        if (!active)
          return;
        if (summaryRes.status === "fulfilled")
          setQuestionSummary(summaryRes.value.data);
        if (modelsRes.status === "fulfilled")
          setFuzzyModels(modelsRes.value.data);
      })
      .finally(() => active && setReadinessLoading(false));

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  function updateFrom(nextFrom: string) {
    setFrom(nextFrom);
    setPage(1);
    if (nextFrom && to && nextFrom > to) {
      setTo(nextFrom);
    }
  }

  function updateTo(nextTo: string) {
    setTo(nextTo);
    setPage(1);
    if (nextTo && from && nextTo < from) {
      setFrom(nextTo);
    }
  }

  function resetFilters() {
    setMode("");
    setStatus("");
    setSearch("");
    setDebouncedSearch("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  const dashboardQuery = new URLSearchParams();
  if (mode)
    dashboardQuery.set("mode", mode);
  if (from)
    dashboardQuery.set("date_from", from + "T00:00:00Z");
  if (to) {
    const next = new Date(to + "T00:00:00Z");
    if (!Number.isNaN(next.getTime())) {
      next.setUTCDate(next.getUTCDate() + 1);
      dashboardQuery.set("date_to", next.toISOString());
    }
  }
  const dashboardFilters = dashboardQuery.toString();

  const listQuery = new URLSearchParams(dashboardQuery);
  if (status)
    listQuery.set("status", status);
  if (debouncedSearch)
    listQuery.set("search", debouncedSearch);
  const filters = listQuery.toString();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const listParams = new URLSearchParams(listQuery);
    listParams.set("page", String(page));

    Promise.all([
      api<DashboardStats>("/admin/dashboard" + (dashboardFilters ? "?" + dashboardFilters : "")),
      api<AdminAssessmentRow[]>("/admin/assessments?" + listParams.toString())
    ])
      .then(([a, b]) => {
        if (!active)
          return;
        setStats(a.data);
        setRecords(b.data);
        setPages(b.meta?.total_pages || 1);
        setTotal(b.meta?.total ?? b.data.length);
      })
      .catch(e => active && setError(e))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardFilters, filters, page]);

  async function downloadXlsx() {
    if (downloading)
      return;
    setDownloading(true);
    setExportError(null);
    try {
      await downloadFile(
        "/admin/reports/assessments.xlsx" + (filters ? "?" + filters : ""),
        "asesmen-sipinat.xlsx"
      );
    }
    catch (e) {
      setExportError(e);
    }
    finally {
      setDownloading(false);
    }
  }

  const publishedModels = fuzzyModels.filter(
    m => m.status === "PUBLISHED" && !m.version_code.toUpperCase().startsWith("DEMO")
  );
  const draftModel = fuzzyModels.find(
    m => m.status === "DRAFT" && !m.version_code.toUpperCase().startsWith("DEMO")
  ) ?? fuzzyModels.find(m => m.status === "DRAFT") ?? null;

  return {
    stats,
    records,
    questionSummary,
    publishedModels,
    draftModel,
    readinessLoading,
    pages,
    total,
    page,
    setPage,
    mode,
    setMode,
    status,
    setStatus,
    search,
    setSearch,
    from,
    updateFrom,
    to,
    updateTo,
    resetFilters,
    error,
    exportError,
    loading,
    downloading,
    downloadXlsx,
    filters
  };
}
