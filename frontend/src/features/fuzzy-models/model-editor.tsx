"use client";

import { ErrorNotice, Field, Modal, Notice } from "@/components/ui";
import Link from "next/link";
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
    columns
  } = useModelEditor({ id });
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
            <span className="badge">{model.status} · MAMDANI / CENTROID</span>
            <div className="actions">
              <button className="secondary" onClick={() => setCloneOpen(true)}>
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
              <button key={key} className={tab === key ? "" : "secondary"} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
          </div>
          <ConfigTable
            key={tab + "-" + id}
            title={labels[tab]}
            columns={columns[tab]}
            values={configRows(model, tab)}
            locked={locked}
            onSave={values => save(tab, values)}
            busy={busy}
          />
          {!locked && (
            <article className="card section">
              <h2>Validasi dan publikasi</h2>
              <p>
                Lengkapi seluruh konfigurasi, sepuluh skenario batas/overlap per
                peminatan, serta bank soal. Semua skenario harus lulus.
              </p>
              <button disabled={busy} onClick={() => action("validate")}>
                Jalankan seluruh skenario
              </button>
              <label className="checkbox section">
                <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
                Saya sudah meninjau sumber data, parameter, aturan, soal, dan
                rentang ekspektasi untuk tujuan penggunaan model ini.
              </label>
              <button disabled={busy || !confirmed} onClick={() => action("publish")}>
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
