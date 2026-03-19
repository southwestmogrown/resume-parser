import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { ScoreRequest, ScoreResponse, MatchResult } from "@/lib/types";

export const maxDuration = 9;

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Anthropic API key required" }, { status: 401 });
  }

  const client = new Anthropic({ apiKey });

  let body: Partial<ScoreRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { resumeData, jobDescription } = body;

  if (!resumeData || !jobDescription) {
    return NextResponse.json(
      { error: "resumeData and jobDescription are required" },
      { status: 400 }
    );
  }

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
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && (error.status === 401 || error.status === 403)) {
      return NextResponse.json({ error: "Invalid Anthropic API key" }, { status: 401 });
    }
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
    const cleaned = scoringText
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
    matchResult = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse scoring response" },
      { status: 500 }
    );
  }

  const response: ScoreResponse = { matchResult };
  return NextResponse.json(response);
}
