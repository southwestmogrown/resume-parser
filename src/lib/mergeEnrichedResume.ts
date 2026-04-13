import type { ResumeData, InterviewBrief, ExperienceEntry } from './types';

export function mergeEnrichedResume(
  base: ResumeData,
  brief: InterviewBrief
): ResumeData {
  // Merge impact + technologies into each matched experience entry
  const mergedExperience: ExperienceEntry[] = base.experience.map((entry) => {
    const enriched = brief.enriched_experiences.find(
      (e) =>
        entry.company.toLowerCase().includes(e.company.toLowerCase()) ||
        e.company.toLowerCase().includes(entry.company.toLowerCase())
    );

    if (!enriched) return entry;

    const impactLines =
      enriched.impact.length > 0
        ? '\n' + enriched.impact.map((i) => `• ${i}`).join('\n')
        : '';

    return {
      ...entry,
      description: entry.description + impactLines,
    };
  });

  // Gather all new technologies from enriched experiences
  const allNewTech = brief.enriched_experiences.flatMap((e) => e.technologies);

  // Merge into skills — deduplicated, case-insensitive
  const existingSkillsLower = new Set(base.skills.map((s) => s.toLowerCase()));
  const newSkills = [
    ...allNewTech,
    ...brief.additional_skills,
  ].filter((s) => !existingSkillsLower.has(s.toLowerCase()));

  const mergedSkills = [...base.skills, ...newSkills];

  // Append notable context to summary
  const mergedSummary = brief.notable_context
    ? `${base.summary}\n\n${brief.notable_context}`
    : base.summary;

  return {
    ...base,
    summary: mergedSummary,
    skills: mergedSkills,
    experience: mergedExperience,
  };
}
