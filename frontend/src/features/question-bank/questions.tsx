"use client";

import { ErrorNotice, Field, Notice, Pagination, StatusBadge } from "@/components/ui";
import Link from "next/link";
import { useQuestions } from "./use-questions";

export function Questions() {
  const { rows, status, setStatus, page, setPage, pages, error, loading, specialization, setSpecialization, search, setSearch, specs, summary } = useQuestions();
  return (
    <>
      <h1>Bank Soal Kompetensi</h1>
      <div className="three-columns">
        {summary.map(item => <article className="card" key={item.code}>
          <h3>{item.name}</h3>
          <StatusBadge status={item.ready ? "PUBLISHED" : "DRAFT"}>{item.published_count} / {item.required_count} kode soal PUBLISHED</StatusBadge>
          <p className="small muted">{item.ready ? "Kuota publikasi terpenuhi." : `Masih memerlukan ${item.required_count - item.published_count} kode soal terpublikasi.`}</p>
        </article>)}
      </div>
      <div className="filters">
        <Field label="Cari kode atau pertanyaan">
          <input value={search} maxLength={200} onChange={event => { setSearch(event.target.value); setPage(1); }} />
        </Field>
        <Field label="Peminatan">
          <select value={specialization} onChange={event => { setSpecialization(event.target.value); setPage(1); }}>
            <option value="">Semua peminatan</option>
            {specs.map(spec => <option key={spec.id} value={spec.id}>{spec.name}</option>)}
          </select>
        </Field>
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
        {!loading && !rows.length ? <Notice>Tidak ada soal yang cocok dengan filter.</Notice> : <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Kode / revisi</th>
                <th>Soal</th>
                <th>Peminatan</th>
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
                <td>{specs.find(spec => spec.id === r.specialization_id)?.name || r.specialization_id}</td>
                <td>
                  <StatusBadge status={r.status} />
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
