"use client";

import { api, send } from "@/lib/api";
import type { Question, QuestionEditorState, Specialization } from "@/types/api";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

function createEmptyQuestion(): QuestionEditorState {
  return {
    status: "DRAFT",
    code: "",
    prompt: "",
    explanation: "",
    options: ["A", "B", "C", "D"].map(label => ({
      label,
      option_text: "",
      is_correct: label === "A"
    }))
  };
}

function normalizeSnapshot(q: QuestionEditorState | null): string {
  if (!q)
    return "";
  return JSON.stringify({
    code: q.code ?? "",
    specialization_id: String(q.specialization_id ?? ""),
    prompt: q.prompt ?? "",
    explanation: q.explanation ?? "",
    options: q.options.map(o => ({
      label: o.label,
      option_text: o.option_text,
      is_correct: o.is_correct
    }))
  });
}

export function useQuestionEditor({ id }: {
  id: string;
}) {
  const isNewRoute = id === "baru";
  const [question, setQuestion] = useState<QuestionEditorState | null>(() =>
    isNewRoute ? createEmptyQuestion() : null
  );
  const [baseline, setBaseline] = useState<QuestionEditorState | null>(() =>
    isNewRoute ? createEmptyQuestion() : null
  );
  const [specs, setSpecs] = useState<Specialization[]>([]);
  const [autoPublish, setAutoPublish] = useState(isNewRoute);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const skipDirtyGuardRef = useRef(false);

  useEffect(() => {
    let active = true;
    api<Specialization[]>("/specializations")
      .then(r => {
        if (!active)
          return;
        setSpecs(r.data);
        if (isNewRoute && r.data[0]?.id) {
          setQuestion(prev => prev && !prev.specialization_id ? { ...prev, specialization_id: r.data[0].id } : prev);
          setBaseline(prev => prev && !prev.specialization_id ? { ...prev, specialization_id: r.data[0].id } : prev);
        }
      })
      .catch(e => active && setError(e));

    if (!isNewRoute) {
      api<Question>("/admin/questions/" + id)
        .then(r => {
          if (!active)
            return;
          setQuestion(r.data);
          setBaseline(r.data);
        })
        .catch(e => active && setError(e));
    }

    return () => {
      active = false;
    };
  }, [id, isNewRoute]);

  const isDirty = useMemo(
    () => Boolean(question && baseline && normalizeSnapshot(question) !== normalizeSnapshot(baseline)),
    [question, baseline]
  );

  useEffect(() => {
    if (!isDirty)
      return;
    const warn = (event: BeforeUnloadEvent) => {
      if (skipDirtyGuardRef.current)
        return;
      event.preventDefault();
      event.returnValue = "";
    };
    const guardLink = (event: MouseEvent) => {
      if (skipDirtyGuardRef.current || event.defaultPrevented || !(event.target instanceof Element))
        return;
      const link = event.target.closest("a[href]");
      if (link && !window.confirm("Ada perubahan soal yang belum disimpan. Tinggalkan halaman dan abaikan perubahan?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guardLink, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guardLink, true);
    };
  }, [isDirty]);

  function addOption() {
    if (!question || busy || question.status !== "DRAFT" || question.options.length >= OPTION_LABELS.length)
      return;
    const nextLabel = OPTION_LABELS[question.options.length];
    setQuestion({
      ...question,
      options: [...question.options, { label: nextLabel, option_text: "", is_correct: false }]
    });
  }

  function removeOption(index: number) {
    if (!question || busy || question.status !== "DRAFT" || question.options.length <= 2)
      return;
    const remaining = question.options
      .filter((_, i) => i !== index)
      .map((opt, i) => ({
        ...opt,
        label: OPTION_LABELS[i]
      }));
    if (!remaining.some(o => o.is_correct) && remaining.length > 0) {
      remaining[0] = { ...remaining[0], is_correct: true };
    }
    setQuestion({
      ...question,
      options: remaining
    });
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !question)
      return;
    setBusy(true);
    setError(null);
    setMessage("");

    const targetId = question.id;
    const specId = Number(question.specialization_id || specs[0]?.id);
    const body = {
      code: question.code ?? "",
      prompt: question.prompt ?? "",
      explanation: question.explanation?.trim() ? question.explanation : null,
      specialization_id: specId,
      options: question.options.map((o) => ({
        label: o.label,
        option_text: o.option_text,
        is_correct: o.is_correct
      }))
    };

    try {
      const { data } = await send<Question>(
        "/admin/questions" + (targetId ? "/" + targetId : ""),
        body,
        targetId ? "PATCH" : "POST"
      );
      setQuestion(data);
      setBaseline(data);

      if (!targetId && autoPublish) {
        try {
          const published = await send<Question>("/admin/questions/" + data.id + "/publish");
          setQuestion(published.data);
          setBaseline(published.data);
          setMessage("Soal berhasil disimpan dan langsung dipublikasikan.");
          skipDirtyGuardRef.current = true;
          router.push("/admin/bank-soal");
          return;
        }
        catch (publishError) {
          // Jangan alihkan halaman agar pesan error publikasi terbaca di ErrorNotice.
          setError(publishError);
          setMessage("Draf soal tersimpan (kode " + data.code + "), namun publikasi otomatis gagal.");
          return;
        }
      }

      setMessage("Draf soal tersimpan.");
      if (isNewRoute && !targetId) {
        skipDirtyGuardRef.current = true;
        router.replace("/admin/bank-soal/" + data.id);
      }
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }

  async function action(kind: string) {
    if (busy || !question?.id)
      return;
    if (isDirty && !window.confirm("Ada perubahan formulir yang belum disimpan dan akan diabaikan. Lanjutkan?"))
      return;
    setBusy(true);
    setError(null);
    setMessage("");
    const targetId = question.id;
    try {
      const { data } = await send<Question>("/admin/questions/" + targetId + "/" + kind);
      if (kind === "revisions") {
        skipDirtyGuardRef.current = true;
        router.push("/admin/bank-soal/" + data.id);
      }
      else {
        setQuestion(data);
        setBaseline(data);
      }
      setMessage(kind === "publish" ? "Soal berhasil dipublikasikan!" : "Status soal diperbarui.");
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }

  const locked = question?.status !== "DRAFT";

  return {
    question,
    setQuestion,
    specs,
    autoPublish,
    setAutoPublish,
    busy,
    error,
    message,
    isDirty,
    addOption,
    removeOption,
    save,
    action,
    locked
  };
}
