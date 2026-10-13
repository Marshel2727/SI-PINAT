"use client";

import { useEffect, useState } from "react";
import { configurationPayload, type Column, type ConfigRow } from "./configuration";

export function ConfigTable({ title, columns, values, locked, onSave, busy }: {
  title: string;
  columns: Column[];
  values: ConfigRow[];
  locked: boolean;
  onSave: (values: ConfigRow[]) => Promise<void>;
  busy: boolean;
}) {
  const [local, setLocal] = useState<ConfigRow[]>(values);
  useEffect(() => setLocal(values), [values]);
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
        {title}
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
                        onClick={() => setLocal(local.filter((_, index) => index !== i))}
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
    </article>
  );
}
