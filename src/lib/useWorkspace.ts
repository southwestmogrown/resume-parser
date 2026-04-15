"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BatchScoreResult,
  ConversationMessage,
  GitHubProfile,
  InterviewBrief,
  LinkedInProfile,
  MatchResult,
  ResumeData,
  RewriteSuggestion,
  StarAnswer,
  StarQuestion,
  StudyItem,
} from "@/lib/types";

export const LS_KEY = "ps_workspace_v1";
const BATCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type ResultTab = "rewrites" | "study" | "cover" | "interview" | "resume";

export interface BatchAnalysisEntry {
  rewriteSuggestions: RewriteSuggestion[] | null;
  studyItems: StudyItem[] | null;
  coverLetter: string | null;
  coverLetterBlocked: string[] | null;
  optimizedResume: string | null;
  starQuestions: StarQuestion[];
  starAnswers: StarAnswer[];
  starMessagesByQuestion: Record<string, ConversationMessage[]>;
  activeStarQuestion: StarQuestion | null;
  savedAt: number;
}

export function hashJD(jd: string): string {
  let h = 0;
  for (let i = 0; i < jd.length; i++) {
    h = (Math.imul(31, h) + jd.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

export function hasAnyPaidContent(params: {
  rewriteSuggestions: RewriteSuggestion[] | null;
  studyItems: StudyItem[] | null;
  coverLetter: string | null;
  coverLetterBlocked: string[] | null;
  optimizedResume: string | null;
  starQuestions: StarQuestion[];
  starAnswers: StarAnswer[];
}): boolean {
  return Boolean(params.rewriteSuggestions)
    || Boolean(params.studyItems)
    || Boolean(params.coverLetter)
    || Boolean(params.coverLetterBlocked)
    || Boolean(params.optimizedResume)
    || params.starQuestions.length > 0
    || params.starAnswers.length > 0;
}

export interface WorkspaceState {
  // Core data
  resumeFile: File | null;
  jobDescriptions: string[];
  resumeData: ResumeData | null;
  matchResult: MatchResult | null;
  rewriteSuggestions: RewriteSuggestion[] | null;
  coverLetter: string | null;
  coverLetterBlocked: string[] | null;
  studyItems: StudyItem[] | null;
  githubProfile: GitHubProfile | null;
  linkedinProfile: LinkedInProfile | null;
  batchResults: BatchScoreResult[] | null;
  selectedBatchJD: string | null;

  // Loading states
  loadingExtraction: boolean;
  loadingScore: boolean;
  loadingRewrite: boolean;
  loadingCoverLetter: boolean;
  loadingStudyPlan: boolean;
  loadingBatch: boolean;
  loadingOptimizedResume: boolean;

  // Error
  error: string | null;

  // Auth / payment
  analysisToken: string | null;
  tokenExpiresAt: string | null;
  paymentState: "idle" | "pending" | "paid" | "canceled";
  checkoutClientSecret: string | null;

  // UI
  activeTab: ResultTab;
  showResetConfirm: boolean;
  tabNotifications: Partial<Record<ResultTab, boolean>>;

  // Phase 0
  showInterviewer: boolean;
  showPhase0Modal: boolean;
  interviewBrief: InterviewBrief | null;
  enrichedResumeData: ResumeData | null;

  // Phase 5 — STAR Prep
  starQuestions: StarQuestion[];
  starAnswers: StarAnswer[];
  activeStarQuestion: StarQuestion | null;
  starMessagesByQuestion: Record<string, ConversationMessage[]>;

  // Phase 6 — Optimized Resume
  optimizedResume: string | null;

  // Batch analysis cache
  batchAnalysisCache: Record<string, BatchAnalysisEntry>;
}

/**
 * A ref that always mirrors the latest value (useLatestRef pattern).
 * The render-phase assignment is intentional: refs are mutable containers
 * and assigning `.current` in render is the standard way to keep a ref
 * in sync without a separate useEffect. This is safe because it causes
 * no side effects visible to React's reconciler.
 */
function useSyncRef<T>(value: T) {
  const ref = useRef(value);
  // eslint-disable-next-line react-hooks/refs
  ref.current = value;
  return ref;
}

export function useWorkspace() {
  // ── Core state ──────────────────────────────────────────────────────────
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescriptions, setJobDescriptions] = useState<string[]>([]);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [rewriteSuggestions, setRewriteSuggestions] = useState<RewriteSuggestion[] | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [coverLetterBlocked, setCoverLetterBlocked] = useState<string[] | null>(null);
  const [studyItems, setStudyItems] = useState<StudyItem[] | null>(null);
  const [githubProfile, setGithubProfile] = useState<GitHubProfile | null>(null);
  const [linkedinProfile, setLinkedinProfile] = useState<LinkedInProfile | null>(null);
  const [batchResults, setBatchResults] = useState<BatchScoreResult[] | null>(null);
  const [selectedBatchJD, setSelectedBatchJD] = useState<string | null>(null);

  // Loading states
  const [loadingExtraction, setLoadingExtraction] = useState(false);
  const [loadingScore, setLoadingScore] = useState(false);
  const [loadingRewrite, setLoadingRewrite] = useState(false);
  const [loadingCoverLetter, setLoadingCoverLetter] = useState(false);
  const [loadingStudyPlan, setLoadingStudyPlan] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [loadingOptimizedResume, setLoadingOptimizedResume] = useState(false);

  // Error
  const [error, setError] = useState<string | null>(null);

  // Auth / payment
  const [analysisToken, setAnalysisToken] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<"idle" | "pending" | "paid" | "canceled">("idle");
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);

  // UI
  const [activeTab, setActiveTab] = useState<ResultTab>("rewrites");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [tabNotifications, setTabNotifications] = useState<Partial<Record<ResultTab, boolean>>>({});

  // Phase 0
  const [showInterviewer, setShowInterviewer] = useState(false);
  const [showPhase0Modal, setShowPhase0Modal] = useState(false);
  const [interviewBrief, setInterviewBrief] = useState<InterviewBrief | null>(null);
  const [enrichedResumeData, setEnrichedResumeData] = useState<ResumeData | null>(null);

  // Phase 5
  const [starQuestions, setStarQuestions] = useState<StarQuestion[]>([]);
  const [starAnswers, setStarAnswers] = useState<StarAnswer[]>([]);
  const [activeStarQuestion, setActiveStarQuestion] = useState<StarQuestion | null>(null);
  const [starMessagesByQuestion, setStarMessagesByQuestion] = useState<Record<string, ConversationMessage[]>>({});

  // Phase 6
  const [optimizedResume, setOptimizedResume] = useState<string | null>(null);

  // Batch cache
  const [batchAnalysisCache, setBatchAnalysisCache] = useState<Record<string, BatchAnalysisEntry>>({});

  // ── Refs (auto-synced) ────────────────────────────────────────────────
  const jobDescriptionsRef = useSyncRef(jobDescriptions);
  const resumeDataRef = useSyncRef(resumeData);
  const matchResultRef = useSyncRef(matchResult);
  const githubProfileRef = useSyncRef(githubProfile);
  const linkedinProfileRef = useSyncRef(linkedinProfile);
  const selectedBatchJDRef = useSyncRef(selectedBatchJD);
  const batchAnalysisCacheRef = useSyncRef(batchAnalysisCache);
  const rewriteSuggestionsRef = useSyncRef(rewriteSuggestions);
  const studyItemsRef = useSyncRef(studyItems);
  const coverLetterRef = useSyncRef(coverLetter);
  const coverLetterBlockedRef = useSyncRef(coverLetterBlocked);
  const optimizedResumeRef = useSyncRef(optimizedResume);
  const starQuestionsRef = useSyncRef(starQuestions);
  const starAnswersRef = useSyncRef(starAnswers);
  const starMessagesByQuestionRef = useSyncRef(starMessagesByQuestion);
  const activeStarQuestionRef = useSyncRef(activeStarQuestion);
  const enrichedResumeDataRef = useSyncRef(enrichedResumeData);

  // Polling ref (for Stripe redirect)
  const pollTimeoutRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    const pollRef = pollTimeoutRef;
    return () => {
      isMountedRef.current = false;
      if (pollRef.current !== null) window.clearTimeout(pollRef.current);
    };
  }, []);

  // ── localStorage persistence ────────────────────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") || params.get("canceled")) return;

    try {
      const saved = localStorage.getItem(LS_KEY);
      if (!saved) return;
      const d = JSON.parse(saved) as Record<string, unknown>;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (d.resumeData) setResumeData(d.resumeData as ResumeData);
       
      if (d.matchResult) setMatchResult(d.matchResult as MatchResult);
       
      if (d.batchResults) setBatchResults(d.batchResults as BatchScoreResult[]);
       
      if (d.rewriteSuggestions) setRewriteSuggestions(d.rewriteSuggestions as RewriteSuggestion[]);
       
      if (d.studyItems) setStudyItems(d.studyItems as StudyItem[]);
       
      if (d.coverLetter) setCoverLetter(d.coverLetter as string);
       
      if (Array.isArray(d.coverLetterBlocked)) setCoverLetterBlocked(d.coverLetterBlocked as string[]);
      if (Array.isArray(d.jobDescriptions) && (d.jobDescriptions as string[]).length > 0) {
         
        setJobDescriptions(d.jobDescriptions as string[]);
      }
       
      if (d.githubProfile) setGithubProfile(d.githubProfile as GitHubProfile);
       
      if (d.linkedinProfile) setLinkedinProfile(d.linkedinProfile as LinkedInProfile);
       
      if (d.interviewBrief) setInterviewBrief(d.interviewBrief as InterviewBrief);
       
      if (d.enrichedResumeData) setEnrichedResumeData(d.enrichedResumeData as ResumeData);
       
      if (d.starQuestions) setStarQuestions(d.starQuestions as StarQuestion[]);
       
      if (d.starAnswers) setStarAnswers(d.starAnswers as StarAnswer[]);
       
      if (d.activeStarQuestion) setActiveStarQuestion(d.activeStarQuestion as StarQuestion);
      if (d.starMessagesByQuestion && typeof d.starMessagesByQuestion === "object") {
         
        setStarMessagesByQuestion(d.starMessagesByQuestion as Record<string, ConversationMessage[]>);
      }
       
      if (d.optimizedResume) setOptimizedResume(d.optimizedResume as string);
       
      if (typeof d.analysisToken === "string") setAnalysisToken(d.analysisToken);
       
      if (typeof d.tokenExpiresAt === "string") setTokenExpiresAt(d.tokenExpiresAt);
      if (d.batchAnalysisCache && typeof d.batchAnalysisCache === "object") {
        const now = Date.now();
        const pruned = Object.fromEntries(
          Object.entries(d.batchAnalysisCache as Record<string, BatchAnalysisEntry>).filter(
            ([, v]) => now - v.savedAt < BATCH_CACHE_TTL_MS
          )
        );
         
        if (Object.keys(pruned).length > 0) setBatchAnalysisCache(pruned);
      }
    } catch {
      localStorage.removeItem(LS_KEY);
    }
  }, []);

  useEffect(() => {
    if (!resumeData && !matchResult && !batchResults) return;
    const now = Date.now();
    const prunedCache = Object.fromEntries(
      Object.entries(batchAnalysisCache).filter(([, v]) => now - v.savedAt < BATCH_CACHE_TTL_MS)
    );
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        resumeData,
        matchResult,
        batchResults,
        rewriteSuggestions,
        studyItems,
        coverLetter,
        coverLetterBlocked,
        jobDescriptions,
        githubProfile,
        linkedinProfile,
        interviewBrief,
        enrichedResumeData,
        starQuestions,
        starAnswers,
        activeStarQuestion,
        starMessagesByQuestion,
        optimizedResume,
        analysisToken,
        tokenExpiresAt,
        batchAnalysisCache: prunedCache,
      }));
    } catch {
      // Storage unavailable or full
    }
  }, [activeStarQuestion, analysisToken, batchAnalysisCache, batchResults, coverLetter, coverLetterBlocked, enrichedResumeData, githubProfile, interviewBrief, jobDescriptions, linkedinProfile, matchResult, optimizedResume, resumeData, rewriteSuggestions, starAnswers, starMessagesByQuestion, starQuestions, studyItems, tokenExpiresAt]);

  // ── Derived state ─────────────────────────────────────────────────────

  const canAnalyze = Boolean((resumeFile || resumeData) && jobDescriptions.length > 0);
  const isBusy = loadingExtraction || loadingScore || loadingRewrite || loadingCoverLetter || loadingStudyPlan || loadingBatch;
  const hasPaidContent = Boolean(rewriteSuggestions) || Boolean(studyItems) || Boolean(coverLetter) || Boolean(coverLetterBlocked) || Boolean(optimizedResume);
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

  const canExport = (hasPaidContent || Boolean(batchResults)) && !loadingPaid && !loadingBatch;

  // ── Tab notification helper ──────────────────────────────────────────────

  const notifyTab = useCallback((tab: ResultTab) => {
    setTabNotifications((prev) => ({ ...prev, [tab]: true }));
  }, []);

  const clearTabNotification = useCallback((tab: ResultTab) => {
    setTabNotifications((prev) => {
      if (!prev[tab]) return prev;
      const next = { ...prev };
      delete next[tab];
      return next;
    });
  }, []);

  // ── Reset functions ────────────────────────────────────────────────────

  const resetWorkspace = useCallback(() => {
    setMatchResult(null);
    setResumeData(null);
    setResumeFile(null);
    setGithubProfile(null);
    setLinkedinProfile(null);
    setRewriteSuggestions(null);
    setCoverLetter(null);
    setCoverLetterBlocked(null);
    setStudyItems(null);
    setBatchResults(null);
    setSelectedBatchJD(null);
    setJobDescriptions([]);
    setError(null);
    setActiveTab("rewrites");
    setShowInterviewer(false);
    setShowPhase0Modal(false);
    setInterviewBrief(null);
    setEnrichedResumeData(null);
    setStarQuestions([]);
    setStarAnswers([]);
    setActiveStarQuestion(null);
    setStarMessagesByQuestion({});
    setOptimizedResume(null);
    setLoadingOptimizedResume(false);
    setAnalysisToken(null);
    setTokenExpiresAt(null);
    setPaymentState("idle");
    setCheckoutClientSecret(null);
    setBatchAnalysisCache({});
    setTabNotifications({});
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  }, []);

  /** Partial reset: keep resume + enrichment, clear match/paid results */
  const resetForNewRole = useCallback(() => {
    setMatchResult(null);
    setRewriteSuggestions(null);
    setCoverLetter(null);
    setCoverLetterBlocked(null);
    setStudyItems(null);
    setBatchResults(null);
    setSelectedBatchJD(null);
    setError(null);
    setActiveTab("rewrites");
    setStarQuestions([]);
    setStarAnswers([]);
    setActiveStarQuestion(null);
    setStarMessagesByQuestion({});
    setOptimizedResume(null);
    setLoadingOptimizedResume(false);
    setBatchAnalysisCache({});
    setTabNotifications({});
  }, []);

  // ── Batch helpers ──────────────────────────────────────────────────────

  const persistCurrentBatchSelection = useCallback(() => {
    const currentJD = selectedBatchJDRef.current;
    if (!currentJD) return;

    const currentRewrite = rewriteSuggestionsRef.current;
    const currentStudy = studyItemsRef.current;
    const currentCover = coverLetterRef.current;
    const currentCoverBlocked = coverLetterBlockedRef.current;
    const currentOptimizedResume = optimizedResumeRef.current;
    const currentStarQuestions = starQuestionsRef.current;
    const currentStarAnswers = starAnswersRef.current;
    const currentStarMessagesByQuestion = starMessagesByQuestionRef.current;
    const currentActiveQuestion = activeStarQuestionRef.current;

    if (!hasAnyPaidContent({
      rewriteSuggestions: currentRewrite,
      studyItems: currentStudy,
      coverLetter: currentCover,
      coverLetterBlocked: currentCoverBlocked,
      optimizedResume: currentOptimizedResume,
      starQuestions: currentStarQuestions,
      starAnswers: currentStarAnswers,
    })) return;

    const key = hashJD(currentJD);
    setBatchAnalysisCache((prev) => ({
      ...prev,
      [key]: {
        rewriteSuggestions: currentRewrite,
        studyItems: currentStudy,
        coverLetter: currentCover,
        coverLetterBlocked: currentCoverBlocked,
        optimizedResume: currentOptimizedResume,
        starQuestions: currentStarQuestions,
        starAnswers: currentStarAnswers,
        starMessagesByQuestion: currentStarMessagesByQuestion,
        activeStarQuestion: currentActiveQuestion,
        savedAt: Date.now(),
      },
    }));
  }, [selectedBatchJDRef, rewriteSuggestionsRef, studyItemsRef, coverLetterRef, coverLetterBlockedRef, optimizedResumeRef, starQuestionsRef, starAnswersRef, starMessagesByQuestionRef, activeStarQuestionRef]);

  // Sync current paid state into batch cache whenever it changes in drill-down mode
  useEffect(() => {
    if (!selectedBatchJD) return;
    if (!hasAnyPaidContent({
      rewriteSuggestions,
      studyItems,
      coverLetter,
      coverLetterBlocked,
      optimizedResume,
      starQuestions,
      starAnswers,
    })) return;
    const key = hashJD(selectedBatchJD);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBatchAnalysisCache((prev) => ({
      ...prev,
      [key]: {
        rewriteSuggestions,
        studyItems,
        coverLetter,
        coverLetterBlocked,
        optimizedResume,
        starQuestions,
        starAnswers,
        starMessagesByQuestion,
        activeStarQuestion,
        savedAt: Date.now(),
      },
    }));
  }, [activeStarQuestion, coverLetter, coverLetterBlocked, optimizedResume, rewriteSuggestions, selectedBatchJD, starAnswers, starMessagesByQuestion, starQuestions, studyItems]);

  return {
    // State
    resumeFile, jobDescriptions, resumeData, matchResult,
    rewriteSuggestions, coverLetter, coverLetterBlocked, studyItems,
    githubProfile, linkedinProfile, batchResults, selectedBatchJD,
    loadingExtraction, loadingScore, loadingRewrite, loadingCoverLetter,
    loadingStudyPlan, loadingBatch, loadingOptimizedResume,
    error, analysisToken, tokenExpiresAt, paymentState,
    checkoutClientSecret, activeTab, showResetConfirm, tabNotifications,
    showInterviewer, showPhase0Modal, interviewBrief, enrichedResumeData,
    starQuestions, starAnswers, activeStarQuestion, starMessagesByQuestion,
    optimizedResume, batchAnalysisCache,

    // Setters
    setResumeFile, setJobDescriptions, setResumeData, setMatchResult,
    setRewriteSuggestions, setCoverLetter, setCoverLetterBlocked, setStudyItems,
    setGithubProfile, setLinkedinProfile, setBatchResults, setSelectedBatchJD,
    setLoadingExtraction, setLoadingScore, setLoadingRewrite, setLoadingCoverLetter,
    setLoadingStudyPlan, setLoadingBatch, setLoadingOptimizedResume,
    setError, setAnalysisToken, setTokenExpiresAt, setPaymentState,
    setCheckoutClientSecret, setActiveTab, setShowResetConfirm,
    setShowInterviewer, setShowPhase0Modal, setInterviewBrief, setEnrichedResumeData,
    setStarQuestions, setStarAnswers, setActiveStarQuestion, setStarMessagesByQuestion,
    setOptimizedResume, setBatchAnalysisCache,

    // Tab notifications
    notifyTab, clearTabNotification,

    // Refs
    jobDescriptionsRef, resumeDataRef, matchResultRef,
    githubProfileRef, linkedinProfileRef, selectedBatchJDRef,
    batchAnalysisCacheRef, rewriteSuggestionsRef, studyItemsRef,
    coverLetterRef, coverLetterBlockedRef, optimizedResumeRef,
    starQuestionsRef, starAnswersRef, starMessagesByQuestionRef,
    activeStarQuestionRef, enrichedResumeDataRef,
    pollTimeoutRef, isMountedRef,

    // Derived
    canAnalyze, isBusy, hasPaidContent, loadingPaid, showResults, canExport,

    // Actions
    resetWorkspace, resetForNewRole, persistCurrentBatchSelection,
  };
}

export type UseWorkspaceReturn = ReturnType<typeof useWorkspace>;
