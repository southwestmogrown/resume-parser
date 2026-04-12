import { getAnthropic } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import { validateAndConsumeToken } from '@/lib/tokens';
import type { RewriteRequest, RewriteResponse, RewriteSuggestion } from '@/lib/types';

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

  let body: Partial<RewriteRequest>;
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

  let rewriteMessage;
  try {
    rewriteMessage = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are a developer career coach. For each experience entry on this resume, suggest a rewritten bullet point that reframes the existing experience to better align with the target job description. Use the JD's language and priorities. Do NOT invent experience — only reframe what's actually there.

Resume data:
${JSON.stringify(resumeData, null, 2)}

Job description:
${jobDescription}

Return a JSON array only, with no additional text or markdown. One entry per experience item:
[
  {
    "originalRole": "Job Title @ Company",
    "originalBullet": "the original description text",
    "rewrittenBullet": "the reframed description that better aligns with the JD",
    "rationale": "1 sentence explaining why this rewrite helps the candidate"
  }
]`,
        },
      ],
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && (error.status === 401 || error.status === 403)) {
      return NextResponse.json({ error: 'Invalid Anthropic API key' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Claude API error during rewrite generation' },
      { status: 500 }
    );
  }

  const rewriteText =
    rewriteMessage.content[0].type === 'text'
      ? rewriteMessage.content[0].text
      : '';

  let suggestions: RewriteSuggestion[];
  try {
    const cleaned = rewriteText
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
    suggestions = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse rewrite response' },
      { status: 500 }
    );
  }

  const response: RewriteResponse = { suggestions };
  return NextResponse.json(response);
}
