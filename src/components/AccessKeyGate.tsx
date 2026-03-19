"use client";

import { useState, useEffect, useCallback } from "react";

const SESSION_KEY = "resume-parser-access-key";

interface AccessKeyGateProps {
  children: React.ReactNode;
  onKey: (key: string) => void;
}

export default function AccessKeyGate({ children, onKey }: AccessKeyGateProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      onKey(stored);
      setUnlocked(true);
    }
    // onKey is intentionally omitted — it's a stable React setter and
    // this effect should only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;

      setLoading(true);
      setError(null);

      // Validate by making a lightweight probe request
      try {
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-access-key": input.trim(),
          },
          body: JSON.stringify({ resume: "" }),
        });

        setLoading(false);

        // 400 = key accepted (fields missing, not auth failure)
        // 401 = wrong key
        if (res.status === 401) {
          setError("Invalid access key. Try again.");
          return;
        }

        if (res.status !== 400) {
          setError("Unexpected server error. Try again later.");
          return;
        }

        sessionStorage.setItem(SESSION_KEY, input.trim());
        onKey(input.trim());
        setUnlocked(true);
      } catch {
        setLoading(false);
        setError("Could not reach the server. Check your connection.");
      }
    },
    [input, onKey]
  );

  if (!mounted) return null;
  if (unlocked) return <>{children}</>;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg/90 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-2xl border border-brand-border bg-brand-surface p-8 shadow-2xl">
          <h2 className="mb-1 text-lg font-semibold text-brand-text">
            Access Required
          </h2>
          <p className="mb-6 text-sm text-brand-muted">
            Enter the access key to use Resume Parser.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Access key"
              autoFocus
              className="rounded-xl border border-brand-border bg-brand-bg px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted focus:border-brand-accent focus:outline-none transition-colors"
            />

            {error && <p className="text-xs text-brand-red">{error}</p>}

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-brand-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Verifying…" : "Enter"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
