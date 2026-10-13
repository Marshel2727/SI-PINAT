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
