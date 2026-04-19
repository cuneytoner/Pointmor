import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";

describe("GET /health", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 and { ok: true }", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });

  it("includes security preflight when enabled and requested", async () => {
    vi.stubEnv("ALLOW_HEALTH_SECURITY_SUMMARY", "true");
    const res = await app.inject({
      method: "GET",
      url: "/health?securitySummary=1",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { ok: boolean; security?: unknown; metrics?: unknown };
    expect(body.ok).toBe(true);
    expect(body.security).toBeDefined();
    expect(body.metrics).toBeDefined();
  });

  it("redacts security snapshot in strict profile without preflight secret", async () => {
    vi.stubEnv("ALLOW_HEALTH_SECURITY_SUMMARY", "true");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("POINTMOR_PREFLIGHT_SECRET", "");
    const res = await app.inject({
      method: "GET",
      url: "/health?securitySummary=1",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      ok: boolean;
      security?: unknown;
      securityRedacted?: boolean;
      metrics?: unknown;
    };
    expect(body.metrics).toBeDefined();
    expect(body.securityRedacted).toBe(true);
    expect(body.security).toBeUndefined();
  });

  it("returns 403 when preflight secret is wrong", async () => {
    vi.stubEnv("ALLOW_HEALTH_SECURITY_SUMMARY", "true");
    vi.stubEnv("POINTMOR_PREFLIGHT_SECRET", "correct");
    const res = await app.inject({
      method: "GET",
      url: "/health?securitySummary=1&preflightSecret=wrong",
    });
    expect(res.statusCode).toBe(403);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });
});
