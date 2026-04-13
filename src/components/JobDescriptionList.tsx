"use client";

import { useRef, useState } from "react";

const MAX_JDS = 6;

interface JobDescriptionListProps {
  value: string[];
  onChange: (descriptions: string[]) => void;
  disabled?: boolean;
}

function truncateTitle(text: string, max = 60): string {
  const firstLine = text.split("\n").find((l) => l.trim().length > 0) ?? text;
  const clean = firstLine.trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trimEnd() + "…";
}

export default function JobDescriptionList({ value, onChange, disabled }: JobDescriptionListProps) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addDraft = () => {
    const trimmed = draft.trim();
    if (!trimmed || value.length >= MAX_JDS) return;
    onChange([...value, trimmed]);
    setDraft("");
    textareaRef.current?.focus();
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const atMax = value.length >= MAX_JDS;

  return (
    <div className="result-card">
      <div>
        <div className="eyebrow">job targeting</div>
        <h2 style={{ fontSize: "1.15rem" }}>
          {value.length === 0
            ? "Add a job description"
            : value.length === 1
            ? "1 job added"
            : `${value.length} jobs added`}
        </h2>
      </div>

      {value.length > 0 && (
        <div style={{ display: "grid", gap: "var(--space-2)" }}>
          {value.map((jd, i) => (
            <div
              key={i}
              className="subcard"
              style={{
                padding: "var(--space-3) var(--space-4)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: "13px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {truncateTitle(jd)}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={disabled}
                className="btn-ghost btn-inline"
                style={{ flexShrink: 0, fontSize: "11px", padding: "4px 10px" }}
                aria-label={`Remove job ${i + 1}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {!atMax && (
        <>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                addDraft();
              }
            }}
            placeholder={
              value.length === 0
                ? "Paste the job description here…"
                : "Paste another job description…"
            }
            disabled={disabled}
            rows={6}
            className="text-input tour-target-job-input"
            style={{ width: "100%", resize: "vertical", minHeight: "120px" }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-3)",
            }}
          >
            <p className="subtle-note">
              {MAX_JDS - value.length} slot{MAX_JDS - value.length !== 1 ? "s" : ""} remaining
              {value.length === 0 ? " · up to 6 jobs" : ""}
            </p>
            <button
              type="button"
              onClick={addDraft}
              disabled={!draft.trim() || disabled}
              className="btn-ghost btn-inline"
            >
              + Add job
            </button>
          </div>
        </>
      )}

      {atMax && (
        <p className="subtle-note">Maximum of {MAX_JDS} job descriptions reached.</p>
      )}
    </div>
  );
}
