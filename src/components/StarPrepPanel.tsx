'use client';

import { useState, useEffect, useRef } from 'react';
import SeverityPill from '@/components/SeverityPill';
import { DEMO_STAR_QUESTIONS } from '@/lib/demoData';
import type {
  ResumeData,
  MatchResult,
  StarQuestion,
  StarAnswer,
  ConversationMessage,
  StarPrepResponse,
} from '@/lib/types';

interface StarPrepPanelProps {
  resumeData: ResumeData;
  matchResult: MatchResult;
  jobDescription: string;
  token: string;
  tokenExpiresAt: string | null;
  questions: StarQuestion[];
  answers: StarAnswer[];
  activeQuestion: StarQuestion | null;
  starMessages: ConversationMessage[];
  onQuestionsLoaded: (questions: StarQuestion[]) => void;
  onAnswerComplete: (answer: StarAnswer) => void;
  onQuestionChange: (question: StarQuestion) => void;
  onMessageSend: (messages: ConversationMessage[]) => void;
  isDemo?: boolean;
}

// ── Inline markdown renderer ──────────────────────────────────────────────────
// Handles the subset Claude uses: headers, bullets, numbered lists, bold, italic.
// No external dependency needed.

function inlineMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(<h4 key={key++} className="bubble-h4">{inlineMarkdown(line.slice(4))}</h4>);
      i++;
    } else if (line.startsWith('## ') || line.startsWith('# ')) {
      const depth = line.startsWith('## ') ? 3 : 2;
      elements.push(<h3 key={key++} className="bubble-h3">{inlineMarkdown(line.slice(depth))}</h3>);
      i++;
    }
    // Unordered list
    else if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={key++} className="bubble-ul">
          {items.map((item, j) => <li key={j}>{inlineMarkdown(item)}</li>)}
        </ul>
      );
    }
    // Ordered list
    else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={key++} className="bubble-ol">
          {items.map((item, j) => <li key={j}>{inlineMarkdown(item)}</li>)}
        </ol>
      );
    }
    // Paragraph — collect until blank line
    else {
      const paraLines: string[] = [];
      while (i < lines.length && lines[i].trim()) {
        paraLines.push(lines[i]);
        i++;
      }
      elements.push(
        <p key={key++} className="bubble-p">
          {inlineMarkdown(paraLines.join(' '))}
        </p>
      );
    }
  }

  return <div className="bubble-md">{elements}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────

function formatExpiry(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dateStr = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  if (diffMs <= 0) return 'expired';
  if (diffH < 1) return `expires in ${diffM}m`;
  if (diffH < 24) return `expires at ${timeStr} (${diffH}h ${diffM}m left)`;
  return `expires ${dateStr} at ${timeStr}`;
}

export default function StarPrepPanel({
  resumeData,
  matchResult,
  jobDescription,
  token,
  tokenExpiresAt,
  questions,
  answers,
  activeQuestion,
  starMessages,
  onQuestionsLoaded,
  onAnswerComplete,
  onQuestionChange,
  onMessageSend,
  isDemo = false,
}: StarPrepPanelProps) {
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingTurn, setLoadingTurn] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (questions.length === 0 && !loadingQuestions) {
      void generateQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeQuestion && starMessages.length === 0 && !loadingTurn) {
      void sendTurn([{ role: 'user', content: `Let's work on this question: "${activeQuestion.question}"` }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuestion]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [starMessages, loadingTurn]);

  async function generateQuestions() {
    if (isDemo) {
      onQuestionsLoaded(DEMO_STAR_QUESTIONS);
      onQuestionChange(DEMO_STAR_QUESTIONS[0]);
      return;
    }
    setLoadingQuestions(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-star-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData, matchResult, jobDescription }),
      });
      if (!res.ok) throw new Error('Failed to generate questions');
      const data: { questions: StarQuestion[] } = await res.json();
      onQuestionsLoaded(data.questions);
      if (data.questions.length > 0) {
        onQuestionChange(data.questions[0]);
      }
    } catch {
      setError('Failed to generate interview questions. Try refreshing.');
    } finally {
      setLoadingQuestions(false);
    }
  }

  async function sendTurn(history: ConversationMessage[]) {
    if (!activeQuestion) return;
    setLoadingTurn(true);
    onMessageSend(history);

    if (isDemo) {
      await new Promise((r) => setTimeout(r, 600));
      const demoReply =
        history.length <= 1
          ? `Great — let's work through this together using the **STAR** format.\n\n**Situation** — Set the scene. What was the context?\n**Task** — What were you responsible for?\n**Action** — What did *you* specifically do?\n**Result** — What was the measurable outcome?\n\nThis is a demo, so coaching responses are pre-loaded. In the full version, Claude reads your actual answer and gives you targeted feedback.\n\nGo ahead and type a practice answer — I'll walk you through it.`
          : `Nice work. In the full version, Claude would analyze your answer here and give you specific feedback on clarity, impact quantification, and alignment with what the interviewer is looking for.\n\n*Upgrade to unlock real-time coaching.*`;
      onMessageSend([...history, { role: 'assistant' as const, content: demoReply }]);
      setLoadingTurn(false);
      return;
    }

    try {
      const res = await fetch('/api/star-prep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-analysis-token': token,
        },
        body: JSON.stringify({
          messages: history,
          resumeData,
          matchResult,
          jobDescription,
          currentQuestion: activeQuestion,
        }),
      });

      if (!res.ok) {
        const err: { error: string } = await res.json();
        throw new Error(err.error ?? 'STAR prep API error');
      }

      const data: StarPrepResponse = await res.json();

      if (data.question_complete && data.answer) {
        const withComplete = [
          ...history,
          { role: 'assistant' as const, content: "That's a strong STAR answer. Moving to your results…" },
        ];
        onMessageSend(withComplete);
        onAnswerComplete(data.answer);

        const completedIds = new Set([...answers.map((a) => a.questionId), data.answer.questionId]);
        const next = questions.find((q) => !completedIds.has(q.id));
        if (next) {
          setTimeout(() => onQuestionChange(next), 900);
        }
      } else {
        onMessageSend([...history, { role: 'assistant' as const, content: data.message }]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      onMessageSend([...history, { role: 'assistant' as const, content: `Error: ${msg}` }]);
    } finally {
      setLoadingTurn(false);
    }
  }

  function handleSend() {
    const text = userInput.trim();
    if (!text || loadingTurn || !activeQuestion) return;
    const updated = [...starMessages, { role: 'user' as const, content: text }];
    setUserInput('');
    void sendTurn(updated);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }

  function handleExport() {
    if (answers.length === 0) return;
    const lines = answers.map((a) =>
      [
        `Q: ${a.question}`,
        ``,
        `SITUATION: ${a.situation}`,
        `TASK: ${a.task}`,
        `ACTION: ${a.action}`,
        `RESULT: ${a.result}`,
        ``,
        `COACHING NOTES: ${a.coachingNotes}`,
        ``,
        `---`,
        ``,
      ].join('\n')
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'star-answers.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  const completedIds = new Set(answers.map((a) => a.questionId));
  const doneCount = completedIds.size;

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loadingQuestions) {
    return (
      <div className="card result-card">
        <div className="eyebrow">interview prep</div>
        <h2 style={{ fontSize: '1.3rem' }}>Generating your questions…</h2>
        <p className="result-muted" style={{ marginTop: 'var(--space-2)' }}>
          Pulling from your gap analysis to build targeted behavioral questions.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card result-card">
        <div className="eyebrow">interview prep</div>
        <p style={{ color: 'var(--ps-red)' }}>{error}</p>
      </div>
    );
  }

  // ── Main panel ─────────────────────────────────────────────────────────────

  return (
    <div className="card result-card" style={{ gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <div className="eyebrow">interview prep · STAR coaching</div>
          <h2 style={{ fontSize: '1.25rem', marginTop: 'var(--space-1)' }}>Behavioral Questions</h2>
          {questions.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <div className="star-progress-bar">
                <div
                  className="star-progress-fill"
                  style={{ width: `${Math.round((doneCount / questions.length) * 100)}%` }}
                />
              </div>
              <span className="result-muted" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                {doneCount} / {questions.length} complete
              </span>
            </div>
          )}
          {tokenExpiresAt && (
            <div className="star-expiry-notice">
              <span className="star-expiry-icon">⏱</span>
              <span>
                All questions included — complete them at your own pace.{' '}
                <strong>Access {formatExpiry(tokenExpiresAt)}.</strong>{' '}
                Your progress is saved locally and will be here when you return.
              </span>
            </div>
          )}
        </div>
        {answers.length > 0 && (
          <button type="button" className="btn-ghost btn-inline" onClick={handleExport}>
            Export answers ↓
          </button>
        )}
      </div>

      {/* Two-column layout */}
      <div className="star-prep-layout">
        {/* ── Question list ── */}
        <div className="star-question-list">
          {questions.map((q, idx) => {
            const isDone = completedIds.has(q.id);
            const isActive = activeQuestion?.id === q.id;
            return (
              <button
                key={q.id}
                type="button"
                className={['star-q-card', isActive ? 'star-q-card--active' : '', isDone ? 'star-q-card--done' : ''].filter(Boolean).join(' ')}
                onClick={() => { if (!isActive) onQuestionChange(q); }}
              >
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                  <span className={`star-q-num${isDone ? ' star-q-num--done' : isActive ? ' star-q-num--active' : ''}`}>
                    {isDone ? '✓' : idx + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="star-q-text">{q.question}</p>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', overflow: 'hidden' }}>
                      <span className="star-q-tag">{q.targetSkill}</span>
                      {q.difficulty === 'probing' && (
                        <span className="star-q-tag star-q-tag--probing" style={{ flexShrink: 0 }}>probing</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Coaching chat ── */}
        <div className="star-chat-pane">
          {activeQuestion ? (
            <>
              {/* Current question header */}
              <div className="star-chat-header">
                <p className="star-chat-q">{activeQuestion.question}</p>
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <SeverityPill tone="sage" label={activeQuestion.targetSkill} />
                  {activeQuestion.difficulty === 'probing' && (
                    <SeverityPill tone="amber" label="probing" />
                  )}
                </div>
              </div>

              {/* Messages — skip the internal kickoff prompt (index 0, role user) */}
              <div className="chat-messages">
                {starMessages
                  .filter((msg, i) => !(i === 0 && msg.role === 'user'))
                  .map((msg, i) => (
                    <div key={i} className={`chat-bubble chat-bubble--${msg.role}`}>
                      {msg.role === 'assistant'
                        ? <MarkdownContent text={msg.content} />
                        : msg.content
                      }
                    </div>
                  ))}
                {loadingTurn && (
                  <div className="chat-bubble chat-bubble--assistant">
                    <div className="typing-indicator"><span /><span /><span /></div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input or completion footer */}
              {completedIds.has(activeQuestion.id) ? (
                <div className="star-chat-done">
                  <span style={{ color: 'var(--ps-accent)', marginRight: 'var(--space-2)' }}>✓</span>
                  Answer saved — pick the next question to continue
                </div>
              ) : (
                <div className="chat-input-bar">
                  <textarea
                    className="chat-input"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your answer… (⌘↵ to send)"
                    rows={3}
                    disabled={loadingTurn}
                  />
                  <button
                    type="button"
                    className="btn-primary btn-inline"
                    onClick={handleSend}
                    disabled={loadingTurn || !userInput.trim()}
                    style={{ alignSelf: 'flex-end', flexShrink: 0 }}
                  >
                    Send
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="star-chat-empty">
              <p className="result-muted">Select a question to begin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
