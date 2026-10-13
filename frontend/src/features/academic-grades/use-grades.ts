"use client";

import { useAssessment } from "@/features/assessments/context";
import { api, send } from "@/lib/api";
import type { AcademicMaster, GradeImport, GradeState } from "@/types/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useGrades() {
  const { assessment, base, reload } = useAssessment();
  const router = useRouter();
  const [master, setMaster] = useState<AcademicMaster | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<GradeState | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("import");
  const [semester, setSemester] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<GradeImport | null>(null);
  const locked = ["IN_PROGRESS", "COMPLETED"].includes(assessment.status);
  useEffect(() => {
    let active = true;
    Promise.all([
      api<AcademicMaster>(base + "/courses"),
      api<GradeState>(base + "/grades")
    ])
      .then(([a, b]) => {
        if (!active)
          return;
        setMaster(a.data);
        setState(b.data);
        setValues(Object.fromEntries(b.data.grades.map(g => [g.course_id, g.letter_grade])));
      })
      .catch(setError);
    return () => {
      active = false;
    };
  }, [base]);
  async function manual() {
    if (!master || busy)
      return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const grades = master.courses
        .filter(c => values[c.id])
        .map(c => ({
          semester: c.semester,
          kode_mk: c.code,
          nama_mk: c.name,
          nilai_huruf: values[c.id]
        }));
      const { data } = await send<GradeState>(base + "/grades", { grades }, "PUT");
      setState(data);
      await reload();
      setMessage(data.ready
        ? "Nilai lengkap dan siap untuk tes." : "Draf tersimpan. Lengkapi mata kuliah wajib.");
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }
  async function upload(confirm = false) {
    if (!file || busy)
      return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("confirm", String(confirm));
      const { data } = await api<GradeImport>(base + "/grades/import", {
        method: "POST",
        body
      });
      if (!confirm)
        setPreview(data);
      else {
        setPreview(null);
        setState(data);
        setValues(Object.fromEntries(data.grades.map(g => [g.course_id, g.letter_grade])));
        await reload();
        setMessage("Paket nilai impor tersimpan.");
      }
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }
  async function next() {
    if (busy)
      return;
    setBusy(true);
    setError(null);
    try {
      await send(base + "/test/start");
      router.push("/asesmen/" + assessment.public_id + "/tes");
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }
  return {
    assessment, base, master, values, setValues, state, setState, error, message, tab, setTab, semester, setSemester, busy, file, setFile, preview, setPreview, locked, manual, upload, next
  };
}
