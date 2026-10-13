"use client";

import { ErrorNotice, Field, Modal, Notice, Pagination, StatusBadge } from "@/components/ui";
import Link from "next/link";
import { useModelList } from "./use-model-list";

export function ModelList() {
  const { rows, page, setPage, pages, error, open, setOpen, busy, loading, create } = useModelList();
  return (
    <>
      <h1>Versi Model Fuzzy</h1>
      <Notice>
        Versi mencakup konversi, bobot, variabel, himpunan, dan aturan. Model
        terpublikasi dikunci; perubahan dilakukan melalui kloning.
      </Notice>
      <button onClick={() => setOpen(true)}>+ Buat model DRAFT</button>
      <ErrorNotice error={error} />
      {loading && <Notice>Memuat model…</Notice>}
      <article className="card section">
        {!loading && !rows.length ? (
          <Notice>
            Belum ada model. Buat draft dan lengkapi instrumennya.
          </Notice>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Versi</th>
                  <th>Metode</th>
                  <th>Sampling</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td>
                      {r.version_code}
                    </td>
                    <td>
                      {r.method} / {r.defuzzification}
                    </td>
                    <td>
                      {r.sampling_step}
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>
                      <Link href={"/admin/model-fuzzy/" + r.id}>
                        Konfigurasi →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={pages} onChange={setPage} />
      </article>
      <Modal open={open} title="Buat model draft" onClose={() => !busy && setOpen(false)}>
        <form onSubmit={create}>
          <Field label="Kode versi">
            <input
              name="version_code"
              required
              maxLength={32}
              pattern="[A-Za-z0-9_-]+"
            />
          </Field>
          <Field label="Sampling step (0,01–1)">
            <input
              name="sampling_step"
              type="number"
              min="0.01"
              max="1"
              step="0.01"
              defaultValue="0.1"
              required
            />
          </Field>
          <ErrorNotice error={error} />
          <button disabled={busy}>Buat draft</button>
        </form>
      </Modal>
    </>
  );
}
