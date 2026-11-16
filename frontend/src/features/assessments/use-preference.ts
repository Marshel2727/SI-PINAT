"use client";

import { api, send } from "@/lib/api";
import type { AssessmentGrade, GradeState } from "@/types/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAssessment } from "./context";

export function usePreference() {
  const { assessment, base, reload } = useAssessment();
  const [selected, setSelected] = useState(assessment.preferred_specialization_code || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [editingSemester, setEditingSemester] = useState(false);
  const [existingGrades, setExistingGrades] = useState<AssessmentGrade[]>([]);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    api<GradeState>(base + "/grades")
      .then(r => {
        if (active) setExistingGrades(r.data.grades || []);
      })
      .catch(() => { /* Grades check is advisory for semester change confirmation. */ });
    return () => {
      active = false;
    };
  }, [base]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) {
      return;
    }

    if (!selected) {
      setError(new Error("Pilih satu peminatan terlebih dahulu."));
      return;
    }

    const form = new FormData(event.currentTarget);
    const nextSemester = Number(form.get("semester"));

    if (nextSemester < assessment.current_semester && existingGrades.length > 0) {
      const hasAffectedGrades = existingGrades.some(g => g.course_snapshot.semester > nextSemester);
      const confirmMessage = hasAffectedGrades
        ? `Menurunkan semester aktif dari ${assessment.current_semester} ke ${nextSemester} akan membuat nilai mata kuliah di atas semester ${nextSemester} perlu disesuaikan ulang di Tahap 2. Lanjutkan?`
        : `Sesi ini sudah memiliki ${existingGrades.length} nilai akademik tersimpan. Yakin ingin menurunkan semester aktif ke ${nextSemester}?`;

      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    setBusy(true);
    setError(null);
    try {
      await send(
        base + "/profile",
        {
          semester: nextSemester,
          nim: assessment.student?.nim || null,
          full_name: assessment.student?.full_name || null,
          class_name: assessment.student?.class_name || null,
          preferred_specialization_code: selected,
        },
        "PATCH"
      );
      await reload();
      router.push("/asesmen/" + assessment.public_id + "/nilai");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return {
    assessment,
    selected,
    setSelected,
    busy,
    error,
    save,
    editingSemester,
    setEditingSemester,
    existingGrades,
  };
}
