import { getAnthropic } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import { validateAndConsumeToken } from '@/lib/tokens';
import type { CoverLetterRequest, CoverLetterResponse } from '@/lib/types';

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

  let body: Partial<CoverLetterRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { resumeData, matchResult, jobDescription } = body;

  if (!resumeData || !matchResult || !jobDescription) {
    return NextResponse.json(
      { error: 'resumeData, matchResult, and jobDescription are required' },
      { status: 400 }
    );
  }

  let coverLetterMessage;
  try {
    coverLetterMessage = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are a developer career coach writing a cover letter for a software developer. Write a compelling, professional cover letter that:

1. Highlights the candidate's matched skills and directly relevant experience
2. Proactively addresses 1-2 of the learnable gaps with a positive framing strategy (shows awareness and growth trajectory)
3. Mirrors the tone and language of the job description
4. Sounds like a real developer wrote it — confident but not arrogant, specific not generic
5. Is structured with clear paragraphs: opening hook, why they're a fit, addressing gaps, why they're excited about this specific company

Do NOT use clichés like "passionate about technology" or "team player." Be specific to THIS candidate and THIS role.

Resume data:
${JSON.stringify(resumeData, null, 2)}

Match analysis:
${JSON.stringify(matchResult, null, 2)}

Job description:
${jobDescription}

Return the cover letter as plain text (not markdown, no JSON wrapping). Use **bold** for emphasis where appropriate. Address it to "Dear Hiring Team at [Company]" — extract the company name from the JD.`,
        },
      ],
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && (error.status === 401 || error.status === 403)) {
      return NextResponse.json({ error: 'Invalid Anthropic API key' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Claude API error during cover letter generation' },
      { status: 500 }
    );
  }

  const coverLetter =
    coverLetterMessage.content[0].type === 'text'
      ? coverLetterMessage.content[0].text
      : '';

  const response: CoverLetterResponse = { coverLetter };
  return NextResponse.json(response);
}
