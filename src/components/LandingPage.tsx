"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

const testimonials = [
  { id: 'placeholder-1' },
  { id: 'placeholder-2' },
  { id: 'placeholder-3' },
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
            <span>Pass</span>
            <span>Stack</span>
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
              <Link href="/app" className="btn-ghost btn-large">
                Open the app
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
              Built by someone who was tired of the same tools you&apos;re tired of.
            </h2>
            <p>
              I built PassStack because the existing options felt like a tax on people already doing the hard part. Too expensive. Too vague. Too much polished nonsense around a weak result.
            </p>
            <p>
              The point here is simple: make the workaround for a broken hiring system cheap enough that people will actually use it. That&apos;s why it&apos;s $5. One time. No subscription. No account. Just the analysis.
            </p>
            <p>
              PassStack is a Wilkey Digital Solutions product. No ads. No data farming. Nothing to cancel.
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
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.6rem)" }}>Be one of the first.</h2>
          <p className="result-muted" style={{ maxWidth: "520px", margin: "var(--space-4) auto 0" }}>
            PassStack is in beta. Open the app, run the analysis, and tell us what still feels broken.
          </p>
          <div style={{ marginTop: "var(--space-6)" }}>
            <Link href="/app" className="btn-primary btn-large">
              Open the app
            </Link>
          </div>
          <div className="placeholder-grid">
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.id}
                className="placeholder-card reveal"
                data-reveal
                style={{ "--delay": `${index * 80}ms` } as React.CSSProperties}
              >
                [ testimonial coming ]
              </div>
            ))}
          </div>
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
