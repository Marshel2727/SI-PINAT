"use client";

import { api } from "@/lib/api";
import type { AdminAssessmentDetail, FuzzyTrace } from "@/types/api";
import { useEffect, useState } from "react";

export function useAdminAssessment({ id }: {
  id: string;
}) {
  const [value, setValue] = useState<AdminAssessmentDetail | null>(null);
  const [trace, setTrace] = useState<FuzzyTrace | null>(null);
  const [code, setCode] = useState("ES-01");
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    api<AdminAssessmentDetail>("/admin/assessments/" + id)
      .then(r => setValue(r.data))
      .catch(setError);
  }, [id]);
  useEffect(() => {
    if (value?.result)
      api<FuzzyTrace>("/admin/assessments/" + id + "/trace?specialization_code=" + code)
        .then(r => setTrace(r.data))
        .catch(setError);
  }, [id, code, value]);
  return {
    value, trace, setTrace, code, setCode, error
  };
}
