"use client";

import OptimizedResume from "@/components/OptimizedResume";
import JSZip from "jszip";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import BatchResults from "@/components/BatchResults";
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
import StarPrepPanel from "@/components/StarPrepPanel";
import StudyPlan from "@/components/StudyPlan";
import TourOverlay from "@/components/TourOverlay";
import {
  DEMO_COVER_LETTER,
  DEMO_GITHUB_PROFILE,
  DEMO_JOB_DESCRIPTION,
  DEMO_LINKEDIN_PROFILE,
  DEMO_MATCH_RESULT,
  DEMO_OPTIMIZED_RESUME,
  DEMO_RESUME_DATA,
  DEMO_REWRITE_SUGGESTIONS,
  DEMO_STAR_QUESTIONS,
  DEMO_STUDY_ITEMS,
} from "@/lib/demoData";
import { TOUR_STEPS } from "@/lib/tourConfig";
import type {
  BatchScoreResult,
  ConversationMessage,
  GitHubProfile,
  LinkedInProfile,
  MatchResult,
  ResumeData,
  RewriteSuggestion,
  StarAnswer,
  StarQuestion,
  StudyItem,
} from "@/lib/types";

// ── Tour step thresholds ─────────────────────────────────────────────────────
// These mirror the constants in tourConfig so syncTourState maps correctly to
// each TOUR_STEPS entry.

const TOUR_STEP_GITHUB_READY = 4;
const TOUR_STEP_LINKEDIN_READY = 5;
const TOUR_STEP_SCORE_READY = 6;
const TOUR_STEP_REWRITES = 8;
const TOUR_STEP_STUDY = 9;
const TOUR_STEP_COVER = 10;
const TOUR_STEP_INTERVIEW = 11;
const TOUR_STEP_RESUME = 12;

type ResultTab = "rewrites" | "study" | "cover" | "interview" | "resume";

// ── Shared step-pill ─────────────────────────────────────────────────────────

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
    <div className={`step-pill ${done ? "step-pill--done" : active ? "step-pill--active" : ""}`.trim()}>
      <span className="step-pill__num">{done ? "✓" : number}</span>
      <span className="step-pill__label">{label}</span>
    </div>
  );
}

// ── DemoExperience ───────────────────────────────────────────────────────────
//
// Fully isolated demo component. No real API calls, no localStorage, no
// payment flow. All state is driven by the syncTourState function, which
// populates the app with pre-baked fixtures at each tour step.

export default function DemoExperience() {
  // ── Data state ─────────────────────────────────────────────────────────────
  const [jobDescriptions, setJobDescriptions] = useState<string[]>([DEMO_JOB_DESCRIPTION]);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [rewriteSuggestions, setRewriteSuggestions] = useState<RewriteSuggestion[] | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [studyItems, setStudyItems] = useState<StudyItem[] | null>(null);
  const [githubProfile, setGithubProfile] = useState<GitHubProfile | null>(null);
  const [linkedinProfile, setLinkedinProfile] = useState<LinkedInProfile | null>(null);
  const [batchResults] = useState<BatchScoreResult[] | null>(null);
  const [analysisToken, setAnalysisToken] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<"idle" | "paid">("idle");
  const [activeTab, setActiveTab] = useState<ResultTab>("rewrites");
  const [starQuestions, setStarQuestions] = useState<StarQuestion[]>([]);
  const [starAnswers, setStarAnswers] = useState<StarAnswer[]>([]);
  const [activeStarQuestion, setActiveStarQuestion] = useState<StarQuestion | null>(null);
  const [starMessages, setStarMessages] = useState<ConversationMessage[]>([]);
  const [optimizedResume, setOptimizedResume] = useState<string | null>(null);

  // ── Tour state ─────────────────────────────────────────────────────────────
  const [isTourActive, setIsTourActive] = useState(true);
  const [tourStep, setTourStep] = useState(0);
  const [tourCompleted, setTourCompleted] = useState(false);

  // ── Derived state ──────────────────────────────────────────────────────────
  const hasPaidContent = Boolean(rewriteSuggestions) || Boolean(studyItems) || Boolean(coverLetter) || Boolean(optimizedResume);
  const showPayGate = !analysisToken && Boolean(matchResult);
  const showResults = Boolean(resumeData) || Boolean(matchResult);
  const canExport = hasPaidContent || Boolean(batchResults);

  // ── syncTourState ──────────────────────────────────────────────────────────
  // The single source of truth for demo state. Calling it with a step index
  // loads exactly the fixtures that should be visible at that tour step.

  const syncTourState = useCallback((stepIndex: number) => {
    const hasGithub = stepIndex >= TOUR_STEP_GITHUB_READY;
    const hasLinkedIn = stepIndex >= TOUR_STEP_LINKEDIN_READY;
    const hasScore = stepIndex >= TOUR_STEP_SCORE_READY;
    const hasPaidDemo = stepIndex >= TOUR_STEP_REWRITES;
    const hasOptimizedResume = stepIndex >= TOUR_STEP_RESUME;

    setJobDescriptions([DEMO_JOB_DESCRIPTION]);
    setResumeData(stepIndex >= TOUR_STEP_SCORE_READY ? DEMO_RESUME_DATA : null);
    setGithubProfile(hasGithub ? DEMO_GITHUB_PROFILE : null);
    setLinkedinProfile(hasLinkedIn ? DEMO_LINKEDIN_PROFILE : null);
    setMatchResult(hasScore ? DEMO_MATCH_RESULT : null);
    setAnalysisToken(hasPaidDemo ? "demo" : null);
    setPaymentState(hasPaidDemo ? "paid" : "idle");
    setRewriteSuggestions(hasPaidDemo ? DEMO_REWRITE_SUGGESTIONS : null);
    setStudyItems(hasPaidDemo ? DEMO_STUDY_ITEMS : null);
    setCoverLetter(hasPaidDemo ? DEMO_COVER_LETTER : null);
    setStarQuestions(hasPaidDemo ? DEMO_STAR_QUESTIONS : []);
    setStarAnswers([]);
    setActiveStarQuestion(hasPaidDemo ? (DEMO_STAR_QUESTIONS[0] ?? null) : null);
    setStarMessages([]);
    setOptimizedResume(hasOptimizedResume ? DEMO_OPTIMIZED_RESUME : null);

    if (stepIndex >= TOUR_STEP_RESUME) {
      setActiveTab("resume");
    } else if (stepIndex >= TOUR_STEP_INTERVIEW) {
      setActiveTab("interview");
    } else if (stepIndex >= TOUR_STEP_COVER) {
      setActiveTab("cover");
    } else if (stepIndex >= TOUR_STEP_STUDY) {
      setActiveTab("study");
    } else if (stepIndex >= TOUR_STEP_REWRITES) {
      setActiveTab("rewrites");
    } else if (stepIndex >= TOUR_STEP_SCORE_READY) {
      setActiveTab("interview");
    } else {
      setActiveTab("rewrites");
    }
  }, []);

  // Drive state from the active tour step.
  // syncTourState batches many setState calls — React 18 flushes them together.
  useEffect(() => {
    if (!isTourActive) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    syncTourState(tourStep);
  }, [isTourActive, syncTourState, tourStep]);

  // ── Tour handlers ──────────────────────────────────────────────────────────

  const handleTourNext = useCallback(() => {
    const nextStep = tourStep + 1;
    if (nextStep >= TOUR_STEPS.length) {
      setIsTourActive(false);
      setTourCompleted(true);
    } else {
      setTourStep(nextStep);
    }
  }, [tourStep]);

  const handleTourPrev = useCallback(() => {
    setTourStep((s) => Math.max(0, s - 1));
  }, []);

  const handleTourSkip = useCallback(() => {
    syncTourState(TOUR_STEPS.length - 1);
    setIsTourActive(false);
    setTourCompleted(true);
  }, [syncTourState]);

  const handleRestartTour = useCallback(() => {
    setTourStep(0);
    setTourCompleted(false);
    setIsTourActive(true);
  }, []);

  // ── Demo action handlers ───────────────────────────────────────────────────
  // These simulate what real API calls would do — applying fixtures instantly.

  const handleAnalyze = useCallback(() => {
    setTourStep(TOUR_STEP_SCORE_READY);
  }, []);

  const applyDemoPaidFixtures = useCallback(() => {
    setAnalysisToken("demo");
    setPaymentState("paid");
    setRewriteSuggestions(DEMO_REWRITE_SUGGESTIONS);
    setStudyItems(DEMO_STUDY_ITEMS);
    setCoverLetter(DEMO_COVER_LETTER);
    setStarQuestions(DEMO_STAR_QUESTIONS);
    setActiveStarQuestion(DEMO_STAR_QUESTIONS[0] ?? null);
    setOptimizedResume(null);
    setActiveTab("rewrites");
    setTourStep(TOUR_STEP_REWRITES);
  }, []);

  // ── Export ─────────────────────────────────────────────────────────────────

  const handleExportZip = useCallback(async () => {
    const zip = new JSZip();
    if (coverLetter) zip.file("cover-letter.txt", coverLetter);
    if (optimizedResume) zip.file("optimized-resume.txt", optimizedResume);
    if (rewriteSuggestions?.length) {
      const text = rewriteSuggestions
        .map((s) => [s.originalRole, "", `Before: ${s.originalBullet}`, "", `After:  ${s.rewrittenBullet}`, "", `Why:    ${s.rationale}`].join("\n"))
        .join("\n\n---\n\n");
      zip.file("optimized-bullets.txt", text);
    }
    if (studyItems?.length) {
      const text = studyItems
        .map((item) => [`[${item.severity.toUpperCase()}] ${item.skill}`, item.action, `Resource: ${item.resource}`].join("\n"))
        .join("\n\n---\n\n");
      zip.file("study-plan.txt", text);
    }
    if (matchResult) {
      zip.file("match-report.txt", [
        "MATCH REPORT", "============",
        `Score: ${matchResult.score}%`, "",
        `Recommendation: ${matchResult.recommendation}`, "",
        `Matched Skills: ${matchResult.matchedSkills.join(", ")}`, "",
        "Gaps:",
        ...matchResult.missingSkills.map((g) => `  [${g.severity}] ${g.skill}: ${g.reason}`),
      ].join("\n"));
    }
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `passstack-demo.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [coverLetter, optimizedResume, rewriteSuggestions, studyItems, matchResult]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ErrorBoundary>
      <main className="app-shell">
        {isTourActive && (
          <TourOverlay
            steps={TOUR_STEPS}
            currentStep={tourStep}
            onNext={handleTourNext}
            onPrev={handleTourPrev}
            onSkip={handleTourSkip}
          />
        )}

        <nav className="site-nav site-nav--scrolled">
          <div className="container nav-inner">
            <Link href="/" className="brand-mark" aria-label="PassStack home">
              <PassStackLogo />
            </Link>
            <div className="nav-actions">
              {!isTourActive && tourCompleted && (
                <button type="button" onClick={handleRestartTour} className="btn-ghost">
                  ↺ Take a tour
                </button>
              )}
              {canExport && (
                <button
                  type="button"
                  onClick={() => void handleExportZip()}
                  className="btn-ghost tour-export-btn"
                >
                  ↓ Export .zip
                </button>
              )}
              <Link href="/app" className="btn-primary">
                Try it for real →
              </Link>
            </div>
          </div>
        </nav>

        <section className="container app-hero">
          <div className="app-heading">
            <div className="eyebrow">interactive demo</div>
            <h1 className="display">See PassStack in action.</h1>
            <p className="result-muted">
              This is a guided tour using sample data. No account or payment required.
              When you&apos;re ready, <Link href="/app" className="link-inline">try it with your own resume</Link>.
            </p>
          </div>
        </section>

        <section id="workspace" className="container" style={{ paddingBottom: "var(--space-16)" }}>
          {!showResults ? (
            <>
              <div className="step-indicator" style={{ marginBottom: "var(--space-6)" }}>
                <StepPill number={1} label="Upload" active done={false} />
                <StepPill number={2} label="Describe" active={false} done={jobDescriptions.length > 0} />
                <StepPill number={3} label="Score" active={false} done={Boolean(matchResult)} />
                <StepPill number={4} label="Full analysis" active={showPayGate} done={hasPaidContent} />
              </div>

              <div className="panel-grid">
                <div className="panel-stack">
                  <div className="card tour-anchor-resume">
                    {/* Non-functional in demo — shown for tour spotlight only */}
                    <ResumeUpload onChange={() => undefined} sessionResumeName={null} />
                  </div>
                  <div className="card card-sage tour-anchor-github">
                    <GitHubConnect onProfile={() => undefined} initialProfile={githubProfile} />
                  </div>
                  <div className="card card-sage tour-anchor-linkedin">
                    <LinkedInConnect onProfile={() => undefined} initialProfile={linkedinProfile} />
                  </div>
                </div>

                <div className="card tour-anchor-job-description">
                  <JobDescriptionList
                    value={jobDescriptions}
                    onChange={setJobDescriptions}
                    disabled={isTourActive}
                  />
                </div>
              </div>

              <div style={{ marginTop: "var(--space-6)", display: "grid", gap: "var(--space-3)", justifyItems: "center" }}>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  className="btn-primary btn-large tour-analyze-button"
                >
                  Analyze
                </button>
                <p className="fine-print">Score is free. Full analysis unlocked with a one-time $5 payment.</p>
              </div>
            </>
          ) : (
            <div className="workspace-results">
              {/* Left sidebar */}
              <div className="workspace-sidebar tour-anchor-score">
                <MatchScore result={matchResult} loading={false} />

                {showPayGate && matchResult && resumeData ? (
                  <PayGate
                    resumeData={resumeData}
                    score={matchResult.score}
                    paymentState={paymentState}
                    onPay={applyDemoPaidFixtures}
                  />
                ) : null}

                <div className="card card-soft" style={{ display: "grid", gap: "var(--space-3)" }}>
                  <div className="eyebrow" style={{ marginBottom: "var(--space-1)" }}>demo session</div>
                  {resumeData?.name && (
                    <p style={{ fontSize: "13px", fontWeight: 500 }}>{resumeData.name}</p>
                  )}
                  <p className="result-muted" style={{ fontSize: "12px" }}>
                    {jobDescriptions.length} job{jobDescriptions.length !== 1 ? "s" : ""}
                    {githubProfile ? ` · @${githubProfile.username}` : ""}
                    {linkedinProfile?.currentCompany ? ` · ${linkedinProfile.currentCompany}` : ""}
                  </p>
                </div>
              </div>

              {/* Right main */}
              <div style={{ display: "grid", gap: "var(--space-6)", alignContent: "start" }}>
                {batchResults && (
                  <BatchResults
                    results={batchResults}
                    loading={false}
                    onSelect={() => undefined}
                    selectedJD={null}
                  />
                )}

                {(hasPaidContent || !!matchResult) && (
                  <>
                    <div className="result-tabs" role="tablist">
                      {(["rewrites", "study", "cover", "interview", "resume"] as ResultTab[]).map((tab) => {
                        const locked = !analysisToken && tab !== "interview";
                        const labels: Record<ResultTab, string> = {
                          rewrites: "Bullet Rewrites",
                          study: "Study Plan",
                          cover: "Cover Letter",
                          interview: "Interview Prep",
                          resume: "Optimized Resume",
                        };
                        const tourClass: Record<ResultTab, string> = {
                          rewrites: "tour-tab-rewrites",
                          study: "tour-tab-study",
                          cover: "tour-tab-cover",
                          interview: "tour-tab-interview",
                          resume: "tour-tab-resume",
                        };
                        return (
                          <button
                            key={tab}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab}
                            className={`result-tab ${tourClass[tab]} ${activeTab === tab ? "result-tab--active" : ""}`.trim()}
                            onClick={() => setActiveTab(tab)}
                          >
                            {locked && <span className="tab-lock" aria-label="locked">🔒</span>}
                            {labels[tab]}
                            {tab === "rewrites" && rewriteSuggestions && (
                              <span className="tab-count"> ({rewriteSuggestions.length})</span>
                            )}
                            {tab === "study" && studyItems && (
                              <span className="tab-count"> ({studyItems.length})</span>
                            )}
                            {tab === "interview" && starAnswers.length > 0 && (
                              <span className="tab-count"> ({starAnswers.length})</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Locked tab inline upsell */}
                    {!analysisToken && activeTab !== "interview" ? (
                      <div className="tab-locked-upsell">
                        <p className="tab-locked-upsell__text">
                          This feature is part of the full analysis.
                        </p>
                        <button
                          type="button"
                          className="btn-primary btn-inline"
                          onClick={applyDemoPaidFixtures}
                        >
                          Unlock — $5 →
                        </button>
                      </div>
                    ) : (
                      <>
                        {activeTab === "rewrites" && (
                          <ResumeRewriter suggestions={rewriteSuggestions} loading={false} />
                        )}
                        {activeTab === "study" && (
                          <StudyPlan items={studyItems} loading={false} />
                        )}
                        {activeTab === "cover" && (
                          <CoverLetter content={coverLetter} loading={false} blockedSkills={null} />
                        )}
                        {activeTab === "interview" && (
                          !analysisToken ? (
                            matchResult && resumeData ? (
                              <div className="tour-anchor-interview-paygate">
                                <PayGate
                                  resumeData={resumeData}
                                  score={matchResult.score}
                                  paymentState={paymentState}
                                  onPay={applyDemoPaidFixtures}
                                />
                              </div>
                            ) : null
                          ) : (
                            matchResult && resumeData ? (
                              <StarPrepPanel
                                resumeData={resumeData}
                                matchResult={matchResult}
                                jobDescription={jobDescriptions[0] ?? ""}
                                token={analysisToken}
                                tokenExpiresAt={null}
                                questions={starQuestions}
                                answers={starAnswers}
                                activeQuestion={activeStarQuestion}
                                starMessages={starMessages}
                                isDemo
                                onQuestionsLoaded={setStarQuestions}
                                onAnswerComplete={(a) => setStarAnswers((prev) => [...prev, a])}
                                onQuestionChange={(q) => {
                                  setActiveStarQuestion(q);
                                  setStarMessages([]);
                                }}
                                onMessageSend={setStarMessages}
                              />
                            ) : null
                          )
                        )}
                        {activeTab === "resume" && (
                          <OptimizedResume
                            content={optimizedResume}
                            loading={false}
                            canGenerate={Boolean(analysisToken)}
                            onGenerate={() => setOptimizedResume(DEMO_OPTIMIZED_RESUME)}
                          />
                        )}
                      </>
                    )}
                  </>
                )}

                {!hasPaidContent && !!matchResult && activeTab !== "interview" && (
                  <div
                    style={{
                      padding: "var(--space-16) var(--space-8)",
                      textAlign: "center",
                      color: "var(--ps-text-faint)",
                      border: "1px dashed var(--ps-border)",
                      borderRadius: "var(--radius-lg)",
                    }}
                  >
                    <p className="eyebrow">ready to unlock</p>
                    <p className="result-muted" style={{ marginTop: "var(--space-3)", fontSize: "13px" }}>
                      Click &ldquo;Pay now&rdquo; in the sidebar — or advance the tour — to see full analysis.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </ErrorBoundary>
  );
}
