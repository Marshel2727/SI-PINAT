export type Id = string;

export type AssessmentMode = "DEMO" | "FULL";

export type AssessmentStatus = "DRAFT" | "ACADEMIC_READY" | "IN_PROGRESS" | "COMPLETED";

export type PublicationStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type SpecializationCode = "ES-01" | "SC-02" | "JDF-03";

export interface Envelope<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface Specialization {
  id: Id;
  code: SpecializationCode;
  name: string;
  description: string | null;
  is_active: boolean;
}
