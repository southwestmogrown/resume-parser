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
import type { ResumeData, MatchResult, ExtractResponse, ScoreResponse } from "@/lib/types";
import { DEMO_RESUME_DATA, DEMO_MATCH_RESULT, DEMO_JOB_DESCRIPTION } from "@/lib/demoData";

export default function Home() {
  const [accessKey, setAccessKey] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [loadingExtraction, setLoadingExtraction] = useState(false);
  const [loadingScore, setLoadingScore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showGate, setShowGate] = useState(false);

  const canAnalyze = !!resumeFile && jobDescription.trim().length > 0;
  const isLoading = loadingExtraction || loadingScore;

  const handleKey = useCallback((key: string) => {
    setAccessKey(key);
    setShowGate(false);
    setIsDemoMode(false);
    setResumeData(null);
    setMatchResult(null);
    setJobDescription("");
  }, []);

  const handleDemo = useCallback(async () => {
    setIsDemoMode(true);
    setError(null);
    setResumeData(null);
    setMatchResult(null);
    setJobDescription(DEMO_JOB_DESCRIPTION);

    setLoadingExtraction(true);
    await new Promise((r) => setTimeout(r, 1200));
    setResumeData(DEMO_RESUME_DATA);
    setLoadingExtraction(false);

    setLoadingScore(true);
    await new Promise((r) => setTimeout(r, 900));
    setMatchResult(DEMO_MATCH_RESULT);
    setLoadingScore(false);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!resumeFile) return;

    setError(null);
    setResumeData(null);
    setMatchResult(null);
    setLoadingExtraction(true);

    let extracted: ResumeData;

    // Phase 1: Extract resume data
    try {
      const base64 = await extractPdfBase64(resumeFile);

      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": accessKey,
        },
        body: JSON.stringify({ resume: base64 }),
      });

      if (!extractRes.ok) {
        const data = await extractRes.json().catch(() => ({}));
        throw new Error(data.error ?? `Extraction failed (${extractRes.status})`);
      }

      const extractData: ExtractResponse = await extractRes.json();
      extracted = extractData.resumeData;
      setResumeData(extracted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
      setLoadingExtraction(false);
      setLoadingScore(false);
      return;
    }

    setLoadingExtraction(false);
    setLoadingScore(true);

    // Phase 2: Score against job description
    try {
      const scoreRes = await fetch("/api/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": accessKey,
        },
        body: JSON.stringify({ resumeData: extracted, jobDescription }),
      });

      if (!scoreRes.ok) {
        const data = await scoreRes.json().catch(() => ({}));
        throw new Error(data.error ?? `Scoring failed (${scoreRes.status})`);
      }

      const scoreData: ScoreResponse = await scoreRes.json();
      setMatchResult(scoreData.matchResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scoring failed");
    }

    setLoadingScore(false);
  }, [resumeFile, jobDescription, accessKey]);

  const showResults = isLoading || !!resumeData || !!matchResult;

  return (
    <ErrorBoundary>
      <AccessKeyGate onKey={handleKey} onDemo={handleDemo} forceShow={showGate}>
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
                <JobDescription onChange={setJobDescription} value={jobDescription} />
              </div>
            </div>

            {/* Analyze button */}
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze || isLoading || isDemoMode}
                title={isDemoMode ? "Not available in demo mode" : undefined}
                className="flex items-center gap-2 rounded-xl bg-brand-accent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoading && <Spinner />}
                {isLoading ? "Analyzing…" : "Analyze"}
              </button>
              {error && <p className="text-sm text-brand-red">{error}</p>}
            </div>

            {/* Demo banner */}
            {isDemoMode && (
              <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-600 dark:text-amber-400">
                Demo mode — showing pre-loaded sample results.{" "}
                <button
                  onClick={() => {
                    setIsDemoMode(false);
                    setShowGate(true);
                  }}
                  className="underline hover:no-underline"
                >
                  Enter your API key
                </button>{" "}
                to analyze your own resume.
              </div>
            )}

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
