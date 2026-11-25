"use client";

import { api, send } from "@/lib/api";
import type { PublishedQuestionSummary, Question, Specialization } from "@/types/api";
import { useCallback, useEffect, useRef, useState } from "react";

export interface BulkImportErrorItem {
  index: number;
  code?: string | null;
  message: string;
}

export interface BulkImportResult {
  created: Question[];
  published_count: number;
  errors: BulkImportErrorItem[];
}

export interface BulkPublishDraftsResult {
  published_count: number;
  failed: { id: string; code: string; message: string }[];
}

export function useQuestions() {
  const [rows, setRows] = useState<Question[]>([]);
  const [status, setStatus] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [specs, setSpecs] = useState<Specialization[]>([]);
  const [summary, setSummary] = useState<PublishedQuestionSummary[]>([]);
  const [totalDraftCount, setTotalDraftCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [templateSpecCode, setTemplateSpecCode] = useState("ES-01");
  const [importJson, setImportJson] = useState("");
  const [importPublish, setImportPublish] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<unknown>(null);
  const [importPartialErrors, setImportPartialErrors] = useState<BulkImportErrorItem[]>([]);

  const loadSeqRef = useRef(0);

  const refreshSummary = useCallback(() => {
    api<PublishedQuestionSummary[]>("/admin/questions/summary")
      .then(b => setSummary(b.data))
      .catch(() => {});
  }, []);

  const refreshDraftCount = useCallback(() => {
    api<Question[]>("/admin/questions?status=DRAFT&page_size=1")
      .then(r => setTotalDraftCount(r.meta?.total ?? r.data.length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      api<Specialization[]>("/specializations"),
      api<PublishedQuestionSummary[]>("/admin/questions/summary"),
      api<Question[]>("/admin/questions?status=DRAFT&page_size=1")
    ])
      .then(([a, b, c]) => {
        if (active) {
          setSpecs(a.data);
          setSummary(b.data);
          setTotalDraftCount(c.meta?.total ?? c.data.length);
          if (a.data.length > 0 && !a.data.some(s => s.code === "ES-01")) {
            setTemplateSpecCode(a.data[0].code);
          }
        }
      })
      .catch(err => active && setError(err));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadQuestions = useCallback(() => {
    const reqId = ++loadSeqRef.current;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (status)
      params.set("status", status);
    if (specialization)
      params.set("specialization_id", specialization);
    if (debouncedSearch)
      params.set("search", debouncedSearch);

    return api<Question[]>("/admin/questions?" + params.toString())
      .then(r => {
        if (reqId !== loadSeqRef.current)
          return;
        setRows(r.data);
        setPages(r.meta?.total_pages || 1);
        setTotal(r.meta?.total ?? r.data.length);
        setError(null);
      })
      .catch(e => {
        if (reqId === loadSeqRef.current)
          setError(e);
      })
      .finally(() => {
        if (reqId === loadSeqRef.current)
          setLoading(false);
      });
  }, [status, specialization, debouncedSearch, page]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  /** Gunakan flag is_latest_revision dari backend; fallback lokal hanya jika undefined. */
  const isLatest = useCallback(
    (question: Question) =>
      question.is_latest_revision !== undefined
        ? question.is_latest_revision
        : !rows.some(r => r.code === question.code && r.revision > question.revision),
    [rows]
  );

  function applyStatus(updated: Question) {
    setRows(prev => prev.map(r => {
      if (r.id === updated.id)
        return updated;
      if (updated.status === "PUBLISHED" && r.code === updated.code && r.status === "PUBLISHED")
        return { ...r, status: "ARCHIVED" };
      return r;
    }));
  }

  async function publish(id: string) {
    if (busyId !== null || bulkBusy)
      return;
    setBusyId(id);
    setError(null);
    setMessage("");
    try {
      const { data } = await send<Question>("/admin/questions/" + id + "/publish");
      applyStatus(data);
      refreshSummary();
      refreshDraftCount();
      setMessage(`Soal ${data.code} berhasil dipublikasikan dan tampil di tes.`);
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusyId(null);
    }
  }

  async function archive(id: string) {
    if (busyId !== null || bulkBusy)
      return;
    setBusyId(id);
    setError(null);
    setMessage("");
    try {
      const { data } = await send<Question>("/admin/questions/" + id + "/archive");
      applyStatus(data);
      refreshSummary();
      refreshDraftCount();
      setMessage(`Soal ${data.code} disembunyikan. Klik "Tampilkan Lagi" untuk mengaktifkannya kembali.`);
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusyId(null);
    }
  }

  async function removeDraft(question: Question) {
    if (busyId !== null || bulkBusy || question.status !== "DRAFT")
      return;
    if (!window.confirm(`Hapus draf soal ${question.code} (r${question.revision}) secara permanen?`))
      return;
    setBusyId(question.id);
    setError(null);
    setMessage("");
    try {
      await send("/admin/questions/" + question.id, undefined, "DELETE");
      await loadQuestions();
      refreshSummary();
      refreshDraftCount();
      setMessage(`Draf soal ${question.code} (r${question.revision}) berhasil dihapus.`);
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusyId(null);
    }
  }

  async function publishAllDrafts() {
    if (!totalDraftCount || bulkBusy || busyId !== null)
      return;
    if (!window.confirm(`Publikasikan seluruh ${totalDraftCount} butir draf revisi terbaru ke instrumen tes?`))
      return;
    setBulkBusy(true);
    setError(null);
    setMessage("");
    try {
      const { data } = await send<BulkPublishDraftsResult>("/admin/questions/publish-all-drafts", {}, "POST");
      await loadQuestions();
      refreshSummary();
      refreshDraftCount();
      if (data.published_count > 0) {
        setMessage(`${data.published_count} butir draf berhasil dipublikasikan.`);
      }
      else if (!data.failed?.length) {
        setMessage("Tidak ada draf revisi terbaru yang perlu dipublikasikan.");
      }
      if (data.failed && data.failed.length > 0) {
        setError(
          new Error(
            `${data.failed.length} draf gagal dipublikasikan: ${data.failed.map(f => `${f.code}: ${f.message}`).join("; ")}`
          )
        );
      }
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBulkBusy(false);
    }
  }

  function buildTemplateJson(specCode = templateSpecCode): string {
    const chosenCode = specCode || specs[0]?.code || "ES-01";
    return JSON.stringify(
      {
        questions: [
          {
            specialization_code: chosenCode,
            code: `${chosenCode}-NEW-01`,
            prompt: "Contoh pertanyaan: komponen apa yang mengatur sinkronisasi clock pada mikrokontroler?",
            explanation: "Oscillator menghasilkan sinyal clock utama.",
            options: [
              { label: "A", option_text: "Oscillator / Crystal", is_correct: true },
              { label: "B", option_text: "Comparator", is_correct: false },
              { label: "C", option_text: "ADC", is_correct: false },
              { label: "D", option_text: "Voltage Regulator", is_correct: false }
            ]
          }
        ],
        publish: false
      },
      null,
      2
    );
  }

  function openImportModal() {
    setImportError(null);
    setImportPartialErrors([]);
    if (!importJson.trim()) {
      setImportJson(buildTemplateJson(templateSpecCode));
    }
    setImportOpen(true);
  }

  function closeImportModal() {
    if (importBusy)
      return;
    setImportError(null);
    setImportPartialErrors([]);
    setImportOpen(false);
  }

  function loadTemplate(specCode?: string) {
    setImportError(null);
    setImportPartialErrors([]);
    setImportJson(buildTemplateJson(specCode ?? templateSpecCode));
  }

  async function submitImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (importBusy)
      return;
    setImportError(null);
    setImportPartialErrors([]);

    let parsed: unknown;
    try {
      parsed = JSON.parse(importJson);
    }
    catch {
      setImportError(new Error("Format JSON tidak valid. Periksa tanda kutip, koma, dan kurung."));
      return;
    }

    let body: { questions: unknown[]; publish: boolean };
    if (Array.isArray(parsed)) {
      body = { questions: parsed, publish: importPublish };
    }
    else if (parsed && typeof parsed === "object" && Array.isArray((parsed as { questions?: unknown }).questions)) {
      const obj = parsed as { questions: unknown[]; publish?: unknown };
      body = {
        questions: obj.questions,
        publish: importPublish || obj.publish === true
      };
    }
    else {
      setImportError(new Error("JSON harus berupa objek { \"questions\": [...] } atau array soal [...]."));
      return;
    }

    if (body.questions.length === 0 || body.questions.length > 100) {
      setImportError(new Error("Jumlah soal impor harus antara 1 hingga 100 item per batch."));
      return;
    }

    setImportBusy(true);
    try {
      const { data } = await send<BulkImportResult>("/admin/questions/import", body, "POST");
      if (data.created.length > 0) {
        await loadQuestions();
        refreshSummary();
        refreshDraftCount();
      }
      if (data.errors.length > 0) {
        setImportPartialErrors(data.errors);
        setImportError(
          new Error(
            `${data.created.length} soal tersimpan (${data.published_count} dipublikasikan), namun ${data.errors.length} soal gagal diimpor.`
          )
        );
      }
      else {
        setImportOpen(false);
        setImportJson("");
        setMessage(
          `Impor massal selesai: ${data.created.length} soal dibuat`
          + (data.published_count > 0 ? ` (${data.published_count} langsung dipublikasikan).` : " sebagai draf.")
        );
      }
    }
    catch (e) {
      setImportError(e);
    }
    finally {
      setImportBusy(false);
    }
  }

  return {
    rows,
    status,
    setStatus,
    page,
    setPage,
    pages,
    total,
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
    removeDraft,
    publishAllDrafts,
    busyId,
    bulkBusy,
    totalDraftCount,
    isLatest,
    importOpen,
    openImportModal,
    closeImportModal,
    templateSpecCode,
    setTemplateSpecCode,
    importJson,
    setImportJson,
    importPublish,
    setImportPublish,
    importBusy,
    importError,
    importPartialErrors,
    loadTemplate,
    submitImport
  };
}
