"use client";

import { ErrorNotice, Field, Notice } from "@/components/ui";
import { descriptions, icons, names } from "@/lib/format";
import { usePreference } from "./use-preference";

export function Preference() {
  const { assessment, selected, setSelected, busy, error, save, editingSemester, setEditingSemester } = usePreference();
  return (
    <>
      <span className="eyebrow">TAHAP 1 DARI 4</span>
      <h1>Pilih Peminatan yang Paling Kamu Minati</h1>
      <p className="lead">Pilihan awal dicatat sebagai bahan pembanding. Rekomendasi dihitung murni dari nilai akademik dan tes kompetensi.</p>
      <Notice>Memilih suatu peminatan tidak menambah skornya dan tidak memecahkan hasil seri (hasil rekomendasi sepenuhnya obyektif).</Notice>
      <form onSubmit={save}>
        <div className="three-columns">
          {Object.entries(names).map(([code, name]) => (
            <label
              className={"card specialization selectable " + (selected === code ? "selected" : "")}
              key={code}
            >
              <div className="spread">
                <span className="mono">
                  {code}
                </span>
                <input
                  type="radio"
                  name="preference"
                  value={code}
                  checked={selected === code}
                  onChange={() => setSelected(code)}
                />
              </div>
              <div className="title-icon">
                <span className="icon-box">
                  <img src={"/images/" + icons[code]} alt="" />
                </span>
                <h2>
                  {name}
                </h2>
              </div>
              <p>
                {descriptions[code]}
              </p>
              {selected === code ? (
                <span className="badge demo">✓ Terpilih sebagai preferensi awal</span>
              ) : (
                <small className="muted">Klik untuk memilih</small>
              )}
            </label>
          ))}
        </div>

        {/* Info profil peserta tanpa meminta ulang input semester */}
        <div className="card section">
          {!editingSemester && <input type="hidden" name="semester" value={assessment.current_semester} />}
          <div className="spread wrap">
            <div>
              <span className="eyebrow">DATA PESERTA ASESMEN</span>
              <strong>{assessment.student ? assessment.student.full_name : "Peserta Sesi DEMO"}</strong>
              <p className="small muted" style={{ margin: "2px 0 0" }}>
                {assessment.student ? `NIM: ${assessment.student.nim} ${assessment.student.class_name ? `· Kelas: ${assessment.student.class_name}` : ""}` : "Mode eksplorasi terpandu"}
              </p>
            </div>
            {editingSemester ? <Field label="Koreksi semester saat ini">
              <input name="semester" type="number" min={1} max={14} defaultValue={assessment.current_semester} required disabled={busy} />
            </Field> : <div className="actions">
              <span className="badge">Semester Aktif: {assessment.current_semester}</span>
              <button type="button" className="secondary compact" disabled={busy} onClick={() => setEditingSemester(true)}>Ubah</button>
            </div>}
          </div>
        </div>

        <ErrorNotice error={error} />
        <div className="actions end">
          <button disabled={busy}>
            {busy ? "Menyimpan preferensi\u2026" : "Simpan dan lanjut ke input nilai \u2192"}
          </button>
        </div>
      </form>
    </>
  );
}
