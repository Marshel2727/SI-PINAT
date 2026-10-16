"use client";

import { ErrorNotice, Field, Notice, StatusBadge } from "@/components/ui";
import Link from "next/link";
import { useQuestionEditor } from "./use-question-editor";

export function QuestionEditor({ id }: {
  id: string;
}) {
  const { question, setQuestion, specs, busy, error, message, save, action, locked } = useQuestionEditor({ id });
  return (
    <>
      <Link href="/admin/bank-soal">← Bank soal</Link>
      <h1>
        {id === "baru" ? "Tambah soal" : "Detail dan revisi soal"}
      </h1>
      <ErrorNotice error={error} />
      {message && <Notice tone="success">
        {message}
      </Notice>}
      {question ? (
        <article className="card">
          <StatusBadge status={question.status} />
          <form onSubmit={save} key={question.id || "new"}>
            <fieldset disabled={busy || locked}>
              <div className="two-columns">
                <Field label="Kode soal">
                  <input
                    name="code"
                    defaultValue={question.code}
                    maxLength={32}
                    required
                    readOnly={!!question.id}
                  />
                </Field>
                <Field label="Peminatan">
                  <select name="specialization_id" defaultValue={question.specialization_id || specs[0]?.id} required>
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
                  defaultValue={question.prompt}
                  required
                  rows={4}
                  maxLength={10000}
                />
              </Field>
              <h3>Opsi jawaban dan kunci tunggal</h3>
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
                </div>
              ))}
              <Field label="Penjelasan kunci (admin)">
                <textarea name="explanation" defaultValue={question.explanation ?? ""} rows={3} />
              </Field>
              {!locked && (
                <div className="spread wrap" style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                  {id === "baru" ? (
                    <label className="checkbox">
                      <input type="checkbox" name="auto_publish" defaultChecked={true} />
                      <span><strong>Langsung publikasikan</strong> (soal langsung aktif & siap digunakan)</span>
                    </label>
                  ) : (
                    <span className="small muted">Simpan revisi draf sebelum mempublikasikan</span>
                  )}
                  <button disabled={busy}>
                    {busy ? "Menyimpan\u2026" : (id === "baru" ? "Simpan & Proses" : "Simpan Draf")}
                  </button>
                </div>
              )}
            </fieldset>
          </form>
          {id !== "baru" && (
            <div className="actions section">
              {question.status === "DRAFT" && (
                <button disabled={busy} onClick={() => action("publish")}>
                  Publikasikan soal
                </button>
              )}
              {question.status === "ARCHIVED" && (
                <button disabled={busy} onClick={() => action("publish")}>
                  ↺ Tampilkan lagi di tes
                </button>
              )}
              <button className="secondary" disabled={busy} onClick={() => action("revisions")}>
                Buat revisi baru
              </button>
              {question.status !== "ARCHIVED" && (
                <button className="secondary" disabled={busy} onClick={() => action("archive")}>
                  Arsipkan
                </button>
              )}
            </div>
          )}
          {locked && (
            <Notice>
              Revisi ini terkunci. Buat revisi baru untuk mengubah soal atau
              opsi.
            </Notice>
          )}
        </article>
      ) : (
        <Notice>Memuat soal…</Notice>
      )}
    </>
  );
}
