import type { AssessmentMode, AssessmentStatus, Id, SpecializationCode } from "./common";

export interface Student {
  id: Id;
  nim: string | null;
  full_name: string;
  class_name: string | null;
}

export interface Assessment {
  id: Id;
  public_id: string;
  mode: AssessmentMode;
  status: AssessmentStatus;
  model_version: string;
  model_version_id: Id;
  current_semester: number;
  question_count: number;
  student: Student | null;
  preferred_specialization_code: SpecializationCode | null;
  completed_at: string | null;
  progress: {
    total: number;
    answered: number;
    user: number;
    example: number;
  };
}
