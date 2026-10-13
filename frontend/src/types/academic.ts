import type { Id } from "./common";

export interface Course {
  id: Id;
  code: string;
  name: string;
  semester: number;
  credits: number;
  is_active: boolean;
}

export type CourseEditorState = Partial<Course>;

export interface GradeConversion {
  id: Id;
  model_version_id: Id;
  letter_grade: string;
  grade_points: number;
  normalized_score: number;
}

export interface CourseWeight {
  id: Id;
  model_version_id: Id;
  course_id: Id;
  specialization_id: Id;
  weight: number;
  is_required: boolean;
}

export interface AcademicMaster {
  courses: Course[];
  weights: CourseWeight[];
  conversions: GradeConversion[];
}

export interface AssessmentGrade {
  id?: Id;
  course_id: Id;
  letter_grade: string;
  normalized_score: number;
  credits_snapshot: number;
  course_snapshot: {
    code: string;
    name: string;
    semester: number;
  };
}

export interface GradeState {
  grades: AssessmentGrade[];
  ready: boolean;
  missing_required: string[];
  errors: string[];
  academic_scores: Record<string, number>;
  coverage: {
    provided: number;
    available: number;
  };
}

export interface GradeImportRow {
  semester: string;
  kode_mk: string;
  nama_mk: string;
  nilai_huruf: string;
}

export interface GradeImport extends GradeState {
  import_id: Id;
  committed: boolean;
  preview: GradeImportRow[];
}
