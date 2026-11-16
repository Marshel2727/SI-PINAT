"use client";

import { api, send } from "@/lib/api";
import type { FuzzyModelSummary, Specialization, ValidationCase, ValidationEditorState, ValidationResult } from "@/types/api";
import { useEffect, useMemo, useState } from "react";

export const MANDATORY_BOUNDARY_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [50, 50],
  [90, 90],
  [100, 100],
  [0, 90],
  [90, 0],
  [25, 25],
  [70, 70],
  [40, 60],
  [20, 80]
];

export type ValidationStatusFilter = "" | "LULUS" | "GAGAL" | "BELUM_DIUJI";

export function caseStatusKey(c: ValidationCase): Exclude<ValidationStatusFilter, ""> {
  if (c.last_passed === null || c.last_tested_at === null)
    return "BELUM_DIUJI";
  return c.last_passed ? "LULUS" : "GAGAL";
}

export function useValidation({ initialModel = "" }: {
  initialModel?: string;
}) {
  const [models, setModels] = useState<FuzzyModelSummary[]>([]);
  const [modelId, setModelId] = useState(initialModel);
  const [specs, setSpecs] = useState<Specialization[]>([]);
  const [cases, setCases] = useState<ValidationCase[]>([]);
  const [specFilter, setSpecFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ValidationStatusFilter>("");
  const [edit, setEdit] = useState<ValidationEditorState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [modalError, setModalError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      api<FuzzyModelSummary[]>("/admin/fuzzy-models?page_size=100"),
      api<Specialization[]>("/specializations")
    ])
      .then(([mRes, sRes]) => {
        if (!active)
          return;
        setModels(mRes.data);
        setSpecs(sRes.data);
        setModelId(current => current || (mRes.data.find(m => m.status === "DRAFT") ?? mRes.data[0])?.id || "");
      })
      .catch(e => active && setError(e));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!modelId) {
      setCases([]);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    api<ValidationCase[]>("/admin/fuzzy-models/" + modelId + "/validation-cases")
      .then(r => {
        if (!active)
          return;
        setCases(r.data);
      })
      .catch(e => active && setError(e))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [modelId]);

  const model = models.find(m => String(m.id) === String(modelId));
  const locked = model ? model.status !== "DRAFT" : false;

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      if (specFilter && String(c.specialization_id) !== specFilter)
        return false;
      if (statusFilter && caseStatusKey(c) !== statusFilter)
        return false;
      return true;
    });
  }, [cases, specFilter, statusFilter]);

  const boundaryChecklist = useMemo(() => {
    return specs.map(spec => {
      const specCases = cases.filter(c => String(c.specialization_id) === String(spec.id));
      const pairs = MANDATORY_BOUNDARY_PAIRS.map(([x1, x2], index) => {
        const present = specCases.some(c => Number(c.academic_input) === x1 && Number(c.competency_input) === x2);
        return { index, x1, x2, present };
      });
      const missing = pairs.filter(p => !p.present);
      const passedCount = specCases.filter(c => c.last_passed === true && c.last_tested_at !== null).length;
      return {
        spec,
        pairs,
        missing,
        presentCount: pairs.length - missing.length,
        totalCases: specCases.length,
        passedCount
      };
    });
  }, [specs, cases]);

  async function reload() {
    const res = await api<ValidationCase[]>("/admin/fuzzy-models/" + modelId + "/validation-cases");
    setCases(res.data);
  }

  function openModal(initial: ValidationEditorState) {
    setModalError(null);
    setEdit(initial);
  }

  function closeModal() {
    if (busy)
      return;
    setModalError(null);
    setEdit(null);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !edit || !modelId)
      return;
    setBusy(true);
    setModalError(null);
    const form = new FormData(event.currentTarget);
    const body: Record<string, FormDataEntryValue | number | null> = {
      case_code: form.get("case_code")
    };
    for (const key of ["specialization_id", "academic_input", "competency_input", "expected_min", "expected_max"]) {
      body[key] = Number(form.get(key));
    }
    try {
      await send(
        "/admin/fuzzy-models/" + modelId + "/validation-cases" + (edit.id ? "/" + edit.id : ""),
        body,
        edit.id ? "PATCH" : "POST"
      );
      setEdit(null);
      setModalError(null);
      await reload();
      setMessage("Skenario tersimpan. Jalankan ulang validasi.");
    }
    catch (e) {
      setModalError(e);
    }
    finally {
      setBusy(false);
    }
  }

  async function remove(item: ValidationCase) {
    if (busy || locked || !modelId)
      return;
    if (!window.confirm(`Hapus skenario validasi ${item.case_code} secara permanen?`))
      return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      await send(`/admin/fuzzy-models/${modelId}/validation-cases/${item.id}`, undefined, "DELETE");
      await reload();
      setMessage(`Skenario ${item.case_code} berhasil dihapus.`);
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }

  async function seedMissingBoundaryCases(spec: Specialization) {
    if (busy || locked || !modelId)
      return;
    const entry = boundaryChecklist.find(item => String(item.spec.id) === String(spec.id));
    if (!entry || !entry.missing.length)
      return;

    setBusy(true);
    setError(null);
    setMessage("");
    const existingCodes = new Set(
      cases
        .filter(c => String(c.specialization_id) === String(spec.id))
        .map(c => c.case_code)
    );
    try {
      for (const pair of entry.missing) {
        let candidate = `BATAS-${spec.code}-S${String(pair.index + 1).padStart(2, "0")}`;
        let suffix = 0;
        while (existingCodes.has(candidate)) {
          suffix++;
          candidate = `BATAS-S${String(pair.index + 1).padStart(2, "0")}-${suffix}`;
        }
        existingCodes.add(candidate);

        await send(`/admin/fuzzy-models/${modelId}/validation-cases`, {
          specialization_id: Number(spec.id),
          case_code: candidate,
          academic_input: pair.x1,
          competency_input: pair.x2,
          expected_min: 0,
          expected_max: 99
        }, "POST");
      }
      await reload();
      setMessage(
        `${entry.missing.length} template kasus batas untuk ${spec.name} ditambahkan (rentang awal 0–99). Sesuaikan ekspektasi minimum/maksimum tiap kasus sebelum menjalankan validasi.`
      );
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }

  async function validate() {
    if (busy || !modelId || locked)
      return;
    setBusy(true);
    setError(null);
    setMessage("");
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

  function resetFilters() {
    setSpecFilter("");
    setStatusFilter("");
  }

  return {
    models,
    model,
    modelId,
    setModelId,
    specs,
    cases,
    filteredCases,
    boundaryChecklist,
    specFilter,
    setSpecFilter,
    statusFilter,
    setStatusFilter,
    resetFilters,
    edit,
    openModal,
    closeModal,
    busy,
    error,
    modalError,
    message,
    setMessage,
    loading,
    locked,
    save,
    remove,
    seedMissingBoundaryCases,
    validate
  };
}
