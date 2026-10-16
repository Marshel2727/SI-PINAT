"use client";

import { ErrorNotice, Field, Notice, Pagination, StatusBadge } from "@/components/ui";
import Link from "next/link";
import { useQuestions } from "./use-questions";

export function Questions() {
  const {
    rows,
    status,
    setStatus,
    page,
    setPage,
    pages,
    error,
    message,
    loading,
    specialization,
    setSpecialization,
    search,
    setSearch,
    specs,
    summary,
    publish,
    archive,
    publishAllDrafts,
    busyId,
    bulkBusy,
    draftCount,
    isLatest
  } = useQuestions();

  return (
    <>
      <div className="spread wrap" style={{ marginBottom: 12 }}>
        <div>
          <h1>Bank Soal Kompetensi</h1>
          <p className="small muted">
            Kelola dan publikasikan butir soal perwakilan untuk asesmen mahasiswa Teknik Komputer.
          </p>
        </div>
        <div className="actions">
          {draftCount > 0 && (
            <button
              className="secondary"
              disabled={bulkBusy}
              onClick={publishAllDrafts}
              title="Publikasikan semua butir draf di halaman ini sekaligus"
            >
              {bulkBusy ? "Memproses publikasi massal\u2026" : `⚡ Publikasikan Semua Draf (${draftCount})`}
            </button>
          )}
          <Link className="button" href="/admin/bank-soal/baru">
            + Tambah Soal
          </Link>
        </div>
      </div>

      <div className="three-columns">
        {summary.map(item => (
          <article className="card" key={item.code}>
            <h3>{item.name}</h3>
            <StatusBadge status={item.ready ? "PUBLISHED" : "DRAFT"}>
              {item.published_count} / {item.required_count} kode soal PUBLISHED
            </StatusBadge>
            <p className="small muted" style={{ marginTop: 6 }}>
              {item.ready
                ? "✓ Kuota publikasi terpenuhi."
                : `Masih memerlukan ${item.required_count - item.published_count} kode soal terpublikasi.`}
            </p>
          </article>
        ))}
      </div>

      <div className="filters">
        <Field label="Cari kode atau pertanyaan">
          <input
            value={search}
            maxLength={200}
            placeholder="Cari kata kunci soal…"
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label="Peminatan">
          <select
            value={specialization}
            onChange={event => {
              setSpecialization(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua peminatan</option>
            {specs.map(spec => (
              <option key={spec.id} value={spec.id}>
                {spec.name}
              </option>
            ))}
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
            {["DRAFT", "PUBLISHED", "ARCHIVED"].map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <ErrorNotice error={error} />
      {message && <Notice tone="success">{message}</Notice>}
      {loading && <Notice>Memuat bank soal…</Notice>}

      <article className="card">
        {!loading && !rows.length ? (
          <Notice>Tidak ada soal yang cocok dengan filter.</Notice>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Kode / Revisi</th>
                  <th>Pertanyaan Soal</th>
                  <th>Peminatan</th>
                  <th>Status</th>
                  <th style={{ minWidth: 200 }}>Aksi Cepat</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="mono">
                      <strong>{r.code}</strong> · r{r.revision}
                    </td>
                    <td>
                      <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {r.prompt}
                      </span>
                    </td>
                    <td>
                      {specs.find(spec => spec.id === r.specialization_id)?.name || r.specialization_id}
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        {(r.status === "DRAFT" || (r.status === "ARCHIVED" && isLatest(r))) && (
                          <button
                            type="button"
                            className="compact"
                            style={{
                              background: "var(--teal)",
                              color: "white",
                              minHeight: 30,
                              padding: "4px 10px",
                              fontSize: "11.5px"
                            }}
                            disabled={busyId !== null || bulkBusy}
                            onClick={() => publish(r.id)}
                            title={r.status === "DRAFT"
                              ? "Publikasikan soal ini langsung ke instrumen"
                              : "Tampilkan kembali soal yang disembunyikan"}
                          >
                            {busyId === r.id ? "…" : r.status === "DRAFT" ? "✓ Publikasikan" : "↺ Tampilkan Lagi"}
                          </button>
                        )}
                        {r.status === "ARCHIVED" && !isLatest(r) && (
                          <span className="small muted" title="Revisi yang lebih baru sudah tersedia untuk kode ini">
                            Revisi lama
                          </span>
                        )}
                        {r.status === "PUBLISHED" && (
                          <button
                            type="button"
                            className="secondary compact"
                            style={{
                              minHeight: 30,
                              padding: "4px 10px",
                              fontSize: "11.5px"
                            }}
                            disabled={busyId !== null || bulkBusy}
                            onClick={() => archive(r.id)}
                            title="Sembunyikan soal ini dari tes (dapat ditampilkan lagi)"
                          >
                            {busyId === r.id ? "…" : "Sembunyikan"}
                          </button>
                        )}
                        <Link
                          className="button secondary compact"
                          href={"/admin/bank-soal/" + r.id}
                          style={{
                            minHeight: 30,
                            padding: "4px 10px",
                            fontSize: "11.5px"
                          }}
                        >
                          Buka / Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={pages} onChange={setPage} />
      </article>
    </>
  );
}
