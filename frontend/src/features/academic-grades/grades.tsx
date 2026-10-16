"use client";

import { ErrorNotice, Field, Modal, Notice } from "@/components/ui";
import { IconUpload } from "@/components/icons";
import { number } from "@/lib/format";
import Link from "next/link";
import { useRef, useState } from "react";
import { useGrades } from "./use-grades";

export function Grades() {
  const {
    assessment,
    base,
    master,
    values,
    setValues,
    state,
    setState,
    error,
    message,
    tab,
    setTab,
    semester,
    setSemester,
    busy,
    file,
    setFile,
    preview,
    setPreview,
    locked,
    manual,
    upload,
    next, dirty, canContinue, missingRequired, fillExamples
  } = useGrades();

  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const requiredIds = new Set(master?.weights.filter(weight => weight.is_required).map(weight => weight.course_id) || []);
  const requiredCourses = master?.courses.filter(course => requiredIds.has(course.id)) || [];
  const requiredFilled = requiredCourses.filter(course => values[course.id]).length;

  function selectFile(selected: File | null) {
    setPreview(null);
    setFileError("");
    if (selected && (!/\.(csv|xlsx)$/i.test(selected.name) || selected.size > 10 * 1024 * 1024)) {
      setFile(null);
      setFileError("Pilih berkas .csv atau .xlsx dengan ukuran maksimal 10 MB.");
      return;
    }
    setFile(selected);
  }

  const filledCount = master ? master.courses.filter(c => values[c.id]).length : 0;
  const totalCourses = master ? master.courses.length : 0;
  const fillPercentage = totalCourses > 0 ? Math.round((filledCount / totalCourses) * 100) : 0;

  return (
    <>
      <span className="eyebrow">TAHAP 2 DARI 4</span>
      <h1>Input Nilai Akademik</h1>
      <p>
        Gunakan nilai semester 1–4 sesuai mata kuliah kurikulum dan bobot konversi pada versi sesi ini.
      </p>
      <ErrorNotice error={error} />
      {message && <Notice tone="success">{message}</Notice>}
      {assessment.mode === "DEMO" && !locked && <Notice>
        <div className="spread wrap">
          <div><strong>Percepat simulasi DEMO</strong><p className="small">Isi nilai contoh sesuai konversi model. Hasil tetap ditandai sebagai data contoh.</p></div>
          <button disabled={busy || !master} onClick={fillExamples}>Isi Contoh Nilai Otomatis (DEMO)</button>
        </div>
      </Notice>}
      {dirty && <Notice>Ada perubahan nilai manual yang belum disimpan. Tombol “Simpan & Lanjut” akan menyimpan dan memvalidasi nilai terlebih dahulu.</Notice>}
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
              key={id}
              className={tab === id ? "" : "secondary"}
              onClick={() => setTab(id)}
            >
              {title}
            </button>
          ))}
        </div>
        <Field label="Filter semester">
          <select value={semester} onChange={e => setSemester(e.target.value)}>
            <option value="">Semua semester (1–4)</option>
            {[1, 2, 3, 4].map(n => (
              <option key={n} value={n}>
                Semester {n}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {!master && !error && <Notice>Memuat daftar mata kuliah kurikulum…</Notice>}

      {master && tab === "import" && (
        <article className="card">
          <div className="spread wrap">
            <h2>Impor Transkrip: Excel (.xlsx) / CSV</h2>
            <div className="actions">
              <a className="button secondary compact" href={"/api/v1" + base + "/grades/template?format=csv"}>
                Unduh Template CSV
              </a>
              <a className="button secondary compact" href={"/api/v1" + base + "/grades/template?format=xlsx"}>
                Unduh Template XLSX
              </a>
            </div>
          </div>
          <p>
            Pastikan header berkas mencakup: <strong>semester, kode_mk, nama_mk, nilai_huruf</strong>. Berkas maksimal 10 MB, tanpa formula atau makro.
          </p>

          <div
            className={"upload-zone " + (isDragging ? "is-dragging" : "")}
            aria-disabled={locked || busy}
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
            <p className="small muted">atau pilih berkas transkrip dari perangkat Anda (.xlsx atau .csv)</p>

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
              <div className="badge demo" style={{ margin: "12px 0", padding: "6px 14px", fontSize: "12px" }}>
                ✓ Berkas terpilih: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}

            <button
              disabled={locked || busy || !file}
              onClick={() => upload()}
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
            <button disabled={locked || busy} onClick={manual} className="compact">
              {busy ? "Menyimpan\u2026" : "Simpan Nilai Manual"}
            </button>
          </div>

          <div className="bar" style={{ marginBottom: 20 }}>
            <div style={{ width: `${fillPercentage}%`, background: "var(--primary)" }} />
          </div>

          {master.courses.length === 0 ? (
            <Notice>Belum ada mata kuliah yang berlaku pada semester ini.</Notice>
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
                  {master.courses
                    .filter(c => !semester || String(c.semester) === semester)
                    .map(c => {
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
                                  {g.letter_grade} (Bobot {number(g.grade_points, 1)})
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

          <div className="actions end" style={{ marginTop: 16 }}>
            <button disabled={locked || busy} onClick={manual}>
              {busy ? "Menyimpan\u2026" : "Simpan Nilai Manual"}
            </button>
          </div>
        </article>
      )}

      {master && (
        <article className="notice">
          <h3>Konversi Nilai Huruf ke Skor Normalisasi (Model {assessment.model_version})</h3>
          <div className="actions" style={{ marginTop: 8 }}>
            {master.conversions.map(g => (
              <span className="badge" key={g.id}>
                {g.letter_grade}: Bobot {number(g.grade_points, 1)} → Skor {number(g.normalized_score, 0)}
              </span>
            ))}
          </div>
        </article>
      )}

      {state && (
        <article className="card">
          <h2>Status Kelengkapan Nilai Akademik</h2>
          <p>
            {state.coverage?.provided || 0} / {state.coverage?.available || 0} mata kuliah terisi.
          </p>
          {state.missing_required?.length > 0 && (
            <Notice tone="error">
              Nilai wajib belum lengkap: {state.missing_required.join(", ")}
            </Notice>
          )}
          {state.errors?.map((e: string) => (
            <p key={e} style={{ color: "var(--danger)" }}>
              {e}
            </p>
          ))}
          <div className="metrics">
            {Object.entries(state.academic_scores || {}).map(([key, value]) => (
              <div key={key}>
                <strong>{number(Number(value))}</strong>
                <small>{key}</small>
              </div>
            ))}
          </div>
        </article>
      )}

      <div className="spread wrap section">
        <Link className="button secondary" href={"/asesmen/" + assessment.public_id + "/peminatan"}>
          ← Kembali ke Peminatan Awal
        </Link>
        <button disabled={busy || !canContinue} onClick={next}>
          {busy ? "Menyimpan dan menyiapkan tes…" : dirty ? "Simpan & Lanjut ke Tes Kompetensi →" : "Lanjut ke Tes Kompetensi →"}
        </button>
      </div>
      {!locked && missingRequired.length > 0 && <p className="small muted">Lengkapi {missingRequired.length} mata kuliah wajib agar dapat melanjutkan: {missingRequired.map(course => course.code).join(", ")}.</p>}

      <Modal open={!!preview} title="Pratinjau Impor Nilai Transkrip" onClose={() => !busy && setPreview(null)}>
        <Notice>
          Konfirmasi impor akan memperbarui nilai sesi ini. Nilai lama tetap aman jika validasi gagal.
        </Notice>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Kode MK</th>
                <th>Mata Kuliah</th>
                <th>Nilai Huruf</th>
              </tr>
            </thead>
            <tbody>
              {preview?.preview.map((r, i) => (
                <tr key={i}>
                  <td className="mono"><strong>{r.kode_mk}</strong></td>
                  <td>{r.nama_mk}</td>
                  <td><span className="badge">{r.nilai_huruf}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="actions end" style={{ marginTop: 16 }}>
          <button className="secondary" onClick={() => setPreview(null)} disabled={busy}>
            Batal
          </button>
          <button disabled={busy} onClick={() => upload(true)}>
            {busy ? "Menyimpan\u2026" : "Konfirmasi & Simpan Nilai"}
          </button>
        </div>
      </Modal>
    </>
  );
}
