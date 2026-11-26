"use client";

import { useAssessment } from "@/features/assessments/context";
import { useStudentSession } from "@/features/student-auth/student-session-context";
import { api, downloadFile, send } from "@/lib/api";
import type { AcademicMaster, GradeImport, GradeState } from "@/types/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useGrades() {
  const { assessment, base, reload } = useAssessment();
  const { refreshSession: refreshStudentSession } = useStudentSession();
  const router = useRouter();
  const [master, setMaster] = useState<AcademicMaster | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [savedValues, setSavedValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<GradeState | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [modalError, setModalError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("manual");
  const [semester, setSemester] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<GradeImport | null>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);

  const isCompleted = assessment.status === "COMPLETED";
  const locked = assessment.status === "IN_PROGRESS";

  useEffect(() => {
    let active = true;
    Promise.all([
      api<AcademicMaster>(base + "/courses"),
      api<GradeState>(base + "/grades"),
    ])
      .then(([a, b]) => {
        if (!active) return;

        setMaster(a.data);
        setState(b.data);
        const initial = Object.fromEntries(b.data.grades.map(g => [g.course_id, g.letter_grade]));
        setValues(initial);
        setSavedValues(initial);
      })
      .catch(setError);

    return () => {
      active = false;
    };
  }, [base]);

  const dirty =
    !!master &&
    master.courses.some(course => (values[course.id] || "") !== (savedValues[course.id] || ""));
  const selectedIds = new Set(
    master?.courses.filter(course => values[course.id]).map(course => course.id)
  );
  const missingRequired =
    master?.courses.filter(
      course =>
        master.weights.some(weight => weight.course_id === course.id && weight.is_required) &&
        !selectedIds.has(course.id)
    ) || [];
  const hasPositiveScores =
    !!master &&
    [...new Set(master.weights.map(weight => weight.specialization_id))].every(id =>
      master.weights.some(
        weight => weight.specialization_id === id && weight.weight > 0 && selectedIds.has(weight.course_id)
      )
    );
  const canContinue =
    !locked &&
    !!master &&
    (dirty ? missingRequired.length === 0 && hasPositiveScores : !!state?.ready);

  function closePreview() {
    setPreview(null);
    setModalError(null);
  }

  async function persist(input = values) {
    if (!master) throw new Error("Daftar mata kuliah belum dimuat.");

    const grades = master.courses
      .filter(course => input[course.id])
      .map(course => ({
        semester: course.semester,
        kode_mk: course.code,
        nama_mk: course.name,
        nilai_huruf: input[course.id],
      }));

    const { data } = await send<GradeState>(base + "/grades", { grades }, "PUT");
    const persisted = Object.fromEntries(data.grades.map(grade => [grade.course_id, grade.letter_grade]));
    setValues(persisted);
    setSavedValues(persisted);
    setState(data);
    return data;
  }

  async function manual() {
    if (!master || busy || locked) return;
    if (isCompleted && (missingRequired.length > 0 || !hasPositiveScores)) {
      setValidationAttempted(true);
      return;
    }

    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const data = await persist();
      await reload();
      if (isCompleted) {
        await refreshStudentSession();
      }
      setValidationAttempted(!data.ready);
      setMessage(
        isCompleted
          ? "Nilai akademik disimpan dan hasil rekomendasi otomatis dihitung ulang."
          : data.ready
            ? "Nilai lengkap dan siap untuk tes."
            : "Draf tersimpan. Lengkapi mata kuliah wajib."
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function upload(confirm = false, overrideFile?: File | null) {
    const target = overrideFile ?? file;
    if (!target || busy || locked) return;

    setBusy(true);
    if (confirm) {
      setModalError(null);
    } else {
      setError(null);
      setModalError(null);
    }

    try {
      const body = new FormData();
      body.set("file", target);
      body.set("confirm", String(confirm));
      const { data } = await api<GradeImport>(base + "/grades/import", {
        method: "POST",
        body,
      });

      if (!confirm) {
        setPreview(data);
      } else {
        closePreview();
        setState(data);
        setValidationAttempted(!data.ready);
        const imported = Object.fromEntries(data.grades.map(g => [g.course_id, g.letter_grade]));
        setValues(imported);
        setSavedValues(imported);
        await reload();
        if (isCompleted) {
          await refreshStudentSession();
        }
        setMessage(
          isCompleted
            ? "Paket nilai impor tersimpan dan hasil rekomendasi otomatis dihitung ulang."
            : "Paket nilai impor tersimpan."
        );
      }
    } catch (e) {
      if (confirm) {
        setModalError(e);
      } else {
        setError(e);
      }
    } finally {
      setBusy(false);
    }
  }

  async function downloadTemplate() {
    if (downloadingTemplate) return;

    setDownloadingTemplate(true);
    setError(null);
    try {
      await downloadFile(`${base}/grades/template?format=xlsx`, "template-nilai.xlsx");
    } catch (e) {
      setError(e);
    } finally {
      setDownloadingTemplate(false);
    }
  }

  async function next() {
    if (busy || locked || !master) return;
    if (!canContinue) {
      setValidationAttempted(true);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (dirty) {
        const data = await persist();
        if (!data.ready) {
          setValidationAttempted(true);
          setMessage("Nilai tersimpan. Lengkapi mata kuliah wajib sebelum melanjutkan.");
          return;
        }
      }

      if (isCompleted) {
        await reload();
        await refreshStudentSession();
        router.push("/asesmen/" + assessment.public_id + "/hasil");
        return;
      }

      await send(base + "/test/start");
      router.push("/asesmen/" + assessment.public_id + "/tes");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return {
    assessment,
    base,
    master,
    values,
    setValues,
    state,
    setState,
    error,
    modalError,
    message,
    tab,
    setTab,
    semester,
    setSemester,
    busy,
    downloadingTemplate,
    downloadTemplate,
    file,
    setFile,
    preview,
    setPreview,
    closePreview,
    locked,
    isCompleted,
    manual,
    upload,
    next,
    dirty,
    canContinue,
    hasPositiveScores,
    missingRequired,
    validationAttempted,
  };
}
