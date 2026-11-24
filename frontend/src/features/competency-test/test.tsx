"use client";

import { ErrorNotice, Modal, Notice } from "@/components/ui";
import { names } from "@/lib/format";
import { useUnsavedGuard } from "@/lib/use-unsaved-guard";
import { useEffect } from "react";
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
    pendingCount,
    savingCount,
    failedCount,
    jumpToUnanswered,
    saved,
    confirm,
    setConfirm,
    visible,
    current,
    answered,
    answer,
    finish
  } = useCompetencyTest();

  // Konfirmasi sebelum meninggalkan halaman atau mengklik tautan navigasi saat ada jawaban belum tersimpan
  useUnsavedGuard(
    pendingCount > 0,
    "Masih ada jawaban tes yang sedang disimpan atau gagal disimpan ke server. Yakin ingin meninggalkan halaman ini?"
  );

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (!current || busy || confirm || loading || event.repeat
        || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof Element
        && target.closest("textarea, select, input:not([type='radio']):not([type='checkbox']), [contenteditable]:not([contenteditable='false']), [role='dialog']")
      ) {
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        setIndex(value => Math.max(0, Math.min(visible.length - 1, value + (event.key === "ArrowRight" ? 1 : -1))));
        return;
      }
      if (pending[current.id]?.state === "saving") return;
      const key = event.key.toUpperCase();
      const option = /^[1-4]$/.test(key)
        ? current.options[Number(key) - 1]
        : /^[A-D]$/.test(key) ? current.options.find(value => value.label === key) : undefined;
      if (option) {
        event.preventDefault();
        void answer(current.id, option.id);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [current, busy, pending, confirm, loading, visible.length, setIndex, answer]);

  const progressPercent = assessment.question_count > 0
    ? Math.round((answered / assessment.question_count) * 100)
    : 0;

  const failedItems = visible
    .map((item, idx) => ({ item, idx, pendingSave: pending[item.id] }))
    .filter((entry): entry is { item: typeof visible[number]; idx: number; pendingSave: NonNullable<typeof pending[string]> } => entry.pendingSave?.state === "failed");

  const navGroups = Object.entries(names)
    .map(([code, name]) => ({
      code,
      name,
      entries: visible
        .map((item, idx) => ({ item, idx }))
        .filter(entry => entry.item.specialization_code === code),
    }))
    .filter(group => group.entries.length > 0);

  return (
    <>
      <span className="eyebrow">TAHAP 3 DARI 4</span>
      <h1>Tes Kompetensi Keilmuan</h1>
      <Notice>
        Jawab seluruh soal tes kompetensi secara mandiri. Jawaban tersimpan otomatis secara real-time pada server (sesi berlaku 24 jam).
      </Notice>
      <p className="small muted">
        Pintasan keyboard: ← / → untuk berpindah soal; A–D atau 1–4 untuk memilih jawaban.
      </p>
      <ErrorNotice error={error} />
      {loading && <Notice>Memuat paket instrumen tes…</Notice>}
      {!loading && !items.length && (
        <Notice>
          Paket belum disiapkan. Kembali ke halaman nilai dan pilih lanjut ke tes.
        </Notice>
      )}

      {current && (
        <div className="test-grid">
          <article className="card question-card">
            {/* Header Soal & Progress Bar */}
            <div className="question-header">
              <span className="badge mono">
                SOAL #{String(index + 1).padStart(2, "0")} / {visible.length}
              </span>
              <span className="badge">
                {current.specialization_name}
              </span>
            </div>

            {/* Progress bar visual di atas soal */}
            <div style={{ padding: "16px 24px 0" }}>
              <div className="spread wrap" style={{ marginBottom: 6, fontSize: "12px" }}>
                <span>
                  Progres: <strong>{answered}</strong> dari {assessment.question_count} soal ({progressPercent}%)
                </span>
                {saved && (
                  <span className={"badge " + (failedCount ? "danger" : savingCount ? "warning" : "success")} style={{ padding: "2px 8px" }} role="status">
                    {saved}
                  </span>
                )}
              </div>
              <div className="bar" style={{ height: "6px" }}>
                <div style={{ width: `${progressPercent}%`, background: "var(--primary)" }} />
              </div>
            </div>

            {failedItems.length > 0 && (
              <div className="failed-save-sticky" role="alert">
                <Notice tone="error">
                  <strong>{failedItems.length} jawaban gagal disimpan ke server.</strong>
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {failedItems.map(({ item, idx, pendingSave }) => (
                      <li key={item.id} style={{ marginBottom: 4 }}>
                        <span>Soal #{String(idx + 1).padStart(2, "0")}: {pendingSave.message || "Gagal menyimpan."}</span>{" "}
                        <button
                          type="button"
                          className="secondary compact"
                          disabled={busy}
                          onClick={() => answer(item.id, pendingSave.option)}
                        >
                          Coba Simpan Soal #{idx + 1}
                        </button>
                      </li>
                    ))}
                  </ul>
                </Notice>
              </div>
            )}

            <h2>{current.prompt}</h2>

            <div className="answers" role="radiogroup" aria-label="Pilihan jawaban">
              {current.options.map(o => {
                const isSelected = (pending[current.id]
                  ? pending[current.id].option
                  : current.answer?.option_id) === o.id;

                return (
                  <label
                    className={"answer " + (isSelected ? "selected" : "")}
                    key={o.id}
                  >
                    <input
                      type="radio"
                      name={"item-" + current.id}
                      checked={isSelected}
                      disabled={busy || pending[current.id]?.state === "saving"}
                      onChange={() => answer(current.id, o.id)}
                    />
                    <span className="option-letter">
                      {o.label}
                    </span>
                    <span>{o.option_text}</span>
                  </label>
                );
              })}
            </div>

            <div className="spread wrap question-footer">
              <button
                type="button"
                className="secondary"
                disabled={index === 0 || busy}
                onClick={() => setIndex(index - 1)}
              >
                ← Soal Sebelumnya
              </button>
              {index < visible.length - 1 ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setIndex(index + 1)}
                >
                  Soal Berikutnya →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy || pendingCount > 0 || answered !== assessment.question_count}
                  onClick={() => setConfirm(true)}
                >
                  Selesaikan Tes &amp; Lihat Rekomendasi →
                </button>
              )}
            </div>
          </article>

          <aside className="stack">
            <article className="card">
              <h3>Navigasi Soal</h3>
              <div className="question-nav-groups">
                {navGroups.map(group => {
                  const answeredInGroup = group.entries.filter(entry => Boolean(entry.item.answer)).length;
                  const firstNo = group.entries[0].idx + 1;
                  const lastNo = group.entries[group.entries.length - 1].idx + 1;
                  const rangeLabel = firstNo === lastNo ? `No. ${firstNo}` : `No. ${firstNo}–${lastNo}`;
                  return (
                    <div key={group.code}>
                      <div className="question-nav-label">
                        <span>{group.name} ({rangeLabel})</span>
                        <span>{answeredInGroup}/{group.entries.length}</span>
                      </div>
                      <div className="question-nav">
                        {group.entries.map(({ item, idx }) => {
                          const itemPending = pending[item.id];
                          const statusLabel = itemPending?.state === "saving"
                            ? "sedang disimpan"
                            : itemPending?.state === "failed"
                              ? "gagal disimpan"
                              : item.answer
                                ? "sudah dijawab"
                                : "belum dijawab";
                          const currentLabel = idx === index ? ", soal aktif" : "";
                          return (
                            <button
                              type="button"
                              key={item.id}
                              className={
                                itemPending
                                  ? "pending-answer " + itemPending.state
                                  : idx === index
                                    ? ""
                                    : item.answer
                                      ? "success-button"
                                      : "secondary"
                              }
                              disabled={busy}
                              aria-current={idx === index ? "step" : undefined}
                              aria-label={`Soal nomor ${idx + 1} (${item.specialization_name}), ${statusLabel}${currentLabel}`}
                              onClick={() => setIndex(idx)}
                            >
                              {String(idx + 1).padStart(2, "0")}
                              {itemPending?.state === "saving" ? " …" : itemPending?.state === "failed" ? " !" : ""}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className="secondary compact"
                disabled={busy || !visible.some(item => (!item.answer || pending[item.id]?.state === "failed") && pending[item.id]?.state !== "saving")}
                onClick={jumpToUnanswered}
              >
                Lompat ke soal belum terjawab
              </button>
            </article>

            <article className="card">
              <h3>Ringkasan Jawaban</h3>
              <p className="small muted">
                Terjawab: <strong>{answered}</strong> dari {assessment.question_count} soal
              </p>
              {savingCount > 0 && (
                <Notice tone="info">
                  <p>{savingCount} jawaban sedang disimpan. Kamu tetap dapat berpindah soal.</p>
                </Notice>
              )}

              <button
                type="button"
                className="full"
                disabled={busy || pendingCount > 0 || answered !== assessment.question_count}
                onClick={() => setConfirm(true)}
              >
                Selesaikan Tes &amp; Lihat Rekomendasi →
              </button>
              <p className="muted small" style={{ marginTop: 8 }}>
                Server memvalidasi kelengkapan seluruh {assessment.question_count} paket soal sebelum menghitung centroid fuzzy.
              </p>
            </article>
          </aside>
        </div>
      )}

      <Modal open={confirm} title="Selesaikan Asesmen?" dismissible={!busy} onClose={() => !busy && setConfirm(false)}>
        <p>
          Anda telah menjawab <strong>{answered}</strong> dari {assessment.question_count} soal secara mandiri.
          Setelah dikonfirmasi, jawaban akan dikunci dan sistem akan menghitung inferensi Mamdani secara permanen.
        </p>
        <div className="actions end" style={{ marginTop: 20 }}>
          <button type="button" className="secondary" onClick={() => setConfirm(false)} disabled={busy}>
            Periksa Kembali
          </button>
          <button type="button" disabled={busy || pendingCount > 0} onClick={finish}>
            {busy ? "Menghitung inferensi fuzzy…" : "Ya, Hitung Rekomendasi Sekarang"}
          </button>
        </div>
      </Modal>
    </>
  );
}
