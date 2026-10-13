"use client";

import { ErrorNotice, Field, Notice, Pagination } from "@/components/ui";
import Link from "next/link";
import { useQuestions } from "./use-questions";

export function Questions() {
  const { rows, status, setStatus, page, setPage, pages, error, loading } = useQuestions();
  return (
    <>
      <h1>Bank Soal Kompetensi</h1>
      <div className="spread">
        <Field label="Status">
          <select
            value={status}
            onChange={e => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua status</option>
            {["DRAFT", "PUBLISHED", "ARCHIVED"].map(s => <option key={s}>
              {s}
            </option>)}
          </select>
        </Field>
        <Link className="button" href="/admin/bank-soal/baru">+ Tambah soal</Link>
      </div>
      <ErrorNotice error={error} />
      {loading && <Notice>Memuat bank soal…</Notice>}
      <article className="card">
        {!loading && !rows.length ? <Notice>Bank soal masih kosong.</Notice> : <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Kode / revisi</th>
                <th>Soal</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => <tr key={r.id}>
                <td className="mono">{r.code} · r{r.revision}</td>
                <td>
                  {r.prompt}
                </td>
                <td>
                  <span className="badge">
                    {r.status}
                  </span>
                </td>
                <td>
                  <Link href={"/admin/bank-soal/" + r.id}>Buka soal →</Link>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>}
        <Pagination page={page} total={pages} onChange={setPage} />
      </article>
    </>
  );
}
