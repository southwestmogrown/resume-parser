import { getAnthropic } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import type { StarQuestion, ResumeData, MatchResult } from '@/lib/types';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: { resumeData?: ResumeData; matchResult?: MatchResult; jobDescription?: string };
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

  const topGaps = matchResult.missingSkills
    .filter((s) => s.severity !== 'dealbreaker')
    .slice(0, 3)
    .map((s) => `${s.skill} (${s.severity}): ${s.reason}`)
    .join('\n');

  const matchedTop = matchResult.matchedSkills.slice(0, 5).join(', ');

  let aiMessage;
  try {
    aiMessage = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: 'You are a technical interview strategist.',
      messages: [
        {
          role: 'user',
          content: `Generate 4-5 behavioral interview questions for a software engineering candidate based on their match analysis.

Candidate: ${resumeData.name}
Matched strengths: ${matchedTop}
Learnable gaps:
${topGaps || 'None'}

Job description (first 1500 chars):
${jobDescription.slice(0, 1500)}

Rules:
- 2-3 questions targeting their matched strengths (where they'll shine)
- 1-2 questions targeting learnable gaps (where they need a bridging story)
- No questions targeting dealbreaker gaps (can't be coached around)
- Each question must be specific to this role and this candidate's background
- Use the STAR format target: Situation, Task, Action, Result

Return JSON array only. First character must be [

[{ "id": "sq_1", "question": "...", "targetSkill": "...", "difficulty": "standard" }]`,
        },
      ],
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && (error.status === 401 || error.status === 403)) {
      return NextResponse.json({ error: 'Invalid Anthropic API key' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Claude API error during question generation' }, { status: 500 });
  }

  const content =
    aiMessage.content[0].type === 'text' ? aiMessage.content[0].text : '';

  let questions: StarQuestion[];
  try {
    const cleaned = content
      .trim()
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
    questions = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: 'Failed to parse question generation response' }, { status: 500 });
  }

  return NextResponse.json({ questions });
}
