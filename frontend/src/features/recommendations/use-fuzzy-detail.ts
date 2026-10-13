"use client";

import { useAssessment } from "@/features/assessments/context";
import { api } from "@/lib/api";
import { names } from "@/lib/format";
import type { FuzzyTrace } from "@/types/api";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export function useFuzzyDetail() {
  const { assessment, base } = useAssessment();
  const query = useSearchParams();
  const requested = query.get("specialization_code") || "ES-01";
  const [code, setCode] = useState(requested in names ? requested : "ES-01");
  useEffect(() => setCode(requested in names ? requested : "ES-01"), [requested]);
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
  useEffect(() => {
    if (trace && window.location.hash.startsWith("#rule-")) {
      try { document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({ block: "center" }); }
      catch { /* Malformed anchors do not affect the trace. */ }
    }
  }, [trace]);
  return {
    assessment, code, setCode, trace, error
  };
}
