"use client";

import { useCallback, useEffect, useState } from "react";
import SkeletonBlock from "@/components/SkeletonBlock";
import SeverityPill from "@/components/SeverityPill";
import type { GitHubProfile } from "@/lib/types";

interface GitHubConnectProps {
  onProfile: (profile: GitHubProfile | null) => void;
  initialProfile?: GitHubProfile | null;
}

export default function GitHubConnect({ onProfile, initialProfile = null }: GitHubConnectProps) {
  const [username, setUsername] = useState(initialProfile?.username ?? "");
  const [profile, setProfile] = useState<GitHubProfile | null>(initialProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProfile(initialProfile);
    setUsername(initialProfile?.username ?? "");
  }, [initialProfile]);

  const handleFetch = useCallback(async () => {
    const trimmed = username.trim().replace(/^@/, "");
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/github-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to fetch profile (${response.status})`);
      }

      const data = await response.json();
      setProfile(data.profile);
      onProfile(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch GitHub profile");
      setProfile(null);
      onProfile(null);
    }

    setLoading(false);
  }, [onProfile, username]);

  const handleClear = () => {
    setUsername("");
    setProfile(null);
    setError(null);
    onProfile(null);
  };

  return (
    <div className="result-card">
      <div>
        <div className="eyebrow">optional context</div>
        <h2 style={{ fontSize: "1.15rem" }}>Add your GitHub profile</h2>
      </div>

      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleFetch();
            }
          }}
          placeholder="username"
          disabled={loading}
          className="text-input"
          style={{ flex: 1 }}
        />
        {profile ? (
          <button type="button" onClick={handleClear} className="btn-ghost">
            Clear
          </button>
        ) : (
          <button type="button" onClick={() => void handleFetch()} disabled={!username.trim() || loading} className="btn-primary">
            {loading ? "Fetching…" : "Connect"}
          </button>
        )}
      </div>

      {error ? <p style={{ color: "var(--ps-red)" }}>{error}</p> : null}

      {loading ? (
        <div className="github-preview" style={{ padding: "var(--space-4)", display: "grid", gap: "var(--space-3)" }}>
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-3 w-full" />
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <SkeletonBlock className="h-5 w-20" />
            <SkeletonBlock className="h-5 w-20" />
            <SkeletonBlock className="h-5 w-20" />
          </div>
        </div>
      ) : null}

      {profile ? (
        <div className="github-preview" style={{ padding: "var(--space-4)", display: "grid", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <div>
              <p>@{profile.username}</p>
              {profile.bio ? <p className="result-muted">{profile.bio}</p> : null}
            </div>
            <p className="subtle-note">
              {profile.publicRepos} repos · {profile.followers} followers
            </p>
          </div>

          {profile.topLanguages.length > 0 ? (
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              {profile.topLanguages.map((language) => (
                <SeverityPill key={language} tone="sage" label={language} />
              ))}
            </div>
          ) : null}

          {profile.repos.length > 0 ? (
            <div style={{ display: "grid", gap: "var(--space-2)" }}>
              {profile.repos.slice(0, 3).map((repo) => (
                <div key={repo.name} className="subcard" style={{ padding: "var(--space-3)" }}>
                  <p>{repo.name}</p>
                  <p className="result-muted">
                    {[repo.language, repo.stars > 0 ? `★ ${repo.stars}` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <p style={{ color: "var(--ps-green)" }}>GitHub context will be included in your analysis.</p>
        </div>
      ) : null}
    </div>
  );
}
