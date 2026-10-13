"use client";

import { ErrorNotice, Notice, Steps } from "@/components/ui";
import { api } from "@/lib/api";
import { rememberAssessment, type AssessmentStage } from "@/lib/assessment-session";
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

export function AssessmentProvider({ children }: {
  children: ReactNode;
}) {
  const { publicId } = useParams<{
    publicId: string;
  }>();
  const path = usePathname();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState<unknown>(null);
  const base = "/assessments/" + publicId;
  const reload = useCallback(async () => {
    const value = await api<Assessment>(base);
    setAssessment(value.data);
    setError(null);
  }, [base]);
  useEffect(() => {
    reload().catch(setError);
  }, [reload, path]);
  const stage = path.endsWith("/peminatan")
    ? 1
    : path.endsWith("/nilai")
      ? 2
      : path.endsWith("/tes")
        ? 3
        : 4;
  useEffect(() => {
    if (assessment) rememberAssessment(assessment, (["peminatan", "nilai", "tes", "hasil"] as AssessmentStage[])[stage - 1]);
  }, [assessment, stage]);
  return (
    <main className="container section">
      <Steps active={stage} publicId={publicId} locked={!assessment || ["IN_PROGRESS", "COMPLETED"].includes(assessment.status)} />
      <ErrorNotice error={error} />
      {!assessment && !error && <Notice>Memuat sesi asesmen…</Notice>}
      {assessment && (
        <Context.Provider value={{ assessment, reload, base }}>
          <div className="session-meta">
            <span className={"badge " + (assessment.mode === "DEMO" ? "demo" : "")}>
              {assessment.mode === "DEMO"
                ? "DEMO \u00B7 DATA CONTOH" : "ASESMEN FULL"}
            </span>
            <small>Model {assessment.model_version}</small>
          </div>
          {assessment.status === "COMPLETED" && stage < 4 ? (
            <Notice>
              Asesmen sudah selesai dan input terkunci.{" "}
              <Link href={"/asesmen/" + publicId + "/hasil"}>Buka hasil</Link>
            </Notice>
          ) : (children)}
        </Context.Provider>
      )}
    </main>
  );
}
