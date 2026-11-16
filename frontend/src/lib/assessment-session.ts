import type { Assessment, AssessmentMode } from "@/types/api";

const KEY = "sipinat.active-assessment.v1";
const stages = ["peminatan", "nilai", "tes", "hasil"] as const;
export type AssessmentStage = typeof stages[number];
export interface RememberedAssessment {
  publicId: string;
  stage: AssessmentStage;
  mode: AssessmentMode;
  expiresAt?: string | null;
  studentName?: string | null;
  studentNim?: string | null;
  currentSemester?: number;
  modelVersion?: string;
  answeredCount?: number;
  questionCount?: number;
}

export function rememberAssessment(assessment: Assessment, stage: AssessmentStage, notify = true): void {
  try {
    const payload: RememberedAssessment = {
      publicId: assessment.public_id,
      stage,
      mode: assessment.mode,
      expiresAt: assessment.expires_at ?? null,
      studentName: assessment.student?.full_name ?? null,
      studentNim: assessment.student?.nim ?? null,
      currentSemester: assessment.current_semester,
      modelVersion: assessment.model_version,
      answeredCount: assessment.progress?.answered ?? 0,
      questionCount: assessment.question_count,
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
    if (notify) {
      window.dispatchEvent(new Event("sipinat-session-change"));
    }
  } catch { /* Storage may be unavailable in private browsing; server sessions still work. */ }
}

export function readRememberedAssessment(): RememberedAssessment | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "null");
    return value && typeof value.publicId === "string"
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.publicId)
      && stages.includes(value.stage) && ["DEMO", "FULL"].includes(value.mode)
      ? value : null;
  } catch { return null; }
}

export function forgetAssessment(publicId?: string): void {
  try {
    if (!publicId || readRememberedAssessment()?.publicId === publicId) {
      localStorage.removeItem(KEY);
      window.dispatchEvent(new Event("sipinat-session-change"));
    }
  } catch { /* No local storage is required to use an assessment URL. */ }
}

export function resumeStage(assessment: Assessment, remembered: AssessmentStage): AssessmentStage {
  if (assessment.status === "COMPLETED") return "hasil";
  if (assessment.status === "IN_PROGRESS") return "tes";
  if (assessment.status === "ACADEMIC_READY") return "nilai";
  if (!assessment.preferred_specialization_code) return "peminatan";
  return remembered === "peminatan" ? "peminatan" : "nilai";
}
