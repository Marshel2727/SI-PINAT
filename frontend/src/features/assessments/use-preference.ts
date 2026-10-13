"use client";

import { send } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAssessment } from "./context";

export function usePreference() {
  const { assessment, base, reload } = useAssessment();
  const [selected, setSelected] = useState(assessment.preferred_specialization_code || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [editingSemester, setEditingSemester] = useState(false);
  const router = useRouter();
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy)
      return;
    if (!selected) {
      setError(new Error("Pilih satu peminatan terlebih dahulu."));
      return;
    }
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await send(base + "/profile", {
        semester: Number(form.get("semester")), nim: assessment.student?.nim || null, full_name: assessment.student?.full_name || null, class_name: assessment.student?.class_name || null, preferred_specialization_code: selected
      }, "PATCH");
      await reload();
      router.push("/asesmen/" + assessment.public_id + "/nilai");
    }
    catch (e) {
      setError(e);
    }
    finally {
      setBusy(false);
    }
  }
  return {
    assessment, selected, setSelected, busy, error, save, editingSemester, setEditingSemester
  };
}
