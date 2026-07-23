"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Tiny client-side translation hook used by the chat panels. It calls
 * `/api/translate` for a given English text + target language, caches the
 * result in a per-instance Map for the rest of the session, and exposes the
 * loading + error state so the UI can show a spinner / "Try again" affordance.
 *
 * The cache key is the (text, target) pair, so the same English text can be
 * cached independently for multiple target languages without colliding.
 */
export function useTranslate() {
  const cache = useRef<Map<string, string>>(new Map());
  const inflight = useRef<Map<string, Promise<string>>>(new Map());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(
    async (text: string, targetLang: string): Promise<string | null> => {
      const trimmed = text.trim();
      if (!trimmed) return null;
      const key = `${targetLang}::${trimmed}`;

      const cached = cache.current.get(key);
      if (cached) return cached;
      const pending = inflight.current.get(key);
      if (pending) return pending;

      setLoading(true);
      setError(null);

      const promise = (async () => {
        try {
          const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: trimmed, targetLang }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = (await res.json()) as { translation: string };
          cache.current.set(key, data.translation);
          return data.translation;
        } catch (err) {
          console.error("[useTranslate]", err);
          setError("Não foi possível traduzir agora.");
          throw err;
        } finally {
          inflight.current.delete(key);
          setLoading(false);
        }
      })();

      inflight.current.set(key, promise);
      try {
        return await promise;
      } catch {
        return null;
      }
    },
    [],
  );

  return { translate, loading, error };
}
