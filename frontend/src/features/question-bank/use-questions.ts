"use client";

import { api } from "@/lib/api";
import type { Question } from "@/types/api";
import { useEffect, useState } from "react";

export function useQuestions() {
  const [rows, setRows] = useState<Question[]>([]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api<Question[]>("/admin/questions?page=" + page + (status ? "&status=" + status : "")).then(r => {
      if (!active)
        return;
      setRows(r.data);
      setPages(r.meta?.total_pages || 1);
      setError(null);
    }).catch(e => active && setError(e)).finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [status, page]);
  return {
    rows, status, setStatus, page, setPage, pages, error, loading
  };
}
