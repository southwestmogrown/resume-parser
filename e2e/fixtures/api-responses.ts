/**
 * Mock API response payloads for E2E tests.
 * Shapes match demoData.ts exports to stay consistent with real app fixtures.
 */

import type {
  ResumeData,
  MatchResult,
  GitHubProfile,
  LinkedInProfile,
  RewriteSuggestion,
  StudyItem,
  StarQuestion,
  StarAnswer,
  InterviewBrief,
  InterviewResponse,
  StarPrepResponse,
  BatchScoreResult,
} from "../../src/lib/types";

/* ── Resume extraction ─────────────────────────────────────────────── */

export const MOCK_RESUME_DATA: ResumeData = {
  name: "Jordan Rivera",
  summary:
    "Full-stack engineer specializing in React and Node.js applications, with a track record of shipping customer-facing features in fast-paced startup environments.",
  skills: [
    "TypeScript", "React", "Next.js", "Node.js", "PostgreSQL",
    "Docker", "REST APIs", "GraphQL", "Git", "Tailwind CSS",
  ],
  experience: [
    {
      title: "Software Engineer",
      company: "Streamline Labs",
      startDate: "Mar 2022",
      endDate: null,
      description:
        "Built and maintained customer-facing Next.js features, designed REST and GraphQL APIs in Node.js, and managed PostgreSQL schemas for a B2B SaaS product serving 500+ clients.",
    },
    {
      title: "Frontend Developer",
      company: "Pixel & Co.",
      startDate: "Jun 2020",
      endDate: "Feb 2022",
      description:
        "Developed responsive React interfaces for e-commerce and marketing clients, improving Core Web Vitals scores by an average of 30% across six major projects.",
    },
  ],
  education: [
    { degree: "B.S. Computer Science", institution: "State University", graduationYear: "2020" },
  ],
};

/* ── Scoring ───────────────────────────────────────────────────────── */

export const MOCK_MATCH_RESULT: MatchResult = {
  score: 72,
  matchedSkills: [
    "TypeScript", "React", "Next.js", "Node.js", "PostgreSQL",
    "REST APIs", "GraphQL", "Docker", "Tailwind CSS",
  ],
  missingSkills: [
    {
      skill: "5+ years experience",
      severity: "dealbreaker",
      reason: "Role requires 5+ years; Jordan has 4.",
    },
    {
      skill: "AWS",
      severity: "learnable",
      reason: "EC2, RDS, S3, and Lambda are learnable in weeks.",
    },
    {
      skill: "CI/CD pipelines",
      severity: "learnable",
      reason: "Setting up GitHub Actions or similar CI/CD is a weekend project.",
    },
  ],
  recommendation:
    "GOOD_FIT — Jordan matches 9 of 12 technical requirements and the gaps are addressable.",
  jobPostingFlags: [
    {
      flag: "Requirements inflation",
      severity: "warning",
      detail: "5+ years for technologies that are only 4 years old.",
    },
  ],
};

/** Match result with no posting flags for edge-case tests */
export const MOCK_MATCH_RESULT_NO_FLAGS: MatchResult = {
  ...MOCK_MATCH_RESULT,
  jobPostingFlags: [],
};

/** High-score result for color-check tests */
export const MOCK_MATCH_RESULT_HIGH: MatchResult = {
  ...MOCK_MATCH_RESULT,
  score: 88,
  recommendation: "STRONG_FIT — Excellent alignment across all key areas.",
};

/** Low-score result for color-check tests */
export const MOCK_MATCH_RESULT_LOW: MatchResult = {
  ...MOCK_MATCH_RESULT,
  score: 45,
  recommendation: "STRETCH — Significant gaps in required experience.",
};

/* ── Profiles ──────────────────────────────────────────────────────── */

export const MOCK_GITHUB_PROFILE: GitHubProfile = {
  username: "jordev",
  bio: "Full-stack engineer shipping React, Node.js, and DX tooling.",
  publicRepos: 24,
  followers: 182,
  topLanguages: ["TypeScript", "JavaScript", "SQL"],
  repos: [
    { name: "workflow-ops", description: "Internal tooling for workflow automation.", language: "TypeScript", stars: 64, url: "https://github.com/jordev/workflow-ops" },
    { name: "deploy-pipeline-demo", description: "CI/CD demo with GitHub Actions.", language: "TypeScript", stars: 29, url: "https://github.com/jordev/deploy-pipeline-demo" },
    { name: "postgres-playbook", description: "Postgres tuning notes.", language: "SQL", stars: 17, url: "https://github.com/jordev/postgres-playbook" },
  ],
};

export const MOCK_LINKEDIN_PROFILE: LinkedInProfile = {
  name: "Jordan Rivera",
  headline: "Full-Stack Engineer building React + Node.js SaaS products",
  currentRole: "Software Engineer",
  currentCompany: "Streamline Labs",
  skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "GraphQL", "Product Thinking"],
  summary: "Engineer focused on customer-facing SaaS products.",
  education: ["B.S. Computer Science, State University, 2020"],
};

/* ── Rewrites ──────────────────────────────────────────────────────── */

export const MOCK_REWRITE_SUGGESTIONS: RewriteSuggestion[] = [
  {
    originalRole: "Software Engineer @ Streamline Labs",
    originalBullet:
      "Built and maintained customer-facing Next.js features, designed REST and GraphQL APIs in Node.js, and managed PostgreSQL schemas for a B2B SaaS product serving 500+ clients.",
    rewrittenBullet:
      "Architected and shipped customer-facing features on a Next.js + Node.js platform serving 500+ enterprise clients.",
    rationale: "Mirrors the JD's emphasis on scalable REST APIs.",
  },
  {
    originalRole: "Frontend Developer @ Pixel & Co.",
    originalBullet:
      "Developed responsive React interfaces for e-commerce and marketing clients, improving Core Web Vitals scores by an average of 30% across six major projects.",
    rewrittenBullet:
      "Led frontend development across 6 client projects using React and TypeScript, delivering 30% improvement in Core Web Vitals.",
    rationale: "Reframes agency work as leadership experience.",
  },
];

/* ── Study plan ────────────────────────────────────────────────────── */

export const MOCK_STUDY_ITEMS: StudyItem[] = [
  {
    skill: "AWS",
    severity: "learnable",
    action: "Deploy a Next.js app on EC2 with RDS PostgreSQL and S3 for static assets.",
    resource: "AWS Free Tier + official Getting Started guides (aws.amazon.com/free)",
  },
  {
    skill: "CI/CD pipelines",
    severity: "learnable",
    action: "Set up GitHub Actions for your AWS-deployed project.",
    resource: "GitHub Actions documentation (docs.github.com/en/actions)",
  },
];

/* ── Cover letter ──────────────────────────────────────────────────── */

export const MOCK_COVER_LETTER = `Dear Hiring Team at Nexova,

I'm writing to express my strong interest in the Senior Full-Stack Engineer position.

**Why I'm a strong fit:**

At Streamline Labs, I've spent the past two years architecting and shipping features for a B2B SaaS platform serving 500+ enterprise clients.

Best regards,
Jordan Rivera`;

/* ── STAR prep ─────────────────────────────────────────────────────── */

export const MOCK_STAR_QUESTIONS: StarQuestion[] = [
  {
    id: "q1",
    question: "Tell me about a time you had to quickly learn a new technology to deliver a critical feature.",
    targetSkill: "AWS",
    difficulty: "standard",
  },
  {
    id: "q2",
    question: "Describe a situation where a deployment went wrong. What happened and how did you fix it?",
    targetSkill: "CI/CD pipelines",
    difficulty: "probing",
  },
  {
    id: "q3",
    question: "Give me an example of a significant performance improvement you drove.",
    targetSkill: "System performance",
    difficulty: "standard",
  },
];

export const MOCK_STAR_ANSWER: StarAnswer = {
  questionId: "q1",
  question: "Tell me about a time you had to quickly learn a new technology to deliver a critical feature.",
  situation: "Our team needed to deploy a new service to AWS.",
  task: "I was tasked with learning AWS in two weeks.",
  action: "I completed AWS certifications and built a prototype.",
  result: "We successfully deployed the service on time.",
  coachingNotes: "Great structure! Consider adding specific metrics.",
};

/* ── Interview (Phase 0) ──────────────────────────────────────────── */

export const MOCK_INTERVIEW_FIRST_RESPONSE: InterviewResponse = {
  message: "Tell me about your most impactful project at Streamline Labs. What did you build and what was the measurable outcome?",
  interview_complete: false,
};

export const MOCK_INTERVIEW_SECOND_RESPONSE: InterviewResponse = {
  message: "Great detail. Now tell me about a technical challenge you overcame.",
  interview_complete: false,
};

export const MOCK_INTERVIEW_COMPLETE: InterviewResponse = {
  message: "Excellent. I have everything I need to enrich your resume.",
  interview_complete: true,
  brief: {
    interview_complete: true,
    enriched_experiences: [
      {
        company: "Streamline Labs",
        role: "Software Engineer",
        impact: ["Reduced API latency by 60%", "Served 500+ enterprise clients"],
        technologies: ["TypeScript", "Next.js", "PostgreSQL"],
        story: "Owned end-to-end API performance project that unblocked a Q3 enterprise deal.",
      },
    ],
    additional_skills: ["System Design", "Performance Optimization"],
    notable_context: "Strong product sense from working directly with enterprise customers.",
  } satisfies InterviewBrief,
};

/* ── Star prep coaching ────────────────────────────────────────────── */

export const MOCK_STAR_PREP_CONTINUE: StarPrepResponse = {
  message: "Good start. Can you be more specific about the timeline and what exactly you did?",
  question_complete: false,
};

export const MOCK_STAR_PREP_COMPLETE: StarPrepResponse = {
  message: "Excellent STAR answer! Here's your structured response.",
  question_complete: true,
  answer: MOCK_STAR_ANSWER,
};

/* ── Optimized resume ──────────────────────────────────────────────── */

export const MOCK_OPTIMIZED_RESUME = `# Jordan Rivera
[email] | github.com/jordev

## Summary
Full-stack engineer who shipped customer-facing features to 500+ enterprise clients.

## Skills
TypeScript, React, Next.js, Node.js, PostgreSQL, REST APIs, GraphQL, Docker

## Experience

### Software Engineer — Streamline Labs (Mar 2022 – Present)
- Architected and shipped customer-facing features on a Next.js + Node.js platform serving 500+ enterprise clients.

### Frontend Developer — Pixel & Co. (Jun 2020 – Feb 2022)
- Led frontend development across 6 client projects using React and TypeScript.

## Education
B.S. Computer Science — State University, 2020`;

/* ── Payment ───────────────────────────────────────────────────────── */

export const MOCK_PAYMENT_INTENT = {
  clientSecret: "pi_test_secret_123",
  paymentIntentId: "pi_test_123",
};

export const MOCK_TOKEN_RESPONSE = {
  token: "test-token-abc123",
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

/* ── Batch scoring ─────────────────────────────────────────────────── */

export const MOCK_BATCH_RESULTS: BatchScoreResult[] = [
  {
    jobTitle: "Senior Full-Stack Engineer",
    company: "Nexova",
    score: 72,
    matchedSkills: ["TypeScript", "React", "Node.js"],
    topGaps: [{ skill: "AWS", severity: "learnable", reason: "Learnable in weeks." }],
    recommendation: "GOOD_FIT — Strong alignment.",
    jobDescription: "Nexova is seeking a Senior Full-Stack Engineer...",
  },
  {
    jobTitle: "Frontend Lead",
    company: "Acme Corp",
    score: 85,
    matchedSkills: ["TypeScript", "React", "Next.js", "Tailwind CSS"],
    topGaps: [{ skill: "Team management", severity: "soft", reason: "Nice to have." }],
    recommendation: "STRONG_FIT — Excellent frontend match.",
    jobDescription: "Acme Corp is hiring a Frontend Lead...",
  },
  {
    jobTitle: "Backend Engineer",
    company: "DataFlow Inc",
    score: 55,
    matchedSkills: ["Node.js", "PostgreSQL"],
    topGaps: [{ skill: "Java", severity: "dealbreaker", reason: "Primary language requirement." }],
    recommendation: "STRETCH — Missing primary language requirement.",
    jobDescription: "DataFlow Inc is looking for a Backend Engineer...",
  },
];

/* ── Job description ───────────────────────────────────────────────── */

export const MOCK_JOB_DESCRIPTION = `Nexova is seeking a Senior Full-Stack Engineer to join our growing team building the next generation of workflow automation for enterprises.

Requirements:
- 5+ years of professional software development experience
- Strong proficiency in TypeScript, React, and Node.js
- Production experience with PostgreSQL and relational databases
- Hands-on experience with AWS services (EC2, RDS, S3, Lambda)
- Demonstrable experience with CI/CD pipelines and deployment automation

Nice-to-haves:
- Experience with GraphQL and modern frontend frameworks
- Familiarity with Docker and containerization`;

/* ── LocalStorage workspace state seed ─────────────────────────────── */

export function buildWorkspaceState(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    resumeData: MOCK_RESUME_DATA,
    matchResult: MOCK_MATCH_RESULT,
    jobDescriptions: [MOCK_JOB_DESCRIPTION],
    rewriteSuggestions: null,
    studyItems: null,
    coverLetter: null,
    coverLetterBlocked: null,
    batchResults: null,
    githubProfile: null,
    linkedinProfile: null,
    analysisToken: null,
    tokenExpiresAt: null,
    interviewBrief: null,
    enrichedResumeData: null,
    starQuestions: [],
    starAnswers: [],
    activeStarQuestion: null,
    starMessages: [],
    interviewMessages: [],
    optimizedResume: null,
    ...overrides,
  };
}

/** Fully-unlocked workspace with all paid content populated */
export function buildFullWorkspaceState(): Record<string, unknown> {
  return buildWorkspaceState({
    analysisToken: MOCK_TOKEN_RESPONSE.token,
    tokenExpiresAt: MOCK_TOKEN_RESPONSE.expiresAt,
    rewriteSuggestions: MOCK_REWRITE_SUGGESTIONS,
    studyItems: MOCK_STUDY_ITEMS,
    coverLetter: MOCK_COVER_LETTER,
    starQuestions: MOCK_STAR_QUESTIONS,
    starAnswers: [MOCK_STAR_ANSWER],
    optimizedResume: MOCK_OPTIMIZED_RESUME,
  });
}
