"use client";

export function Steps({ active }: {
  active: number;
}) {
  return (
    <ol className="steps" aria-label="Tahapan asesmen">
      {["Peminatan Awal", "Nilai Akademik", "Tes Kompetensi", "Hasil Rekomendasi"].map((text, i) => <li
        className={i + 1 === active ? "current" : i + 1 < active ? "done" : ""}
        aria-current={i + 1 === active ? "step" : undefined}
        key={text}
      >
        <span className="step-number">
          {i + 1 < active ? "\u2713" : i + 1}
        </span>
        <div>
          <small>Tahap {i + 1}</small>
          <strong>
            {text}
          </strong>
        </div>
      </li>)}
    </ol>
  );
}
