import { useEffect, useState } from "react";
import { getActivationOption, type ActivationOption } from "../services/programApi";

export function useActivationOption(marketing: string, structure: number, profile: string | null,
  place: number | null, refreshKey: number, onActivated: () => void) {
  const key = JSON.stringify([marketing, structure, profile, place, refreshKey]);
  const [result, setResult] = useState<{ key: string; option: ActivationOption | null; error: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const pending = pendingKey === key;
  useEffect(() => {
    if (!profile || place === null) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;
    const load = async () => {
      try {
        const option = await getActivationOption(marketing, structure, profile, place, controller.signal);
        if (controller.signal.aborted) return;
        setResult({ key, option, error: false });
        if (pending && option.reason === "place_already_activated") {
          setPendingKey(null);
          onActivated();
          return;
        }
      } catch {
        if (controller.signal.aborted) return;
        setResult({ key, option: null, error: true });
      }
      if (pending && ++polls < 24) timer = setTimeout(() => void load(), 5000);
      else if (pending) setPendingKey(null);
    };
    void load();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [marketing, structure, profile, place, key, attempt, pending, onActivated]);
  const current = result?.key === key ? result : null;
  return { option: current?.option ?? null, error: current?.error ?? false, pending,
    retry: () => setAttempt(value => value + 1), submitted: () => setPendingKey(key) };
}
