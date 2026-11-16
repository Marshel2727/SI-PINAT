"use client";

import { ErrorNotice, Field, Modal, Notice, StatusBadge } from "@/components/ui";
import { number, time } from "@/lib/format";
import Link from "next/link";
import { caseStatusKey, useValidation, type ValidationStatusFilter } from "./use-validation";

export function Validation({ initialModel = "" }: {
  initialModel?: string;
}) {
  const {
    models,
    model,
    modelId,
    setModelId,
    specs,
    cases,
    filteredCases,
    boundaryChecklist,
    specFilter,
    setSpecFilter,
    statusFilter,
    setStatusFilter,
    resetFilters,
    edit,
    openModal,
    closeModal,
    busy,
    error,
    modalError,
    message,
    setMessage,
    loading,
    locked,
    save,
    remove,
    seedMissingBoundaryCases,
    validate
  } = useValidation({ initialModel });

  const hasFilters = Boolean(specFilter || statusFilter);

  return (
    <>
      <h1>Skenario Validasi Fuzzy</h1>
      <Notice>
        Ekspektasi ditetapkan dari referensi independen yang telah ditinjau,
        sebelum menjalankan pengujian. Publikasi mensyaratkan 10 pasang koordinat batas/overlap (X1, X2) wajib per peminatan dan seluruh skenario lulus.
      </Notice>

      <Field label="Versi model">
        <select
          value={modelId}
          onChange={e => {
            setModelId(e.target.value);
            setMessage("");
          }}
        >
          <option value="">Pilih versi</option>
          {models.map(m => (
            <option key={m.id} value={m.id}>
              {m.version_code} · {m.status}
            </option>
          ))}
        </select>
      </Field>

      {model && locked && (
        <Notice>
          Model <strong>{model.version_code}</strong> berstatus <strong>{model.status}</strong> (terkunci).
          Penambahan, penyuntingan, penghapusan, atau pengujian ulang skenario hanya tersedia pada model berstatus DRAFT.
        </Notice>
      )}

      <ErrorNotice error={error} />
      {message && <Notice tone="success">{message}</Notice>}

      {modelId && (
        <>
          <div className="actions">
            <button type="button" disabled={locked || busy} onClick={() => openModal({})}>
              + Tambah skenario
            </button>
            <button type="button" disabled={locked || busy} onClick={validate}>
              {busy ? "Menjalankan\u2026" : "Jalankan semua skenario"}
            </button>
            <Link className="button secondary" href={"/admin/model-fuzzy/" + modelId}>
              Konfigurasi model
            </Link>
          </div>

          {boundaryChecklist.length > 0 && (
            <div className="three-columns section">
              {boundaryChecklist.map(({ spec, pairs, missing, presentCount, totalCases, passedCount }) => (
                <article className="card" key={spec.id}>
                  <div className="spread wrap" style={{ marginBottom: 8 }}>
                    <h3 style={{ margin: 0 }}>{spec.name}</h3>
                    <span className="badge mono">{spec.code}</span>
                  </div>
                  <StatusBadge status={missing.length === 0 ? "PUBLISHED" : "DRAFT"}>
                    {presentCount}/10 koordinat wajib
                  </StatusBadge>
                  <p className="small muted" style={{ marginTop: 8, marginBottom: 8 }}>
                    Total skenario: {totalCases} · Lulus: {passedCount}/{totalCases}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                    {pairs.map(p => (
                      <span
                        key={p.index}
                        className={"badge mono " + (p.present ? "success" : "danger")}
                        style={{ fontSize: "10.5px", padding: "2px 6px" }}
                        title={p.present ? `Koordinat (${p.x1}, ${p.x2}) tersedia` : `Koordinat (${p.x1}, ${p.x2}) belum ada`}
                      >
                        {p.present ? "✓" : "×"} ({p.x1},{p.x2})
                      </span>
                    ))}
                  </div>
                  {!locked && missing.length > 0 && (
                    <button
                      type="button"
                      className="secondary compact full"
                      disabled={busy}
                      onClick={() => seedMissingBoundaryCases(spec)}
                    >
                      Isi Template Kasus Batas Hilang ({missing.length})
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}

          <div className="filters">
            <Field label="Filter Peminatan">
              <select
                value={specFilter}
                onChange={e => setSpecFilter(e.target.value)}
              >
                <option value="">Semua peminatan</option>
                {specs.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Filter Status">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as ValidationStatusFilter)}
              >
                <option value="">Semua status</option>
                <option value="LULUS">LULUS</option>
                <option value="GAGAL">GAGAL</option>
                <option value="BELUM_DIUJI">Belum diuji</option>
              </select>
            </Field>
            {hasFilters && (
              <div style={{ alignSelf: "flex-end" }}>
                <button type="button" className="secondary" onClick={resetFilters}>
                  Reset Filter
                </button>
              </div>
            )}
          </div>

          {loading && <Notice>Memuat skenario…</Notice>}
          <article className="card section">
            <div className="spread wrap" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>Daftar Skenario Validasi</h2>
              <span className="small muted">
                Menampilkan {filteredCases.length} dari {cases.length} skenario
              </span>
            </div>
            {!loading && !filteredCases.length ? (
              <Notice>
                {cases.length
                  ? "Tidak ada skenario yang sesuai filter."
                  : "Belum ada skenario pada versi ini."}
              </Notice>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Kasus</th>
                      <th>Peminatan</th>
                      <th>X1 / X2</th>
                      <th>Ekspektasi</th>
                      <th>Aktual</th>
                      <th>Status</th>
                      <th>Terakhir Diuji</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map(c => {
                      const statusKey = caseStatusKey(c);
                      const statusLabel = statusKey === "BELUM_DIUJI" ? "Belum diuji" : statusKey;
                      return (
                        <tr key={c.id}>
                          <td className="mono">
                            <strong>{c.case_code}</strong>
                          </td>
                          <td>
                            {specs.find(s => String(s.id) === String(c.specialization_id))?.name || c.specialization_id}
                          </td>
                          <td className="mono">
                            {number(c.academic_input)} /{" "}
                            {number(c.competency_input)}
                          </td>
                          <td className="mono">
                            {number(c.expected_min, 5)}–
                            {number(c.expected_max, 5)}
                          </td>
                          <td className="mono">
                            {c.last_actual_score === null
                              ? "\u2014"
                              : number(c.last_actual_score, 5)}
                          </td>
                          <td>
                            <StatusBadge status={statusLabel}>
                              {statusLabel}
                            </StatusBadge>
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {time(c.last_tested_at)}
                          </td>
                          <td>
                            <div className="actions" style={{ gap: 6 }}>
                              <button
                                type="button"
                                className="secondary compact"
                                disabled={locked || busy}
                                onClick={() => openModal(c)}
                              >
                                Edit
                              </button>
                              {!locked && (
                                <button
                                  type="button"
                                  className="secondary compact"
                                  style={{ color: "var(--danger)" }}
                                  disabled={busy}
                                  onClick={() => remove(c)}
                                >
                                  Hapus
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
          </article>
        </>
      )}

      <Modal open={!!edit} title={edit?.id ? "Edit skenario validasi" : "Tambah skenario validasi"} onClose={closeModal}>
        {edit && (
          <form key={edit.id || "new"} onSubmit={save}>
            <Field label="Kode kasus">
              <input
                name="case_code"
                defaultValue={edit.case_code}
                required
                maxLength={32}
              />
            </Field>
            <Field label="Peminatan">
              <select name="specialization_id" defaultValue={edit.specialization_id || specs[0]?.id} required>
                {specs.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="two-columns">
              {([
                ["academic_input", "Input akademik X1"],
                ["competency_input", "Input kompetensi X2"],
                ["expected_min", "Ekspektasi minimum"],
                ["expected_max", "Ekspektasi maksimum"]
              ] as const).map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    name={key}
                    type="number"
                    min="0"
                    max="100"
                    step="0.00001"
                    defaultValue={edit[key]}
                    required
                  />
                </Field>
              ))}
            </div>
            <ErrorNotice error={modalError} />
            <div className="actions end" style={{ marginTop: 12 }}>
              <button type="button" className="secondary" disabled={busy} onClick={closeModal}>
                Batal
              </button>
              <button disabled={busy}>
                {busy ? "Menyimpan\u2026" : "Simpan skenario"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
