import { getAnthropic } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import type { InterviewRequest, InterviewResponse, InterviewBrief, ResumeData } from '@/lib/types';

export const maxDuration = 30;

function buildInterviewerPrompt(resumeData: ResumeData): string {
  const roles = resumeData.experience
    .map((e) => `${e.title} at ${e.company} (${e.startDate}–${e.endDate ?? 'present'}): ${e.description}`)
    .join('\n');

  return `You are an experience interviewer for a job candidate named ${resumeData.name}.
Your job is to surface concrete, quantifiable, and qualitative information
about their work history that didn't make it into their resume PDF.

Resume context (do not repeat this back — use it to ask targeted questions):
Name: ${resumeData.name}
Skills: ${resumeData.skills.join(', ')}
Experience:
${roles}

## Your goal
Build a complete EnrichedExperience record for each role — specifically:
- Concrete outcomes and numbers (even rough ones: "about 40%", "from 3 to 1")
- Technologies and tools actually used, even if not on the resume
- The real story: what broke, what they fixed, what they built that's still running
- Anything they're proud of that they didn't think to write down

## Rules
- Ask one or two targeted questions at a time — never a wall of questions
- Never accept vague answers. If they say "I worked on the backend", follow up:
  "What specifically did you build? What did it do?"
- If they mention a number, get the unit and context: "faster — faster than what?"
- Be conversational and encouraging, not clinical
- Work through roles chronologically unless the candidate redirects
- You have enough when: each role has at least one concrete impact statement,
  one technology detail not in the resume, and a brief qualitative story

## Completion
When you have enough to meaningfully enrich every role in the resume,
output ONLY valid JSON. No preamble. No explanation. First character must be {

Required JSON shape:
{
  "interview_complete": true,
  "enriched_experiences": [
    {
      "company": "string",
      "role": "string",
      "impact": ["concrete outcome 1", "concrete outcome 2"],
      "technologies": ["tech1", "tech2"],
      "story": "1-2 sentence qualitative narrative"
    }
  ],
  "additional_skills": ["skill not on resume"],
  "notable_context": "anything else worth noting"
}`;
}

export async function POST(req: NextRequest) {
  let body: Partial<InterviewRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { messages, resumeData } = body;

  if (!resumeData || !messages) {
    return NextResponse.json({ error: 'resumeData and messages are required' }, { status: 400 });
  }

  const systemPrompt = buildInterviewerPrompt(resumeData);

  let aiMessage;
  try {
    aiMessage = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && (error.status === 401 || error.status === 403)) {
      return NextResponse.json({ error: 'Invalid Anthropic API key' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Claude API error during interview' }, { status: 500 });
  }

  const content =
    aiMessage.content[0].type === 'text' ? aiMessage.content[0].text : '';

  // JSON completion detection — strip markdown fences, attempt parse
  const stripped = content
    .trim()
    .replace(/^```json?\n?/, '')
    .replace(/```$/, '')
    .trim();

  try {
    const brief: InterviewBrief = JSON.parse(stripped);
    if (brief.interview_complete) {
      const response: InterviewResponse = { message: '', brief, interview_complete: true };
      return NextResponse.json(response);
    }
  } catch {
    // not done, continue
  }

  const response: InterviewResponse = { message: content, interview_complete: false };
  return NextResponse.json(response);
}
