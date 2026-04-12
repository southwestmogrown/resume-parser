"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import BatchJobDescriptions from "@/components/BatchJobDescriptions";
import BatchResults from "@/components/BatchResults";
import CoverLetter from "@/components/CoverLetter";
import ErrorBoundary from "@/components/ErrorBoundary";
import GitHubConnect from "@/components/GitHubConnect";
import JobDescription from "@/components/JobDescription";
import MatchScore from "@/components/MatchScore";
import PayGate from "@/components/PayGate";
import ResumeProfile from "@/components/ResumeProfile";
import ResumeRewriter from "@/components/ResumeRewriter";
import ResumeUpload from "@/components/ResumeUpload";
import Spinner from "@/components/Spinner";
import StudyPlan from "@/components/StudyPlan";
import { extractPdfBase64 } from "@/lib/extractPdfText";
import type {
  BatchScoreResult,
  ExtractResponse,
  GitHubProfile,
  MatchResult,
  ResumeData,
  RewriteResponse,
  RewriteSuggestion,
  ScoreResponse,
  StudyItem,
  StudyPlanResponse,
} from "@/lib/types";

type InputMode = "single" | "batch";

function StepPill({
  number,
  label,
  active,
  done,
}: {
  number: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className={`step-pill ${active ? "step-pill--active" : ""} ${done ? "step-pill--done" : ""}`.trim()}>
      <span className="step-pill__number">{done ? "✓" : number}</span>
      <span>{label}</span>
    </div>
  );
}

export default function AppExperience() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [rewriteSuggestions, setRewriteSuggestions] = useState<RewriteSuggestion[] | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [studyItems, setStudyItems] = useState<StudyItem[] | null>(null);
  const [githubProfile, setGithubProfile] = useState<GitHubProfile | null>(null);
  const [batchResults, setBatchResults] = useState<BatchScoreResult[] | null>(null);
  const [loadingExtraction, setLoadingExtraction] = useState(false);
  const [loadingScore, setLoadingScore] = useState(false);
  const [loadingRewrite, setLoadingRewrite] = useState(false);
  const [loadingCoverLetter, setLoadingCoverLetter] = useState(false);
  const [loadingStudyPlan, setLoadingStudyPlan] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("single");
  const [analysisToken, setAnalysisToken] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<"idle" | "pending" | "paid" | "canceled">("idle");

  const jobDescriptionRef = useRef(jobDescription);
  const resumeDataRef = useRef(resumeData);
  const githubProfileRef = useRef(githubProfile);
  const inputModeRef = useRef(inputMode);

  useEffect(() => {
    jobDescriptionRef.current = jobDescription;
  }, [jobDescription]);

  useEffect(() => {
    resumeDataRef.current = resumeData;
  }, [resumeData]);

  useEffect(() => {
    githubProfileRef.current = githubProfile;
  }, [githubProfile]);

  useEffect(() => {
    inputModeRef.current = inputMode;
  }, [inputMode]);

  const canAnalyze = Boolean(resumeFile && jobDescription.trim().length > 0);
  const isScoring = loadingExtraction || loadingScore;
  const isBusy = isScoring || loadingRewrite || loadingCoverLetter || loadingStudyPlan || loadingBatch;

  const clearResults = useCallback(() => {
    setResumeData(null);
    setMatchResult(null);
    setRewriteSuggestions(null);
    setCoverLetter(null);
    setStudyItems(null);
    setBatchResults(null);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("token");
    const success = params.get("success");
    const canceled = params.get("canceled");

    if (success || canceled) {
      const savedJd = sessionStorage.getItem("pending_jd");
      const savedResumeData = sessionStorage.getItem("pending_resume_data");
      const savedGithubProfile = sessionStorage.getItem("pending_github_profile");
      const savedInputMode = sessionStorage.getItem("pending_input_mode");

      if (savedJd) setJobDescription(savedJd);
      if (savedResumeData) {
        try {
          setResumeData(JSON.parse(savedResumeData));
        } catch {
          sessionStorage.removeItem("pending_resume_data");
        }
      }
      if (savedGithubProfile) {
        try {
          setGithubProfile(JSON.parse(savedGithubProfile));
        } catch {
          sessionStorage.removeItem("pending_github_profile");
        }
      }
      if (savedInputMode === "single" || savedInputMode === "batch") {
        setInputMode(savedInputMode);
      }

      sessionStorage.removeItem("pending_jd");
      sessionStorage.removeItem("pending_resume_data");
      sessionStorage.removeItem("pending_github_profile");
      sessionStorage.removeItem("pending_input_mode");
    }

    if (canceled) {
      setPaymentState("canceled");
      window.history.replaceState({}, "", "/app");
      return;
    }

    if (success && sessionId) {
      setPaymentState("pending");
      let attempts = 0;
      const poll = window.setInterval(async () => {
        attempts += 1;
        const response = await fetch("/api/redeem-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (response.ok) {
          const { token } = await response.json();
          setAnalysisToken(token);
          setPaymentState("paid");
          window.clearInterval(poll);
          window.history.replaceState({}, "", "/app");
        }

        if (attempts >= 10) {
          window.clearInterval(poll);
          setPaymentState("canceled");
          window.history.replaceState({}, "", "/app");
        }
      }, 1000);

      return () => window.clearInterval(poll);
    }
  }, []);

  const runPaidPhases = useCallback(
    async (extracted: ResumeData) => {
      if (!analysisToken) return;

      setLoadingScore(true);
      let scoreResult: MatchResult;

      try {
        const scoreResponse = await fetch("/api/score", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-analysis-token": analysisToken,
          },
          body: JSON.stringify({
            resumeData: extracted,
            jobDescription,
            ...(githubProfile ? { githubProfile } : {}),
          }),
        });

        if (!scoreResponse.ok) {
          const data = await scoreResponse.json().catch(() => ({}));
          throw new Error(data.error ?? `Scoring failed (${scoreResponse.status})`);
        }

        const scoreData: ScoreResponse = await scoreResponse.json();
        scoreResult = scoreData.matchResult;
        setMatchResult(scoreResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Scoring failed");
        setLoadingScore(false);
        return;
      }

      setLoadingScore(false);
      setLoadingRewrite(true);
      setLoadingStudyPlan(true);

      const rewritePromise = fetch("/api/rewrite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-analysis-token": analysisToken,
        },
        body: JSON.stringify({ resumeData: extracted, jobDescription }),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Rewrite generation failed");
          const data: RewriteResponse = await response.json();
          setRewriteSuggestions(data.suggestions);
        })
        .catch(() => undefined)
        .finally(() => setLoadingRewrite(false));

      const studyPromise = fetch("/api/study-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-analysis-token": analysisToken,
        },
        body: JSON.stringify({ matchResult: scoreResult, resumeData: extracted }),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Study plan generation failed");
          const data: StudyPlanResponse = await response.json();
          setStudyItems(data.items);
        })
        .catch(() => undefined)
        .finally(() => setLoadingStudyPlan(false));

      await Promise.all([rewritePromise, studyPromise]);

      setLoadingCoverLetter(true);
      try {
        const coverResponse = await fetch("/api/cover-letter", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-analysis-token": analysisToken,
          },
          body: JSON.stringify({
            resumeData: extracted,
            matchResult: scoreResult,
            jobDescription,
          }),
        });

        if (coverResponse.ok) {
          const data = await coverResponse.json();
          setCoverLetter(data.coverLetter);
        }
      } catch {
        // Non-blocking.
      }
      setLoadingCoverLetter(false);
    },
    [analysisToken, githubProfile, jobDescription]
  );

  const handleAnalyze = useCallback(async () => {
    if (!resumeFile) return;

    setError(null);
    clearResults();
    setLoadingExtraction(true);

    let extracted: ResumeData;

    try {
      const base64 = await extractPdfBase64(resumeFile);
      const extractResponse = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: base64 }),
      });

      if (!extractResponse.ok) {
        const data = await extractResponse.json().catch(() => ({}));
        throw new Error(data.error ?? `Extraction failed (${extractResponse.status})`);
      }

      const extractData: ExtractResponse = await extractResponse.json();
      extracted = extractData.resumeData;
      setResumeData(extracted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
      setLoadingExtraction(false);
      return;
    }

    setLoadingExtraction(false);

    if (!analysisToken) {
      setPaymentState("idle");
      return;
    }

    await runPaidPhases(extracted);
  }, [analysisToken, clearResults, resumeFile, runPaidPhases]);

  useEffect(() => {
    if (!analysisToken || !resumeData || matchResult) return;
    void runPaidPhases(resumeData);
  }, [analysisToken, matchResult, resumeData, runPaidPhases]);

  const handleBatchScore = useCallback(
    async (descriptions: string[]) => {
      if (!resumeFile) {
        setError("Upload a resume before batch scoring.");
        return;
      }

      setError(null);
      clearResults();
      setLoadingExtraction(true);

      let extracted: ResumeData;
      try {
        const base64 = await extractPdfBase64(resumeFile);
        const extractResponse = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume: base64 }),
        });

        if (!extractResponse.ok) {
          const data = await extractResponse.json().catch(() => ({}));
          throw new Error(data.error ?? `Extraction failed (${extractResponse.status})`);
        }

        const extractData: ExtractResponse = await extractResponse.json();
        extracted = extractData.resumeData;
        setResumeData(extracted);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Extraction failed");
        setLoadingExtraction(false);
        return;
      }

      setLoadingExtraction(false);

      if (!analysisToken) {
        setPaymentState("idle");
        return;
      }

      setLoadingBatch(true);

      const settled = await Promise.all(
        descriptions.map(async (description) => {
          try {
            const scoreResponse = await fetch("/api/score", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-analysis-token": analysisToken,
              },
              body: JSON.stringify({
                resumeData: extracted,
                jobDescription: description,
                ...(githubProfile ? { githubProfile } : {}),
              }),
            });

            if (!scoreResponse.ok) return null;

            const scoreData: ScoreResponse = await scoreResponse.json();
            const lines = description.split("\n").filter((line) => line.trim().length > 0);
            const firstLine = lines[0] ?? "Unknown Position";
            const seekingMatch = firstLine.match(
              /^(.+?)\s+(?:is seeking|is looking for|is hiring)\s+(?:a|an)\s+(.+)/i
            );

            let titleFallback = firstLine;
            if (titleFallback.length > 80) {
              const truncated = titleFallback.slice(0, 80);
              const lastSpace = truncated.lastIndexOf(" ");
              titleFallback = `${lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated}…`;
            }

            return {
              jobTitle: seekingMatch ? seekingMatch[2].trim() : titleFallback,
              company: seekingMatch ? seekingMatch[1].trim() : "Unknown Company",
              score: scoreData.matchResult.score,
              matchedSkills: scoreData.matchResult.matchedSkills,
              topGaps: scoreData.matchResult.missingSkills.slice(0, 3),
              recommendation: scoreData.matchResult.recommendation,
              jobDescription: description,
            } satisfies BatchScoreResult;
          } catch {
            return null;
          }
        })
      );

      const results = settled.filter((result): result is BatchScoreResult => Boolean(result));
      setBatchResults(results.length > 0 ? results : null);
      if (results.length === 0) {
        setError("Failed to score any job descriptions. Try again.");
      }
      setLoadingBatch(false);
    },
    [analysisToken, clearResults, githubProfile, resumeFile]
  );

  const handleBatchDrillDown = useCallback((result: BatchScoreResult) => {
    setInputMode("single");
    setJobDescription(result.jobDescription);
    setMatchResult({
      score: result.score,
      matchedSkills: result.matchedSkills,
      missingSkills: result.topGaps,
      recommendation: result.recommendation,
    });
    setRewriteSuggestions(null);
    setStudyItems(null);
    setCoverLetter(null);
    setBatchResults(null);
  }, []);

  const handlePay = useCallback(async () => {
    try {
      const currentJd = jobDescriptionRef.current;
      const currentResumeData = resumeDataRef.current;
      const currentGithubProfile = githubProfileRef.current;
      const currentInputMode = inputModeRef.current;

      if (currentJd) sessionStorage.setItem("pending_jd", currentJd);
      if (currentResumeData) {
        sessionStorage.setItem("pending_resume_data", JSON.stringify(currentResumeData));
      }
      if (currentGithubProfile) {
        sessionStorage.setItem("pending_github_profile", JSON.stringify(currentGithubProfile));
      }
      sessionStorage.setItem("pending_input_mode", currentInputMode);

      const response = await fetch("/api/create-checkout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Checkout setup failed.");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout setup failed.");
    }
  }, []);

  const showPayGate = !analysisToken && Boolean(resumeData) && !loadingExtraction;
  const showResults =
    Boolean(resumeData) ||
    Boolean(matchResult) ||
    Boolean(batchResults) ||
    loadingExtraction ||
    loadingScore ||
    loadingRewrite ||
    loadingCoverLetter ||
    loadingStudyPlan ||
    loadingBatch;

  const getAnalyzeButtonText = () => {
    if (loadingExtraction) return "Extracting resume…";
    if (loadingScore) return "Scoring gaps…";
    if (loadingRewrite) return "Rewriting bullets…";
    if (loadingStudyPlan) return "Building study plan…";
    if (loadingCoverLetter) return "Writing cover letter…";
    return "Run analysis — $5";
  };

  return (
    <ErrorBoundary>
      <main className="app-shell">
        <nav className="site-nav site-nav--scrolled">
          <div className="container nav-inner">
            <Link href="/" className="brand-mark" aria-label="PassStack home">
              <span>Pass</span>
              <span>Stack</span>
            </Link>
            <div className="nav-actions">
              <Link href="/" className="btn-ghost">
                Landing Page
              </Link>
              <a href="#workspace" className="btn-primary">
                Unlock — $5 →
              </a>
            </div>
          </div>
        </nav>

        <section className="container app-hero">
          <div className="app-heading">
            <div className="eyebrow">resume analysis workspace</div>
            <h1 className="display">Stop feeding the ATS blind.</h1>
            <p className="result-muted">
              Upload the resume. Paste the job description. Pay once. Get the score, the gaps, the rewrites, and the follow-up plan. No subscription.
            </p>
            <p className="fine-print">$5 one time. No account. No subscription.</p>
          </div>
        </section>

        <section id="workspace" className="container" style={{ paddingBottom: "var(--space-16)" }}>
          <div className="step-indicator" style={{ marginBottom: "var(--space-6)" }}>
            <StepPill number={1} label="Upload" active={!resumeData} done={Boolean(resumeData)} />
            <StepPill number={2} label="Describe" active={Boolean(resumeData) && !jobDescription} done={jobDescription.length > 0} />
            <StepPill number={3} label="Pay" active={showPayGate} done={Boolean(analysisToken)} />
            <StepPill number={4} label="Results" active={Boolean(matchResult)} done={Boolean(coverLetter) || Boolean(batchResults)} />
          </div>

          <div className="panel-grid">
            <div className="panel-stack">
              <div className="card">
                <ResumeUpload onChange={setResumeFile} />
              </div>
              <div className="card card-sage">
                <GitHubConnect onProfile={setGithubProfile} />
              </div>
            </div>

            <div className="card result-card">
              <div className="eyebrow">job targeting</div>
              <div className="mode-toggle">
                <button
                  type="button"
                  onClick={() => setInputMode("single")}
                  className={inputMode === "single" ? "active" : ""}
                >
                  Single JD
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("batch")}
                  className={inputMode === "batch" ? "active" : ""}
                >
                  Batch Mode
                </button>
              </div>

              {inputMode === "single" ? (
                <JobDescription onChange={setJobDescription} value={jobDescription} />
              ) : (
                <BatchJobDescriptions onSubmit={handleBatchScore} loading={loadingBatch || loadingExtraction} />
              )}
            </div>
          </div>

          {inputMode === "single" && !showPayGate && (
            <div style={{ marginTop: "var(--space-6)", display: "grid", gap: "var(--space-3)", justifyItems: "center" }}>
              <button type="button" onClick={handleAnalyze} disabled={!canAnalyze || isBusy} className="btn-primary btn-large">
                {isBusy && <Spinner />}
                {getAnalyzeButtonText()}
              </button>
              <p className="fine-print">One run. Four paid phases. No subscription.</p>
              {error ? <p style={{ color: "var(--ps-red)" }}>{error}</p> : null}
            </div>
          )}

          {inputMode === "batch" && error ? (
            <div style={{ marginTop: "var(--space-6)", color: "var(--ps-red)" }}>{error}</div>
          ) : null}

          {showResults ? (
            <div className="result-stack" style={{ marginTop: "var(--space-10, 2.5rem)" }}>
              {(batchResults || loadingBatch) && (
                <BatchResults results={batchResults} loading={loadingBatch} onSelect={handleBatchDrillDown} />
              )}

              {(resumeData || matchResult || loadingExtraction || loadingScore) && (
                <>
                  <div className="top-grid">
                    <ResumeProfile data={resumeData} loading={loadingExtraction} />
                    <MatchScore result={matchResult} loading={loadingScore} />
                  </div>

                  {showPayGate && resumeData ? (
                    <PayGate resumeData={resumeData} paymentState={paymentState} onPay={handlePay} />
                  ) : null}

                  <ResumeRewriter suggestions={rewriteSuggestions} loading={loadingRewrite} />

                  <div className="bottom-grid">
                    <StudyPlan items={studyItems} loading={loadingStudyPlan} />
                    <CoverLetter content={coverLetter} loading={loadingCoverLetter} />
                  </div>
                </>
              )}
            </div>
          ) : null}
        </section>
      </main>
    </ErrorBoundary>
  );
}
