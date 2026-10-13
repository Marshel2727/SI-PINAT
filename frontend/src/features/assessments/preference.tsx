"use client";

import { ErrorNotice, Field, Notice } from "@/components/ui";
import { descriptions, icons, names } from "@/lib/format";
import { usePreference } from "./use-preference";

export function Preference() {
  const { assessment, selected, setSelected, busy, error, save } = usePreference();
  return (
    <>
      <span className="eyebrow">TAHAP 1 DARI 4</span>
      <h1>Pilih Peminatan yang Paling Kamu Minati</h1>
      <p className="lead">Pilihan awal dicatat sebagai pembanding. Rekomendasi dihitung dari nilai akademik dan tes kompetensi.</p>
      <Notice>Memilih suatu peminatan tidak menambah skornya dan tidak memecahkan hasil seri.</Notice>
      <form onSubmit={save}>
        <div className="three-columns">
          {Object.entries(names).map(([code, name]) => <label
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
            {selected === code && <span className="badge demo">Terpilih sebagai preferensi awal</span>}
          </label>)}
        </div>
        <div className="card section">
          <Field label="Semester saat ini">
            <input
              name="semester"
              type="number"
              min="1"
              max="14"
              defaultValue={assessment.current_semester}
              required
            />
          </Field>
          {assessment.student && <p>{assessment.student.full_name} · NIM {assessment.student.nim}</p>}
        </div>
        <ErrorNotice error={error} />
        <div className="actions end">
          <button disabled={busy}>
            {busy ? "Menyimpan\u2026" : "Simpan dan lanjut ke nilai \u2192"}
          </button>
        </div>
      </form>
    </>
  );
}
