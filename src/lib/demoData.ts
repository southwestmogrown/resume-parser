import type { ResumeData, MatchResult } from "@/lib/types";

export const DEMO_RESUME_DATA: ResumeData = {
  name: "Jordan Rivera",
  summary:
    "Full-stack engineer specializing in React and Node.js applications, with a track record of shipping customer-facing features in fast-paced startup environments.",
  skills: [
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "PostgreSQL",
    "Docker",
    "REST APIs",
    "GraphQL",
    "Git",
    "Tailwind CSS",
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
    {
      degree: "B.S. Computer Science",
      institution: "State University",
      graduationYear: "2020",
    },
  ],
};

export const DEMO_MATCH_RESULT: MatchResult = {
  score: 72,
  matchedSkills: [
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "PostgreSQL",
    "REST APIs",
    "GraphQL",
    "Docker",
    "Tailwind CSS",
  ],
  missingSkills: ["AWS", "CI/CD pipelines", "5+ years experience"],
  recommendation:
    "Jordan is a strong technical match for this role, with hands-on experience in the core stack including TypeScript, React, Node.js, and PostgreSQL. The main gaps are cloud infrastructure (AWS) and the seniority bar — Jordan has 4 years of experience versus the 5+ required. With cloud upskilling, Jordan would be a compelling candidate.",
};

export const DEMO_JOB_DESCRIPTION: string = `Nexova is seeking a Senior Full-Stack Engineer to join our growing team building the next generation of workflow automation for enterprises. You'll work on our B2B SaaS platform that helps Fortune 500 companies streamline their operational processes.

Requirements:
- 5+ years of professional software development experience
- Strong proficiency in TypeScript, React, and Node.js
- Production experience with PostgreSQL and relational databases
- Hands-on experience with AWS services (EC2, RDS, S3, Lambda)
- Demonstrable experience with CI/CD pipelines and deployment automation
- Expertise in designing scalable REST APIs and system architecture
- Bachelor's degree in Computer Science or equivalent experience

Nice-to-haves:
- Experience with GraphQL and modern frontend frameworks
- Familiarity with Docker and containerization
- Knowledge of Tailwind CSS and modern CSS approaches
- Open-source contributions or portfolio projects
- Experience mentoring junior engineers

You'll collaborate with product managers, designers, and other engineers to ship features that power mission-critical workflows for our customers. We offer competitive compensation, comprehensive benefits, and the opportunity to work on challenging technical problems in a fast-moving startup environment.`;
