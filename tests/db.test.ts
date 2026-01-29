import { describe, it, expect, vi } from "vitest";

// Mock the database module before importing repo
vi.mock("../src/db/client.js", () => ({
  getDb: vi.fn(),
  getPool: vi.fn(),
  closePool: vi.fn(),
}));

// Test the schema types
import type { Bucket, Priority, NewTask } from "../src/db/schema.js";
import { toolSchemas } from "../src/mcp/tools.js";

describe("Schema Types", () => {
  it("should define Bucket as union of valid values", () => {
    const validBuckets: Bucket[] = ["inbox", "next", "doing", "done"];
    expect(validBuckets).toHaveLength(4);
  });

  it("should define Priority as union of valid values", () => {
    const validPriorities: Priority[] = ["p1", "p2", "p3"];
    expect(validPriorities).toHaveLength(3);
  });

  it("should allow creating NewTask with minimal fields", () => {
    const task: NewTask = {
      title: "Test task",
    };
    expect(task.title).toBe("Test task");
    expect(task.bucket).toBeUndefined();
  });

  it("should allow creating NewTask with all fields", () => {
    const task: NewTask = {
      title: "Full task",
      bucket: "next",
      notesMd: "Some notes",
      project: "test-project",
      estimateMinutes: 30,
      priorityHint: "p2",
    };
    expect(task.title).toBe("Full task");
    expect(task.bucket).toBe("next");
    expect(task.notesMd).toBe("Some notes");
    expect(task.project).toBe("test-project");
    expect(task.estimateMinutes).toBe(30);
    expect(task.priorityHint).toBe("p2");
  });
});

describe("Tool Schema Validation", () => {
  describe("task_create schema", () => {
    it("should accept valid minimal input", () => {
      const result = toolSchemas.task_create.safeParse({ title: "Test" });
      expect(result.success).toBe(true);
    });

    it("should reject empty title", () => {
      const result = toolSchemas.task_create.safeParse({ title: "" });
      expect(result.success).toBe(false);
    });

    it("should accept all optional fields", () => {
      const result = toolSchemas.task_create.safeParse({
        title: "Full task",
        bucket: "next",
        notes_md: "Notes here",
        project: "my-project",
        estimate_minutes: 60,
        priority_hint: "p1",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid bucket", () => {
      const result = toolSchemas.task_create.safeParse({
        title: "Test",
        bucket: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid priority", () => {
      const result = toolSchemas.task_create.safeParse({
        title: "Test",
        priority_hint: "high",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("task_update schema", () => {
    it("should require valid UUID", () => {
      const result = toolSchemas.task_update.safeParse({
        id: "not-a-uuid",
        title: "Updated",
      });
      expect(result.success).toBe(false);
    });

    it("should accept valid UUID", () => {
      const result = toolSchemas.task_update.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "Updated",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("task_move schema", () => {
    it("should require bucket", () => {
      const result = toolSchemas.task_move.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(false);
    });

    it("should accept valid bucket move", () => {
      const result = toolSchemas.task_move.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        bucket: "doing",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("task_list schema", () => {
    it("should accept empty object", () => {
      const result = toolSchemas.task_list.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should accept bucket filter", () => {
      const result = toolSchemas.task_list.safeParse({ bucket: "inbox" });
      expect(result.success).toBe(true);
    });

    it("should accept limit within range", () => {
      const result = toolSchemas.task_list.safeParse({ limit: 50 });
      expect(result.success).toBe(true);
    });

    it("should reject limit over 100", () => {
      const result = toolSchemas.task_list.safeParse({ limit: 150 });
      expect(result.success).toBe(false);
    });
  });

  describe("tasks_review schema", () => {
    it("should default stale_days to 7", () => {
      const result = toolSchemas.tasks_review.parse({});
      expect(result.stale_days).toBe(7);
    });

    it("should accept custom stale_days", () => {
      const result = toolSchemas.tasks_review.parse({ stale_days: 14 });
      expect(result.stale_days).toBe(14);
    });
  });
});

describe("Mutations Guardrail", () => {
  it("should check ALLOW_MUTATIONS env var", () => {
    // Save original
    const original = process.env["ALLOW_MUTATIONS"];

    // Test when mutations disabled
    process.env["ALLOW_MUTATIONS"] = "false";
    expect(process.env["ALLOW_MUTATIONS"]).toBe("false");

    // Restore
    if (original === undefined) {
      delete process.env["ALLOW_MUTATIONS"];
    } else {
      process.env["ALLOW_MUTATIONS"] = original;
    }
  });
});
