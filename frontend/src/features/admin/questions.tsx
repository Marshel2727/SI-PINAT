"use client";

import { ErrorNotice, Field, Modal, Notice, Pagination, StatusBadge } from "@/components/ui";
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
    total,
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
    removeDraft,
    publishAllDrafts,
    busyId,
    bulkBusy,
    totalDraftCount,
    isLatest,
    importOpen,
    openImportModal,
    closeImportModal,
    templateSpecCode,
    setTemplateSpecCode,
    importJson,
    setImportJson,
    importPublish,
    setImportPublish,
    importBusy,
    importError,
    importPartialErrors,
    loadTemplate,
    submitImport
  } = useQuestions();

  function toggleSpecFilter(specId: string) {
    setSpecialization(prev => (prev === specId ? "" : specId));
    setPage(1);
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-page-title">
          <h1>Bank Soal</h1>
          <span className="admin-count-pill">{total}</span>
        </div>
        <div className="actions">
          {totalDraftCount > 0 && (
            <button
              type="button"
              className="secondary compact"
              disabled={bulkBusy || busyId !== null}
              onClick={publishAllDrafts}
              title="Publikasikan seluruh butir draf revisi terbaru di bank soal sekaligus"
            >
              {bulkBusy ? "Memproses\u2026" : `Publikasikan Semua Draf (${totalDraftCount})`}
            </button>
          )}
          <button
            type="button"
            className="secondary compact"
            disabled={bulkBusy}
            onClick={openImportModal}
          >
            Impor JSON
          </button>
          <Link className="button compact" href="/admin/bank-soal/baru">
            + Tambah Soal
          </Link>
        </div>
      </header>

      <div className="quota-grid">
        {summary.map(item => {
          const specId = String(item.specialization_id);
          const isSelected = specialization === specId;
          const pct = item.required_count > 0
            ? Math.min(100, Math.round((100 * item.published_count) / item.required_count))
            : 100;
          return (
            <button
              key={item.code}
              type="button"
              className={"quota-tile" + (isSelected ? " is-selected" : "")}
              aria-pressed={isSelected}
              onClick={() => toggleSpecFilter(specId)}
            >
              <div className="quota-tile-top">
                <strong>{item.name}</strong>
                <span className="badge mono">{item.code}</span>
              </div>
              <div className="quota-tile-meta">
                <span>{item.published_count}/{item.required_count} terpublikasi</span>
                <span className={item.ready ? "check-ready" : "muted"}>
                  {item.ready ? "Siap" : `Kurang ${item.required_count - item.published_count}`}
                </span>
              </div>
              <div className={"quota-bar" + (item.ready ? " is-ready" : "")}>
                <div style={{ width: `${pct}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      <ErrorNotice error={error} />
      {message && <Notice tone="success">{message}</Notice>}

      <article className="card admin-table-card">
        <div className="admin-table-toolbar">
          <div className="field is-search">
            <span>Cari kode atau pertanyaan</span>
            <input
              aria-label="Cari kode atau pertanyaan"
              value={search}
              maxLength={200}
              autoCorrect="off"
              spellCheck={false}
              placeholder="Cari kata kunci soal…"
              onChange={event => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
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
              {[
                ["DRAFT", "Draf"],
                ["PUBLISHED", "Terpublikasi"],
                ["ARCHIVED", "Diarsipkan"]
              ].map(([s, label]) => (
                <option key={s} value={s}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {loading && <Notice>Memuat bank soal…</Notice>}

        {!loading && !rows.length ? (
          <Notice>Tidak ada soal yang cocok dengan filter.</Notice>
        ) : (
          <div className="table-scroll" role="region" tabIndex={0} aria-label="Daftar bank soal kompetensi">
            <table>
              <thead>
                <tr>
                  <th>Kode / Revisi</th>
                  <th>Pertanyaan Soal</th>
                  <th>Peminatan</th>
                  <th>Status</th>
                  <th style={{ minWidth: 230 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const latest = isLatest(r);
                  return (
                    <tr key={r.id}>
                      <td className="mono">
                        <strong>{r.code}</strong> · r{r.revision}
                      </td>
                      <td>
                        <span className="question-prompt-clamp">
                          {r.prompt}
                        </span>
                      </td>
                      <td>
                        {specs.find(spec => String(spec.id) === String(r.specialization_id))?.name || r.specialization_id}
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td>
                        <div className="actions" style={{ gap: 6 }}>
                          {(r.status === "DRAFT" || (r.status === "ARCHIVED" && latest)) && (
                            <button
                              type="button"
                              className="btn-row btn-row-teal"
                              disabled={busyId !== null || bulkBusy}
                              onClick={() => publish(r.id)}
                              title={r.status === "DRAFT"
                                ? "Publikasikan soal ini langsung ke instrumen"
                                : "Tampilkan kembali soal yang disembunyikan"}
                            >
                              {busyId === r.id ? "…" : r.status === "DRAFT" ? "Publikasikan" : "Tampilkan"}
                            </button>
                          )}
                          {r.status === "ARCHIVED" && !latest && (
                            <span className="small muted" title="Revisi yang lebih baru sudah tersedia untuk kode ini">
                              Revisi lama
                            </span>
                          )}
                          {r.status === "PUBLISHED" && (
                            <button
                              type="button"
                              className="secondary btn-row"
                              disabled={busyId !== null || bulkBusy}
                              onClick={() => archive(r.id)}
                              title="Sembunyikan soal ini dari tes (dapat ditampilkan lagi)"
                            >
                              {busyId === r.id ? "…" : "Sembunyikan"}
                            </button>
                          )}
                          <Link
                            className="button secondary btn-row"
                            href={"/admin/bank-soal/" + r.id}
                          >
                            Edit
                          </Link>
                          {r.status === "DRAFT" && (
                            <button
                              type="button"
                              className="secondary btn-row btn-row-danger"
                              disabled={busyId !== null || bulkBusy}
                              onClick={() => removeDraft(r)}
                              title="Hapus permanen butir draf ini"
                            >
                              Hapus Draf
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={pages} totalItems={total} onChange={setPage} />
      </article>

      <Modal open={importOpen} title="Impor Soal (JSON)" dismissible={!importBusy} onClose={closeImportModal}>
        <form onSubmit={submitImport}>
          <p className="small muted">
            Unggah berkas .json atau tempel data soal (1–100 butir). Gunakan template sebagai acuan format.
          </p>
          <div className="actions" style={{ marginBottom: 12, alignItems: "center" }}>
            <select
              aria-label="Peminatan untuk contoh template JSON"
              value={templateSpecCode}
              disabled={importBusy}
              onChange={e => setTemplateSpecCode(e.target.value)}
              style={{ width: "auto", minWidth: 160 }}
            >
              {specs.length > 0 ? (
                specs.map(s => (
                  <option key={s.code} value={s.code}>
                    {s.code} · {s.name}
                  </option>
                ))
              ) : (
                <option value="ES-01">ES-01</option>
              )}
            </select>
            <button type="button" className="secondary compact" disabled={importBusy} onClick={() => loadTemplate()}>
              Muat Contoh Template JSON
            </button>
            <label className="button secondary compact" style={{ cursor: "pointer" }}>
              Pilih Berkas .json
              <input
                type="file"
                accept=".json,application/json"
                style={{ display: "none" }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file)
                    return;
                  void file.text().then(text => setImportJson(text));
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <Field label="Payload JSON Soal">
            <textarea
              className="mono"
              rows={12}
              value={importJson}
              onChange={e => setImportJson(e.target.value)}
              required
              style={{ fontSize: "12px" }}
            />
          </Field>
          <label className="checkbox" style={{ marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={importPublish}
              onChange={e => setImportPublish(e.target.checked)}
            />
            <span>Langsung publikasikan soal yang lolos validasi</span>
          </label>
          <ErrorNotice error={importError} />
          {importPartialErrors.length > 0 && (
            <Notice tone="error">
              <strong>Detail kegagalan per item:</strong>
              <ul>
                {importPartialErrors.map((err, i) => (
                  <li key={i}>
                    Item #{err.index + 1}{err.code ? ` (${err.code})` : ""}: {err.message}
                  </li>
                ))}
              </ul>
            </Notice>
          )}
          <div className="actions end" style={{ marginTop: 12 }}>
            <button type="button" className="secondary" disabled={importBusy} onClick={closeImportModal}>
              Tutup
            </button>
            <button disabled={importBusy}>
              {importBusy ? "Mengimpor\u2026" : "Impor Sekarang"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
