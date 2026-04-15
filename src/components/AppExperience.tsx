"use client";

import OptimizedResume from "@/components/OptimizedResume";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import BatchResults from "@/components/BatchResults";
import CheckoutModal from "@/components/CheckoutModal";
import CoverLetter from "@/components/CoverLetter";
import ErrorBoundary from "@/components/ErrorBoundary";
import ErrorCard from "@/components/ErrorCard";
import ExperienceInterviewer from "@/components/ExperienceInterviewer";
import GitHubConnect from "@/components/GitHubConnect";
import JobDescriptionList from "@/components/JobDescriptionList";
import LinkedInConnect from "@/components/LinkedInConnect";
import MatchScore from "@/components/MatchScore";
import PassStackLogo from "@/components/PassStackLogo";
import ResumeRewriter from "@/components/ResumeRewriter";
import ResumeUpload from "@/components/ResumeUpload";
import Spinner from "@/components/Spinner";
import StarPrepPanel from "@/components/StarPrepPanel";
import StudyPlan from "@/components/StudyPlan";
import { useWorkspace, LS_KEY } from "@/lib/useWorkspace";
import { usePayment } from "@/lib/usePayment";
import { usePaidPhases } from "@/lib/usePaidPhases";

export { LS_KEY };

type ResultTab = "rewrites" | "study" | "cover" | "interview" | "resume";

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

/** Focus trap hook for modals — keeps Tab/Shift+Tab within the container */
function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [active]);

  return containerRef;
}

export default function AppExperience() {
  const ws = useWorkspace();
  const { openCheckout, handlePay } = usePayment(ws);
  const phases = usePaidPhases(ws, openCheckout);

  const {
    resumeData, matchResult, rewriteSuggestions, coverLetter, coverLetterBlocked,
    studyItems, githubProfile, linkedinProfile, batchResults, selectedBatchJD,
    loadingExtraction, loadingScore, loadingRewrite, loadingCoverLetter,
    loadingStudyPlan, loadingBatch, loadingOptimizedResume,
    error, analysisToken, checkoutClientSecret,
    activeTab, showResetConfirm, tabNotifications,
    showInterviewer, showPhase0Modal, interviewBrief, enrichedResumeData,
    starQuestions, starAnswers, activeStarQuestion, starMessages,
    optimizedResume, resumeFile, jobDescriptions,

    // Setters
    setResumeFile, setJobDescriptions, setGithubProfile, setLinkedinProfile,
    setActiveTab, setShowResetConfirm, setShowInterviewer, setShowPhase0Modal,
    setStarQuestions, setStarAnswers, setActiveStarQuestion, setStarMessages,
    setCheckoutClientSecret, setError, tokenExpiresAt,
    clearTabNotification,

    // Derived
    canAnalyze, isBusy, hasPaidContent, loadingPaid, showResults, canExport,
  } = ws;

  const {
    handleAnalyze, handleBatchDrillDown, handleBatchBack,
    handleBatchAnalyze, handleBriefComplete, handlePaymentSuccess,
    handleGenerateResume, handleExportZip,
  } = phases;

  const { resetWorkspace, resetForNewRole } = ws;

  // Focus trap for modals
  const checkoutTrapRef = useFocusTrap(Boolean(checkoutClientSecret));
  const resetTrapRef = useFocusTrap(showResetConfirm);
  const phase0TrapRef = useFocusTrap(showPhase0Modal);

  const showPayGate = !analysisToken && Boolean(matchResult) && !loadingScore && !loadingExtraction;

  const getAnalyzeButtonText = () => {
    if (loadingExtraction) return "Extracting resume…";
    if (loadingScore || loadingBatch) return "Scoring…";
    return jobDescriptions.length > 1 ? "Score all jobs" : "Analyze";
  };

  // Tab click handler — clear notification and switch
  const handleTabClick = useCallback((tab: ResultTab) => {
    setActiveTab(tab);
    clearTabNotification(tab);
  }, [setActiveTab, clearTabNotification]);

  // Determine which tabs are locked (no token, no paid content for that tab)
  const isTabLocked = useCallback((tab: ResultTab): boolean => {
    if (analysisToken) return false;
    if (tab === "interview") return false; // always visible even without token (shows paygate inline)
    return !hasPaidContent;
  }, [analysisToken, hasPaidContent]);

  return (
    <ErrorBoundary>
      <main className="app-shell">

        {checkoutClientSecret && (
          <div ref={checkoutTrapRef}>
            <CheckoutModal
              clientSecret={checkoutClientSecret}
              onSuccess={handlePaymentSuccess}
              onClose={() => setCheckoutClientSecret(null)}
            />
          </div>
        )}

        {showResetConfirm && (
          <div className="modal-backdrop" onClick={() => setShowResetConfirm(false)}>
            <div className="reset-confirm-modal" ref={resetTrapRef} onClick={(e) => e.stopPropagation()}>
              <div className="reset-confirm-header">
                <span className="reset-confirm-icon">⚠</span>
                <h2>This will permanently delete everything.</h2>
              </div>

              <p className="reset-confirm-body">
                Starting a new analysis wipes your current workspace. <strong>There is no undo.</strong> PassStack does not store your data anywhere — once it&apos;s gone, it&apos;s gone.
              </p>

              {(hasPaidContent || starAnswers.length > 0) && (
                <div className="reset-confirm-lostlist">
                  <p className="reset-confirm-lostlist-label">You will permanently lose:</p>
                  <ul>
                    {rewriteSuggestions && <li>Bullet rewrites ({rewriteSuggestions.length} suggestions)</li>}
                    {studyItems && <li>Study plan ({studyItems.length} items)</li>}
                    {(coverLetter || coverLetterBlocked) && <li>Cover letter</li>}
                    {optimizedResume && <li>Optimized resume</li>}
                    {starAnswers.length > 0 && <li>STAR interview answers ({starAnswers.length} completed)</li>}
                  </ul>
                </div>
              )}

              {canExport && (
                <button
                  type="button"
                  className="reset-confirm-export"
                  onClick={() => void handleExportZip()}
                >
                  ↓ Download everything first (.zip)
                </button>
              )}

              <div className="reset-confirm-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setShowResetConfirm(false)}
                  autoFocus
                >
                  Cancel — keep my work
                </button>
                <button
                  type="button"
                  className="reset-confirm-destroy"
                  onClick={() => { setShowResetConfirm(false); resetWorkspace(); }}
                >
                  Yes, delete everything
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Phase 0 decision modal — shown after extraction, before scoring */}
        {showPhase0Modal && (
          <div className="modal-backdrop" onClick={() => { setShowPhase0Modal(false); void handleAnalyze(); }}>
            <div className="phase0-decision-modal" ref={phase0TrapRef} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Enhance your resume">
              <div className="phase0-decision-header">
                <div className="eyebrow">optional · 2–3 minutes</div>
                <h2 className="phase0-decision-title">Want to sharpen your resume first?</h2>
                <p className="result-muted phase0-decision-desc">
                  Answer a few questions about your experience. This surfaces concrete impact metrics and hidden skills that make every downstream phase sharper.
                </p>
              </div>
              <div className="phase0-decision-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => { setShowPhase0Modal(false); setShowInterviewer(true); }}
                  autoFocus
                >
                  Yes, enhance first →
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => { setShowPhase0Modal(false); void handleAnalyze(); }}
                >
                  No, score now
                </button>
              </div>
            </div>
          </div>
        )}

        <nav className="site-nav site-nav--scrolled">
          <div className="container nav-inner">
            <Link href="/" className="brand-mark" aria-label="PassStack home">
              <PassStackLogo />
            </Link>
            <div className="nav-actions">
              {showResults && (
                <button type="button" onClick={() => setShowResetConfirm(true)} className="btn-ghost">
                  ↩ New analysis
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
              {!analysisToken && !checkoutClientSecret && (
                <button
                  type="button"
                  onClick={() => void handlePay()}
                  className="btn-primary"
                >
                  Unlock — $5 →
                </button>
              )}
            </div>
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

        <section id="workspace" className="container workspace-container">
          {!showResults ? (
            <>
              <div className="step-indicator step-indicator--spaced">
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
                  done={hasPaidContent}
                />
              </div>

              <div className="panel-grid">
                <div className="panel-stack">
                  <div className="card tour-anchor-resume">
                    <ResumeUpload
                      onChange={setResumeFile}
                      sessionResumeName={!resumeFile ? (resumeData?.name ?? null) : null}
                    />
                  </div>
                  <div className="card card-sage tour-anchor-github">
                    <GitHubConnect onProfile={setGithubProfile} initialProfile={githubProfile} />
                  </div>
                  <div className="card card-sage tour-anchor-linkedin">
                    <LinkedInConnect onProfile={setLinkedinProfile} initialProfile={linkedinProfile} />
                  </div>
                </div>

                <div className="card tour-anchor-job-description">
                  <JobDescriptionList
                    value={jobDescriptions}
                    onChange={setJobDescriptions}
                    disabled={isBusy}
                  />
                </div>
              </div>

              {/* Phase 0 — Interview complete chip */}
              {resumeData && interviewBrief && !showInterviewer && (
                <div className="interview-complete-chip">
                  <span className="interview-complete-chip__icon">✓</span>
                  <span className="result-muted interview-complete-chip__text">Interview context added — {interviewBrief.enriched_experiences.length} role{interviewBrief.enriched_experiences.length !== 1 ? "s" : ""} covered</span>
                </div>
              )}

              {/* Phase 0 — Experience Interviewer (open) */}
              {showInterviewer && resumeData && (
                <div className="interviewer-wrapper">
                  <ExperienceInterviewer
                    resumeData={enrichedResumeData ?? resumeData}
                    onBriefComplete={handleBriefComplete}
                    onSkip={() => setShowInterviewer(false)}
                  />
                </div>
              )}

              <div className="analyze-actions">
                {!showInterviewer && (
                  <button
                    type="button"
                    onClick={() => {
                      // If resume is extracted and no interview done yet, show Phase 0 decision modal
                      if (resumeData && !interviewBrief && !showInterviewer && canAnalyze) {
                        setShowPhase0Modal(true);
                        return;
                      }
                      void handleAnalyze();
                    }}
                    disabled={!canAnalyze || isBusy}
                    className="btn-primary btn-large tour-analyze-button"
                  >
                    {isBusy && <Spinner />}
                    {getAnalyzeButtonText()}
                  </button>
                )}
                <p className="fine-print">Score is free. Full analysis unlocked with a one-time $5 payment.</p>
                {error && (
                  <ErrorCard
                    message={error}
                    onDismiss={() => setError(null)}
                    onRetry={canAnalyze ? () => void handleAnalyze() : undefined}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="workspace-results">
              {/* Left sidebar — score + session info */}
              <div className="workspace-sidebar tour-anchor-score">
                <MatchScore result={matchResult} loading={loadingExtraction || loadingScore} />

                {selectedBatchJD && analysisToken && !hasPaidContent && !loadingPaid && (
                  <button
                    type="button"
                    className="btn-primary btn-large btn-full"
                    onClick={handleBatchAnalyze}
                    disabled={isBusy}
                  >
                    {isBusy && <Spinner />}
                    Generate full analysis
                  </button>
                )}

                <div className="card card-soft session-card">
                  <div className="eyebrow session-card__label">session</div>
                  {resumeData?.name && (
                    <p className="session-card__name">{resumeData.name}</p>
                  )}
                  <p className="result-muted session-card__meta">
                    {jobDescriptions.length} job{jobDescriptions.length !== 1 ? "s" : ""}
                    {githubProfile ? ` · @${githubProfile.username}` : ""}
                    {linkedinProfile?.currentCompany ? ` · ${linkedinProfile.currentCompany}` : ""}
                  </p>
                  {matchResult && !selectedBatchJD && (
                    <button
                      type="button"
                      className="btn-ghost btn-inline session-card__action"
                      onClick={resetForNewRole}
                    >
                      Analyze another role →
                    </button>
                  )}
                </div>
              </div>

              {/* Right main — batch results + tabbed content */}
              <div className="workspace-main">
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
                  <div className="batch-drilldown-header">
                    <button
                      type="button"
                      onClick={handleBatchBack}
                      className="btn-ghost btn-inline batch-drilldown-header__back"
                    >
                      ← Back to all
                    </button>
                    <span className="eyebrow batch-drilldown-header__label">selected role</span>
                  </div>
                )}

                {/* Always show all 5 tabs after scoring — lock icons on unpaid tabs */}
                {!!matchResult && (
                  <>
                    <div className="result-tabs" role="tablist">
                      {(["rewrites", "study", "cover", "interview", "resume"] as ResultTab[]).map((tab) => {
                        const locked = isTabLocked(tab);
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
                            onClick={() => handleTabClick(tab)}
                          >
                            {locked && <span className="tab-lock" aria-label="locked">🔒</span>}
                            {labels[tab]}
                            {tab === "rewrites" && loadingRewrite && <span className="tab-loading-dot"> ·</span>}
                            {tab === "rewrites" && !loadingRewrite && rewriteSuggestions && (
                              <span className="tab-count"> ({rewriteSuggestions.length})</span>
                            )}
                            {tab === "study" && loadingStudyPlan && <span className="tab-loading-dot"> ·</span>}
                            {tab === "study" && !loadingStudyPlan && studyItems && (
                              <span className="tab-count"> ({studyItems.length})</span>
                            )}
                            {tab === "cover" && loadingCoverLetter && <span className="tab-loading-dot"> writing…</span>}
                            {tab === "interview" && starAnswers.length > 0 && (
                              <span className="tab-count"> ({starAnswers.length})</span>
                            )}
                            {tab === "resume" && loadingOptimizedResume && <span className="tab-loading-dot"> ·</span>}
                            {tabNotifications[tab] && activeTab !== tab && (
                              <span className="tab-notification-dot" aria-label="new content available" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Tab content — show inline upsell for locked tabs */}
                    {isTabLocked(activeTab) && activeTab !== "interview" ? (
                      <div className="tab-locked-upsell">
                        <p className="tab-locked-upsell__text">
                          This feature is part of the full analysis.
                        </p>
                        <button
                          type="button"
                          className="btn-primary btn-inline"
                          onClick={() => void handlePay()}
                        >
                          Unlock — $5 →
                        </button>
                      </div>
                    ) : (
                      <>
                        {activeTab === "rewrites" && (
                          <ResumeRewriter suggestions={rewriteSuggestions} loading={loadingRewrite} />
                        )}
                        {activeTab === "study" && (
                          <StudyPlan items={studyItems} loading={loadingStudyPlan} />
                        )}
                        {activeTab === "cover" && (
                          <CoverLetter content={coverLetter} loading={loadingCoverLetter} blockedSkills={coverLetterBlocked} />
                        )}
                        {activeTab === "interview" && (
                          !analysisToken ? (
                            matchResult && resumeData ? (
                              <div className="tour-anchor-interview-paygate tab-locked-upsell">
                                <p className="tab-locked-upsell__text">
                                  STAR interview coaching is part of the full analysis.
                                </p>
                                <button
                                  type="button"
                                  className="btn-primary btn-inline"
                                  onClick={() => void handlePay()}
                                >
                                  Unlock — $5 →
                                </button>
                              </div>
                            ) : null
                          ) : selectedBatchJD && !hasPaidContent && !loadingPaid ? (
                            <div className="content-placeholder">
                              <p className="eyebrow">interview prep locked</p>
                              <p className="result-muted content-placeholder__desc">
                                Click &ldquo;Generate full analysis&rdquo; in the sidebar to unlock interview prep for this role.
                              </p>
                            </div>
                          ) : (
                            matchResult && resumeData ? (
                              <StarPrepPanel
                                resumeData={enrichedResumeData ?? resumeData}
                                matchResult={matchResult}
                                jobDescription={jobDescriptions[0] ?? ""}
                                token={analysisToken}
                                tokenExpiresAt={tokenExpiresAt}
                                questions={starQuestions}
                                answers={starAnswers}
                                activeQuestion={activeStarQuestion}
                                starMessages={starMessages}
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
                            loading={loadingOptimizedResume}
                            canGenerate={starAnswers.length > 0}
                            onGenerate={() => void handleGenerateResume()}
                          />
                        )}
                      </>
                    )}
                  </>
                )}

                {/* Loading state when scoring is in progress */}
                {!matchResult && (loadingExtraction || loadingScore) && (
                  <div className="scoring-loading-state">
                    <Spinner />
                    <p className="eyebrow">Scoring your match…</p>
                  </div>
                )}

                {error && (
                  <ErrorCard
                    message={error}
                    onDismiss={() => setError(null)}
                  />
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </ErrorBoundary>
  );
}
