import { useEffect, useState } from "react";
import type { ReportSectionResponse } from "../services/uiReportApi";

// The caller memoizes load using only the filters relevant to this section.
export function useReportSection<T>(load: (signal: AbortSignal) => Promise<ReportSectionResponse<T>>, refresh: number, enabled = true) {
  const [response, setResponse] = useState<ReportSectionResponse<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    // Keep the last successful result visible while this section refreshes.
    void load(controller.signal).then(result => {
      if (!controller.signal.aborted) setResponse(result);
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [load, refresh, enabled]);
  return { data: response?.data ?? null, updatedAt: response?.generated_at, loading: enabled && loading, error };
}
