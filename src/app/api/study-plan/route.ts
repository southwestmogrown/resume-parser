import { anthropic } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import { validateAndConsumeToken } from '@/lib/tokens';
import type { StudyPlanRequest, StudyPlanResponse, StudyItem } from '@/lib/types';

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

  let body: Partial<StudyPlanRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { matchResult, resumeData } = body;

  if (!matchResult || !resumeData) {
    return NextResponse.json(
      { error: 'matchResult and resumeData are required' },
      { status: 400 }
    );
  }

  // Only generate study items for learnable and soft gaps
  const actionableGaps = matchResult.missingSkills.filter(
    (g) => g.severity === 'learnable' || g.severity === 'soft'
  );

  if (actionableGaps.length === 0) {
    const response: StudyPlanResponse = { items: [] };
    return NextResponse.json(response);
  }

  let studyMessage;
  try {
    studyMessage = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are a developer career coach creating a concrete study plan. For each skill gap, provide an actionable recommendation with a specific resource. The candidate is a developer — recommend developer-appropriate resources (official docs, GitHub repos, hands-on tutorials), not generic online courses.

Candidate background:
${JSON.stringify(resumeData, null, 2)}

Skill gaps to address:
${JSON.stringify(actionableGaps, null, 2)}

For each gap, suggest a concrete action that:
1. Leverages what the candidate already knows (build on existing skills)
2. Results in something portfolio-worthy they can reference in interviews
3. Can be completed in a reasonable timeframe (days to weeks, not months)

Return a JSON array only, with no additional text or markdown:
[
  {
    "skill": "skill name",
    "severity": "learnable" or "soft",
    "action": "1-2 sentence concrete recommendation that builds on their existing experience",
    "resource": "specific resource name and URL or description"
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
      { error: 'Claude API error during study plan generation' },
      { status: 500 }
    );
  }

  const studyText =
    studyMessage.content[0].type === 'text'
      ? studyMessage.content[0].text
      : '';

  let items: StudyItem[];
  try {
    const cleaned = studyText
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
    items = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse study plan response' },
      { status: 500 }
    );
  }

  const response: StudyPlanResponse = { items };
  return NextResponse.json(response);
}
