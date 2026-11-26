"use client";

import { IconEye, IconEyeOff } from "@/components/icons";
import { ErrorNotice, Field, Modal, Notice, Pagination, StatusBadge } from "@/components/ui";
import { api, send } from "@/lib/api";
import type { AdminStudent } from "@/types/api";
import { useEffect, useState } from "react";

type ProgramMode = "TEKOM" | "CUSTOM";

interface StudentEditorState {
  id?: string;
  nim: string;
  full_name: string;
  class_name: string;
  programMode: ProgramMode;
  customProgram: string;
  is_active: boolean;
}

function isTekomProgram(value?: string | null): boolean {
  return (value ?? "").trim().toUpperCase() === "TEKOM";
}

export function Students() {
  const [rows, setRows] = useState<AdminStudent[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [studyProgram, setStudyProgram] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [refresh, setRefresh] = useState(0);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [modalError, setModalError] = useState<unknown>(null);
  const [message, setMessage] = useState("");

  const [edit, setEdit] = useState<StudentEditorState | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminStudent | null>(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const q = new URLSearchParams({
      search: debouncedSearch,
      page: String(page),
      page_size: "20",
    });
    if (studyProgram) {
      q.set("study_program", studyProgram);
    }

    api<AdminStudent[]>("/admin/students?" + q.toString())
      .then(r => {
        if (!active) return;
        setRows(r.data);
        setPages(r.meta?.total_pages || 1);
        setTotal(r.meta?.total ?? r.data.length);
      })
      .catch(e => active && setError(e))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [debouncedSearch, studyProgram, page, refresh]);

  function openCreateModal() {
    setModalError(null);
    setShowCreatePassword(false);
    setEdit({
      nim: "",
      full_name: "",
      class_name: "",
      programMode: "TEKOM",
      customProgram: "NON_TEKOM",
      is_active: true,
    });
  }

  function openEditModal(row: AdminStudent) {
    setModalError(null);
    const tekom = isTekomProgram(row.study_program);
    setEdit({
      id: row.id,
      nim: row.nim,
      full_name: row.full_name,
      class_name: row.class_name ?? "",
      programMode: tekom ? "TEKOM" : "CUSTOM",
      customProgram: tekom ? "NON_TEKOM" : row.study_program,
      is_active: row.is_active,
    });
  }

  function closeEditorModal() {
    if (busy) return;
    setModalError(null);
    setEdit(null);
  }

  function openResetModal(row: AdminStudent) {
    setModalError(null);
    setShowResetPassword(false);
    setResetTarget(row);
  }

  function closeResetModal() {
    if (busy) return;
    setModalError(null);
    setResetTarget(null);
  }

  async function saveStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !edit) return;

    const form = new FormData(event.currentTarget);
    const resolvedProgram =
      edit.programMode === "TEKOM"
        ? "TEKOM"
        : String(form.get("custom_study_program") || "NON_TEKOM").trim().toUpperCase() || "NON_TEKOM";

    setBusy(true);
    setModalError(null);
    setMessage("");

    try {
      if (edit.id) {
        await send(`/admin/students/${edit.id}`, {
          full_name: String(form.get("full_name") || "").trim(),
          class_name: String(form.get("class_name") || "").trim() || null,
          study_program: resolvedProgram,
          is_active: form.get("is_active") === "on",
        }, "PATCH");
        setMessage("Data akun mahasiswa berhasil diperbarui.");
      } else {
        await send("/admin/students", {
          nim: String(form.get("nim") || "").trim(),
          full_name: String(form.get("full_name") || "").trim(),
          class_name: String(form.get("class_name") || "").trim() || null,
          study_program: resolvedProgram,
          password: String(form.get("password") || ""),
          is_active: form.get("is_active") === "on",
        }, "POST");
        setMessage("Akun mahasiswa baru berhasil ditambahkan.");
      }
      setEdit(null);
      setRefresh(r => r + 1);
    } catch (e) {
      setModalError(e);
    } finally {
      setBusy(false);
    }
  }

  async function submitResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !resetTarget) return;

    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("new_password") || "");

    setBusy(true);
    setModalError(null);
    setMessage("");
    try {
      await send(`/admin/students/${resetTarget.id}/reset-password`, {
        new_password: newPassword,
      }, "POST");
      setMessage(`Kata sandi mahasiswa ${resetTarget.full_name} (${resetTarget.nim}) berhasil direset.`);
      setResetTarget(null);
    } catch (e) {
      setModalError(e);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: AdminStudent) {
    if (busy || busyId !== null) return;
    setBusyId(row.id);
    setError(null);
    setMessage("");
    try {
      const nextActive = !row.is_active;
      const { data } = await send<AdminStudent>(`/admin/students/${row.id}`, {
        is_active: nextActive,
      }, "PATCH");
      setRows(prev => prev.map(item => (item.id === row.id ? { ...item, ...data } : item)));
      setMessage(
        nextActive
          ? `Akun ${row.full_name} (${row.nim}) diaktifkan.`
          : `Akun ${row.full_name} (${row.nim}) dinonaktifkan.`
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-page-title">
          <h1>Mahasiswa</h1>
          <span className="admin-count-pill">{total}</span>
        </div>
        <div className="actions">
          <button type="button" className="compact" onClick={openCreateModal}>
            + Tambah Mahasiswa
          </button>
        </div>
      </header>

      <ErrorNotice error={error} />
      {message && <Notice tone="success">{message}</Notice>}

      <article className="card admin-table-card">
        <div className="admin-table-toolbar">
          <div className="field is-search">
            <span>Cari NIM atau nama</span>
            <input
              aria-label="Cari NIM atau nama mahasiswa"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Contoh: 250210501029 atau nama…"
            />
          </div>
          <Field label="Program Studi">
            <select
              value={studyProgram}
              onChange={e => {
                setStudyProgram(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua</option>
              <option value="TEKOM">TEKOM</option>
              <option value="NON_TEKOM">Non-TEKOM</option>
            </select>
          </Field>
        </div>

        {loading && <Notice>Memuat data mahasiswa…</Notice>}

        {!loading && !rows.length ? (
          <Notice>Belum ada data mahasiswa sesuai filter.</Notice>
        ) : (
          <div className="table-scroll" role="region" tabIndex={0} aria-label="Daftar akun mahasiswa">
            <table>
              <thead>
                <tr>
                  <th>NIM</th>
                  <th>Nama Lengkap</th>
                  <th>Program Studi</th>
                  <th>Asesmen</th>
                  <th>Status Akun</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const tekom = isTekomProgram(r.study_program);
                  return (
                    <tr key={r.id}>
                      <td className="mono">
                        <strong>{r.nim}</strong>
                      </td>
                      <td>
                        <strong>{r.full_name}</strong>
                        {r.class_name && (
                          <small className="block muted">{r.class_name}</small>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${tekom ? "accent" : "neutral"}`}>
                          {r.study_program}
                        </span>
                      </td>
                      <td>
                        {r.assessment_status ? (
                          <StatusBadge status={r.assessment_status} />
                        ) : (
                          <span className="small muted">Belum mulai</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`status-toggle-pill ${r.is_active ? "is-active" : "is-inactive"}`}
                          aria-pressed={r.is_active}
                          disabled={busy || busyId !== null}
                          onClick={() => void toggleActive(r)}
                          title={r.is_active ? "Klik untuk menonaktifkan" : "Klik untuk mengaktifkan"}
                        >
                          {busyId === r.id ? "…" : r.is_active ? "● Aktif" : "○ Nonaktif"}
                        </button>
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            type="button"
                            className="secondary btn-row"
                            onClick={() => openEditModal(r)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="secondary btn-row"
                            onClick={() => openResetModal(r)}
                          >
                            Reset Sandi
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={pages} totalItems={total} onChange={setPage} />
      </article>

      <Modal
        open={!!edit}
        title={edit?.id ? "Edit Mahasiswa" : "Tambah Mahasiswa"}
        dismissible={!busy}
        onClose={closeEditorModal}
      >
        {edit && (
          <form onSubmit={saveStudent} key={edit.id || "new-student"}>
            <Field label="NIM">
              <input
                name="nim"
                defaultValue={edit.nim}
                inputMode="numeric"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Contoh: 250210501029"
                required={!edit.id}
                disabled={Boolean(edit.id) || busy}
                minLength={4}
                maxLength={20}
              />
            </Field>

            <Field label="Nama Lengkap">
              <input
                name="full_name"
                defaultValue={edit.full_name}
                required
                minLength={2}
                maxLength={120}
                disabled={busy}
              />
            </Field>

            <Field label="Kelas (opsional)">
              <input
                name="class_name"
                defaultValue={edit.class_name}
                placeholder="Contoh: TEKOM A"
                maxLength={40}
                disabled={busy}
              />
            </Field>

            <Field label="Program Studi">
              <select
                value={edit.programMode}
                disabled={busy}
                onChange={e =>
                  setEdit({
                    ...edit,
                    programMode: e.target.value as ProgramMode,
                  })
                }
              >
                <option value="TEKOM">TEKOM (Teknik Komputer)</option>
                <option value="CUSTOM">Non-TEKOM / Prodi Lain</option>
              </select>
            </Field>

            {edit.programMode === "CUSTOM" && (
              <Field label="Kode / Nama Prodi Non-TEKOM">
                <input
                  name="custom_study_program"
                  defaultValue={edit.customProgram}
                  placeholder="Contoh: NON_TEKOM atau PTIK"
                  required
                  minLength={2}
                  maxLength={64}
                  disabled={busy}
                />
              </Field>
            )}

            {!edit.id && (
              <Field label="Kata Sandi Awal (minimal 6 karakter)">
                <div className="password-field-wrapper">
                  <input
                    name="password"
                    type={showCreatePassword ? "text" : "password"}
                    placeholder="Minimal 6 karakter"
                    required
                    minLength={6}
                    maxLength={512}
                    disabled={busy}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    aria-pressed={showCreatePassword}
                    aria-label={showCreatePassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    onClick={() => setShowCreatePassword(v => !v)}
                  >
                    {showCreatePassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </button>
                </div>
              </Field>
            )}

            <label className="checkbox" style={{ marginTop: 12 }}>
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={edit.is_active}
                disabled={busy}
              />
              Akun mahasiswa aktif
            </label>

            <ErrorNotice error={modalError} />

            <div className="actions end" style={{ marginTop: 16 }}>
              <button type="button" className="secondary" disabled={busy} onClick={closeEditorModal}>
                Batal
              </button>
              <button type="submit" disabled={busy}>
                {busy ? "Menyimpan…" : edit.id ? "Simpan Perubahan" : "Tambah Mahasiswa"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={!!resetTarget}
        title="Reset Kata Sandi Mahasiswa"
        dismissible={!busy}
        onClose={closeResetModal}
      >
        {resetTarget && (
          <form onSubmit={submitResetPassword} key={resetTarget.id}>
            <p className="small muted">
              Atur kata sandi baru untuk <strong>{resetTarget.full_name}</strong> (<span className="mono">{resetTarget.nim}</span>). Sesi login aktif mahasiswa akan dicabut.
            </p>
            <Field label="Kata Sandi Baru (minimal 6 karakter)">
              <div className="password-field-wrapper">
                <input
                  name="new_password"
                  type={showResetPassword ? "text" : "password"}
                  placeholder="Masukkan kata sandi baru"
                  required
                  minLength={6}
                  maxLength={512}
                  disabled={busy}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  aria-pressed={showResetPassword}
                  aria-label={showResetPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  onClick={() => setShowResetPassword(v => !v)}
                >
                  {showResetPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </Field>
            <ErrorNotice error={modalError} />
            <div className="actions end" style={{ marginTop: 16 }}>
              <button type="button" className="secondary" disabled={busy} onClick={closeResetModal}>
                Batal
              </button>
              <button type="submit" disabled={busy}>
                {busy ? "Menyimpan…" : "Reset Kata Sandi"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
