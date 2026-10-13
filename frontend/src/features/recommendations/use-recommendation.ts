"use client";

import { useAssessment } from "@/features/assessments/context";
import { api } from "@/lib/api";
import type { Result } from "@/types/api";
import { useEffect, useState } from "react";

export function useRecommendation() {
  const { assessment, base } = useAssessment();
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    let active = true;
    api<Result>(base + "/result").then(r => active && setResult(r.data)).catch(setError);
    return () => {
      active = false;
    };
  }, [base]);
  return {
    assessment, base, result, error
  };
}
