"use client";

import { api, send } from "@/lib/api";
import type { Question, QuestionEditorState, Specialization } from "@/types/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useQuestionEditor({ id }: {
  id: string;
}) {
  const [question, setQuestion] = useState<QuestionEditorState | null>(id === "baru" ? {
    status: "DRAFT", options: ["A", "B", "C", "D"].map(label => ({ label, option_text: "", is_correct: label === "A" }))
  } : null);
  const [specs, setSpecs] = useState<Specialization[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    api<Specialization[]>("/specializations").then(r => setSpecs(r.data)).catch(setError);
    if (id !== "baru")
      api<Question>("/admin/questions/" + id).then(r => setQuestion(r.data)).catch(setError);
  }, [id]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !question)
      return;
    setBusy(true);
    setError(null);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const autoPublish = form.get("auto_publish") === "on";
    const body = {
      code: form.get("code"),
      prompt: form.get("prompt"),
      explanation: form.get("explanation") || null,
      specialization_id: Number(form.get("specialization_id")),
      options: question.options.map((o) => ({ label: o.label, option_text: o.option_text, is_correct: o.is_correct }))
    };

    try {
      const { data } = await send<Question>("/admin/questions" + (id === "baru" ? "" : "/" + id), body, id === "baru" ? "POST" : "PATCH");
      setQuestion(data);

      if (autoPublish) {
        try {
          const published = await send<Question>("/admin/questions/" + data.id + "/publish");
          setQuestion(published.data);
          setMessage("Soal berhasil disimpan dan langsung dipublikasikan.");
          router.push("/admin/bank-soal");
          return;
        } catch {
          setMessage("Draf soal tersimpan, namun belum memenuhi syarat kunci untuk dipublikasikan.");
        }
      } else {
        setMessage("Draf soal tersimpan.");
      }

      if (id === "baru")
        router.replace("/admin/bank-soal/" + data.id);
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }

  async function action(kind: string) {
    if (busy)
      return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const { data } = await send<Question>("/admin/questions/" + id + "/" + kind);
      if (kind === "revisions")
        router.push("/admin/bank-soal/" + data.id);
      else
        setQuestion(data);
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
    question, setQuestion, specs, busy, error, message, save, action, locked
  };
}
