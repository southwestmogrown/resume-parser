import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { AnalysisRequest, AnalysisResponse, ResumeData, MatchResult } from "@/lib/types";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  // Validate access key
  const accessKey = req.headers.get("x-access-key");
  if (!accessKey || accessKey !== process.env.ACCESS_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Partial<AnalysisRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { resume, jobDescription } = body;

  if (!resume || !jobDescription) {
    return NextResponse.json(
      { error: "resume and jobDescription are required" },
      { status: 400 }
    );
  }

  // Phase 1: Extract resume data
  let extractionMessage;
  try {
    extractionMessage = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: resume,
            },
          },
          {
            type: "text",
            text: `Extract the following information from this resume and return it as valid JSON only, with no additional text or markdown:
{
  "name": "full name",
  "summary": "brief professional summary or objective (1-2 sentences)",
  "skills": ["skill1", "skill2"],
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "startDate": "Mon YYYY",
      "endDate": "Mon YYYY or null if current",
      "description": "brief description of responsibilities"
    }
  ],
  "education": [
    {
      "degree": "degree name",
      "institution": "institution name",
      "graduationYear": "YYYY"
    }
  ]
}`,
          },
        ],
      },
    ],
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Claude API error during extraction" },
      { status: 500 }
    );
  }

  const extractionText =
    extractionMessage.content[0].type === "text"
      ? extractionMessage.content[0].text
      : "";

  let resumeData: ResumeData;
  try {
    const cleanedExtraction = extractionText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    resumeData = JSON.parse(cleanedExtraction);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse resume extraction response" },
      { status: 500 }
    );
  }

  // Phase 2: Score match against job description
  let scoringMessage;
  try {
    scoringMessage = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are evaluating how well a candidate matches a job description.

Resume data:
${JSON.stringify(resumeData, null, 2)}

Job description:
${jobDescription}

Return a JSON object only, with no additional text or markdown:
{
  "score": <integer 0-100>,
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill1", "skill2"],
  "recommendation": "2-3 sentence recommendation about this candidate's fit"
}`,
      },
    ],
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Claude API error during scoring" },
      { status: 500 }
    );
  }

  const scoringText =
    scoringMessage.content[0].type === "text"
      ? scoringMessage.content[0].text
      : "";

  let matchResult: MatchResult;
  try {
    const cleanedScoring = scoringText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    matchResult = JSON.parse(cleanedScoring);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse scoring response" },
      { status: 500 }
    );
  }

  const response: AnalysisResponse = { resumeData, matchResult };
  return NextResponse.json(response);
}
