"use client";

import { ErrorNotice, Field, Notice, Pagination, StatusBadge } from "@/components/ui";
import { time } from "@/lib/format";
import { useAuditLogs } from "./use-audit-logs";

const ENTITY_OPTIONS = [
  ["admin_sessions", "Sesi Admin (admin_sessions)"],
  ["courses", "Mata Kuliah (courses)"],
  ["questions", "Bank Soal (questions)"],
  ["fuzzy_model_versions", "Versi Model Fuzzy (fuzzy_model_versions)"],
  ["fuzzy_validation_cases", "Skenario Validasi (fuzzy_validation_cases)"],
  ["grade_conversions", "Konversi Nilai (grade_conversions)"],
  ["course_weights", "Bobot Mata Kuliah (course_weights)"],
  ["fuzzy_variables", "Variabel Fuzzy (fuzzy_variables)"],
  ["fuzzy_sets", "Himpunan Fuzzy (fuzzy_sets)"],
  ["fuzzy_rules", "Aturan Fuzzy (fuzzy_rules)"]
] as const;

const ACTION_OPTIONS = [
  "LOGIN",
  "LOGOUT",
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
    <>
      <span className="eyebrow">JEJAK AUDIT ADMINISTRATOR</span>
      <h1>Log Aktivitas</h1>
      <p>
        Riwayat perubahan data kurikulum, bank soal, konfigurasi model fuzzy, validasi, dan sesi administrator.
      </p>

      <div className="filters">
        <Field label="Entitas / Tabel">
          <select
            value={entityTable}
            onChange={e => {
              setEntityTable(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua entitas</option>
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
                {act}
              </option>
            ))}
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

      <ErrorNotice error={error} />
      {loading && <Notice>Memuat log aktivitas…</Notice>}

      <article className="card">
        {!loading && !rows.length ? (
          <Notice>Belum ada catatan log aktivitas sesuai filter.</Notice>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Aktor</th>
                  <th>Aksi</th>
                  <th>Entitas &amp; ID</th>
                  <th>Rincian Perubahan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const hasDiff = row.before_data !== null && row.before_data !== undefined
                    || row.after_data !== null && row.after_data !== undefined;
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
                          {row.action}
                        </StatusBadge>
                      </td>
                      <td className="mono">
                        {row.entity_table}
                        {row.entity_id ? ` #${row.entity_id}` : ""}
                      </td>
                      <td style={{ minWidth: 260 }}>
                        {hasDiff ? (
                          <details>
                            <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                              Lihat before / after JSON
                            </summary>
                            <div className="two-columns" style={{ gap: 10, marginTop: 8 }}>
                              <div>
                                <small className="muted block"><strong>Sebelum (before_data)</strong></small>
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
                                <small className="muted block"><strong>Sesudah (after_data)</strong></small>
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
    </>
  );
}
