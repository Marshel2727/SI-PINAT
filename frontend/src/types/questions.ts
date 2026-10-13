import type { Id, PublicationStatus, SpecializationCode } from "./common";

export interface QuestionOption {
  id: Id;
  question_id: Id;
  label: string;
  option_text: string;
  is_correct: boolean;
}

export type EditableQuestionOption = Pick<QuestionOption, "label" | "option_text" | "is_correct">;

export interface Question {
  id: Id;
  specialization_id: Id;
  code: string;
  revision: number;
  prompt: string;
  explanation: string | null;
  status: PublicationStatus;
  options: QuestionOption[];
}

export interface QuestionEditorState extends Partial<Omit<Question, "options" | "status">> {
  status: PublicationStatus;
  options: EditableQuestionOption[];
}

export interface AssessmentItem {
  id: Id;
  question_id: Id;
  order_no: number;
  max_points: number;
  prompt: string;
  specialization_code: SpecializationCode;
  specialization_name: string;
  is_representative: boolean;
  options: Omit<QuestionOption, "is_correct">[];
  answer: {
    option_id: Id;
    answer_source: "USER" | "EXAMPLE";
  } | null;
}

export interface PendingAnswer {
  item: Id;
  option: Id;
}
