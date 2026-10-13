import type { CourseWeight, GradeConversion } from "./academic";
import type { Id, PublicationStatus } from "./common";

export type VariableCode = "ACADEMIC" | "COMPETENCY" | "SUITABILITY";

export type SetCode = "LOW" | "MEDIUM" | "HIGH";

export interface FuzzyVariable {
  id: Id;
  model_version_id: Id;
  code: VariableCode;
  direction: "INPUT" | "OUTPUT";
  domain_min: number;
  domain_max: number;
}

export interface FuzzySet {
  id: Id;
  variable_id: Id;
  code: SetCode;
  shape: "TRIANGLE" | "TRAPEZOID";
  point_a: number;
  point_b: number;
  point_c: number;
  point_d: number | null;
}

export interface FuzzyRule {
  id: Id;
  model_version_id: Id;
  specialization_id: Id;
  rule_code: string;
  academic_set_id: Id;
  competency_set_id: Id;
  output_set_id: Id;
  operator: "AND" | "OR";
  rule_weight: number;
}

export interface ValidationCase {
  id: Id;
  model_version_id: Id;
  specialization_id: Id;
  case_code: string;
  academic_input: number;
  competency_input: number;
  expected_min: number;
  expected_max: number;
  last_actual_score: number | null;
  last_passed: boolean | null;
  last_tested_at: string | null;
}

export type ValidationEditorState = Partial<ValidationCase>;

export interface ValidationResult {
  case_id: Id;
  actual_score: number | null;
  passed: boolean;
}

export interface FuzzyModelSummary {
  id: Id;
  version_code: string;
  sampling_step: number;
  method: "MAMDANI";
  defuzzification: "CENTROID";
  status: PublicationStatus;
}

export interface FuzzyModel extends FuzzyModelSummary {
  variables: FuzzyVariable[];
  sets: FuzzySet[];
  rules: FuzzyRule[];
  course_weights: CourseWeight[];
  grade_conversions: GradeConversion[];
  validation_cases: ValidationCase[];
}

export interface PublicationReadiness {
  ready: boolean;
  checks: { key: string; label: string; ready: boolean; details: string[]; }[];
}
