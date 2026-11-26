"use client";

import { useStudentSession } from "@/features/student-auth/student-session-context";
import { send } from "@/lib/api";
import { rememberAssessment, type AssessmentStage } from "@/lib/assessment-session";
import type { Assessment } from "@/types/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function resolveAssessmentStage(assessment: Assessment): AssessmentStage {
  if (assessment.status === "COMPLETED") return "hasil";
  if (assessment.status === "IN_PROGRESS") return "tes";
  if (assessment.status === "ACADEMIC_READY") return "nilai";
  if (assessment.preferred_specialization_code) return "nilai";
  return "peminatan";
}

export function useStartAssessment() {
  const { student, latestAssessment, loading, refreshSession } = useStudentSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const router = useRouter();

  async function startOrContinue() {
    if (busy || loading) return;

    if (!student) {
      router.push("/masuk");
      return;
    }

    if (latestAssessment) {
      const stage = resolveAssessmentStage(latestAssessment);
      rememberAssessment(latestAssessment, stage, false);
      router.push(`/asesmen/${latestAssessment.public_id}/${stage}`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const { data } = await send<Assessment>("/assessments", {
        mode: "FULL",
        semester: 4,
      });
      const stage = resolveAssessmentStage(data);
      rememberAssessment(data, stage);
      await refreshSession();
      router.push(`/asesmen/${data.public_id}/${stage}`);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return {
    student,
    latestAssessment,
    loading,
    busy,
    error,
    startOrContinue,
  };
}
