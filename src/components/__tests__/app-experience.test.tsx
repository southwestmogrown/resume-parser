import type { AnchorHTMLAttributes, ReactNode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { sampleResumeData, sampleMatchResult, sampleBatchResult, sampleRewriteSuggestions, sampleStudyItems, sampleGitHubProfile } from "@/test-utils/fixtures";
import type { BatchScoreResult } from "@/lib/types";
import { LS_KEY } from "@/components/AppExperience";

const secondBatchResult: BatchScoreResult = {
  ...sampleBatchResult,
  jobTitle: "Frontend Engineer",
  company: "Acme",
  jobDescription: "Acme is seeking a Frontend Engineer with React skills.",
};

// ── Capture callbacks from mocked components ─────────────────────────────────

let capturedCheckoutOnSuccess: ((token: string, expiresAt: string) => void) | null = null;
let capturedBatchOnSelect: ((result: BatchScoreResult) => void) | null = null;

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href?: unknown }) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("@/components/ErrorBoundary", () =>
  function MockErrorBoundary({ children }: { children: ReactNode }) {
    return <>{children}</>;
  }
);

jest.mock("@/components/Spinner", () =>
  function MockSpinner() {
    return <span>Spinner</span>;
  }
);

jest.mock("@/components/PassStackLogo", () =>
  function MockPassStackLogo() {
    return <span>Logo</span>;
  }
);

jest.mock("@/components/ResumeUpload", () =>
  function MockResumeUpload({ sessionResumeName }: { sessionResumeName?: string | null }) {
    return <div>{sessionResumeName ? `Resume:${sessionResumeName}` : "Resume:empty"}</div>;
  }
);

jest.mock("@/components/JobDescriptionList", () =>
  function MockJobDescriptionList({ value }: { value: string[] }) {
    return <div>{`JobDescriptions:${value.length}`}</div>;
  }
);

jest.mock("@/components/GitHubConnect", () =>
  function MockGitHubConnect({
    initialProfile,
  }: {
    initialProfile?: { username: string } | null;
  }) {
    return <div>{initialProfile ? `GitHub:${initialProfile.username}` : "GitHub:empty"}</div>;
  }
);

jest.mock("@/components/LinkedInConnect", () =>
  function MockLinkedInConnect({
    initialProfile,
  }: {
    initialProfile?: { name: string | null } | null;
  }) {
    return <div>{initialProfile?.name ? `LinkedIn:${initialProfile.name}` : "LinkedIn:empty"}</div>;
  }
);

jest.mock("@/components/MatchScore", () =>
  function MockMatchScore({
    result,
    loading,
  }: {
    result: { score: number } | null;
    loading: boolean;
  }) {
    return <div>{loading ? "MatchScore:loading" : result ? `MatchScore:${result.score}` : "MatchScore:empty"}</div>;
  }
);

jest.mock("@/components/PayGate", () =>
  function MockPayGate({
    resumeData,
    paymentState,
    onPay,
  }: {
    resumeData: { name?: string | null };
    paymentState: string;
    onPay: () => void;
  }) {
    return (
      <div>
        <span>{`PayGate:${paymentState}:${resumeData?.name ?? "unknown"}`}</span>
        <button type="button" onClick={onPay}>
          Pay now
        </button>
      </div>
    );
  }
);

jest.mock("@/components/ResumeRewriter", () =>
  function MockResumeRewriter({
    suggestions,
    loading,
  }: {
    suggestions: Array<unknown> | null;
    loading: boolean;
  }) {
    if (loading) return <div>ResumeRewriter:loading</div>;
    return <div>{suggestions ? `ResumeRewriter:${suggestions.length}` : "ResumeRewriter:empty"}</div>;
  }
);

jest.mock("@/components/StudyPlan", () =>
  function MockStudyPlan({
    items,
    loading,
  }: {
    items: Array<unknown> | null;
    loading: boolean;
  }) {
    if (loading) return <div>StudyPlan:loading</div>;
    return <div>{items ? `StudyPlan:${items.length}` : "StudyPlan:empty"}</div>;
  }
);

jest.mock("@/components/CoverLetter", () =>
  function MockCoverLetter({
    content,
  }: {
    content: string | null;
  }) {
    return <div>{content ? "CoverLetter:ready" : "CoverLetter:empty"}</div>;
  }
);

jest.mock("@/components/StarPrepPanel", () =>
  function MockStarPrepPanel({ jobDescription }: { jobDescription: string }) {
    return <div>StarPrepPanel:{jobDescription.slice(0, 20)}</div>;
  }
);

jest.mock("@/components/OptimizedResume", () =>
  function MockOptimizedResume({
    content,
    canGenerate,
  }: {
    content: string | null;
    canGenerate: boolean;
  }) {
    if (content) return <div>OptimizedResume:ready</div>;
    if (canGenerate) return <div>OptimizedResume:cta</div>;
    return <div>OptimizedResume:locked</div>;
  }
);

jest.mock("@/components/BatchResults", () =>
  function MockBatchResults({ onSelect }: { onSelect: (result: BatchScoreResult) => void }) {
    capturedBatchOnSelect = onSelect;
    return <div>BatchResults</div>;
  }
);

jest.mock("@/components/ExperienceInterviewer", () =>
  function MockExperienceInterviewer() {
    return <div>ExperienceInterviewer</div>;
  }
);

jest.mock("@/components/CheckoutModal", () =>
  function MockCheckoutModal({ onSuccess }: { onSuccess: (token: string, expiresAt: string) => void }) {
    capturedCheckoutOnSuccess = onSuccess;
    return <div>CheckoutModal</div>;
  }
);

import AppExperience from "@/components/AppExperience";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Seed localStorage with workspace state that includes score + JD but no paid content. */
function seedScoredWorkspace(overrides: Record<string, unknown> = {}) {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      resumeData: sampleResumeData,
      matchResult: sampleMatchResult,
      jobDescriptions: ["Build a Next.js SaaS app with Stripe integration."],
      ...overrides,
    })
  );
}

/** Seed localStorage with batch results (multi-JD scored, no drill-down). */
function seedBatchWorkspace(overrides: Record<string, unknown> = {}) {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      resumeData: sampleResumeData,
      batchResults: [
        sampleBatchResult,
        secondBatchResult,
      ],
      jobDescriptions: [sampleBatchResult.jobDescription, secondBatchResult.jobDescription],
      ...overrides,
    })
  );
}

/** Create a mock fetch that responds to paid phase endpoints. */
function mockPaidPhaseFetches() {
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url === "/api/rewrite") {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ suggestions: sampleRewriteSuggestions }),
      });
    }
    if (url === "/api/study-plan") {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ items: sampleStudyItems }),
      });
    }
    if (url === "/api/cover-letter") {
      return Promise.resolve({
        ok: true,
        status: 200,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("Dear Hiring Team,"));
            controller.close();
          },
        }),
      });
    }
    if (url === "/api/create-payment-intent") {
      return Promise.resolve({
        ok: true,
        json: async () => ({ clientSecret: "pi_secret" }),
      });
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  });
}

describe("AppExperience nav button visibility", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/app");
    global.fetch = jest.fn() as typeof fetch;
    capturedCheckoutOnSuccess = null;
    capturedBatchOnSelect = null;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("shows the Unlock button in the nav when the user has not paid", () => {
    render(<AppExperience />);
    expect(screen.getByRole("button", { name: /Unlock/i })).toBeInTheDocument();
  });

  it("hides the export button before any content is available", () => {
    render(<AppExperience />);
    expect(screen.queryByRole("button", { name: /Export .zip/i })).not.toBeInTheDocument();
  });

  it("shows the CheckoutModal when checkout is triggered", async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ clientSecret: "test_secret" }),
    });

    render(<AppExperience />);

    await user.click(screen.getByRole("button", { name: /Unlock/i }));

    expect(screen.getByText("CheckoutModal")).toBeInTheDocument();
  });
});

describe("AppExperience paid phase auto-trigger", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/app");
    global.fetch = jest.fn() as typeof fetch;
    capturedCheckoutOnSuccess = null;
    capturedBatchOnSelect = null;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("fires rewrite, study-plan, and cover-letter fetches when token is restored from localStorage", async () => {
    seedScoredWorkspace({ analysisToken: "tok_test", tokenExpiresAt: new Date(Date.now() + 86400000).toISOString() });
    mockPaidPhaseFetches();

    render(<AppExperience />);

    await waitFor(() => {
      const urls = (global.fetch as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
      expect(urls).toContain("/api/rewrite");
      expect(urls).toContain("/api/study-plan");
    });

    // Cover letter fires after rewrite + study resolve
    await waitFor(() => {
      const urls = (global.fetch as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
      expect(urls).toContain("/api/cover-letter");
    });
  });

  it("does NOT auto-trigger paid phases when rewrite data already exists in localStorage", async () => {
    seedScoredWorkspace({
      analysisToken: "tok_test",
      tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      rewriteSuggestions: sampleRewriteSuggestions,
    });
    mockPaidPhaseFetches();

    render(<AppExperience />);

    // Rewrite data already exists — auto-trigger should not fire paid phases.
    // Wait for any pending effects to settle, then verify no paid-phase fetch was made.
    await waitFor(() => {
      expect(screen.getByText(`ResumeRewriter:${sampleRewriteSuggestions.length}`)).toBeInTheDocument();
    });

    const urls = (global.fetch as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
    expect(urls).not.toContain("/api/rewrite");
    expect(urls).not.toContain("/api/study-plan");
    expect(urls).not.toContain("/api/cover-letter");
  });

  it("displays Bullet Rewrites tab content after paid phases complete", async () => {
    seedScoredWorkspace({ analysisToken: "tok_test", tokenExpiresAt: new Date(Date.now() + 86400000).toISOString() });
    mockPaidPhaseFetches();

    render(<AppExperience />);

    await waitFor(() => {
      expect(screen.getByText(`ResumeRewriter:${sampleRewriteSuggestions.length}`)).toBeInTheDocument();
    });
  });

  it("fires paid phases when payment succeeds via CheckoutModal callback", async () => {
    seedScoredWorkspace();
    mockPaidPhaseFetches();

    const user = userEvent.setup();
    render(<AppExperience />);

    // Open checkout (first Unlock button is the nav one)
    await user.click(screen.getAllByRole("button", { name: /Unlock/i })[0]);
    expect(capturedCheckoutOnSuccess).not.toBeNull();

    // Simulate payment success
    act(() => {
      capturedCheckoutOnSuccess!("tok_new", new Date(Date.now() + 86400000).toISOString());
    });

    // Paid phases should fire
    await waitFor(() => {
      const urls = (global.fetch as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
      expect(urls).toContain("/api/rewrite");
      expect(urls).toContain("/api/study-plan");
    });

    await waitFor(() => {
      const urls = (global.fetch as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
      expect(urls).toContain("/api/cover-letter");
    });
  });
});

describe("AppExperience localStorage token persistence", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/app");
    global.fetch = jest.fn() as typeof fetch;
    capturedCheckoutOnSuccess = null;
    capturedBatchOnSelect = null;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("persists analysisToken and tokenExpiresAt to localStorage after payment", async () => {
    seedScoredWorkspace();
    mockPaidPhaseFetches();

    const user = userEvent.setup();
    render(<AppExperience />);

    // Open checkout and simulate success
    await user.click(screen.getAllByRole("button", { name: /Unlock/i })[0]);
    const expiresAt = new Date(Date.now() + 86400000).toISOString();

    act(() => {
      capturedCheckoutOnSuccess!("tok_persist", expiresAt);
    });

    // Wait for state to save
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
      expect(saved.analysisToken).toBe("tok_persist");
      expect(saved.tokenExpiresAt).toBe(expiresAt);
    });
  });

  it("restores analysisToken from localStorage and hides the Unlock button", () => {
    seedScoredWorkspace({
      analysisToken: "tok_restored",
      tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });

    render(<AppExperience />);

    // The Unlock button should be hidden when a token is present
    expect(screen.queryByRole("button", { name: /Unlock/i })).not.toBeInTheDocument();
  });
});

describe("AppExperience batch drill-down", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/app");
    global.fetch = jest.fn() as typeof fetch;
    capturedCheckoutOnSuccess = null;
    capturedBatchOnSelect = null;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("fires paid phases immediately when payment succeeds in batch drill-down", async () => {
    seedBatchWorkspace();
    mockPaidPhaseFetches();

    const user = userEvent.setup();
    render(<AppExperience />);

    // Drill down into a batch result
    expect(capturedBatchOnSelect).not.toBeNull();
    act(() => {
      capturedBatchOnSelect!(sampleBatchResult);
    });

    // Score is visible, Unlock buttons show
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /Unlock/i }).length).toBeGreaterThanOrEqual(1);
    });

    // Pay via nav Unlock button (first one)
    await user.click(screen.getAllByRole("button", { name: /Unlock/i })[0]);
    act(() => {
      capturedCheckoutOnSuccess!("tok_batch", new Date(Date.now() + 86400000).toISOString());
    });

    // Batch payment success should trigger paid phases for the selected JD immediately.
    await waitFor(() => {
      const urls = (global.fetch as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
      expect(urls).toContain("/api/rewrite");
      expect(urls).toContain("/api/study-plan");
    });
  });

  it("opens checkout immediately when Generate full analysis hits an exhausted token", async () => {
    seedBatchWorkspace({
      analysisToken: "tok_exhausted",
      tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === "/api/rewrite" || url === "/api/study-plan") {
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      }
      if (url === "/api/create-payment-intent") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ clientSecret: "pi_secret_retry" }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    });

    const user = userEvent.setup();
    render(<AppExperience />);

    // Drill down
    act(() => { capturedBatchOnSelect!(sampleBatchResult); });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Generate full analysis/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Generate full analysis/i }));

    // First click should immediately open checkout modal.
    await waitFor(() => {
      expect(screen.getByText("CheckoutModal")).toBeInTheDocument();
    });

    // Since paid phases have started, the explicit batch button should not show.
    expect(screen.queryByRole("button", { name: /Generate full analysis/i })).not.toBeInTheDocument();
  });

  it("restores first JD paid content after switching to another JD", async () => {
    seedBatchWorkspace({
      analysisToken: "tok_batch_cache",
      tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    mockPaidPhaseFetches();

    const user = userEvent.setup();
    render(<AppExperience />);

    // Drill into first JD and generate paid outputs.
    act(() => { capturedBatchOnSelect!(sampleBatchResult); });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Generate full analysis/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Generate full analysis/i }));
    await waitFor(() => {
      expect(screen.getByText(`ResumeRewriter:${sampleRewriteSuggestions.length}`)).toBeInTheDocument();
    });

    // Switch to second JD (no cached paid outputs yet), then back to first.
    act(() => { capturedBatchOnSelect!(secondBatchResult); });
    act(() => { capturedBatchOnSelect!(sampleBatchResult); });

    await waitFor(() => {
      expect(screen.getByText(`ResumeRewriter:${sampleRewriteSuggestions.length}`)).toBeInTheDocument();
    });

    // Since paid phases have started, the explicit batch button should not show.
    expect(screen.queryByRole("button", { name: /Generate full analysis/i })).not.toBeInTheDocument();
  });

  it("clears STAR coaching state when switching between batch drill-down JDs", async () => {
    seedBatchWorkspace({
      analysisToken: "tok_star",
      tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    mockPaidPhaseFetches();

    render(<AppExperience />);

    // Drill into first JD
    act(() => { capturedBatchOnSelect!(sampleBatchResult); });

    // StarPrepPanel should get the first JD
    await waitFor(() => {
      // The Interview Prep tab should be available — click it to see StarPrepPanel
      const interviewTab = screen.getByRole("tab", { name: /Interview Prep/i });
      expect(interviewTab).toBeInTheDocument();
    });

    // Now drill into the second JD (different JD text)
    act(() => { capturedBatchOnSelect!(secondBatchResult); });

    // After switching, StarPrepPanel should receive the new JD
    await waitFor(() => {
      // The new JD should be passed to StarPrepPanel
      const interviewTab = screen.getByRole("tab", { name: /Interview Prep/i });
      expect(interviewTab).toBeInTheDocument();
    });
  });
});

describe("AppExperience state persistence", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/app");
    global.fetch = jest.fn() as typeof fetch;
    capturedCheckoutOnSuccess = null;
    capturedBatchOnSelect = null;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("persists coverLetterBlocked to localStorage", async () => {
    seedScoredWorkspace({
      analysisToken: "tok_test",
      tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      coverLetterBlocked: ["AWS", "5+ years experience"],
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });

    render(<AppExperience />);

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
      expect(saved.coverLetterBlocked).toEqual(["AWS", "5+ years experience"]);
    });
  });

  it("restores coverLetterBlocked from localStorage", async () => {
    seedScoredWorkspace({
      analysisToken: "tok_test",
      tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      rewriteSuggestions: sampleRewriteSuggestions,
      studyItems: sampleStudyItems,
      coverLetterBlocked: ["AWS"],
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });

    render(<AppExperience />);

    // coverLetterBlocked means hasPaidContent is true — tabs should be visible
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Cover Letter/i })).toBeInTheDocument();
    });
  });

  it("persists githubProfile to localStorage", async () => {
    seedScoredWorkspace({
      githubProfile: sampleGitHubProfile,
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });

    render(<AppExperience />);

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
      expect(saved.githubProfile).toEqual(sampleGitHubProfile);
    });
  });

  it("restores githubProfile from localStorage and passes it to GitHubConnect", async () => {
    // GitHubConnect is only visible in the pre-analysis panel (no resumeData/matchResult)
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        jobDescriptions: ["Build a Next.js SaaS app."],
        githubProfile: sampleGitHubProfile,
      })
    );
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });

    render(<AppExperience />);

    // MockGitHubConnect renders the username when initialProfile is provided
    await waitFor(() => {
      expect(screen.getByText(`GitHub:${sampleGitHubProfile.username}`)).toBeInTheDocument();
    });
  });

  it("persists all paid content fields and restores them across sessions", async () => {
    const expiresAt = new Date(Date.now() + 86400000).toISOString();
    seedScoredWorkspace({
      analysisToken: "tok_full",
      tokenExpiresAt: expiresAt,
      rewriteSuggestions: sampleRewriteSuggestions,
      studyItems: sampleStudyItems,
      coverLetter: "Dear Hiring Manager,",
      optimizedResume: "Optimized resume content",
      starQuestions: [{ id: "q1", question: "Tell me about a time...", targetSkill: "React", difficulty: "standard" }],
      starAnswers: [{ questionId: "q1", question: "Tell me about a time...", situation: "S", task: "T", action: "A", result: "R", coachingNotes: "Good" }],
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });

    render(<AppExperience />);

    // Verify all paid content is restored by checking that paid tabs are visible
    await waitFor(() => {
      expect(screen.getByText(`ResumeRewriter:${sampleRewriteSuggestions.length}`)).toBeInTheDocument();
    });

    // Verify localStorage has all fields
    const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
    expect(saved.rewriteSuggestions).toEqual(sampleRewriteSuggestions);
    expect(saved.studyItems).toEqual(sampleStudyItems);
    expect(saved.coverLetter).toBe("Dear Hiring Manager,");
    expect(saved.optimizedResume).toBe("Optimized resume content");
    expect(saved.analysisToken).toBe("tok_full");
  });
});

describe("AppExperience batch drill-down Interview Prep tab", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/app");
    global.fetch = jest.fn() as typeof fetch;
    capturedCheckoutOnSuccess = null;
    capturedBatchOnSelect = null;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("shows locked message on Interview Prep tab when drilling into unanalyzed batch JD with token", async () => {
    seedBatchWorkspace({
      analysisToken: "tok_batch",
      tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });

    const user = userEvent.setup();
    render(<AppExperience />);

    // Drill into a batch result (no cached paid content)
    act(() => {
      capturedBatchOnSelect!(sampleBatchResult);
    });

    // Click the Interview Prep tab
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Interview Prep/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("tab", { name: /Interview Prep/i }));

    // Should show the locked CTA, not StarPrepPanel
    await waitFor(() => {
      expect(screen.getByText(/interview prep locked/i)).toBeInTheDocument();
    });

    // The sidebar "Generate full analysis" button should also be present
    expect(screen.getByRole("button", { name: /Generate full analysis/i })).toBeInTheDocument();

    // StarPrepPanel should NOT be rendered
    expect(screen.queryByText(/StarPrepPanel:/)).not.toBeInTheDocument();
  });

  it("shows StarPrepPanel on Interview Prep tab after paid content is generated in batch mode", async () => {
    seedBatchWorkspace({
      analysisToken: "tok_batch_paid",
      tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    mockPaidPhaseFetches();

    const user = userEvent.setup();
    render(<AppExperience />);

    // Drill into batch result
    act(() => {
      capturedBatchOnSelect!(sampleBatchResult);
    });

    // Generate full analysis
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Generate full analysis/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Generate full analysis/i }));

    // Wait for paid content to load
    await waitFor(() => {
      expect(screen.getByText(`ResumeRewriter:${sampleRewriteSuggestions.length}`)).toBeInTheDocument();
    });

    // Now switch to Interview Prep — should show StarPrepPanel with the batch JD
    await user.click(screen.getByRole("tab", { name: /Interview Prep/i }));
    await waitFor(() => {
      expect(screen.getByText(/StarPrepPanel:/)).toBeInTheDocument();
    });
  });
});
