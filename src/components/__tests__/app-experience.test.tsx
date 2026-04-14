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
  }: {
    suggestions: Array<unknown> | null;
  }) {
    return <div>{suggestions ? `ResumeRewriter:${suggestions.length}` : "ResumeRewriter:empty"}</div>;
  }
);

jest.mock("@/components/StudyPlan", () =>
  function MockStudyPlan({
    items,
  }: {
    items: Array<unknown> | null;
  }) {
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
  function MockStarPrepPanel() {
    return <div>StarPrepPanel</div>;
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
  function MockBatchResults() {
    return <div>BatchResults</div>;
  }
);

jest.mock("@/components/ExperienceInterviewer", () =>
  function MockExperienceInterviewer() {
    return <div>ExperienceInterviewer</div>;
  }
);

jest.mock("@/components/CheckoutModal", () =>
  function MockCheckoutModal() {
    return <div>CheckoutModal</div>;
  }
);

import AppExperience from "@/components/AppExperience";

describe("AppExperience nav button visibility", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/app");
    global.fetch = jest.fn() as typeof fetch;
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
