import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";

describe("HQ AI insights routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  it("GET /tenant/hq-insights oturum olmadan 401", async () => {
    const res = await app.inject({ method: "GET", url: "/tenant/hq-insights" });
    expect(res.statusCode).toBe(401);
  });

  it("POST /tenant/hq-insights/x/dismiss oturum olmadan 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/tenant/hq-insights/cid/dismiss",
    });
    expect(res.statusCode).toBe(401);
  });
});
