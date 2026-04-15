import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BatchResults from "@/components/BatchResults";
import CoverLetter from "@/components/CoverLetter";
import MatchScore from "@/components/MatchScore";
import OptimizedResume from "@/components/OptimizedResume";
import PayGate from "@/components/PayGate";
import ResumeProfile from "@/components/ResumeProfile";
import ResumeRewriter from "@/components/ResumeRewriter";
import ScoreRing, { getScoreColorValue } from "@/components/ScoreRing";
import SeverityPill, { toneForSeverity } from "@/components/SeverityPill";
import SkeletonBlock from "@/components/SkeletonBlock";
import Spinner from "@/components/Spinner";
import StudyPlan from "@/components/StudyPlan";
import { sampleBatchResult, sampleMatchResult, sampleResumeData, sampleRewriteSuggestions, sampleStudyItems } from "@/test-utils/fixtures";

describe("display components", () => {
  it("renders score rings and severity pills", () => {
    const { rerender } = render(<ScoreRing score={81} />);
    expect(screen.getByRole("img", { name: "Match score 81%" })).toBeInTheDocument();
    expect(getScoreColorValue(81)).toBe("var(--ps-green)");
    expect(getScoreColorValue(61)).toBe("var(--ps-amber)");
    expect(getScoreColorValue(12)).toBe("var(--ps-red)");
    expect(toneForSeverity("dealbreaker")).toBe("red");
    expect(toneForSeverity("learnable")).toBe("amber");
    expect(toneForSeverity("soft")).toBe("green");

    rerender(<SeverityPill label="TypeScript" tone="sage" />);
    expect(screen.getByText("TypeScript")).toHaveClass("pill", "pill-sage");
  });

  it("renders loading and data states for ResumeProfile", () => {
    const { rerender, container } = render(<ResumeProfile data={null} loading />);
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);

    rerender(<ResumeProfile data={sampleResumeData} loading={false} />);
    expect(screen.getByText("Jordan Rivera")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText(/Present/)).toBeInTheDocument();
  });

  it("renders loading and grouped result states for MatchScore", () => {
    const { rerender, container } = render(<MatchScore result={null} loading />);
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);

    rerender(<MatchScore result={sampleMatchResult} loading={false} />);
    expect(screen.getByText(/Dealbreakers/)).toBeInTheDocument();
    expect(screen.getByText(/Learnable gaps/)).toBeInTheDocument();
    expect(screen.getByText(/Soft gaps/)).toBeInTheDocument();
    expect(screen.getByText(sampleMatchResult.recommendation)).toBeInTheDocument();
  });

  it("renders rewrite suggestions and copies rewritten content", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { rerender, container } = render(<ResumeRewriter suggestions={null} loading />);
    const writeTextSpy = jest
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);

    rerender(<ResumeRewriter suggestions={sampleRewriteSuggestions} loading={false} />);
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeTextSpy).toHaveBeenCalledWith(sampleRewriteSuggestions[0].rewrittenBullet);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument()
    );
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("renders study plans and pay gates across states", () => {
    const { rerender, container } = render(<StudyPlan items={null} loading />);
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);

    rerender(<StudyPlan items={sampleStudyItems} loading={false} />);
    expect(screen.getByText("Study plan")).toBeInTheDocument();
    expect(screen.getByText("AWS docs")).toBeInTheDocument();

    const onPay = jest.fn();
    rerender(<PayGate resumeData={sampleResumeData} paymentState="pending" onPay={onPay} />);
    expect(screen.getByText("Verifying payment…")).toBeInTheDocument();

    rerender(<PayGate resumeData={sampleResumeData} paymentState="canceled" onPay={onPay} />);
    expect(screen.getByText("Payment canceled.")).toBeInTheDocument();
    screen.getByRole("button", { name: /Unlock Full Analysis/ }).click();
    expect(onPay).toHaveBeenCalled();
  });

  it("renders cover letters and copies their text", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { rerender, container } = render(<CoverLetter content={null} loading />);
    const writeTextSpy = jest
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);

    rerender(<CoverLetter content={"Hello **world**\n\nThanks"} loading={false} />);
    expect(screen.getByText("world", { selector: "strong" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeTextSpy).toHaveBeenCalledWith("Hello **world**\n\nThanks");
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    jest.useRealTimers();
  });

  it("renders batch results and sorts/selects rows", async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const second = { ...sampleBatchResult, company: "Acme", jobTitle: "Platform Engineer", score: 91 };
    const { rerender, container } = render(<BatchResults results={null} loading onSelect={onSelect} />);
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);

    rerender(<BatchResults results={[sampleBatchResult, second]} loading={false} onSelect={onSelect} />);
    expect(screen.getByText("Compare roles fast")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Company/ }));
    const rows = screen.getAllByRole("button").filter((button) =>
      button.classList.contains("batch-row")
    );
    await user.click(rows[0] as HTMLButtonElement);
    expect(onSelect).toHaveBeenCalled();
  });

  it("renders utility blocks", () => {
    render(
      <>
        <Spinner className="extra" />
        <SkeletonBlock className="w-full" />
      </>
    );

    expect(document.querySelector(".spinner.extra")).toHaveAttribute("aria-hidden", "true");
    expect(document.querySelector(".skeleton.w-full")).toHaveAttribute("aria-hidden", "true");
  });

  describe("OptimizedResume", () => {
    it("renders a skeleton while loading with no content", () => {
      const { container } = render(
        <OptimizedResume content={null} loading onGenerate={jest.fn()} canGenerate />
      );
      expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
    });

    it("renders generate CTA when canGenerate and not yet generated", () => {
      render(
        <OptimizedResume content={null} loading={false} onGenerate={jest.fn()} canGenerate />
      );
      expect(screen.getByRole("button", { name: /Generate my optimized resume/i })).toBeInTheDocument();
    });

    it("calls onGenerate when the CTA button is clicked", async () => {
      const onGenerate = jest.fn();
      const user = userEvent.setup();
      render(
        <OptimizedResume content={null} loading={false} onGenerate={onGenerate} canGenerate />
      );
      await user.click(screen.getByRole("button", { name: /Generate my optimized resume/i }));
      expect(onGenerate).toHaveBeenCalledTimes(1);
    });

    it("renders the 'complete STAR coaching first' message when canGenerate is false", () => {
      render(
        <OptimizedResume content={null} loading={false} onGenerate={jest.fn()} canGenerate={false} />
      );
      expect(screen.getByText(/Complete at least one STAR/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Generate/i })).not.toBeInTheDocument();
    });

    it("renders content with generating indicator while streaming", () => {
      render(
        <OptimizedResume content={"# Jordan Rivera"} loading onGenerate={jest.fn()} canGenerate />
      );
      expect(screen.getByText(/Jordan Rivera/)).toBeInTheDocument();
      expect(screen.getByText("generating…")).toBeInTheDocument();
    });

    it("renders completed resume with copy and download buttons", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const writeTextSpy = jest
        .spyOn(navigator.clipboard, "writeText")
        .mockResolvedValue(undefined);

      render(
        <OptimizedResume
          content={"# Jordan Rivera\n\nSummary"}
          loading={false}
          onGenerate={jest.fn()}
          canGenerate
        />
      );

      expect(screen.getByText(/Jordan Rivera/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Download/i })).toBeInTheDocument();
      expect(screen.queryByText("generating…")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Copy" }));
      expect(writeTextSpy).toHaveBeenCalledWith("# Jordan Rivera\n\nSummary");
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument()
      );
      act(() => { jest.advanceTimersByTime(2000); });
      expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();

      jest.useRealTimers();
      writeTextSpy.mockRestore();
    });
  });
});
