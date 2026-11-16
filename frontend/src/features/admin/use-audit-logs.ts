"use client";

import { api } from "@/lib/api";
import type { AuditLogRow } from "@/types/api";
import { useEffect, useState } from "react";

export function useAuditLogs() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [entityTable, setEntityTable] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page) });
    if (entityTable)
      params.set("entity_table", entityTable);
    if (action)
      params.set("action", action);

    api<AuditLogRow[]>("/admin/audit-logs?" + params.toString())
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
  }, [entityTable, action, page]);

  function resetFilters() {
    setEntityTable("");
    setAction("");
    setPage(1);
  }

  return {
    rows,
    entityTable,
    setEntityTable,
    action,
    setAction,
    page,
    setPage,
    pages,
    total,
    loading,
    error,
    resetFilters
  };
}
