"use client";

import { useCallback, useState } from "react";

interface JobDescriptionProps {
  onChange: (value: string) => void;
}

export default function JobDescription({ onChange }: JobDescriptionProps) {
  const [value, setValue] = useState("");

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      onChange(e.target.value);
    },
    [onChange]
  );

  const handleClear = () => {
    setValue("");
    onChange("");
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-brand-text">
          Job Description
        </label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-brand-muted">
            {value.length.toLocaleString()} chars
          </span>
          {value.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs text-brand-muted transition-colors hover:text-brand-text"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <textarea
        value={value}
        onChange={handleChange}
        placeholder="Paste the job description here…"
        className="flex-1 resize-none rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted focus:border-brand-accent focus:outline-none transition-colors min-h-[200px]"
      />
    </div>
  );
}
