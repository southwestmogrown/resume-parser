// Extracted resume data from Claude phase 1
export interface ResumeData {
  name: string;
  summary: string;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
}

export interface ExperienceEntry {
  title: string;
  company: string;
  startDate: string;
  endDate: string | null; // null means current
  description: string;
}

export interface EducationEntry {
  degree: string;
  institution: string;
  graduationYear: string;
}

// Gap severity tiers for missing skills
export type GapSeverity = "dealbreaker" | "learnable" | "soft";

export interface MissingSkill {
  skill: string;
  severity: GapSeverity;
  reason: string; // brief explanation of why this severity
}

// Match scoring output from Claude phase 2
export interface MatchResult {
  score: number; // 0-100
  matchedSkills: string[];
  missingSkills: MissingSkill[];
  recommendation: string;
}

// Resume bullet rewrite suggestions (phase 3)
export interface RewriteSuggestion {
  originalRole: string; // "Software Engineer @ Streamline Labs"
  originalBullet: string;
  rewrittenBullet: string;
  rationale: string; // why this rewrite helps
}

export interface RewriteRequest {
  resumeData: ResumeData;
  jobDescription: string;
}

export interface RewriteResponse {
  suggestions: RewriteSuggestion[];
}

// Cover letter generation
export interface CoverLetterRequest {
  resumeData: ResumeData;
  matchResult: MatchResult;
  jobDescription: string;
}

export interface CoverLetterResponse {
  coverLetter: string; // markdown
}

// Study plan for learnable gaps
export interface StudyItem {
  skill: string;
  severity: GapSeverity;
  action: string; // concrete 1-2 sentence recommendation
  resource: string; // specific resource name/URL
}

export interface StudyPlanRequest {
  matchResult: MatchResult;
  resumeData: ResumeData;
}

export interface StudyPlanResponse {
  items: StudyItem[];
}

// GitHub profile integration
export interface GitHubProfile {
  username: string;
  bio: string | null;
  publicRepos: number;
  followers: number;
  topLanguages: string[];
  repos: GitHubRepo[];
}

export interface GitHubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  url: string;
}

export interface GitHubProfileResponse {
  profile: GitHubProfile;
}

// Batch mode
export interface BatchScoreResult {
  jobTitle: string;
  company: string;
  score: number;
  matchedSkills: string[];
  topGaps: MissingSkill[];
  recommendation: string;
  jobDescription: string; // original JD for drill-down
}

export interface BatchScoreResponse {
  results: BatchScoreResult[];
}

// Split route request/response shapes
export interface ExtractRequest {
  resume: string; // base64-encoded PDF
}

export interface ExtractResponse {
  resumeData: ResumeData;
}

export interface ScoreRequest {
  resumeData: ResumeData;
  jobDescription: string;
}

export interface ScoreResponse {
  matchResult: MatchResult;
}
