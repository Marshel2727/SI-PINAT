"use client";

import Link from "next/link";

export function Steps({
  active,
  publicId,
  locked = true,
  maxReachable,
  allowedSteps,
}: {
  active: number;
  publicId?: string;
  locked?: boolean;
  maxReachable?: number;
  allowedSteps?: number[];
}) {
  const highestReachable = maxReachable ?? active;

  return (
    <ol className="steps" aria-label="Tahapan asesmen">
      {["Peminatan Awal", "Nilai Akademik", "Tes Kompetensi", "Hasil Rekomendasi"].map((text, i) => {
        const stepNo = i + 1;
        const isDone = stepNo < active || (stepNo > active && stepNo <= highestReachable);
        const canNavigate = Boolean(
          publicId &&
            stepNo !== active &&
            (allowedSteps
              ? allowedSteps.includes(stepNo)
              : !locked && stepNo <= highestReachable)
        );
        const stage = ["peminatan", "nilai", "tes", "hasil"][i];
        const content = (
          <>
            <span className="step-number">{isDone ? "✓" : stepNo}</span>
            <div>
              <small>Tahap {stepNo}</small>
              <strong>{text}</strong>
            </div>
          </>
        );

        return (
          <li
            className={stepNo === active ? "current" : isDone ? "done" : ""}
            aria-current={stepNo === active ? "step" : undefined}
            key={text}
          >
            {canNavigate ? (
              <Link className="step-link" href={`/asesmen/${publicId}/${stage}`}>
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ol>
  );
}
