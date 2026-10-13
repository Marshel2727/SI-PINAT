"use client";

import { useAssessment } from "@/features/assessments/context";
import { api } from "@/lib/api";
import type { FuzzyTrace } from "@/types/api";
import { useEffect, useState } from "react";

export function useFuzzyDetail() {
  const { assessment, base } = useAssessment();
  const [code, setCode] = useState("ES-01");
  const [trace, setTrace] = useState<FuzzyTrace | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    let active = true;
    setTrace(null);
    setError(null);
    api<FuzzyTrace>(base + "/result/trace?specialization_code=" + encodeURIComponent(code)).then(r => active && setTrace(r.data)).catch(e => active && setError(e));
    return () => {
      active = false;
    };
  }, [base, code]);
  return {
    assessment, code, setCode, trace, error
  };
}
