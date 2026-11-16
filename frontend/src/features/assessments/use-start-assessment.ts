"use client";

import { send } from "@/lib/api";
import { readRememberedAssessment, rememberAssessment, type RememberedAssessment } from "@/lib/assessment-session";
import type { Assessment } from "@/types/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useStartAssessment() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("DEMO");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [unfinishedSession, setUnfinishedSession] = useState<RememberedAssessment | null>(null);
  const router = useRouter();

  useEffect(() => {
    const syncRemembered = () => {
      const remembered = readRememberedAssessment();
      setUnfinishedSession(remembered && remembered.stage !== "hasil" ? remembered : null);
    };

    const openNew = () => {
      syncRemembered();
      setError(null);
      setOpen(true);
    };

    syncRemembered();
    if (new URLSearchParams(window.location.search).get("mulai") === "baru") {
      openNew();
    }

    window.addEventListener("sipinat-start-new", openNew);
    window.addEventListener("sipinat-session-change", syncRemembered);
    return () => {
      window.removeEventListener("sipinat-start-new", openNew);
      window.removeEventListener("sipinat-session-change", syncRemembered);
    };
  }, []);

  async function start(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) {
      return;
    }

    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      const { data } = await send<Assessment>("/assessments", {
        mode,
        semester: Number(form.get("semester")),
        nim: mode === "FULL" ? form.get("nim") : null,
        full_name: mode === "FULL" ? form.get("full_name") : null,
        class_name: mode === "FULL" ? form.get("class_name") || null : null,
      });
      rememberAssessment(data, "peminatan");
      router.push("/asesmen/" + data.public_id + "/peminatan");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return {
    open,
    setOpen,
    mode,
    setMode,
    busy,
    error,
    start,
    unfinishedSession,
  };
}
