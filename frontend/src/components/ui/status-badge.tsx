import type { ReactNode } from "react";

export function StatusBadge({ status, children }: { status: string; children?: ReactNode; }) {
  const value = status.toUpperCase();
  const tone = ["PUBLISHED", "COMPLETED", "SUCCESS", "LULUS"].includes(value)
    ? "success"
    : ["FAILED", "INVALID", "GAGAL"].includes(value)
      ? "danger"
      : ["DRAFT", "IN_PROGRESS", "ACADEMIC_READY", "BELUM DIUJI"].includes(value)
        ? "warning" : "neutral";
  return <span className={"badge " + tone}>{children ?? status}</span>;
}
