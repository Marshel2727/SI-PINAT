"use client";

import { useAssessment } from "@/features/assessments/context";
import { api, downloadFile } from "@/lib/api";
import type { Result } from "@/types/api";
import { useEffect, useState } from "react";

export function useRecommendation() {
  const { assessment, base } = useAssessment();
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<unknown>(null);
  useEffect(() => {
    let active = true;
    api<Result>(base + "/result").then(r => active && setResult(r.data)).catch(e => active && setError(e));
    return () => {
      active = false;
    };
  }, [base]);

  async function downloadPdf() {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    setPdfError(null);
    try {
      await downloadFile(base + "/result/report.pdf", `ringkasan-sipinat-${assessment.public_id.slice(0, 8)}.pdf`);
    }
    catch (e) {
      setPdfError(e);
    }
    finally {
      setDownloadingPdf(false);
    }
  }

  return {
    assessment, base, result, error, downloadingPdf, pdfError, downloadPdf
  };
}
