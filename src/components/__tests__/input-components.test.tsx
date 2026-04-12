import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BatchJobDescriptions from "@/components/BatchJobDescriptions";
import GitHubConnect from "@/components/GitHubConnect";
import JobDescription from "@/components/JobDescription";
import ResumeUpload from "@/components/ResumeUpload";
import { sampleGitHubProfile } from "@/test-utils/fixtures";

const mockJsonResponse = <T,>(data: T, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
  }) as unknown as Response;

describe("input components", () => {
  it("updates and submits batch descriptions", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(<BatchJobDescriptions onSubmit={onSubmit} loading={false} />);
    const textarea = screen.getByPlaceholderText(/Paste first job description/);
    await user.type(textarea, "Job one\n---\nJob two");
    expect(screen.getByText("2 jobs")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Score 2 jobs" }));
    expect(onSubmit).toHaveBeenCalledWith(["Job one", "Job two"]);
  });

  it("tracks job description changes and resizes the textarea", async () => {
    const onChange = jest.fn();
    const { rerender } = render(<JobDescription value="hello" onChange={onChange} />);
    const textarea = screen.getByPlaceholderText("Paste the job description here…");
    fireEvent.input(textarea, { target: { value: "updated" } });
    Object.defineProperty(textarea, "scrollHeight", { configurable: true, value: 720 });
    rerender(<JobDescription value={"updated".repeat(20)} onChange={onChange} />);

    expect(onChange).toHaveBeenCalledWith("updated");
    await waitFor(() => expect(textarea).toHaveStyle({ height: "480px" }));
  });

  it("validates uploads, drag state, and clearing", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<ResumeUpload onChange={onChange} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const txtFile = new File(["hello"], "resume.txt", { type: "text/plain" });
    const pdfFile = new File(["pdf"], "resume.pdf", { type: "application/pdf" });
    const dropzone = screen.getByText("Drag it here or click to browse").closest("div") as HTMLDivElement;

    fireEvent.change(input, { target: { files: [txtFile] } });
    expect(screen.getByText("Only PDF files are accepted.")).toBeInTheDocument();

    fireEvent.dragOver(dropzone);
    expect(dropzone).toHaveClass("is-dragging");
    fireEvent.drop(dropzone, { dataTransfer: { files: [pdfFile] } });
    expect(onChange).toHaveBeenCalledWith(pdfFile);
    expect(screen.getByText("resume.pdf")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("fetches and clears a GitHub profile", async () => {
    const user = userEvent.setup();
    const onProfile = jest.fn();
    const originalFetch = global.fetch;
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as typeof fetch;

    fetchSpy.mockResolvedValueOnce(
      mockJsonResponse({ profile: sampleGitHubProfile })
    );

    render(<GitHubConnect onProfile={onProfile} />);
    const input = screen.getByPlaceholderText("username");
    await user.type(input, "@jordan{enter}");

    await waitFor(() => expect(screen.getByText("@jordan")).toBeInTheDocument());
    expect(onProfile).toHaveBeenCalledWith(sampleGitHubProfile);

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(onProfile).toHaveBeenLastCalledWith(null);
    global.fetch = originalFetch;
  });

  it("shows GitHub fetch errors", async () => {
    const user = userEvent.setup();
    const onProfile = jest.fn();
    const originalFetch = global.fetch;
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as typeof fetch;

    fetchSpy.mockResolvedValueOnce(
      mockJsonResponse({ error: "No profile" }, false, 404)
    );

    render(<GitHubConnect onProfile={onProfile} />);
    await user.type(screen.getByPlaceholderText("username"), "missing");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    await waitFor(() => expect(screen.getByText("No profile")).toBeInTheDocument());
    expect(onProfile).toHaveBeenLastCalledWith(null);
    global.fetch = originalFetch;
  });
});
