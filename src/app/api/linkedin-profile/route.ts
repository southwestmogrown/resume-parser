import { getAnthropic } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import type { LinkedInProfile, LinkedInProfileResponse } from '@/lib/types';
import { parseModelJson } from '@/lib/parseModelJson';
import { isRateLimited } from '@/lib/rateLimit';
import { isStringWithinLimit, MAX_PROFILE_TEXT_CHARS } from '@/lib/requestValidation';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (isRateLimited(req.headers, 'linkedin-profile', 8, 60_000)) {
    return NextResponse.json({ error: 'Too many LinkedIn parsing requests. Please wait a minute and try again.' }, { status: 429 });
  }

  let body: { profileText?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { profileText } = body;
  if (!isStringWithinLimit(profileText, MAX_PROFILE_TEXT_CHARS)) {
    return NextResponse.json({ error: 'profileText is required' }, { status: 400 });
  }

  let extractionMessage;
  try {
    extractionMessage = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system:
        'You are a structured data extractor. Extract professional profile information from raw LinkedIn profile text. Return only valid JSON. If a field cannot be determined from the text, use null for strings or an empty array for arrays.',
      messages: [
        {
          role: 'user',
          content: `Extract structured profile data from this LinkedIn profile text.

Profile text:
${profileText.slice(0, 8000)}

Return a JSON object with exactly these fields:
{
  "name": "full name or null",
  "headline": "professional headline (e.g. 'Senior Software Engineer at Stripe') or null",
  "currentRole": "current job title or null",
  "currentCompany": "current employer name or null",
  "skills": ["skill1", "skill2"],
  "summary": "About section text or null",
  "education": ["Degree, Institution, Year"] or null
}

For "education", each entry should be a single string in the format "Degree, Institution, Year" (e.g. "B.S. Computer Science, University of Missouri, 2018"). Use null if no education section is present.

Return only the JSON object, no markdown, no explanation.`,
        },
      ],
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && (error.status === 401 || error.status === 403)) {
      return NextResponse.json({ error: 'Invalid Anthropic API key' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to parse LinkedIn profile' },
      { status: 500 }
    );
  }

  const text =
    extractionMessage.content[0].type === 'text'
      ? extractionMessage.content[0].text
      : '';

  let profile: LinkedInProfile;
  try {
    profile = parseModelJson<LinkedInProfile>(text);
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse LinkedIn profile response' },
      { status: 500 }
    );
  }

  const response: LinkedInProfileResponse = { profile };
  return NextResponse.json(response);
}
