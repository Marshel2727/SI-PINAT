"use client";

import { useAssessment } from "@/features/assessments/context";
import { api, send } from "@/lib/api";
import type { AssessmentItem } from "@/types/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useCompetencyTest() {
  const { assessment, base, reload } = useAssessment();
  const router = useRouter();
  const [items, setItems] = useState<AssessmentItem[]>([]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState<{
    item: string;
    option: string;
  } | null>(null);
  const [saved, setSaved] = useState("");
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    let active = true;
    api<AssessmentItem[]>(base + "/test/items").then(r => {
      if (active)
        setItems(r.data);
    }).catch(setError).finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [base]);
  const visible = assessment.mode === "DEMO" ? items.filter(i => i.is_representative) : items;
  const current = visible[index];
  const answered = items.filter(i => i.answer).length;
  const userCount = items.filter(i => i.answer?.answer_source === "USER").length;
  const exampleCount = answered - userCount;
  async function answer(item: string, option: string) {
    if (busy)
      return;
    setBusy(true);
    setPending({ item, option });
    setError(null);
    setSaved("Menyimpan jawaban\u2026");
    try {
      await send(base + "/test/items/" + item + "/answer", { option_id: option }, "PUT");
      setItems(values => values.map(i => i.id === item ? { ...i, answer: { option_id: option, answer_source: "USER" } } : i));
      setPending(null);
      setSaved("Jawaban tersimpan pada server.");
      await reload();
    }
    catch (e) {
      setError(e);
      setSaved("Jawaban belum tersimpan.");
    }
    finally {
      setBusy(false);
    }
  }
  async function fill() {
    if (busy)
      return;
    setBusy(true);
    setError(null);
    try {
      const r = await send<AssessmentItem[]>(base + "/demo/fill-examples");
      setItems(r.data);
      await reload();
      setSaved("Jawaban contoh dimuat dan diberi label EXAMPLE.");
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }
  async function finish() {
    if (busy)
      return;
    setBusy(true);
    setError(null);
    try {
      await send(base + "/complete");
      await reload();
      router.push("/asesmen/" + assessment.public_id + "/hasil");
    }
    catch (e) {
      setError(e);
      setConfirm(false);
    }
    finally {
      setBusy(false);
    }
  }
  return {
    assessment, items, index, setIndex, busy, loading, error, pending, saved, confirm, setConfirm, visible, current, answered, userCount, exampleCount, answer, fill, finish
  };
}
