"use client";

import { ErrorNotice, Notice, Steps } from "@/components/ui";
import { useStudentSession } from "@/features/student-auth/student-session-context";
import { ApiError, api } from "@/lib/api";
import { forgetAssessment, rememberAssessment, type AssessmentStage } from "@/lib/assessment-session";
import { formatRemainingTime, time } from "@/lib/format";
import type { Assessment } from "@/types/api";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const { student, loading: studentLoading } = useStudentSession();
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
      if (err instanceof ApiError && [401, 403, 404, 410].includes(err.status)) {
        forgetAssessment(publicId);
      }
      if (err instanceof ApiError && (err.status === 401 || (!student && !studentLoading && err.status === 404))) {
        router.replace(`/masuk?next=${encodeURIComponent(path)}`);
        return;
      }
      setError(err);
    });
  }, [reload, path, publicId, router, student, studentLoading]);

  useEffect(() => {
    if (!studentLoading && !student && error instanceof ApiError && error.status === 404) {
      router.replace(`/masuk?next=${encodeURIComponent(path)}`);
    }
  }, [studentLoading, student, error, router, path]);

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
  const isCompleted = assessment?.status === "COMPLETED";
  const maxReachable = isCompleted
    ? 4
    : assessment
      ? assessment.preferred_specialization_code
        ? Math.max(stage, 2)
        : stage
      : stage;

  const allowedSteps = !assessment
    ? []
    : isCompleted
      ? [2, 4]
      : assessment.status === "IN_PROGRESS"
        ? []
        : assessment.preferred_specialization_code
          ? [1, 2]
          : [1];

  const completedLockedStage = isCompleted && (stage === 1 || stage === 3);

  return (
    <main id="main-content" className="container section">
      <Steps
        active={stage}
        publicId={publicId}
        locked={!assessment || assessment.status === "IN_PROGRESS"}
        maxReachable={maxReachable}
        allowedSteps={allowedSteps}
      />
      <ErrorNotice error={error} />
      {Boolean(error) && !assessment && (
        <div className="card section">
          <h2>Sesi Asesmen Tidak Dapat Dibuka</h2>
          <p className="small muted">
            Sesi tidak ditemukan, sudah kedaluwarsa, atau akun Anda belum masuk.
          </p>
          <div className="actions">
            <Link className="button" href="/">
              Kembali ke Beranda
            </Link>
            <Link className="button secondary" href="/masuk">
              Masuk Akun TEKOM
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
              {remaining && !isCompleted ? ` · Sisa waktu sesi: ${remaining}` : ""}
            </small>
          </div>
          {completedLockedStage ? (
            <Notice>
              <div className="spread wrap">
                <div>
                  <strong>
                    {stage === 3
                      ? "Tes kompetensi sudah selesai dan terkunci."
                      : "Tahap peminatan awal sudah dikunci setelah asesmen selesai."}
                  </strong>
                  <p className="small" style={{ margin: "4px 0 0" }}>
                    Tes kompetensi hanya dikerjakan 1 kali per akun. Kamu tetap dapat memperbarui nilai akademik untuk menghitung ulang rekomendasi.
                  </p>
                </div>
                <div className="actions">
                  <Link className="button" href={"/asesmen/" + publicId + "/hasil"}>
                    Buka Hasil Rekomendasi →
                  </Link>
                  <Link className="button secondary" href={"/asesmen/" + publicId + "/nilai"}>
                    Edit Nilai Akademik
                  </Link>
                </div>
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
