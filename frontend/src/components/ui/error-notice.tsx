"use client";

import { ApiError, prettyError } from "@/lib/api";
import { Notice } from "./notice";

function detailMessage(value: unknown): string {
  if (typeof value === "string")
    return value;
  if (!value || typeof value !== "object")
    return "Periksa kembali data yang dimasukkan.";
  const row = value as Record<string, unknown>;
  const parts: string[] = [];
  if (row.row)
    parts.push("Baris " + String(row.row) + (row.kode_mk ? " (" + String(row.kode_mk) + ")" : ""));
  if (typeof row.message === "string")
    parts.push((typeof row.field === "string" ? row.field + ": " : "") + row.message);
  if (Array.isArray(row.messages))
    parts.push(...row.messages.filter((message): message is string => typeof message === "string"));
  if (Array.isArray(row.missing_required) && row.missing_required.length)
    parts.push("Mata kuliah wajib: " + row.missing_required.join(", "));
  if (Array.isArray(row.errors))
    parts.push(...row.errors.filter((message): message is string => typeof message === "string"));
  return parts.join(". ") || "Periksa kembali data yang dimasukkan.";
}

export function ErrorNotice({ error }: {
  error: unknown;
}) {
  if (!error)
    return null;
  return (
    <Notice tone="error">
      <strong>
        {prettyError(error)}
      </strong>
      {error instanceof ApiError && error.details.length > 0 && <ul>
        {error.details.map((d, i) => <li key={i}>
          {detailMessage(d)}
        </li>)}
      </ul>}
    </Notice>
  );
}
