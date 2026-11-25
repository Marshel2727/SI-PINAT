import type { ReactNode } from "react";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draf",
  PUBLISHED: "Terpublikasi",
  ARCHIVED: "Diarsipkan",
  ACADEMIC_READY: "Nilai Lengkap",
  IN_PROGRESS: "Sedang Tes",
  COMPLETED: "Selesai",
  LULUS: "Lulus",
  GAGAL: "Gagal",
};

export function StatusBadge({ status, children }: { status: string; children?: ReactNode; }) {
  const value = status.toUpperCase();
  const tone = ["PUBLISHED", "COMPLETED", "SUCCESS", "LULUS"].includes(value)
    ? "success"
    : ["FAILED", "INVALID", "GAGAL"].includes(value)
      ? "danger"
      : ["DRAFT", "IN_PROGRESS", "ACADEMIC_READY", "BELUM DIUJI"].includes(value)
        ? "warning" : "neutral";
  return <span className={"badge " + tone}>{children ?? STATUS_LABELS[value] ?? status}</span>;
}
