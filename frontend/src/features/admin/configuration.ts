import type { FuzzyModel } from "@/types/api";

export type ConfigValue = string | number | boolean | null | undefined;

export type ConfigRow = Record<string, ConfigValue> & {
  id?: string | number;
};

export interface ConfigOption {
  id: string | number;
  name: string;
}

export interface Column {
  key: string;
  label: string;
  type?: string;
  options?: ConfigOption[];
  min?: number;
  max?: number;
  step?: string;
  nullable?: boolean;
}

export const configLabels: Record<string, string> = {
  "grade-conversions": "Konversi Nilai",
  "course-weights": "Bobot Mata Kuliah",
  variables: "Variabel",
  sets: "Himpunan Fuzzy",
  rules: "Basis Aturan",
};

export const UNM_GRADE_PRESET: ReadonlyArray<{
  letter_grade: string;
  grade_points: number;
  normalized_score: number;
}> = [
  { letter_grade: "A", grade_points: 4, normalized_score: 100 },
  { letter_grade: "A-", grade_points: 3.75, normalized_score: 93.75 },
  { letter_grade: "B+", grade_points: 3.25, normalized_score: 81.25 },
  { letter_grade: "B", grade_points: 3, normalized_score: 75 },
  { letter_grade: "B-", grade_points: 2.75, normalized_score: 68.75 },
  { letter_grade: "C+", grade_points: 2.25, normalized_score: 56.25 },
  { letter_grade: "C", grade_points: 2, normalized_score: 50 },
  { letter_grade: "C-", grade_points: 1.75, normalized_score: 43.75 },
  { letter_grade: "D+", grade_points: 1.25, normalized_score: 31.25 },
  { letter_grade: "D", grade_points: 1, normalized_score: 25 },
  { letter_grade: "D-", grade_points: 0.75, normalized_score: 18.75 },
  { letter_grade: "E", grade_points: 0, normalized_score: 0 },
];

export const WEIGHT_PRESETS: ReadonlyArray<number> = [0, 0.2, 0.4, 0.6, 0.8, 1];

export const STANDARD_CONSEQUENTS_3X3 = [
  ["LOW", "LOW", "MEDIUM"],
  ["LOW", "MEDIUM", "HIGH"],
  ["MEDIUM", "HIGH", "HIGH"],
] as const;

export const STANDARD_SET_POINTS: Record<
  "LOW" | "MEDIUM" | "HIGH",
  {
    shape: "TRIANGLE" | "TRAPEZOID";
    point_a: number;
    point_b: number;
    point_c: number;
    point_d: number | null;
  }
> = {
  LOW: { shape: "TRAPEZOID", point_a: 0, point_b: 0, point_c: 20, point_d: 40 },
  MEDIUM: { shape: "TRIANGLE", point_a: 20, point_b: 50, point_c: 80, point_d: null },
  HIGH: { shape: "TRAPEZOID", point_a: 60, point_b: 80, point_c: 100, point_d: 100 },
};

export const enumOptions = (values: string[]): ConfigOption[] => values.map((value) => ({ id: value, name: value }));

export function configRows(model: FuzzyModel, section: string): ConfigRow[] {
  switch (section) {
    case "grade-conversions":
      return model.grade_conversions.map((row) => ({ ...row }));
    case "course-weights":
      return model.course_weights.map((row) => ({ ...row }));
    case "variables":
      return model.variables.map((row) => ({ ...row }));
    case "sets":
      return model.sets.map((row) => ({ ...row }));
    case "rules":
      return model.rules.map((row) => ({ ...row }));
    default:
      return [];
  }
}

const numericIds = new Set([
  "course_id",
  "specialization_id",
  "variable_id",
  "academic_set_id",
  "competency_set_id",
  "output_set_id",
]);

export function configurationPayload(rows: ConfigRow[], columns: Column[]): ConfigRow[] {
  return rows.map((row) => {
    const payload: ConfigRow = {};
    for (const column of columns) {
      const value = row[column.key];
      if (column.type === "number") {
        payload[column.key] =
          column.nullable && (value === "" || value === null) ? null : Number(value);
      }
      else if (column.options && numericIds.has(column.key)) {
        payload[column.key] = Number(value);
      }
      else {
        payload[column.key] = value;
      }
    }
    if (row.id)
      payload.id = Number(row.id);
    return payload;
  });
}
