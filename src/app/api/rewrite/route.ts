import { getAnthropic } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import { validateAndConsumeToken } from '@/lib/tokens';
import type { RewriteRequest, RewriteResponse, RewriteSuggestion, GitHubProfile, LinkedInProfile } from '@/lib/types';
import { parseModelJson } from '@/lib/parseModelJson';
import { isStringWithinLimit, MAX_JOB_DESCRIPTION_CHARS } from '@/lib/requestValidation';

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
  const githubProfile = (body as { githubProfile?: GitHubProfile }).githubProfile ?? null;
  const linkedinProfile = (body as { linkedinProfile?: LinkedInProfile }).linkedinProfile ?? null;

  if (!resumeData || !isStringWithinLimit(jobDescription, MAX_JOB_DESCRIPTION_CHARS)) {
    return NextResponse.json(
      { error: 'resumeData and jobDescription are required' },
      { status: 400 }
    );
  }

  let rewriteMessage;
  try {
    rewriteMessage = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system:
        'You are a precise resume writer for software engineers. Produce ATS-friendly rewrites that improve positioning without inventing facts. Never add technologies, metrics, scope, ownership, or achievements that are not supported by the source material.',
      messages: [
        {
          role: 'user',
          content: `For each experience entry on this resume, produce one stronger rewritten bullet that better aligns with the target job description.

Resume data:
${JSON.stringify(resumeData, null, 2)}

${githubProfile ? `GitHub profile evidence:
${JSON.stringify(githubProfile, null, 2)}

` : ''}${linkedinProfile ? `LinkedIn profile context:
${JSON.stringify(linkedinProfile, null, 2)}

` : ''}Job description:
${jobDescription}

Rules:
- Return a JSON array only, with no additional text or markdown.
- Keep every rewrite strictly truthful to the original role.
- Mirror the JD's terminology and priorities when the candidate has real supporting evidence.
- Emphasize concrete outcomes, scope, systems, stakeholders, and technical depth already present in the source material.
- Use strong action verbs and ATS-relevant keywords, but avoid keyword stuffing.
- Keep each "rewrittenBullet" to 1-2 sentences and make it sound like polished resume language, not AI advice.
- If the original bullet lacks metrics, do not invent them.
- "rationale" should briefly explain the positioning improvement.

One entry per experience item:
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
    suggestions = parseModelJson<RewriteSuggestion[]>(rewriteText);
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse rewrite response' },
      { status: 500 }
    );
  }

  const response: RewriteResponse = { suggestions };
  return NextResponse.json(response);
}
