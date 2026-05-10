import { describe, test, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import express from "express";
import { createJobsRouter, createSchedulesRouter, resetSchedules } from "./jobs";
import { runSchedulerTick } from "../scheduler/cron-scheduler";

async function startApp(routerFactory: () => express.Router) {
  const app = express();
  app.use(express.json());
  app.use("/v1/jobs", routerFactory());
  app.use("/v1/schedules", createSchedulesRouter());
  return await new Promise<{ baseUrl: string; close: () => Promise<void> }>((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ baseUrl: `http://127.0.0.1:${port}`, close: () => new Promise(r => server.close(() => r())) });
    });
  });
}

describe("Jobs API", () => {
  beforeEach(() => {
    resetSchedules();
  });

  it("creates schedules with valid cron", async () => {
    const app = express();
    app.use(express.json());
    const queue = { enqueuePostJob: vi.fn().mockResolvedValue("job_1") };
    app.use("/v1/jobs", createJobsRouter(queue as any));
    app.use("/v1/schedules", createSchedulesRouter());
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    const res = await fetch(`http://127.0.0.1:${port}/v1/jobs/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cron: "0 9 * * *", template_id: "tpl1", account_id: "acc1" })
    });
    const body = (await res.json()) as any;
    await new Promise(r => server.close(() => r(null)));
    expect(res.status).toBe(201);
    expect(body.cron).toBe("0 9 * * *");
  });

  it("rejects invalid cron", async () => {
    const app = express();
    app.use(express.json());
    const queue = { enqueuePostJob: vi.fn().mockResolvedValue("job_1") };
    app.use("/v1/jobs", createJobsRouter(queue as any));
    app.use("/v1/schedules", createSchedulesRouter());
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    const res = await fetch(`http://127.0.0.1:${port}/v1/jobs/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cron: "invalid", template_id: "tpl1", account_id: "acc1" })
    });
    await new Promise(r => server.close(() => r(null)));
    expect(res.status).toBe(400);
  });

  it("enqueues manual trigger job", async () => {
    const queue = { enqueuePostJob: vi.fn().mockResolvedValue("job_123") };
    const app = express();
    app.use(express.json());
    app.use("/v1/jobs", createJobsRouter(queue as any));
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    const res = await fetch(`http://127.0.0.1:${port}/v1/jobs/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_id: "tpl1", account_id: "acc1" })
    });
    const body = (await res.json()) as any;
    await new Promise(r => server.close(() => r(null)));
    expect(res.status).toBe(202);
    expect(body.job_id).toBe("job_123");
    expect(queue.enqueuePostJob).toHaveBeenCalledTimes(1);
  });

  it("fires scheduler tick for matching cron", async () => {
    const queue = { enqueuePostJob: vi.fn().mockResolvedValue("job_999") };
    const app = express();
    app.use(express.json());
    app.use("/v1/jobs", createJobsRouter(queue as any));
    const server = app.listen(0);
    const now = new Date();
    await fetch(`http://127.0.0.1:${(server.address() as any).port}/v1/jobs/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cron: "* * * * *", template_id: "tpl1", account_id: "acc1", platform: "whatsapp" })
    });
    await runSchedulerTick(queue as any, now);
    await new Promise(r => server.close(() => r(null)));
    expect(queue.enqueuePostJob).toHaveBeenCalledTimes(1);
  });
});

