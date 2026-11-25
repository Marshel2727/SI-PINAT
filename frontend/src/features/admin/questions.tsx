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
    <>
      <div className="spread wrap" style={{ marginBottom: 12 }}>
        <div>
          <h1>Bank Soal Kompetensi</h1>
          <p className="small muted">
            Kelola dan publikasikan butir soal perwakilan untuk asesmen mahasiswa Teknik Komputer.
          </p>
        </div>
        <div className="actions">
          {totalDraftCount > 0 && (
            <button
              type="button"
              className="secondary"
              disabled={bulkBusy || busyId !== null}
              onClick={publishAllDrafts}
              title="Publikasikan seluruh butir draf revisi terbaru di bank soal sekaligus"
            >
              {bulkBusy ? "Memproses publikasi massal\u2026" : `⚡ Publikasikan Semua Draf (${totalDraftCount})`}
            </button>
          )}
          <button
            type="button"
            className="secondary"
            disabled={bulkBusy}
            onClick={openImportModal}
          >
            Impor Soal Massal (JSON)
          </button>
          <Link className="button" href="/admin/bank-soal/baru">
            + Tambah Soal
          </Link>
        </div>
      </div>

      <div className="three-columns">
        {summary.map(item => {
          const specId = String(item.specialization_id);
          const isSelected = specialization === specId;
          return (
            <article
              key={item.code}
              className={"card selectable" + (isSelected ? " selected" : "")}
              onClick={() => toggleSpecFilter(specId)}
            >
              <div className="spread" style={{ marginBottom: 6 }}>
                <h3 style={{ margin: 0 }}>{item.name}</h3>
                <span className="badge mono">{item.code}</span>
              </div>
              <StatusBadge status={item.ready ? "PUBLISHED" : "DRAFT"}>
                {item.published_count} / {item.required_count} soal terpublikasi
              </StatusBadge>
              <p className="small muted" style={{ marginTop: 8, marginBottom: 10 }}>
                {item.ready
                  ? "✓ Kuota publikasi terpenuhi."
                  : `Masih memerlukan ${item.required_count - item.published_count} kode soal terpublikasi.`}
              </p>
              <button
                type="button"
                className="secondary compact"
                aria-pressed={isSelected}
                onClick={e => {
                  e.stopPropagation();
                  toggleSpecFilter(specId);
                }}
              >
                {isSelected ? "✓ Filter Aktif (Klik untuk Batal)" : "Filter Peminatan Ini"}
              </button>
            </article>
          );
        })}
      </div>
      <Notice>
        Paket tes mahasiswa mengambil <strong>10 kode soal terpublikasi pertama berdasarkan urutan abjad (A–Z)</strong> per peminatan.
        Klik kartu kuota di atas untuk memfilter daftar soal berdasarkan peminatan.
      </Notice>

      <div className="filters">
        <Field label="Cari kode atau pertanyaan">
          <input
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

      <ErrorNotice error={error} />
      {message && <Notice tone="success">{message}</Notice>}
      {loading && <Notice>Memuat bank soal…</Notice>}

      <article className="card">
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
                  <th style={{ minWidth: 260 }}>Aksi Cepat</th>
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
                        <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
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
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                          {(r.status === "DRAFT" || (r.status === "ARCHIVED" && latest)) && (
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
                          {r.status === "ARCHIVED" && !latest && (
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
                          {r.status === "DRAFT" && (
                            <button
                              type="button"
                              className="secondary compact"
                              style={{
                                minHeight: 30,
                                padding: "4px 10px",
                                fontSize: "11.5px",
                                color: "var(--danger)"
                              }}
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

      <Modal open={importOpen} title="Impor Soal Massal (JSON)" dismissible={!importBusy} onClose={closeImportModal}>
        <form onSubmit={submitImport}>
          <p className="small muted">
            Unggah atau tempel payload JSON berisi 1–100 butir soal (<code>{`{ "questions": [...] }`}</code> atau array <code>[...]</code>).
            Gunakan <code>specialization_code</code> (misal <code>ES-01</code>, <code>SC-02</code>, <code>JDF-03</code>) atau <code>specialization_id</code>.
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
    </>
  );
}
