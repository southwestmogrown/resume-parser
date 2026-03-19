"use client";

import { useState, useCallback } from "react";
import ResumeUpload from "@/components/ResumeUpload";
import JobDescription from "@/components/JobDescription";
import ResumeProfile from "@/components/ResumeProfile";
import MatchScore from "@/components/MatchScore";
import AccessKeyGate from "@/components/AccessKeyGate";
import ErrorBoundary from "@/components/ErrorBoundary";
import Spinner from "@/components/Spinner";
import { extractPdfBase64 } from "@/lib/extractPdfText";
import type { ResumeData, MatchResult, AnalysisResponse } from "@/lib/types";

export default function Home() {
  const [accessKey, setAccessKey] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [loadingExtraction, setLoadingExtraction] = useState(false);
  const [loadingScore, setLoadingScore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAnalyze = !!resumeFile && jobDescription.trim().length > 0;
  const isLoading = loadingExtraction || loadingScore;

  const handleAnalyze = useCallback(async () => {
    if (!resumeFile) return;

    setError(null);
    setResumeData(null);
    setMatchResult(null);
    setLoadingExtraction(true);
    setLoadingScore(true);

    try {
      const base64 = await extractPdfBase64(resumeFile);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-key": accessKey,
        },
        body: JSON.stringify({ resume: base64, jobDescription }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      const data: AnalysisResponse = await res.json();
      setLoadingExtraction(false);
      setResumeData(data.resumeData);
      setMatchResult(data.matchResult);
      setLoadingScore(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoadingExtraction(false);
      setLoadingScore(false);
    }
  }, [resumeFile, jobDescription, accessKey]);

  const showResults = isLoading || !!resumeData || !!matchResult;

  return (
    <ErrorBoundary>
      <AccessKeyGate onKey={setAccessKey}>
        <main className="min-h-screen bg-brand-bg px-4 py-10">
          <div className="mx-auto max-w-6xl">
            {/* Header */}
            <div className="mb-10 text-center">
              <h1 className="text-3xl font-bold text-brand-text">Resume Parser</h1>
              <p className="mt-2 text-sm text-brand-muted">
                Upload a resume and paste a job description to get an AI-powered match analysis.
              </p>
            </div>

            {/* Input panels */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-brand-border bg-brand-surface p-6">
                <ResumeUpload onChange={setResumeFile} />
              </div>
              <div className="rounded-2xl border border-brand-border bg-brand-surface p-6">
                <JobDescription onChange={setJobDescription} />
              </div>
            </div>

            {/* Analyze button */}
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze || isLoading}
                className="flex items-center gap-2 rounded-xl bg-brand-accent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoading && <Spinner />}
                {isLoading ? "Analyzing…" : "Analyze"}
              </button>
              {error && <p className="text-sm text-brand-red">{error}</p>}
            </div>

            {/* Output panels */}
            {showResults && (
              <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
                <ResumeProfile data={resumeData} loading={loadingExtraction} />
                <MatchScore result={matchResult} loading={loadingScore} />
              </div>
            )}
          </div>
        </main>
      </AccessKeyGate>
    </ErrorBoundary>
  );
}
