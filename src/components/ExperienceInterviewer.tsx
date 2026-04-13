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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
          { role: 'assistant', content: "Great — I have everything I need. Enhancing your resume now..." },
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
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Something went wrong. Please try again or skip this step.',
        },
      ]);
    } finally {
      setLoading(false);
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

      <div className="chat-messages">
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
            <div className="typing-indicator">
              <span />
              <span />
              <span />
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
