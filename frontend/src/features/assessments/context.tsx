"use client";

import { ErrorNotice, Notice, Steps } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { forgetAssessment, rememberAssessment, type AssessmentStage } from "@/lib/assessment-session";
import { formatRemainingTime, time } from "@/lib/format";
import type { Assessment } from "@/types/api";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type State = {
  assessment: Assessment;
  reload: () => Promise<void>;
  base: string;
};

const Context = createContext<State | null>(null);

export const useAssessment = () => {
  const value = useContext(Context);
  if (!value)
    throw new Error("Assessment provider required");
  return value;
};

export function AssessmentProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { publicId } = useParams<{
    publicId: string;
  }>();
  const path = usePathname();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const base = "/assessments/" + publicId;

  const reload = useCallback(async () => {
    const value = await api<Assessment>(base);
    setAssessment(value.data);
    setError(null);
  }, [base]);

  useEffect(() => {
    reload().catch((err: unknown) => {
      setError(err);
      if (err instanceof ApiError && [401, 403, 404, 410].includes(err.status)) {
        forgetAssessment(publicId);
      }
    });
  }, [reload, path, publicId]);

  useEffect(() => {
    if (!assessment?.expires_at || assessment.status === "COMPLETED") {
      return;
    }

    const timer = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, [assessment?.expires_at, assessment?.status]);

  const stage = path.endsWith("/peminatan")
    ? 1
    : path.endsWith("/nilai")
      ? 2
      : path.endsWith("/tes")
        ? 3
        : 4;

  useEffect(() => {
    if (assessment) {
      const stages: AssessmentStage[] = ["peminatan", "nilai", "tes", "hasil"];
      rememberAssessment(assessment, stages[stage - 1]);
    }
  }, [assessment, stage]);

  const remaining = formatRemainingTime(assessment?.expires_at, nowMs);
  const maxReachable = assessment
    ? assessment.preferred_specialization_code
      ? Math.max(stage, 2)
      : stage
    : stage;

  return (
    <main id="main-content" className="container section">
      <Steps
        active={stage}
        publicId={publicId}
        locked={!assessment || ["IN_PROGRESS", "COMPLETED"].includes(assessment.status)}
        maxReachable={maxReachable}
      />
      <ErrorNotice error={error} />
      {Boolean(error) && !assessment && (
        <div className="card section">
          <h2>Sesi Asesmen Tidak Dapat Dibuka</h2>
          <p className="small muted">
            Sesi mungkin sudah melewati batas waktu 24 jam, tidak ditemukan, atau dibuka dari browser tanpa cookie sesi ini.
          </p>
          <div className="actions">
            <Link className="button" href="/">
              Kembali ke Beranda
            </Link>
            <Link className="button secondary" href="/?mulai=baru">
              Mulai Penentuan Peminatan Baru
            </Link>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setError(null);
                reload().catch(setError);
              }}
            >
              Muat Ulang
            </button>
          </div>
        </div>
      )}
      {!assessment && !error && <Notice>Memuat sesi asesmen…</Notice>}
      {assessment && (
        <Context.Provider value={{ assessment, reload, base }}>
          <div className="session-meta wrap">
            <span className="badge">ASESMEN PEMINATAN</span>
            <small title={assessment.expires_at ? `Berlaku hingga ${time(assessment.expires_at)}` : undefined}>
              Model {assessment.model_version}
              {remaining && assessment.status !== "COMPLETED" ? ` · Sisa waktu sesi: ${remaining}` : ""}
            </small>
          </div>
          {assessment.status === "COMPLETED" && stage < 4 ? (
            <Notice>
              <div className="spread wrap">
                <div>
                  <strong>Asesmen sudah selesai dan seluruh input terkunci.</strong>
                </div>
                <Link className="button" href={"/asesmen/" + publicId + "/hasil"}>
                  Buka Hasil Rekomendasi →
                </Link>
              </div>
            </Notice>
          ) : assessment.status === "IN_PROGRESS" && stage < 3 ? (
            <Notice>
              <div className="spread wrap">
                <div>
                  <strong>Tahap peminatan dan nilai akademik telah dikunci</strong>
                  <p className="small" style={{ margin: "4px 0 0" }}>
                    Tes kompetensi sedang berlangsung ({assessment.progress.answered}/{assessment.question_count} soal terjawab). Lanjutkan tes hingga selesai untuk melihat hasil rekomendasi.
                  </p>
                </div>
                <Link className="button" href={"/asesmen/" + publicId + "/tes"}>
                  Lanjutkan Tes Kompetensi →
                </Link>
              </div>
            </Notice>
          ) : (
            children
          )}
        </Context.Provider>
      )}
    </main>
  );
}
