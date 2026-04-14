/**
 * Tests for DemoExperience — the isolated demo/tour component at /demo.
 *
 * These tests verify that:
 *  - The tour drives all state (no real API calls ever fire)
 *  - Navigating forward, backward, and skipping loads the correct fixtures
 *  - The tour can be restarted after completion
 *  - The "Pay now" button applies paid fixtures without hitting Stripe
 */

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

jest.mock("@/components/PassStackLogo", () =>
  function MockPassStackLogo() { return <span>Logo</span>; }
);

jest.mock("@/components/ResumeUpload", () =>
  function MockResumeUpload() { return <div>ResumeUpload</div>; }
);

jest.mock("@/components/JobDescriptionList", () =>
  function MockJobDescriptionList({ value }: { value: string[] }) {
    return <div>{`JobDescriptions:${value.length}`}</div>;
  }
);

jest.mock("@/components/GitHubConnect", () =>
  function MockGitHubConnect({ initialProfile }: { initialProfile?: { username: string } | null }) {
    return <div>{initialProfile ? `GitHub:${initialProfile.username}` : "GitHub:empty"}</div>;
  }
);

jest.mock("@/components/LinkedInConnect", () =>
  function MockLinkedInConnect({ initialProfile }: { initialProfile?: { name: string | null } | null }) {
    return <div>{initialProfile?.name ? `LinkedIn:${initialProfile.name}` : "LinkedIn:empty"}</div>;
  }
);

jest.mock("@/components/MatchScore", () =>
  function MockMatchScore({ result, loading }: { result: { score: number } | null; loading: boolean }) {
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
        <button type="button" onClick={onPay}>Pay now</button>
      </div>
    );
  }
);

jest.mock("@/components/ResumeRewriter", () =>
  function MockResumeRewriter({ suggestions }: { suggestions: Array<unknown> | null }) {
    return <div>{suggestions ? `ResumeRewriter:${suggestions.length}` : "ResumeRewriter:empty"}</div>;
  }
);

jest.mock("@/components/StudyPlan", () =>
  function MockStudyPlan({ items }: { items: Array<unknown> | null }) {
    return <div>{items ? `StudyPlan:${items.length}` : "StudyPlan:empty"}</div>;
  }
);

jest.mock("@/components/CoverLetter", () =>
  function MockCoverLetter({ content }: { content: string | null }) {
    return <div>{content ? "CoverLetter:ready" : "CoverLetter:empty"}</div>;
  }
);

jest.mock("@/components/StarPrepPanel", () =>
  function MockStarPrepPanel() { return <div>StarPrepPanel</div>; }
);

jest.mock("@/components/OptimizedResume", () =>
  function MockOptimizedResume({ content, canGenerate }: { content: string | null; canGenerate: boolean }) {
    if (content) return <div>OptimizedResume:ready</div>;
    if (canGenerate) return <div>OptimizedResume:cta</div>;
    return <div>OptimizedResume:locked</div>;
  }
);

jest.mock("@/components/BatchResults", () =>
  function MockBatchResults() { return <div>BatchResults</div>; }
);

jest.mock("@/components/TourOverlay", () =>
  function MockTourOverlay({
    currentStep,
    onNext,
    onPrev,
    onSkip,
  }: {
    currentStep: number;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
  }) {
    return (
      <div>
        <span>{`TourStep:${currentStep}`}</span>
        <button type="button" onClick={onPrev}>Tour back</button>
        <button type="button" onClick={onNext}>Tour next</button>
        <button type="button" onClick={onSkip}>Tour skip</button>
      </div>
    );
  }
);

import DemoExperience from "@/components/DemoExperience";

describe("DemoExperience tour", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn() as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("starts at step 0 with the input section visible and no workspace", () => {
    render(<DemoExperience />);
    expect(screen.getByText("TourStep:0")).toBeInTheDocument();
    // Input section should be visible (not the workspace results sidebar)
    expect(screen.getByText("ResumeUpload")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Analyze/i })).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("advances through the tour, loading demo fixtures at score step without API calls", async () => {
    const user = userEvent.setup();
    render(<DemoExperience />);

    // Advance to step 6 (score step) via Tour next × 6
    for (let i = 0; i < 6; i += 1) {
      await user.click(screen.getByRole("button", { name: "Tour next" }));
    }

    expect(screen.getByText("TourStep:6")).toBeInTheDocument();
    expect(screen.getByText("MatchScore:72")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows the PayGate at step 7 and applies paid fixtures when Pay now is clicked", async () => {
    const user = userEvent.setup();
    render(<DemoExperience />);

    for (let i = 0; i < 7; i += 1) {
      await user.click(screen.getByRole("button", { name: "Tour next" }));
    }

    expect(screen.getByText("TourStep:7")).toBeInTheDocument();
    expect(screen.getAllByText("PayGate:idle:Jordan Rivera")).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: "Pay now" })[0]);

    expect(screen.getByText("ResumeRewriter:2")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("restores the locked PayGate state when moving backward through the tour", async () => {
    const user = userEvent.setup();
    render(<DemoExperience />);

    for (let i = 0; i < 8; i += 1) {
      await user.click(screen.getByRole("button", { name: "Tour next" }));
    }

    expect(screen.getByText("TourStep:8")).toBeInTheDocument();
    expect(screen.getByText("ResumeRewriter:2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tour back" }));

    expect(screen.getByText("TourStep:7")).toBeInTheDocument();
    expect(screen.getAllByText("PayGate:idle:Jordan Rivera")).toHaveLength(2);
    expect(screen.queryByText("ResumeRewriter:2")).not.toBeInTheDocument();
  });

  it("skips to the fully-unlocked demo state and shows the optimized resume", async () => {
    const user = userEvent.setup();
    render(<DemoExperience />);

    await user.click(screen.getByRole("button", { name: "Tour skip" }));

    expect(screen.queryByText(/TourStep:/)).not.toBeInTheDocument();
    expect(screen.getByText("OptimizedResume:ready")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("can restart the tour after skipping", async () => {
    const user = userEvent.setup();
    render(<DemoExperience />);

    await user.click(screen.getByRole("button", { name: "Tour skip" }));
    expect(screen.queryByText(/TourStep:/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Take a tour/i }));

    expect(screen.getByText("TourStep:0")).toBeInTheDocument();
    expect(screen.queryByText("OptimizedResume:ready")).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows the export button after skipping to the fully-unlocked state", async () => {
    const user = userEvent.setup();
    render(<DemoExperience />);

    await user.click(screen.getByRole("button", { name: "Tour skip" }));

    expect(screen.getByRole("button", { name: /Export .zip/i })).toBeInTheDocument();
  });

  it("never calls fetch at any point during the full tour including completion", async () => {
    const user = userEvent.setup();
    render(<DemoExperience />);

    // Advance through all 14 steps and complete the tour (TOUR_STEP_COUNT clicks)
    for (let i = 0; i < TOUR_STEP_COUNT; i += 1) {
      await user.click(screen.getByRole("button", { name: "Tour next" }));
    }

    // Tour should be done — no tour overlay visible
    expect(screen.queryByText(/TourStep:/)).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// TOUR_STEPS has 14 entries (0–13) — used by the exhaustive advancement test above.
const TOUR_STEP_COUNT = 14;
