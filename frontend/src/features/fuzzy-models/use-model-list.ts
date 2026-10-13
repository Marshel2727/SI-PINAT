"use client";

import { api, send } from "@/lib/api";
import type { FuzzyModel, FuzzyModelSummary } from "@/types/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useModelList() {
  const [rows, setRows] = useState<FuzzyModelSummary[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState<unknown>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  useEffect(() => {
    setLoading(true);
    api<FuzzyModelSummary[]>("/admin/fuzzy-models?page=" + page).then(r => {
      setRows(r.data);
      setPages(r.meta?.total_pages || 1);
    }).catch(setError).finally(() => setLoading(false));
  }, [page]);
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy)
      return;
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const { data } = await send<FuzzyModel>("/admin/fuzzy-models", { version_code: form.get("version_code"), sampling_step: Number(form.get("sampling_step")) });
      router.push("/admin/model-fuzzy/" + data.id);
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }
  return {
    rows, page, setPage, pages, error, open, setOpen, busy, loading, create
  };
}
