"use client";

import Link from "next/link";

export function Steps({ active, publicId, locked = true }: {
  active: number;
  publicId?: string;
  locked?: boolean;
}) {
  return (
    <ol className="steps" aria-label="Tahapan asesmen">
      {["Peminatan Awal", "Nilai Akademik", "Tes Kompetensi", "Hasil Rekomendasi"].map((text, i) => {
        const content = <>
          <span className="step-number">{i + 1 < active ? "✓" : i + 1}</span>
          <div><small>Tahap {i + 1}</small><strong>{text}</strong></div>
        </>;
        return <li
          className={i + 1 === active ? "current" : i + 1 < active ? "done" : ""}
          aria-current={i + 1 === active ? "step" : undefined}
          key={text}
        >
          {publicId && !locked && i + 1 < active
            ? <Link className="step-link" href={`/asesmen/${publicId}/${["peminatan", "nilai", "tes", "hasil"][i]}`}>{content}</Link>
            : content}
        </li>;
      })}
    </ol>
  );
}
