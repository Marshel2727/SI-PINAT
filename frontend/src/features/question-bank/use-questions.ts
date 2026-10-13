"use client";

import { api } from "@/lib/api";
import type { PublishedQuestionSummary, Question, Specialization } from "@/types/api";
import { useEffect, useState } from "react";

export function useQuestions() {
  const [rows, setRows] = useState<Question[]>([]);
  const [status, setStatus] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [specs, setSpecs] = useState<Specialization[]>([]);
  const [summary, setSummary] = useState<PublishedQuestionSummary[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.all([api<Specialization[]>("/specializations"), api<PublishedQuestionSummary[]>("/admin/questions/summary")])
      .then(([a, b]) => { if (active) { setSpecs(a.data); setSummary(b.data); } })
      .catch(error => active && setError(error));
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set("status", status);
    if (specialization) params.set("specialization_id", specialization);
    if (debouncedSearch) params.set("search", debouncedSearch);
    api<Question[]>("/admin/questions?" + params).then(r => {
      if (!active)
        return;
      setRows(r.data);
      setPages(r.meta?.total_pages || 1);
      setError(null);
    }).catch(e => active && setError(e)).finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [status, specialization, debouncedSearch, page]);
  return {
    rows, status, setStatus, page, setPage, pages, error, loading, specialization, setSpecialization, search, setSearch, specs, summary
  };
}
