import type {
  BatchScoreResult,
  GitHubProfile,
  MatchResult,
  ResumeData,
  RewriteSuggestion,
  StudyItem,
} from "@/lib/types";

export const sampleResumeData: ResumeData = {
  name: "Jordan Rivera",
  summary: "Full-stack engineer with strong TypeScript and Next.js experience.",
  skills: ["TypeScript", "Next.js", "Node.js"],
  experience: [
    {
      title: "Software Engineer",
      company: "Streamline Labs",
      startDate: "Jan 2022",
      endDate: null,
      description: "Built customer-facing workflows and APIs.",
    },
  ],
  education: [
    {
      degree: "B.S. Computer Science",
      institution: "State University",
      graduationYear: "2020",
    },
  ],
};

export const sampleMatchResult: MatchResult = {
  score: 78,
  matchedSkills: ["TypeScript", "Next.js"],
  missingSkills: [
    {
      skill: "AWS",
      severity: "learnable",
      reason: "Cloud experience is still missing.",
    },
    {
      skill: "5+ years experience",
      severity: "dealbreaker",
      reason: "The role asks for more years of experience.",
    },
    {
      skill: "Mentoring",
      severity: "soft",
      reason: "Helpful but not required.",
    },
  ],
  recommendation: "Apply, but address the experience gap directly.",
};

export const sampleRewriteSuggestions: RewriteSuggestion[] = [
  {
    originalRole: "Software Engineer @ Streamline Labs",
    originalBullet: "Built customer-facing workflows and APIs.",
    rewrittenBullet: "Shipped customer-facing Next.js workflows and APIs aligned to the role.",
    rationale: "Matches the target stack more directly.",
  },
];

export const sampleStudyItems: StudyItem[] = [
  {
    skill: "AWS",
    severity: "learnable",
    action: "Deploy a side project to AWS.",
    resource: "AWS docs",
  },
];

export const sampleGitHubProfile: GitHubProfile = {
  username: "jordan",
  bio: "Builder",
  publicRepos: 12,
  followers: 5,
  topLanguages: ["TypeScript", "JavaScript"],
  repos: [
    {
      name: "resume-parser",
      description: "A cool app",
      language: "TypeScript",
      stars: 4,
      url: "https://github.com/jordan/resume-parser",
    },
  ],
};

export const sampleBatchResult: BatchScoreResult = {
  jobTitle: "Senior Engineer",
  company: "Nexova",
  score: 78,
  matchedSkills: sampleMatchResult.matchedSkills,
  topGaps: sampleMatchResult.missingSkills,
  recommendation: sampleMatchResult.recommendation,
  jobDescription: "Nexova is seeking a Senior Engineer",
};
