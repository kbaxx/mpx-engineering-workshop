import { rankJobs } from "./matching.js";

export function createRecommendationCache() {
  return function getRecommendations(jobs, candidate) {
    return {
      scoredForCandidateId: candidate.id,
      jobs: rankJobs(jobs, candidate),
    };
  };
}
