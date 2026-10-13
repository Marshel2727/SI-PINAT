"use client";

import { ErrorNotice, Modal, Notice } from "@/components/ui";
import { names } from "@/lib/format";
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
    pendingCount, savingCount, failedCount, jumpToUnanswered,
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

  // Konfirmasi sebelum meninggalkan halaman jika tes sedang berjalan
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingCount > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [pendingCount]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (!current || busy || confirm || loading || event.repeat
        || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof Element && target.closest("input, select, textarea, button, a, [contenteditable]:not([contenteditable='false']), [role='dialog']")) return;
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

  const demoAllAnswered = assessment.mode === "DEMO" && visible.every(i => i.answer);

  return (
    <>
      <span className="eyebrow">TAHAP 3 DARI 4</span>
      <h1>Tes Kompetensi Keilmuan</h1>
      <Notice>
        {assessment.mode === "DEMO"
          ? "Mode DEMO: Jawab 3 soal perwakilan bidang keilmuan, lalu muat jawaban contoh untuk menguji kalkulasi inferensi fuzzy."
          : "Jawab seluruh soal tes kompetensi secara mandiri. Jawaban tersimpan otomatis secara real-time pada server."}
      </Notice>
      <p className="small muted">Pintasan keyboard: ← / → untuk berpindah soal; A–D atau 1–4 untuk memilih jawaban saat fokus berada di luar kontrol formulir.</p>
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
              {assessment.mode === "DEMO" && (
                <small className="mono">Soal Perwakilan · DEMO</small>
              )}
            </div>

            {/* Progress bar visual di atas soal */}
            <div style={{ padding: "16px 24px 0" }}>
              <div className="spread" style={{ marginBottom: 6, fontSize: "12px" }}>
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

            {/* Banner Khusus Mode DEMO jika 3 soal sudah dijawab */}
            {assessment.mode === "DEMO" && demoAllAnswered && exampleCount === 0 && (
              <div className="notice success" style={{ margin: "16px 24px" }}>
                <strong>✓ Tiga soal perwakilan telah selesai dijawab!</strong>
                <p style={{ margin: "6px 0 12px" }}>
                  Lengkapi paket dengan memuat 27 jawaban contoh berlabel EXAMPLE untuk menguji perhitungan rekomendasi fuzzy.
                </p>
                <button
                  className="compact"
                  disabled={busy || pendingCount > 0}
                  onClick={fill}
                >
                  {busy ? "Memuat data contoh\u2026" : "⚡ Muat 27 Jawaban Contoh Sekarang"}
                </button>
              </div>
            )}

            {pending[current.id]?.state === "failed" && !busy && (
              <div style={{ margin: "12px 24px" }}>
                <button className="compact" onClick={() => answer(current.id, pending[current.id].option)}>
                  Gagal menyimpan · Klik untuk coba simpan lagi
                </button>
              </div>
            )}

            <div className="spread question-footer">
              <button
                className="secondary"
                disabled={index === 0 || busy}
                onClick={() => setIndex(index - 1)}
              >
                ← Soal Sebelumnya
              </button>
              <button
                disabled={index >= visible.length - 1 || busy}
                onClick={() => setIndex(index + 1)}
              >
                Soal Berikutnya →
              </button>
            </div>
          </article>

          <aside className="stack">
            <article className="card">
              <h3>Navigasi Soal</h3>
              <div className="question-nav">
                {visible.map((item, i) => (
                  <button
                    key={item.id}
                    className={pending[item.id] ? "pending-answer " + pending[item.id].state : i === index
                      ? ""
                      : item.answer
                        ? "success-button"
                        : "secondary"}
                    disabled={busy}
                    aria-label={"Ke soal nomor " + (i + 1)}
                    onClick={() => setIndex(i)}
                  >
                    {String(i + 1).padStart(2, "0")}{pending[item.id]?.state === "saving" ? " …" : pending[item.id]?.state === "failed" ? " !" : ""}
                  </button>
                ))}
              </div>
              <button className="secondary compact" disabled={busy || !visible.some(item => (!item.answer || pending[item.id]?.state === "failed") && pending[item.id]?.state !== "saving")} onClick={jumpToUnanswered}>
                Lompat ke soal belum terjawab
              </button>
              {Object.entries(names).map(([code, name]) => (
                <p className="spread" key={code} style={{ fontSize: "12.5px", margin: "6px 0" }}>
                  <small>{name}</small>
                  <strong>
                    {items.filter(i => i.specialization_code === code && i.answer).length}
                    /{items.filter(i => i.specialization_code === code).length}
                  </strong>
                </p>
              ))}
            </article>

            <article className="card">
              <h3>Ringkasan Jawaban</h3>
              <p className="small muted">
                Jawaban Peserta (USER): <strong>{userCount}</strong><br />
                Jawaban Contoh (EXAMPLE): <strong>{exampleCount}</strong>
              </p>
              {pendingCount > 0 && <Notice tone={failedCount ? "error" : "info"}>
                {savingCount > 0 && <p>{savingCount} jawaban sedang disimpan. Kamu tetap dapat berpindah soal.</p>}
                {visible.filter(item => pending[item.id]?.state === "failed").map(item => <div key={item.id}>
                  <p>Soal {visible.indexOf(item) + 1}: {pending[item.id].message}</p>
                  <button className="secondary compact" disabled={busy} onClick={() => answer(item.id, pending[item.id].option)}>Coba simpan soal {visible.indexOf(item) + 1}</button>
                </div>)}
              </Notice>}

              {assessment.mode === "DEMO" && (
                <button
                  className="secondary full"
                  disabled={busy || pendingCount > 0 || !demoAllAnswered}
                  onClick={fill}
                  style={{ marginBottom: 12 }}
                >
                  {exampleCount > 0 ? "Muat ulang jawaban contoh" : "Muat 27 jawaban contoh"}
                </button>
              )}

              <button
                className="full"
                disabled={busy || pendingCount > 0 || answered !== assessment.question_count}
                onClick={() => setConfirm(true)}
              >
                Selesaikan dan Lihat Hasil →
              </button>
              <p className="muted small" style={{ marginTop: 8 }}>
                Server memvalidasi kelengkapan seluruh 30 paket soal sebelum menghitung centroid fuzzy.
              </p>
            </article>
          </aside>
        </div>
      )}

      <Modal open={confirm} title="Selesaikan Asesmen?" onClose={() => !busy && setConfirm(false)}>
        <p>
          Anda telah menjawab <strong>{userCount}</strong> soal secara mandiri{" "}
          {exampleCount > 0 && <>dan <strong>{exampleCount}</strong> soal contoh</>}.
          Setelah dikonfirmasi, jawaban akan dikunci dan sistem akan menghitung inferensi Mamdani secara permanen.
        </p>
        {exampleCount > 0 && (
          <Notice tone="info">Hasil akhir sesi ini akan ditandai berlabel DEMO / DATA CONTOH.</Notice>
        )}
        <div className="actions end" style={{ marginTop: 20 }}>
          <button className="secondary" onClick={() => setConfirm(false)} disabled={busy}>
            Periksa Kembali
          </button>
          <button disabled={busy || pendingCount > 0} onClick={finish}>
            {busy ? "Menghitung inferensi fuzzy\u2026" : "Ya, Selesaikan Asesmen"}
          </button>
        </div>
      </Modal>
    </>
  );
}
