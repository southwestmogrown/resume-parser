import { getAnthropic } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import type { ExtractRequest, ExtractResponse, ResumeData } from '@/lib/types';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: Partial<ExtractRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { resume } = body;

  if (!resume) {
    return NextResponse.json({ error: 'resume is required' }, { status: 400 });
  }

  let extractionMessage;
  try {
    extractionMessage = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system:
        'You are an elite resume analyst for software engineering candidates. Extract the strongest truthful data possible from the document while staying strictly evidence-based. Never invent technologies, dates, employers, metrics, or accomplishments. Prefer precise, ATS-friendly phrasing over generic summaries, normalize obvious skill naming variants when the evidence is explicit, and return only data that is supported by the resume.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: resume,
              },
            },
            {
              type: 'text',
              text: `Extract a high-signal software-engineering profile from this resume.

Rules:
- Return valid JSON only with no prose, markdown, or code fences.
- Use only facts grounded in the resume. If something is missing, use an empty string, an empty array, or null where the schema allows it.
- "summary" should be a concise 2-3 sentence professional snapshot synthesized from the resume, focused on role level, core stack, domain, and strongest evidence of impact.
- "skills" should contain deduplicated technologies, tools, platforms, and notable engineering methods explicitly supported by the resume.
- Each experience "description" should be a compact 1-2 sentence summary of the actual work, highlighting scope, technologies, product/domain context, and measurable impact when it is stated.
- Preserve chronology and do not merge separate roles.
- Normalize dates when possible (for example "Jan 2024"). Use null for a current role's endDate.

Return this exact shape:
{
  "name": "full name",
  "summary": "brief professional summary or objective (1-2 sentences)",
  "skills": ["skill1", "skill2"],
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "startDate": "Mon YYYY",
      "endDate": "Mon YYYY or null if current",
      "description": "brief description of responsibilities"
    }
  ],
  "education": [
    {
      "degree": "degree name",
      "institution": "institution name",
      "graduationYear": "YYYY"
    }
  ]
}`,
            },
          ],
        },
      ],
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && (error.status === 401 || error.status === 403)) {
      return NextResponse.json({ error: 'Invalid Anthropic API key' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Claude API error during extraction' },
      { status: 500 }
    );
  }

  const extractionText =
    extractionMessage.content[0].type === 'text'
      ? extractionMessage.content[0].text
      : '';

  let resumeData: ResumeData;
  try {
    const cleaned = extractionText
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
    resumeData = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse resume extraction response' },
      { status: 500 }
    );
  }

  const response: ExtractResponse = { resumeData };
  return NextResponse.json(response);
}
