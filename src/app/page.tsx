'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import ResumeUpload from '@/components/ResumeUpload';
import JobDescription from '@/components/JobDescription';
import ResumeProfile from '@/components/ResumeProfile';
import MatchScore from '@/components/MatchScore';
import ResumeRewriter from '@/components/ResumeRewriter';
import CoverLetter from '@/components/CoverLetter';
import StudyPlan from '@/components/StudyPlan';
import GitHubConnect from '@/components/GitHubConnect';
import BatchJobDescriptions from '@/components/BatchJobDescriptions';
import BatchResults from '@/components/BatchResults';
import PayGate from '@/components/PayGate';
import ErrorBoundary from '@/components/ErrorBoundary';
import Spinner from '@/components/Spinner';
import { extractPdfBase64 } from '@/lib/extractPdfText';
import type {
  ResumeData,
  MatchResult,
  ExtractResponse,
  ScoreResponse,
  RewriteSuggestion,
  RewriteResponse,
  StudyItem,
  StudyPlanResponse,
  GitHubProfile,
  BatchScoreResult,
} from '@/lib/types';
import {
  DEMO_RESUME_DATA,
  DEMO_MATCH_RESULT,
  DEMO_JOB_DESCRIPTION,
  DEMO_REWRITE_SUGGESTIONS,
  DEMO_STUDY_ITEMS,
  DEMO_COVER_LETTER,
} from '@/lib/demoData';

type InputMode = 'single' | 'batch';

export default function Home() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
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
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('single');
  const [analysisToken, setAnalysisToken] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<'idle' | 'pending' | 'paid' | 'canceled'>('idle');

  // Refs to always have the latest state values (avoids stale closure issues)
  const jobDescriptionRef = useRef(jobDescription);
  const resumeDataRef = useRef(resumeData);
  const githubProfileRef = useRef(githubProfile);
  const inputModeRef = useRef(inputMode);

  // Keep refs in sync with state
  useEffect(() => { jobDescriptionRef.current = jobDescription; }, [jobDescription]);
  useEffect(() => { resumeDataRef.current = resumeData; }, [resumeData]);
  useEffect(() => { githubProfileRef.current = githubProfile; }, [githubProfile]);
  useEffect(() => { inputModeRef.current = inputMode; }, [inputMode]);

  const canAnalyze = !!resumeFile && jobDescription.trim().length > 0;
  const isLoading = loadingExtraction || loadingScore;

  const clearResults = useCallback(() => {
    setResumeData(null);
    setMatchResult(null);
    setRewriteSuggestions(null);
    setCoverLetter(null);
    setStudyItems(null);
    setBatchResults(null);
  }, []);

  // Check for Stripe redirect params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('token');
    const success = params.get('success');
    const canceled = params.get('canceled');

    // Restore persisted state from sessionStorage immediately on any Stripe redirect
    // so the user sees their data while payment is verified (or after cancellation).
    if (success || canceled) {
      const savedJd = sessionStorage.getItem('pending_jd');
      const savedResumeData = sessionStorage.getItem('pending_resume_data');
      const savedGithubProfile = sessionStorage.getItem('pending_github_profile');
      const savedInputMode = sessionStorage.getItem('pending_input_mode');

      if (savedJd) setJobDescription(savedJd);
      if (savedResumeData) {
        try { setResumeData(JSON.parse(savedResumeData)); } catch { /* ignore corrupt data */ }
      }
      if (savedGithubProfile) {
        try { setGithubProfile(JSON.parse(savedGithubProfile)); } catch { /* ignore corrupt data */ }
      }
      if (savedInputMode) setInputMode(savedInputMode as InputMode);

      // Clear sessionStorage after restoring
      sessionStorage.removeItem('pending_jd');
      sessionStorage.removeItem('pending_resume_data');
      sessionStorage.removeItem('pending_github_profile');
      sessionStorage.removeItem('pending_input_mode');
    }

    if (canceled) {
      setPaymentState('canceled');
      window.history.replaceState({}, '', '/');
      return;
    }

    if (success && sessionId) {
      setPaymentState('pending');
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const res = await fetch('/api/redeem-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        if (res.ok) {
          const { token } = await res.json();
          setAnalysisToken(token);
          setPaymentState('paid');
          clearInterval(poll);
          window.history.replaceState({}, '', '/');
        }
        if (attempts >= 10) {
          clearInterval(poll);
          setPaymentState('canceled');
        }
      }, 1000);
    }
  }, []);

  const handleDemo = useCallback(async () => {
    setIsDemoMode(true);
    setError(null);
    setAnalysisToken(null);
    setPaymentState('idle');
    clearResults();
    setJobDescription(DEMO_JOB_DESCRIPTION);
    setInputMode('single');

    // Phase 1: Extract
    setLoadingExtraction(true);
    await new Promise((r) => setTimeout(r, 1200));
    setResumeData(DEMO_RESUME_DATA);
    setLoadingExtraction(false);

    // Phase 2: Score
    setLoadingScore(true);
    await new Promise((r) => setTimeout(r, 900));
    setMatchResult(DEMO_MATCH_RESULT);
    setLoadingScore(false);

    // Phase 3: Rewrites + Study Plan (parallel)
    setLoadingRewrite(true);
    setLoadingStudyPlan(true);
    await new Promise((r) => setTimeout(r, 800));
    setRewriteSuggestions(DEMO_REWRITE_SUGGESTIONS);
    setLoadingRewrite(false);
    setStudyItems(DEMO_STUDY_ITEMS);
    setLoadingStudyPlan(false);

    // Phase 4: Cover letter
    setLoadingCoverLetter(true);
    await new Promise((r) => setTimeout(r, 700));
    setCoverLetter(DEMO_COVER_LETTER);
    setLoadingCoverLetter(false);
  }, [clearResults]);

  const handleAnalyze = useCallback(async () => {
    if (!resumeFile) return;

    setError(null);
    clearResults();
    setLoadingExtraction(true);

    let extracted: ResumeData;

    // Phase 1: Extract resume data (free, no token required)
    try {
      const base64 = await extractPdfBase64(resumeFile);

      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setError(err instanceof Error ? err.message : 'Extraction failed');
      setLoadingExtraction(false);
      return;
    }

    setLoadingExtraction(false);

    // After Phase 1: check for token
    if (!analysisToken && !isDemoMode) {
      // Show PayGate — halt pipeline until payment completes
      return;
    }

    // Run paid phases (2-4)
    await runPaidPhasesRef(extracted);
  }, [resumeFile, jobDescription, analysisToken, githubProfile, isDemoMode, clearResults]);

  // Store runPaidPhases in a ref so handleAnalyze can call it before it's defined
  const runPaidPhasesRef = useCallback(async (extracted: ResumeData) => {
    if (!analysisToken) return;

    setLoadingScore(true);

    // Phase 2: Score against job description
    let scoreResult: MatchResult;
    try {
      const scoreRes = await fetch('/api/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-analysis-token': analysisToken,
        },
        body: JSON.stringify({
          resumeData: extracted,
          jobDescription,
          ...(githubProfile ? { githubProfile } : {}),
        }),
      });

      if (!scoreRes.ok) {
        const data = await scoreRes.json().catch(() => ({}));
        throw new Error(data.error ?? `Scoring failed (${scoreRes.status})`);
      }

      const scoreData: ScoreResponse = await scoreRes.json();
      scoreResult = scoreData.matchResult;
      setMatchResult(scoreResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scoring failed');
      setLoadingScore(false);
      return;
    }

    setLoadingScore(false);

    // Phase 3: Rewrites + Study Plan (parallel, non-blocking)
    setLoadingRewrite(true);
    setLoadingStudyPlan(true);

    const rewritePromise = fetch('/api/rewrite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-analysis-token': analysisToken,
      },
      body: JSON.stringify({ resumeData: extracted, jobDescription }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Rewrite generation failed');
        const data: RewriteResponse = await res.json();
        setRewriteSuggestions(data.suggestions);
      })
      .catch(() => {
        // Non-critical — don't block on failure
      })
      .finally(() => setLoadingRewrite(false));

    const studyPromise = fetch('/api/study-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-analysis-token': analysisToken,
      },
      body: JSON.stringify({ matchResult: scoreResult, resumeData: extracted }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Study plan generation failed');
        const data: StudyPlanResponse = await res.json();
        setStudyItems(data.items);
      })
      .catch(() => {
        // Non-critical
      })
      .finally(() => setLoadingStudyPlan(false));

    await Promise.all([rewritePromise, studyPromise]);

    // Phase 4: Cover letter
    setLoadingCoverLetter(true);
    try {
      const coverRes = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-analysis-token': analysisToken,
        },
        body: JSON.stringify({
          resumeData: extracted,
          matchResult: scoreResult,
          jobDescription,
        }),
      });

      if (coverRes.ok) {
        const data = await coverRes.json();
        setCoverLetter(data.coverLetter);
      }
    } catch {
      // Non-critical
    }
    setLoadingCoverLetter(false);
  }, [analysisToken, jobDescription, githubProfile]);

  // Auto-trigger paid phases when token becomes available after Stripe redirect
  useEffect(() => {
    if (!analysisToken || isDemoMode) return;
    if (!resumeData) return; // No extracted data yet
    if (matchResult) return; // Already ran scoring

    runPaidPhasesRef(resumeData);
  }, [analysisToken, resumeData, matchResult, isDemoMode]);

  const handleBatchScore = useCallback(async (descriptions: string[]) => {
    if (!resumeFile) {
      setError('Upload a resume before batch scoring.');
      return;
    }

    setError(null);
    clearResults();
    setLoadingExtraction(true);

    // Phase 1: Extract resume
    let extracted: ResumeData;
    try {
      const base64 = await extractPdfBase64(resumeFile);
      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setError(err instanceof Error ? err.message : 'Extraction failed');
      setLoadingExtraction(false);
      return;
    }

    setLoadingExtraction(false);

    // After Phase 1: check for token
    if (!analysisToken && !isDemoMode) {
      return;
    }

    // Phase 2: Score each JD in parallel
    setLoadingBatch(true);
    const results: BatchScoreResult[] = [];

    const promises = descriptions.map(async (jd) => {
      try {
        const scoreRes = await fetch('/api/score', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-analysis-token': analysisToken!,
          },
          body: JSON.stringify({
            resumeData: extracted,
            jobDescription: jd,
            ...(githubProfile ? { githubProfile } : {}),
          }),
        });

        if (!scoreRes.ok) return null;

        const scoreData: ScoreResponse = await scoreRes.json();
        const match = scoreData.matchResult;

        // Extract job title and company from JD (best effort — regex covers common patterns like "Company is seeking a Title")
        const lines = jd.split('\n').filter((l) => l.trim().length > 0);
        const firstLine = lines[0] ?? 'Unknown Position';
        const seekingMatch = firstLine.match(/^(.+?)\s+(?:is seeking|is looking for|is hiring)\s+(?:a|an)\s+(.+)/i);

        // Truncate at word boundary for cleaner display
        let titleFallback = firstLine;
        if (titleFallback.length > 80) {
          const truncated = titleFallback.slice(0, 80);
          const lastSpace = truncated.lastIndexOf(' ');
          titleFallback = (lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated) + '…';
        }

        return {
          jobTitle: seekingMatch ? seekingMatch[2].trim() : titleFallback,
          company: seekingMatch ? seekingMatch[1].trim() : 'Unknown Company',
          score: match.score,
          matchedSkills: match.matchedSkills,
          topGaps: match.missingSkills.slice(0, 3),
          recommendation: match.recommendation,
          jobDescription: jd,
        } satisfies BatchScoreResult;
      } catch {
        return null;
      }
    });

    const settled = await Promise.all(promises);
    for (const r of settled) {
      if (r) results.push(r);
    }

    setBatchResults(results.length > 0 ? results : null);
    if (results.length === 0) {
      setError('Failed to score any job descriptions. Try again.');
    }
    setLoadingBatch(false);
  }, [resumeFile, analysisToken, githubProfile, isDemoMode, clearResults]);

  const handleBatchDrillDown = useCallback((result: BatchScoreResult) => {
    setInputMode('single');
    setJobDescription(result.jobDescription);
    setMatchResult({
      score: result.score,
      matchedSkills: result.matchedSkills,
      missingSkills: result.topGaps,
      recommendation: result.recommendation,
    });
    setBatchResults(null);
  }, []);

  const handlePay = async () => {
    // Persist state before leaving for Stripe — use refs to avoid stale closures
    const currentJd = jobDescriptionRef.current;
    const currentResumeData = resumeDataRef.current;
    const currentGithubProfile = githubProfileRef.current;
    const currentInputMode = inputModeRef.current;

    if (currentJd) sessionStorage.setItem('pending_jd', currentJd);
    if (currentResumeData) sessionStorage.setItem('pending_resume_data', JSON.stringify(currentResumeData));
    if (currentGithubProfile) sessionStorage.setItem('pending_github_profile', JSON.stringify(currentGithubProfile));
    sessionStorage.setItem('pending_input_mode', currentInputMode);

    const res = await fetch('/api/create-checkout', { method: 'POST' });
    const { url } = await res.json();
    window.location.href = url;
  };

  const handlePayCancel = () => {
    clearResults();
    setPaymentState('idle');
    // Clear persisted state
    sessionStorage.removeItem('pending_jd');
    sessionStorage.removeItem('pending_resume_data');
    sessionStorage.removeItem('pending_github_profile');
    sessionStorage.removeItem('pending_input_mode');
  };

  const showPayGate = !isDemoMode && !analysisToken && resumeData && !loadingExtraction;

  const showResults =
    isLoading || loadingRewrite || loadingCoverLetter || loadingStudyPlan ||
    !!resumeData || !!matchResult || !!batchResults || loadingBatch;

  // Phase step indicator helper
  function Step({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
    return (
      <div className="flex items-center gap-1.5">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
            done
              ? 'bg-brand-accent text-white'
              : active
              ? 'bg-brand-accent/20 text-brand-accent'
              : 'bg-brand-border text-brand-muted'
          }`}
        >
          {done ? '✓' : num}
        </span>
        <span className={`${active ? 'text-brand-text' : 'text-brand-muted'}`}>{label}</span>
      </div>
    );
  }

  // Get current phase label for the analyze button
  function getAnalyzeButtonText() {
    if (loadingExtraction) return 'Extracting resume…';
    if (loadingScore) return 'Analyzing gaps…';
    if (loadingRewrite) return 'Generating rewrites…';
    if (loadingStudyPlan) return 'Building study plan…';
    if (loadingCoverLetter) return 'Writing cover letter…';
    return 'Analyze';
  }

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-brand-bg px-4 py-10">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="text-left">
              <h1 className="text-3xl font-bold text-brand-text">Resume Parser</h1>
              <p className="mt-2 text-sm text-brand-muted">
                Stop guessing. Start applying strategically. Get a battle plan for every job you target.
              </p>
            </div>
            {!isDemoMode && (
              <button
                onClick={handleDemo}
                className="rounded-xl border border-brand-border bg-transparent px-4 py-2 text-sm font-medium text-brand-muted transition-colors hover:border-brand-accent hover:text-brand-text"
              >
                Try Demo
              </button>
            )}
          </div>

          {/* Step indicator */}
          {!isDemoMode && (
            <div className="mb-8 flex items-center gap-2 text-xs">
              <Step num={1} label="Upload" active={!resumeData} done={!!resumeData} />
              <Step num={2} label="Describe" active={!!resumeData && !jobDescription} done={jobDescription.length > 0} />
              <Step num={3} label="Analyze" active={!!resumeData && !!jobDescription && !matchResult} done={!!matchResult} />
              <Step num={4} label="Results" active={!!matchResult && !coverLetter} done={!!coverLetter} />
            </div>
          )}

          {/* Input panels */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-brand-border bg-brand-surface p-6">
                <ResumeUpload onChange={setResumeFile} />
              </div>
              <div className="rounded-2xl border border-brand-border bg-brand-surface p-6">
                <GitHubConnect onProfile={setGithubProfile} />
              </div>
            </div>
            <div className="rounded-2xl border border-brand-border bg-brand-surface p-6">
              {/* Mode toggle */}
              <div className="mb-4 flex gap-1 rounded-lg bg-brand-bg p-1">
                <button
                  onClick={() => setInputMode('single')}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    inputMode === 'single'
                      ? 'bg-brand-surface text-brand-text shadow-sm'
                      : 'text-brand-muted hover:text-brand-text'
                  }`}
                >
                  Single JD
                </button>
                <button
                  onClick={() => setInputMode('batch')}
                  disabled={isDemoMode}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    inputMode === 'batch'
                      ? 'bg-brand-surface text-brand-text shadow-sm'
                      : 'text-brand-muted hover:text-brand-text'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  Batch Mode
                </button>
              </div>

              {inputMode === 'single' ? (
                <JobDescription onChange={setJobDescription} value={jobDescription} />
              ) : (
                <BatchJobDescriptions
                  onSubmit={handleBatchScore}
                  loading={loadingBatch || loadingExtraction}
                />
              )}
            </div>
          </div>

          {/* Analyze button (single mode only, hidden when PayGate is shown) */}
          {inputMode === 'single' && !showPayGate && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze || isLoading || isDemoMode}
                title={isDemoMode ? 'Not available in demo mode' : undefined}
                className="flex items-center gap-2 rounded-xl bg-brand-accent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                {(isLoading || loadingRewrite || loadingStudyPlan || loadingCoverLetter) && <Spinner />}
                {getAnalyzeButtonText()}
              </button>
              {error && <p className="text-sm text-brand-red">{error}</p>}
            </div>
          )}

          {/* Batch mode error */}
          {inputMode === 'batch' && error && (
            <div className="mt-6 text-center">
              <p className="text-sm text-brand-red">{error}</p>
            </div>
          )}

          {/* Demo banner */}
          {isDemoMode && (
            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-600 dark:text-amber-400">
              Demo mode — showing pre-loaded sample results.
            </div>
          )}

          {/* Results section */}
          {showResults && (
            <div className="mt-10 flex flex-col gap-6">
              {/* Batch results */}
              {(batchResults || loadingBatch) && (
                <BatchResults
                  results={batchResults}
                  loading={loadingBatch}
                  onSelect={handleBatchDrillDown}
                />
              )}

              {/* Single analysis results */}
              {(resumeData || matchResult || loadingExtraction || loadingScore) && (
                <>
                  {/* Top row: Resume Profile + Match Score */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <ResumeProfile data={resumeData} loading={loadingExtraction} />
                    <MatchScore result={matchResult} loading={loadingScore} />
                  </div>

                  {/* PayGate (after Phase 1) — shown below extracted resume */}
                  {showPayGate && (
                    <PayGate
                      resumeData={resumeData}
                      paymentState={paymentState}
                      onPay={handlePay}
                      onCancel={handlePayCancel}
                    />
                  )}

                  {/* Rewrites */}
                  <ResumeRewriter suggestions={rewriteSuggestions} loading={loadingRewrite} />

                  {/* Study Plan + Cover Letter side by side */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <StudyPlan items={studyItems} loading={loadingStudyPlan} />
                    <CoverLetter content={coverLetter} loading={loadingCoverLetter} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </ErrorBoundary>
  );
}
