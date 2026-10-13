import type { Assessment, AssessmentMode } from "@/types/api";

const KEY = "sipinat.active-assessment.v1";
const stages = ["peminatan", "nilai", "tes", "hasil"] as const;
export type AssessmentStage = typeof stages[number];
export interface RememberedAssessment {
  publicId: string;
  stage: AssessmentStage;
  mode: AssessmentMode;
}

export function rememberAssessment(assessment: Assessment, stage: AssessmentStage): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ publicId: assessment.public_id, stage, mode: assessment.mode }));
    window.dispatchEvent(new Event("sipinat-session-change"));
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
