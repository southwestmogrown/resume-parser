"use client";

import { useCallback, useEffect, useState } from "react";
import SkeletonBlock from "@/components/SkeletonBlock";
import SeverityPill from "@/components/SeverityPill";
import type { LinkedInProfile } from "@/lib/types";

interface LinkedInConnectProps {
  onProfile: (profile: LinkedInProfile | null) => void;
  initialProfile?: LinkedInProfile | null;
}

type Step = "paste" | "done";

export default function LinkedInConnect({ onProfile, initialProfile = null }: LinkedInConnectProps) {
  const [profileUrl, setProfileUrl] = useState("");
  const [profileText, setProfileText] = useState("");
  const [step, setStep] = useState<Step>(initialProfile ? "done" : "paste");
  const [profile, setProfile] = useState<LinkedInProfile | null>(initialProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openHref = profileUrl.trim()
    ? profileUrl.startsWith("http") ? profileUrl : `https://${profileUrl}`
    : "https://www.linkedin.com";

  useEffect(() => {
    setProfile(initialProfile);
    setStep(initialProfile ? "done" : "paste");
  }, [initialProfile]);

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
    setProfileUrl("");
    setProfileText("");
    setStep("paste");
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

      {step === "paste" && (
        <>
          <div
            className="subcard"
            style={{ padding: "var(--space-4)", display: "grid", gap: "var(--space-3)" }}
          >
            <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="url"
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
                placeholder="linkedin.com/in/yourname (optional)"
                className="text-input"
                style={{ flex: 1, minWidth: "180px", fontSize: "12px" }}
              />
              <a
                href={openHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
                style={{ whiteSpace: "nowrap", fontSize: "12px" }}
              >
                Open profile →
              </a>
            </div>

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
              <li>Press <kbd style={{ fontFamily: "inherit" }}>Ctrl+A</kbd> (or <kbd style={{ fontFamily: "inherit" }}>⌘+A</kbd>) to select all text on the page</li>
              <li>Press <kbd style={{ fontFamily: "inherit" }}>Ctrl+C</kbd> (or <kbd style={{ fontFamily: "inherit" }}>⌘+C</kbd>) to copy</li>
              <li>Paste below</li>
            </ol>
          </div>

          <textarea
            value={profileText}
            onChange={(e) => setProfileText(e.target.value)}
            onPaste={() => {
              // Give the paste event time to populate the value before enabling submit
            }}
            placeholder="Paste your LinkedIn profile text here…"
            disabled={loading}
            rows={6}
            className="text-input"
            style={{ width: "100%", resize: "vertical", minHeight: "120px" }}
          />

          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
            <button type="button" onClick={handleClear} className="btn-ghost">
              Clear
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

            {profile.education && profile.education.length > 0 && (
              <div style={{ display: "grid", gap: "var(--space-1)" }}>
                {profile.education.map((entry, i) => (
                  <p key={i} className="subtle-note">{entry}</p>
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
