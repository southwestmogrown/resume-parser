"use client";

import { useCallback, useState } from "react";

interface ResumeUploadProps {
  onChange: (file: File | null) => void;
}

export default function ResumeUpload({ onChange }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (incoming: File) => {
      if (incoming.type !== "application/pdf") {
        setError("Only PDF files are accepted.");
        return;
      }
      setError(null);
      setFile(incoming);
      onChange(incoming);
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFile(selected);
    },
    [handleFile]
  );

  const handleClear = () => {
    setFile(null);
    setError(null);
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-brand-text">Resume (PDF)</label>

      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors ${
            dragging
              ? "border-brand-accent bg-brand-accent/10"
              : "border-brand-border bg-brand-surface hover:border-brand-accent/50"
          }`}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={handleChange}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <svg
            className="mb-3 h-8 w-8 text-brand-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-sm text-brand-muted">
            Drag & drop your resume here, or{" "}
            <span className="text-brand-accent">browse</span>
          </p>
          <p className="mt-1 text-xs text-brand-muted">PDF only</p>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-brand-border bg-brand-surface px-4 py-3">
          <div className="flex items-center gap-3">
            <svg
              className="h-5 w-5 text-brand-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <span className="text-sm text-brand-text">{file.name}</span>
          </div>
          <button
            onClick={handleClear}
            className="text-xs text-brand-muted transition-colors hover:text-brand-text"
          >
            Clear
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
