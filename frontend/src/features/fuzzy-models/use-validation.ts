"use client";

import { api, send } from "@/lib/api";
import type { FuzzyModelSummary, Specialization, ValidationCase, ValidationEditorState, ValidationResult } from "@/types/api";
import { useEffect, useState } from "react";

export function useValidation({ initialModel = "" }: {
  initialModel?: string;
}) {
  const [models, setModels] = useState<FuzzyModelSummary[]>([]);
  const [modelId, setModelId] = useState(initialModel);
  const [specs, setSpecs] = useState<Specialization[]>([]);
  const [cases, setCases] = useState<ValidationCase[]>([]);
  const [edit, setEdit] = useState<ValidationEditorState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    api<FuzzyModelSummary[]>("/admin/fuzzy-models?page_size=100").then(r => setModels(r.data)).catch(setError);
    api<Specialization[]>("/specializations").then(r => setSpecs(r.data)).catch(setError);
  }, []);
  useEffect(() => {
    if (!modelId)
      return;
    setLoading(true);
    api<ValidationCase[]>("/admin/fuzzy-models/" + modelId + "/validation-cases").then(r => {
      setCases(r.data);
      setError(null);
    }).catch(setError).finally(() => setLoading(false));
  }, [modelId]);
  const model = models.find(m => m.id === modelId);
  const locked = model?.status !== "DRAFT";
  async function reload() {
    setCases((await api<ValidationCase[]>("/admin/fuzzy-models/" + modelId + "/validation-cases")).data);
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !edit)
      return;
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const body: Record<string, FormDataEntryValue | number | null> = { case_code: form.get("case_code") };
    for (const key of ["specialization_id", "academic_input", "competency_input", "expected_min", "expected_max"])
      body[key] = Number(form.get(key));
    try {
      await send("/admin/fuzzy-models/" + modelId + "/validation-cases" + (edit.id ? "/" + edit.id : ""), body, edit.id ? "PATCH" : "POST");
      setEdit(null);
      await reload();
      setMessage("Skenario tersimpan. Jalankan ulang validasi.");
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }
  async function validate() {
    if (busy)
      return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await send<ValidationResult[]>("/admin/fuzzy-models/" + modelId + "/validate");
      await reload();
      setMessage(data.filter((r) => r.passed).length + " / " + data.length + " skenario lulus.");
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }
  return {
    models, modelId, setModelId, specs, cases, edit, setEdit, busy, error, message, setMessage, loading, locked, save, validate
  };
}
