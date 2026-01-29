import { z } from "zod";

import type { Db } from "../db/client.js";
import type { Bucket, Priority, Task } from "../db/schema.js";
import * as repo from "../db/repo.js";

// Schema definitions
const BucketSchema = z.enum(["inbox", "next", "doing", "done"]);
const PrioritySchema = z.enum(["p1", "p2", "p3"]);

export const toolSchemas = {
  task_create: z.object({
    title: z.string().min(1).describe("Task title"),
    bucket: BucketSchema.optional().describe("Target bucket (defaults to inbox)"),
    notes_md: z.string().optional().describe("Additional notes in markdown"),
    project: z.string().optional().describe("Project name"),
    estimate_minutes: z.number().int().positive().optional().describe("Time estimate in minutes"),
    priority_hint: PrioritySchema.optional().describe("Priority hint (p1=high, p3=low)"),
  }),

  task_update: z.object({
    id: z.string().uuid().describe("Task ID"),
    title: z.string().min(1).optional().describe("New title"),
    notes_md: z.string().optional().describe("New notes"),
    project: z.string().optional().describe("New project"),
    estimate_minutes: z.number().int().positive().optional().describe("New time estimate"),
    priority_hint: PrioritySchema.optional().describe("New priority hint"),
  }),

  task_move: z.object({
    id: z.string().uuid().describe("Task ID"),
    bucket: BucketSchema.describe("Target bucket"),
  }),

  task_complete: z.object({
    id: z.string().uuid().describe("Task ID"),
  }),

  task_block: z.object({
    id: z.string().uuid().describe("Task ID"),
    reason: z.string().min(1).describe("Why the task is blocked"),
  }),

  task_unblock: z.object({
    id: z.string().uuid().describe("Task ID"),
  }),

  task_list: z.object({
    bucket: BucketSchema.optional().describe("Filter by bucket"),
    project: z.string().optional().describe("Filter by project"),
    include_blocked: z.boolean().optional().describe("Include blocked tasks"),
    limit: z.number().int().positive().max(100).optional().describe("Max results"),
  }),

  task_get: z.object({
    id: z.string().uuid().describe("Task ID"),
  }),

  tasks_today: z.object({}),

  tasks_review: z.object({
    stale_days: z
      .number()
      .int()
      .positive()
      .default(7)
      .describe("Days without update to consider stale"),
  }),

  tasks_count: z.object({}),
} as const;

// Tool descriptions for MCP
export const toolDescriptions = {
  task_create: "Create a new task in a bucket",
  task_update: "Update task fields (title, notes, estimate, priority)",
  task_move: "Move a task between buckets",
  task_complete: "Mark a task as done",
  task_block: "Block a task with a reason",
  task_unblock: "Unblock a task",
  task_list: "List tasks by bucket with optional filters",
  task_get: "Get a single task by ID",
  tasks_today: "Get today plan (Doing + top Next tasks, max 7)",
  tasks_review: "Get stale tasks that need attention",
  tasks_count: "Get task counts by bucket",
} as const;

// Format task for response
function formatTask(task: Task): string {
  const parts = [`[${task.id.slice(0, 8)}] ${task.title}`];

  if (task.bucket !== "inbox") parts.push(`(${task.bucket})`);
  if (task.priorityHint) parts.push(`[${task.priorityHint.toUpperCase()}]`);
  if (task.project) parts.push(`#${task.project}`);
  if (task.estimateMinutes) parts.push(`~${task.estimateMinutes}m`);
  if (task.blockedReason) parts.push(`BLOCKED: ${task.blockedReason}`);

  return parts.join(" ");
}

function formatTaskFull(task: Task): string {
  const lines = [formatTask(task)];
  if (task.notesMd) {
    lines.push("", "Notes:", task.notesMd);
  }
  lines.push("", `Created: ${task.createdAt.toISOString()}`);
  lines.push(`Updated: ${task.updatedAt.toISOString()}`);
  return lines.join("\n");
}

// Tool implementations
export async function executeTask_create(
  db: Db,
  args: z.infer<typeof toolSchemas.task_create>
): Promise<string> {
  const input: repo.CreateTaskInput = { title: args.title };
  if (args.bucket) input.bucket = args.bucket as Bucket;
  if (args.notes_md) input.notesMd = args.notes_md;
  if (args.project) input.project = args.project;
  if (args.estimate_minutes) input.estimateMinutes = args.estimate_minutes;
  if (args.priority_hint) input.priorityHint = args.priority_hint as Priority;

  const task = await repo.createTask(db, input);
  return `Created: ${formatTask(task)}`;
}

export async function executeTask_update(
  db: Db,
  args: z.infer<typeof toolSchemas.task_update>
): Promise<string> {
  const input: repo.UpdateTaskInput = {};
  if (args.title) input.title = args.title;
  if (args.notes_md) input.notesMd = args.notes_md;
  if (args.project) input.project = args.project;
  if (args.estimate_minutes) input.estimateMinutes = args.estimate_minutes;
  if (args.priority_hint) input.priorityHint = args.priority_hint as Priority;

  const task = await repo.updateTask(db, args.id, input);
  return `Updated: ${formatTask(task)}`;
}

export async function executeTask_move(
  db: Db,
  args: z.infer<typeof toolSchemas.task_move>
): Promise<string> {
  const task = await repo.moveTask(db, args.id, args.bucket as Bucket);
  return `Moved to ${args.bucket}: ${formatTask(task)}`;
}

export async function executeTask_complete(
  db: Db,
  args: z.infer<typeof toolSchemas.task_complete>
): Promise<string> {
  const task = await repo.completeTask(db, args.id);
  return `Completed: ${formatTask(task)}`;
}

export async function executeTask_block(
  db: Db,
  args: z.infer<typeof toolSchemas.task_block>
): Promise<string> {
  const task = await repo.blockTask(db, args.id, args.reason);
  return `Blocked: ${formatTask(task)}`;
}

export async function executeTask_unblock(
  db: Db,
  args: z.infer<typeof toolSchemas.task_unblock>
): Promise<string> {
  const task = await repo.unblockTask(db, args.id);
  return `Unblocked: ${formatTask(task)}`;
}

export async function executeTask_list(
  db: Db,
  args: z.infer<typeof toolSchemas.task_list>
): Promise<string> {
  const options: repo.ListTasksOptions = {};
  if (args.bucket) options.bucket = args.bucket as Bucket;
  if (args.project) options.project = args.project;
  if (args.include_blocked) options.includeBlocked = args.include_blocked;
  if (args.limit) options.limit = args.limit;

  const tasks = await repo.listTasks(db, options);

  if (tasks.length === 0) {
    return "No tasks found.";
  }

  const header = args.bucket
    ? `${args.bucket.toUpperCase()} (${tasks.length})`
    : `ALL (${tasks.length})`;
  return [header, "", ...tasks.map(formatTask)].join("\n");
}

export async function executeTask_get(
  db: Db,
  args: z.infer<typeof toolSchemas.task_get>
): Promise<string> {
  const task = await repo.getTask(db, args.id);
  if (!task) {
    return `Task not found: ${args.id}`;
  }
  return formatTaskFull(task);
}

export async function executeTasks_today(db: Db): Promise<string> {
  const tasks = await repo.getTodayPlan(db);

  if (tasks.length === 0) {
    return "No tasks in today plan. Move tasks to Doing or Next to start.";
  }

  const doing = tasks.filter((t) => t.bucket === "doing");
  const next = tasks.filter((t) => t.bucket === "next");

  const lines: string[] = [];

  if (doing.length > 0) {
    lines.push(`DOING (${doing.length})`, "", ...doing.map(formatTask), "");
  }

  if (next.length > 0) {
    lines.push(`NEXT UP (${next.length})`, "", ...next.map(formatTask));
  }

  return lines.join("\n");
}

export async function executeTasks_review(
  db: Db,
  args: z.infer<typeof toolSchemas.tasks_review>
): Promise<string> {
  const tasks = await repo.getStaleTasks(db, args.stale_days);

  if (tasks.length === 0) {
    return `No stale tasks (>${args.stale_days} days without update).`;
  }

  const lines = [
    `STALE TASKS (${tasks.length} tasks not updated in ${args.stale_days}+ days)`,
    "",
    ...tasks.map((t) => {
      const daysAgo = Math.floor((Date.now() - t.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      return `${formatTask(t)} [${daysAgo}d ago]`;
    }),
  ];

  return lines.join("\n");
}

export async function executeTasks_count(db: Db): Promise<string> {
  const counts = await repo.countTasks(db);
  return [
    "Task counts:",
    `  Inbox: ${counts.inbox}`,
    `  Next:  ${counts.next}`,
    `  Doing: ${counts.doing}`,
    `  Done:  ${counts.done}`,
  ].join("\n");
}
