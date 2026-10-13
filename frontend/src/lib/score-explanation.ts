import type { Score } from "@/types/api";
import { number } from "./format";

export function explainScore(score: Score): string {
  const academic = Math.round(score.academic_score * 100);
  const competency = Math.round(score.competency_score * 100);
  const comparison = academic === competency
    ? "Nilai akademik dan tes kompetensi setara pada tampilan dua desimal."
    : academic > competency
      ? "Nilai akademik lebih tinggi daripada hasil tes kompetensi pada bidang ini."
      : "Hasil tes kompetensi lebih tinggi daripada nilai akademik pada bidang ini.";
  return `${comparison} Akademik ${number(score.academic_score)} dan kompetensi ${number(score.competency_score)} diproses bersama melalui aturan fuzzy menjadi skor kesesuaian ${number(score.suitability_score)}.`;
}

export function contributingRuleCodes(reason: string): string[] {
  const part = reason.split("aturan berkontribusi:")[1];
  return part ? [...new Set(part.replace(/\.$/, "").split(",").map(value => value.trim()).filter(value => /^[A-Za-z0-9_-]{1,12}$/.test(value)))] : [];
}
