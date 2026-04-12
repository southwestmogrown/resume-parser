import { anthropic } from '@/lib/anthropic';
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
    extractionMessage = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
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
              text: `Extract the following information from this resume and return it as valid JSON only, with no additional text or markdown:
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
