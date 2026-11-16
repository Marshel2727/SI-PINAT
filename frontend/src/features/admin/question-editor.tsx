"use client";

import { ErrorNotice, Field, Notice, StatusBadge } from "@/components/ui";
import Link from "next/link";
import { useQuestionEditor } from "./use-question-editor";

export function QuestionEditor({ id }: {
  id: string;
}) {
  const {
    question,
    setQuestion,
    specs,
    autoPublish,
    setAutoPublish,
    busy,
    error,
    message,
    isDirty,
    addOption,
    removeOption,
    save,
    action,
    locked
  } = useQuestionEditor({ id });

  return (
    <>
      <Link href="/admin/bank-soal">← Bank soal</Link>
      <h1>
        {id === "baru" && !question?.id ? "Tambah soal" : "Detail dan revisi soal"}
      </h1>
      <ErrorNotice error={error} />
      {message && <Notice tone={error ? "info" : "success"}>{message}</Notice>}
      {question ? (
        <article className="card">
          <div className="actions" style={{ marginBottom: 12 }}>
            <StatusBadge status={question.status} />
            <span className="badge mono">
              {question.revision ? `r${question.revision}` : "Revisi baru (r1)"}
            </span>
            {isDirty && !locked && (
              <span className="badge warning">Perubahan belum disimpan</span>
            )}
          </div>

          {locked && (
            <Notice>
              Revisi ini terkunci ({question.status}). Buat revisi baru untuk mengubah isi soal atau opsi jawaban.
            </Notice>
          )}

          {isDirty && question.id && !locked && (
            <Notice>
              Terdapat perubahan yang belum disimpan. Klik &ldquo;Simpan Draf&rdquo; terlebih dahulu sebelum mempublikasikan soal.
            </Notice>
          )}

          <form onSubmit={save}>
            <fieldset disabled={busy || locked}>
              <div className="two-columns">
                <Field label="Kode soal">
                  <input
                    name="code"
                    value={question.code ?? ""}
                    maxLength={32}
                    required
                    readOnly={!!question.id}
                    onChange={e => setQuestion({ ...question, code: e.target.value })}
                  />
                </Field>
                <Field label="Peminatan">
                  <select
                    name="specialization_id"
                    value={String(question.specialization_id ?? specs[0]?.id ?? "")}
                    required
                    onChange={e => setQuestion({ ...question, specialization_id: e.target.value })}
                  >
                    {specs.map(s => (
                      <option value={s.id} key={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Pertanyaan">
                <textarea
                  name="prompt"
                  value={question.prompt ?? ""}
                  required
                  rows={4}
                  maxLength={10000}
                  onChange={e => setQuestion({ ...question, prompt: e.target.value })}
                />
              </Field>

              <div className="spread wrap" style={{ marginTop: 16 }}>
                <h3 style={{ margin: 0 }}>Opsi jawaban dan kunci tunggal ({question.options.length}/8)</h3>
                {!locked && (
                  <button
                    type="button"
                    className="secondary compact"
                    disabled={busy || question.options.length >= 8}
                    onClick={addOption}
                  >
                    + Tambah opsi
                  </button>
                )}
              </div>

              {question.options.map((o, index) => (
                <div className="option-editor" key={o.label}>
                  <label className="checkbox">
                    <input
                      type="radio"
                      name="correct"
                      checked={o.is_correct}
                      onChange={() => setQuestion({
                        ...question,
                        options: question.options.map((v, i) => ({
                          ...v,
                          is_correct: i === index
                        }))
                      })}
                    />
                    Kunci {o.label}
                  </label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      aria-label={"Opsi " + o.label}
                      value={o.option_text}
                      required
                      maxLength={5000}
                      onChange={e => setQuestion({
                        ...question,
                        options: question.options.map((v, i) => i === index
                          ? { ...v, option_text: e.target.value }
                          : v)
                      })}
                    />
                    {!locked && (
                      <button
                        type="button"
                        className="secondary compact"
                        disabled={busy || question.options.length <= 2}
                        onClick={() => removeOption(index)}
                        title={question.options.length <= 2 ? "Minimal 2 opsi jawaban wajib tersedia" : `Hapus opsi ${o.label}`}
                        aria-label={`Hapus opsi ${o.label}`}
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <Field label="Penjelasan kunci (admin)">
                <textarea
                  name="explanation"
                  value={question.explanation ?? ""}
                  rows={3}
                  onChange={e => setQuestion({ ...question, explanation: e.target.value })}
                />
              </Field>
              {!locked && (
                <div className="spread wrap" style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                  {!question.id ? (
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        name="auto_publish"
                        checked={autoPublish}
                        onChange={e => setAutoPublish(e.target.checked)}
                      />
                      <span><strong>Langsung publikasikan</strong> (soal langsung aktif &amp; siap digunakan)</span>
                    </label>
                  ) : (
                    <span className="small muted">Simpan revisi draf sebelum mempublikasikan</span>
                  )}
                  <button disabled={busy}>
                    {busy ? "Menyimpan\u2026" : (!question.id ? "Simpan & Proses" : "Simpan Draf")}
                  </button>
                </div>
              )}
            </fieldset>
          </form>

          {question.id && (
            <div className="actions section">
              {question.status === "DRAFT" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => action("publish")}
                  title={isDirty ? "Simpan perubahan draf terlebih dahulu" : undefined}
                >
                  Publikasikan soal
                </button>
              )}
              {question.status === "ARCHIVED" && (
                <button type="button" disabled={busy} onClick={() => action("publish")}>
                  ↺ Tampilkan lagi di tes
                </button>
              )}
              <button type="button" className="secondary" disabled={busy} onClick={() => action("revisions")}>
                Buat revisi baru
              </button>
              {question.status !== "ARCHIVED" && (
                <button type="button" className="secondary" disabled={busy} onClick={() => action("archive")}>
                  Arsipkan
                </button>
              )}
            </div>
          )}
        </article>
      ) : (
        <Notice>Memuat soal…</Notice>
      )}
    </>
  );
}
