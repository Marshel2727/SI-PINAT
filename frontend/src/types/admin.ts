import type { AssessmentGrade } from "./academic";
import type { Assessment } from "./assessments";
import type { Result } from "./recommendations";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
}

export interface DashboardStats {
  total_assessments: number;
  modes: {
    DEMO: number;
    FULL: number;
  };
  completed: number;
  total_courses: number;
  total_questions: number;
  total_models: number;
  total_cases: number;
  distribution: {
    specialization_id: string;
    name: string;
    total: number;
  }[];
  distribution_note: string;
}

export interface AdminAssessmentRow extends Assessment {
  result: Result | null;
}

export interface AdminAssessmentDetail {
  assessment: Assessment;
  grades: AssessmentGrade[];
  result: Result | null;
}
