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
    busy,
    loading,
    save
  } = useCourses();
  return (
    <>
      <span className="eyebrow">MATRIKS PRASYARAT INFERENSI</span>
      <h1>Kelola Mata Kuliah Prasyarat Peminatan</h1>
      <p>
        Bobot relevansi diatur pada versi model fuzzy. Metadata yang dirujuk
        model terpublikasi dipertahankan.
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
              <option key={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Urutkan">
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="code">Kode</option>
            <option value="name">Nama</option>
            <option value="semester">Semester</option>
          </select>
        </Field>
      </div>
      <ErrorNotice error={error} />
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
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="mono">
                      {r.code}
                    </td>
                    <td>
                      {r.name}
                    </td>
                    <td>
                      {r.credits}
                    </td>
                    <td>
                      {r.semester}
                    </td>
                    <td>
                      <span className="badge">
                        {r.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="secondary compact"
                        onClick={() => {
                          setEdit(r);
                          setError(null);
                        }}
                      >
                        Edit / nonaktifkan
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
              Aktif
            </label>
            <ErrorNotice error={error} />
            <button disabled={busy}>
              {busy ? "Menyimpan\u2026" : "Simpan mata kuliah"}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
