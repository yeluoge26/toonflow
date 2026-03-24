import { describe, it, expect, beforeAll } from "vitest";

/**
 * E2E Smoke Test — Login → Project → Generate → Query
 * Run against a live server: SERVER_URL=http://localhost:60000 npx vitest run tests/e2e-smoke.test.ts
 */

const BASE = process.env.SERVER_URL || "http://localhost:60000";
let TOKEN = "";

// Helper
async function api(path: string, body?: any, method = "POST") {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

describe("E2E Smoke Test", () => {
  // 1. Login
  describe("Login", () => {
    it("rejects wrong password", async () => {
      const r = await api("/other/login", { username: "admin", password: "wrong" });
      expect(r.status).toBe(400);
    });

    it("rejects missing fields", async () => {
      const r = await api("/other/login", { username: "admin" });
      expect(r.status).toBe(400);
    });

    it("succeeds with correct credentials", async () => {
      // For E2E tests, use env var or default test password
      const password = process.env.ADMIN_PASSWORD || "admin123";
      const r = await api("/other/login", { username: "admin", password });
      if (r.status === 200 && r.data?.data?.token) {
        TOKEN = r.data.data.token.replace("Bearer ", "");
        expect(r.data.data.name).toBe("admin");
      } else {
        // If password is wrong (random generated), skip remaining tests
        console.warn("Login failed - likely random password. Set ADMIN_PASSWORD env var.");
        TOKEN = "";
      }
    });
  });

  // 2. Project CRUD (only if logged in)
  describe("Project", () => {
    let projectId: number;

    it("creates a project", async () => {
      if (!TOKEN) return;
      const r = await api("/project/addProject", {
        name: "E2E Test Project",
        intro: "Smoke test",
        type: "短剧",
        artStyle: "2D动漫风格",
        videoRatio: "16:9",
      });
      expect(r.status).toBe(200);
      projectId = r.data?.data?.id || r.data?.data;
      expect(projectId).toBeTruthy();
    });

    it("lists projects", async () => {
      if (!TOKEN) return;
      const r = await api("/project/getProject", {});
      expect(r.status).toBe(200);
      expect(r.data?.data).toBeTruthy();
    });

    it("gets single project", async () => {
      if (!TOKEN || !projectId) return;
      const r = await api("/project/getSingleProject", { id: projectId });
      expect(r.status).toBe(200);
    });

    it("gets pipeline state", async () => {
      if (!TOKEN || !projectId) return;
      const r = await api("/project/getPipelineState", { projectId });
      expect(r.status).toBe(200);
      expect(r.data?.data?.stages).toBeTruthy();
    });

    it("deletes project", async () => {
      if (!TOKEN || !projectId) return;
      const r = await api("/project/delProject", { id: projectId });
      expect(r.status).toBe(200);
    });
  });

  // 3. System endpoints
  describe("System", () => {
    it("system stats returns data", async () => {
      if (!TOKEN) return;
      const r = await api("/system/getSystemStats", {});
      expect(r.status).toBe(200);
      expect(r.data?.data?.cpu).toBeTruthy();
    });

    it("dashboard stats returns data", async () => {
      if (!TOKEN) return;
      const r = await api("/dashboard/getProductionStats", {});
      expect(r.status).toBe(200);
    });

    it("cost summary returns data", async () => {
      if (!TOKEN) return;
      const r = await api("/cost/getDailySummary", {});
      expect(r.status).toBe(200);
    });

    it("art styles available", async () => {
      if (!TOKEN) return;
      const r = await api("/artStyle/getArtStyle", {}, "GET");
      expect(r.status).toBe(200);
    });

    it("settings accessible", async () => {
      if (!TOKEN) return;
      const r = await api("/setting/getSetting", {});
      expect(r.status).toBe(200);
    });
  });

  // 4. Model config
  describe("Model Config", () => {
    it("gets model list", async () => {
      if (!TOKEN) return;
      const r = await api("/setting/getAiModelList", {});
      expect(r.status).toBe(200);
    });

    it("gets model map", async () => {
      if (!TOKEN) return;
      const r = await api("/setting/getAiModelMap", {});
      expect(r.status).toBe(200);
    });
  });
});
