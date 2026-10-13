"use client";

import { ErrorNotice, Field, Notice, Pagination } from "@/components/ui";
import { number, time } from "@/lib/format";
import Link from "next/link";
import { useDashboard } from "./use-dashboard";

export function Dashboard() {
  const {
    stats,
    records,
    pages,
    page,
    setPage,
    mode,
    setMode,
    from,
    setFrom,
    to,
    setTo,
    error,
    loading,
    filters
  } = useDashboard();
  return (
    <>
      <article className="card">
        <span className="eyebrow">SISTEM PAKAR MAMDANI</span>
        <h1>Dashboard Administrator</h1>
        <p>
          Ringkasan database, aktivitas asesmen, serta konfigurasi instrumen.
        </p>
        <div className="actions">
          <Link className="button secondary" href="/admin/mata-kuliah">
            + Mata kuliah
          </Link>
          <Link className="button secondary" href="/admin/bank-soal">
            + Butir soal
          </Link>
          <Link className="button" href="/admin/validasi">
            Uji skenario fuzzy
          </Link>
          <a className="button secondary" href={"/api/v1/admin/reports/assessments.xlsx?" + filters}>
            Unduh XLSX sesuai filter
          </a>
        </div>
      </article>
      <div className="filters">
        <Field label="Mode">
          <select
            value={mode}
            onChange={e => {
              setMode(e.target.value);
              setPage(1);
            }}
          >
            <option value="">DEMO dan FULL</option>
            <option>FULL</option>
            <option>DEMO</option>
          </select>
        </Field>
        <Field label="Dari tanggal (UTC)">
          <input
            type="date"
            value={from}
            onChange={e => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label="Sampai tanggal (UTC)">
          <input
            type="date"
            value={to}
            min={from}
            onChange={e => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </Field>
      </div>
      <ErrorNotice error={error} />
      {loading && <Notice>Memuat ringkasan dan aktivitas…</Notice>}
      {stats && (
        <>
          <div className="four-columns stats">
            {[
              ["Total mata kuliah", stats.total_courses],
              ["Soal terpublikasi", stats.total_questions],
              ["Versi model", stats.total_models],
              ["Skenario validasi", stats.total_cases]
            ].map(([title, n]) => (
              <article className="card" key={title}>
                <small>
                  {title}
                </small>
                <strong className="big-number">
                  {n}
                </strong>
              </article>
            ))}
          </div>
          <Notice>
            {stats.total_assessments} asesmen · {stats.modes.FULL} FULL ·{" "}
            {stats.modes.DEMO} DEMO · {stats.completed} selesai.
          </Notice>
          <div className="dashboard-grid">
            <article className="card">
              <h2>Aktivitas Asesmen Mahasiswa</h2>
              {!records.length ? (
                <Notice>Belum ada asesmen sesuai filter.</Notice>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Peserta</th>
                        <th>Mode / status</th>
                        <th>Rekomendasi teratas</th>
                        <th>Selesai</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map(r => (
                        <tr key={r.public_id}>
                          <td>
                            <Link href={"/admin/asesmen/" + r.public_id}>
                              {r.student?.full_name || "Peserta DEMO"}
                            </Link>
                            <small className="block mono">
                              {r.student?.nim || r.public_id.slice(0, 8)}
                            </small>
                          </td>
                          <td>
                            <span className="badge">
                              {r.mode}
                            </span>
                            <small className="block">
                              {r.status}
                            </small>
                          </td>
                          <td>
                            {r.result
                              ? r.result.scores
                                .filter(s => s.rank_position === 1)
                                .map(s => s.specialization_name + " (" +
                                  number(s.suitability_score) + ")")
                                .join(" / ")
                              : "Belum selesai"}
                          </td>
                          <td>
                            {time(r.completed_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination page={page} total={pages} onChange={setPage} />
            </article>
            <article className="card">
              <h2>Sebaran Rekomendasi</h2>
              {!stats.distribution.length ? (
                <p>Belum ada hasil selesai.</p>
              ) : (stats.distribution.map(r => (
                <div key={r.specialization_id}>
                  <p className="spread">
                    <strong>
                      {r.name}
                    </strong>
                    <span>
                      {r.total}
                    </span>
                  </p>
                  <div className="bar">
                    <div
                      style={{
                        width: (stats.completed
                          ? (100 * r.total) / stats.completed
                          : 0) + "%"
                      }}
                    />
                  </div>
                </div>
              )))}
              <p className="small muted">
                {stats.distribution_note}
              </p>
            </article>
          </div>
        </>
      )}
    </>
  );
}
