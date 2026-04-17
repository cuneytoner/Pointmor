import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";

describe("Tenant automation routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  it("GET /tenant/automation/summary oturum olmadan 401", async () => {
    const res = await app.inject({ method: "GET", url: "/tenant/automation/summary" });
    expect(res.statusCode).toBe(401);
  });
});
