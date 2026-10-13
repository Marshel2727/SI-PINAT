import type { AssessmentMode, Id, SpecializationCode } from "./common";
import type { MembershipShape } from "@/lib/fuzzy-curve";

export interface Score {
  id: Id;
  specialization_code: SpecializationCode;
  specialization_name: string;
  academic_score: number;
  competency_score: number;
  suitability_score: number;
  rank_position: number;
  reason: string;
}

export interface Result {
  assessment_id: string;
  mode: AssessmentMode;
  scores: Score[];
  top_specialization_codes: SpecializationCode[];
  has_tie: boolean;
  model_version: string;
  engine_version: string;
  answer_sources: {
    USER: number;
    EXAMPLE: number;
  };
  preferred_specialization_code: SpecializationCode | null;
  preference_comparison: {
    matches_top: boolean;
    gap_to_top: number;
  } | null;
  completed_at: string | null;
}

export interface MembershipInput {
  crisp: number;
  degrees: Record<string, number>;
}

export interface RuleActivation {
  rule_id: Id;
  rule_code: string;
  academic_set: string;
  competency_set: string;
  output_set: string;
  academic_degree: number;
  competency_degree: number;
  operator: "AND" | "OR";
  rule_weight: number;
  alpha: number;
}

export interface FuzzyTrace {
  input_sets?: Record<string, MembershipShape[]>;
  mode: AssessmentMode;
  memberships: Record<string, MembershipInput>;
  rule_activations: RuleActivation[];
  aggregated_curve: {
    domain: number[];
    z: number[];
    mu: number[];
  };
  centroid_numerator: number;
  centroid_denominator: number;
  sampling_step: number;
  score: Score;
  model_version: string;
  engine_version: string;
}
