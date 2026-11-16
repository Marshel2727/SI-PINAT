"use client";

import { ApiError, formatApiDetail, prettyError } from "@/lib/api";
import { Notice } from "./notice";

export function ErrorNotice({ error }: { error: unknown }) {
  if (!error) {
    return null;
  }

  return (
    <Notice tone="error">
      <strong>{prettyError(error)}</strong>
      {error instanceof ApiError && error.details.length > 0 && (
        <ul>
          {error.details.map((d, i) => (
            <li key={i}>{formatApiDetail(d)}</li>
          ))}
        </ul>
      )}
    </Notice>
  );
}
