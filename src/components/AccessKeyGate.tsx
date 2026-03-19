"use client";

import { useState, useEffect } from "react";

const SESSION_KEY = "resume-parser-api-key";

interface AccessKeyGateProps {
  children: React.ReactNode;
  onKey: (key: string) => void;
  onDemo?: () => void;
  forceShow?: boolean;
}

export default function AccessKeyGate({ children, onKey, onDemo, forceShow }: AccessKeyGateProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();

    if (!trimmed) return;

    if (!trimmed.startsWith("sk-ant-")) {
      setError("That doesn't look like an Anthropic API key. Keys start with sk-ant-");
      return;
    }

    sessionStorage.setItem(SESSION_KEY, trimmed);
    onKey(trimmed);
    setUnlocked(true);
  };

  if (!mounted) return null;
  if (unlocked && !forceShow) return <>{children}</>;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg/90 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-2xl border border-brand-border bg-brand-surface p-8 shadow-2xl">
          <h2 className="mb-1 text-lg font-semibold text-brand-text">
            Your Anthropic API Key
          </h2>
          <p className="mb-6 text-sm text-brand-muted">
            Paste your Anthropic API key below. It's stored only in your browser session and sent directly to Anthropic — we never log, store, or see it.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="sk-ant-..."
              autoFocus
              className="rounded-xl border border-brand-border bg-brand-bg px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted focus:border-brand-accent focus:outline-none transition-colors"
            />

            {error && <p className="text-xs text-brand-red">{error}</p>}

            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-xl bg-brand-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Enter
            </button>

            <p className="text-center text-xs text-brand-muted">
              <a href={process.env.NEXT_PUBLIC_GITHUB_URL ?? "#"} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-text">View the source on GitHub</a> to verify.
            </p>

            {onDemo && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <span className="text-xs text-brand-muted">or</span>
                <button
                  type="button"
                  onClick={() => { setUnlocked(true); onDemo?.(); }}
                  className="w-full rounded-xl border border-brand-border bg-transparent py-3 text-sm font-medium text-brand-muted transition-colors hover:border-brand-accent hover:text-brand-text"
                >
                  Try Demo — no API key needed
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
