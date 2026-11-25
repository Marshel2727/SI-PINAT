import type { AssessmentGrade } from "./academic";
import type { Assessment } from "./assessments";
import type { Result } from "./recommendations";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  session_created_at?: string | null;
  session_expires_at?: string | null;
  active_sessions_count?: number;
  last_login_at?: string | null;
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

export interface AuditLogRow {
  id: string;
  admin_id: string | null;
  admin_name?: string | null;
  admin_email?: string | null;
  action: string;
  entity_table: string;
  entity_id: string | null;
  before_data: unknown;
  after_data: unknown;
  created_at: string;
}
