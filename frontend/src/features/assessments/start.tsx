"use client";

import { IconArrowRight } from "@/components/icons";
import { ErrorNotice } from "@/components/ui";
import { useStartAssessment } from "./use-start-assessment";

type StartAssessmentProps = {
  label?: string;
  variant?: "primary" | "secondary";
  triggerOnly?: boolean;
};

export function StartAssessment({
  label = "Mulai Tentukan Peminatan",
  variant = "primary",
}: StartAssessmentProps) {
  const { student, latestAssessment, loading, busy, error, startOrContinue } = useStartAssessment();

  const resolvedLabel = !student
    ? "Masuk untuk Memulai"
    : latestAssessment?.status === "COMPLETED"
      ? "Lihat Hasil Rekomendasi"
      : latestAssessment
        ? "Lanjutkan Asesmen"
        : label;

  return (
    <div className="actions">
      <button
        type="button"
        className={variant === "secondary" ? "secondary" : undefined}
        disabled={busy || loading}
        onClick={() => void startOrContinue()}
      >
        {busy ? "Menyiapkan sesi…" : resolvedLabel}
        <IconArrowRight size={16} />
      </button>
      {Boolean(error) && <ErrorNotice error={error} />}
    </div>
  );
}
