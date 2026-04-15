"use client";

import { useCallback, useEffect } from "react";
import JSZip from "jszip";
import { mergeEnrichedResume } from "@/lib/mergeEnrichedResume";
import { extractPdfBase64 } from "@/lib/extractPdfText";
import { hashJD } from "@/lib/useWorkspace";
import type { BatchAnalysisEntry, UseWorkspaceReturn } from "@/lib/useWorkspace";
import type {
  BatchScoreResult,
  ExtractResponse,
  InterviewBrief,
  MatchResult,
  ResumeData,
  RewriteResponse,
  ScoreResponse,
  StudyPlanResponse,
} from "@/lib/types";

type PaidRunResult = "no_token" | "token_invalid" | "completed";

export function usePaidPhases(ws: UseWorkspaceReturn, openCheckout: () => Promise<void>) {
  const {
    analysisToken, githubProfile, linkedinProfile, resumeData, matchResult,
    selectedBatchJD, resumeFile, rewriteSuggestions,
    studyItems, coverLetter, batchResults, starAnswers,
    loadingRewrite, loadingStudyPlan, loadingCoverLetter, optimizedResume,

    // Setters
    setResumeData, setMatchResult, setRewriteSuggestions, setCoverLetter,
    setCoverLetterBlocked, setStudyItems, setError, setLoadingExtraction,
    setLoadingScore, setLoadingRewrite, setLoadingCoverLetter, setLoadingStudyPlan,
    setLoadingBatch, setBatchResults, setSelectedBatchJD, setActiveTab,
    setAnalysisToken, setPaymentState, setOptimizedResume, setLoadingOptimizedResume,
    setBatchAnalysisCache, setStarQuestions, setStarAnswers,
    setActiveStarQuestion, setStarMessages, setInterviewBrief, setEnrichedResumeData,
    setShowInterviewer, setShowPhase0Modal, setCheckoutClientSecret, setTokenExpiresAt,
    setJobDescriptions,
    notifyTab,

    // Refs
    jobDescriptionsRef, resumeDataRef, matchResultRef, githubProfileRef,
    linkedinProfileRef, selectedBatchJDRef, enrichedResumeDataRef,
    rewriteSuggestionsRef, batchAnalysisCacheRef,

    // Actions
    persistCurrentBatchSelection,
  } = ws;

  // ── runPaidPhases ─────────────────────────────────────────────────────

  const runPaidPhases = useCallback(
    async (
      resumeDataArg: ResumeData,
      matchResultArg: MatchResult,
      jd: string,
      tokenOverride?: string,
      options?: { onTokenInvalid?: () => void }
    ): Promise<PaidRunResult> => {
      const token = tokenOverride ?? analysisToken;
      if (!token) return "no_token";

      const effectiveResumeData = enrichedResumeDataRef.current ?? resumeDataArg;
      let tokenInvalid = false;

      setLoadingRewrite(true);
      setLoadingStudyPlan(true);
      setActiveTab("rewrites");

      const handleTokenInvalid = () => {
        if (tokenInvalid) return;
        tokenInvalid = true;
        setAnalysisToken(null);
        setPaymentState("idle");
        options?.onTokenInvalid?.();
      };

      const batchRun = Boolean(selectedBatchJDRef.current);
      const cacheBatchUpdate = (partial: Partial<BatchAnalysisEntry>) => {
        if (!batchRun) return;
        const key = hashJD(jd);
        setBatchAnalysisCache((prev) => {
          const existing = prev[key];
          return {
            ...prev,
            [key]: {
              rewriteSuggestions: partial.rewriteSuggestions ?? existing?.rewriteSuggestions ?? null,
              studyItems: partial.studyItems ?? existing?.studyItems ?? null,
              coverLetter: partial.coverLetter ?? existing?.coverLetter ?? null,
              coverLetterBlocked: partial.coverLetterBlocked ?? existing?.coverLetterBlocked ?? null,
              optimizedResume: partial.optimizedResume ?? existing?.optimizedResume ?? null,
              starQuestions: partial.starQuestions ?? existing?.starQuestions ?? [],
              starAnswers: partial.starAnswers ?? existing?.starAnswers ?? [],
              starMessages: partial.starMessages ?? existing?.starMessages ?? [],
              activeStarQuestion: partial.activeStarQuestion ?? existing?.activeStarQuestion ?? null,
              savedAt: Date.now(),
            },
          };
        });
      };

      const rewritePromise = fetch("/api/rewrite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-analysis-token": token,
        },
        body: JSON.stringify({
          resumeData: effectiveResumeData,
          jobDescription: jd,
          ...(githubProfile ? { githubProfile } : {}),
          ...(linkedinProfile ? { linkedinProfile } : {}),
        }),
      })
        .then(async (res) => {
          if (res.status === 401 || res.status === 402) { handleTokenInvalid(); return; }
          if (!res.ok) throw new Error("Rewrite generation failed");
          const data: RewriteResponse = await res.json();
          if (batchRun && selectedBatchJDRef.current !== jd) {
            cacheBatchUpdate({ rewriteSuggestions: data.suggestions });
            return;
          }
          setRewriteSuggestions(data.suggestions);
          notifyTab("rewrites");
        })
        .catch(() => undefined)
        .finally(() => setLoadingRewrite(false));

      const studyPromise = fetch("/api/study-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-analysis-token": token,
        },
        body: JSON.stringify({
          matchResult: matchResultArg,
          resumeData: effectiveResumeData,
          ...(linkedinProfile ? { linkedinProfile } : {}),
        }),
      })
        .then(async (res) => {
          if (res.status === 401 || res.status === 402) { handleTokenInvalid(); return; }
          if (!res.ok) throw new Error("Study plan generation failed");
          const data: StudyPlanResponse = await res.json();
          if (batchRun && selectedBatchJDRef.current !== jd) {
            cacheBatchUpdate({ studyItems: data.items });
            return;
          }
          setStudyItems(data.items);
          notifyTab("study");
        })
        .catch(() => undefined)
        .finally(() => setLoadingStudyPlan(false));

      await Promise.all([rewritePromise, studyPromise]);
      if (tokenInvalid) return "token_invalid";

      setLoadingCoverLetter(true);
      try {
        const coverRes = await fetch("/api/cover-letter", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-analysis-token": token,
          },
          body: JSON.stringify({
            resumeData: effectiveResumeData,
            matchResult: matchResultArg,
            jobDescription: jd,
            ...(githubProfile ? { githubProfile } : {}),
            ...(linkedinProfile ? { linkedinProfile } : {}),
          }),
        });

        if ((coverRes.status === 401 || coverRes.status === 402)) {
          handleTokenInvalid();
        } else if (coverRes.status === 422) {
          const body = await coverRes.json().catch(() => ({})) as { dealbreakers?: string[] };
          if (batchRun && selectedBatchJDRef.current !== jd) {
            cacheBatchUpdate({ coverLetterBlocked: body.dealbreakers ?? [] });
          } else {
            setCoverLetterBlocked(body.dealbreakers ?? []);
          }
        } else if (coverRes.ok && coverRes.body) {
          const reader = coverRes.body.getReader();
          const decoder = new TextDecoder();
          let text = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            text += decoder.decode(value, { stream: true });
            if (batchRun && selectedBatchJDRef.current !== jd) {
              cacheBatchUpdate({ coverLetter: text });
            } else {
              setCoverLetter(text);
            }
          }
          notifyTab("cover");
        }
      } catch {
        // Non-blocking
      }
      setLoadingCoverLetter(false);
      return tokenInvalid ? "token_invalid" : "completed";
    },
    [analysisToken, githubProfile, linkedinProfile, enrichedResumeDataRef, selectedBatchJDRef, setBatchAnalysisCache, setRewriteSuggestions, setStudyItems, setCoverLetter, setCoverLetterBlocked, setLoadingRewrite, setLoadingStudyPlan, setLoadingCoverLetter, setActiveTab, setAnalysisToken, setPaymentState, notifyTab]
  );

  // ── Auto-trigger paid phases ────────────────────────────────────────────
  useEffect(() => {
    if (!analysisToken || !resumeData || !matchResult) return;
    if (selectedBatchJD) return;
    if (rewriteSuggestions !== null || studyItems !== null || coverLetter !== null) return;
    if (loadingRewrite || loadingStudyPlan || loadingCoverLetter) return;
    const jd = jobDescriptionsRef.current[0];
    if (!jd) return;
    void runPaidPhases(resumeData, matchResult, jd);
  }, [analysisToken, coverLetter, loadingCoverLetter, loadingRewrite, loadingStudyPlan, matchResult, resumeData, rewriteSuggestions, runPaidPhases, selectedBatchJD, studyItems, jobDescriptionsRef]);

  // ── handleAnalyze ─────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    const currentJDs = jobDescriptionsRef.current;
    if (currentJDs.length === 0) return;

    const currentResumeData = resumeDataRef.current;
    setError(null);
    setMatchResult(null);
    setRewriteSuggestions(null);
    setCoverLetter(null);
    setCoverLetterBlocked(null);
    setStudyItems(null);
    setOptimizedResume(null);
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
      setLoadingBatch(true);
      const settled = await Promise.all(
        currentJDs.map(async (description) => {
          try {
            const scoreResponse = await fetch("/api/score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                resumeData: enrichedResumeDataRef.current ?? extracted,
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

    const jd = currentJDs[0];
    setLoadingScore(true);
    try {
      const scoreResponse = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeData: enrichedResumeDataRef.current ?? extracted,
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
      setMatchResult(scoreData.matchResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scoring failed");
      setLoadingScore(false);
      return;
    }
    setLoadingScore(false);
  }, [resumeFile, jobDescriptionsRef, resumeDataRef, enrichedResumeDataRef, githubProfileRef, linkedinProfileRef, setError, setMatchResult, setRewriteSuggestions, setCoverLetter, setCoverLetterBlocked, setStudyItems, setOptimizedResume, setBatchResults, setSelectedBatchJD, setResumeData, setLoadingExtraction, setLoadingScore, setLoadingBatch]);

  // ── Batch drill-down ────────────────────────────────────────────────────

  const handleBatchDrillDown = useCallback(
    (result: BatchScoreResult) => {
      persistCurrentBatchSelection();

      const drillMatchResult: MatchResult = {
        score: result.score,
        matchedSkills: result.matchedSkills,
        missingSkills: result.topGaps,
        recommendation: result.recommendation,
      };
      setSelectedBatchJD(result.jobDescription);
      setJobDescriptions([result.jobDescription]);
      setMatchResult(drillMatchResult);

      const key = hashJD(result.jobDescription);
      const cached = batchAnalysisCacheRef.current[key];
      const BATCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
      if (cached && Date.now() - cached.savedAt < BATCH_CACHE_TTL_MS) {
        setRewriteSuggestions(cached.rewriteSuggestions);
        setStudyItems(cached.studyItems);
        setCoverLetter(cached.coverLetter);
        setCoverLetterBlocked(cached.coverLetterBlocked);
        setOptimizedResume(cached.optimizedResume);
        setStarQuestions(cached.starQuestions);
        setStarAnswers(cached.starAnswers);
        setActiveStarQuestion(cached.activeStarQuestion);
        setStarMessages(cached.starMessages);
        setActiveTab("rewrites");
      } else {
        setRewriteSuggestions(null);
        setStudyItems(null);
        setCoverLetter(null);
        setCoverLetterBlocked(null);
        setOptimizedResume(null);
        setStarQuestions([]);
        setStarAnswers([]);
        setActiveStarQuestion(null);
        setStarMessages([]);
      }
    },
     
    [persistCurrentBatchSelection, batchAnalysisCacheRef, setSelectedBatchJD, setJobDescriptions, setMatchResult, setRewriteSuggestions, setStudyItems, setCoverLetter, setCoverLetterBlocked, setOptimizedResume, setStarQuestions, setStarAnswers, setActiveStarQuestion, setStarMessages, setActiveTab]
  );

  const handleBatchBack = useCallback(() => {
    persistCurrentBatchSelection();
    setSelectedBatchJD(null);
    setMatchResult(null);
    setRewriteSuggestions(null);
    setStudyItems(null);
    setCoverLetter(null);
    setCoverLetterBlocked(null);
    setOptimizedResume(null);
    setStarQuestions([]);
    setStarAnswers([]);
    setActiveStarQuestion(null);
    setStarMessages([]);
  }, [persistCurrentBatchSelection, setSelectedBatchJD, setMatchResult, setRewriteSuggestions, setStudyItems, setCoverLetter, setCoverLetterBlocked, setOptimizedResume, setStarQuestions, setStarAnswers, setActiveStarQuestion, setStarMessages]);

  const handleBatchAnalyze = useCallback(() => {
    if (!resumeData || !matchResult || !selectedBatchJD || !analysisToken) return;
    void runPaidPhases(resumeData, matchResult, selectedBatchJD, undefined, {
      onTokenInvalid: () => {
        void openCheckout();
      },
    });
  }, [analysisToken, matchResult, openCheckout, resumeData, runPaidPhases, selectedBatchJD]);

  // ── Brief complete (Phase 0) ──────────────────────────────────────────

  const handleBriefComplete = useCallback(
    (brief: InterviewBrief) => {
      if (!resumeData) return;
      const merged = mergeEnrichedResume(resumeData, brief);
      setInterviewBrief(brief);
      setEnrichedResumeData(merged);
      setShowInterviewer(false);
      setShowPhase0Modal(false);
    },
    [resumeData, setInterviewBrief, setEnrichedResumeData, setShowInterviewer, setShowPhase0Modal]
  );

  // ── Payment success ────────────────────────────────────────────────────

  const handlePaymentSuccess = useCallback((token: string, expiresAt: string) => {
    setAnalysisToken(token);
    setTokenExpiresAt(expiresAt);
    setPaymentState("paid");
    setCheckoutClientSecret(null);
    const batchJD = selectedBatchJDRef.current;
    const rd = resumeDataRef.current;
    const mr = matchResultRef.current;
    if (batchJD && rd && mr) {
      void runPaidPhases(rd, mr, batchJD, token);
    }
  }, [runPaidPhases, selectedBatchJDRef, resumeDataRef, matchResultRef, setAnalysisToken, setTokenExpiresAt, setPaymentState, setCheckoutClientSecret]);

  // ── Generate optimized resume ──────────────────────────────────────────

  const handleGenerateResume = useCallback(async () => {
    if (!analysisToken || !resumeData || !matchResult) return;
    setLoadingOptimizedResume(true);
    try {
      const res = await fetch("/api/optimized-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-analysis-token": analysisToken,
        },
        body: JSON.stringify({
          resumeData: enrichedResumeDataRef.current ?? resumeData,
          rewriteSuggestions: rewriteSuggestionsRef.current ?? [],
          starAnswers,
          matchResult,
          jobDescription: jobDescriptionsRef.current[0] ?? "",
        }),
      });
      if (res.status === 401 || res.status === 402) {
        setAnalysisToken(null);
        setPaymentState("idle");
      } else if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let text = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          setOptimizedResume(text);
        }
        notifyTab("resume");
      }
    } catch {
      // Non-blocking
    }
    setLoadingOptimizedResume(false);
  }, [analysisToken, matchResult, resumeData, starAnswers, enrichedResumeDataRef, rewriteSuggestionsRef, jobDescriptionsRef, setLoadingOptimizedResume, setOptimizedResume, setAnalysisToken, setPaymentState, notifyTab]);

  // ── Export zip ─────────────────────────────────────────────────────────

  const handleExportZip = useCallback(async () => {
    const zip = new JSZip();

    if (coverLetter) zip.file("cover-letter.txt", coverLetter);
    if (optimizedResume) zip.file("optimized-resume.txt", optimizedResume);

    if (rewriteSuggestions?.length) {
      const bulletsText = rewriteSuggestions
        .map((s) =>
          [s.originalRole, "", `Before: ${s.originalBullet}`, "", `After:  ${s.rewrittenBullet}`, "", `Why:    ${s.rationale}`].join("\n")
        )
        .join("\n\n---\n\n");
      zip.file("optimized-bullets.txt", bulletsText);
    }

    if (studyItems?.length) {
      const studyText = studyItems
        .map((item) =>
          [`[${item.severity.toUpperCase()}] ${item.skill}`, item.action, `Resource: ${item.resource}`].join("\n")
        )
        .join("\n\n---\n\n");
      zip.file("study-plan.txt", studyText);
    }

    if (matchResult) {
      const reportLines = [
        "MATCH REPORT", "============",
        `Score: ${matchResult.score}%`, "",
        `Recommendation: ${matchResult.recommendation}`, "",
        `Matched Skills: ${matchResult.matchedSkills.join(", ")}`, "",
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
  }, [coverLetter, optimizedResume, rewriteSuggestions, studyItems, matchResult, batchResults, resumeData]);

  return {
    runPaidPhases,
    handleAnalyze,
    handleBatchDrillDown,
    handleBatchBack,
    handleBatchAnalyze,
    handleBriefComplete,
    handlePaymentSuccess,
    handleGenerateResume,
    handleExportZip,
  };
}
