import { beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";

describe("Internal retention job route", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    vi.stubEnv("RETENTION_JOB_SECRET", "test-secret-retention");
    app = await buildApp({ logger: false });
  });

  it("rejects without secret", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/internal/jobs/retention",
    });
    expect(res.statusCode).toBe(401);
  });

  it("accepts X-Retention-Job-Secret and returns JSON", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/internal/jobs/retention?dryRun=1",
      headers: { "x-retention-job-secret": "test-secret-retention" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { dryRun: boolean; totalDeleted: number };
    expect(body.dryRun).toBe(true);
    expect(typeof body.totalDeleted).toBe("number");
  });
});
