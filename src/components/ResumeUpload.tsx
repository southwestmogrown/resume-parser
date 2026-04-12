"use client";

import { useCallback, useState } from "react";

interface ResumeUploadProps {
  onChange: (file: File | null) => void;
  sessionResumeName?: string | null;
}

export default function ResumeUpload({ onChange, sessionResumeName }: ResumeUploadProps) {
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
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      const dropped = event.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = event.target.files?.[0];
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
    <div className="result-card">
      <div>
        <div className="eyebrow">phase 1</div>
        <h2 style={{ fontSize: "1.35rem" }}>Upload your resume</h2>
      </div>

      {!file && sessionResumeName ? (
        <div className="file-chip" style={{ padding: "var(--space-4)", display: "flex", justifyContent: "space-between", gap: "var(--space-3)", alignItems: "center" }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: "var(--space-2)" }}>
              restored from session
            </div>
            <p className="result-muted">↩ {sessionResumeName}</p>
          </div>
          <button type="button" onClick={handleClear} className="btn-ghost btn-inline">
            Change
          </button>
        </div>
      ) : !file ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`upload-dropzone ${dragging ? "is-dragging" : ""}`.trim()}
        >
          <input type="file" accept="application/pdf" onChange={handleChange} />
          <span className="eyebrow" style={{ marginBottom: 0 }}>
            pdf only
          </span>
          <h3 style={{ fontSize: "1rem" }}>Drag it here or click to browse</h3>
          <p className="result-muted">We extract the structure first, then stop and show you what $5 unlocks.</p>
        </div>
      ) : (
        <div className="file-chip" style={{ padding: "var(--space-4)", display: "flex", justifyContent: "space-between", gap: "var(--space-3)", alignItems: "center" }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: "var(--space-2)" }}>
              ready to score
            </div>
            <p>{file.name}</p>
          </div>
          <button type="button" onClick={handleClear} className="btn-ghost btn-inline">
            Clear
          </button>
        </div>
      )}


      {error ? <p style={{ color: "var(--ps-red)" }}>{error}</p> : null}
    </div>
  );
}
