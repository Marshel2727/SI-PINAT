"use client";

import { useEffect, useMemo, useState } from "react";
import { ErrorNotice, Field, MembershipPlot, Notice } from "@/components/ui";
import { membershipAt, validMembershipShape, type MembershipShape } from "@/lib/fuzzy-curve";
import {
  configurationPayload,
  STANDARD_CONSEQUENTS_3X3,
  STANDARD_SET_POINTS,
  UNM_GRADE_PRESET,
  WEIGHT_PRESETS,
  type Column,
  type ConfigOption,
  type ConfigRow,
} from "./configuration";

const setOrder: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
const matrixLabels = ["LOW", "MEDIUM", "HIGH"] as const;
type MatrixLabel = (typeof matrixLabels)[number];

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

function findSetPointWarnings(rows: ConfigRow[], variableOptions: ConfigOption[]): string[] {
  const varNameById = new Map(variableOptions.map(v => [String(v.id), v.name]));
  const warnings: string[] = [];
  for (const row of rows) {
    const varLabel = varNameById.get(String(row.variable_id ?? "")) || "Variabel";
    const code = String(row.code || "?");
    const shape = String(row.shape || "");
    const a = toPoint(row.point_a);
    const b = toPoint(row.point_b);
    const c = toPoint(row.point_c);
    const d = shape === "TRAPEZOID" ? toPoint(row.point_d) : c;
    const finiteAndRange = [a, b, c, ...(shape === "TRAPEZOID" ? [d] : [])].every(
      p => Number.isFinite(p) && p >= 0 && p <= 100
    );
    const ordered = shape === "TRAPEZOID"
      ? a <= b && b <= c && c <= d && a < d
      : a <= b && b <= c && a < c;
    if (!finiteAndRange || !ordered) {
      warnings.push(
        `${varLabel} · ${code}: titik ${shape === "TRAPEZOID" ? "A ≤ B ≤ C ≤ D (A < D)" : "A ≤ B ≤ C (A < C)"} dalam rentang 0–100 belum valid.`
      );
    }
  }
  return warnings;
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

function applyCourseWeightChange(row: ConfigRow, nextWeight: number): ConfigRow {
  const prevWeight = Number(row.weight ?? 0);
  let nextRequired = Boolean(row.is_required);
  if (prevWeight <= 0 && nextWeight > 0) {
    nextRequired = true;
  }
  else if (nextWeight <= 0) {
    nextRequired = false;
  }
  return { ...row, weight: nextWeight, is_required: nextRequired };
}

function nextRuleCodeForSpec(rows: ConfigRow[], specId: string, preferredIndex: number): string {
  const used = new Set(
    rows
      .filter(r => String(r.specialization_id ?? "") === specId)
      .map(r => String(r.rule_code ?? "").trim())
  );
  const preferred = `R${preferredIndex}`;
  if (!used.has(preferred))
    return preferred;
  for (let idx = 1; idx <= 99; idx++) {
    const candidate = `R${idx}`;
    if (!used.has(candidate))
      return candidate;
  }
  return `R${Date.now()}`;
}

function ruleToneClass(code: string): string {
  if (code === "LOW") return "tone-low";
  if (code === "MEDIUM") return "tone-medium";
  if (code === "HIGH") return "tone-high";
  return "";
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
  const [onlyWeighted, setOnlyWeighted] = useState(false);
  const [weightMatrixMode, setWeightMatrixMode] = useState(true);
  const [showAdvancedRules, setShowAdvancedRules] = useState(false);
  const [matrixSpecId, setMatrixSpecId] = useState("");

  useEffect(() => setLocal(values), [values]);
  const dirty = JSON.stringify(configurationPayload(local, columns)) !== JSON.stringify(configurationPayload(values, columns));
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const isGradeConversions = section === "grade-conversions" || columns.some(column => column.key === "letter_grade");
  const isSetEditor = section === "sets" || columns.some(column => column.key === "point_a");
  const isCourseWeights = section === "course-weights" || columns.some(column => column.key === "course_id");
  const isRules = section === "rules" || columns.some(column => column.key === "academic_set_id");

  const specOptions = useMemo(
    () => columns.find(column => column.key === "specialization_id")?.options || [],
    [columns]
  );
  const courseOptions = useMemo(
    () => columns.find(column => column.key === "course_id")?.options || [],
    [columns]
  );
  const variableOptions = useMemo(
    () => columns.find(column => column.key === "variable_id")?.options || [],
    [columns]
  );
  const activeCourseOptions = useMemo(
    () => courseOptions.filter(opt => !opt.name.endsWith("(Nonaktif)")),
    [courseOptions]
  );

  useEffect(() => {
    if (isRules && specOptions.length && !matrixSpecId) {
      setMatrixSpecId(String(specOptions[0].id));
    }
  }, [isRules, specOptions, matrixSpecId]);

  const courseNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of courseOptions)
      map.set(String(opt.id), opt.name);
    return map;
  }, [courseOptions]);

  const visibleEntries = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    return local
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => {
        if (specFilter && String(row.specialization_id ?? "") !== specFilter)
          return false;
        if (isCourseWeights) {
          if (onlyWeighted && Number(row.weight ?? 0) <= 0)
            return false;
          if (q) {
            const name = courseNameById.get(String(row.course_id ?? ""))?.toLowerCase() || "";
            if (!name.includes(q))
              return false;
          }
        }
        return true;
      });
  }, [local, specFilter, isCourseWeights, onlyWeighted, courseSearch, courseNameById]);

  const activeMatrixSpecId = specFilter || matrixSpecId || String(specOptions[0]?.id ?? "");

  const ruleSetMaps = useMemo(() => {
    const toCodeById = (key: string) => {
      const m = new Map<string, string>();
      const opts = columns.find(c => c.key === key)?.options || [];
      for (const opt of opts)
        m.set(String(opt.id), opt.name);
      return m;
    };
    const toIdByCode = (key: string) => {
      const m = new Map<string, string | number>();
      const opts = columns.find(c => c.key === key)?.options || [];
      for (const opt of opts)
        m.set(opt.name, opt.id);
      return m;
    };
    return {
      academic: toCodeById("academic_set_id"),
      competency: toCodeById("competency_set_id"),
      output: toCodeById("output_set_id"),
      academicIds: toIdByCode("academic_set_id"),
      competencyIds: toIdByCode("competency_set_id"),
      outputIds: toIdByCode("output_set_id"),
    };
  }, [columns]);

  const hasRuleSetOptions = Boolean(
    ruleSetMaps.academicIds.size && ruleSetMaps.competencyIds.size && ruleSetMaps.outputIds.size
  );

  const courseWeightByKey = useMemo(() => {
    const map = new Map<string, { row: ConfigRow; index: number }>();
    local.forEach((row, index) => {
      map.set(`${String(row.course_id ?? "")}::${String(row.specialization_id ?? "")}`, { row, index });
    });
    return map;
  }, [local]);

  const missingWeightPairs = useMemo(() => {
    if (!isCourseWeights) return [];
    const pairs: Array<{ course_id: ConfigOption["id"]; specialization_id: ConfigOption["id"] }> = [];
    for (const course of activeCourseOptions) {
      for (const spec of specOptions) {
        if (!courseWeightByKey.has(`${String(course.id)}::${String(spec.id)}`)) {
          pairs.push({ course_id: course.id, specialization_id: spec.id });
        }
      }
    }
    return pairs;
  }, [isCourseWeights, activeCourseOptions, specOptions, courseWeightByKey]);

  const specWeightSummaries = useMemo(() => {
    if (!isCourseWeights) return [];
    return specOptions.map(spec => {
      const specRows = local.filter(r => String(r.specialization_id ?? "") === String(spec.id));
      const requiredCount = specRows.filter(r => Boolean(r.is_required)).length;
      const totalWeight = specRows.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
      const presentIds = new Set(specRows.map(r => String(r.course_id ?? "")));
      const missingCount = activeCourseOptions.filter(c => !presentIds.has(String(c.id))).length;
      return { spec, requiredCount, totalWeight, missingCount };
    });
  }, [isCourseWeights, specOptions, local, activeCourseOptions]);

  const matrixCourses = useMemo(() => {
    if (!isCourseWeights) return [];
    const q = courseSearch.trim().toLowerCase();
    return courseOptions.filter(course => {
      const isActive = !course.name.endsWith("(Nonaktif)");
      const hasAnyRow = specOptions.some(spec => courseWeightByKey.has(`${String(course.id)}::${String(spec.id)}`));
      if (!isActive && !hasAnyRow)
        return false;
      if (q && !course.name.toLowerCase().includes(q))
        return false;
      if (onlyWeighted) {
        return specOptions.some(spec => {
          const entry = courseWeightByKey.get(`${String(course.id)}::${String(spec.id)}`);
          return Number(entry?.row.weight ?? 0) > 0;
        });
      }
      return true;
    });
  }, [isCourseWeights, courseOptions, specOptions, courseWeightByKey, courseSearch, onlyWeighted]);

  const setWarnings = useMemo(
    () => (isSetEditor ? findSetPointWarnings(local, variableOptions) : []),
    [isSetEditor, local, variableOptions]
  );

  function update(index: number, key: string, value: ConfigRow[string]) {
    setLocal(rows => rows.map((r, i) => {
      if (i !== index)
        return r;
      if (isCourseWeights && key === "weight") {
        const parsed = value === "" ? 0 : Number(value);
        if (Number.isFinite(parsed)) {
          return applyCourseWeightChange(r, parsed);
        }
      }
      const next = { ...r, [key]: value };
      if (isGradeConversions && key === "grade_points") {
        const numeric = Number(value);
        if (value !== "" && Number.isFinite(numeric) && numeric >= 0 && numeric <= 4) {
          next.normalized_score = Number((numeric * 25).toFixed(2));
        }
      }
      if (isSetEditor && key === "shape" && value === "TRIANGLE") {
        next.point_d = null;
      }
      return next;
    }));
  }

  function loadUnmGradePreset() {
    if (local.length > 0 && !window.confirm("Ganti seluruh daftar konversi nilai dengan 12 tingkat standar UNM (A s/d E)?")) {
      return;
    }
    setLocal(UNM_GRADE_PRESET.map(item => ({ ...item })));
  }

  function syncNormalizedGrades() {
    setLocal(rows => rows.map(row => {
      const gp = Number(row.grade_points);
      if (row.grade_points !== "" && Number.isFinite(gp) && gp >= 0 && gp <= 4) {
        return { ...row, normalized_score: Number((gp * 25).toFixed(2)) };
      }
      return row;
    }));
  }

  function completeCourseMatrix() {
    if (!missingWeightPairs.length) return;
    setLocal(rows => [
      ...rows,
      ...missingWeightPairs.map(pair => ({
        course_id: pair.course_id,
        specialization_id: pair.specialization_id,
        weight: 0,
        is_required: false,
      })),
    ]);
  }

  function updateMatrixCourseWeight(courseId: ConfigOption["id"], specId: ConfigOption["id"], nextWeight: number) {
    setLocal(rows => {
      const idx = rows.findIndex(
        r => String(r.course_id ?? "") === String(courseId) && String(r.specialization_id ?? "") === String(specId)
      );
      if (idx === -1) {
        return [
          ...rows,
          applyCourseWeightChange({ course_id: courseId, specialization_id: specId, weight: 0, is_required: false }, nextWeight),
        ];
      }
      return rows.map((r, i) => (i === idx ? applyCourseWeightChange(r, nextWeight) : r));
    });
  }

  function updateMatrixCourseRequired(courseId: ConfigOption["id"], specId: ConfigOption["id"], isRequired: boolean) {
    setLocal(rows => {
      const idx = rows.findIndex(
        r => String(r.course_id ?? "") === String(courseId) && String(r.specialization_id ?? "") === String(specId)
      );
      if (idx === -1) {
        return [
          ...rows,
          { course_id: courseId, specialization_id: specId, weight: 0, is_required: isRequired },
        ];
      }
      return rows.map((r, i) => (i === idx ? { ...r, is_required: isRequired } : r));
    });
  }

  function applyStandardSetPoints() {
    setLocal(rows => {
      const updated = rows.map(row => {
        const code = String(row.code ?? "") as MatrixLabel;
        const preset = STANDARD_SET_POINTS[code];
        if (!preset) return row;
        return {
          ...row,
          shape: preset.shape,
          point_a: preset.point_a,
          point_b: preset.point_b,
          point_c: preset.point_c,
          point_d: preset.point_d,
        };
      });
      return updated;
    });
  }

  function updateRuleMatrixCell(acad: MatrixLabel, comp: MatrixLabel, outCode: MatrixLabel) {
    const academicSetId = ruleSetMaps.academicIds.get(acad);
    const competencySetId = ruleSetMaps.competencyIds.get(comp);
    const outputSetId = ruleSetMaps.outputIds.get(outCode);
    if (academicSetId === undefined || competencySetId === undefined || outputSetId === undefined || !activeMatrixSpecId) {
      return;
    }

    const i = matrixLabels.indexOf(acad);
    const j = matrixLabels.indexOf(comp);

    setLocal(rows => {
      const idx = rows.findIndex(r =>
        String(r.specialization_id ?? "") === activeMatrixSpecId
        && ruleSetMaps.academic.get(String(r.academic_set_id ?? "")) === acad
        && ruleSetMaps.competency.get(String(r.competency_set_id ?? "")) === comp
      );
      if (idx !== -1) {
        return rows.map((r, index) => (index === idx ? { ...r, output_set_id: outputSetId } : r));
      }
      const specValue = specOptions.find(s => String(s.id) === activeMatrixSpecId)?.id ?? activeMatrixSpecId;
      return [
        ...rows,
        {
          specialization_id: specValue,
          rule_code: nextRuleCodeForSpec(rows, activeMatrixSpecId, i * 3 + j + 1),
          academic_set_id: academicSetId,
          competency_set_id: competencySetId,
          output_set_id: outputSetId,
          operator: "AND",
          rule_weight: 1,
        },
      ];
    });
  }

  function fillSymmetricRules() {
    if (!hasRuleSetOptions) return;
    const targetSpecIds = specFilter
      ? [specFilter]
      : specOptions.map(s => String(s.id));

    setLocal(rows => {
      const nextRows = [...rows];
      for (const specId of targetSpecIds) {
        const specValue = specOptions.find(s => String(s.id) === specId)?.id ?? specId;
        for (let i = 0; i < matrixLabels.length; i++) {
          for (let j = 0; j < matrixLabels.length; j++) {
            const acad = matrixLabels[i];
            const comp = matrixLabels[j];
            const targetOut = STANDARD_CONSEQUENTS_3X3[i][j];
            const academicSetId = ruleSetMaps.academicIds.get(acad);
            const competencySetId = ruleSetMaps.competencyIds.get(comp);
            const outputSetId = ruleSetMaps.outputIds.get(targetOut);
            if (academicSetId === undefined || competencySetId === undefined || outputSetId === undefined) {
              continue;
            }
            const existingIdx = nextRows.findIndex(r =>
              String(r.specialization_id ?? "") === specId
              && ruleSetMaps.academic.get(String(r.academic_set_id ?? "")) === acad
              && ruleSetMaps.competency.get(String(r.competency_set_id ?? "")) === comp
            );
            if (existingIdx !== -1) {
              nextRows[existingIdx] = {
                ...nextRows[existingIdx],
                output_set_id: outputSetId,
                operator: "AND",
                rule_weight: 1,
              };
            }
            else {
              nextRows.push({
                specialization_id: specValue,
                rule_code: nextRuleCodeForSpec(nextRows, specId, i * 3 + j + 1),
                academic_set_id: academicSetId,
                competency_set_id: competencySetId,
                output_set_id: outputSetId,
                operator: "AND",
                rule_weight: 1,
              });
            }
          }
        }
      }
      return nextRows;
    });
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
        <div className="actions">
          {isCourseWeights && (
            <button
              type="button"
              className="secondary compact"
              onClick={() => setWeightMatrixMode(v => !v)}
            >
              {weightMatrixMode ? "Mode Tabel Baris" : "Mode Matriks Ringkas"}
            </button>
          )}
          {hasFilters && (
            <span className="small muted">
              {isCourseWeights && weightMatrixMode
                ? `Menampilkan ${matrixCourses.length} mata kuliah (${local.length} entri)`
                : `Menampilkan ${visibleEntries.length} dari ${local.length} baris`}
            </span>
          )}
        </div>
      </div>

      {isGradeConversions && (
        <div className="preset-toolbar">
          <div>
            <strong>Standar 12 Nilai Huruf UNM</strong>
            <p className="small muted" style={{ margin: "2px 0 0" }}>
              Skala resmi A–E dengan rumus otomatis <code>Normalisasi = (Nilai Mutu ÷ 4) × 100</code>. Mengubah nilai mutu memperbarui normalisasi otomatis, dan nilai normalisasi tetap bisa disunting langsung.
            </p>
          </div>
          <div className="actions">
            <button type="button" className="secondary compact" disabled={locked || busy} onClick={loadUnmGradePreset}>
              Muat Standar UNM (A s/d E)
            </button>
            <button
              type="button"
              className="secondary compact"
              disabled={locked || busy || !local.length}
              onClick={syncNormalizedGrades}
            >
              Selaraskan Normalisasi (×25)
            </button>
          </div>
        </div>
      )}

      {isSetEditor && (
        <div className="preset-toolbar">
          <div>
            <strong>Panduan Titik Kurva A–B–C–D</strong>
            <p className="small muted" style={{ margin: "2px 0 0" }}>
              <strong>Trapesium</strong> memakai 4 titik (<code>A ≤ B ≤ C ≤ D</code> dengan bahu datar di antara B–C). <strong>Segitiga</strong> memakai 3 titik (<code>A ≤ B ≤ C</code>, titik D dikosongkan).
            </p>
          </div>
          <button
            type="button"
            className="secondary compact"
            disabled={locked || busy || !local.length}
            onClick={applyStandardSetPoints}
          >
            Terapkan Kurva Standar Bebas Celah (0–100)
          </button>
        </div>
      )}

      {isSetEditor && setWarnings.length > 0 && (
        <Notice tone="error">
          <strong>Urutan titik himpunan perlu diperiksa:</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {setWarnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </Notice>
      )}

      {isCourseWeights && (
        <>
          <div className="preset-toolbar">
            <div className="actions" style={{ gap: 8 }}>
              {specWeightSummaries.map(({ spec, requiredCount, totalWeight, missingCount }) => {
                const ok = totalWeight > 0 && missingCount === 0;
                return (
                  <span key={spec.id} className={"badge " + (ok ? "success" : "warning")}>
                    {spec.name}: {requiredCount} wajib · Σ {totalWeight.toFixed(2)}
                    {missingCount > 0 ? ` (${missingCount} belum terisi)` : totalWeight <= 0 ? " (total 0)" : ""}
                  </span>
                );
              })}
            </div>
            {missingWeightPairs.length > 0 && (
              <button
                type="button"
                className="secondary compact"
                disabled={locked || busy}
                onClick={completeCourseMatrix}
              >
                Lengkapi Matriks Mata Kuliah ({missingWeightPairs.length})
              </button>
            )}
          </div>

          <div className="filters">
            {!weightMatrixMode && (
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
            )}
            <Field label="Cari Mata Kuliah">
              <input
                value={courseSearch}
                placeholder="Ketik kode atau nama mata kuliah…"
                onChange={e => setCourseSearch(e.target.value)}
              />
            </Field>
            <label className="checkbox" style={{ alignSelf: "flex-end", minHeight: 40 }}>
              <input
                type="checkbox"
                checked={onlyWeighted}
                onChange={e => setOnlyWeighted(e.target.checked)}
              />
              <span>Hanya yang berbobot (&gt; 0)</span>
            </label>
          </div>
        </>
      )}

      {isRules && specOptions.length > 0 && (
        <div className="tablist-scroll" role="tablist" aria-label="Pilih peminatan basis aturan">
          <button
            type="button"
            role="tab"
            aria-selected={specFilter === ""}
            className={specFilter === "" ? "" : "secondary"}
            onClick={() => setSpecFilter("")}
          >
            Semua Peminatan ({local.length})
          </button>
          {specOptions.map(opt => {
            const count = local.filter(r => String(r.specialization_id ?? "") === String(opt.id)).length;
            const selected = specFilter === String(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={selected ? "" : "secondary"}
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
      )}

      <form onSubmit={e => {
        e.preventDefault();
        onSave(payload());
      }}>
        <fieldset disabled={locked || busy}>
          {isRules && specOptions.length > 0 && activeMatrixSpecId && (
            <div style={{ padding: 14, borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", marginBottom: 16 }}>
              <div className="spread wrap" style={{ marginBottom: 10 }}>
                <div>
                  <strong>
                    Matriks Aturan 3×3 — {specOptions.find(s => String(s.id) === activeMatrixSpecId)?.name || "Peminatan"}
                  </strong>
                  <p className="small muted" style={{ margin: "2px 0 0" }}>
                    Pilih konsekuen (LOW, MEDIUM, HIGH) langsung pada sel matriks.
                  </p>
                </div>
                <div className="actions">
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
                  <button
                    type="button"
                    className="secondary compact"
                    disabled={locked || busy || !hasRuleSetOptions}
                    onClick={fillSymmetricRules}
                  >
                    Isi 9 Aturan Standar Simetris
                  </button>
                </div>
              </div>

              {!hasRuleSetOptions && (
                <Notice tone="error">
                  Lengkapi Variabel dan Himpunan Fuzzy (LOW, MEDIUM, HIGH) terlebih dahulu agar matriks aturan dapat disunting.
                </Notice>
              )}

              <div className="table-scroll" tabIndex={0} role="region" aria-label="Matriks aturan fuzzy 3 kali 3" style={{ margin: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Akademik \ Kompetensi</th>
                      {matrixLabels.map(col => (
                        <th key={col} scope="col">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixLabels.map(acad => (
                      <tr key={acad}>
                        <th scope="row">{acad}</th>
                        {matrixLabels.map(comp => {
                          const matches = local.filter(r =>
                            String(r.specialization_id ?? "") === activeMatrixSpecId
                            && ruleSetMaps.academic.get(String(r.academic_set_id ?? "")) === acad
                            && ruleSetMaps.competency.get(String(r.competency_set_id ?? "")) === comp
                          );

                          if (matches.length > 1) {
                            return (
                              <td key={comp}>
                                <span className="badge warning">Duplikat ({matches.length})</span>
                                <small className="block muted">Perbaiki di tabel parameter lanjutan</small>
                              </td>
                            );
                          }

                          const match = matches[0];
                          const outCode = match ? (ruleSetMaps.output.get(String(match.output_set_id ?? "")) || "") : "";
                          const tone = ruleToneClass(outCode);

                          return (
                            <td key={comp}>
                              {!locked ? (
                                <select
                                  aria-label={`Konsekuen aturan Akademik ${acad} dan Kompetensi ${comp}`}
                                  className={"rule-matrix-select " + tone}
                                  value={outCode}
                                  disabled={!hasRuleSetOptions}
                                  onChange={e => {
                                    const nextOut = e.target.value as MatrixLabel | "";
                                    if (nextOut) {
                                      updateRuleMatrixCell(acad, comp, nextOut);
                                    }
                                  }}
                                >
                                  {!outCode && <option value="">Pilih…</option>}
                                  {matrixLabels.map(label => (
                                    <option key={label} value={label}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className={"badge " + (Number(match?.rule_weight) > 0 ? "success" : "warning")}>
                                  {match ? `${String(match.rule_code || "?")} → ${outCode || "—"}` : "Belum ada"}
                                </span>
                              )}
                              <small className="block muted" style={{ marginTop: 4 }}>
                                {match
                                  ? `${String(match.rule_code || "?")} · ${String(match.operator || "AND")} · w=${String(match.rule_weight ?? 0)}`
                                  : "Belum ada (otomatis AND · w=1)"}
                              </small>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="actions" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="secondary compact"
                  onClick={() => setShowAdvancedRules(v => !v)}
                >
                  {showAdvancedRules
                    ? "Sembunyikan Tabel Parameter Lanjutan"
                    : "Tampilkan Tabel Parameter Lanjutan (Operator & Bobot Aturan)"}
                </button>
              </div>
            </div>
          )}

          {isCourseWeights && weightMatrixMode ? (
            <>
              <div className="table-scroll" tabIndex={0} role="region" aria-label="Matriks bobot mata kuliah per peminatan">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Mata Kuliah</th>
                      {specOptions.map(spec => (
                        <th key={spec.id} scope="col">{spec.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixCourses.map(course => (
                      <tr key={course.id}>
                        <th scope="row" style={{ whiteSpace: "normal", minWidth: 220 }}>
                          {course.name}
                        </th>
                        {specOptions.map(spec => {
                          const entry = courseWeightByKey.get(`${String(course.id)}::${String(spec.id)}`);
                          const currentWeight = Number(entry?.row.weight ?? 0);
                          const isPreset = WEIGHT_PRESETS.includes(currentWeight);
                          const isRequired = Boolean(entry?.row.is_required);
                          return (
                            <td key={spec.id}>
                              <div className="weight-matrix-cell">
                                <select
                                  aria-label={`Bobot ${course.name} untuk ${spec.name}`}
                                  value={String(currentWeight)}
                                  onChange={e => updateMatrixCourseWeight(course.id, spec.id, Number(e.target.value))}
                                >
                                  {!isPreset && (
                                    <option value={String(currentWeight)}>
                                      {currentWeight} (Kustom)
                                    </option>
                                  )}
                                  {WEIGHT_PRESETS.map(preset => (
                                    <option key={preset} value={String(preset)}>
                                      {preset === 0 ? "0 (Tidak relevan)" : String(preset)}
                                    </option>
                                  ))}
                                </select>
                                <label className="checkbox">
                                  <input
                                    type="checkbox"
                                    aria-label={`Wajib ${course.name} untuk ${spec.name}`}
                                    checked={isRequired}
                                    onChange={e => updateMatrixCourseRequired(course.id, spec.id, e.target.checked)}
                                  />
                                  <span>Wajib</span>
                                </label>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!matrixCourses.length && (
                <Notice>Tidak ada mata kuliah yang sesuai dengan filter.</Notice>
              )}
            </>
          ) : (!isRules || showAdvancedRules) && (
            <>
              <div className="table-scroll" tabIndex={0} role="region" aria-label={"Tabel " + title.toLowerCase()}>
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
            </>
          )}

          <ErrorNotice error={saveError} />
          <div className="actions">
            {(!isCourseWeights || !weightMatrixMode) && (!isRules || showAdvancedRules) && (
              <button type="button" className="secondary" onClick={addRow}>
                + Baris
              </button>
            )}
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
