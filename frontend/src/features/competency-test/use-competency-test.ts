"use client";

import { useAssessment } from "@/features/assessments/context";
import { api, prettyError, send } from "@/lib/api";
import type { AssessmentItem } from "@/types/api";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type PendingSave = { option: string; state: "saving" | "failed"; message?: string; };

export function useCompetencyTest() {
  const { assessment, base, reload } = useAssessment();
  const router = useRouter();
  const [items, setItems] = useState<AssessmentItem[]>([]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState<Record<string, PendingSave>>({});
  const pendingRef = useRef<Record<string, PendingSave>>({});
  const operationRef = useRef(false);
  const [notice, setNotice] = useState("");
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
  const pendingCount = Object.keys(pending).length;
  const savingCount = Object.values(pending).filter(value => value.state === "saving").length;
  const failedCount = pendingCount - savingCount;
  const saved = savingCount ? `${savingCount} jawaban sedang disimpan…` : failedCount ? `${failedCount} jawaban belum tersimpan.` : notice;
  function updatePending(item: string, value: PendingSave | null) {
    const next = { ...pendingRef.current };
    if (value) next[item] = value;
    else delete next[item];
    pendingRef.current = next;
    setPending(next);
  }
  async function answer(item: string, option: string) {
    if (operationRef.current || pendingRef.current[item]?.state === "saving")
      return;
    updatePending(item, { option, state: "saving" });
    setError(null);
    try {
      await send(base + "/test/items/" + item + "/answer", { option_id: option }, "PUT");
      setItems(values => values.map(i => i.id === item ? { ...i, answer: { option_id: option, answer_source: "USER" } } : i));
      updatePending(item, null);
      setNotice("Jawaban tersimpan pada server.");
    }
    catch (e) {
      setError(e);
      updatePending(item, { option, state: "failed", message: prettyError(e) });
    }
  }
  async function fill() {
    if (operationRef.current || Object.keys(pendingRef.current).length)
      return;
    operationRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const r = await send<AssessmentItem[]>(base + "/demo/fill-examples");
      setItems(r.data);
      await reload();
      setNotice("Jawaban contoh dimuat dan diberi label EXAMPLE.");
    }
    catch (e) {
      setError(e);
    }
    finally {
      operationRef.current = false;
      setBusy(false);
    }
  }
  async function finish() {
    if (operationRef.current || Object.keys(pendingRef.current).length)
      return;
    operationRef.current = true;
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
      operationRef.current = false;
      setBusy(false);
    }
  }
  function jumpToUnanswered() {
    for (let offset = 1; offset <= visible.length; offset++) {
      const candidate = (index + offset) % visible.length;
      const item = visible[candidate];
      if ((!item.answer || pending[item.id]?.state === "failed") && pending[item.id]?.state !== "saving") {
        setIndex(candidate);
        return;
      }
    }
  }
  return {
    assessment, items, index, setIndex, busy, loading, error, pending, pendingCount, savingCount, failedCount, saved, confirm, setConfirm, visible, current, answered, userCount, exampleCount, answer, fill, finish, jumpToUnanswered
  };
}
