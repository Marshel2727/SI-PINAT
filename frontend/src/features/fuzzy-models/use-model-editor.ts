"use client";

import { api, send } from "@/lib/api";
import type { Course, FuzzyModel, Specialization, ValidationResult } from "@/types/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { enumOptions, type Column, type ConfigRow } from "./configuration";

export function useModelEditor({ id }: {
  id: string;
}) {
  const [model, setModel] = useState<FuzzyModel | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [specs, setSpecs] = useState<Specialization[]>([]);
  const [tab, setTab] = useState("grade-conversions");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [cloneOpen, setCloneOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();
  const base = "/admin/fuzzy-models/" + id;
  useEffect(() => {
    api<FuzzyModel>(base).then(r => setModel(r.data)).catch(setError);
    api<Course[]>("/admin/courses?page_size=100").then(r => setCourses(r.data.map((c) => ({ ...c, name: c.code + " \u00B7 " + c.name })))).catch(setError);
    api<Specialization[]>("/specializations").then(r => setSpecs(r.data)).catch(setError);
  }, [base]);
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
      setMessage("Konfigurasi tersimpan. Jalankan ulang seluruh skenario validasi.");
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
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      if (kind === "validate") {
        const { data } = await send<ValidationResult[]>(base + "/validate");
        setMessage(data.filter(v => v.passed).length + " / " + data.length + " skenario lulus.");
      }
      else {
        await send<FuzzyModel>(base + "/" + kind, { academic_review_confirmed: confirmed });
        setMessage("Model berhasil dipublikasikan.");
      }
      setModel((await api<FuzzyModel>(base)).data);
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
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const { data } = await send<FuzzyModel>(base + "/clone", { version_code: form.get("version_code"), sampling_step: model?.sampling_step || 0.1 });
      router.push("/admin/model-fuzzy/" + data.id);
      setCloneOpen(false);
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }
  const locked = model?.status !== "DRAFT";
  const vars = model?.variables || [];
  const sets = model?.sets || [];
  const setOptions = (role: string) => sets.filter((s) => s.variable_id === vars.find((v) => v.code === role)?.id).map((s) => ({ id: s.id, name: s.code }));
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
      { key: "course_id", label: "Mata kuliah", options: courses }, { key: "specialization_id", label: "Peminatan", options: specs },
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
      { key: "code", label: "Himpunan", options: enumOptions(["LOW", "MEDIUM", "HIGH"]) }, { key: "shape", label: "Bentuk", options: enumOptions(["TRIANGLE", "TRAPEZOID"]) }, ...["a", "b", "c", "d"].map((p): Column => ({
        key: "point_" + p, label: p.toUpperCase(), type: "number", min: 0, max: 100, nullable: p === "d"
      }))
    ],
    rules: [
      { key: "specialization_id", label: "Peminatan", options: specs }, { key: "rule_code", label: "Kode aturan" }, { key: "academic_set_id", label: "Akademik", options: setOptions("ACADEMIC") }, { key: "competency_set_id", label: "Kompetensi", options: setOptions("COMPETENCY") }, { key: "output_set_id", label: "Kesesuaian", options: setOptions("SUITABILITY") }, { key: "operator", label: "Operator", options: enumOptions(["AND", "OR"]) },
      {
        key: "rule_weight", label: "Bobot", type: "number", min: 0, max: 1
      }
    ]
  };
  return {
    model, tab, setTab, busy, error, message, cloneOpen, setCloneOpen, confirmed, setConfirmed, save, action, clone, locked, columns
  };
}
