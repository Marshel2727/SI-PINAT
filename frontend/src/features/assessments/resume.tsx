"use client";

import { Notice } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { forgetAssessment, readRememberedAssessment, resumeStage, type RememberedAssessment } from "@/lib/assessment-session";
import type { Assessment } from "@/types/api";
import Link from "next/link";
import { useEffect, useState } from "react";

export function ResumeAssessment() {
  const [session, setSession] = useState<RememberedAssessment | null>(null);
  const [completed, setCompleted] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    let generation = 0;
    async function refresh() {
      const version = ++generation;
      const remembered = readRememberedAssessment();
      setSession(null);
      setUnavailable(false);
      if (!remembered) return;
      try {
        const { data } = await api<Assessment>("/assessments/" + remembered.publicId);
        if (!active || generation !== version) return;
        setCompleted(data.status === "COMPLETED");
        setSession({ ...remembered, stage: resumeStage(data, remembered.stage) });
      } catch (error) {
        if (!active || generation !== version) return;
        if (error instanceof ApiError && [401, 403, 404, 410].includes(error.status)) {
          forgetAssessment(remembered.publicId);
        } else {
          setSession(remembered);
          setUnavailable(true);
        }
      }
    }
    void refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("sipinat-session-change", refresh);
    return () => {
      active = false;
      window.removeEventListener("storage", refresh);
      window.removeEventListener("sipinat-session-change", refresh);
    };
  }, []);
  if (!session) return null;
  return <section className="container" aria-label="Sesi asesmen tersimpan">
    <Notice>
      <div className="spread wrap">
        <div>
          <strong>{completed ? "Hasil asesmen terakhir tersedia" : "Kamu memiliki sesi asesmen yang belum selesai"}</strong>
          <p className="small">{session.mode} · {unavailable ? "Status server belum dapat diperiksa. Sesi tersimpan tetap dapat dicoba." : "Lanjutkan progres yang tersimpan pada server."}</p>
        </div>
        <div className="actions">
          <Link className="button" href={`/asesmen/${session.publicId}/${session.stage}`}>{completed ? "Buka Hasil" : "Lanjutkan Sesi"}</Link>
          <button className="secondary" onClick={() => window.dispatchEvent(new Event("sipinat-start-new"))}>Mulai Baru</button>
        </div>
      </div>
    </Notice>
  </section>;
}
