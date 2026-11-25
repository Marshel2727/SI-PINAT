"use client";

import { ErrorNotice, Field, Modal, Notice } from "@/components/ui";
import { IconUpload } from "@/components/icons";
import { names, number } from "@/lib/format";
import { useUnsavedGuard } from "@/lib/use-unsaved-guard";
import Link from "next/link";
import { useRef, useState } from "react";
import { useGrades } from "./use-grades";

export function Grades() {
  const {
    assessment,
    master,
    values,
    setValues,
    state,
    setState,
    error,
    modalError,
    message,
    tab,
    setTab,
    semester,
    setSemester,
    busy,
    downloadingTemplate,
    downloadTemplate,
    file,
    setFile,
    preview,
    closePreview,
    locked,
    manual,
    upload,
    next,
    dirty,
    canContinue,
    hasPositiveScores,
    missingRequired,
    validationAttempted,
  } = useGrades();

  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const requiredIds = new Set(master?.weights.filter(weight => weight.is_required).map(weight => weight.course_id) || []);
  const requiredCourses = master?.courses.filter(course => requiredIds.has(course.id)) || [];
  const requiredFilled = requiredCourses.filter(course => values[course.id]).length;

  useUnsavedGuard(
    dirty && !locked,
    "Perubahan nilai manual belum disimpan. Yakin ingin meninggalkan halaman ini?"
  );

  function selectFile(selected: File | null) {
    closePreview();
    setFileError("");
    if (selected && (!/\.(csv|xlsx)$/i.test(selected.name) || selected.size > 10 * 1024 * 1024)) {
      setFile(null);
      setFileError("Pilih berkas .csv atau .xlsx dengan ukuran maksimal 10 MB.");
      return;
    }
    setFile(selected);
  }

  const maxSemester = Math.max(1, Math.min(assessment.current_semester || 4, 4));
  const semesterOptions = Array.from({ length: maxSemester }, (_, i) => i + 1);
  const activeSemesterFilter = semester && Number(semester) <= maxSemester ? semester : "";
  const filteredCourses = master ? master.courses.filter(c => !activeSemesterFilter || String(c.semester) === activeSemesterFilter) : [];

  const filledCount = master ? master.courses.filter(c => values[c.id]).length : 0;
  const totalCourses = master ? master.courses.length : 0;
  const fillPercentage = totalCourses > 0 ? Math.round((filledCount / totalCourses) * 100) : 0;

  return (
    <>
      <span className="eyebrow">TAHAP 2 DARI 4</span>
      <h1>Input Nilai Akademik</h1>
      <p>
        Gunakan nilai semester 1–{maxSemester} sesuai mata kuliah kurikulum dan bobot konversi pada versi sesi ini.
      </p>
      <ErrorNotice error={error} />
      {message && <Notice tone="success">{message}</Notice>}
      {locked && (
        <Notice>
          Nilai akademik telah terkunci setelah Anda memulai tes kompetensi.{" "}
          <Link href={"/asesmen/" + assessment.public_id + "/tes"}>
            Lanjutkan tes kompetensi →
          </Link>
        </Notice>
      )}

      <div className="spread wrap">
        <div className="tabs">
          {[
            ["import", "Impor Excel / CSV"],
            ["manual", "Input Manual"]
          ].map(([id, title]) => (
            <button
              type="button"
              key={id}
              className={tab === id ? "" : "secondary"}
              onClick={() => setTab(id)}
            >
              {title}
            </button>
          ))}
        </div>
        {tab === "manual" && (
          <Field label="Filter semester">
            <select value={activeSemesterFilter} onChange={e => setSemester(e.target.value)}>
              <option value="">Semua semester (1–{maxSemester})</option>
              {semesterOptions.map(n => (
                <option key={n} value={n}>
                  Semester {n}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      {!master && !error && <Notice>Memuat daftar mata kuliah kurikulum…</Notice>}

      {master && tab === "import" && (
        <article className="card">
          <div className="spread wrap">
            <h2>Impor Transkrip: Excel (.xlsx) / CSV</h2>
            <div className="actions">
              <button
                type="button"
                className="secondary compact"
                disabled={busy || downloadingTemplate !== null}
                onClick={() => downloadTemplate("csv")}
              >
                {downloadingTemplate === "csv" ? "Mengunduh CSV\u2026" : "Unduh Template CSV"}
              </button>
              <button
                type="button"
                className="secondary compact"
                disabled={busy || downloadingTemplate !== null}
                onClick={() => downloadTemplate("xlsx")}
              >
                {downloadingTemplate === "xlsx" ? "Mengunduh XLSX\u2026" : "Unduh Template XLSX"}
              </button>
            </div>
          </div>
          <p>
            Unduh template <strong>XLSX</strong> (disarankan, dilengkapi dropdown nilai huruf &amp; panduan) atau <strong>CSV</strong>. Isi kolom <strong>nilai_huruf</strong> tanpa mengubah header <strong>semester, kode_mk, nama_mk, nilai_huruf</strong>; mata kuliah opsional yang belum diambil boleh dibiarkan kosong. Berkas maksimal 10 MB, tanpa formula atau makro.
          </p>

          <div
            className={"upload-zone " + (isDragging ? "is-dragging" : "")}
            aria-disabled={locked || busy}
            onClick={e => {
              if (locked || busy) return;
              if (e.target instanceof Element && e.target.closest("button, a, input")) return;
              fileInput.current?.click();
            }}
            onDragOver={e => {
              e.preventDefault();
              if (!locked && !busy) setIsDragging(true);
            }}
            onDragLeave={e => {
              e.preventDefault();
              if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
              setIsDragging(false);
            }}
            onDrop={e => {
              e.preventDefault();
              setIsDragging(false);
              if (locked || busy) return;
              selectFile(e.dataTransfer.files?.[0] || null);
            }}
          >
            <IconUpload size={40} style={{ color: "var(--primary)", marginBottom: 8 }} />
            <h3>Tarik & Lepas Berkas di Sini</h3>
            <p className="small muted">atau klik area ini untuk memilih berkas transkrip (.xlsx atau .csv)</p>

            <input
              ref={fileInput}
              type="file"
              hidden
              aria-label="Pilih berkas transkrip"
              accept=".csv,.xlsx"
              disabled={locked || busy}
              onChange={e => {
                selectFile(e.target.files?.[0] || null);
                e.target.value = "";
              }}
            />
            <button type="button" className="secondary" disabled={locked || busy} onClick={() => fileInput.current?.click()}>
              Pilih berkas
            </button>
            {fileError && <Notice tone="error">{fileError}</Notice>}

            {file && (
              <div className="upload-file-row">
                <div className="badge success" style={{ padding: "6px 14px", fontSize: "12px" }}>
                  ✓ Berkas terpilih: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
                <button
                  type="button"
                  className="secondary compact"
                  disabled={busy}
                  onClick={e => {
                    e.stopPropagation();
                    selectFile(null);
                  }}
                >
                  Hapus pilihan
                </button>
              </div>
            )}

            <button
              type="button"
              disabled={locked || busy || !file}
              onClick={() => upload(false)}
              style={{ marginTop: 8 }}
            >
              {busy ? "Memvalidasi berkas\u2026" : "Validasi & Lihat Pratinjau"}
            </button>
          </div>
        </article>
      )}

      {master && tab === "manual" && (
        <article className="card">
          <div className="spread wrap" style={{ marginBottom: 16 }}>
            <div>
              <h2>Nilai per Mata Kuliah</h2>
              <p className="small muted">
                Kemajuan pengisian: <strong>{filledCount}</strong> dari {totalCourses} mata kuliah ({fillPercentage}%)
              </p>
              <p className="small muted">Mata kuliah wajib: <strong>{requiredFilled} / {requiredCourses.length}</strong> terisi. {dirty ? "Perubahan nilai belum disimpan." : "Tidak ada perubahan nilai yang belum disimpan."}</p>
            </div>
            <button type="button" disabled={locked || busy} onClick={manual} className="compact">
              {busy ? "Menyimpan\u2026" : "Simpan Nilai Manual"}
            </button>
          </div>

          <div className="bar" style={{ marginBottom: 20 }}>
            <div style={{ width: `${fillPercentage}%`, background: "var(--primary)" }} />
          </div>

          {master.courses.length === 0 ? (
            <Notice>Belum ada mata kuliah yang berlaku pada semester ini.</Notice>
          ) : filteredCourses.length === 0 ? (
            <Notice>
              <div className="spread wrap">
                <span>Tidak ada mata kuliah pada Semester {activeSemesterFilter}.</span>
                <button type="button" className="secondary compact" onClick={() => setSemester("")}>
                  Tampilkan semua semester
                </button>
              </div>
            </Notice>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Semester</th>
                    <th>Kode MK</th>
                    <th>Mata Kuliah</th>
                    <th>SKS</th>
                    <th>Nilai Huruf</th>
                    <th>Skor Normalisasi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map(c => {
                    const isFilled = !!values[c.id];
                    return (
                      <tr key={c.id} style={{ background: isFilled ? "#f9fbff" : "transparent" }}>
                        <td>{c.semester}</td>
                        <td className="mono"><strong>{c.code}</strong></td>
                        <td>{c.name}{requiredIds.has(c.id) && <span className="badge warning required-badge">Wajib</span>}</td>
                        <td>{c.credits} SKS</td>
                        <td>
                          <select
                            aria-label={"Nilai " + c.name}
                            value={values[c.id] || ""}
                            disabled={locked || busy}
                            onChange={e => {
                              setValues({ ...values, [c.id]: e.target.value });
                              setState(null);
                            }}
                          >
                            <option value="">-- Pilih Nilai --</option>
                            {master.conversions.map(g => (
                              <option value={g.letter_grade} key={g.id}>
                                {g.letter_grade} (Bobot {number(g.grade_points, 2)})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {values[c.id] ? (
                            <span className="mono" style={{ color: "var(--primary)", fontWeight: 600 }}>
                              {number(master.conversions.find(g => g.letter_grade === values[c.id])?.normalized_score || 0)}
                            </span>
                          ) : (
                            <span className="muted">{"\u2014"}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </article>
      )}

      {master && (
        <details className="notice">
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>
            Lihat tabel konversi nilai huruf (Model {assessment.model_version})
          </summary>
          <div className="actions" style={{ marginTop: 10 }}>
            {master.conversions.map(g => (
              <span className="badge" key={g.id}>
                {g.letter_grade}: Bobot {number(g.grade_points, 2)} → Skor {number(g.normalized_score, 2)}
              </span>
            ))}
          </div>
        </details>
      )}

      {state && state.ready && !dirty && Object.keys(state.academic_scores || {}).length > 0 && (
        <article className="card">
          <div className="spread wrap">
            <h2>Ringkasan Skor Akademik</h2>
            <span className="badge success">
              ✓ {state.coverage?.provided || 0} / {state.coverage?.available || 0} mata kuliah terisi
            </span>
          </div>
          <div className="metrics" style={{ marginTop: 12 }}>
            {Object.entries(state.academic_scores || {}).map(([key, value]) => (
              <div key={key}>
                <strong>{number(Number(value))}</strong>
                <small>{names[key] || key}</small>
              </div>
            ))}
          </div>
        </article>
      )}

      {!locked && validationAttempted && !canContinue && (
        <Notice tone="error">
          <strong>Belum dapat melanjutkan ke tes kompetensi.</strong>{" "}
          {missingRequired.length > 0 ? (
            <>
              Lengkapi <strong>{missingRequired.length} mata kuliah wajib</strong> yang masih kosong:{" "}
              <span className="mono">{missingRequired.map(course => course.code).join(", ")}</span>.
            </>
          ) : !hasPositiveScores ? (
            "Minimal satu mata kuliah berbobot positif (> 0) pada setiap bidang peminatan harus diisi agar skor akademik dapat dihitung."
          ) : (
            state?.errors?.join(" ") || "Pastikan nilai akademik sudah lengkap dan tersimpan."
          )}
          {tab === "import" && (
            <div style={{ marginTop: 8 }}>
              <button type="button" className="secondary compact" onClick={() => setTab("manual")}>
                Buka Input Manual →
              </button>
            </div>
          )}
        </Notice>
      )}

      <div className="spread wrap section">
        <Link className="button secondary" href={"/asesmen/" + assessment.public_id + "/peminatan"}>
          ← Kembali ke Peminatan Awal
        </Link>
        <button type="button" disabled={busy || locked || !master} onClick={next}>
          {busy ? "Menyimpan & menyiapkan tes…" : dirty ? "Simpan & Mulai Tes Kompetensi →" : "Mulai Tes Kompetensi →"}
        </button>
      </div>

      <Modal open={!!preview} title="Pratinjau Impor Nilai Transkrip" dismissible={!busy} onClose={() => !busy && closePreview()}>
        <ErrorNotice error={modalError} />
        {preview && (
          <>
            {preview.ready ? (
              <Notice tone="success">
                Berkas valid ({preview.coverage?.provided ?? 0} / {preview.coverage?.available ?? 0} mata kuliah tercakup). Konfirmasi akan mengganti nilai pada sesi ini; nilai lama tetap aman bila proses dibatalkan.
              </Notice>
            ) : (
              <Notice tone="error">
                <strong>Berkas terbaca ({preview.coverage?.provided ?? 0} / {preview.coverage?.available ?? 0} mata kuliah), tetapi belum memenuhi syarat simpan:</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {preview.missing_required?.length > 0 && (
                    <li>Mata kuliah wajib belum tercantum: {preview.missing_required.join(", ")}</li>
                  )}
                  {preview.errors?.map(err => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              </Notice>
            )}
            {preview.warnings && preview.warnings.length > 0 && (
              <Notice>
                <strong>Penyesuaian nama mata kuliah ({preview.warnings.length}):</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {preview.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </Notice>
            )}
            {Object.keys(preview.academic_scores || {}).length > 0 && (
              <div className="actions small" style={{ margin: "8px 0 12px" }}>
                {Object.entries(preview.academic_scores).map(([key, value]) => (
                  <span className="badge" key={key}>
                    {names[key] || key}: {number(Number(value))}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Semester</th>
                <th>Kode MK</th>
                <th>Mata Kuliah</th>
                <th>Nilai Huruf</th>
                <th>Skor Normalisasi</th>
              </tr>
            </thead>
            <tbody>
              {preview?.preview.map((r, i) => {
                const matchedGrade = preview.grades?.find(
                  g => g.course_snapshot.code.toLowerCase() === r.kode_mk.trim().toLowerCase()
                );
                const normalized = matchedGrade?.normalized_score
                  ?? master?.conversions.find(c => c.letter_grade.toUpperCase() === r.nilai_huruf.trim().toUpperCase())?.normalized_score;
                return (
                  <tr key={i}>
                    <td>{r.semester}</td>
                    <td className="mono"><strong>{r.kode_mk}</strong></td>
                    <td>{matchedGrade?.course_snapshot.name || r.nama_mk}</td>
                    <td><span className="badge">{r.nilai_huruf}</span></td>
                    <td className="mono">{normalized !== undefined ? number(normalized) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="actions end" style={{ marginTop: 16 }}>
          <button type="button" className="secondary" onClick={closePreview} disabled={busy}>
            Batal
          </button>
          <button type="button" disabled={busy || !preview?.ready} onClick={() => upload(true)}>
            {busy ? "Menyimpan\u2026" : "Konfirmasi & Simpan Nilai"}
          </button>
        </div>
      </Modal>
    </>
  );
}
