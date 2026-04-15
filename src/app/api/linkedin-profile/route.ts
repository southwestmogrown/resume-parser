import { getAnthropic } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import type { LinkedInProfile, LinkedInProfileResponse } from '@/lib/types';
import { parseModelJson } from '@/lib/parseModelJson';
import { isRateLimited } from '@/lib/rateLimit';
import { isStringWithinLimit, MAX_PROFILE_TEXT_CHARS } from '@/lib/requestValidation';

export const maxDuration = 30;

/**
 * Strip common LinkedIn page chrome that gets captured by Ctrl+A.
 * This includes navigation, sidebar suggestions, activity feed, ads, and
 * footer content. The goal is to keep only actual profile content so that
 * the 8 000-char truncation sent to Claude contains maximum signal.
 */
function stripLinkedInNoise(text: string): string {
  let result = text;

  // 1. Strip everything before the first recognisable profile section header
  //    that appears in the top ~20% of the text. This removes nav chrome,
  //    search bars, notification counts, etc.
  const sectionAnchors = /\n\s*(?:About|Experience|Education|Skills|Licenses|Certifications|Honors|Publications|Projects|Recommendations|Summary)\s*\n/i;
  const firstAnchorMatch = sectionAnchors.exec(result);
  if (firstAnchorMatch && firstAnchorMatch.index < result.length * 0.25) {
    // Keep a generous amount before the anchor (the name / headline live above it)
    const keepFrom = Math.max(0, firstAnchorMatch.index - 600);
    result = result.slice(keepFrom);
  }

  // 2. Strip trailing footer / legal / chat widget
  result = result.replace(/(?:LinkedIn Corporation|©\s*\d{4})[\s\S]*$/i, '');
  result = result.replace(/Messaging\s*\n[\s\S]*$/i, '');

  // 3. Strip "People also viewed" / "People you may know" blocks
  result = result.replace(/People (?:also viewed|you may know)[\s\S]*?(?=\n{3,}|\n\s*(?:About|Experience|Education|Skills|$))/gi, '');

  // 4. Collapse excessive blank lines (3+ → 2)
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

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
  // Read the raw value before the type-guard narrows the type, so we can
  // distinguish "missing / whitespace" from "too long" in the error message.
  const rawProfileText: unknown = profileText;
  if (!isStringWithinLimit(profileText, MAX_PROFILE_TEXT_CHARS)) {
    const msg =
      typeof rawProfileText === 'string' && rawProfileText.trim().length >= MAX_PROFILE_TEXT_CHARS
        ? `Profile text is too long (max ${MAX_PROFILE_TEXT_CHARS.toLocaleString()} characters). Try copying a shorter section of your profile.`
        : 'profileText is required';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Sanitize: strip null bytes and normalize line endings to guard against
  // encoding artifacts from browser paste events
  const sanitizedText = profileText
    .replace(/\x00/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  // Strip LinkedIn page chrome (nav, footer, sidebar, activity feed) so that
  // the truncation window sent to Claude contains mostly real profile content.
  const cleanedText = stripLinkedInNoise(sanitizedText);

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
${cleanedText.slice(0, 8000)}

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
