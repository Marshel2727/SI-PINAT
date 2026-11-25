"use client";

import { Notice } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { forgetAssessment, readRememberedAssessment, rememberAssessment, resumeStage, type RememberedAssessment } from "@/lib/assessment-session";
import { formatRemainingTime } from "@/lib/format";
import type { Assessment } from "@/types/api";
import Link from "next/link";
import { useEffect, useState } from "react";

export function ResumeAssessment() {
  const [session, setSession] = useState<RememberedAssessment | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [completed, setCompleted] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    let generation = 0;

    async function refresh() {
      const version = ++generation;
      const remembered = readRememberedAssessment();
      setSession(null);
      setAssessment(null);
      setUnavailable(false);
      if (!remembered) return;

      try {
        const { data } = await api<Assessment>("/assessments/" + remembered.publicId);
        if (!active || generation !== version) return;

        const nextStage = resumeStage(data, remembered.stage);
        setCompleted(data.status === "COMPLETED");
        setAssessment(data);
        setSession({
          ...remembered,
          stage: nextStage,
          expiresAt: data.expires_at ?? remembered.expiresAt ?? null,
          studentName: data.student?.full_name ?? remembered.studentName ?? null,
          studentNim: data.student?.nim ?? remembered.studentNim ?? null,
          currentSemester: data.current_semester,
          modelVersion: data.model_version,
          answeredCount: data.progress?.answered ?? 0,
          questionCount: data.question_count,
        });
        if (nextStage !== remembered.stage || data.expires_at !== remembered.expiresAt) {
          rememberAssessment(data, nextStage, false);
        }
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

  useEffect(() => {
    const expiresAt = assessment?.expires_at ?? session?.expiresAt;
    if (!expiresAt || completed) return;

    const timer = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, [assessment?.expires_at, session?.expiresAt, completed]);

  if (!session) return null;

  const studentName = assessment?.student?.full_name ?? session.studentName;
  const studentNim = assessment?.student?.nim ?? session.studentNim;
  const semester = assessment?.current_semester ?? session.currentSemester;
  const modelVersion = assessment?.model_version ?? session.modelVersion;
  const answered = assessment?.progress?.answered ?? session.answeredCount;
  const totalQuestions = assessment?.question_count ?? session.questionCount;
  const expiresAt = assessment?.expires_at ?? session.expiresAt;
  const remaining = !completed ? formatRemainingTime(expiresAt, nowMs) : null;

  function handleStartNew() {
    if (!completed) {
      const ok = window.confirm(
        "Kamu masih memiliki sesi asesmen yang belum selesai. Memulai sesi baru akan mengganti pintasan lanjut sesi ini. Lanjutkan?"
      );
      if (!ok) return;
    }
    window.dispatchEvent(new Event("sipinat-start-new"));
  }

  return (
    <section className="container" aria-label="Sesi asesmen tersimpan">
      <Notice>
        <div className="spread wrap">
          <div>
            <strong>
              {completed
                ? "Hasil asesmen terakhir tersedia"
                : "Kamu memiliki sesi asesmen yang belum selesai"}
            </strong>
            <p className="small" style={{ margin: "4px 0 0" }}>
              Sesi Asesmen
              {studentName ? ` · ${studentName}${studentNim ? ` (${studentNim})` : ""}` : ""}
              {semester ? ` · Semester ${semester}` : ""}
              {modelVersion ? ` · Model ${modelVersion}` : ""}
              {answered !== undefined && totalQuestions !== undefined
                ? ` · Progres tes ${answered}/${totalQuestions}`
                : ""}
              {remaining ? ` · Sisa waktu sesi: ${remaining}` : ""}
            </p>
            {unavailable && (
              <p className="small muted" style={{ margin: "2px 0 0" }}>
                Status server belum dapat diperiksa. Sesi tersimpan tetap dapat dicoba.
              </p>
            )}
          </div>
          <div className="actions">
            <Link className="button" href={`/asesmen/${session.publicId}/${session.stage}`}>
              {completed ? "Lihat Hasil Rekomendasi →" : "Lanjutkan Penentuan Peminatan →"}
            </Link>
            <button type="button" className="secondary" onClick={handleStartNew}>
              Mulai Asesmen Baru
            </button>
          </div>
        </div>
      </Notice>
    </section>
  );
}
