import assert from "node:assert/strict";
import test from "node:test";
import worker from "../worker/index.js";
import { getCatalogSummary, listJobs } from "../server/catalog.js";
import { listCandidateSummaries } from "../server/candidates.js";

const html = "<!doctype html><title>JobMatch Lab</title>";

async function request(path, { method = "GET" } = {}) {
  return worker.fetch(new Request(`https://jobmatch-lab.test${path}`, { method }), {}, {}, html);
}

test("Site worker preserves the health and overview API payloads", async () => {
  const health = await request("/api/health");
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok", application: "JobMatch Lab", data: "synthetic" });

  const overview = await request("/api/overview");
  assert.equal(overview.status, 200);
  assert.deepEqual(await overview.json(), {
    catalog: getCatalogSummary(),
    candidateCount: listCandidateSummaries().length,
  });
});

test("Site worker preserves marketplace filtering, job detail, and recommendation APIs", async () => {
  const filters = { query: "Senior Product Engineer", category: "Engineering", location: "Zurich" };
  const jobs = await request("/api/jobs?q=Senior%20Product%20Engineer&category=Engineering&location=Zurich");
  const jobsBody = await jobs.json();
  assert.equal(jobs.status, 200);
  assert.deepEqual(jobsBody.jobs, listJobs(filters));

  const detail = await request("/api/jobs/job-101");
  assert.equal(detail.status, 200);
  assert.equal((await detail.json()).job.canonicalId, "role-101");

  const matches = await request("/api/matches?candidateId=candidate-001");
  const matchesBody = await matches.json();
  assert.equal(matches.status, 200);
  assert.equal(matchesBody.scoredForCandidateId, "candidate-001");
  assert.equal(matchesBody.jobs.length, listJobs().length);
});

test("Site worker preserves public candidate, recruiter exercise, and CSV routes", async () => {
  const summaries = await request("/api/candidates");
  assert.equal(summaries.status, 200);
  assert.equal((await summaries.json()).candidates.length, listCandidateSummaries().length);

  const full = await request("/api/candidates/candidate-001");
  assert.equal(full.status, 200);
  assert.equal((await full.json()).candidate.id, "candidate-001");

  const csv = await request("/api/admin/candidates/export");
  assert.equal(csv.status, 200);
  assert.equal(csv.headers.get("content-type"), "text/csv; charset=utf-8");
  assert.match(await csv.text(), /candidate-001/);
});

test("Site worker serves both incident SPA routes and preserves API errors", async () => {
  for (const route of ["/incident", "/incident/match-isolation"]) {
    const page = await request(route);
    assert.equal(page.status, 200);
    assert.equal(await page.text(), html);
  }

  const missing = await request("/api/jobs/missing");
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: "Job not found" });

  const method = await request("/api/jobs", { method: "POST" });
  assert.equal(method.status, 405);
  assert.deepEqual(await method.json(), { error: "Method not allowed" });
});
