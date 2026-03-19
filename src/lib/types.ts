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

// Match scoring output from Claude phase 2
export interface MatchResult {
  score: number; // 0-100
  matchedSkills: string[];
  missingSkills: string[];
  recommendation: string;
}

// API request/response shapes
export interface AnalysisRequest {
  resume: string; // base64-encoded PDF
  jobDescription: string;
}

export interface AnalysisResponse {
  resumeData: ResumeData;
  matchResult: MatchResult;
}
