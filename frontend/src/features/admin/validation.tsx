"use client";

import { ErrorNotice, Field, Modal, Notice, StatusBadge, statusLabel } from "@/components/ui";
import { number, time } from "@/lib/format";
import { evaluateMamdaniScore } from "@/lib/fuzzy-curve";
import type { FuzzyModel, Specialization, ValidationEditorState } from "@/types/api";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { caseStatusKey, useValidation, type ValidationStatusFilter } from "./use-validation";

function ValidationCaseForm({
  edit,
  specs,
  fullModel,
  busy,
  modalError,
  onSubmit,
  onCancel,
}: {
  edit: ValidationEditorState;
  specs: Specialization[];
  fullModel: FuzzyModel | null;
  busy: boolean;
  modalError: unknown;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const [caseCode, setCaseCode] = useState(edit.case_code ?? "");
  const [specId, setSpecId] = useState(String(edit.specialization_id ?? specs[0]?.id ?? ""));
  const [academicInput, setAcademicInput] = useState(
    edit.academic_input !== undefined && edit.academic_input !== null ? String(edit.academic_input) : ""
  );
  const [competencyInput, setCompetencyInput] = useState(
    edit.competency_input !== undefined && edit.competency_input !== null ? String(edit.competency_input) : ""
  );
  const [expectedMin, setExpectedMin] = useState(
    edit.expected_min !== undefined && edit.expected_min !== null ? String(edit.expected_min) : ""
  );
  const [expectedMax, setExpectedMax] = useState(
    edit.expected_max !== undefined && edit.expected_max !== null ? String(edit.expected_max) : ""
  );

  useEffect(() => {
    setCaseCode(edit.case_code ?? "");
    setSpecId(String(edit.specialization_id ?? specs[0]?.id ?? ""));
    setAcademicInput(edit.academic_input !== undefined && edit.academic_input !== null ? String(edit.academic_input) : "");
    setCompetencyInput(edit.competency_input !== undefined && edit.competency_input !== null ? String(edit.competency_input) : "");
    setExpectedMin(edit.expected_min !== undefined && edit.expected_min !== null ? String(edit.expected_min) : "");
    setExpectedMax(edit.expected_max !== undefined && edit.expected_max !== null ? String(edit.expected_max) : "");
  }, [edit, specs]);

  const previewScore = useMemo(() => {
    if (!fullModel || !specId || academicInput.trim() === "" || competencyInput.trim() === "") {
      return null;
    }
    return evaluateMamdaniScore(Number(academicInput), Number(competencyInput), fullModel, specId);
  }, [fullModel, specId, academicInput, competencyInput]);

  function applyPreviewTolerance(tolerance: number) {
    if (previewScore === null) return;
    setExpectedMin(String(Number(Math.max(0, previewScore - tolerance).toFixed(5))));
    setExpectedMax(String(Number(Math.min(100, previewScore + tolerance).toFixed(5))));
  }

  return (
    <form onSubmit={onSubmit}>
      <Field label="Kode kasus">
        <input
          name="case_code"
          value={caseCode}
          onChange={e => setCaseCode(e.target.value)}
          autoCorrect="off"
          spellCheck={false}
          required
          maxLength={32}
        />
      </Field>
      <Field label="Peminatan">
        <select
          name="specialization_id"
          value={specId}
          onChange={e => setSpecId(e.target.value)}
          required
        >
          {specs.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="two-columns">
        <Field label="Input akademik X1">
          <input
            name="academic_input"
            type="number"
            min="0"
            max="100"
            step="0.00001"
            value={academicInput}
            onChange={e => setAcademicInput(e.target.value)}
            required
          />
        </Field>
        <Field label="Input kompetensi X2">
          <input
            name="competency_input"
            type="number"
            min="0"
            max="100"
            step="0.00001"
            value={competencyInput}
            onChange={e => setCompetencyInput(e.target.value)}
            required
          />
        </Field>
      </div>
      <div className="score-preview-box">
        <div className="spread wrap">
          <span className="small">
            <strong>Pratinjau skor model Mamdani</strong>
            {previewScore !== null
              ? ` untuk (${academicInput}, ${competencyInput})`
              : ""}
          </span>
          {previewScore !== null ? (
            <strong className="mono">{number(previewScore, 5)}</strong>
          ) : (
            <span className="small muted">Skor belum tersedia</span>
          )}
        </div>
        {previewScore === null ? (
          <p className="small muted" style={{ margin: 0 }}>
            Isi X1 dan X2 dalam rentang 0–100 serta pastikan variabel, himpunan, dan aturan model sudah lengkap.
          </p>
        ) : (
          <div className="actions">
            <button
              type="button"
              className="secondary compact"
              disabled={busy}
              onClick={() => applyPreviewTolerance(0.5)}
            >
              Gunakan Skor Model (±0,5)
            </button>
            <button
              type="button"
              className="secondary compact"
              disabled={busy}
              onClick={() => applyPreviewTolerance(0.05)}
            >
              Presisi Ketat (±0,05)
            </button>
          </div>
        )}
      </div>
      <div className="two-columns">
        <Field label="Ekspektasi minimum">
          <input
            name="expected_min"
            type="number"
            min="0"
            max="100"
            step="0.00001"
            value={expectedMin}
            onChange={e => setExpectedMin(e.target.value)}
            required
          />
        </Field>
        <Field label="Ekspektasi maksimum">
          <input
            name="expected_max"
            type="number"
            min="0"
            max="100"
            step="0.00001"
            value={expectedMax}
            onChange={e => setExpectedMax(e.target.value)}
            required
          />
        </Field>
      </div>
      <ErrorNotice error={modalError} />
      <div className="actions end" style={{ marginTop: 12 }}>
        <button type="button" className="secondary" disabled={busy} onClick={onCancel}>
          Batal
        </button>
        <button disabled={busy}>
          {busy ? "Menyimpan\u2026" : "Simpan skenario"}
        </button>
      </div>
    </form>
  );
}

export function Validation({ initialModel = "" }: {
  initialModel?: string;
}) {
  const {
    models,
    model,
    fullModel,
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
    seedAndRunAllBoundaryCases,
    validate
  } = useValidation({ initialModel });

  const hasFilters = Boolean(specFilter || statusFilter);

  return (
    <>
      <h1>Skenario Validasi Fuzzy</h1>
      <Notice>
        Publikasi model mensyaratkan 10 skenario batas/overlap per peminatan dan seluruh skenario berstatus lulus.
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
              {m.version_code} · {statusLabel(m.status)}
            </option>
          ))}
        </select>
      </Field>

      {model && locked && (
        <Notice>
          Model <strong>{model.version_code}</strong> berstatus <strong>{statusLabel(model.status)}</strong> (terkunci).
          Penambahan, penyuntingan, penghapusan, atau pengujian ulang skenario hanya tersedia pada model berstatus Draf.
        </Notice>
      )}

      <ErrorNotice error={error} />
      {message && <Notice tone="success">{message}</Notice>}

      {modelId && (
        <>
          <div className="actions">
            <button type="button" disabled={locked || busy} onClick={seedAndRunAllBoundaryCases}>
              {busy ? "Memproses\u2026" : "⚡ Siapkan 30 Kasus Batas & Uji Otomatis"}
            </button>
            <button type="button" className="secondary" disabled={locked || busy} onClick={() => openModal({})}>
              + Tambah skenario
            </button>
            <button type="button" className="secondary" disabled={locked || busy} onClick={validate}>
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
              <div className="table-scroll" tabIndex={0} role="region" aria-label="Daftar skenario validasi">
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

      <Modal open={!!edit} title={edit?.id ? "Edit skenario validasi" : "Tambah skenario validasi"} dismissible={!busy} onClose={closeModal}>
        {edit && (
          <ValidationCaseForm
            key={edit.id ? String(edit.id) : "new"}
            edit={edit}
            specs={specs}
            fullModel={fullModel}
            busy={busy}
            modalError={modalError}
            onSubmit={save}
            onCancel={closeModal}
          />
        )}
      </Modal>
    </>
  );
}
