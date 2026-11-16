"use client";

import { api, send } from "@/lib/api";
import type { Course, CourseEditorState } from "@/types/api";
import { useEffect, useState } from "react";

export function useCourses() {
  const [rows, setRows] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [semester, setSemester] = useState("");
  const [isActive, setIsActive] = useState<"" | "true" | "false">("");
  const [sort, setSort] = useState("code");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [edit, setEdit] = useState<CourseEditorState | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [modalError, setModalError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const q = new URLSearchParams({ search: debouncedSearch, sort, page: String(page) });
    if (semester)
      q.set("semester", semester);
    if (isActive)
      q.set("is_active", isActive);
    api<Course[]>("/admin/courses?" + q.toString())
      .then(r => {
        if (!active)
          return;
        setRows(r.data);
        setPages(r.meta?.total_pages || 1);
        setTotal(r.meta?.total ?? r.data.length);
      })
      .catch(e => active && setError(e))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [debouncedSearch, semester, isActive, sort, page, refresh]);

  function openModal(course: CourseEditorState) {
    setModalError(null);
    setEdit(course);
  }

  function closeModal() {
    if (busy)
      return;
    setModalError(null);
    setEdit(null);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !edit)
      return;
    setBusy(true);
    setModalError(null);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const isLocked = Boolean(edit.id && edit.is_locked_by_published);
    const nextIsActive = form.get("is_active") === "on";
    const body = {
      code: isLocked ? edit.code : form.get("code"),
      name: isLocked ? edit.name : form.get("name"),
      semester: isLocked ? edit.semester : Number(form.get("semester")),
      credits: isLocked ? edit.credits : Number(form.get("credits")),
      is_active: nextIsActive
    };
    try {
      await send("/admin/courses" + (edit.id ? "/" + edit.id : ""), body, edit.id ? "PATCH" : "POST");
      setEdit(null);
      setModalError(null);
      setMessage(
        edit.id
          ? "Perubahan mata kuliah berhasil disimpan."
          : "Mata kuliah baru berhasil ditambahkan. Lengkapi bobot mata kuliah ini pada model fuzzy DRAFT sebelum publikasi."
      );
      setRefresh(r => r + 1);
    }
    catch (e) {
      setModalError(e);
    }
    finally {
      setBusy(false);
    }
  }

  async function toggleActive(course: Course) {
    if (busy || busyId !== null)
      return;
    setBusyId(course.id);
    setError(null);
    setMessage("");
    try {
      const nextActive = !course.is_active;
      const { data } = await send<Course>("/admin/courses/" + course.id, {
        code: course.code,
        name: course.name,
        semester: course.semester,
        credits: course.credits,
        is_active: nextActive
      }, "PATCH");
      setRows(prev => prev.map(r => r.id === course.id ? data : r));
      setMessage(
        nextActive
          ? `Mata kuliah ${course.code} diaktifkan (tampil). Pastikan bobotnya terisi di Konfigurasi Fuzzy.`
          : `Mata kuliah ${course.code} dinonaktifkan (disembunyikan).`
      );
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusyId(null);
    }
  }

  return {
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
  };
}
