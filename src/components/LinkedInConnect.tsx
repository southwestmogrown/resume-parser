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

function normalizeLinkedInSlug(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^linkedin\.com\/in\//i, "")
    .replace(/\/+$/, "");
}

export default function LinkedInConnect({ onProfile, initialProfile = null }: LinkedInConnectProps) {
  const [profileSlug, setProfileSlug] = useState("");
  const [profileText, setProfileText] = useState("");
  const [step, setStep] = useState<Step>(initialProfile ? "done" : "paste");
  const [profile, setProfile] = useState<LinkedInProfile | null>(initialProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = normalizeLinkedInSlug(profileSlug);
  const openHref = slug
    ? `https://www.linkedin.com/in/${encodeURIComponent(slug)}`
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
    setProfileSlug("");
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
        <h2 className="linkedin-connect__title">Add your LinkedIn profile</h2>
      </div>

      {step === "paste" && (
        <>
          <div
            className="subcard linkedin-connect__step-card"
          >
            <div className="linkedin-connect__url-row">
              <div className="linkedin-connect__url-box">
                <span className="linkedin-connect__url-prefix">
                  linkedin.com/in/
                </span>
                <input
                  type="text"
                  value={profileSlug}
                  onChange={(e) => setProfileSlug(e.target.value)}
                  placeholder="your-username"
                  className="tour-target-linkedin-url linkedin-connect__url-input"
                />
              </div>
              <a
                href={openHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost linkedin-connect__open-link"
              >
                Open profile →
              </a>
            </div>

            <ol className="linkedin-connect__instructions">
              <li>Press <kbd className="linkedin-connect__kbd">Ctrl+A</kbd> (or <kbd className="linkedin-connect__kbd">⌘+A</kbd>) to select all text on the page</li>
              <li>Press <kbd className="linkedin-connect__kbd">Ctrl+C</kbd> (or <kbd className="linkedin-connect__kbd">⌘+C</kbd>) to copy</li>
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
            className="text-input linkedin-connect__textarea"
          />

          <div className="linkedin-connect__button-row">
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
            <div className="linkedin-connect__skeleton-grid">
              <SkeletonBlock className="h-4 w-40" />
              <SkeletonBlock className="h-3 w-full" />
              <div className="linkedin-connect__pill-row">
                <SkeletonBlock className="h-5 w-20" />
                <SkeletonBlock className="h-5 w-20" />
                <SkeletonBlock className="h-5 w-20" />
              </div>
            </div>
          )}

          {error && <p className="linkedin-connect__error">{error}</p>}
        </>
      )}

      {step === "done" && profile && (
        <>
          <div
            className="github-preview linkedin-connect__step-card"
          >
            <div className="linkedin-connect__done-header">
              <div>
                {profile.name && <p className="linkedin-connect__name">{profile.name}</p>}
                {profile.headline && <p className="result-muted">{profile.headline}</p>}
                {profile.currentRole && profile.currentCompany && (
                  <p className="subtle-note">
                    {profile.currentRole} · {profile.currentCompany}
                  </p>
                )}
              </div>
            </div>

            {profile.skills.length > 0 && (
              <div className="linkedin-connect__pill-row">
                {profile.skills.slice(0, 8).map((skill) => (
                  <SeverityPill key={skill} tone="sage" label={skill} />
                ))}
              </div>
            )}

            {profile.education && profile.education.length > 0 && (
              <div className="linkedin-connect__edu-grid">
                {profile.education.map((entry, i) => (
                  <p key={i} className="subtle-note">{entry}</p>
                ))}
              </div>
            )}

            <p className="linkedin-connect__success">LinkedIn context will be included in your analysis.</p>
          </div>

          <button type="button" onClick={handleClear} className="btn-ghost btn-inline linkedin-connect__clear">
            Clear
          </button>
        </>
      )}
    </div>
  );
}
