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
  const [loading, setLoading] = useState(true);
  const [traceLoading, setTraceLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api<AdminAssessmentDetail>("/admin/assessments/" + id)
      .then(r => {
        if (!active)
          return;
        setValue(r.data);
        const topCode = r.data.result?.top_specialization_codes?.[0];
        if (topCode)
          setCode(topCode);
      })
      .catch(e => active && setError(e))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!value?.result)
      return;
    let active = true;
    setTraceLoading(true);
    api<FuzzyTrace>("/admin/assessments/" + id + "/trace?specialization_code=" + encodeURIComponent(code))
      .then(r => {
        if (!active)
          return;
        setTrace(r.data);
      })
      .catch(e => active && setError(e))
      .finally(() => active && setTraceLoading(false));
    return () => {
      active = false;
    };
  }, [id, code, value]);

  return {
    value, trace, setTrace, code, setCode, loading, traceLoading, error
  };
}
