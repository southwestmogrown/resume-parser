"use client";

import { useCallback, useState } from "react";
import SkeletonBlock from "@/components/SkeletonBlock";
import SeverityPill from "@/components/SeverityPill";
import type { LinkedInProfile } from "@/lib/types";

interface LinkedInConnectProps {
  onProfile: (profile: LinkedInProfile | null) => void;
}

type Step = "url" | "paste" | "done";

function isLinkedInUrl(value: string): boolean {
  return /linkedin\.com\/in\//i.test(value);
}

export default function LinkedInConnect({ onProfile }: LinkedInConnectProps) {
  const [url, setUrl] = useState("");
  const [profileText, setProfileText] = useState("");
  const [step, setStep] = useState<Step>("url");
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    if (isLinkedInUrl(url)) {
      setStep("paste");
    } else {
      setError("Enter a valid LinkedIn profile URL (e.g. linkedin.com/in/yourname)");
    }
  };

  const handleParse = useCallback(async () => {
    const trimmed = profileText.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/linkedin-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileText: trimmed }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to parse profile (${response.status})`);
      }

      const data = await response.json();
      setProfile(data.profile);
      onProfile(data.profile);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse LinkedIn profile");
    }

    setLoading(false);
  }, [onProfile, profileText]);

  const handleClear = () => {
    setUrl("");
    setProfileText("");
    setStep("url");
    setProfile(null);
    setError(null);
    onProfile(null);
  };

  return (
    <div className="result-card">
      <div>
        <div className="eyebrow">optional context</div>
        <h2 style={{ fontSize: "1.15rem" }}>Add your LinkedIn profile</h2>
      </div>

      {step === "url" && (
        <>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleContinue(); }
              }}
              placeholder="linkedin.com/in/yourname"
              className="text-input"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={handleContinue}
              disabled={!url.trim()}
              className="btn-primary"
            >
              Continue
            </button>
          </div>
          {error && <p style={{ color: "var(--ps-red)" }}>{error}</p>}
        </>
      )}

      {step === "paste" && (
        <>
          <div
            className="subcard"
            style={{ padding: "var(--space-4)", display: "grid", gap: "var(--space-2)" }}
          >
            <p style={{ fontSize: "12px", fontWeight: 500 }}>How to copy your profile:</p>
            <ol
              style={{
                margin: 0,
                paddingLeft: "var(--space-6)",
                display: "grid",
                gap: "var(--space-1)",
                fontSize: "12px",
                color: "var(--ps-text-secondary)",
              }}
            >
              <li>
                Open{" "}
                <a
                  href={url.startsWith("http") ? url : `https://${url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--ps-accent)" }}
                >
                  your LinkedIn profile
                </a>{" "}
                in a new tab
              </li>
              <li>Press Ctrl+A (or ⌘+A on Mac) to select all text</li>
              <li>Press Ctrl+C (or ⌘+C) to copy</li>
              <li>Paste below with Ctrl+V (or ⌘+V)</li>
            </ol>
          </div>

          <textarea
            value={profileText}
            onChange={(e) => setProfileText(e.target.value)}
            placeholder="Paste your LinkedIn profile text here…"
            disabled={loading}
            rows={6}
            className="text-input"
            style={{ width: "100%", resize: "vertical", minHeight: "120px" }}
          />

          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
            <button type="button" onClick={handleClear} className="btn-ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleParse()}
              disabled={!profileText.trim() || loading}
              className="btn-primary"
            >
              {loading ? "Parsing…" : "Parse profile"}
            </button>
          </div>

          {loading && (
            <div style={{ display: "grid", gap: "var(--space-3)" }}>
              <SkeletonBlock className="h-4 w-40" />
              <SkeletonBlock className="h-3 w-full" />
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                <SkeletonBlock className="h-5 w-20" />
                <SkeletonBlock className="h-5 w-20" />
                <SkeletonBlock className="h-5 w-20" />
              </div>
            </div>
          )}

          {error && <p style={{ color: "var(--ps-red)" }}>{error}</p>}
        </>
      )}

      {step === "done" && profile && (
        <>
          <div
            className="github-preview"
            style={{ padding: "var(--space-4)", display: "grid", gap: "var(--space-3)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <div>
                {profile.name && <p style={{ fontWeight: 500 }}>{profile.name}</p>}
                {profile.headline && <p className="result-muted">{profile.headline}</p>}
                {profile.currentRole && profile.currentCompany && (
                  <p className="subtle-note">
                    {profile.currentRole} · {profile.currentCompany}
                  </p>
                )}
              </div>
            </div>

            {profile.skills.length > 0 && (
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                {profile.skills.slice(0, 8).map((skill) => (
                  <SeverityPill key={skill} tone="sage" label={skill} />
                ))}
              </div>
            )}

            <p style={{ color: "var(--ps-green)" }}>LinkedIn context will be included in your analysis.</p>
          </div>

          <button type="button" onClick={handleClear} className="btn-ghost btn-inline" style={{ alignSelf: "flex-start" }}>
            Clear
          </button>
        </>
      )}
    </div>
  );
}
