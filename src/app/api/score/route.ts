import { getAnthropic } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import type { ScoreRequest, ScoreResponse, MatchResult } from '@/lib/types';
import { parseModelJson } from '@/lib/parseModelJson';
import { isRateLimited } from '@/lib/rateLimit';
import { isStringWithinLimit, MAX_JOB_DESCRIPTION_CHARS } from '@/lib/requestValidation';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (isRateLimited(req.headers, 'score', 10, 60_000)) {
    return NextResponse.json({ error: 'Too many scoring requests. Please wait a minute and try again.' }, { status: 429 });
  }

  let body: Partial<ScoreRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { resumeData, jobDescription, githubProfile, linkedinProfile } = body;

  if (!resumeData || !isStringWithinLimit(jobDescription, MAX_JOB_DESCRIPTION_CHARS)) {
    return NextResponse.json(
      { error: 'resumeData and jobDescription are required' },
      { status: 400 }
    );
  }

  let scoringMessage;
  try {
    scoringMessage = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system:
        "You are a precise software-engineering resume strategist. Maximize the candidate's chance of getting interviews while staying 100% truthful. Optimize for ATS alignment, recruiter clarity, and actionable guidance. Never invent evidence, never treat equivalent experience as a gap when the match is credible, and never overrate a weak fit just to sound positive.",
      messages: [
        {
          role: 'user',
          content: `Evaluate how well this candidate matches the job description from the candidate's perspective.

Resume data:
${JSON.stringify(resumeData, null, 2)}

${githubProfile ? `GitHub profile evidence:
${JSON.stringify(githubProfile, null, 2)}

` : ''}${linkedinProfile ? `LinkedIn profile:
${JSON.stringify(linkedinProfile, null, 2)}

` : ''}Job description:
${jobDescription}

Instructions:
- Mentally separate true must-haves from nice-to-haves before scoring.
- Give credit for adjacent, equivalent, or clearly transferable experience when the evidence is strong.
- Use GitHub evidence only when it meaningfully strengthens or clarifies the candidate's fit.
- "matchedSkills" should reflect requirements or keywords from the JD that the candidate genuinely satisfies, not a generic dump of resume skills.
- "missingSkills" should contain only real gaps that matter to hiring outcomes. Deduplicate overlapping gaps.
- For each missing skill, explain the severity in concrete hiring terms.
- Score calibration:
  - 90-100: exceptional fit with only minor gaps
  - 75-89: strong fit, likely worth an interview
  - 60-74: plausible stretch if positioned well
  - 40-59: uphill battle with multiple material gaps
  - 0-39: poor fit for this role as written

Classify each missing skill or requirement as:
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
  "recommendation": "Must begin with exactly one of: STRONG_FIT | GOOD_FIT | STRETCH | DO_NOT_APPLY — then an em dash, then 2-3 sentences of plain-text reasoning from the candidate's perspective covering whether to apply, what to emphasize, and the honest interview outlook. Use DO_NOT_APPLY when dealbreaker gaps make this role unrealistic without years of additional experience or credentials the candidate does not have.",
  "jobPostingFlags": [
    { "flag": "short label", "severity": "warning" | "suspicious", "detail": "brief explanation" }
  ]
}

For "jobPostingFlags", scan the job description for signals that the posting may be inauthentic, misleading, or a waste of the candidate's time:
- "warning": Mildly concerning but could be legitimate — e.g., vague company description, generic boilerplate with no role-specific details, slightly inflated requirements, no salary range.
- "suspicious": Strong red-flag indicators — e.g., years of experience required for a technology younger than that (e.g., "5 years of React Hooks experience" when Hooks shipped in 2019), mutually exclusive or incoherent requirements, promises of unusually high compensation with no verifiable company details, signs of a ghost job (reposted verbatim with no updates), unprofessional language or excessive keyword stuffing typical of fake postings.
Return an empty array [] if no meaningful flags are found. Omit minor style issues — only flag things a real candidate should know before investing time in an application.`,
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
    matchResult = parseModelJson<MatchResult>(scoringText);
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse scoring response' },
      { status: 500 }
    );
  }

  const response: ScoreResponse = { matchResult };
  return NextResponse.json(response);
}
