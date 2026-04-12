"use client";

import { useState, useCallback } from "react";
import type { GitHubProfile } from "@/lib/types";

interface GitHubConnectProps {
  onProfile: (profile: GitHubProfile | null) => void;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-brand-border ${className ?? ""}`} />
  );
}

export default function GitHubConnect({ onProfile }: GitHubConnectProps) {
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = useCallback(async () => {
    const trimmed = username.trim().replace(/^@/, "");
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/github-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to fetch profile (${res.status})`);
      }

      const data = await res.json();
      setProfile(data.profile);
      onProfile(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch GitHub profile");
      setProfile(null);
      onProfile(null);
    }

    setLoading(false);
  }, [username, onProfile]);

  const handleClear = () => {
    setUsername("");
    setProfile(null);
    setError(null);
    onProfile(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-brand-text">
        GitHub Profile <span className="font-normal text-brand-muted">(optional)</span>
      </label>

      <div className="flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleFetch()}
          placeholder="username"
          disabled={loading}
          className="flex-1 rounded-xl border border-brand-border bg-brand-surface px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-muted focus:border-brand-accent focus:outline-none transition-colors"
        />
        {profile ? (
          <button
            onClick={handleClear}
            className="rounded-xl border border-brand-border bg-brand-surface px-4 py-2.5 text-sm text-brand-muted transition-colors hover:text-brand-text"
          >
            Clear
          </button>
        ) : (
          <button
            onClick={handleFetch}
            disabled={!username.trim() || loading}
            className="rounded-xl bg-brand-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Fetching…" : "Connect"}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-brand-red">{error}</p>}

      {loading && (
        <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
            <div className="flex gap-2 mt-1">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>
      )}

      {profile && (
        <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-brand-text">@{profile.username}</span>
              <span className="text-xs text-brand-muted">{profile.publicRepos} repos · {profile.followers} followers</span>
            </div>
            {profile.bio && (
              <p className="text-xs text-brand-muted">{profile.bio}</p>
            )}
            {profile.topLanguages.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.topLanguages.map((lang) => (
                  <span
                    key={lang}
                    className="rounded-full border border-brand-border bg-brand-bg px-2 py-0.5 text-xs text-brand-text"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            )}
            {profile.repos.length > 0 && (
              <div className="mt-1 flex flex-col gap-1">
                {profile.repos.slice(0, 3).map((repo) => (
                  <div key={repo.name} className="flex items-center gap-2 text-xs">
                    <span className="text-brand-text">{repo.name}</span>
                    {repo.language && <span className="text-brand-muted">{repo.language}</span>}
                    {repo.stars > 0 && <span className="text-brand-muted">⭐ {repo.stars}</span>}
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-brand-green mt-1">✓ GitHub data will be included in your analysis</p>
          </div>
        </div>
      )}
    </div>
  );
}
