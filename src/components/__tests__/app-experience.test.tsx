import type { AnchorHTMLAttributes, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
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
    paymentState,
    onPay,
  }: {
    paymentState: string;
    onPay: () => void;
  }) {
    return (
      <div>
        <span>{`PayGate:${paymentState}`}</span>
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
        <button type="button" onClick={onPrev}>
          Tour back
        </button>
        <button type="button" onClick={onNext}>
          Tour next
        </button>
        <button type="button" onClick={onSkip}>
          Tour skip
        </button>
      </div>
    );
  }
);

import AppExperience from "@/components/AppExperience";

describe("AppExperience demo tour", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.history.replaceState({}, "", "/app?demo");
    global.fetch = jest.fn() as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("uses fixtures through the demo tour without opening checkout", async () => {
    const user = userEvent.setup();

    render(<AppExperience />);

    for (let i = 0; i < 7; i += 1) {
      await user.click(screen.getByRole("button", { name: "Tour next" }));
    }

    expect(screen.getByText("TourStep:7")).toBeInTheDocument();
    expect(screen.getByText("MatchScore:72")).toBeInTheDocument();
    expect(screen.getAllByText("PayGate:idle")).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: "Pay now" })[0]);

    expect(screen.getByText("ResumeRewriter:2")).toBeInTheDocument();
    expect(screen.queryByText("CheckoutModal")).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("restores the locked paygate state when moving backward in the tour", async () => {
    const user = userEvent.setup();

    render(<AppExperience />);

    for (let i = 0; i < 8; i += 1) {
      await user.click(screen.getByRole("button", { name: "Tour next" }));
    }

    expect(screen.getByText("TourStep:8")).toBeInTheDocument();
    expect(screen.getByText("ResumeRewriter:2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tour back" }));

    expect(screen.getByText("TourStep:7")).toBeInTheDocument();
    expect(screen.getAllByText("PayGate:idle")).toHaveLength(2);
    expect(screen.queryByText("ResumeRewriter:2")).not.toBeInTheDocument();
  });

  it("can restart the tour after skipping to the fully unlocked demo state", async () => {
    const user = userEvent.setup();

    render(<AppExperience />);

    await user.click(screen.getByRole("button", { name: "Tour skip" }));

    expect(screen.queryByText(/TourStep:/)).not.toBeInTheDocument();
    expect(screen.getByText("StarPrepPanel")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Take a tour/i })[0]);

    expect(screen.getByText("TourStep:0")).toBeInTheDocument();
    expect(screen.queryByText("StarPrepPanel")).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
