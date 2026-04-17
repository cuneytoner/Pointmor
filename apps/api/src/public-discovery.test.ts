import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";

describe("Public API discovery (Phase 3)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  it("GET /public keşif belgesi döner", async () => {
    const res = await app.inject({ method: "GET", url: "/public" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { phase: number; tenantBase: string };
    expect(body.phase).toBe(3);
    expect(body.tenantBase).toContain("/public/tenants/");
  });

  it("düz /public/rewards kiracısız path 404 + ipucu", async () => {
    const res = await app.inject({ method: "GET", url: "/public/rewards" });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body) as { error: string; doc: string };
    expect(body.error).toBe("invalid_path");
    expect(body.doc).toBe("/public");
  });
});
