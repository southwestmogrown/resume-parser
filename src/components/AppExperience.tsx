"use client";

import JSZip from "jszip";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import BatchResults from "@/components/BatchResults";
import CheckoutModal from "@/components/CheckoutModal";
import CoverLetter from "@/components/CoverLetter";
import ErrorBoundary from "@/components/ErrorBoundary";
import GitHubConnect from "@/components/GitHubConnect";
import JobDescriptionList from "@/components/JobDescriptionList";
import LinkedInConnect from "@/components/LinkedInConnect";
import MatchScore from "@/components/MatchScore";
import PassStackLogo from "@/components/PassStackLogo";
import PayGate from "@/components/PayGate";
import ResumeRewriter from "@/components/ResumeRewriter";
import ResumeUpload from "@/components/ResumeUpload";
import Spinner from "@/components/Spinner";
import StudyPlan from "@/components/StudyPlan";
import { extractPdfBase64 } from "@/lib/extractPdfText";
import {
  DEMO_COVER_LETTER,
  DEMO_JOB_DESCRIPTION,
  DEMO_MATCH_RESULT,
  DEMO_RESUME_DATA,
  DEMO_REWRITE_SUGGESTIONS,
  DEMO_STUDY_ITEMS,
} from "@/lib/demoData";
import type {
  BatchScoreResult,
  ExtractResponse,
  GitHubProfile,
  LinkedInProfile,
  MatchResult,
  ResumeData,
  RewriteResponse,
  RewriteSuggestion,
  ScoreResponse,
  StudyItem,
  StudyPlanResponse,
} from "@/lib/types";

const LS_KEY = "ps_workspace_v1";

type ResultTab = "rewrites" | "study" | "cover";

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
  const [jobDescriptions, setJobDescriptions] = useState<string[]>([]);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [rewriteSuggestions, setRewriteSuggestions] = useState<RewriteSuggestion[] | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [studyItems, setStudyItems] = useState<StudyItem[] | null>(null);
  const [githubProfile, setGithubProfile] = useState<GitHubProfile | null>(null);
  const [linkedinProfile, setLinkedinProfile] = useState<LinkedInProfile | null>(null);
  const [batchResults, setBatchResults] = useState<BatchScoreResult[] | null>(null);
  const [selectedBatchJD, setSelectedBatchJD] = useState<string | null>(null);
  const [loadingExtraction, setLoadingExtraction] = useState(false);
  const [loadingScore, setLoadingScore] = useState(false);
  const [loadingRewrite, setLoadingRewrite] = useState(false);
  const [loadingCoverLetter, setLoadingCoverLetter] = useState(false);
  const [loadingStudyPlan, setLoadingStudyPlan] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisToken, setAnalysisToken] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<"idle" | "pending" | "paid" | "canceled">("idle");
  const [activeTab, setActiveTab] = useState<ResultTab>("rewrites");
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);
  const [isDemo] = useState(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo")
  );

  const jobDescriptionsRef = useRef(jobDescriptions);
  const resumeDataRef = useRef(resumeData);
  const matchResultRef = useRef(matchResult);
  const githubProfileRef = useRef(githubProfile);
  const linkedinProfileRef = useRef(linkedinProfile);
  const pollTimeoutRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => { jobDescriptionsRef.current = jobDescriptions; }, [jobDescriptions]);
  useEffect(() => { resumeDataRef.current = resumeData; }, [resumeData]);
  useEffect(() => { matchResultRef.current = matchResult; }, [matchResult]);
  useEffect(() => { githubProfileRef.current = githubProfile; }, [githubProfile]);
  useEffect(() => { linkedinProfileRef.current = linkedinProfile; }, [linkedinProfile]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollTimeoutRef.current !== null) window.clearTimeout(pollTimeoutRef.current);
    };
  }, []);

  // Auto-switch to cover letter tab when it starts streaming
  useEffect(() => {
    if (loadingCoverLetter) setActiveTab("cover");
  }, [loadingCoverLetter]);

  // ── localStorage persistence ──────────────────────────────────────────────

  // Load demo fixtures when ?demo is present
  useEffect(() => {
    if (!isDemo) return;
    setResumeData(DEMO_RESUME_DATA);
    setMatchResult(DEMO_MATCH_RESULT);
    setRewriteSuggestions(DEMO_REWRITE_SUGGESTIONS);
    setStudyItems(DEMO_STUDY_ITEMS);
    setCoverLetter(DEMO_COVER_LETTER);
    setJobDescriptions([DEMO_JOB_DESCRIPTION]);
    setAnalysisToken("demo");
    setPaymentState("paid");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore on mount (skip if coming back from Stripe redirect — sessionStorage handles that)
  useEffect(() => {
    if (isDemo) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") || params.get("canceled")) return;

    try {
      const saved = localStorage.getItem(LS_KEY);
      if (!saved) return;
      const d = JSON.parse(saved) as Record<string, unknown>;
      if (d.resumeData) setResumeData(d.resumeData as ResumeData);
      if (d.matchResult) setMatchResult(d.matchResult as MatchResult);
      if (d.batchResults) setBatchResults(d.batchResults as BatchScoreResult[]);
      if (d.rewriteSuggestions) setRewriteSuggestions(d.rewriteSuggestions as RewriteSuggestion[]);
      if (d.studyItems) setStudyItems(d.studyItems as StudyItem[]);
      if (d.coverLetter) setCoverLetter(d.coverLetter as string);
      if (Array.isArray(d.jobDescriptions) && (d.jobDescriptions as string[]).length > 0) {
        setJobDescriptions(d.jobDescriptions as string[]);
      }
      if (d.githubProfile) setGithubProfile(d.githubProfile as GitHubProfile);
      if (d.linkedinProfile) setLinkedinProfile(d.linkedinProfile as LinkedInProfile);
      if (d.analysisToken) setAnalysisToken(d.analysisToken as string);
    } catch {
      localStorage.removeItem(LS_KEY);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save whenever key state changes (skip demo mode and skip if nothing to save)
  useEffect(() => {
    if (isDemo) return;
    if (!resumeData && !matchResult && !batchResults) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        resumeData,
        matchResult,
        batchResults,
        rewriteSuggestions,
        studyItems,
        coverLetter,
        jobDescriptions,
        githubProfile,
        linkedinProfile,
        analysisToken,
      }));
    } catch {
      // Storage unavailable or full
    }
  }, [resumeData, matchResult, batchResults, rewriteSuggestions, studyItems, coverLetter, jobDescriptions, githubProfile, linkedinProfile, analysisToken]);

  const canAnalyze = Boolean((resumeFile || resumeData) && jobDescriptions.length > 0);
  const isBusy = loadingExtraction || loadingScore || loadingRewrite || loadingCoverLetter || loadingStudyPlan || loadingBatch;
  const showPayGate = !analysisToken && Boolean(matchResult) && !loadingScore && !loadingExtraction;
  const hasPaidContent = Boolean(rewriteSuggestions) || Boolean(studyItems) || Boolean(coverLetter);
  const loadingPaid = loadingRewrite || loadingStudyPlan || loadingCoverLetter;
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

  // Redirect handling: restore session state and poll for token after Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("token");
    const success = params.get("success");
    const canceled = params.get("canceled");

    if (success || canceled) {
      const savedJds = sessionStorage.getItem("pending_jds");
      const savedResumeData = sessionStorage.getItem("pending_resume_data");
      const savedMatchResult = sessionStorage.getItem("pending_match_result");
      const savedGithubProfile = sessionStorage.getItem("pending_github_profile");
      const savedLinkedinProfile = sessionStorage.getItem("pending_linkedin_profile");

      if (savedJds) {
        try { setJobDescriptions(JSON.parse(savedJds)); } catch { sessionStorage.removeItem("pending_jds"); }
      }
      if (savedResumeData) {
        try { setResumeData(JSON.parse(savedResumeData)); } catch { sessionStorage.removeItem("pending_resume_data"); }
      }
      if (savedMatchResult) {
        try { setMatchResult(JSON.parse(savedMatchResult)); } catch { sessionStorage.removeItem("pending_match_result"); }
      }
      if (savedGithubProfile) {
        try { setGithubProfile(JSON.parse(savedGithubProfile)); } catch { sessionStorage.removeItem("pending_github_profile"); }
      }
      if (savedLinkedinProfile) {
        try { setLinkedinProfile(JSON.parse(savedLinkedinProfile)); } catch { sessionStorage.removeItem("pending_linkedin_profile"); }
      }

      sessionStorage.removeItem("pending_jds");
      sessionStorage.removeItem("pending_resume_data");
      sessionStorage.removeItem("pending_match_result");
      sessionStorage.removeItem("pending_github_profile");
      sessionStorage.removeItem("pending_linkedin_profile");
    }

    if (canceled) {
      setPaymentState("canceled");
      window.history.replaceState({}, "", "/app");
      return;
    }

    if (success && sessionId) {
      setPaymentState("pending");
      let attempts = 0;
      let redeeming = false;

      const clearPollTimeout = () => {
        if (pollTimeoutRef.current !== null) {
          window.clearTimeout(pollTimeoutRef.current);
          pollTimeoutRef.current = null;
        }
      };

      const pollForToken = () => {
        pollTimeoutRef.current = window.setTimeout(async () => {
          if (!isMountedRef.current) { clearPollTimeout(); return; }
          if (redeeming) { pollForToken(); return; }

          redeeming = true;
          attempts += 1;

          try {
            const response = await fetch("/api/redeem-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId }),
            });

            if (!isMountedRef.current) { clearPollTimeout(); return; }

            if (response.ok) {
              const { token } = await response.json();
              if (!isMountedRef.current) { clearPollTimeout(); return; }
              setAnalysisToken(token);
              setPaymentState("paid");
              clearPollTimeout();
              window.history.replaceState({}, "", "/app");
              return;
            }

            if (attempts >= 10) {
              clearPollTimeout();
              setPaymentState("canceled");
              window.history.replaceState({}, "", "/app");
              return;
            }
          } finally {
            redeeming = false;
          }

          if (isMountedRef.current) pollForToken();
        }, 1000);
      };

      pollForToken();
      return clearPollTimeout;
    }
  }, []);

  // runPaidPhases — phases 3a, 3b (parallel), then 4 (streaming cover letter)
  const runPaidPhases = useCallback(
    async (resumeDataArg: ResumeData, matchResultArg: MatchResult, jd: string) => {
      if (!analysisToken) return;

      setLoadingRewrite(true);
      setLoadingStudyPlan(true);
      setActiveTab("rewrites");

      const handleTokenInvalid = () => {
        setAnalysisToken(null);
        setPaymentState("idle");
      };

      const rewritePromise = fetch("/api/rewrite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-analysis-token": analysisToken,
        },
        body: JSON.stringify({
          resumeData: resumeDataArg,
          jobDescription: jd,
          ...(githubProfile ? { githubProfile } : {}),
          ...(linkedinProfile ? { linkedinProfile } : {}),
        }),
      })
        .then(async (res) => {
          if (res.status === 401 || res.status === 402) { handleTokenInvalid(); return; }
          if (!res.ok) throw new Error("Rewrite generation failed");
          const data: RewriteResponse = await res.json();
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
        body: JSON.stringify({
          matchResult: matchResultArg,
          resumeData: resumeDataArg,
          ...(linkedinProfile ? { linkedinProfile } : {}),
        }),
      })
        .then(async (res) => {
          if (res.status === 401 || res.status === 402) { handleTokenInvalid(); return; }
          if (!res.ok) throw new Error("Study plan generation failed");
          const data: StudyPlanResponse = await res.json();
          setStudyItems(data.items);
        })
        .catch(() => undefined)
        .finally(() => setLoadingStudyPlan(false));

      await Promise.all([rewritePromise, studyPromise]);

      setLoadingCoverLetter(true);
      try {
        const coverRes = await fetch("/api/cover-letter", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-analysis-token": analysisToken,
          },
          body: JSON.stringify({
            resumeData: resumeDataArg,
            matchResult: matchResultArg,
            jobDescription: jd,
            ...(githubProfile ? { githubProfile } : {}),
            ...(linkedinProfile ? { linkedinProfile } : {}),
          }),
        });

        if ((coverRes.status === 401 || coverRes.status === 402)) {
          handleTokenInvalid();
        } else if (coverRes.ok && coverRes.body) {
          const reader = coverRes.body.getReader();
          const decoder = new TextDecoder();
          let text = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            text += decoder.decode(value, { stream: true });
            setCoverLetter(text);
          }
        }
      } catch {
        // Non-blocking
      }
      setLoadingCoverLetter(false);
    },
    [analysisToken, githubProfile, linkedinProfile]
  );

  // Auto-trigger paid phases when token arrives and score is ready.
  // Skips batch drill-down — user explicitly triggers via handleBatchAnalyze button.
  useEffect(() => {
    if (!analysisToken || !resumeData || !matchResult) return;
    if (selectedBatchJD) return; // batch drill-down uses explicit button, not auto-trigger
    if (rewriteSuggestions !== null || studyItems !== null || coverLetter !== null) return;
    if (loadingRewrite || loadingStudyPlan || loadingCoverLetter) return;
    const jd = jobDescriptionsRef.current[0];
    if (!jd) return;
    void runPaidPhases(resumeData, matchResult, jd);
  }, [analysisToken, matchResult, resumeData, selectedBatchJD, rewriteSuggestions, studyItems, coverLetter, loadingRewrite, loadingStudyPlan, loadingCoverLetter, runPaidPhases]);

  const handleBatchAnalyze = useCallback(() => {
    if (!resumeData || !matchResult || !selectedBatchJD || !analysisToken) return;
    void runPaidPhases(resumeData, matchResult, selectedBatchJD);
  }, [resumeData, matchResult, selectedBatchJD, analysisToken, runPaidPhases]);

  const handleAnalyze = useCallback(async () => {
    const currentJDs = jobDescriptionsRef.current;
    if (currentJDs.length === 0) return;

    const currentResumeData = resumeDataRef.current;
    setError(null);
    setMatchResult(null);
    setRewriteSuggestions(null);
    setCoverLetter(null);
    setStudyItems(null);
    setBatchResults(null);
    setSelectedBatchJD(null);

    let extracted: ResumeData;

    if (resumeFile) {
      setResumeData(null);
      setLoadingExtraction(true);
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
    } else if (currentResumeData) {
      extracted = currentResumeData;
    } else {
      setError("Please upload your resume.");
      return;
    }

    if (currentJDs.length > 1) {
      // Batch mode: score all JDs for free, no token required
      setLoadingBatch(true);
      const settled = await Promise.all(
        currentJDs.map(async (description) => {
          try {
            const scoreResponse = await fetch("/api/score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                resumeData: extracted,
                jobDescription: description,
                ...(githubProfileRef.current ? { githubProfile: githubProfileRef.current } : {}),
                ...(linkedinProfileRef.current ? { linkedinProfile: linkedinProfileRef.current } : {}),
              }),
            });
            if (!scoreResponse.ok) return null;
            const scoreData: ScoreResponse = await scoreResponse.json();
            const lines = description.split("\n").filter((l) => l.trim().length > 0);
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
      const results = settled.filter((r): r is BatchScoreResult => Boolean(r));
      setBatchResults(results.length > 0 ? results : null);
      if (results.length === 0) setError("Failed to score any job descriptions. Try again.");
      setLoadingBatch(false);
      return;
    }

    // Single JD: score for free
    const jd = currentJDs[0];
    setLoadingScore(true);
    let scoreResult: MatchResult;
    try {
      const scoreResponse = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeData: extracted,
          jobDescription: jd,
          ...(githubProfileRef.current ? { githubProfile: githubProfileRef.current } : {}),
          ...(linkedinProfileRef.current ? { linkedinProfile: linkedinProfileRef.current } : {}),
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
    // Paid phases fire via the auto-trigger effect when matchResult + analysisToken are both set.
    // No direct call here — avoids double-invocation with the effect.
  }, [resumeFile]);

  // Batch drill-down: keep batchResults visible, track selected JD
  const handleBatchDrillDown = useCallback(
    (result: BatchScoreResult) => {
      const drillMatchResult: MatchResult = {
        score: result.score,
        matchedSkills: result.matchedSkills,
        missingSkills: result.topGaps,
        recommendation: result.recommendation,
      };
      setSelectedBatchJD(result.jobDescription);
      setJobDescriptions([result.jobDescription]);
      setMatchResult(drillMatchResult);
      setRewriteSuggestions(null);
      setStudyItems(null);
      setCoverLetter(null);
      // batchResults intentionally preserved — auto-trigger handles paid phases if token exists
    },
    []
  );

  const handleBatchBack = useCallback(() => {
    setSelectedBatchJD(null);
    setMatchResult(null);
    setRewriteSuggestions(null);
    setStudyItems(null);
    setCoverLetter(null);
  }, []);

  const handlePaymentSuccess = useCallback((token: string) => {
    setAnalysisToken(token);
    setPaymentState("paid");
    setCheckoutClientSecret(null);
  }, []);

  const handlePay = useCallback(async () => {
    try {
      const response = await fetch("/api/create-payment-intent", { method: "POST" });
      if (!response.ok) throw new Error("Checkout setup failed.");
      const { clientSecret } = await response.json();
      setCheckoutClientSecret(clientSecret as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout setup failed.");
    }
  }, []);

  // ── Export ────────────────────────────────────────────────────────────────

  const handleExportZip = useCallback(async () => {
    const zip = new JSZip();

    if (coverLetter) {
      zip.file("cover-letter.txt", coverLetter);
    }

    if (rewriteSuggestions?.length) {
      const bulletsText = rewriteSuggestions
        .map((s) =>
          [
            s.originalRole,
            "",
            `Before: ${s.originalBullet}`,
            "",
            `After:  ${s.rewrittenBullet}`,
            "",
            `Why:    ${s.rationale}`,
          ].join("\n")
        )
        .join("\n\n---\n\n");
      zip.file("optimized-bullets.txt", bulletsText);
    }

    if (studyItems?.length) {
      const studyText = studyItems
        .map((item) =>
          [
            `[${item.severity.toUpperCase()}] ${item.skill}`,
            item.action,
            `Resource: ${item.resource}`,
          ].join("\n")
        )
        .join("\n\n---\n\n");
      zip.file("study-plan.txt", studyText);
    }

    if (matchResult) {
      const reportLines = [
        "MATCH REPORT",
        "============",
        `Score: ${matchResult.score}%`,
        "",
        `Recommendation: ${matchResult.recommendation}`,
        "",
        `Matched Skills: ${matchResult.matchedSkills.join(", ")}`,
        "",
        "Gaps:",
        ...matchResult.missingSkills.map((g) => `  [${g.severity}] ${g.skill}: ${g.reason}`),
      ];
      zip.file("match-report.txt", reportLines.join("\n"));
    }

    if (batchResults?.length) {
      const batchText = batchResults
        .map((r) =>
          [`${r.jobTitle} @ ${r.company}`, `Score: ${r.score}%`, r.recommendation].join("\n")
        )
        .join("\n\n---\n\n");
      zip.file("batch-scores.txt", batchText);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `passstack-${resumeData?.name?.replace(/\s+/g, "-").toLowerCase() ?? "analysis"}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [coverLetter, rewriteSuggestions, studyItems, matchResult, batchResults, resumeData]);

  const resetWorkspace = useCallback(() => {
    setMatchResult(null);
    setResumeData(null);
    setResumeFile(null);
    setRewriteSuggestions(null);
    setCoverLetter(null);
    setStudyItems(null);
    setBatchResults(null);
    setSelectedBatchJD(null);
    setJobDescriptions([]);
    setError(null);
    setActiveTab("rewrites");
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  }, []);

  const getAnalyzeButtonText = () => {
    if (loadingExtraction) return "Extracting resume…";
    if (loadingScore || loadingBatch) return "Scoring…";
    return jobDescriptions.length > 1 ? "Score all jobs" : "Analyze";
  };

  const canExport = (hasPaidContent || Boolean(batchResults)) && !loadingPaid && !loadingBatch;

  return (
    <ErrorBoundary>
      <main className="app-shell">
        {checkoutClientSecret && (
          <CheckoutModal
            clientSecret={checkoutClientSecret}
            onSuccess={handlePaymentSuccess}
            onClose={() => setCheckoutClientSecret(null)}
          />
        )}

        <nav className="site-nav site-nav--scrolled">
          <div className="container nav-inner">
            <Link href="/" className="brand-mark" aria-label="PassStack home">
              <PassStackLogo />
            </Link>
            {!analysisToken && !checkoutClientSecret && (
              <button type="button" onClick={() => void handlePay()} className="btn-primary">
                Unlock — $5 →
              </button>
            )}
          </div>
        </nav>

        <section className="container app-hero">
          <div className="app-heading">
            <div className="eyebrow">resume analysis workspace</div>
            <h1 className="display">Stop feeding the ATS blind.</h1>
            <p className="result-muted">
              Upload your resume, paste a job description, and get your match score instantly — free. Pay once to unlock bullet rewrites, a study plan, and a cover letter draft.
            </p>
            <p className="fine-print">Score is always free. Full analysis: $5 one-time, no subscription.</p>
          </div>
        </section>

        <section id="workspace" className="container" style={{ paddingBottom: "var(--space-16)" }}>
          {!showResults ? (
            <>
              <div className="step-indicator" style={{ marginBottom: "var(--space-6)" }}>
                <StepPill
                  number={1}
                  label="Upload"
                  active={!resumeFile && !resumeData}
                  done={Boolean(resumeFile) || Boolean(resumeData)}
                />
                <StepPill
                  number={2}
                  label="Describe"
                  active={Boolean(resumeFile || resumeData) && jobDescriptions.length === 0}
                  done={jobDescriptions.length > 0}
                />
                <StepPill
                  number={3}
                  label="Score"
                  active={false}
                  done={Boolean(matchResult)}
                />
                <StepPill
                  number={4}
                  label="Full analysis"
                  active={showPayGate}
                  done={Boolean(analysisToken)}
                />
              </div>

              <div className="panel-grid">
                <div className="panel-stack">
                  <div className="card">
                    <ResumeUpload
                      onChange={setResumeFile}
                      sessionResumeName={!resumeFile ? (resumeData?.name ?? null) : null}
                    />
                  </div>
                  <div className="card card-sage">
                    <GitHubConnect onProfile={setGithubProfile} />
                  </div>
                  <div className="card card-sage">
                    <LinkedInConnect onProfile={setLinkedinProfile} />
                  </div>
                </div>

                <div className="card">
                  <JobDescriptionList
                    value={jobDescriptions}
                    onChange={setJobDescriptions}
                    disabled={isBusy}
                  />
                </div>
              </div>

              <div style={{ marginTop: "var(--space-6)", display: "grid", gap: "var(--space-3)", justifyItems: "center" }}>
                <button
                  type="button"
                  onClick={() => void handleAnalyze()}
                  disabled={!canAnalyze || isBusy}
                  className="btn-primary btn-large"
                >
                  {isBusy && <Spinner />}
                  {getAnalyzeButtonText()}
                </button>
                <p className="fine-print">Score is free. Full analysis unlocked with a one-time $5 payment.</p>
                {error && <p style={{ color: "var(--ps-red)" }}>{error}</p>}
              </div>
            </>
          ) : (
            <div className="workspace-results">
              {/* Left sidebar — score + paygate + session info */}
              <div className="workspace-sidebar">
                <MatchScore result={matchResult} loading={loadingExtraction || loadingScore} />

                {showPayGate && matchResult && resumeData ? (
                  <PayGate
                    resumeData={resumeData}
                    score={matchResult.score}
                    paymentState={paymentState}
                    onPay={() => void handlePay()}
                  />
                ) : null}

                {selectedBatchJD && analysisToken && matchResult && !showPayGate && !hasPaidContent && !loadingPaid ? (
                  <div className="card" style={{ display: "grid", gap: "var(--space-3)" }}>
                    <p style={{ fontSize: "13px", fontWeight: 500 }}>Ready to go deeper on this role?</p>
                    <p className="result-muted" style={{ fontSize: "12px" }}>Generate bullet rewrites, a study plan, and a cover letter draft for this specific JD.</p>
                    <button
                      type="button"
                      onClick={handleBatchAnalyze}
                      className="btn-primary"
                      style={{ width: "100%" }}
                    >
                      Generate full analysis
                    </button>
                  </div>
                ) : null}

                <div className="card card-soft" style={{ display: "grid", gap: "var(--space-3)" }}>
                  <div>
                    <div className="eyebrow" style={{ marginBottom: "var(--space-2)" }}>session</div>
                    {resumeData?.name && (
                      <p style={{ fontSize: "13px", fontWeight: 500 }}>{resumeData.name}</p>
                    )}
                    <p className="result-muted" style={{ fontSize: "12px", marginTop: "var(--space-1)" }}>
                      {jobDescriptions.length} job{jobDescriptions.length !== 1 ? "s" : ""}
                      {githubProfile ? ` · @${githubProfile.username}` : ""}
                      {linkedinProfile?.currentCompany ? ` · ${linkedinProfile.currentCompany}` : ""}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={resetWorkspace}
                      className="btn-ghost btn-inline"
                      style={{ alignSelf: "flex-start", fontSize: "11px" }}
                    >
                      ↩ New analysis
                    </button>
                    {canExport && (
                      <button
                        type="button"
                        onClick={() => void handleExportZip()}
                        className="btn-ghost btn-inline"
                        style={{ alignSelf: "flex-start", fontSize: "11px" }}
                      >
                        ↓ Export .zip
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right main — batch results + paid content */}
              <div style={{ display: "grid", gap: "var(--space-6)", alignContent: "start" }}>
                {(batchResults || loadingBatch) && (
                  <BatchResults
                    results={batchResults}
                    loading={loadingBatch}
                    onSelect={handleBatchDrillDown}
                    selectedJD={selectedBatchJD}
                  />
                )}

                {/* Drill-down header with back button */}
                {selectedBatchJD && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)" }}>
                    <button
                      type="button"
                      onClick={handleBatchBack}
                      className="btn-ghost btn-inline"
                      style={{ fontSize: "11px" }}
                    >
                      ← Back to all
                    </button>
                    <span className="eyebrow" style={{ marginBottom: 0 }}>selected role</span>
                  </div>
                )}

                {(hasPaidContent || loadingPaid) && (
                  <>
                    <div className="result-tabs">
                      <button
                        type="button"
                        className={`result-tab ${activeTab === "rewrites" ? "result-tab--active" : ""}`.trim()}
                        onClick={() => setActiveTab("rewrites")}
                      >
                        Bullet Rewrites
                        {loadingRewrite && <span style={{ opacity: 0.5 }}> ·</span>}
                        {!loadingRewrite && rewriteSuggestions && (
                          <span style={{ opacity: 0.5 }}> ({rewriteSuggestions.length})</span>
                        )}
                      </button>
                      <button
                        type="button"
                        className={`result-tab ${activeTab === "study" ? "result-tab--active" : ""}`.trim()}
                        onClick={() => setActiveTab("study")}
                      >
                        Study Plan
                        {loadingStudyPlan && <span style={{ opacity: 0.5 }}> ·</span>}
                        {!loadingStudyPlan && studyItems && (
                          <span style={{ opacity: 0.5 }}> ({studyItems.length})</span>
                        )}
                      </button>
                      <button
                        type="button"
                        className={`result-tab ${activeTab === "cover" ? "result-tab--active" : ""}`.trim()}
                        onClick={() => setActiveTab("cover")}
                      >
                        Cover Letter
                        {loadingCoverLetter && <span style={{ opacity: 0.5 }}> writing…</span>}
                      </button>
                    </div>

                    {activeTab === "rewrites" && (
                      <ResumeRewriter suggestions={rewriteSuggestions} loading={loadingRewrite} />
                    )}
                    {activeTab === "study" && (
                      <StudyPlan items={studyItems} loading={loadingStudyPlan} />
                    )}
                    {activeTab === "cover" && (
                      <CoverLetter content={coverLetter} loading={loadingCoverLetter} />
                    )}
                  </>
                )}

                {!batchResults && !loadingBatch && !hasPaidContent && !loadingPaid && (
                  <div
                    style={{
                      padding: "var(--space-16) var(--space-8)",
                      textAlign: "center",
                      color: "var(--ps-text-faint)",
                      border: "1px dashed var(--ps-border)",
                      borderRadius: "var(--radius-lg)",
                    }}
                  >
                    {loadingExtraction || loadingScore ? (
                      <p className="eyebrow">Analyzing…</p>
                    ) : showPayGate ? (
                      <>
                        <p className="eyebrow">ready to unlock</p>
                        <p className="result-muted" style={{ marginTop: "var(--space-3)", fontSize: "13px" }}>
                          Bullet rewrites, study plan, and cover letter appear here after payment.
                        </p>
                      </>
                    ) : null}
                  </div>
                )}

                {error && <p style={{ color: "var(--ps-red)" }}>{error}</p>}
              </div>
            </div>
          )}
        </section>
      </main>
    </ErrorBoundary>
  );
}
