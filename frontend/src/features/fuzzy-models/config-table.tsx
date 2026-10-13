"use client";

import { useEffect, useState } from "react";
import { MembershipPlot } from "@/components/ui";
import type { MembershipShape } from "@/lib/fuzzy-curve";
import { configurationPayload, type Column, type ConfigRow } from "./configuration";

export function ConfigTable({ title, columns, values, locked, onSave, busy, onDirtyChange }: {
  title: string;
  columns: Column[];
  values: ConfigRow[];
  locked: boolean;
  onSave: (values: ConfigRow[]) => Promise<void>;
  busy: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [local, setLocal] = useState<ConfigRow[]>(values);
  useEffect(() => setLocal(values), [values]);
  const dirty = JSON.stringify(configurationPayload(local, columns)) !== JSON.stringify(configurationPayload(values, columns));
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  const isSetEditor = columns.some(column => column.key === "point_a");
  function update(index: number, key: string, value: ConfigRow[string]) {
    setLocal(rows => rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }
  function addRow() {
    const row: ConfigRow = {};
    for (const c of columns)
      row[c.key] =
        c.type === "boolean"
          ? false
          : c.nullable
            ? null
            : c.options?.[0]?.id ?? (c.type === "number" ? c.min ?? 0 : "");
    setLocal([...local, row]);
  }
  function payload() {
    return configurationPayload(local, columns);
  }
  return (
    <article className="card section">
      <h2>
        {title}{dirty && <span className="small muted"> * Belum disimpan</span>}
      </h2>
      <form onSubmit={e => {
        e.preventDefault();
        onSave(payload());
      }}>
        <fieldset disabled={locked || busy}>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {columns.map(c => (
                    <th key={c.key}>
                      {c.label}
                    </th>
                  ))}
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {local.map((r, i) => (
                  <tr key={r.id || "new-" + i}>
                    {columns.map(c => (
                      <td key={c.key}>
                        {c.type === "boolean" ? (<input
                          aria-label={c.label + " baris " + (i + 1)}
                          type="checkbox"
                          checked={!!r[c.key]}
                          onChange={e => update(i, c.key, e.target.checked)}
                        />) : c.options ? (
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
                        ) : (<input
                          aria-label={c.label + " baris " + (i + 1)}
                          type={c.type || "text"}
                          value={String(r[c.key] ?? "")}
                          min={c.min}
                          max={c.max}
                          step={c.step || "any"}
                          required={!c.nullable}
                          onChange={e => update(i, c.key, e.target.value)}
                        />)}
                      </td>
                    ))}
                    <td>
                      <button
                        type="button"
                        className="secondary compact"
                        disabled={!!r.id &&
                          columns.some(c => c.key === "variable_id" || c.key === "direction")}
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
                ))}
              </tbody>
            </table>
          </div>
          {!local.length && <p>Konfigurasi belum diisi.</p>}
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
      {isSetEditor && <section className="section">
        <h3>Pratinjau fungsi keanggotaan</h3>
        <p className="small muted">Kurva mengikuti titik yang sedang diedit. Simpan konfigurasi untuk menerapkannya pada model.</p>
        <div className="two-columns">
          {local.map((row, index) => {
            const set: MembershipShape = {
              code: String(row.code) as MembershipShape["code"],
              shape: String(row.shape) as MembershipShape["shape"],
              point_a: row.point_a === "" ? NaN : Number(row.point_a),
              point_b: row.point_b === "" ? NaN : Number(row.point_b),
              point_c: row.point_c === "" ? NaN : Number(row.point_c),
              point_d: row.point_d === null || row.point_d === "" || row.point_d === undefined ? null : Number(row.point_d),
            };
            const variable = columns.find(column => column.key === "variable_id")?.options?.find(option => String(option.id) === String(row.variable_id));
            return <MembershipPlot key={row.id || "preview-" + index} sets={[set]} label={`${variable?.name || "Variabel"} · ${row.code || "Himpunan baru"}`} />;
          })}
        </div>
      </section>}
    </article>
  );
}
