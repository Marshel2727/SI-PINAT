"use client";

import { ErrorNotice, Field, Modal, Notice, Pagination } from "@/components/ui";
import { useCourses } from "./use-courses";

export function Courses() {
  const {
    rows,
    search,
    setSearch,
    semester,
    setSemester,
    sort,
    setSort,
    page,
    setPage,
    pages,
    total,
    edit,
    setEdit,
    error,
    setError,
    message,
    busy,
    busyId,
    loading,
    save,
    toggleActive
  } = useCourses();

  return (
    <>
      <span className="eyebrow">MATRIKS PRASYARAT INFERENSI</span>
      <h1>Kelola Mata Kuliah Prasyarat Peminatan</h1>
      <p>
        Bobot relevansi diatur pada versi model fuzzy. Klik status untuk menampilkan atau menyembunyikan mata kuliah secara cepat.
      </p>
      <div className="spread">
        <span className="badge">{total} mata kuliah terdaftar</span>
        <button
          onClick={() => {
            setError(null);
            setEdit({ is_active: true, semester: 1, credits: 3 });
          }}
        >
          + Tambah mata kuliah
        </button>
      </div>
      <div className="filters">
        <Field label="Cari kode atau nama">
          <input
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari mata kuliah…"
          />
        </Field>
        <Field label="Semester">
          <select
            value={semester}
            onChange={e => {
              setSemester(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua semester</option>
            {[1, 2, 3, 4].map(n => (
              <option key={n} value={n}>
                Semester {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Urutkan">
          <select
            value={sort}
            onChange={e => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="code">Kode MK</option>
            <option value="name">Nama Mata Kuliah</option>
            <option value="semester">Semester</option>
          </select>
        </Field>
      </div>

      <ErrorNotice error={error} />
      {message && <Notice tone="success">{message}</Notice>}
      {loading && <Notice>Memuat mata kuliah…</Notice>}

      <article className="card">
        {!loading && !rows.length ? (
          <Notice>Belum ada mata kuliah sesuai filter.</Notice>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Kode MK</th>
                  <th>Mata kuliah</th>
                  <th>SKS</th>
                  <th>Semester</th>
                  <th>Status (Klik untuk Ubah)</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="mono">
                      <strong>{r.code}</strong>
                    </td>
                    <td>
                      {r.name}
                    </td>
                    <td>
                      {r.credits} SKS
                    </td>
                    <td>
                      Semester {r.semester}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="compact"
                        style={{
                          minHeight: 28,
                          padding: "3px 12px",
                          fontSize: "11px",
                          borderRadius: "999px",
                          background: r.is_active ? "#def5e8" : "#f1f3f8",
                          color: r.is_active ? "#165534" : "#555862",
                          border: r.is_active ? "1px solid #bcead0" : "1px solid #d1d5db",
                          cursor: "pointer",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5
                        }}
                        disabled={busy || busyId === r.id}
                        onClick={() => toggleActive(r)}
                        title={r.is_active ? "Klik untuk menyembunyikan / menonaktifkan" : "Klik untuk menampilkan / mengaktifkan"}
                      >
                        {busyId === r.id ? "…" : (r.is_active ? "● Aktif (Tampil)" : "○ Nonaktif (Sembunyi)")}
                      </button>
                    </td>
                    <td>
                      <button
                        className="secondary compact"
                        style={{ minHeight: 28, padding: "3px 12px", fontSize: "11.5px" }}
                        onClick={() => {
                          setEdit(r);
                          setError(null);
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={pages} onChange={setPage} />
      </article>

      <Modal
        open={!!edit}
        title={edit?.id ? "Edit mata kuliah" : "Tambah mata kuliah"}
        onClose={() => !busy && setEdit(null)}
      >
        {edit && (
          <form onSubmit={save} key={edit.id || "new"}>
            <Field label="Kode MK">
              <input
                name="code"
                defaultValue={edit.code}
                required
                maxLength={20}
              />
            </Field>
            <Field label="Nama mata kuliah">
              <input
                name="name"
                defaultValue={edit.name}
                required
                maxLength={150}
              />
            </Field>
            <div className="two-columns">
              <Field label="Semester">
                <input
                  name="semester"
                  type="number"
                  min="1"
                  max="4"
                  defaultValue={edit.semester}
                  required
                />
              </Field>
              <Field label="SKS">
                <input
                  name="credits"
                  type="number"
                  min="1"
                  max="12"
                  defaultValue={edit.credits}
                  required
                />
              </Field>
            </div>
            <label className="checkbox">
              <input type="checkbox" name="is_active" defaultChecked={edit.is_active} />
              Aktif (Tampil di kurikulum asesmen)
            </label>
            <ErrorNotice error={error} />
            <button disabled={busy} style={{ marginTop: 12 }}>
              {busy ? "Menyimpan\u2026" : "Simpan mata kuliah"}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
