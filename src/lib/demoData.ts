import type { ResumeData, MatchResult, RewriteSuggestion, StudyItem } from "@/lib/types";

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
  missingSkills: [
    {
      skill: "5+ years experience",
      severity: "dealbreaker",
      reason: "Role requires 5+ years; Jordan has 4. Some companies are strict on this, especially for senior titles.",
    },
    {
      skill: "AWS",
      severity: "learnable",
      reason: "EC2, RDS, S3, and Lambda are learnable in weeks with focused study. Docker experience provides a foundation for cloud deployment.",
    },
    {
      skill: "CI/CD pipelines",
      severity: "learnable",
      reason: "Setting up GitHub Actions or similar CI/CD is a weekend project. Jordan likely has informal exposure through team workflows.",
    },
  ],
  recommendation:
    "GOOD_FIT — Jordan matches 9 of 12 technical requirements and the gaps are addressable. The experience gap is the only real risk — lead with impact and scope rather than years. Frame Docker experience as cloud infrastructure exposure and start an AWS side project to close that gap before interviews.",
};

export const DEMO_REWRITE_SUGGESTIONS: RewriteSuggestion[] = [
  {
    originalRole: "Software Engineer @ Streamline Labs",
    originalBullet:
      "Built and maintained customer-facing Next.js features, designed REST and GraphQL APIs in Node.js, and managed PostgreSQL schemas for a B2B SaaS product serving 500+ clients.",
    rewrittenBullet:
      "Architected and shipped customer-facing features on a Next.js + Node.js platform serving 500+ enterprise clients, designing scalable REST and GraphQL APIs backed by PostgreSQL — directly aligned with Nexova's B2B SaaS workflow automation stack.",
    rationale:
      "Mirrors the JD's emphasis on 'scalable REST APIs' and 'system architecture' while highlighting B2B SaaS experience that maps directly to the target role.",
  },
  {
    originalRole: "Frontend Developer @ Pixel & Co.",
    originalBullet:
      "Developed responsive React interfaces for e-commerce and marketing clients, improving Core Web Vitals scores by an average of 30% across six major projects.",
    rewrittenBullet:
      "Led frontend development across 6 client projects using React and TypeScript, delivering 30% improvement in Core Web Vitals — demonstrating the performance-first engineering mindset needed for enterprise workflow tooling.",
    rationale:
      "Reframes agency work as leadership experience and connects performance optimization to enterprise software quality, which the JD values.",
  },
];

export const DEMO_STUDY_ITEMS: StudyItem[] = [
  {
    skill: "AWS",
    severity: "learnable",
    action: "Start with AWS free tier — deploy a Next.js app on EC2 with an RDS PostgreSQL database and S3 for static assets. This covers 3 of the 4 AWS services in the JD and makes a great portfolio talking point.",
    resource: "AWS Free Tier + official Getting Started guides (aws.amazon.com/free)",
  },
  {
    skill: "CI/CD pipelines",
    severity: "learnable",
    action: "Set up GitHub Actions for your AWS-deployed project: lint, test, build, and deploy on push to main. Add a badge to the repo README. This is a one-afternoon project that checks the CI/CD box.",
    resource: "GitHub Actions documentation (docs.github.com/en/actions)",
  },
];

export const DEMO_COVER_LETTER: string = `Dear Hiring Team at Nexova,

I'm writing to express my strong interest in the Senior Full-Stack Engineer position. As a full-stack engineer with hands-on experience building B2B SaaS products using your exact tech stack — TypeScript, React, Next.js, Node.js, and PostgreSQL — I'm excited about the opportunity to help build Nexova's next generation of workflow automation.

**Why I'm a strong fit:**

At Streamline Labs, I've spent the past two years architecting and shipping features for a B2B SaaS platform serving 500+ enterprise clients. I've designed scalable REST and GraphQL APIs, managed complex PostgreSQL schemas, and built customer-facing interfaces in Next.js — the same challenges your team tackles daily. Before that, at Pixel & Co., I honed my frontend skills across six major projects, consistently delivering measurable performance improvements.

**Addressing the experience bar:**

While I have 4 years of professional experience rather than the 5+ listed, I've consistently operated at a senior level — owning features end-to-end, making architectural decisions for production systems, and shipping to enterprise users. I'm also actively expanding my cloud infrastructure skills, building personal projects on AWS to complement my existing Docker and deployment experience.

**What excites me about Nexova:**

The challenge of building mission-critical workflow tooling for Fortune 500 companies is exactly the kind of high-impact engineering I want to be doing. I bring the product-minded engineering perspective of someone who's shipped features directly to enterprise users and understands the reliability and scalability bar that requires.

I'd love to discuss how my experience building B2B SaaS products maps to Nexova's technical challenges. I'm available for a conversation at your convenience.

Best regards,
Jordan Rivera`;

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
