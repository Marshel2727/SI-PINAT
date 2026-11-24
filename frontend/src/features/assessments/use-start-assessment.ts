"use client";

import { send } from "@/lib/api";
import { readRememberedAssessment, rememberAssessment, type RememberedAssessment } from "@/lib/assessment-session";
import type { Assessment } from "@/types/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useStartAssessment(options?: { listenGlobal?: boolean }) {
  const listenGlobal = options?.listenGlobal ?? true;
  const [open, setOpen] = useState(false);
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
    window.addEventListener("sipinat-session-change", syncRemembered);

    if (listenGlobal) {
      if (new URLSearchParams(window.location.search).get("mulai") === "baru") {
        openNew();
      }
      window.addEventListener("sipinat-start-new", openNew);
    }

    return () => {
      window.removeEventListener("sipinat-session-change", syncRemembered);
      if (listenGlobal) {
        window.removeEventListener("sipinat-start-new", openNew);
      }
    };
  }, [listenGlobal]);

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
        mode: "FULL",
        semester: Number(form.get("semester")),
        nim: form.get("nim"),
        full_name: form.get("full_name"),
        class_name: form.get("class_name") || null,
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
    busy,
    error,
    start,
    unfinishedSession,
  };
}
