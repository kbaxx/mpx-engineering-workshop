import assert from "node:assert/strict";
import test from "node:test";
import { scoreJob, rankJobs } from "../server/matching.js";
import { primaryJobs } from "../server/seed-data.js";
import { getCandidateById } from "../server/candidates.js";

test("exact skill matches and location produce an explainable score", () => {
  const candidate = getCandidateById("candidate-001");
  const job = { ...primaryJobs[0], skills: [...primaryJobs[0].skills.slice(0, 3), "Unrelated skill"] };
  const result = scoreJob(job, candidate);
  assert.equal(result.score, 80);
  assert.equal(result.matchedCount, 3);
  assert.deepEqual(result.skillBreakdown.map((item) => item.matchType), ["exact", "exact", "exact", "missing"]);
  assert.equal(result.locationFits, true);
});

test("a direct hierarchy relationship earns partial credit and identifies the candidate skill", () => {
  const job = { location: "Bern", workMode: "Hybrid", skills: ["Frontend development"] };
  const candidate = { location: "Zurich", skills: ["React"] };
  const result = scoreJob(job, candidate);
  assert.equal(result.score, 40);
  assert.equal(result.matchedCount, 0);
  assert.equal(result.relatedCount, 1);
  assert.deepEqual(result.skillBreakdown[0], {
    skill: "Frontend development",
    matched: false,
    matchType: "related",
    candidateSkill: "React",
    reason: "Related skill: React",
  });
});

test("unrelated skills are missing and contribute no skill credit", () => {
  const job = { location: "Bern", workMode: "Hybrid", skills: ["Frontend development"] };
  const candidate = { location: "Zurich", skills: ["Python"] };
  const result = scoreJob(job, candidate);
  assert.equal(result.score, 0);
  assert.equal(result.relatedCount, 0);
  assert.equal(result.skillBreakdown[0].matchType, "missing");
  assert.equal(result.skillBreakdown[0].reason, "Missing skill");
});

test("remote roles count as a location fit and ranking is stable", () => {
  const candidate = getCandidateById("candidate-003");
  const ranked = rankJobs(primaryJobs, candidate);
  assert.equal(ranked[0].id, "job-103");
  assert.equal(ranked[0].match.locationFits, true);
  const remoteScore = scoreJob({ ...primaryJobs[2], location: "Non-matching location" }, candidate);
  const sameRoleWithoutRemote = scoreJob({ ...primaryJobs[2], location: "Non-matching location", workMode: "Hybrid" }, candidate);
  assert.equal(remoteScore.locationFits, true);
  assert.equal(remoteScore.score - sameRoleWithoutRemote.score, 20);
});
