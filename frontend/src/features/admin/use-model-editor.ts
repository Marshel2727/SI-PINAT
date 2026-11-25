"use client";

import { api, send } from "@/lib/api";
import type { Course, FuzzyModel, PublicationReadiness, Specialization, ValidationResult } from "@/types/api";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { enumOptions, type Column, type ConfigRow } from "./configuration";

async function fetchAllCourses(): Promise<Course[]> {
  const first = await api<Course[]>("/admin/courses?page_size=100&page=1");
  const all = [...first.data];
  const totalPages = first.meta?.total_pages || 1;
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        api<Course[]>(`/admin/courses?page_size=100&page=${i + 2}`)
      )
    );
    for (const res of rest) {
      all.push(...res.data);
    }
  }
  return all.map(c => ({
    ...c,
    name: `${c.code} \u00B7 ${c.name}${c.is_active ? "" : " (Nonaktif)"}`
  }));
}

export function useModelEditor({ id }: {
  id: string;
}) {
  const [model, setModel] = useState<FuzzyModel | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [specs, setSpecs] = useState<Specialization[]>([]);
  const [tab, setTab] = useState("grade-conversions");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [modalError, setModalError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [cloneOpen, setCloneOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [readiness, setReadiness] = useState<PublicationReadiness | null>(null);
  const [readinessError, setReadinessError] = useState<unknown>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const router = useRouter();
  const base = "/admin/fuzzy-models/" + id;

  const refreshReadiness = useCallback(async () => {
    setReadinessLoading(true);
    setReadinessError(null);
    try {
      setReadiness((await api<PublicationReadiness>(base + "/readiness")).data);
    }
    catch (err) {
      setReadinessError(err);
      setReadiness(null);
    }
    finally {
      setReadinessLoading(false);
    }
  }, [base]);

  useEffect(() => {
    let active = true;
    setError(null);
    Promise.all([
      api<FuzzyModel>(base),
      fetchAllCourses(),
      api<Specialization[]>("/specializations")
    ])
      .then(([modelRes, courseList, specRes]) => {
        if (!active)
          return;
        setModel(modelRes.data);
        setCourses(courseList);
        setSpecs(specRes.data);
      })
      .catch(e => active && setError(e));

    void refreshReadiness();
    return () => {
      active = false;
    };
  }, [base, refreshReadiness]);

  function openCloneModal() {
    setModalError(null);
    setCloneOpen(true);
  }

  function closeCloneModal() {
    if (busy)
      return;
    setModalError(null);
    setCloneOpen(false);
  }

  async function save(section: string, values: ConfigRow[]) {
    if (busy)
      return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const payload = values.map(v => {
        const copy = { ...v };
        if (!["sets", "variables"].includes(section))
          delete copy.id;
        return copy;
      });
      const { data } = await send<FuzzyModel>(base + "/" + section, payload, "PUT");
      setModel(data);
      setConfirmed(false);
      await refreshReadiness();
      setMessage("Konfigurasi tersimpan. Jalankan ulang seluruh skenario validasi.");
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }

  async function scaffoldDefaults() {
    if (busy || !model || model.status !== "DRAFT")
      return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const { data } = await send<FuzzyModel>(base + "/scaffold-defaults", undefined, "POST");
      setModel(data);
      setConfirmed(false);
      await refreshReadiness();
      setMessage("Kerangka default berhasil dimuat untuk bagian konfigurasi yang masih kosong.");
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }

  async function seedAndValidateBoundaryCases() {
    if (busy || !model || model.status !== "DRAFT")
      return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const seedRes = await send<{ created_count: number; updated_count: number }>(
        base + "/seed-boundary-cases",
        { recalculate_existing: true, tolerance: 0.5 },
        "POST"
      );
      const { data } = await send<ValidationResult[]>(base + "/validate");
      setModel((await api<FuzzyModel>(base)).data);
      await refreshReadiness();
      setMessage(
        `30 skenario batas disiapkan (${seedRes.data.created_count} baru, ${seedRes.data.updated_count} diperbarui) — ${data.filter(v => v.passed).length} / ${data.length} skenario lulus.`
      );
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }

  async function action(kind: string) {
    if (busy)
      return;
    if (kind === "publish") {
      const label = model?.version_code || "versi model ini";
      if (!window.confirm(`Publikasikan model ${label}? Setelah dipublikasikan, konfigurasi model terkunci permanen dan langsung aktif digunakan untuk asesmen.`))
        return;
    }
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      if (kind === "validate") {
        const { data } = await send<ValidationResult[]>(base + "/validate");
        setMessage(data.filter(v => v.passed).length + " / " + data.length + " skenario lulus.");
        setModel((await api<FuzzyModel>(base)).data);
      }
      else {
        const { data } = await send<FuzzyModel>(base + "/" + kind, { academic_review_confirmed: confirmed });
        setModel(current => current ? { ...current, ...data } : data);
        setMessage("Model berhasil dipublikasikan.");
      }
      await refreshReadiness();
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }

  async function clone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy)
      return;
    setBusy(true);
    setModalError(null);
    const form = new FormData(event.currentTarget);
    const step = Number(form.get("sampling_step") || model?.sampling_step || 0.1);
    try {
      const { data } = await send<FuzzyModel>(base + "/clone", {
        version_code: form.get("version_code"),
        sampling_step: step
      });
      setCloneOpen(false);
      router.push("/admin/model-fuzzy/" + data.id);
    }
    catch (e) {
      setModalError(e);
    }
    finally {
      setBusy(false);
    }
  }

  const locked = model?.status !== "DRAFT";
  const hasEmptyScaffoldSection = Boolean(
    model && !locked && (
      !model.grade_conversions.length ||
      !model.course_weights.length ||
      !model.variables.length ||
      !model.sets.length ||
      !model.rules.length
    )
  );
  const vars = model?.variables || [];
  const sets = model?.sets || [];
  const setOptions = (role: string) => sets
    .filter((s) => s.variable_id === vars.find((v) => v.code === role)?.id)
    .map((s) => ({ id: s.id, name: s.code }));

  const columns: Record<string, Column[]> = {
    "grade-conversions": [
      { key: "letter_grade", label: "Nilai huruf" },
      {
        key: "grade_points", label: "Nilai mutu", type: "number", min: 0, max: 4
      },
      {
        key: "normalized_score", label: "Normalisasi", type: "number", min: 0, max: 100
      }
    ],
    "course-weights": [
      { key: "course_id", label: "Mata kuliah", options: courses },
      { key: "specialization_id", label: "Peminatan", options: specs },
      {
        key: "weight", label: "Bobot relevansi", type: "number", min: 0, max: 1
      },
      { key: "is_required", label: "Wajib", type: "boolean" }
    ],
    variables: [
      {
        key: "code", label: "Variabel", options: enumOptions(["ACADEMIC", "COMPETENCY", "SUITABILITY"])
      },
      { key: "direction", label: "Arah", options: enumOptions(["INPUT", "OUTPUT"]) },
      {
        key: "domain_min", label: "Batas bawah", type: "number", min: 0, max: 100
      },
      {
        key: "domain_max", label: "Batas atas", type: "number", min: 0, max: 100
      }
    ],
    sets: [
      {
        key: "variable_id", label: "Variabel", options: vars.map((v) => ({ id: v.id, name: v.code }))
      },
      { key: "code", label: "Himpunan", options: enumOptions(["LOW", "MEDIUM", "HIGH"]) },
      { key: "shape", label: "Bentuk", options: enumOptions(["TRIANGLE", "TRAPEZOID"]) },
      ...["a", "b", "c", "d"].map((p): Column => ({
        key: "point_" + p, label: p.toUpperCase(), type: "number", min: 0, max: 100, nullable: p === "d"
      }))
    ],
    rules: [
      { key: "specialization_id", label: "Peminatan", options: specs },
      { key: "rule_code", label: "Kode aturan" },
      { key: "academic_set_id", label: "Akademik", options: setOptions("ACADEMIC") },
      { key: "competency_set_id", label: "Kompetensi", options: setOptions("COMPETENCY") },
      { key: "output_set_id", label: "Kesesuaian", options: setOptions("SUITABILITY") },
      { key: "operator", label: "Operator", options: enumOptions(["AND", "OR"]) },
      {
        key: "rule_weight", label: "Bobot", type: "number", min: 0, max: 1
      }
    ]
  };

  return {
    model,
    tab,
    setTab,
    busy,
    error,
    setError,
    modalError,
    message,
    cloneOpen,
    openCloneModal,
    closeCloneModal,
    confirmed,
    setConfirmed,
    save,
    scaffoldDefaults,
    hasEmptyScaffoldSection,
    seedAndValidateBoundaryCases,
    action,
    clone,
    locked,
    columns,
    readiness,
    readinessError,
    readinessLoading,
    refreshReadiness
  };
}
