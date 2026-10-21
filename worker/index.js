import { getCatalogSummary, getJobById, listJobs } from "../server/catalog.js";
import { exportCandidatesCsv, getCandidateById, listCandidateSummaries } from "../server/candidates.js";
import { createRecommendationCache } from "../server/recommendations.js";

const getRecommendations = createRecommendationCache();
const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function sendJson(status, payload) {
  return new globalThis.Response(JSON.stringify(payload), { status, headers: jsonHeaders });
}

function sendCsv(csv) {
  return new globalThis.Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="jobmatch-applicants.csv"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function handleRequest(request, htmlDocument = "") {
  const { pathname, searchParams } = new globalThis.URL(request.url);

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    if (request.method !== "GET") return sendJson(405, { error: "Method not allowed" });

    if (pathname === "/api/health") {
      return sendJson(200, { status: "ok", application: "JobMatch Lab", data: "synthetic" });
    }

    if (pathname === "/api/overview") {
      return sendJson(200, {
        catalog: getCatalogSummary(),
        candidateCount: listCandidateSummaries().length,
      });
    }

    if (pathname === "/api/jobs") {
      return sendJson(200, {
        jobs: listJobs({
          query: searchParams.get("q") ?? "",
          category: searchParams.get("category") ?? "All",
          location: searchParams.get("location") ?? "All",
        }),
      });
    }

    if (pathname.startsWith("/api/jobs/")) {
      const job = getJobById(pathname.slice("/api/jobs/".length));
      return sendJson(job ? 200 : 404, job ? { job } : { error: "Job not found" });
    }

    if (pathname === "/api/candidates") {
      return sendJson(200, { candidates: listCandidateSummaries() });
    }

    if (pathname === "/api/matches") {
      const candidate = getCandidateById(searchParams.get("candidateId"));
      if (!candidate) return sendJson(404, { error: "Candidate not found" });

      const result = getRecommendations(listJobs(), candidate);
      return sendJson(200, {
        candidateId: candidate.id,
        scoredForCandidateId: result.scoredForCandidateId,
        jobs: result.jobs,
      });
    }

    // Keep the workshop's synthetic recruiter-only access exercises intact.
    if (pathname.startsWith("/api/candidates/")) {
      const candidate = getCandidateById(pathname.slice("/api/candidates/".length));
      return sendJson(candidate ? 200 : 404, candidate ? { candidate } : { error: "Candidate not found" });
    }

    if (pathname === "/api/admin/candidates/export") {
      return sendCsv(exportCandidatesCsv());
    }

    return sendJson(404, { error: "API route not found" });
  }

  return new globalThis.Response(htmlDocument, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export default {
  fetch(request, _env, _ctx, htmlDocument = "") {
    return handleRequest(request, htmlDocument);
  },
};
