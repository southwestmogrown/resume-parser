"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PassStackLogo from "@/components/PassStackLogo";
import ScoreRing from "@/components/ScoreRing";
import SeverityPill from "@/components/SeverityPill";

const phases = [
  {
    number: "01",
    title: "Match Score",
    body: "Percentage match against the job description. See exactly where you stand before you apply.",
  },
  {
    number: "02",
    title: "Gap Analysis",
    body: "Every missing skill ranked by severity — dealbreaker, learnable, or soft. No more guessing what's killing your application.",
  },
  {
    number: "03",
    title: "Bullet Rewrites",
    body: "Your experience, reframed for the role. Before and after for every relevant bullet. Copy and paste.",
  },
  {
    number: "04",
    title: "Cover Letter + Study Plan",
    body: "A tailored cover letter draft and a concrete study plan for the gaps worth closing.",
  },
] as const;

const steps = [
  {
    number: "01",
    title: "Upload your resume",
    body: "PDF drag-and-drop. Nothing is stored longer than it needs to be.",
  },
  {
    number: "02",
    title: "Paste the JD",
    body: "Any job posting. Copy the whole thing so the analysis has something real to work with.",
  },
  {
    number: "03",
    title: "Get your analysis",
    body: "Full report in under 60 seconds. Match score, gaps, rewrites, cover letter, study plan.",
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
            <Link href="/app#workspace" className="btn-primary">
              Unlock — $5 →
            </Link>
          </div>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">resume intelligence</div>
            <h1 className="display">Stop guessing why you&apos;re getting ghosted.</h1>
            <p>
              Upload your resume. Paste the job description. Get the real analysis — not keyword stuffing.
            </p>
            <div className="hero-actions">
              <Link href="/app#workspace" className="btn-primary btn-large">
                Unlock Full Analysis — $5 →
              </Link>
              <Link href="/app?demo" className="btn-ghost btn-large">
                Try the demo →
              </Link>
            </div>
            <p className="fine-print" style={{ marginTop: "var(--space-3)" }}>
              One-time payment. No account. No subscription.
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
          <div className="prose-block">
            <h2 style={{ fontSize: "clamp(2.2rem, 5vw, 2.9rem)", lineHeight: 1.05 }}>
              ATS systems reject 75% of resumes before a human reads them.
            </h2>
            <p>
              Most resume tools charge $20–$50 a month for glorified keyword counters. They don&apos;t tell you why you&apos;re getting filtered. They don&apos;t rewrite your bullets. They don&apos;t generate a cover letter that actually fits the role.
            </p>
            <p>You&apos;re not underqualified. You&apos;re under-optimized.</p>
            <p>
              PassStack runs the full analysis for $5. One time. No subscription. No account required.
            </p>
          </div>
          <div className="pull-quote">&quot;You&apos;re not underqualified. You&apos;re under-optimized.&quot;</div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="eyebrow">what $5 gets you</div>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.6rem)", marginBottom: "var(--space-8)" }}>
            Four phases. One run. No fluff.
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
            Real output. Not a keyword report — a full battle plan.
          </p>

          <div className="screenshot-gallery" data-reveal>
            <div className="screenshot-item">
              <div className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>phase 02 — gap analysis</div>
              <img
                src="/assets/images/PassStack-Score-Results.png"
                alt="PassStack gap analysis scorecard showing matched skills and severity-tiered gaps"
                className="screenshot-img"
              />
            </div>
            <div className="screenshot-item">
              <div className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>phase 03 — bullet rewrites</div>
              <img
                src="/assets/images/PassStack-Bullet-Rewrites.png"
                alt="PassStack bullet rewrite output showing before and after resume bullets"
                className="screenshot-img"
              />
            </div>
            <div className="screenshot-item">
              <div className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>phase 03 — study plan</div>
              <img
                src="/assets/images/PassStack-Study-Plan.png"
                alt="PassStack study plan showing actionable gap-closing recommendations"
                className="screenshot-img"
              />
            </div>
            <div className="screenshot-item">
              <div className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>phase 04 — cover letter</div>
              <img
                src="/assets/images/PassStack-Cover-Letter.png"
                alt="PassStack cover letter draft tailored to the job description"
                className="screenshot-img"
              />
            </div>
          </div>

          <div className="no-go-callout" data-reveal style={{ marginTop: "var(--space-12)" }}>
            <div className="no-go-callout__text">
              <div className="eyebrow" style={{ color: "var(--ps-red)", marginBottom: "var(--space-3)" }}>honest by design</div>
              <h3 style={{ fontSize: "clamp(1.4rem, 3vw, 1.8rem)", lineHeight: 1.2, marginBottom: "var(--space-4)" }}>
                Sometimes the analysis tells you not to apply.
              </h3>
              <p className="result-muted">
                When dealbreaker gaps exist — hard requirements you genuinely don&apos;t meet — PassStack says so. No manufactured enthusiasm. No cover letter for a role you won&apos;t get. Just the honest verdict, and a better target.
              </p>
              <p className="result-muted" style={{ marginTop: "var(--space-3)" }}>
                That&apos;s not a bug. That&apos;s the whole point.
              </p>
            </div>
            <div className="no-go-callout__img">
              <img
                src="/assets/images/PassStack-No-Go-Suggestion.png"
                alt="PassStack dealbreaker analysis showing why a candidate should not apply for a role"
                className="screenshot-img"
              />
            </div>
          </div>

          <div style={{ marginTop: "var(--space-8)", textAlign: "center" }}>
            <Link href="/app?demo" className="btn-ghost">
              Try the demo — see all four phases →
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

      <section className="section section-surface">
        <div className="container">
          <div className="eyebrow">why passstack exists</div>
          <div className="prose-block">
            <h2 className="display" style={{ fontSize: "clamp(2rem, 4vw, 2.4rem)" }}>
              I&apos;m still working production shifts. I built this while I was working them.
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
            <p className="subtle-note" style={{ marginTop: "var(--space-4)" }}>
              Wilkey Digital Solutions
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ textAlign: "center" }}>
          <div className="eyebrow">early access</div>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.6rem)" }}>Not ready to upload your resume?</h2>
          <p className="result-muted" style={{ maxWidth: "520px", margin: "var(--space-4) auto 0" }}>
            Try it with sample data first. No upload required — the full analysis runs in under 30 seconds.
          </p>
          <div style={{ display: "flex", gap: "var(--space-4)", justifyContent: "center", flexWrap: "wrap", marginTop: "var(--space-6)" }}>
            <Link href="/app?demo" className="btn-primary btn-large">
              Try the demo →
            </Link>
            <Link href="/app" className="btn-ghost btn-large">
              Use your own resume
            </Link>
          </div>
          <p className="fine-print" style={{ marginTop: "var(--space-4)" }}>
            One-time payment. No account. No subscription.
          </p>
        </div>
      </section>

      <footer className="section">
        <div className="container" style={{ display: "grid", gap: "var(--space-6)" }}>
          <p className="subtle-note">PassStack · Wilkey Digital Solutions · Springfield, MO</p>
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
          </div>
          <p className="subtle-note">No subscription. No account. No data farming.</p>
        </div>
      </footer>
    </main>
  );
}
