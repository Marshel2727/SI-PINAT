"use client";

import { IconBookOpen, IconCheckCircle, IconFileText, IconSliders } from "@/components/icons";
import { ErrorNotice, Field, Notice, Pagination, StatusBadge } from "@/components/ui";
import { number, time } from "@/lib/format";
import Link from "next/link";
import { useDashboard } from "./use-dashboard";

const ASSESSMENT_STATUSES = [
  ["DRAFT", "Draf Awal"],
  ["ACADEMIC_READY", "Nilai Lengkap"],
  ["IN_PROGRESS", "Sedang Tes"],
  ["COMPLETED", "Selesai"]
] as const;

export function Dashboard() {
  const {
    stats,
    records,
    questionSummary,
    publishedModels,
    draftModel,
    readinessLoading,
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
  const coursesReady = Boolean(stats && stats.total_courses > 0);
  const readySpecsCount = questionSummary.filter(s => s.ready).length;
  const totalSpecsCount = questionSummary.length || 3;
  const questionsReady = questionSummary.length > 0 && questionSummary.every(s => s.ready);
  const modelReady = publishedModels.length > 0;
  const systemReady = coursesReady && questionsReady && modelReady;
  const modelSetupHref = draftModel ? `/admin/model-fuzzy/${draftModel.id}` : "/admin/model-fuzzy";

  return (
    <div className="admin-page dashboard-page">
      <header className="admin-page-header dashboard-header">
        <h1>Dashboard Administrator</h1>
        <div className="actions dashboard-header-actions">
          <Link className="button secondary compact" href="/admin/mata-kuliah">
            + Mata kuliah
          </Link>
          <Link className="button secondary compact" href="/admin/bank-soal">
            + Butir soal
          </Link>
          <Link className="button compact" href="/admin/validasi">
            Uji skenario
          </Link>
          <button
            type="button"
            className="secondary compact"
            disabled={downloading}
            onClick={downloadXlsx}
            title="Ekspor XLSX menyertakan 1 baris per peminatan sesuai filter aktif"
          >
            {downloading ? "Menyiapkan XLSX\u2026" : "Unduh XLSX"}
          </button>
        </div>
      </header>
      <ErrorNotice error={exportError} />

      {stats && !readinessLoading && (
        <section
          aria-label="Status Kesiapan Sistem Publik"
          className={"readiness-banner " + (systemReady ? "is-ready" : "needs-setup")}
        >
          <div className="spread wrap">
            {systemReady ? (
              <div className="readiness-status-row">
                <span className="readiness-dot" aria-hidden="true" />
                <strong className="readiness-title">Sistem Siap Digunakan</strong>
              </div>
            ) : (
              <div>
                <h2 style={{ marginTop: 0, marginBottom: 4 }}>
                  Lengkapi 3 prasyarat sebelum membuka portal mahasiswa
                </h2>
                <p className="small muted" style={{ margin: 0 }}>
                  Portal publik membutuhkan minimal 1 mata kuliah aktif, kuota bank soal terpublikasi di seluruh peminatan, dan 1 model fuzzy terpublikasi.
                </p>
              </div>
            )}
            {systemReady && (
              <div className="actions">
                <Link className="button secondary compact" href="/admin/model-fuzzy">
                  Kelola Model
                </Link>
              </div>
            )}
          </div>

          {!systemReady && (
            <div className="setup-steps">
              <div className={"setup-step" + (coursesReady ? " is-done" : "")}>
                <div>
                  <StatusBadge status={coursesReady ? "COMPLETED" : "DRAFT"}>
                    {coursesReady ? "1. Selesai" : "1. Belum Siap"}
                  </StatusBadge>
                  <h3 style={{ marginTop: 8, marginBottom: 4, fontSize: "15px" }}>Mata Kuliah Aktif</h3>
                  <p className="small muted" style={{ margin: 0 }}>
                    {coursesReady
                      ? `${stats.total_courses} mata kuliah aktif tersedia.`
                      : "Belum ada mata kuliah aktif di kurikulum."}
                  </p>
                </div>
                <Link className="button secondary compact" href="/admin/mata-kuliah">
                  {coursesReady ? "Kelola Mata Kuliah" : "Tambah Mata Kuliah →"}
                </Link>
              </div>

              <div className={"setup-step" + (questionsReady ? " is-done" : "")}>
                <div>
                  <StatusBadge status={questionsReady ? "COMPLETED" : "DRAFT"}>
                    {questionsReady ? "2. Selesai" : "2. Belum Siap"}
                  </StatusBadge>
                  <h3 style={{ marginTop: 8, marginBottom: 4, fontSize: "15px" }}>Kuota Bank Soal</h3>
                  <p className="small muted" style={{ margin: 0 }}>
                    {readySpecsCount}/{totalSpecsCount} peminatan siap (minimal 10 soal terpublikasi per peminatan).
                  </p>
                </div>
                <Link className="button secondary compact" href="/admin/bank-soal">
                  {questionsReady ? "Lihat Bank Soal" : "Lengkapi Bank Soal →"}
                </Link>
              </div>

              <div className={"setup-step" + (modelReady ? " is-done" : "")}>
                <div>
                  <StatusBadge status={modelReady ? "COMPLETED" : "DRAFT"}>
                    {modelReady ? "3. Selesai" : "3. Belum Siap"}
                  </StatusBadge>
                  <h3 style={{ marginTop: 8, marginBottom: 4, fontSize: "15px" }}>Model Fuzzy Terpublikasi</h3>
                  <p className="small muted" style={{ margin: 0 }}>
                    {modelReady
                      ? `Model aktif: ${publishedModels[0].version_code}.`
                      : draftModel
                        ? `Draf ${draftModel.version_code} belum dipublikasikan.`
                        : "Belum ada model fuzzy resmi yang dipublikasikan."}
                  </p>
                </div>
                <Link className="button secondary compact" href={modelSetupHref}>
                  {modelReady ? "Kelola Model Fuzzy" : draftModel ? "Lanjutkan Draf Model →" : "Buka Konfigurasi Fuzzy →"}
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {stats && (
        <div className="four-columns dashboard-stats">
          {([
            ["Total Mata Kuliah", stats.total_courses, "/admin/mata-kuliah", IconBookOpen],
            ["Soal Terpublikasi", stats.total_questions, "/admin/bank-soal", IconFileText],
            ["Versi Model", stats.total_models, "/admin/model-fuzzy", IconSliders],
            ["Skenario Validasi", stats.total_cases, "/admin/validasi", IconCheckCircle],
          ] as const).map(([title, n, href, Icon]) => (
            <Link className="card dashboard-stat-card" href={href} key={title}>
              <div className="dashboard-stat-top">
                <small>{title}</small>
                <span className="dashboard-stat-icon" aria-hidden="true">
                  <Icon size={17} />
                </span>
              </div>
              <strong className="big-number">{n}</strong>
            </Link>
          ))}
        </div>
      )}

      <ErrorNotice error={error} />
      {loading && <Notice>Memuat ringkasan dan aktivitas…</Notice>}

      {stats && (
        <div className="dashboard-grid">
          <article className="card admin-table-card">
            <div className="admin-table-card-head">
              <h2>Aktivitas Asesmen Mahasiswa</h2>
              <div className="dashboard-summary-meta">
                <span className="admin-count-pill">
                  {stats.total_assessments} asesmen · {stats.completed} selesai
                  {stats.modes.DEMO > 0 ? ` · ${stats.modes.DEMO} simulasi` : ""}
                </span>
                <span className="small muted">{total} tampil</span>
              </div>
            </div>

            <div className="admin-table-toolbar" role="search" aria-label="Filter aktivitas asesmen">
              <div className="field is-search">
                <span>Cari NIM, Nama, atau ID Sesi</span>
                <input
                  aria-label="Cari NIM, Nama, atau ID Sesi"
                  value={search}
                  maxLength={150}
                  placeholder="Ketik NIM, nama, atau ID sesi…"
                  onChange={e => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Field label="Mode">
                <select
                  value={mode}
                  onChange={e => {
                    setMode(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Semua sesi</option>
                  <option value="FULL">Resmi</option>
                  <option value="DEMO">Simulasi</option>
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
              <Field label="Dari tanggal">
                <input
                  type="date"
                  value={from}
                  onChange={e => updateFrom(e.target.value)}
                />
              </Field>
              <Field label="Sampai tanggal">
                <input
                  type="date"
                  value={to}
                  min={from}
                  onChange={e => updateTo(e.target.value)}
                />
              </Field>
              {hasActiveFilter && (
                <button type="button" className="secondary compact" onClick={resetFilters}>
                  Reset
                </button>
              )}
            </div>

            {!records.length ? (
              <Notice>Belum ada asesmen sesuai filter.</Notice>
            ) : (
              <div className="table-scroll" role="region" tabIndex={0} aria-label="Tabel aktivitas asesmen mahasiswa">
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
                            {r.student?.full_name || "Peserta Asesmen"}
                          </Link>
                          <small className="block mono muted">
                            {r.student?.nim || r.public_id.slice(0, 8)}
                          </small>
                        </td>
                        <td>
                          <div className="dashboard-status-stack">
                            <span className="badge">
                              {r.mode === "FULL" ? "Resmi" : "Simulasi"}
                            </span>
                            <StatusBadge status={r.status} />
                          </div>
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
                        <td style={{ whiteSpace: "nowrap" }}>
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
            <div className="dashboard-card-header" style={{ marginBottom: 4 }}>
              <h2>Sebaran Rekomendasi</h2>
            </div>
            {!stats.distribution.length ? (
              <p>Belum ada hasil selesai.</p>
            ) : (
              <div className="dashboard-distribution-list">
                {stats.distribution.map(r => {
                  const pct = stats.completed ? (100 * r.total) / stats.completed : 0;
                  return (
                    <div className="dashboard-dist-item" key={r.specialization_id}>
                      <div className="dashboard-dist-row">
                        <strong>{r.name}</strong>
                        <span className="small">
                          {r.total} ({number(pct, 1)}%)
                        </span>
                      </div>
                      <div className="bar">
                        <div
                          style={{
                            width: Math.min(100, Math.max(0, pct)) + "%"
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="small muted dashboard-dist-footer">
              Basis: {stats.completed} asesmen selesai.
            </p>
          </article>
        </div>
      )}
    </div>
  );
}
