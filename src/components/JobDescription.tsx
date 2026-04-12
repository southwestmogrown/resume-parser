"use client";

import { useEffect, useRef } from "react";

interface JobDescriptionProps {
  onChange: (value: string) => void;
  value: string;
}

export default function JobDescription({ onChange, value }: JobDescriptionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 480)}px`;
  }, [value]);

  return (
    <div className="result-card">
      <div className="field-label">
        <span>Job description</span>
        <span>{value.length.toLocaleString()} chars</span>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste the job description here…"
        className="textarea-field"
      />
      <p className="fine-print">Paste the whole posting. The analysis is only as honest as the input.</p>
    </div>
  );
}
