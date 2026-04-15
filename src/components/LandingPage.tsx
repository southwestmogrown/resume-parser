"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import PassStackLogo from "@/components/PassStackLogo";
import ScoreRing from "@/components/ScoreRing";
import SeverityPill from "@/components/SeverityPill";

const phases = [
  {
    number: "00",
    title: "Experience Interviewer",
    body: "A quick conversation before scoring starts. Pulls out the numbers, the scale, the tools — the stuff that was on your resume three versions ago but got cut for space. Free, optional, and worth 2 minutes.",
  },
  {
    number: "01",
    title: "Match Score",
    body: "A straight number. How well does your resume match this specific role? No vague grades. No 'you're almost there!' Just the score, and what's behind it.",
  },
  {
    number: "02",
    title: "Gap Analysis + Posting Sniffer",
    body: "Your gaps, ranked: dealbreaker, learnable, or nice-to-have. Plus a scan of the job posting itself — because sometimes the posting is the problem, not you.",
  },
  {
    number: "03",
    title: "Bullet Rewrites",
    body: "Your actual experience, rewritten to speak the JD's language. Side by side, so you see exactly what changed and why. Copy, paste, move on.",
  },
  {
    number: "04",
    title: "Cover Letter + Study Plan",
    body: "A cover letter that's actually about this role — not a template. Plus a study plan for the gaps worth closing, with specific resources. If the role has dealbreakers, we tell you to skip it.",
  },
  {
    number: "05",
    title: "STAR Interview Coaching",
    body: "The interview questions they're going to ask you — sourced from your actual gaps — with a coach that walks you through building real answers. Your stories. STAR format. Not a script.",
  },
  {
    number: "06",
    title: "Optimized Resume",
    body: "Everything you just built — rewrites, interview answers, stronger experience — compiled into one ATS-ready document. Download it. Send it. Done.",
  },
] as const;

const steps = [
  {
    number: "01",
    title: "Upload your resume",
    body: "Drop your PDF. Nothing is stored longer than it takes to run the analysis.",
  },
  {
    number: "02",
    title: "Paste the JD",
    body: "Copy-paste the full job posting. The more it has, the sharper the analysis.",
  },
  {
    number: "03",
    title: "Get your analysis",
    body: "Full report. Under 60 seconds. Score, gaps, rewrites, cover letter, study plan, interview prep, and a finished resume.",
  },
] as const;

const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/southwestmogrown/resume-parser";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="landing">
      <nav className={`site-nav ${scrolled ? "site-nav--scrolled" : ""}`.trim()}>
        <div className="container nav-inner">
          <Link href="/" className="brand-mark" aria-label="PassStack home">
            <PassStackLogo />
          </Link>
          <div className="nav-actions">
            <Link href="/app" className="btn-ghost">
              Open App
            </Link>
            <Link href="/app#workspace" className="btn-primary" aria-label="One-time payment, no subscription">
              Unlock — $5 →
            </Link>
          </div>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">for people who are done guessing</div>
            <h1 className="display">You&apos;re qualified. The ATS doesn&apos;t know that yet.</h1>
            <p>
              Upload your resume. Paste the job description. In 60 seconds you&apos;ll know exactly what&apos;s getting you filtered — and what to do about it. No keyword-stuffing gimmicks. No subscription. Just the answer.
            </p>
            <div className="hero-actions">
              <Link href="/app#workspace" className="btn-primary btn-large">
                Get the full breakdown — $5, once →
              </Link>
              <Link href="/demo" className="btn-ghost btn-large">
                Try the demo →
              </Link>
            </div>
            <p className="fine-print" style={{ marginTop: "var(--space-3)" }}>
              One payment. No account. No subscription. No one sells your data.
            </p>
          </div>

          <div className="card hero-card result-card">
            <div className="eyebrow">match score</div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ScoreRing score={74} />
            </div>
            <ul className="mock-list">
              <li>
                <span>React</span>
                <span className="mock-list__status mock-list__status--good">✓ matched</span>
              </li>
              <li>
                <span>TypeScript</span>
                <span className="mock-list__status mock-list__status--good">✓ matched</span>
              </li>
              <li>
                <span>AWS</span>
                <span className="mock-list__status mock-list__status--gap">✗ gap</span>
              </li>
              <li>
                <span>System Design</span>
                <span className="mock-list__status mock-list__status--gap">✗ gap</span>
              </li>
            </ul>
            <div>
              <SeverityPill tone="red" label="2 dealbreakers" />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="eyebrow">the problem</div>
          <div className="problem-grid">
            <div className="card" style={{ alignSelf: "start" }}>
              <div className="eyebrow" style={{ marginBottom: "var(--space-4)" }}>what others charge</div>
              <div className="price-compare">
                <div className="price-compare__row">
                  <span>Resume.io</span>
                  <span className="result-muted">$10 / mo</span>
                </div>
                <div className="price-compare__row">
                  <span>Jobscan</span>
                  <span className="result-muted">$49 / mo</span>
                </div>
                <div className="price-compare__row">
                  <span>Teal</span>
                  <span className="result-muted">$29 / mo</span>
                </div>
                <div className="price-compare__row">
                  <span>TopResume (human rewrite)</span>
                  <span className="result-muted">$149+</span>
                </div>
                <div className="price-compare__row price-compare__row--highlight">
                  <span>PassStack</span>
                  <span>$5. Once.</span>
                </div>
              </div>
              <p className="fine-print" style={{ marginTop: "var(--space-4)" }}>
                Full analysis. Every phase. No subscription. No account. Nobody sells your information.
              </p>
            </div>
            <div>
              <div className="prose-block">
                <h2 style={{ fontSize: "clamp(2.2rem, 5vw, 2.9rem)", lineHeight: 1.05 }}>
                  You&apos;ve applied to 40 jobs. You&apos;ve heard back from zero. That&apos;s not bad luck — it&apos;s bad infrastructure.
                </h2>
                <p>
                  The resume industry charges you $30/month to count keywords and call it career help. They don&apos;t tell you <em>why</em> you&apos;re getting filtered. They don&apos;t rewrite your bullets. They don&apos;t tell you when a job posting is a ghost listing. They just take your money and tell you to try again next month.
                </p>
                <p>Sometimes you&apos;re not qualified. That happens. But sometimes you ARE qualified and your resume just doesn&apos;t say it in the right language. You deserve to know which one it is before you spend another hour customizing a cover letter for a role that was never going to call you back.</p>
                <p>
                  PassStack runs the full analysis for $5. One time. No subscription. No account required.
                </p>
              </div>
              <div className="pull-quote">&quot;I spent three months applying to roles I was qualified for. I never heard back. I wasn&apos;t the problem. My resume was.&quot;</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="eyebrow">what $5 gets you</div>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.6rem)", marginBottom: "var(--space-8)" }}>
            Seven phases. One run. The full picture.
          </h2>
          <div className="phase-grid">
            {phases.map((phase, index) => (
              <div
                key={phase.number}
                className="card phase-card reveal"
                data-reveal
                style={{ "--delay": `${index * 80}ms` } as React.CSSProperties}
              >
                <div className="eyebrow">phase {phase.number}</div>
                <h3 style={{ fontSize: "1.25rem" }}>{phase.title}</h3>
                <p className="result-muted">{phase.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-surface">
        <div className="container">
          <div className="eyebrow">the output</div>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.6rem)", marginBottom: "var(--space-2)" }}>
            What you actually get.
          </h2>
          <p className="result-muted" style={{ marginBottom: "var(--space-8)", maxWidth: "560px" }}>
            Real output from a real analysis. Not a keyword count and a pat on the back.
          </p>

          {/* Phase 00 — Experience Interviewer */}
          <div className="phase-output-row phase-output-row--reverse" data-reveal>
            <div className="phase-output__img">
              <Image
                src="/assets/images/phase-0-interview.png"
                alt="PassStack experience interviewer chat surfacing concrete impact metrics before scoring"
                className="screenshot-img"
                width={1200}
                height={900}
                sizes="(max-width: 960px) 100vw, 960px"
              />
            </div>
            <div className="phase-output__text">
              <div className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>phase 00 — experience interviewer</div>
              <h3 style={{ fontSize: "clamp(1.3rem, 3vw, 1.7rem)", lineHeight: 1.2, marginBottom: "var(--space-4)" }}>
                Pull out the numbers you forgot to put on your resume.
              </h3>
              <p className="result-muted" style={{ marginBottom: "var(--space-4)" }}>
                Before scoring begins, a short guided interview pulls out the concrete numbers, hidden skills, and real stories buried in your work history. Scoring and rewrites use this stronger picture — not just the PDF. Optional and free.
              </p>
              <ul className="feature-list">
                <li>Conversational, targeted questions — not a wall of forms</li>
                <li>Pulls out impact metrics you forgot to quantify (percentages, timelines, scale)</li>
                <li>Uncovers technologies and tools used but not listed on the resume</li>
                <li>Makes every phase sharper — scoring, rewrites, study plan, cover letter</li>
                <li>Free — no token required, skip anytime</li>
              </ul>
            </div>
          </div>

          {/* Phase 02 — Gap Analysis */}
          <div className="phase-output-row" data-reveal>
            <div className="phase-output__img">
              <Image
                src="/assets/images/PassStack-Score-Results.png"
                alt="PassStack gap analysis scorecard showing matched skills and severity-tiered gaps"
                className="screenshot-img"
                width={1200}
                height={900}
                sizes="(max-width: 960px) 100vw, 960px"
              />
            </div>
            <div className="phase-output__text">
              <div className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>phase 02 — gap analysis</div>
              <h3 style={{ fontSize: "clamp(1.3rem, 3vw, 1.7rem)", lineHeight: 1.2, marginBottom: "var(--space-4)" }}>
                See exactly where you stand before you apply.
              </h3>
              <p className="result-muted" style={{ marginBottom: "var(--space-4)" }}>
                Every missing skill ranked by severity — dealbreaker, learnable, or soft. No more guessing what&apos;s killing your application.
              </p>
              <ul className="feature-list">
                <li>Percentage match score against the job description</li>
                <li>Dealbreaker gaps highlighted in red — hard stops that will get you filtered</li>
                <li>Learnable gaps in amber — skills worth investing time in</li>
                <li>Soft gaps in green — nice-to-have optimizations</li>
                <li>Specific reasons why each gap matters to the role</li>
                <li>Job posting quality scan — flags ghost jobs, scam indicators, impossible requirements, and other red flags before you invest time applying</li>
              </ul>
            </div>
          </div>

          {/* Phase 03 — Bullet Rewrites */}
          <div className="phase-output-row phase-output-row--reverse" data-reveal>
            <div className="phase-output__img">
              <Image
                src="/assets/images/PassStack-Bullet-Rewrites.png"
                alt="PassStack bullet rewrite output showing before and after resume bullets"
                className="screenshot-img"
                width={1200}
                height={900}
                sizes="(max-width: 960px) 100vw, 960px"
              />
            </div>
            <div className="phase-output__text">
              <div className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>phase 03 — bullet rewrites</div>
              <h3 style={{ fontSize: "clamp(1.3rem, 3vw, 1.7rem)", lineHeight: 1.2, marginBottom: "var(--space-4)" }}>
                Same experience. Different language. Wildly different results.
              </h3>
              <p className="result-muted" style={{ marginBottom: "var(--space-4)" }}>
                Before and after for every relevant bullet. Copy and paste directly into your resume.
              </p>
              <ul className="feature-list">
                <li>Original bullet preserved so you see exactly what changed</li>
                <li>Rewritten bullet tailored to the job description keywords</li>
                <li>One-paragraph rationale explaining the rewrite strategy</li>
                <li>All relevant bullets covered — not just a sample</li>
                <li>Copy-paste ready — no export friction</li>
              </ul>
            </div>
          </div>

          {/* Phase 03 — Study Plan */}
          <div className="phase-output-row" data-reveal>
            <div className="phase-output__img">
              <Image
                src="/assets/images/PassStack-Study-Plan.png"
                alt="PassStack study plan showing actionable gap-closing recommendations"
                className="screenshot-img"
                width={1200}
                height={900}
                sizes="(max-width: 960px) 100vw, 960px"
              />
            </div>
            <div className="phase-output__text">
              <div className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>phase 03 — study plan</div>
              <h3 style={{ fontSize: "clamp(1.3rem, 3vw, 1.7rem)", lineHeight: 1.2, marginBottom: "var(--space-4)" }}>
                Close the gaps that are actually worth closing.
              </h3>
              <p className="result-muted" style={{ marginBottom: "var(--space-4)" }}>
                Actionable steps for the gaps worth investing time in. Specific resources, not vague suggestions.
              </p>
              <ul className="feature-list">
                <li>One to two sentence action plan per learnable gap</li>
                <li>Specific resource recommendations — courses, docs, projects</li>
                <li>Prioritized by impact on the role, not just gap severity</li>
                <li>Filters out dealbreakers — no study plan for hard requirements</li>
                <li>LinkedIn profile connected for personalized suggestions</li>
              </ul>
            </div>
          </div>

          {/* Phase 04 — Cover Letter */}
          <div className="phase-output-row phase-output-row--reverse" data-reveal>
            <div className="phase-output__img">
              <Image
                src="/assets/images/PassStack-Cover-Letter.png"
                alt="PassStack cover letter draft tailored to the job description"
                className="screenshot-img"
                width={1200}
                height={900}
                sizes="(max-width: 960px) 100vw, 960px"
              />
            </div>
            <div className="phase-output__text">
              <div className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>phase 04 — cover letter</div>
              <h3 style={{ fontSize: "clamp(1.3rem, 3vw, 1.7rem)", lineHeight: 1.2, marginBottom: "var(--space-4)" }}>
                A cover letter that sounds like you wrote it for this role — because you basically did.
              </h3>
              <p className="result-muted" style={{ marginBottom: "var(--space-4)" }}>
                If dealbreakers exist, we tell you — and suggest a better target instead.
              </p>
              <ul className="feature-list">
                <li>Appears as it writes — no waiting on a finished draft</li>
                <li>Kept to 300 words — tight and readable, not padded</li>
                <li>Dealbreaker check runs first — no time spent writing for a role that won&apos;t go anywhere</li>
                <li>Honest redirect if the role isn&apos;t a fit, with suggested alternatives</li>
                <li>Copy button for easy paste into your application</li>
              </ul>
            </div>
          </div>

          {/* Phase 05 — STAR Coaching */}
          <div className="phase-output-row" data-reveal>
            <div className="phase-output__img">
              <Image
                src="/assets/images/PassStack-STAR-Coach.png"
                alt="PassStack STAR interview coaching panel with gap-sourced behavioral questions"
                className="screenshot-img"
                width={1200}
                height={900}
                sizes="(max-width: 960px) 100vw, 960px"
              />
            </div>
            <div className="phase-output__text">
              <div className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>phase 05 — STAR Coaching</div>
              <h3 style={{ fontSize: "clamp(1.3rem, 3vw, 1.7rem)", lineHeight: 1.2, marginBottom: "var(--space-4)" }}>
                The questions they&apos;re going to ask. The answers you&apos;re going to nail.
              </h3>
              <p className="result-muted" style={{ marginBottom: "var(--space-4)" }}>
                PassStack knows your gaps. It generates the exact behavioral questions an interviewer would ask about them — then coaches you through each answer in STAR format. Not a template. Your gaps. Your stories. Your words.
              </p>
              <ul className="feature-list">
                <li>Questions sourced from your specific gap analysis</li>
                <li>Coach-guided STAR structure: Situation, Task, Action, Result</li>
                <li>Work through every question at your own pace</li>
                <li>Export your answers as a formatted prep sheet</li>
                <li>Included with your $5 analysis — unlimited questions, work at your own pace</li>
              </ul>
            </div>
          </div>

          {/* Phase 06 — Optimized Resume */}
          <div className="phase-output-row phase-output-row--reverse" data-reveal>
            <div className="phase-output__img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://github.com/user-attachments/assets/b7576882-0e62-41cc-b6f2-5a71d08b7e3f"
                alt="PassStack optimized resume output — polished ATS-ready document synthesized from coaching sessions"
                className="screenshot-img"
              />
            </div>
            <div className="phase-output__text">
              <div className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>phase 06 — optimized resume</div>
              <h3 style={{ fontSize: "clamp(1.3rem, 3vw, 1.7rem)", lineHeight: 1.2, marginBottom: "var(--space-4)" }}>
                You walked in with a PDF. You&apos;re leaving with a weapon.
              </h3>
              <p className="result-muted" style={{ marginBottom: "var(--space-4)" }}>
                After your coaching sessions, PassStack pulls everything together — your experience, rewritten bullets, and strongest outcomes — into a single polished document. ATS-ready. No formatting gymnastics required.
              </p>
              <ul className="feature-list">
                <li>Draws from your STAR answers, bullet rewrites, and interview notes</li>
                <li>ATS-ready formatting — clean structure, no tables or columns</li>
                <li>Includes a tailored summary aligned to the target role</li>
                <li>Download as .txt — paste into Word or Google Docs to export as PDF</li>
                <li>Included at no extra charge — no additional token use</li>
              </ul>
            </div>
          </div>

          {/* Honest by Design — No-Go Callout */}
          <div className="phase-output-row phase-output-row--reverse" data-reveal>
            <div className="phase-output__img">
              <Image
                src="/assets/images/PassStack-No-Go-Cover-Letter.png"
                alt="PassStack no-go cover letter blocked by dealbreaker gaps"
                className="screenshot-img"
                width={1200}
                height={900}
                sizes="(max-width: 960px) 100vw, 960px"
              />
            </div>
            <div className="phase-output__text">
              <div className="eyebrow" style={{ color: "var(--ps-red)", marginBottom: "var(--space-3)" }}>honest by design</div>
              <h3 style={{ fontSize: "clamp(1.3rem, 3vw, 1.7rem)", lineHeight: 1.2, marginBottom: "var(--space-4)" }}>
                We&apos;ll tell you when to walk away. No one else will.
              </h3>
              <p className="result-muted" style={{ marginBottom: "var(--space-4)" }}>
                When dealbreaker gaps exist — hard requirements you genuinely don&apos;t meet — PassStack says so. We don&apos;t write cover letters for roles you won&apos;t get. That&apos;s not a bug. That&apos;s the whole point.
              </p>
              <ul className="feature-list">
                <li>Dealbreaker detection before any content is generated</li>
                <li>Cover letter generation is blocked before it starts — no wasted effort</li>
                <li>Honest redirect — suggests a better target instead of false hope</li>
                <li>No manufactured enthusiasm that sets you up to fail</li>
                <li>That&apos;s not a bug. That&apos;s the whole point.</li>
              </ul>
            </div>
          </div>

          <div style={{ marginTop: "var(--space-8)", textAlign: "center" }}>
            <Link href="/demo" className="btn-ghost">
              Try the demo — see all seven phases →
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="eyebrow">how it works</div>
          <div className="process-grid">
            {steps.map((step) => (
              <div key={step.number} className="process-step">
                <div className="process-step__index">{step.number}</div>
                <div className="process-step__content">
                  <h3 style={{ fontSize: "1rem" }}>{step.title}</h3>
                  <p className="result-muted">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ textAlign: "center" }}>
          <div className="eyebrow">from real users</div>
          <p className="result-muted" style={{ maxWidth: "480px", margin: "var(--space-4) auto 0" }}>
            Real feedback from real users — coming soon. We&apos;re in early access.
          </p>
        </div>
      </section>

      <section className="section section-surface">
        <div className="container">
          <div className="eyebrow">common questions</div>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.6rem)", marginBottom: "var(--space-8)" }}>
            Before you ask.
          </h2>
          <div style={{ display: "grid", gap: "var(--space-6)", maxWidth: "720px" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "var(--space-2)" }}>&quot;Is this just ChatGPT?&quot;</h3>
              <p className="result-muted">
                No. PassStack runs a seven-phase pipeline — extraction, scoring, gap analysis, rewrites, cover letter, interview coaching, and resume generation. Each phase has a specific prompt contract. It&apos;s not a chatbot. It&apos;s a structured analysis engine.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "var(--space-2)" }}>&quot;Why only $5?&quot;</h3>
              <p className="result-muted">
                Because I built this for people like me — people who can&apos;t afford $49/month while they&apos;re job hunting. One payment. Full analysis. That&apos;s it.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "var(--space-2)" }}>&quot;What happens to my data?&quot;</h3>
              <p className="result-muted">
                Your resume is processed in memory and never stored permanently. No account. No profile. No data farming. We don&apos;t sell your information to recruiters, ad networks, or anyone else.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "var(--space-2)" }}>&quot;What if the analysis says don&apos;t apply?&quot;</h3>
              <p className="result-muted">
                Then you saved yourself an hour writing a cover letter for a role that was never going to call you back. That honesty is the whole point.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-surface">
        <div className="container">
          <div className="eyebrow">why passstack exists</div>
          <div className="why-grid">
            <div className="prose-block">
              <h2 className="display" style={{ fontSize: "clamp(2rem, 4vw, 2.4rem)" }}>
                I&apos;m still on the factory floor. I built this between shifts.
              </h2>
              <p>
                I manage 45 operators at a manufacturing plant. It&apos;s honest work. It&apos;s not where I&apos;m headed.
              </p>
              <p>
                I was laid off from App Academy — not as a student, as an instructor. I had the skills. What I didn&apos;t have was a resume that said &ldquo;Software Developer&rdquo; to an ATS. I was filtered out before a human ever saw my name. I gave up for a while.
              </p>
              <p>
                Then I built a piece of software for my plant. A real one — production dashboard, role-based views, live tracking across six lines. They didn&apos;t want it. That stung. But it also settled something I&apos;d stopped believing: I could still build. I started again. I needed two things at once: a portfolio project worth showing, and a way to stop getting screened out before I even got a conversation.
              </p>
              <p>
                I tried the resume tools. They weren&apos;t built for someone in my position. They optimize keywords, hide behind a dark-pattern subscription, sell your contact information to ad networks, and call it a career service. I know exactly what kind of calls I started getting.
              </p>
              <p>
                PassStack costs $5. One time. No account. No subscription. No data farming. It&apos;s built for the person who can&apos;t afford to be exploited while they&apos;re trying to get ahead — who&apos;s just starting out, needs a real hand up, and deserves to have somebody in their corner who isn&apos;t just running a business on their desperation.
              </p>
              <p>
                I know exactly who I&apos;m building it for.
              </p>
              <p>
                If you&apos;re out there applying and hearing nothing back — this is for you. I know what that silence feels like. It ends here.
              </p>
              <p className="subtle-note" style={{ marginTop: "var(--space-4)" }}>
                Wilkey Digital Solutions
              </p>
            </div>
            <div className="card" style={{ alignSelf: "start", padding: "var(--space-6) var(--space-8)" }}>
              <div className="eyebrow" style={{ marginBottom: "var(--space-4)" }}>what you get for $5</div>
              <ul className="feature-list">
                <li>Experience interview — surfaces impact, hidden skills, and real stories before scoring</li>
                <li>Match score + severity-tiered gap analysis</li>
                <li>Job posting quality scan — ghost jobs, scam indicators, impossible requirements</li>
                <li>Bullet rewrites — before &amp; after, per role</li>
                <li>Personalized cover letter draft</li>
                <li>Gap-based study plan with resources</li>
                <li>STAR behavioral interview coaching</li>
                <li>Optimized resume — synthesized and ATS-ready</li>
                <li>GitHub + LinkedIn profiles connected for a sharper picture</li>
                <li>Honest dealbreaker detection — no fake enthusiasm for roles you won&apos;t get</li>
              </ul>
              <p className="fine-print" style={{ marginTop: "var(--space-5)" }}>
                One time. No account. No subscription. No data farming.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container early-access-inner">
          <div className="eyebrow">early access</div>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.6rem)" }}>See what the analysis looks like before you commit.</h2>
          <p className="result-muted" style={{ maxWidth: "520px", margin: "var(--space-4) auto 0" }}>
            Run the full demo with sample data. No upload. No payment. All seven phases in under 30 seconds. Then decide if it&apos;s worth five bucks.
          </p>
          <div style={{ display: "flex", gap: "var(--space-4)", justifyContent: "center", flexWrap: "wrap", marginTop: "var(--space-6)" }}>
            <Link href="/demo" className="btn-primary btn-large">
              Try the demo →
            </Link>
            <Link href="/app" className="btn-ghost btn-large">
              Use your own resume
            </Link>
          </div>
          <p className="fine-print" style={{ marginTop: "var(--space-4)" }}>
            One payment. No account. No subscription.
          </p>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-inner">
          <Link href="/" className="brand-mark" aria-label="PassStack home" style={{ display: "inline-flex", justifyContent: "center" }}>
            <PassStackLogo />
          </Link>
          <div className="footer-links">
            <Link href="/app" className="btn-ghost">
              Open App
            </Link>
            <Link href="/app#workspace" className="btn-primary">
              Unlock — $5
            </Link>
            <a href={githubUrl} target="_blank" rel="noreferrer" className="btn-ghost">
              GitHub ↗
            </a>
            <a href="https://shanewilkey.com" target="_blank" rel="noreferrer" className="btn-ghost">
              Portfolio ↗
            </a>
            <a href="https://linkedin.com/in/shane-wilkey" target="_blank" rel="noreferrer" className="btn-ghost">
              LinkedIn ↗
            </a>
          </div>
          <p className="subtle-note">
            Built by{" "}
            <a href="https://shanewilkey.com" target="_blank" rel="noreferrer" style={{ color: "var(--ps-accent)", textDecoration: "none" }}>
              Shane Wilkey
            </a>
            {" "}· Wilkey Digital Solutions · Springfield, MO
          </p>
          <p className="subtle-note">No subscription. No account. No data farming.</p>
        </div>
      </footer>
    </main>
  );
}
