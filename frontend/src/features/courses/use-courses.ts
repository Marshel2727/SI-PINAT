"use client";

import { api, send } from "@/lib/api";
import type { Course, CourseEditorState } from "@/types/api";
import { useEffect, useState } from "react";

export function useCourses() {
  const [rows, setRows] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [semester, setSemester] = useState("");
  const [sort, setSort] = useState("code");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [edit, setEdit] = useState<CourseEditorState | null>(null);
  const [error, setError] = useState<unknown>(null);
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
    api<Course[]>("/admin/courses?" + q).then(r => {
      if (!active)
        return;
      setRows(r.data);
      setPages(r.meta?.total_pages || 1);
      setTotal(r.meta?.total || 0);
    }).catch(e => active && setError(e)).finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [debouncedSearch, semester, sort, page, refresh]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !edit)
      return;
    setBusy(true);
    setError(null);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await send("/admin/courses" + (edit.id ? "/" + edit.id : ""), {
        code: form.get("code"), name: form.get("name"), semester: Number(form.get("semester")), credits: Number(form.get("credits")), is_active: form.get("is_active") === "on"
      }, edit.id ? "PATCH" : "POST");
      setEdit(null);
      setMessage(edit.id ? "Perubahan mata kuliah berhasil disimpan." : "Mata kuliah baru berhasil ditambahkan.");
      setRefresh(r => r + 1);
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }

  async function toggleActive(course: Course) {
    if (busy || busyId !== null) return;
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
      setMessage(`Mata kuliah ${course.code} berhasil ${nextActive ? "diaktifkan (tampil)" : "dinonaktifkan (disembunyikan)"}.`);
    } catch (e) {
      setError(e);
    } finally {
      setBusyId(null);
    }
  }

  return {
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
  };
}
