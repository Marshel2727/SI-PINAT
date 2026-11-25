"use client";

import { ErrorNotice, Field, Modal, Notice, StatusBadge } from "@/components/ui";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { configRows, configLabels as labels } from "./configuration";
import { useModelEditor } from "./use-model-editor";
import { ConfigTable } from "./config-table";

function inferConfigTab(detail: string): string | null {
  const lower = detail.toLowerCase();
  if (lower.includes("konversi"))
    return "grade-conversions";
  if (lower.includes("bobot") || lower.includes("matriks"))
    return "course-weights";
  if (lower.includes("tiga variabel"))
    return "variables";
  if (lower.includes("low, medium, high") || lower.includes("domain") || lower.includes("celah") || lower.includes("segitiga") || lower.includes("trapesium"))
    return "sets";
  if (lower.includes("aturan"))
    return "rules";
  return null;
}

export function ModelEditor({ id }: {
  id: string;
}) {
  const {
    model,
    tab,
    setTab,
    busy,
    error,
    setError,
    modalError,
    message,
    cloneOpen,
    openCloneModal,
    closeCloneModal,
    confirmed,
    setConfirmed,
    save,
    scaffoldDefaults,
    hasEmptyScaffoldSection,
    seedAndValidateBoundaryCases,
    action,
    clone,
    locked,
    columns,
    readiness,
    readinessError,
    readinessLoading,
    refreshReadiness
  } = useModelEditor({ id });
  const [dirty, setDirty] = useState(false);
  const tableValues = useMemo(() => model ? configRows(model, tab) : [], [model, tab]);

  useEffect(() => {
    if (!dirty)
      return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const guardLink = (event: MouseEvent) => {
      if (event.defaultPrevented || !(event.target instanceof Element))
        return;
      const link = event.target.closest("a[href]");
      if (link && !window.confirm("Ada perubahan belum disimpan. Tinggalkan halaman dan abaikan perubahan?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guardLink, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guardLink, true);
    };
  }, [dirty]);

  function changeTab(next: string) {
    if (next === tab || busy)
      return;
    if (dirty && !window.confirm("Ada perubahan belum disimpan. Pindah tab dan abaikan perubahan?"))
      return;
    setDirty(false);
    setError(null);
    setTab(next);
  }

  return (
    <>
      <Link href="/admin/model-fuzzy">← Daftar model</Link>
      <h1>Konfigurasi {model?.version_code || "Model Fuzzy"}</h1>
      <ErrorNotice error={error} />
      {message && <Notice tone="success">{message}</Notice>}
      {!model && !error && <Notice>Memuat konfigurasi…</Notice>}
      {model && (
        <>
          <div className="spread wrap">
            <StatusBadge status={model.status}>
              {model.status} · {model.method} / {model.defuzzification} · step {model.sampling_step}
            </StatusBadge>
            <div className="actions">
              {hasEmptyScaffoldSection && (
                <button
                  type="button"
                  disabled={dirty || busy}
                  onClick={scaffoldDefaults}
                  title={dirty ? "Simpan atau batalkan perubahan belum disimpan terlebih dahulu" : "Isi otomatis bagian yang masih kosong (konversi, bobot 0, variabel, himpunan, aturan 3×3)"}
                >
                  Muat Kerangka Default
                </button>
              )}
              <button type="button" className="secondary" disabled={dirty || busy} onClick={openCloneModal}>
                Kloning ke DRAFT
              </button>
              <Link className="button secondary" href={"/admin/validasi?model=" + id}>
                Kelola skenario
              </Link>
            </div>
          </div>
          {locked && (
            <Notice>
              Versi ini terkunci. Kloning untuk membuat perubahan.
            </Notice>
          )}
          <div className="tablist-scroll" role="tablist" aria-label="Bagian konfigurasi model">
            {Object.entries(labels).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                disabled={busy}
                className={tab === key ? "" : "secondary"}
                onClick={() => changeTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <ConfigTable
            key={tab + "-" + id}
            section={tab}
            title={labels[tab]}
            columns={columns[tab]}
            values={tableValues}
            locked={locked}
            onSave={values => save(tab, values)}
            saveError={error}
            busy={busy}
            onDirtyChange={setDirty}
          />
          {!locked && (
            <article className="card section">
              <h2>Validasi dan publikasi</h2>
              <div className="spread wrap">
                <h3>Checklist Kesiapan Publikasi</h3>
                <button type="button" className="secondary compact" disabled={busy || dirty || readinessLoading} onClick={refreshReadiness}>
                  {readinessLoading ? "Memeriksa…" : "Periksa ulang kesiapan"}
                </button>
              </div>
              <ErrorNotice error={readinessError} />
              {readiness && (
                <ul className="publication-checklist">
                  {readiness.checks.map(check => {
                    const isValidation = check.key.startsWith("validation-");
                    const isQuestions = check.key.startsWith("questions-");
                    return (
                      <li key={check.key}>
                        <div className="actions" style={{ gap: 8 }}>
                          <strong className={check.ready ? "check-ready" : "check-missing"}>
                            {check.ready ? "✓" : "×"} {check.label}
                          </strong>
                          {!check.ready && isValidation && (
                            <Link className="small" href={"/admin/validasi?model=" + id}>
                              Buka Skenario Validasi →
                            </Link>
                          )}
                          {!check.ready && isQuestions && (
                            <Link className="small" href="/admin/bank-soal">
                              Buka Bank Soal →
                            </Link>
                          )}
                        </div>
                        {check.details.length > 0 && (
                          <ul>
                            {check.details.map(detail => {
                              const targetTab = check.key === "configuration" ? inferConfigTab(detail) : null;
                              return (
                                <li key={detail}>
                                  <span>{detail}</span>{" "}
                                  {targetTab && targetTab !== tab && (
                                    <button
                                      type="button"
                                      className="secondary compact"
                                      style={{ marginLeft: 6, minHeight: 26, padding: "2px 8px", fontSize: "11px" }}
                                      onClick={() => changeTab(targetTab)}
                                    >
                                      Buka {labels[targetTab]} →
                                    </button>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                  <li className={confirmed ? "check-ready" : "check-missing"}>
                    {confirmed ? "✓" : "×"} Peninjauan akademik dikonfirmasi pengelola.
                  </li>
                  {dirty && <li className="check-missing">× Perubahan konfigurasi belum disimpan.</li>}
                </ul>
              )}
              {dirty && <Notice>Simpan perubahan konfigurasi sebelum menjalankan validasi atau publikasi.</Notice>}
              <p>
                Lengkapi seluruh konfigurasi, sepuluh skenario batas/overlap per
                peminatan, serta bank soal. Semua skenario harus lulus.
              </p>
              <div className="actions">
                <button type="button" disabled={busy || dirty} onClick={seedAndValidateBoundaryCases}>
                  ⚡ Siapkan 30 Skenario Batas &amp; Uji Otomatis
                </button>
                <button type="button" className="secondary" disabled={busy || dirty} onClick={() => action("validate")}>
                  Jalankan seluruh skenario
                </button>
              </div>
              <label className="checkbox section">
                <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
                Saya sudah meninjau sumber data, parameter, aturan, soal, dan
                rentang ekspektasi untuk tujuan penggunaan model ini.
              </label>
              <button type="button" disabled={busy || dirty || !confirmed || !readiness?.ready || readinessLoading} onClick={() => action("publish")}>
                Publikasikan versi model
              </button>
            </article>
          )}
        </>
      )}
      <Modal open={cloneOpen} title="Kloning versi model" dismissible={!busy} onClose={closeCloneModal}>
        <form onSubmit={clone} key={cloneOpen ? "open" : "closed"}>
          <Field label="Kode versi baru">
            <input
              name="version_code"
              required
              maxLength={32}
              pattern="[A-Za-z0-9_-]+"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Contoh: v2-revisi"
            />
          </Field>
          <Field label="Sampling step (0,01–1)">
            <input
              name="sampling_step"
              type="number"
              min="0.01"
              max="1"
              step="0.01"
              defaultValue={model?.sampling_step ?? 0.1}
              required
            />
          </Field>
          <ErrorNotice error={modalError} />
          <button disabled={busy}>
            {busy ? "Mengkloning\u2026" : "Buat draft hasil kloning"}
          </button>
        </form>
      </Modal>
    </>
  );
}
