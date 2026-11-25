"use client";

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

      {stats && !readinessLoading && (
        <section
          aria-label="Status Kesiapan Sistem Publik"
          className={"readiness-banner " + (systemReady ? "is-ready" : "needs-setup")}
        >
          <div className="spread wrap">
            <div>
              <span className="eyebrow">STATUS KESIAPAN SISTEM PUBLIK</span>
              <h2 style={{ marginTop: 4, marginBottom: 4 }}>
                {systemReady
                  ? "✓ Sistem Siap Digunakan Mahasiswa"
                  : "Lengkapi 3 prasyarat sebelum membuka portal mahasiswa"}
              </h2>
              <p className="small muted" style={{ margin: 0 }}>
                {systemReady
                  ? `Model fuzzy aktif: ${publishedModels[0].version_code} · ${stats.total_courses} mata kuliah aktif · ${readySpecsCount}/${totalSpecsCount} peminatan bank soal memenuhi kuota.`
                  : "Portal publik membutuhkan minimal 1 mata kuliah aktif, kuota bank soal terpublikasi di seluruh peminatan, dan 1 model fuzzy terpublikasi."}
              </p>
            </div>
            {systemReady && (
              <div className="actions">
                <span className="badge success">{publishedModels[0].version_code}</span>
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
            <option value="">Semua sesi</option>
            <option value="FULL">Asesmen Mahasiswa (Resmi)</option>
            <option value="DEMO">Data Simulasi Lama</option>
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
            {stats.total_assessments} asesmen · {stats.completed} selesai
            {stats.modes.DEMO > 0 ? ` · ${stats.modes.DEMO} simulasi lama` : ""}.
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
                <div className="table-scroll" role="region" tabIndex={0} aria-label="Tabel aktivitas asesmen mahasiswa">
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
                              {r.student?.full_name || "Peserta Asesmen"}
                            </Link>
                            <small className="block mono">
                              {r.student?.nim || r.public_id.slice(0, 8)}
                            </small>
                          </td>
                          <td>
                            <span className="badge">
                              {r.mode === "FULL" ? "Resmi" : "Simulasi"}
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
