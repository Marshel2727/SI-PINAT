"use client";

import { ErrorNotice, Modal, Notice } from "@/components/ui";
import { names } from "@/lib/format";
import { useCompetencyTest } from "./use-competency-test";

export function CompetencyTest() {
  const {
    assessment,
    items,
    index,
    setIndex,
    busy,
    loading,
    error,
    pending,
    saved,
    confirm,
    setConfirm,
    visible,
    current,
    answered,
    userCount,
    exampleCount,
    answer,
    fill,
    finish
  } = useCompetencyTest();
  return (
    <>
      <h1>Tes Kompetensi</h1>
      <Notice>
        {assessment.mode === "DEMO"
          ? "Jawab tiga soal perwakilan, lalu muat jawaban contoh untuk melengkapi paket." : "Jawab seluruh soal dengan kemampuanmu sendiri."}{" "}
        {answered} / {assessment.question_count} jawaban tersimpan.
      </Notice>
      <ErrorNotice error={error} />
      {loading && <Notice>Memuat paket tes…</Notice>}
      {!loading && !items.length && (
        <Notice>
          Paket belum disiapkan. Kembali ke halaman nilai dan pilih lanjut ke
          tes.
        </Notice>
      )}
      {current && (
        <div className="test-grid">
          <article className="card question-card">
            <div className="question-header">
              <span className="badge mono">
                SOAL #{String(index + 1).padStart(2, "0")}
              </span>
              <span className="badge">
                {current.specialization_name}
              </span>
              {assessment.mode === "DEMO" && (
                <small>Soal perwakilan · DEMO</small>
              )}
            </div>
            <h2>
              {current.prompt}
            </h2>
            <div className="answers" role="radiogroup" aria-label="Pilihan jawaban">
              {current.options.map(o => (
                <label
                  className={"answer " +
                    ((pending && pending.item === current.id
                      ? pending.option
                      : current.answer?.option_id) === o.id
                      ? "selected" : "")}
                  key={o.id}
                >
                  <input
                    type="radio"
                    name={"item-" + current.id}
                    checked={(pending && pending.item === current.id
                      ? pending.option
                      : current.answer?.option_id) === o.id}
                    disabled={busy}
                    onChange={() => answer(current.id, o.id)}
                  />
                  <span className="option-letter">
                    {o.label}
                  </span>
                  {o.option_text}
                </label>
              ))}
            </div>
            <p aria-live="polite" className="muted">
              {saved || "Pilih jawaban untuk menyimpan otomatis."}
            </p>
            {pending && !busy && (
              <button onClick={() => answer(pending.item, pending.option)}>
                Coba simpan lagi
              </button>
            )}
            <div className="spread question-footer">
              <button
                className="secondary"
                disabled={index === 0 || busy || !!pending}
                onClick={() => setIndex(index - 1)}
              >
                ← Sebelumnya
              </button>
              <button
                disabled={index >= visible.length - 1 || busy || !!pending}
                onClick={() => setIndex(index + 1)}
              >
                Soal berikutnya →
              </button>
            </div>
          </article>
          <aside className="stack">
            <article className="card">
              <h3>Navigasi soal</h3>
              <div className="question-nav">
                {visible.map((item, i) => (
                  <button
                    key={item.id}
                    className={i === index
                      ? "" : item.answer
                        ? "success-button" : "secondary"}
                    disabled={busy || !!pending}
                    aria-label={"Ke soal " + (i + 1)}
                    onClick={() => setIndex(i)}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </button>
                ))}
              </div>
              {Object.entries(names).map(([code, name]) => (
                <p className="spread" key={code}>
                  <small>
                    {name}
                  </small>
                  <span>
                    {items.filter(i => i.specialization_code === code && i.answer).length}
                    /{items.filter(i => i.specialization_code === code).length}
                  </span>
                </p>
              ))}
            </article>
            <article className="card">
              <h3>Kelengkapan tes</h3>
              <p>
                USER: {userCount} · EXAMPLE: {exampleCount}
              </p>
              {assessment.mode === "DEMO" && (
                <button
                  className="secondary full"
                  disabled={busy || !!pending || visible.some(i => !i.answer)}
                  onClick={fill}
                >
                  Muat jawaban contoh lainnya
                </button>
              )}
              <button
                className="full"
                disabled={busy || !!pending || answered !== assessment.question_count}
                onClick={() => setConfirm(true)}
              >
                Selesaikan dan lihat hasil
              </button>
              <p className="muted small">
                Server memeriksa kelengkapan seluruh paket sebelum menghitung.
              </p>
            </article>
          </aside>
        </div>
      )}
      <Modal open={confirm} title="Selesaikan asesmen?" onClose={() => !busy && setConfirm(false)}>
        <p>
          {userCount} jawaban nyata dan {exampleCount} jawaban contoh akan
          digunakan. Setelah selesai, input terkunci dan hasil tersimpan.
        </p>
        {exampleCount > 0 && (
          <Notice>Hasil ini tetap berlabel DEMO / DATA CONTOH.</Notice>
        )}
        <button disabled={busy} onClick={finish}>
          {busy ? "Menghitung hasil\u2026" : "Konfirmasi selesai"}
        </button>
      </Modal>
    </>
  );
}
