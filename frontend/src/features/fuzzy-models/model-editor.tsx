"use client";

import { ErrorNotice, Field, Modal, Notice, StatusBadge } from "@/components/ui";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { configRows, configLabels as labels } from "./configuration";
import { useModelEditor } from "./use-model-editor";
import { ConfigTable } from "./config-table";

export function ModelEditor({ id }: {
  id: string;
}) {
  const {
    model,
    tab,
    setTab,
    busy,
    error,
    message,
    cloneOpen,
    setCloneOpen,
    confirmed,
    setConfirmed,
    save,
    action,
    clone,
    locked,
    columns, readiness, readinessError, readinessLoading, refreshReadiness
  } = useModelEditor({ id });
  const [dirty, setDirty] = useState(false);
  const tableValues = useMemo(() => model ? configRows(model, tab) : [], [model, tab]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const guardLink = (event: MouseEvent) => {
      if (event.defaultPrevented || !(event.target instanceof Element)) return;
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
    if (next === tab || busy) return;
    if (dirty && !window.confirm("Ada perubahan belum disimpan. Pindah tab dan abaikan perubahan?")) return;
    setDirty(false);
    setTab(next);
  }
  return (
    <>
      <Link href="/admin/model-fuzzy">← Daftar model</Link>
      <h1>Konfigurasi {model?.version_code || "Model Fuzzy"}</h1>
      <ErrorNotice error={error} />
      {message && <Notice tone="success">
        {message}
      </Notice>}
      {!model && !error && <Notice>Memuat konfigurasi…</Notice>}
      {model && (
        <>
          <div className="spread wrap">
            <StatusBadge status={model.status}>{model.status} · MAMDANI / CENTROID</StatusBadge>
            <div className="actions">
              <button className="secondary" disabled={dirty || busy} onClick={() => setCloneOpen(true)}>
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
          {model.version_code.toUpperCase().startsWith("DEMO") && (
            <Notice>
              Model contoh teknis. Publikasi secara eksplisit hanya mengaktifkan
              DEMO; FULL memerlukan model akademik yang disetujui.
            </Notice>
          )}
          <div className="tabs wrap section">
            {Object.entries(labels).map(([key, label]) => (
              <button key={key} disabled={busy} className={tab === key ? "" : "secondary"} onClick={() => changeTab(key)}>
                {label}
              </button>
            ))}
          </div>
          <ConfigTable
            key={tab + "-" + id}
            title={labels[tab]}
            columns={columns[tab]}
            values={tableValues}
            locked={locked}
            onSave={values => save(tab, values)}
            busy={busy}
            onDirtyChange={setDirty}
          />
          {!locked && (
            <article className="card section">
              <h2>Validasi dan publikasi</h2>
              <div className="spread wrap">
                <h3>Checklist Kesiapan Publikasi</h3>
                <button className="secondary compact" disabled={busy || dirty || readinessLoading} onClick={refreshReadiness}>
                  {readinessLoading ? "Memeriksa…" : "Periksa ulang kesiapan"}
                </button>
              </div>
              <ErrorNotice error={readinessError} />
              {readiness && <ul className="publication-checklist">
                {readiness.checks.map(check => <li key={check.key}>
                  <strong className={check.ready ? "check-ready" : "check-missing"}>{check.ready ? "✓" : "×"} {check.label}</strong>
                  {check.details.length > 0 && <ul>{check.details.map(detail => <li key={detail}>{detail}</li>)}</ul>}
                </li>)}
                <li className={confirmed ? "check-ready" : "check-missing"}>{confirmed ? "✓" : "×"} Peninjauan akademik dikonfirmasi pengelola.</li>
                {dirty && <li className="check-missing">× Perubahan konfigurasi belum disimpan.</li>}
              </ul>}
              {dirty && <Notice>Simpan perubahan konfigurasi sebelum menjalankan validasi atau publikasi.</Notice>}
              <p>
                Lengkapi seluruh konfigurasi, sepuluh skenario batas/overlap per
                peminatan, serta bank soal. Semua skenario harus lulus.
              </p>
              <button disabled={busy || dirty} onClick={() => action("validate")}>
                Jalankan seluruh skenario
              </button>
              <label className="checkbox section">
                <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
                Saya sudah meninjau sumber data, parameter, aturan, soal, dan
                rentang ekspektasi untuk tujuan penggunaan model ini.
              </label>
              <button disabled={busy || dirty || !confirmed || !readiness?.ready || readinessLoading} onClick={() => action("publish")}>
                Publikasikan versi model
              </button>
            </article>
          )}
        </>
      )}
      <Modal open={cloneOpen} title="Kloning versi model" onClose={() => !busy && setCloneOpen(false)}>
        <form onSubmit={clone}>
          <Field label="Kode versi baru">
            <input
              name="version_code"
              required
              maxLength={32}
              pattern="[A-Za-z0-9_-]+"
            />
          </Field>
          <ErrorNotice error={error} />
          <button disabled={busy}>Buat draft hasil kloning</button>
        </form>
      </Modal>
    </>
  );
}
