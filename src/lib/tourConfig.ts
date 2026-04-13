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
      "Let's walk through PassStack step by step. Upload a resume, paste a job description, and review the full analysis. We'll show you everything, then you can try it yourself.",
    targetSelector: "body",
    placement: "center",
    autoAdvanceMs: 0, // manual
  },
  {
    title: "Upload your resume",
    description:
      "Drop a PDF here. PassStack starts with your resume, extracts the structure, and sets up the rest of the workflow from that single source of truth.",
    targetSelector: ".tour-target-resume-upload",
    placement: "bottom",
    autoAdvanceMs: 3500,
  },
  {
    title: "Paste a job description",
    description:
      "Paste the job description you're targeting. You can add up to 6 at once for batch comparison. The more specific the posting, the more useful the analysis.",
    targetSelector: ".tour-target-job-input",
    placement: "left",
    autoAdvanceMs: 3500,
  },
  {
    title: "GitHub context",
    description:
      "GitHub is optional, but it helps PassStack see what you actually ship — repos, languages, and public proof of work.",
    targetSelector: ".tour-target-github-input",
    placement: "bottom",
    autoAdvanceMs: 3000,
  },
  {
    title: "LinkedIn context",
    description:
      "LinkedIn is optional too. It adds role history, education, and softer signals that won't show up cleanly in a PDF alone.",
    targetSelector: ".tour-target-linkedin-url",
    placement: "bottom",
    autoAdvanceMs: 3000,
  },
  {
    title: "Run the analysis",
    description:
      "Click Analyze. Phase 1 extracts your resume data. Phase 2 scores you against the job description — both free, no account required.",
    targetSelector: ".tour-analyze-button",
    placement: "top",
    autoAdvanceMs: 2500,
  },
  {
    title: "Your match score",
    description:
      "Here's your 72% match. PassStack breaks down every gap by severity: red for dealbreakers, amber for learnable skills, green for soft gaps. The recommendation at the top tells you whether to apply.",
    targetSelector: ".tour-anchor-score",
    placement: "right",
    autoAdvanceMs: 4000,
  },
  {
    title: "Unlock the full analysis",
    description:
      "A one-time $5 payment unlocks bullet rewrites tailored to the JD, a structured study plan, a cover letter draft, and STAR interview coaching. The score is always free.",
    targetSelector: ".tour-anchor-interview-paygate .tour-pay-button",
    placement: "bottom",
    autoAdvanceMs: 3500,
    // NOTE: do NOT auto-click the unlock button — that would open the payment modal mid-tour.
    // analysisToken is set via handleTourNext directly (no onActivate here).
  },
  {
    title: "Bullet rewrites",
    description:
      "Your resume bullets get rewritten to mirror exactly what the job description asks for. Each rewrite shows the before, the after, and the reasoning — so you learn the pattern, not just the output.",
    targetSelector: ".tour-tab-rewrites",
    placement: "bottom",
    autoAdvanceMs: 4000,
  },
  {
    title: "Study plan",
    description:
      "For every learnable gap, you get a specific action to close it and a real resource — not generic advice. Gap severity determines how much effort to invest.",
    targetSelector: ".tour-tab-study",
    placement: "bottom",
    autoAdvanceMs: 4000,
  },
  {
    title: "Cover letter draft",
    description:
      "A streaming cover letter draft, addressable to the specific role and company. If dealbreakers exist, it blocks early with a clear explanation — no point applying if the fit is too far off.",
    targetSelector: ".tour-tab-cover",
    placement: "bottom",
    autoAdvanceMs: 4000,
  },
  {
    title: "STAR interview coaching",
    description:
      "Behavioral interview prep powered by the gap analysis. PassStack generates tailored STAR questions targeting your specific weaknesses, then coaches you through building strong answers — one question at a time.",
    targetSelector: ".tour-tab-interview",
    placement: "bottom",
    autoAdvanceMs: 4000,
  },
  {
    title: "Export everything",
    description:
      "Download a .zip with your cover letter, rewritten bullets, study plan, and match report. All your materials in one place, ready to use.",
    targetSelector: ".tour-export-btn",
    placement: "bottom",
    autoAdvanceMs: 0, // manual end
  },
];
