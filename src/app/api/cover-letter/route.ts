import { getAnthropic } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import { validateAndConsumeToken } from '@/lib/tokens';
import type { CoverLetterRequest } from '@/lib/types';

export const maxDuration = 60;

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

  const { resumeData, matchResult, jobDescription, githubProfile, linkedinProfile } = body;

  if (!resumeData || !matchResult || !jobDescription) {
    return NextResponse.json(
      { error: 'resumeData, matchResult, and jobDescription are required' },
      { status: 400 }
    );
  }

  const dealbreakers = matchResult.missingSkills?.filter((s) => s.severity === 'dealbreaker') ?? [];
  if (dealbreakers.length > 0) {
    return NextResponse.json(
      {
        error: 'Cover letter blocked: role has dealbreaker gaps',
        dealbreakers: dealbreakers.map((d) => d.skill),
      },
      { status: 422 }
    );
  }

  let stream;
  try {
    stream = getAnthropic().messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system:
        'You are an elite cover letter writer for software engineers. Your job is to help the candidate win interviews with writing that is specific, credible, and persuasive. Never invent facts, company knowledge, projects, metrics, or tools. Use the strongest truthful evidence available and avoid generic filler.',
      messages: [
        {
          role: 'user',
          content: `Write a compelling cover letter for a software engineering candidate that is optimized for both recruiter readability and ATS alignment.

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

${githubProfile ? `GitHub profile evidence:
${JSON.stringify(githubProfile, null, 2)}

` : ''}${linkedinProfile ? `LinkedIn profile:
${JSON.stringify(linkedinProfile, null, 2)}

` : ''}Job description:
${jobDescription}

DEALBREAKER GUARD (evaluate first, before writing anything):
- If the match analysis contains ANY dealbreaker gaps, do NOT write a cover letter.
  Instead, write 2-3 short paragraphs in plain text: explain why this role is not a viable target given the specific dealbreakers, then suggest 2-3 role types where the candidate's actual profile is genuinely competitive. Be direct and honest — this is more useful than a cover letter that won't land.

Additional rules (only apply if no dealbreakers):
- HARD LIMIT: 300 words maximum. Count your words before responding. Stop writing before you reach 300 words. Do not pad with closings or filler to reach a minimum.
- Use concrete evidence from the resume and GitHub profile when available.
- Do not claim the candidate already has a missing skill; frame learnable gaps as ramp-up strengths or active next steps.
- Avoid bullet lists and section headers; this should read like a natural letter.
- If the company name cannot be confidently determined from the JD, use "Dear Hiring Team".
- Close with a direct, credible value proposition.

Return the cover letter as plain text (not JSON and no code fences). Use **bold** sparingly for emphasis where appropriate.`,
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

  const encoder = new TextEncoder();
  const body2 = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body2, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
