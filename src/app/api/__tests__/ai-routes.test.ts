/** @jest-environment node */

import { NextRequest } from "next/server";
import { POST as postCoverLetter } from "@/app/api/cover-letter/route";
import { POST as postExtract } from "@/app/api/extract/route";
import { POST as postRewrite } from "@/app/api/rewrite/route";
import { POST as postScore } from "@/app/api/score/route";
import { POST as postStudyPlan } from "@/app/api/study-plan/route";
import { clearRateLimitStore } from "@/lib/rateLimit";
import { sampleGitHubProfile, sampleMatchResult, sampleResumeData, sampleStudyItems } from "@/test-utils/fixtures";

const mockCreateMessage = jest.fn();
const mockStreamMessage = jest.fn();
const mockValidateAndConsumeToken = jest.fn();

jest.mock("@/lib/anthropic", () => ({
  getAnthropic: () => ({
    messages: {
      create: (...args: unknown[]) => mockCreateMessage(...args),
      stream: (...args: unknown[]) => mockStreamMessage(...args),
    },
  }),
}));

jest.mock("@/lib/tokens", () => ({
  validateAndConsumeToken: (...args: unknown[]) => mockValidateAndConsumeToken(...args),
}));

const jsonRequest = (body: string | object, headers?: Record<string, string>) =>
  new NextRequest("http://localhost/api/test", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });

const textMessage = (text: string) => ({
  content: [{ type: "text", text }],
});

const coverLetterReadyMatchResult = {
  ...sampleMatchResult,
  missingSkills: sampleMatchResult.missingSkills.filter((skill) => skill.severity !== "dealbreaker"),
};

async function* streamChunks(...chunks: string[]) {
  for (const chunk of chunks) {
    yield {
      type: "content_block_delta",
      delta: { type: "text_delta", text: chunk },
    };
  }
}

describe("AI-backed API routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRateLimitStore();
    mockValidateAndConsumeToken.mockResolvedValue(true);
  });

  describe("extract route", () => {
    it("validates the request body", async () => {
      const invalidJson = await postExtract(jsonRequest("{"));
      const missingResume = await postExtract(jsonRequest({}));

      expect(invalidJson.status).toBe(400);
      await expect(invalidJson.json()).resolves.toEqual({ error: "Invalid JSON body" });
      expect(missingResume.status).toBe(400);
      await expect(missingResume.json()).resolves.toEqual({ error: "resume is required" });
    });

    it("handles Anthropic auth and parse failures", async () => {
      mockCreateMessage.mockRejectedValueOnce({ status: 401 });
      let response = await postExtract(jsonRequest({ resume: "pdf" }));
      expect(response.status).toBe(401);

      mockCreateMessage.mockResolvedValueOnce(textMessage("not json"));
      response = await postExtract(jsonRequest({ resume: "pdf" }));
      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({ error: "Failed to parse resume extraction response" });
    });

    it("returns extracted resume data", async () => {
      mockCreateMessage.mockResolvedValueOnce(
        textMessage(`\`\`\`json\n${JSON.stringify(sampleResumeData)}\n\`\`\``)
      );

      const response = await postExtract(jsonRequest({ resume: "pdf" }));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ resumeData: sampleResumeData });
    });
  });

  describe("score route", () => {
    it("validates input and handles Anthropic failures", async () => {
      let response = await postScore(jsonRequest("{"));
      expect(response.status).toBe(400);

      response = await postScore(jsonRequest({ resumeData: sampleResumeData }));
      expect(response.status).toBe(400);

      mockCreateMessage.mockRejectedValueOnce({ status: 403 });
      response = await postScore(jsonRequest({ resumeData: sampleResumeData, jobDescription: "JD" }));
      expect(response.status).toBe(401);

      mockCreateMessage.mockRejectedValueOnce(new Error("boom"));
      response = await postScore(jsonRequest({ resumeData: sampleResumeData, jobDescription: "JD" }));
      expect(response.status).toBe(500);
    });

    it("returns a match result and handles parse failures", async () => {
      mockCreateMessage.mockResolvedValueOnce(textMessage("not json"));
      let response = await postScore(jsonRequest({ resumeData: sampleResumeData, jobDescription: "JD" }));
      expect(response.status).toBe(500);

      mockCreateMessage.mockResolvedValueOnce(textMessage(JSON.stringify(sampleMatchResult)));
      response = await postScore(
        jsonRequest({ resumeData: sampleResumeData, jobDescription: "JD", githubProfile: sampleGitHubProfile })
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ matchResult: sampleMatchResult });
    });
  });

  describe("rewrite route", () => {
    it("covers auth, validation, and parse failures", async () => {
      let response = await postRewrite(jsonRequest({}));
      expect(response.status).toBe(402);

      mockValidateAndConsumeToken.mockResolvedValueOnce(false);
      response = await postRewrite(jsonRequest({}, { "x-analysis-token": "bad" }));
      expect(response.status).toBe(401);

      response = await postRewrite(jsonRequest("{", { "x-analysis-token": "good" }));
      expect(response.status).toBe(400);

      response = await postRewrite(
        jsonRequest({ resumeData: sampleResumeData }, { "x-analysis-token": "good" })
      );
      expect(response.status).toBe(400);

      mockCreateMessage.mockResolvedValueOnce(textMessage("not json"));
      response = await postRewrite(
        jsonRequest(
          { resumeData: sampleResumeData, jobDescription: "JD" },
          { "x-analysis-token": "good" }
        )
      );
      expect(response.status).toBe(500);
    });

    it("returns rewrite suggestions and auth errors", async () => {
      mockCreateMessage.mockRejectedValueOnce({ status: 401 });
      let response = await postRewrite(
        jsonRequest(
          { resumeData: sampleResumeData, jobDescription: "JD" },
          { "x-analysis-token": "good" }
        )
      );
      expect(response.status).toBe(401);

      mockCreateMessage.mockResolvedValueOnce(textMessage(JSON.stringify([{ originalRole: "Role", originalBullet: "Old", rewrittenBullet: "New", rationale: "Why" }])));
      response = await postRewrite(
        jsonRequest(
          { resumeData: sampleResumeData, jobDescription: "JD" },
          { "x-analysis-token": "good" }
        )
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        suggestions: [{ originalRole: "Role", originalBullet: "Old", rewrittenBullet: "New", rationale: "Why" }],
      });
    });
  });

  describe("study plan route", () => {
    it("enforces auth and validates input", async () => {
      let response = await postStudyPlan(jsonRequest({}));
      expect(response.status).toBe(402);

      mockValidateAndConsumeToken.mockResolvedValueOnce(false);
      response = await postStudyPlan(jsonRequest({}, { "x-analysis-token": "bad" }));
      expect(response.status).toBe(401);

      response = await postStudyPlan(jsonRequest("{", { "x-analysis-token": "good" }));
      expect(response.status).toBe(400);

      response = await postStudyPlan(
        jsonRequest({ matchResult: sampleMatchResult }, { "x-analysis-token": "good" })
      );
      expect(response.status).toBe(400);
    });

    it("returns early when there are no actionable gaps", async () => {
      const response = await postStudyPlan(
        jsonRequest(
          {
            matchResult: { ...sampleMatchResult, missingSkills: [{ skill: "Years", severity: "dealbreaker", reason: "Nope" }] },
            resumeData: sampleResumeData,
          },
          { "x-analysis-token": "good" }
        )
      );

      expect(mockCreateMessage).not.toHaveBeenCalled();
      await expect(response.json()).resolves.toEqual({ items: [] });
    });

    it("handles Anthropic failures and returns study items", async () => {
      mockCreateMessage.mockRejectedValueOnce({ status: 401 });
      let response = await postStudyPlan(
        jsonRequest(
          { matchResult: sampleMatchResult, resumeData: sampleResumeData },
          { "x-analysis-token": "good" }
        )
      );
      expect(response.status).toBe(401);

      mockCreateMessage.mockResolvedValueOnce(textMessage("not json"));
      response = await postStudyPlan(
        jsonRequest(
          { matchResult: sampleMatchResult, resumeData: sampleResumeData },
          { "x-analysis-token": "good" }
        )
      );
      expect(response.status).toBe(500);

      mockCreateMessage.mockResolvedValueOnce(textMessage(JSON.stringify(sampleStudyItems)));
      response = await postStudyPlan(
        jsonRequest(
          { matchResult: sampleMatchResult, resumeData: sampleResumeData },
          { "x-analysis-token": "good" }
        )
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ items: sampleStudyItems });
    });
  });

  describe("cover letter route", () => {
    it("enforces auth and validates body", async () => {
      let response = await postCoverLetter(jsonRequest({}));
      expect(response.status).toBe(402);

      mockValidateAndConsumeToken.mockResolvedValueOnce(false);
      response = await postCoverLetter(jsonRequest({}, { "x-analysis-token": "bad" }));
      expect(response.status).toBe(401);

      response = await postCoverLetter(jsonRequest("{", { "x-analysis-token": "good" }));
      expect(response.status).toBe(400);

      response = await postCoverLetter(
        jsonRequest({ resumeData: sampleResumeData }, { "x-analysis-token": "good" })
      );
      expect(response.status).toBe(400);
    });

    it("blocks cover letters for dealbreaker roles", async () => {
      const response = await postCoverLetter(
        jsonRequest(
          { resumeData: sampleResumeData, matchResult: sampleMatchResult, jobDescription: "JD" },
          { "x-analysis-token": "good" }
        )
      );
      expect(response.status).toBe(422);
      await expect(response.json()).resolves.toEqual({
        error: "Cover letter blocked: role has dealbreaker gaps",
        dealbreakers: ["5+ years experience"],
      });
    });

    it("handles Anthropic failures and streams the cover letter", async () => {
      mockStreamMessage.mockImplementationOnce(() => {
        throw { status: 403 };
      });
      let response = await postCoverLetter(
        jsonRequest(
          { resumeData: sampleResumeData, matchResult: coverLetterReadyMatchResult, jobDescription: "JD" },
          { "x-analysis-token": "good" }
        )
      );
      expect(response.status).toBe(401);

      mockStreamMessage.mockImplementationOnce(() => {
        throw new Error("boom");
      });
      response = await postCoverLetter(
        jsonRequest(
          { resumeData: sampleResumeData, matchResult: coverLetterReadyMatchResult, jobDescription: "JD" },
          { "x-analysis-token": "good" }
        )
      );
      expect(response.status).toBe(500);

      mockStreamMessage.mockReturnValueOnce(streamChunks());
      response = await postCoverLetter(
        jsonRequest(
          { resumeData: sampleResumeData, matchResult: coverLetterReadyMatchResult, jobDescription: "JD" },
          { "x-analysis-token": "good" }
        )
      );
      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toBe("");

      mockStreamMessage.mockReturnValueOnce(streamChunks("Dear ", "Hiring Team"));
      response = await postCoverLetter(
        jsonRequest(
          {
            resumeData: sampleResumeData,
            matchResult: coverLetterReadyMatchResult,
            jobDescription: "JD",
            githubProfile: sampleGitHubProfile,
          },
          { "x-analysis-token": "good" }
        )
      );
      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toBe("Dear Hiring Team");
    });
  });
});
