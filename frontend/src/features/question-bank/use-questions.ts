"use client";

import { api, send } from "@/lib/api";
import type { PublishedQuestionSummary, Question, Specialization } from "@/types/api";
import { useCallback, useEffect, useState } from "react";

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
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const refreshSummary = useCallback(() => {
    api<PublishedQuestionSummary[]>("/admin/questions/summary")
      .then(b => setSummary(b.data))
      .catch(() => {});
  }, []);

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

  const loadQuestions = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set("status", status);
    if (specialization) params.set("specialization_id", specialization);
    if (debouncedSearch) params.set("search", debouncedSearch);

    return api<Question[]>("/admin/questions?" + params).then(r => {
      setRows(r.data);
      setPages(r.meta?.total_pages || 1);
      setError(null);
    }).catch(e => setError(e)).finally(() => setLoading(false));
  }, [status, specialization, debouncedSearch, page]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  /** True jika tidak ada revisi lebih baru dengan kode yang sama pada daftar saat ini. */
  const isLatest = useCallback(
    (question: Question) => !rows.some(r => r.code === question.code && r.revision > question.revision),
    [rows]
  );

  function applyStatus(updated: Question) {
    setRows(prev => prev.map(r => {
      if (r.id === updated.id) return updated;
      // Server mengarsipkan revisi lain yang sedang terpublikasi untuk kode yang sama.
      if (updated.status === "PUBLISHED" && r.code === updated.code && r.status === "PUBLISHED")
        return { ...r, status: "ARCHIVED" };
      return r;
    }));
  }

  async function publish(id: string) {
    if (busyId !== null || bulkBusy) return;
    setBusyId(id);
    setError(null);
    setMessage("");
    try {
      const { data } = await send<Question>("/admin/questions/" + id + "/publish");
      applyStatus(data);
      refreshSummary();
      setMessage(`Soal ${data.code} berhasil dipublikasikan dan tampil di tes.`);
    } catch (e) {
      setError(e);
    } finally {
      setBusyId(null);
    }
  }

  async function archive(id: string) {
    if (busyId !== null || bulkBusy) return;
    setBusyId(id);
    setError(null);
    setMessage("");
    try {
      const { data } = await send<Question>("/admin/questions/" + id + "/archive");
      applyStatus(data);
      refreshSummary();
      setMessage(`Soal ${data.code} disembunyikan. Klik "Tampilkan Lagi" untuk mengaktifkannya kembali.`);
    } catch (e) {
      setError(e);
    } finally {
      setBusyId(null);
    }
  }

  const publishableDrafts = rows.filter(r => r.status === "DRAFT" && isLatest(r));

  async function publishAllDrafts() {
    const drafts = publishableDrafts;
    if (!drafts.length || bulkBusy || busyId !== null) return;
    setBulkBusy(true);
    setError(null);
    setMessage("");
    let successCount = 0;
    const failed: string[] = [];
    try {
      for (const draft of drafts) {
        try {
          await send<Question>("/admin/questions/" + draft.id + "/publish");
          successCount++;
        } catch {
          failed.push(draft.code);
        }
      }
      await loadQuestions();
      refreshSummary();
      setMessage(`${successCount} dari ${drafts.length} butir draf berhasil dipublikasikan.`
        + (failed.length ? ` Gagal (periksa kunci jawaban): ${failed.join(", ")}.` : ""));
    } catch (e) {
      setError(e);
    } finally {
      setBulkBusy(false);
    }
  }

  const draftCount = publishableDrafts.length;

  return {
    rows,
    status,
    setStatus,
    page,
    setPage,
    pages,
    error,
    message,
    loading,
    specialization,
    setSpecialization,
    search,
    setSearch,
    specs,
    summary,
    publish,
    archive,
    publishAllDrafts,
    busyId,
    bulkBusy,
    draftCount,
    isLatest
  };
}
