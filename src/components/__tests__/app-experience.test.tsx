import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { sampleBatchResult, sampleMatchResult, sampleResumeData, sampleRewriteSuggestions, sampleStudyItems } from "@/test-utils/fixtures";

const mockExtractPdfBase64 = jest.fn();

jest.mock("@/lib/extractPdfText", () => ({
  extractPdfBase64: (...args: unknown[]) => mockExtractPdfBase64(...args),
}));

jest.mock("@/components/ErrorBoundary", () =>
  function MockErrorBoundary({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  }
);
jest.mock("@/components/Spinner", () =>
  function MockSpinner() {
    return <span>Spinner</span>;
  }
);
jest.mock("@/components/ResumeUpload", () =>
  function MockResumeUpload({ onChange }: { onChange: (file: File | null) => void }) {
    return (
      <button
        type="button"
        onClick={() => onChange(new File(["pdf"], "resume.pdf", { type: "application/pdf" }))}
      >
        Select resume
      </button>
    );
  }
);
jest.mock("@/components/GitHubConnect", () =>
  function MockGitHubConnect() {
    return <div>GitHubConnect</div>;
  }
);
jest.mock("@/components/JobDescription", () =>
  function MockJobDescription({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) {
    return (
      <textarea
        aria-label="job-description"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
);
jest.mock("@/components/BatchJobDescriptions", () =>
  function MockBatchJobDescriptions({
    onSubmit,
    loading,
  }: {
    onSubmit: (values: string[]) => void;
    loading: boolean;
  }) {
    const [text, setText] = useState("");
    return (
      <div>
        <textarea
          aria-label="batch-descriptions"
          value={text}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setText(event.target.value)}
        />
        <button type="button" disabled={loading} onClick={() => onSubmit(text.split("|").filter(Boolean))}>
          Submit batch
        </button>
      </div>
    );
  }
);
jest.mock("@/components/ResumeProfile", () =>
  function MockResumeProfile({
    data,
    loading,
  }: {
    data: { name: string } | null;
    loading: boolean;
  }) {
    return <div>{loading ? "ResumeProfile loading" : data ? `ResumeProfile: ${data.name}` : "ResumeProfile empty"}</div>;
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
    return <div>{loading ? "MatchScore loading" : result ? `MatchScore: ${result.score}` : "MatchScore empty"}</div>;
  }
);
jest.mock("@/components/ResumeRewriter", () =>
  function MockResumeRewriter({
    suggestions,
    loading,
  }: {
    suggestions: Array<{ rewrittenBullet: string }> | null;
    loading: boolean;
  }) {
    return <div>{loading ? "ResumeRewriter loading" : suggestions ? `ResumeRewriter: ${suggestions.length}` : "ResumeRewriter empty"}</div>;
  }
);
jest.mock("@/components/StudyPlan", () =>
  function MockStudyPlan({ items, loading }: { items: Array<{ skill: string }> | null; loading: boolean }) {
    return <div>{loading ? "StudyPlan loading" : items ? `StudyPlan: ${items.length}` : "StudyPlan empty"}</div>;
  }
);
jest.mock("@/components/CoverLetter", () =>
  function MockCoverLetter({ content, loading }: { content: string | null; loading: boolean }) {
    return <div>{loading ? "CoverLetter loading" : content ? `CoverLetter: ${content}` : "CoverLetter empty"}</div>;
  }
);
jest.mock("@/components/PayGate", () =>
  function MockPayGate({ paymentState, onPay }: { paymentState: string; onPay: () => void }) {
    return (
      <div>
        <span>{`PayGate: ${paymentState}`}</span>
        <button type="button" onClick={onPay}>
          Pay now
        </button>
      </div>
    );
  }
);
jest.mock("@/components/BatchResults", () =>
  function MockBatchResults({
    results,
    loading,
    onSelect,
  }: {
    results: Array<{ company: string }> | null;
    loading: boolean;
    onSelect: (result: typeof sampleBatchResult) => void;
  }) {
    return (
      <div>
        <span>{loading ? "BatchResults loading" : results ? `BatchResults: ${results.length}` : "BatchResults empty"}</span>
        {results?.[0] ? (
          <button type="button" onClick={() => onSelect(results[0] as typeof sampleBatchResult)}>
            Open batch result
          </button>
        ) : null}
      </div>
    );
  }
);

import AppExperience from "@/components/AppExperience";

const mockJsonResponse = <T,>(data: T, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
  }) as unknown as Response;

describe("AppExperience", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExtractPdfBase64.mockResolvedValue("base64-pdf");
    window.history.replaceState({}, "", "/app");
  });

  it("extracts a resume and shows the pay gate when no token exists", async () => {
    const user = userEvent.setup();
    const originalFetch = global.fetch;
    const fetchSpy = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/extract")) {
        return mockJsonResponse({ resumeData: sampleResumeData });
      }

      throw new Error(`Unexpected fetch: ${String(input)}`);
    });
    global.fetch = fetchSpy as typeof fetch;

    render(<AppExperience />);
    await user.click(screen.getByRole("button", { name: "Select resume" }));
    await user.type(screen.getByLabelText("job-description"), "Target role");
    await user.click(screen.getByRole("button", { name: /Run analysis/ }));

    await waitFor(() => expect(screen.getByText("ResumeProfile: Jordan Rivera")).toBeInTheDocument());
    expect(screen.getByText("PayGate: idle")).toBeInTheDocument();
    global.fetch = originalFetch;
  });

  it("redeems a token from the URL and runs the paid phases", async () => {
    jest.useFakeTimers();
    sessionStorage.setItem("pending_jd", "Stored JD");
    sessionStorage.setItem("pending_resume_data", JSON.stringify(sampleResumeData));
    window.history.replaceState({}, "", "/app?token=sess_123&success=true");

    const originalFetch = global.fetch;
    const fetchSpy = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/redeem-token")) {
        return mockJsonResponse({ token: "analysis-token" });
      }
      if (url.includes("/api/score")) {
        return mockJsonResponse({ matchResult: sampleMatchResult });
      }
      if (url.includes("/api/rewrite")) {
        return mockJsonResponse({ suggestions: sampleRewriteSuggestions });
      }
      if (url.includes("/api/study-plan")) {
        return mockJsonResponse({ items: sampleStudyItems });
      }
      if (url.includes("/api/cover-letter")) {
        return mockJsonResponse({ coverLetter: "Dear Hiring Team" });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    global.fetch = fetchSpy as typeof fetch;

    render(<AppExperience />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => expect(screen.getByText("MatchScore: 78")).toBeInTheDocument());
    expect(screen.getByText("ResumeRewriter: 1")).toBeInTheDocument();
    expect(screen.getByText("StudyPlan: 1")).toBeInTheDocument();
    expect(screen.getByText("CoverLetter: Dear Hiring Team")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/app");
    expect(sessionStorage.getItem("pending_jd")).toBeNull();

    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it("supports batch scoring and drill-down once a token is available", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    window.history.replaceState({}, "", "/app?token=sess_batch&success=true");

    const scoreResponses = [sampleMatchResult, { ...sampleMatchResult, score: 91 }];
    const originalFetch = global.fetch;
    const fetchSpy = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/redeem-token")) {
        return mockJsonResponse({ token: "analysis-token" });
      }
      if (url.includes("/api/extract")) {
        return mockJsonResponse({ resumeData: sampleResumeData });
      }
      if (url.includes("/api/score")) {
        const next = scoreResponses.shift() ?? sampleMatchResult;
        return mockJsonResponse({ matchResult: next });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    global.fetch = fetchSpy as typeof fetch;

    render(<AppExperience />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await user.click(screen.getByRole("button", { name: "Select resume" }));
    await user.click(screen.getByRole("button", { name: "Batch Mode" }));
    await user.type(screen.getByLabelText("batch-descriptions"), "JD one|JD two");
    await user.click(screen.getByRole("button", { name: "Submit batch" }));

    await waitFor(() => expect(screen.getByText("BatchResults: 2")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Open batch result" }));
    expect(screen.getByText("MatchScore: 78")).toBeInTheDocument();
    global.fetch = originalFetch;
    jest.useRealTimers();
  });
});
