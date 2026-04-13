import { getAnthropic } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import { validateAndConsumeToken } from '@/lib/tokens';
import type { StudyPlanRequest, StudyPlanResponse, StudyItem, LinkedInProfile } from '@/lib/types';
import { parseModelJson } from '@/lib/parseModelJson';

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
  const linkedinProfile = (body as { linkedinProfile?: LinkedInProfile }).linkedinProfile ?? null;

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
    studyMessage = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system:
        'You are a practical career strategist for software engineers. Build study plans that close hiring gaps fast through practical, portfolio-worthy work. Be specific, current, and realistic. Do not recommend vague self-study, generic MOOCs, or long multi-month programs when a tighter project-based path would work better.',
      messages: [
        {
          role: 'user',
          content: `Create a concrete study plan for this software engineering candidate. For each skill gap, provide an actionable recommendation with a specific resource. Recommend developer-appropriate resources such as official docs, GitHub repos, credible tutorials, sample projects, or focused references.

Candidate background:
${JSON.stringify(resumeData, null, 2)}

${linkedinProfile ? `LinkedIn profile context:
${JSON.stringify(linkedinProfile, null, 2)}

` : ''}Skill gaps to address:
${JSON.stringify(actionableGaps, null, 2)}

For each gap, suggest a concrete action that:
1. Leverages what the candidate already knows and explicitly builds on adjacent experience
2. Produces something portfolio-worthy, demo-worthy, or interview-worthy
3. Can be completed in a reasonable timeframe (hours, days, or a couple of weekends — not months)
4. Improves both real skill and ATS/interview positioning

Additional rules:
- Prioritize the highest-leverage path for each gap.
- Make each action concrete enough that the candidate could start immediately.
- Favor official/current resources over generic courses.
- Keep "action" to 1-2 crisp sentences with a clear deliverable.

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
    items = parseModelJson<StudyItem[]>(studyText);
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse study plan response' },
      { status: 500 }
    );
  }

  const response: StudyPlanResponse = { items };
  return NextResponse.json(response);
}
