"use client";

import { useEffect, useMemo, useState } from "react";
import { ErrorNotice, Field, MembershipPlot, Notice } from "@/components/ui";
import { membershipAt, validMembershipShape, type MembershipShape } from "@/lib/fuzzy-curve";
import { configurationPayload, type Column, type ConfigRow } from "./configuration";

const setOrder: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
const matrixLabels = ["LOW", "MEDIUM", "HIGH"] as const;

function toPoint(value: ConfigRow[string]): number {
  return value === "" || value === null || value === undefined ? NaN : Number(value);
}

function findCoverageGaps(sets: MembershipShape[]): string[] {
  const validSets = sets.filter(validMembershipShape);
  if (!validSets.length)
    return [];
  const knots = new Set<number>([0, 100]);
  for (const s of validSets) {
    knots.add(s.point_a);
    knots.add(s.point_b);
    knots.add(s.point_c);
    if (s.point_d !== null)
      knots.add(s.point_d);
  }
  for (let x = 0; x <= 100; x++)
    knots.add(x);
  const sorted = [...knots].filter(x => x >= 0 && x <= 100).sort((a, b) => a - b);
  const gapRanges: string[] = [];
  let gapStart: number | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const x = sorted[i];
    const maxAtX = Math.max(...validSets.map(s => membershipAt(x, s)));
    if (maxAtX <= 0) {
      if (gapStart === null)
        gapStart = x;
    }
    else if (gapStart !== null) {
      const end = sorted[i - 1];
      gapRanges.push(gapStart === end ? String(gapStart) : `${gapStart}–${end}`);
      gapStart = null;
    }

    if (i < sorted.length - 1) {
      const mid = (x + sorted[i + 1]) / 2;
      const maxAtMid = Math.max(...validSets.map(s => membershipAt(mid, s)));
      if (maxAtMid <= 0) {
        if (gapStart === null)
          gapStart = x;
      }
      else if (gapStart !== null) {
        gapRanges.push(gapStart === x ? String(gapStart) : `${gapStart}–${x}`);
        gapStart = null;
      }
    }
  }
  if (gapStart !== null) {
    gapRanges.push(gapStart === 100 ? "100" : `${gapStart}–100`);
  }
  return gapRanges;
}

/** Mengelompokkan baris himpunan per variabel agar kurva LOW/MEDIUM/HIGH tampil dalam satu grafik. */
function groupSetsByVariable(rows: ConfigRow[], columns: Column[]) {
  const options = columns.find(column => column.key === "variable_id")?.options || [];
  const groups = new Map<string, { key: string; label: string; sets: MembershipShape[]; }>();
  for (const row of rows) {
    const key = String(row.variable_id ?? "");
    const name = options.find(option => String(option.id) === key)?.name || "Variabel belum dipilih";
    const group = groups.get(key) || { key: key || "none", label: "Variabel " + name, sets: [] };
    group.sets.push({
      code: String(row.code) as MembershipShape["code"],
      shape: String(row.shape) as MembershipShape["shape"],
      point_a: toPoint(row.point_a),
      point_b: toPoint(row.point_b),
      point_c: toPoint(row.point_c),
      point_d: row.point_d === null || row.point_d === "" || row.point_d === undefined ? null : Number(row.point_d)
    });
    groups.set(key, group);
  }
  for (const group of groups.values())
    group.sets.sort((a, b) => (setOrder[a.code] ?? 9) - (setOrder[b.code] ?? 9));
  return [...groups.values()];
}

export function ConfigTable({
  title,
  section,
  columns,
  values,
  locked,
  onSave,
  saveError,
  busy,
  onDirtyChange
}: {
  title: string;
  section?: string;
  columns: Column[];
  values: ConfigRow[];
  locked: boolean;
  onSave: (values: ConfigRow[]) => Promise<void>;
  saveError?: unknown;
  busy: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [local, setLocal] = useState<ConfigRow[]>(values);
  const [specFilter, setSpecFilter] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [showMatrix, setShowMatrix] = useState(true);
  const [matrixSpecId, setMatrixSpecId] = useState("");

  useEffect(() => setLocal(values), [values]);
  const dirty = JSON.stringify(configurationPayload(local, columns)) !== JSON.stringify(configurationPayload(values, columns));
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const isSetEditor = section === "sets" || columns.some(column => column.key === "point_a");
  const isCourseWeights = section === "course-weights" || columns.some(column => column.key === "course_id");
  const isRules = section === "rules" || columns.some(column => column.key === "academic_set_id");
  const specOptions = useMemo(
    () => columns.find(column => column.key === "specialization_id")?.options || [],
    [columns]
  );

  useEffect(() => {
    if (isRules && specOptions.length && !matrixSpecId) {
      setMatrixSpecId(String(specOptions[0].id));
    }
  }, [isRules, specOptions, matrixSpecId]);

  const courseNameById = useMemo(() => {
    const map = new Map<string, string>();
    const options = columns.find(column => column.key === "course_id")?.options || [];
    for (const opt of options)
      map.set(String(opt.id), opt.name);
    return map;
  }, [columns]);

  const visibleEntries = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    return local
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => {
        if (specFilter && String(row.specialization_id ?? "") !== specFilter)
          return false;
        if (isCourseWeights && q) {
          const name = courseNameById.get(String(row.course_id ?? ""))?.toLowerCase() || "";
          if (!name.includes(q))
            return false;
        }
        return true;
      });
  }, [local, specFilter, isCourseWeights, courseSearch, courseNameById]);

  const activeMatrixSpecId = specFilter || matrixSpecId || String(specOptions[0]?.id ?? "");

  const ruleSetMaps = useMemo(() => {
    const toMap = (key: string) => {
      const m = new Map<string, string>();
      const opts = columns.find(c => c.key === key)?.options || [];
      for (const opt of opts)
        m.set(String(opt.id), opt.name);
      return m;
    };
    return {
      academic: toMap("academic_set_id"),
      competency: toMap("competency_set_id"),
      output: toMap("output_set_id")
    };
  }, [columns]);

  function update(index: number, key: string, value: ConfigRow[string]) {
    setLocal(rows => rows.map((r, i) => {
      if (i !== index)
        return r;
      const next = { ...r, [key]: value };
      if (isSetEditor && key === "shape" && value === "TRIANGLE") {
        next.point_d = null;
      }
      return next;
    }));
  }

  function addRow() {
    const row: ConfigRow = {};
    for (const c of columns) {
      if (c.key === "specialization_id" && specFilter) {
        row[c.key] = specFilter;
      }
      else {
        row[c.key] =
          c.type === "boolean"
            ? false
            : c.nullable
              ? null
              : c.options?.[0]?.id ?? (c.type === "number" ? c.min ?? 0 : "");
      }
    }
    setLocal([...local, row]);
  }

  function payload() {
    return configurationPayload(local, columns);
  }

  const hasFilters = Boolean(specOptions.length && (isCourseWeights || isRules));

  return (
    <article className="card section">
      <div className="spread wrap">
        <h2>
          {title}{dirty && <span className="small muted"> * Belum disimpan</span>}
        </h2>
        {hasFilters && (
          <span className="small muted">
            Menampilkan {visibleEntries.length} dari {local.length} baris
          </span>
        )}
      </div>

      {isRules && specOptions.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="spread wrap" style={{ marginBottom: 8 }}>
            <div className="tabs wrap" style={{ margin: 0 }}>
              <button
                type="button"
                className={specFilter === "" ? "" : "secondary"}
                onClick={() => setSpecFilter("")}
              >
                Semua Peminatan ({local.length})
              </button>
              {specOptions.map(opt => {
                const count = local.filter(r => String(r.specialization_id ?? "") === String(opt.id)).length;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={specFilter === String(opt.id) ? "" : "secondary"}
                    onClick={() => {
                      setSpecFilter(String(opt.id));
                      setMatrixSpecId(String(opt.id));
                    }}
                  >
                    {opt.name} ({count})
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="secondary compact"
              onClick={() => setShowMatrix(v => !v)}
            >
              {showMatrix ? "Sembunyikan Matriks 3×3" : "Tampilkan Matriks 3×3"}
            </button>
          </div>

          {showMatrix && activeMatrixSpecId && (
            <div style={{ padding: 14, borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="spread wrap" style={{ marginBottom: 10 }}>
                <strong>
                  Ikhtisar Matriks 3×3 — {specOptions.find(s => String(s.id) === activeMatrixSpecId)?.name || "Peminatan"}
                </strong>
                {specFilter === "" && (
                  <select
                    aria-label="Pilih peminatan untuk matriks"
                    value={activeMatrixSpecId}
                    onChange={e => setMatrixSpecId(e.target.value)}
                    style={{ width: "auto", minHeight: 34, padding: "4px 10px" }}
                  >
                    {specOptions.map(opt => (
                      <option key={opt.id} value={String(opt.id)}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="table-scroll" style={{ margin: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Akademik \ Kompetensi</th>
                      {matrixLabels.map(col => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixLabels.map(acad => (
                      <tr key={acad}>
                        <td><strong>{acad}</strong></td>
                        {matrixLabels.map(comp => {
                          const matches = local.filter(r =>
                            String(r.specialization_id ?? "") === activeMatrixSpecId
                            && ruleSetMaps.academic.get(String(r.academic_set_id ?? "")) === acad
                            && ruleSetMaps.competency.get(String(r.competency_set_id ?? "")) === comp
                          );
                          if (matches.length === 0) {
                            return (
                              <td key={comp}>
                                <span className="badge danger">Belum ada</span>
                              </td>
                            );
                          }
                          if (matches.length > 1) {
                            return (
                              <td key={comp}>
                                <span className="badge warning">Duplikat ({matches.length})</span>
                              </td>
                            );
                          }
                          const match = matches[0];
                          const out = ruleSetMaps.output.get(String(match.output_set_id ?? "")) || "—";
                          const positive = Number(match.rule_weight) > 0;
                          return (
                            <td key={comp}>
                              <span className={"badge " + (positive ? "success" : "warning")}>
                                {String(match.rule_code || "?")} → {out}
                              </span>
                              <small className="block muted">
                                {String(match.operator || "AND")} · w={String(match.rule_weight ?? 0)}
                              </small>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {isCourseWeights && (
        <div className="filters">
          <Field label="Filter Peminatan">
            <select
              value={specFilter}
              onChange={e => setSpecFilter(e.target.value)}
            >
              <option value="">Semua peminatan ({local.length})</option>
              {specOptions.map(opt => (
                <option key={opt.id} value={String(opt.id)}>
                  {opt.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cari Mata Kuliah">
            <input
              value={courseSearch}
              placeholder="Ketik kode atau nama mata kuliah…"
              onChange={e => setCourseSearch(e.target.value)}
            />
          </Field>
        </div>
      )}

      <form onSubmit={e => {
        e.preventDefault();
        onSave(payload());
      }}>
        <fieldset disabled={locked || busy}>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  {columns.map(c => (
                    <th key={c.key}>
                      {c.label}
                    </th>
                  ))}
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleEntries.map(({ row: r, index: i }) => {
                  const deleteLocked = !!r.id && columns.some(c => c.key === "variable_id" || c.key === "direction");
                  return (
                    <tr key={r.id || "new-" + i}>
                      <td className="mono muted">
                        {i + 1}
                      </td>
                      {columns.map(c => {
                        const isTrianglePointD = isSetEditor && c.key === "point_d" && r.shape === "TRIANGLE";
                        return (
                          <td key={c.key}>
                            {c.type === "boolean" ? (
                              <input
                                aria-label={c.label + " baris " + (i + 1)}
                                type="checkbox"
                                checked={!!r[c.key]}
                                onChange={e => update(i, c.key, e.target.checked)}
                              />
                            ) : c.options ? (
                              <select
                                aria-label={c.label + " baris " + (i + 1)}
                                value={String(r[c.key] ?? "")}
                                required
                                onChange={e => update(i, c.key, e.target.value)}
                              >
                                {c.options.map(o => (
                                  <option key={o.id} value={o.id}>
                                    {o.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                aria-label={c.label + " baris " + (i + 1)}
                                type={c.type || "text"}
                                value={isTrianglePointD ? "" : String(r[c.key] ?? "")}
                                placeholder={isTrianglePointD ? "—" : undefined}
                                disabled={isTrianglePointD}
                                min={c.min}
                                max={c.max}
                                step={c.step || "any"}
                                required={!c.nullable && !isTrianglePointD}
                                onChange={e => update(i, c.key, e.target.value)}
                              />
                            )}
                          </td>
                        );
                      })}
                      <td>
                        <button
                          type="button"
                          className="secondary compact"
                          disabled={deleteLocked}
                          title={deleteLocked
                            ? "Variabel dan himpunan yang sudah tersimpan tidak dapat dihapus langsung agar referensi aturan tetap konsisten."
                            : "Hapus baris ini dari draf"}
                          onClick={() => {
                            if (window.confirm("Hapus baris ini dari draf? Perubahan berlaku setelah konfigurasi disimpan.")) {
                              setLocal(rows => rows.filter((_, index) => index !== i));
                            }
                          }}
                        >
                          Hapus baris
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!local.length && <p>Konfigurasi belum diisi.</p>}
          {local.length > 0 && !visibleEntries.length && (
            <Notice>Tidak ada baris yang sesuai dengan filter.</Notice>
          )}
          <ErrorNotice error={saveError} />
          <div className="actions">
            <button type="button" className="secondary" onClick={addRow}>
              + Baris
            </button>
            <button disabled={busy}>
              {busy ? "Menyimpan\u2026" : "Simpan " + title.toLowerCase()}
            </button>
          </div>
        </fieldset>
      </form>
      {isSetEditor && (
        <section className="section">
          <h3>Pratinjau fungsi keanggotaan</h3>
          <p className="small muted">
            Satu grafik per variabel memperlihatkan irisan LOW, MEDIUM, dan HIGH dari titik yang sedang diedit. Simpan konfigurasi untuk menerapkannya pada model.
          </p>
          <div className="stack">
            {groupSetsByVariable(local, columns).map(group => {
              const gaps = findCoverageGaps(group.sets);
              const missingCodes = matrixLabels.filter(code => !group.sets.some(s => s.code === code));
              return (
                <div key={group.key}>
                  <MembershipPlot sets={group.sets} label={group.label} />
                  {missingCodes.length > 0 && (
                    <Notice tone="error">
                      <strong>{group.label}:</strong> himpunan wajib belum lengkap ({missingCodes.join(", ")} belum ada).
                    </Notice>
                  )}
                  {gaps.length > 0 && (
                    <Notice tone="error">
                      <strong>Celah cakupan pada {group.label}:</strong> derajat keanggotaan max(μ) = 0 pada skor {gaps.join(", ")}. Pastikan kurva LOW, MEDIUM, dan HIGH saling beririsan menutup 0–100.
                    </Notice>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </article>
  );
}
