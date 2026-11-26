"use client";

import { ErrorNotice, Field, Notice, Pagination, StatusBadge } from "@/components/ui";
import { time } from "@/lib/format";
import { useAuditLogs } from "./use-audit-logs";

const ENTITY_LABELS: Record<string, string> = {
  admin_sessions: "Sesi Admin",
  admin_users: "Akun Administrator",
  courses: "Mata Kuliah",
  questions: "Bank Soal",
  fuzzy_model_versions: "Versi Model Fuzzy",
  fuzzy_validation_cases: "Skenario Validasi",
  grade_conversions: "Konversi Nilai",
  course_weights: "Bobot Mata Kuliah",
  fuzzy_variables: "Variabel Fuzzy",
  fuzzy_sets: "Himpunan Fuzzy",
  fuzzy_rules: "Aturan Fuzzy",
  assessments: "Asesmen Mahasiswa"
};

const ENTITY_OPTIONS = [
  ["admin_sessions", "Sesi Admin"],
  ["admin_users", "Akun Administrator"],
  ["courses", "Mata Kuliah"],
  ["questions", "Bank Soal"],
  ["fuzzy_model_versions", "Versi Model Fuzzy"],
  ["fuzzy_validation_cases", "Skenario Validasi"],
  ["grade_conversions", "Konversi Nilai"],
  ["course_weights", "Bobot Mata Kuliah"],
  ["fuzzy_variables", "Variabel Fuzzy"],
  ["fuzzy_sets", "Himpunan Fuzzy"],
  ["fuzzy_rules", "Aturan Fuzzy"]
] as const;

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Masuk Admin",
  LOGOUT: "Keluar Admin",
  CHANGE_PASSWORD: "Ubah Kata Sandi",
  REVOKE_OTHER_SESSIONS: "Akhiri Sesi Lain",
  CREATE: "Tambah Data",
  UPDATE: "Perbarui Data",
  SAVE: "Simpan",
  DELETE: "Hapus Data",
  PUBLISH: "Publikasikan",
  PUBLISHED: "Publikasikan",
  ARCHIVED: "Arsipkan",
  CLONE: "Kloning Model",
  VALIDATE: "Uji Validasi",
  UPDATE_CONFIG: "Perbarui Konfigurasi",
  SCAFFOLD_DEFAULTS: "Muat Kerangka Awal",
  SYNC_UNM_GRADES: "Lengkapi Skala Nilai UNM",
  SEED_BOUNDARY_CASES: "Siapkan Skenario Otomatis",
  UPDATE_OPTIONS: "Perbarui Opsi",
  SEED_FUZZY_MODEL: "Inisialisasi Model Fuzzy",
  SEED_DEMO: "Inisialisasi Data Simulasi"
};

const ACTION_OPTIONS = [
  "LOGIN",
  "LOGOUT",
  "CHANGE_PASSWORD",
  "REVOKE_OTHER_SESSIONS",
  "CREATE",
  "UPDATE",
  "SAVE",
  "DELETE",
  "PUBLISHED",
  "ARCHIVED",
  "PUBLISH",
  "CLONE",
  "VALIDATE",
  "UPDATE_CONFIG",
  "SCAFFOLD_DEFAULTS",
  "SYNC_UNM_GRADES",
  "SEED_BOUNDARY_CASES",
  "UPDATE_OPTIONS",
  "SEED_FUZZY_MODEL",
  "SEED_DEMO"
] as const;

function badgeStatusForAction(action: string): string {
  if (action === "DELETE")
    return "FAILED";
  if (action === "PUBLISH" || action === "PUBLISHED")
    return "PUBLISHED";
  return action;
}

function formatJson(value: unknown): string {
  if (value === null || value === undefined)
    return "null";
  try {
    return JSON.stringify(value, null, 2);
  }
  catch {
    return String(value);
  }
}

export function AuditLogs() {
  const {
    rows,
    entityTable,
    setEntityTable,
    action,
    setAction,
    page,
    setPage,
    pages,
    total,
    loading,
    error,
    resetFilters
  } = useAuditLogs();

  const hasFilters = Boolean(entityTable || action);

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-page-title">
          <h1>Log Aktivitas</h1>
          <span className="admin-count-pill">{total}</span>
        </div>
      </header>

      <ErrorNotice error={error} />

      <article className="card admin-table-card">
        <div className="admin-table-toolbar">
          <Field label="Modul">
            <select
              value={entityTable}
              onChange={e => {
                setEntityTable(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua modul</option>
              {ENTITY_OPTIONS.map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Aksi">
            <select
              value={action}
              onChange={e => {
                setAction(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua aksi</option>
              {ACTION_OPTIONS.map(act => (
                <option key={act} value={act}>
                  {ACTION_LABELS[act] ?? act}
                </option>
              ))}
            </select>
          </Field>
          {hasFilters && (
            <button type="button" className="secondary compact" onClick={resetFilters}>
              Reset
            </button>
          )}
        </div>

        {loading && <Notice>Memuat log aktivitas…</Notice>}

        {!loading && !rows.length ? (
          <Notice>Belum ada catatan log aktivitas sesuai filter.</Notice>
        ) : (
          <div className="table-scroll" role="region" tabIndex={0} aria-label="Tabel log aktivitas">
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Aktor</th>
                  <th>Aksi</th>
                  <th>Modul &amp; ID</th>
                  <th>Rincian Perubahan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const hasDiff = row.before_data !== null && row.before_data !== undefined
                    || row.after_data !== null && row.after_data !== undefined;
                  const actionLabel = ACTION_LABELS[row.action] || row.action;
                  const entityLabel = ENTITY_LABELS[row.entity_table] || row.entity_table;
                  return (
                    <tr key={row.id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {time(row.created_at)}
                      </td>
                      <td>
                        <strong>{row.admin_name || "Administrator"}</strong>
                        <small className="block muted">
                          {row.admin_email || (row.admin_id ? `Admin #${row.admin_id}` : "\u2014")}
                        </small>
                      </td>
                      <td>
                        <StatusBadge status={badgeStatusForAction(row.action)}>
                          {actionLabel}
                        </StatusBadge>
                      </td>
                      <td>
                        <strong>{entityLabel}</strong>
                        {row.entity_id ? ` #${row.entity_id}` : ""}
                      </td>
                      <td style={{ minWidth: 260 }}>
                        {hasDiff ? (
                          <details>
                            <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                              Lihat rincian
                            </summary>
                            <div className="two-columns" style={{ gap: 10, marginTop: 8 }}>
                              <div>
                                <small className="muted block"><strong>Sebelum</strong></small>
                                <pre
                                  className="mono"
                                  style={{
                                    margin: "4px 0 0",
                                    padding: 8,
                                    borderRadius: 6,
                                    background: "var(--surface)",
                                    maxHeight: 220,
                                    overflow: "auto",
                                    fontSize: "11px"
                                  }}
                                >
                                  {formatJson(row.before_data)}
                                </pre>
                              </div>
                              <div>
                                <small className="muted block"><strong>Sesudah</strong></small>
                                <pre
                                  className="mono"
                                  style={{
                                    margin: "4px 0 0",
                                    padding: 8,
                                    borderRadius: 6,
                                    background: "var(--surface)",
                                    maxHeight: 220,
                                    overflow: "auto",
                                    fontSize: "11px"
                                  }}
                                >
                                  {formatJson(row.after_data)}
                                </pre>
                              </div>
                            </div>
                          </details>
                        ) : (
                          <span className="small muted">{"\u2014"}</span>
                        )}
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
    </div>
  );
}
