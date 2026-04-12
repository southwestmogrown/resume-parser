import { getAnthropic } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import { validateAndConsumeToken } from '@/lib/tokens';
import type { ScoreRequest, ScoreResponse, MatchResult } from '@/lib/types';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-analysis-token');
  if (!token) {
    return NextResponse.json({ error: 'Payment required' }, { status: 402 });
  }
  const valid = await validateAndConsumeToken(token);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  let body: Partial<ScoreRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { resumeData, jobDescription } = body;

  if (!resumeData || !jobDescription) {
    return NextResponse.json(
      { error: 'resumeData and jobDescription are required' },
      { status: 400 }
    );
  }

  let scoringMessage;
  try {
    scoringMessage = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are a developer career advisor evaluating how well a candidate matches a job description. Think from the CANDIDATE's perspective — help them decide whether to apply and how to position themselves.

Resume data:
${JSON.stringify(resumeData, null, 2)}

Job description:
${jobDescription}

For each missing skill or requirement, classify its severity:
- "dealbreaker": Hard requirements the candidate fundamentally lacks and cannot quickly address (e.g., years of experience gaps, required certifications, security clearances, domain expertise that takes years to build)
- "learnable": Skills the candidate could realistically pick up in weeks to a few months of focused study (e.g., a specific framework, tool, or cloud service)
- "soft": Nice-to-have items the candidate is missing, OR requirements where they have adjacent/transferable experience that partially covers the gap

Return a JSON object only, with no additional text or markdown:
{
  "score": <integer 0-100>,
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": [
    { "skill": "skill name", "severity": "dealbreaker" | "learnable" | "soft", "reason": "brief explanation" }
  ],
  "recommendation": "2-3 sentence recommendation from the candidate's perspective — should they apply? What should they emphasize? What's the honest assessment?"
}`,
        },
      ],
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && (error.status === 401 || error.status === 403)) {
      return NextResponse.json({ error: 'Invalid Anthropic API key' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Claude API error during scoring' },
      { status: 500 }
    );
  }

  const scoringText =
    scoringMessage.content[0].type === 'text'
      ? scoringMessage.content[0].text
      : '';

  let matchResult: MatchResult;
  try {
    const cleaned = scoringText
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
    matchResult = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse scoring response' },
      { status: 500 }
    );
  }

  const response: ScoreResponse = { matchResult };
  return NextResponse.json(response);
}
