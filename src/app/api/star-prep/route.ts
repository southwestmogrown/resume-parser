import { getAnthropic } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import { checkStarPrepAccess, activateStarPrep } from '@/lib/tokens';
import type { StarPrepRequest, StarPrepResponse, StarAnswer, ResumeData, MatchResult, StarQuestion } from '@/lib/types';
import { parseModelJson, stripJsonCodeFences } from '@/lib/parseModelJson';
import { isStringWithinLimit, MAX_JOB_DESCRIPTION_CHARS, MAX_CONVERSATION_MESSAGES, MAX_MESSAGE_CHARS } from '@/lib/requestValidation';

export const maxDuration = 30;

function buildStarPrompt(
  resumeData: ResumeData,
  matchResult: MatchResult,
  jobDescription: string,
  currentQuestion: StarQuestion
): string {
  const topGaps = matchResult.missingSkills
    .slice(0, 3)
    .map((s) => `${s.skill} (${s.severity})`)
    .join(', ');

  return `You are an interview coach helping a software engineering candidate prepare
for behavioral interviews. You know their background and the target role.

Candidate background:
Name: ${resumeData.name}
Skills: ${resumeData.skills.join(', ')}
Experience: ${resumeData.experience.map((e) => `${e.title} at ${e.company}`).join(', ')}

Target role context:
${jobDescription.slice(0, 1500)}

Gap analysis summary:
Score: ${matchResult.score}/100
Matched skills: ${matchResult.matchedSkills.slice(0, 5).join(', ')}
Top gaps: ${topGaps}

Current question being coached:
Question: ${currentQuestion.question}
Target skill: ${currentQuestion.targetSkill}
Difficulty: ${currentQuestion.difficulty}

## Your job
Coach the candidate to build a strong STAR answer (Situation, Task, Action, Result)
for this specific question, using only evidence from their real background.

## Process
1. If this is the first turn (no user draft yet): briefly explain what a strong
   STAR answer for this question looks like, then ask them to take a first pass.
2. When they provide a draft, give specific structured feedback:
   - What's strong (be specific, quote their words back)
   - What's missing from the STAR frame
   - What evidence from their resume they're not using
   - One concrete suggestion for the Result section
3. Ask them to revise, OR if the answer is strong, complete it.

## Rules
- Never invent experience, metrics, or outcomes for the candidate
- Never write their answer for them — coach them to it
- If they claim skills or outcomes not in their resume, note it and ask for context
- Be direct and specific. "That's good" is not feedback.
- A strong STAR answer: specific situation, clear personal ownership of the task,
  concrete actions (3-5 steps), measurable or observable result

## Completion
When the candidate has a strong, complete STAR answer, output ONLY valid JSON.
No preamble. First character must be {

{
  "question_complete": true,
  "answer": {
    "questionId": "${currentQuestion.id}",
    "question": "${currentQuestion.question.replace(/"/g, '\\"')}",
    "situation": "[their situation]",
    "task": "[their task]",
    "action": "[their action steps]",
    "result": "[their result]",
    "coachingNotes": "1-2 final tips for delivering this answer in the room"
  }
}`;
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-analysis-token');
  if (!token) {
    return NextResponse.json({ error: 'Payment required' }, { status: 402 });
  }

  let body: Partial<StarPrepRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { messages, resumeData, matchResult, jobDescription, currentQuestion } = body;

  if (
    !messages ||
    !resumeData ||
    !matchResult ||
    !isStringWithinLimit(jobDescription, MAX_JOB_DESCRIPTION_CHARS) ||
    !currentQuestion
  ) {
    return NextResponse.json(
      { error: 'messages, resumeData, matchResult, jobDescription, and currentQuestion are required' },
      { status: 400 }
    );
  }

  if (
    messages.length > MAX_CONVERSATION_MESSAGES ||
    messages.some((message) => !message.content || message.content.length > MAX_MESSAGE_CHARS)
  ) {
    return NextResponse.json({ error: 'Conversation is too large' }, { status: 400 });
  }

  // Star-prep costs one token use total — consumed on first ever activation.
  // After that, any question / any turn / any session is covered as long as
  // the token hasn't expired. Uses_remaining is irrelevant once unlocked.
  const access = await checkStarPrepAccess(token);
  if (access === 'deny') {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
  if (access === 'consume') {
    const activated = await activateStarPrep(token);
    if (!activated) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
  }
  // access === 'allow': already unlocked, proceed.

  const systemPrompt = buildStarPrompt(resumeData, matchResult, jobDescription, currentQuestion);

  let aiMessage;
  try {
    aiMessage = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && (error.status === 401 || error.status === 403)) {
      return NextResponse.json({ error: 'Invalid Anthropic API key' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Claude API error during STAR coaching' }, { status: 500 });
  }

  const content =
    aiMessage.content[0].type === 'text' ? aiMessage.content[0].text : '';

  // JSON completion detection
  const stripped = stripJsonCodeFences(content);

  try {
    const completion = parseModelJson<{ question_complete: boolean; answer: StarAnswer }>(stripped);
    if (completion.question_complete && completion.answer) {
      const response: StarPrepResponse = {
        message: '',
        answer: completion.answer,
        question_complete: true,
      };
      return NextResponse.json(response);
    }
  } catch {
    // not done, continue
  }

  const response: StarPrepResponse = { message: content, question_complete: false };
  return NextResponse.json(response);
}
