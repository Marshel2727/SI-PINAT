"use client";

import { ErrorNotice, Field, Notice, Pagination, StatusBadge } from "@/components/ui";
import { number, time } from "@/lib/format";
import Link from "next/link";
import { useDashboard } from "./use-dashboard";

const ASSESSMENT_STATUSES = [
  ["DRAFT", "DRAFT"],
  ["ACADEMIC_READY", "ACADEMIC_READY"],
  ["IN_PROGRESS", "IN_PROGRESS"],
  ["COMPLETED", "COMPLETED"]
] as const;

export function Dashboard() {
  const {
    stats,
    records,
    pages,
    total,
    page,
    setPage,
    mode,
    setMode,
    status,
    setStatus,
    search,
    setSearch,
    from,
    updateFrom,
    to,
    updateTo,
    resetFilters,
    error,
    exportError,
    loading,
    downloading,
    downloadXlsx
  } = useDashboard();

  const hasActiveFilter = Boolean(mode || status || search.trim() || from || to);

  return (
    <>
      <article className="card">
        <span className="eyebrow">SISTEM PAKAR MAMDANI</span>
        <h1>Dashboard Administrator</h1>
        <p>
          Ringkasan database global, aktivitas asesmen mahasiswa, serta akses cepat pengelolaan instrumen.
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
          <button
            type="button"
            className="secondary"
            disabled={downloading}
            onClick={downloadXlsx}
          >
            {downloading ? "Menyiapkan XLSX\u2026" : "Unduh XLSX sesuai filter"}
          </button>
        </div>
        <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
          Ekspor XLSX menyertakan 1 baris per peminatan (3 baris per asesmen selesai) sesuai filter aktif di bawah.
        </p>
        <ErrorNotice error={exportError} />
      </article>

      <div className="filters">
        <Field label="Cari NIM, Nama, atau ID Sesi">
          <input
            value={search}
            maxLength={150}
            placeholder="Ketik NIM, nama mahasiswa, atau ID sesi…"
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label="Mode">
          <select
            value={mode}
            onChange={e => {
              setMode(e.target.value);
              setPage(1);
            }}
          >
            <option value="">DEMO dan FULL</option>
            <option value="FULL">FULL</option>
            <option value="DEMO">DEMO</option>
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
            {ASSESSMENT_STATUSES.map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dari tanggal dibuat (UTC)">
          <input
            type="date"
            value={from}
            onChange={e => updateFrom(e.target.value)}
          />
        </Field>
        <Field label="Sampai tanggal dibuat (UTC)">
          <input
            type="date"
            value={to}
            min={from}
            onChange={e => updateTo(e.target.value)}
          />
        </Field>
        {hasActiveFilter && (
          <div style={{ alignSelf: "flex-end" }}>
            <button type="button" className="secondary" onClick={resetFilters}>
              Reset Filter
            </button>
          </div>
        )}
      </div>
      <p className="small muted" style={{ marginTop: -6 }}>
        Filter tanggal menyaring waktu pembuatan sesi (UTC). Kolom &ldquo;Selesai&rdquo; pada tabel menampilkan waktu lokal perangkat.
      </p>

      <ErrorNotice error={error} />
      {loading && <Notice>Memuat ringkasan dan aktivitas…</Notice>}

      {stats && (
        <>
          <div style={{ marginTop: 18 }}>
            <span className="eyebrow">KATALOG INSTRUMEN GLOBAL (TIDAK TERPENGARUH FILTER)</span>
          </div>
          <div className="four-columns stats" style={{ marginTop: 8 }}>
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
            <strong>Ringkasan Asesmen (sesuai filter mode &amp; tanggal):</strong>{" "}
            {stats.total_assessments} asesmen · {stats.modes.FULL} FULL ·{" "}
            {stats.modes.DEMO} DEMO · {stats.completed} selesai.
            {(status || search.trim()) && " (Filter status & pencarian diterapkan pada daftar tabel dan ekspor XLSX.)"}
          </Notice>

          <div className="dashboard-grid">
            <article className="card">
              <div className="spread wrap">
                <h2>Aktivitas Asesmen Mahasiswa</h2>
                <span className="small muted">{total} sesi ditemukan</span>
              </div>
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
                        <th>Selesai (Waktu Lokal)</th>
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
                              <StatusBadge status={r.status} />
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
              <Pagination page={page} total={pages} totalItems={total} onChange={setPage} />
            </article>
            <article className="card">
              <h2>Sebaran Rekomendasi</h2>
              {!stats.distribution.length ? (
                <p>Belum ada hasil selesai.</p>
              ) : (stats.distribution.map(r => {
                const pct = stats.completed ? (100 * r.total) / stats.completed : 0;
                return (
                  <div key={r.specialization_id}>
                    <p className="spread">
                      <strong>
                        {r.name}
                      </strong>
                      <span>
                        {r.total} ({number(pct, 1)}%)
                      </span>
                    </p>
                    <div className="bar">
                      <div
                        style={{
                          width: Math.min(100, Math.max(0, pct)) + "%"
                        }}
                      />
                    </div>
                  </div>
                );
              }))}
              <p className="small muted">
                {stats.distribution_note} Persentase dihitung terhadap {stats.completed} asesmen selesai (dapat melebihi 100% bila terjadi hasil seri).
              </p>
            </article>
          </div>
        </>
      )}
    </>
  );
}
