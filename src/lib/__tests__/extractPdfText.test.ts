import { extractPdfBase64 } from "@/lib/extractPdfText";

describe("extractPdfBase64", () => {
  const OriginalFileReader = global.FileReader;

  afterEach(() => {
    global.FileReader = OriginalFileReader;
  });

  it("rejects non-PDF files", async () => {
    const file = new File(["hello"], "resume.txt", { type: "text/plain" });

    await expect(extractPdfBase64(file)).rejects.toThrow("File must be a PDF");
  });

  it("extracts base64 content from a PDF", async () => {
    class SuccessfulReader {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      result = "data:application/pdf;base64,ZmFrZS1wZGY=";

      readAsDataURL() {
        this.onload?.();
      }
    }

    global.FileReader = SuccessfulReader as unknown as typeof FileReader;

    const file = new File(["pdf"], "resume.pdf", { type: "application/pdf" });

    await expect(extractPdfBase64(file)).resolves.toBe("ZmFrZS1wZGY=");
  });

  it("rejects when the data URL does not contain base64 payload", async () => {
    class EmptyReader {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      result = "data:application/pdf;base64";

      readAsDataURL() {
        this.onload?.();
      }
    }

    global.FileReader = EmptyReader as unknown as typeof FileReader;

    const file = new File(["pdf"], "resume.pdf", { type: "application/pdf" });

    await expect(extractPdfBase64(file)).rejects.toThrow("Failed to extract base64 from file");
  });

  it("rejects when the reader errors", async () => {
    class ErrorReader {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      result = null;

      readAsDataURL() {
        this.onerror?.();
      }
    }

    global.FileReader = ErrorReader as unknown as typeof FileReader;

    const file = new File(["pdf"], "resume.pdf", { type: "application/pdf" });

    await expect(extractPdfBase64(file)).rejects.toThrow("Failed to read file");
  });
});
