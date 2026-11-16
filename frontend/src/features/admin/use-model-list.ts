"use client";

import { api, send } from "@/lib/api";
import type { FuzzyModel, FuzzyModelSummary } from "@/types/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useModelList() {
  const [rows, setRows] = useState<FuzzyModelSummary[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [modalError, setModalError] = useState<unknown>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api<FuzzyModelSummary[]>("/admin/fuzzy-models?page=" + page)
      .then(r => {
        if (!active)
          return;
        setRows(r.data);
        setPages(r.meta?.total_pages || 1);
        setTotal(r.meta?.total ?? r.data.length);
      })
      .catch(e => active && setError(e))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page]);

  function openCreateModal() {
    setModalError(null);
    setOpen(true);
  }

  function closeCreateModal() {
    if (busy)
      return;
    setModalError(null);
    setOpen(false);
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy)
      return;
    setBusy(true);
    setModalError(null);
    const form = new FormData(event.currentTarget);
    try {
      const { data } = await send<FuzzyModel>("/admin/fuzzy-models", {
        version_code: form.get("version_code"),
        sampling_step: Number(form.get("sampling_step"))
      });
      setOpen(false);
      router.push("/admin/model-fuzzy/" + data.id);
    }
    catch (e) {
      setModalError(e);
    }
    finally {
      setBusy(false);
    }
  }

  return {
    rows,
    page,
    setPage,
    pages,
    total,
    error,
    modalError,
    open,
    openCreateModal,
    closeCreateModal,
    busy,
    loading,
    create
  };
}
