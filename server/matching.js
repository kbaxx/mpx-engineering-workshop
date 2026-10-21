import { broaderSkills } from "./skills.js";

const RELATED_SKILL_WEIGHT = 0.5;

function normalized(value) {
  return value.trim().toLowerCase();
}

export function scoreJob(job, candidate) {
  const candidateSkills = new Set(candidate.skills.map(normalized));
  const broaderSkillsBySpecificSkill = new Map(
    Object.entries(broaderSkills).map(([skill, broader]) => [normalized(skill), new Set(broader.map(normalized))]),
  );
  const skillBreakdown = job.skills.map((skill) => {
    const normalizedSkill = normalized(skill);
    if (candidateSkills.has(normalizedSkill)) {
      return { skill, matched: true, matchType: "exact", reason: "Exact skill" };
    }

    const relatedCandidateSkill = candidate.skills.find((candidateSkill) =>
      broaderSkillsBySpecificSkill.get(normalized(candidateSkill))?.has(normalizedSkill),
    );
    if (relatedCandidateSkill) {
      return {
        skill,
        matched: false,
        matchType: "related",
        candidateSkill: relatedCandidateSkill,
        reason: `Related skill: ${relatedCandidateSkill}`,
      };
    }

    return { skill, matched: false, matchType: "missing", reason: "Missing skill" };
  });
  const matchedCount = skillBreakdown.filter((item) => item.matched).length;
  const relatedCount = skillBreakdown.filter((item) => item.matchType === "related").length;
  const skillCredit = matchedCount + relatedCount * RELATED_SKILL_WEIGHT;
  const skillScore = job.skills.length ? skillCredit / job.skills.length : 0;
  const locationFits = job.location === candidate.location || job.workMode === "Remote";
  const score = Math.round(skillScore * 80 + (locationFits ? 20 : 0));

  return {
    score,
    matchedCount,
    relatedCount,
    requiredCount: job.skills.length,
    locationFits,
    skillBreakdown,
  };
}

export function rankJobs(jobs, candidate) {
  return jobs
    .map((job) => ({ ...job, match: scoreJob(job, candidate) }))
    .sort((a, b) => b.match.score - a.match.score || a.title.localeCompare(b.title));
}
