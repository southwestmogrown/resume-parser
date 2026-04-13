import { getAnthropic } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import { checkStarPrepAccess } from '@/lib/tokens';
import type { OptimizedResumeRequest } from '@/lib/types';
import { isStringWithinLimit, MAX_JOB_DESCRIPTION_CHARS } from '@/lib/requestValidation';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-analysis-token');
  if (!token) {
    return NextResponse.json({ error: 'Payment required' }, { status: 402 });
  }

  const access = await checkStarPrepAccess(token);
  if (access === 'deny') {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
  if (access === 'consume') {
    // Star prep hasn't been activated yet — optimized resume requires it
    return NextResponse.json(
      { error: 'Complete STAR prep first to unlock your optimized resume' },
      { status: 403 }
    );
  }
  // access === 'allow': star prep already paid for, proceed at no extra cost

  let body: Partial<OptimizedResumeRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { resumeData, rewriteSuggestions, starAnswers, matchResult, jobDescription } = body;

  if (
    !resumeData ||
    !rewriteSuggestions ||
    !starAnswers ||
    !matchResult ||
    !isStringWithinLimit(jobDescription, MAX_JOB_DESCRIPTION_CHARS)
  ) {
    return NextResponse.json(
      {
        error:
          'resumeData, rewriteSuggestions, starAnswers, matchResult, and jobDescription are required',
      },
      { status: 400 }
    );
  }

  const rewriteBlock =
    rewriteSuggestions.length > 0
      ? rewriteSuggestions
          .map((s) => `Role: ${s.originalRole}\nOptimized bullet: ${s.rewrittenBullet}`)
          .join('\n\n')
      : 'No bullet rewrites available.';

  const starBlock =
    starAnswers.length > 0
      ? starAnswers
          .map(
            (a) =>
              `Q: ${a.question}\nS: ${a.situation}\nT: ${a.task}\nA: ${a.action}\nR: ${a.result}`
          )
          .join('\n\n')
      : 'No STAR answers available.';

  const matchedSkillsStr = matchResult.matchedSkills.slice(0, 10).join(', ');
  const learnableGaps = matchResult.missingSkills
    .filter((s) => s.severity !== 'dealbreaker')
    .map((s) => s.skill)
    .join(', ');

  let stream;
  try {
    stream = getAnthropic().messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system:
        'You are an expert resume writer for software engineers. Your job is to produce clean, ATS-optimized resumes in markdown that make candidates stand out. Never invent facts, metrics, or technologies. Every claim must be traceable to the source material provided.',
      messages: [
        {
          role: 'user',
          content: `Produce a complete, polished resume in markdown for the candidate below. Synthesize all provided sources into a cohesive document ready to send to a recruiter.

## Source material

### Candidate resume (original)
${JSON.stringify(resumeData, null, 2)}

### Optimized experience bullets
${rewriteBlock}

### STAR coaching answers (use the strongest outcomes in the resume)
${starBlock}

### Gap analysis
Matched skills: ${matchedSkillsStr}
Learnable gaps to acknowledge growth toward (if evidence exists): ${learnableGaps || 'none'}

### Target job description
${jobDescription}

## Output rules
1. Return ONLY the resume in markdown. No preamble, no explanation, no code fences.
2. Structure:
   - **Name** as a top-level heading
   - Contact line: email placeholder | GitHub | LinkedIn (use "[email]", "[github]", "[linkedin]" if not in source)
   - **Summary** — 2-3 sentences. Lead with the strongest STAR result and the candidate's value proposition for THIS specific role. Mirror the JD's key terminology.
   - **Skills** — single comma-separated line, front-loaded with JD-matched skills, then others.
   - **Experience** section — for each role: use the optimized bullet as the main description; weave in the single strongest STAR result (one additional bullet). Keep the role to 2-3 bullets max.
   - **Education** — unchanged from source.
3. Do NOT invent: companies, degrees, dates, metrics, or technologies not in the source.
4. Do NOT include a cover letter, notes, or any text outside the resume itself.
5. Keep the full document under 600 words.`,
        },
      ],
    });
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      (error.status === 401 || error.status === 403)
    ) {
      return NextResponse.json({ error: 'Invalid Anthropic API key' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Claude API error during resume generation' },
      { status: 500 }
    );
  }

  const encoder = new TextEncoder();
  const responseBody = new ReadableStream({
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

  return new Response(responseBody, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
