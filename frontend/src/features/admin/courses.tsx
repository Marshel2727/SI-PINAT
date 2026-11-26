"use client";

import { ErrorNotice, Field, Modal, Notice, Pagination } from "@/components/ui";
import Link from "next/link";
import { useCourses } from "./use-courses";

export function Courses() {
  const {
    rows,
    search,
    setSearch,
    semester,
    setSemester,
    isActive,
    setIsActive,
    sort,
    setSort,
    page,
    setPage,
    pages,
    total,
    edit,
    openModal,
    closeModal,
    error,
    modalError,
    message,
    busy,
    busyId,
    loading,
    save,
    toggleActive
  } = useCourses();

  const isEditLocked = Boolean(edit?.id && edit.is_locked_by_published);

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-page-title">
          <h1>Mata Kuliah</h1>
          <span className="admin-count-pill">{total}</span>
        </div>
        <div className="actions">
          <Link className="button secondary compact" href="/admin/model-fuzzy">
            Bobot Model →
          </Link>
          <button
            type="button"
            className="compact"
            onClick={() => openModal({ is_active: true, semester: 1, credits: 3 })}
          >
            + Tambah
          </button>
        </div>
      </header>

      <ErrorNotice error={error} />
      {message && <Notice tone="success">{message}</Notice>}

      <article className="card admin-table-card">
        <div className="admin-table-toolbar">
          <div className="field is-search">
            <span>Cari kode atau nama</span>
            <input
              aria-label="Cari kode atau nama mata kuliah"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari mata kuliah…"
            />
          </div>
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
          <Field label="Status">
            <select
              value={isActive}
              onChange={e => {
                setIsActive(e.target.value as "" | "true" | "false");
                setPage(1);
              }}
            >
              <option value="">Semua status</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
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

        {loading && <Notice>Memuat mata kuliah…</Notice>}

        {!loading && !rows.length ? (
          <Notice>Belum ada mata kuliah sesuai filter.</Notice>
        ) : (
          <div className="table-scroll" role="region" tabIndex={0} aria-label="Daftar mata kuliah kurikulum">
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
                      <strong>{r.code}</strong>
                      {r.is_locked_by_published && (
                        <small className="block muted" title="Dirujuk oleh model fuzzy terpublikasi">
                          Terkunci di model aktif
                        </small>
                      )}
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
                        className={`status-toggle-pill ${r.is_active ? "is-active" : "is-inactive"}`}
                        aria-pressed={r.is_active}
                        disabled={busy || busyId !== null}
                        onClick={() => toggleActive(r)}
                        title={r.is_active ? "Klik untuk menonaktifkan" : "Klik untuk mengaktifkan"}
                      >
                        {busyId === r.id ? "…" : (r.is_active ? "● Aktif" : "○ Nonaktif")}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="secondary btn-row"
                        onClick={() => openModal(r)}
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
        <Pagination page={page} total={pages} totalItems={total} onChange={setPage} />
      </article>

      <Modal
        open={!!edit}
        title={edit?.id ? "Edit mata kuliah" : "Tambah mata kuliah"}
        dismissible={!busy}
        onClose={closeModal}
      >
        {edit && (
          <form onSubmit={save} key={edit.id || "new"}>
            {isEditLocked && (
              <Notice>
                Metadata dikunci karena digunakan model aktif. Hanya status aktif yang dapat diubah.
              </Notice>
            )}
            <Field label="Kode MK">
              <input
                name="code"
                defaultValue={edit.code}
                autoCorrect="off"
                spellCheck={false}
                required
                maxLength={20}
                disabled={isEditLocked}
              />
            </Field>
            <Field label="Nama mata kuliah">
              <input
                name="name"
                defaultValue={edit.name}
                required
                maxLength={150}
                disabled={isEditLocked}
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
                  disabled={isEditLocked}
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
                  disabled={isEditLocked}
                />
              </Field>
            </div>
            <label className="checkbox">
              <input type="checkbox" name="is_active" defaultChecked={edit.is_active} />
              Mata kuliah aktif
            </label>
            <ErrorNotice error={modalError} />
            <button disabled={busy} style={{ marginTop: 12 }}>
              {busy ? "Menyimpan\u2026" : "Simpan mata kuliah"}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
