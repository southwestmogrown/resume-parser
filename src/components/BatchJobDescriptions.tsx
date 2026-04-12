"use client";

import { useMemo, useState } from "react";

interface BatchJobDescriptionsProps {
  onSubmit: (descriptions: string[]) => void;
  loading: boolean;
}

export default function BatchJobDescriptions({ onSubmit, loading }: BatchJobDescriptionsProps) {
  const [text, setText] = useState("");

  const descriptions = useMemo(
    () =>
      text
        .split(/\n---\n/)
        .map((description) => description.trim())
        .filter((description) => description.length > 0),
    [text]
  );

  return (
    <div className="result-card">
      <div className="field-label">
        <span>Batch job descriptions</span>
        <span>
          {descriptions.length} job{descriptions.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="result-muted">
        Separate each posting with a line containing only <code>---</code>.
      </p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={"Paste first job description here…\n---\nPaste second job description here…"}
        disabled={loading}
        className="textarea-field"
      />
      <button
        type="button"
        onClick={() => onSubmit(descriptions)}
        disabled={descriptions.length === 0 || loading}
        className="btn-primary"
      >
        {loading ? "Scoring…" : `Score ${descriptions.length || "your"} job${descriptions.length === 1 ? "" : "s"}`}
      </button>
    </div>
  );
}
