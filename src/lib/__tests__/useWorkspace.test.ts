/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useWorkspace, LS_KEY } from "@/lib/useWorkspace";
import { sampleResumeData, sampleMatchResult, sampleRewriteSuggestions, sampleStudyItems } from "@/test-utils/fixtures";

describe("useWorkspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/app");
  });

  it("initializes with null/empty defaults", () => {
    const { result } = renderHook(() => useWorkspace());

    expect(result.current.resumeData).toBeNull();
    expect(result.current.matchResult).toBeNull();
    expect(result.current.rewriteSuggestions).toBeNull();
    expect(result.current.studyItems).toBeNull();
    expect(result.current.coverLetter).toBeNull();
    expect(result.current.analysisToken).toBeNull();
    expect(result.current.jobDescriptions).toEqual([]);
    expect(result.current.starQuestions).toEqual([]);
    expect(result.current.starAnswers).toEqual([]);
  });

  it("computes canAnalyze based on resumeFile and jobDescriptions", () => {
    const { result } = renderHook(() => useWorkspace());

    expect(result.current.canAnalyze).toBe(false);

    act(() => {
      result.current.setResumeData(sampleResumeData);
    });
    expect(result.current.canAnalyze).toBe(false);

    act(() => {
      result.current.setJobDescriptions(["Build a Next.js app."]);
    });
    expect(result.current.canAnalyze).toBe(true);
  });

  it("computes hasPaidContent correctly", () => {
    const { result } = renderHook(() => useWorkspace());
    expect(result.current.hasPaidContent).toBe(false);

    act(() => {
      result.current.setRewriteSuggestions(sampleRewriteSuggestions);
    });
    expect(result.current.hasPaidContent).toBe(true);
  });

  it("persists state to localStorage", () => {
    const { result } = renderHook(() => useWorkspace());

    act(() => {
      result.current.setResumeData(sampleResumeData);
      result.current.setMatchResult(sampleMatchResult);
    });

    const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
    expect(saved.resumeData).toEqual(sampleResumeData);
    expect(saved.matchResult).toEqual(sampleMatchResult);
  });

  it("restores state from localStorage", () => {
    localStorage.setItem(LS_KEY, JSON.stringify({
      resumeData: sampleResumeData,
      matchResult: sampleMatchResult,
      analysisToken: "tok_test",
      tokenExpiresAt: "2099-01-01T00:00:00.000Z",
    }));

    const { result } = renderHook(() => useWorkspace());
    expect(result.current.resumeData).toEqual(sampleResumeData);
    expect(result.current.matchResult).toEqual(sampleMatchResult);
    expect(result.current.analysisToken).toBe("tok_test");
  });

  it("resetWorkspace clears all state and localStorage", () => {
    localStorage.setItem(LS_KEY, JSON.stringify({
      resumeData: sampleResumeData,
      matchResult: sampleMatchResult,
    }));

    const { result } = renderHook(() => useWorkspace());
    expect(result.current.resumeData).toEqual(sampleResumeData);

    act(() => {
      result.current.resetWorkspace();
    });

    expect(result.current.resumeData).toBeNull();
    expect(result.current.matchResult).toBeNull();
    expect(result.current.analysisToken).toBeNull();
    expect(localStorage.getItem(LS_KEY)).toBeNull();
  });

  it("resetForNewRole keeps resume data but clears match/paid results", () => {
    const { result } = renderHook(() => useWorkspace());

    act(() => {
      result.current.setResumeData(sampleResumeData);
      result.current.setMatchResult(sampleMatchResult);
      result.current.setRewriteSuggestions(sampleRewriteSuggestions);
      result.current.setStudyItems(sampleStudyItems);
    });

    expect(result.current.resumeData).toEqual(sampleResumeData);
    expect(result.current.matchResult).toEqual(sampleMatchResult);

    act(() => {
      result.current.resetForNewRole();
    });

    // Resume data preserved
    expect(result.current.resumeData).toEqual(sampleResumeData);
    // Match and paid content cleared
    expect(result.current.matchResult).toBeNull();
    expect(result.current.rewriteSuggestions).toBeNull();
    expect(result.current.studyItems).toBeNull();
    expect(result.current.coverLetter).toBeNull();
  });

  it("notifyTab and clearTabNotification work correctly", () => {
    const { result } = renderHook(() => useWorkspace());

    expect(result.current.tabNotifications).toEqual({});

    act(() => {
      result.current.notifyTab("rewrites");
    });
    expect(result.current.tabNotifications.rewrites).toBe(true);

    act(() => {
      result.current.clearTabNotification("rewrites");
    });
    expect(result.current.tabNotifications.rewrites).toBeUndefined();
  });
});
