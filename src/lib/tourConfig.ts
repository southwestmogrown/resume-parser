export interface TourStep {
  /** Visible title shown in tooltip header */
  title: string;
  /** Body text shown in tooltip */
  description: string;
  /** CSS selector for the element to spotlight */
  targetSelector: string;
  /** Preferred placement of the tooltip card */
  placement?: "top" | "bottom" | "left" | "right" | "center";
  /** Auto-advance delay in ms (0 = manual only) */
  autoAdvanceMs?: number;
  /** Optional action to fire when step activates */
  onActivate?: () => void;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to the demo",
    description:
      "Let's walk you through what PassStack does — step by step. Upload a resume, paste a job description, and get a full battle plan. We'll show you everything, then you can try it yourself.",
    targetSelector: "body",
    placement: "center",
    autoAdvanceMs: 0, // manual
  },
  {
    title: "Upload your resume",
    description:
      "Drop a PDF here. PassStack extracts your skills, experience, and education using Claude — no data stored, processed entirely in memory.",
    targetSelector: ".upload-dropzone",
    placement: "bottom",
    autoAdvanceMs: 3500,
    onActivate: () => {
      // Simulate a file being "dropped" by setting the resume filename display
      const chip = document.querySelector<HTMLElement>(".file-chip");
      if (chip) chip.style.display = "flex";
    },
  },
  {
    title: "Paste a job description",
    description:
      "Paste the job description you're targeting. You can add up to 6 at once for batch comparison. The more specific, the sharper the analysis.",
    targetSelector: ".textarea-field",
    placement: "top",
    autoAdvanceMs: 3500,
    onActivate: () => {
      const ta = document.querySelector<HTMLTextAreaElement>(".textarea-field");
      if (ta) {
        ta.value =
          "Nexova is seeking a Senior Full-Stack Engineer to join our growing team building the next generation of workflow automation for enterprises. You'll work on our B2B SaaS platform that helps Fortune 500 companies streamline their operational processes.\n\nRequirements:\n- 5+ years of professional software development experience\n- Strong proficiency in TypeScript, React, and Node.js\n- Production experience with PostgreSQL and relational databases\n- Hands-on experience with AWS services (EC2, RDS, S3, Lambda)\n- Demonstrable experience with CI/CD pipelines and deployment automation\n- Expertise in designing scalable REST APIs and system architecture\n- Bachelor's degree in Computer Science or equivalent experience\n\nNice-to-haves:\n- Experience with GraphQL and modern frontend frameworks\n- Familiarity with Docker and containerization\n- Knowledge of Tailwind CSS and modern CSS approaches\n- Open-source contributions or portfolio projects\n- Experience mentoring junior engineers";
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      }
    },
  },
  {
    title: "GitHub & LinkedIn (optional)",
    description:
      "Connect your GitHub or LinkedIn to enrich the analysis with real activity data. GitHub shows your top repos and languages. LinkedIn surfaces education and soft skills. Both are optional — the score works without them.",
    targetSelector: ".panel-stack",
    placement: "right",
    autoAdvanceMs: 0, // manual — user might want to click
  },
  {
    title: "Run the analysis",
    description:
      "Click Analyze. Phase 1 extracts your resume data. Phase 2 scores you against the job description — both free, no account required.",
    targetSelector: ".btn-large",
    placement: "top",
    autoAdvanceMs: 2500,
    onActivate: () => {
      const btn = document.querySelector<HTMLButtonElement>(".btn-large");
      if (btn) btn.click();
    },
  },
  {
    title: "Your match score",
    description:
      "Here's your 72% match. PassStack breaks down every gap by severity: red for dealbreakers, amber for learnable skills, green for soft gaps. The recommendation at the top tells you whether to apply.",
    targetSelector: ".workspace-sidebar",
    placement: "right",
    autoAdvanceMs: 4000,
  },
  {
    title: "Unlock the full battle plan",
    description:
      "One-time $5 payment unlocks everything: bullet rewrites tailored to the JD, a structured study plan, a cover letter draft, and STAR interview coaching. Score is always free.",
    targetSelector: ".paygate-card",
    placement: "left",
    autoAdvanceMs: 3500,
    // NOTE: do NOT auto-click the unlock button — that would open the payment modal mid-tour.
    // analysisToken is set via handleTourNext directly (no onActivate here).
  },
  {
    title: "Bullet rewrites",
    description:
      "Your resume bullets get rewritten to mirror exactly what the job description asks for. Each rewrite shows the before, the after, and the reasoning — so you learn the pattern, not just the output.",
    targetSelector: ".result-tab:nth-child(1)",
    placement: "bottom",
    autoAdvanceMs: 4000,
    onActivate: () => {
      const tab = document.querySelector<HTMLButtonElement>('.result-tab:nth-child(1)');
      if (tab) tab.click();
    },
  },
  {
    title: "Study plan",
    description:
      "For every learnable gap, you get a specific action to close it and a real resource — not generic advice. Gap severity determines how much effort to invest.",
    targetSelector: ".result-tab:nth-child(2)",
    placement: "bottom",
    autoAdvanceMs: 4000,
    onActivate: () => {
      const tab = document.querySelector<HTMLButtonElement>('.result-tab:nth-child(2)');
      if (tab) tab.click();
    },
  },
  {
    title: "Cover letter draft",
    description:
      "A streaming cover letter draft, addressable to the specific role and company. If dealbreakers exist, it blocks early with a clear explanation — no point applying if the fit is too far off.",
    targetSelector: ".result-tab:nth-child(3)",
    placement: "bottom",
    autoAdvanceMs: 4000,
    onActivate: () => {
      const tab = document.querySelector<HTMLButtonElement>('.result-tab:nth-child(3)');
      if (tab) tab.click();
    },
  },
  {
    title: "STAR interview coaching",
    description:
      "Behavioral interview prep powered by the gap analysis. PassStack generates tailored STAR questions targeting your specific weaknesses, then coaches you through building strong answers — one question at a time.",
    targetSelector: ".result-tab:nth-child(4)",
    placement: "top",
    autoAdvanceMs: 4000,
    onActivate: () => {
      const tab = document.querySelector<HTMLButtonElement>('.result-tab:nth-child(4)');
      if (tab) tab.click();
    },
  },
  {
    title: "Export everything",
    description:
      "Download a .zip with your cover letter, rewritten bullets, study plan, and match report. All your materials in one place, ready to use.",
    targetSelector: ".tour-export-btn",
    placement: "top",
    autoAdvanceMs: 0, // manual end
  },
];
