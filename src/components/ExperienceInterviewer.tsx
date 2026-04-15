'use client';

import { useState, useEffect, useRef } from 'react';
import type { ResumeData, InterviewBrief, ConversationMessage } from '@/lib/types';

interface ExperienceInterviewerProps {
  resumeData: ResumeData;
  onBriefComplete: (brief: InterviewBrief) => void;
  onSkip: () => void;
}

export default function ExperienceInterviewer({
  resumeData,
  onBriefComplete,
  onSkip,
}: ExperienceInterviewerProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [lastError, setLastError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastTurnRef = useRef<ConversationMessage[]>([]);

  // Kick off the first question on mount
  useEffect(() => {
    void sendTurn([{ role: 'user', content: 'Ready to start.' }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendTurn(history: ConversationMessage[]) {
    setLoading(true);
    setLastError(false);
    lastTurnRef.current = history;
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, resumeData }),
      });

      if (!res.ok) throw new Error('Interview API error');

      const data: { message: string; brief?: InterviewBrief; interview_complete: boolean } =
        await res.json();

      if (data.interview_complete && data.brief) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: "Got it — that covers everything. Folding your answers into the analysis now..." },
        ]);
        setDone(true);
        onBriefComplete(data.brief);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.message },
        ]);
      }
    } catch {
      setLastError(true);
    } finally {
      setLoading(false);
    }
  }

  function handleRetry() {
    if (lastTurnRef.current.length > 0) {
      void sendTurn(lastTurnRef.current);
    }
  }

  function handleSend() {
    const text = userInput.trim();
    if (!text || loading || done) return;

    const userMsg: ConversationMessage = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setUserInput('');
    void sendTurn(updated);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="experience-interviewer card">
      <div className="experience-interviewer__header">
        <div>
          <div className="eyebrow">phase 0</div>
          <h2 style={{ fontSize: '1.1rem', marginTop: 'var(--space-1)' }}>
            Experience Interviewer
          </h2>
          <p className="result-muted" style={{ fontSize: '0.85rem' }}>
            2–3 minutes · makes every downstream phase sharper
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost btn-inline"
          onClick={onSkip}
          style={{ flexShrink: 0, alignSelf: 'flex-start' }}
        >
          Skip
        </button>
      </div>

      <div className="chat-messages" role="log" aria-live="polite">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-bubble chat-bubble--${msg.role}`}
          >
            {msg.content}
          </div>
        ))}

        {loading && (
          <div className="chat-bubble chat-bubble--assistant" style={{ padding: 'var(--space-3) var(--space-4)' }}>
            <div className="typing-indicator" role="status" aria-label="Typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        {lastError && !loading && (
          <div className="error-card" role="alert" style={{ margin: '0 var(--space-3)' }}>
            <div className="error-card__content">
              <span className="error-card__icon" aria-hidden="true">⚠</span>
              <p className="error-card__message">Something went wrong. Please try again or skip this step.</p>
            </div>
            <div className="error-card__actions">
              <button type="button" className="btn-primary btn-inline" onClick={handleRetry}>
                Retry
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {!done && (
        <div className="chat-input-bar">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer… (⌘↵ to send)"
            rows={2}
            disabled={loading}
            aria-label="Your answer"
          />
          <button
            type="button"
            className="btn-primary btn-inline"
            onClick={handleSend}
            disabled={loading || !userInput.trim()}
            style={{ alignSelf: 'flex-end', flexShrink: 0 }}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
