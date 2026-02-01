import { and, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";

import type { Db } from "./client.js";
import type {
  Bucket,
  NewCheckin,
  NewTask,
  NewTaskEvent,
  OutboxMessage,
  OutboxMessageType,
  Priority,
  Task,
} from "./schema.js";
import { checkins, outbox, taskEvents, tasks } from "./schema.js";

function mutationsAllowed(): boolean {
  return process.env["ALLOW_MUTATIONS"] !== "false";
}

function assertMutationsAllowed(): void {
  if (!mutationsAllowed()) {
    throw new Error("Mutations are disabled (ALLOW_MUTATIONS=false)");
  }
}

export interface CreateTaskInput {
  title: string;
  bucket?: Bucket;
  notesMd?: string;
  project?: string;
  estimateMinutes?: number;
  priorityHint?: Priority;
}

export interface UpdateTaskInput {
  title?: string;
  notesMd?: string;
  project?: string;
  estimateMinutes?: number;
  priorityHint?: Priority;
}

export interface ListTasksOptions {
  bucket?: Bucket;
  project?: string;
  includeBlocked?: boolean;
  limit?: number;
}

export async function createTask(db: Db, input: CreateTaskInput): Promise<Task> {
  assertMutationsAllowed();

  const newTask: NewTask = {
    title: input.title,
    bucket: input.bucket ?? "inbox",
    notesMd: input.notesMd ?? null,
    project: input.project ?? null,
    estimateMinutes: input.estimateMinutes ?? null,
    priorityHint: input.priorityHint ?? null,
  };

  const [created] = await db.insert(tasks).values(newTask).returning();
  if (!created) {
    throw new Error("Failed to create task");
  }

  await logTaskEvent(db, {
    taskId: created.id,
    eventType: "created",
    payload: JSON.stringify(input),
  });

  return created;
}

export async function updateTask(db: Db, id: string, input: UpdateTaskInput): Promise<Task> {
  assertMutationsAllowed();

  const updates: Partial<Task> = {
    updatedAt: new Date(),
  };

  if (input.title !== undefined) updates.title = input.title;
  if (input.notesMd !== undefined) updates.notesMd = input.notesMd;
  if (input.project !== undefined) updates.project = input.project;
  if (input.estimateMinutes !== undefined) updates.estimateMinutes = input.estimateMinutes;
  if (input.priorityHint !== undefined) updates.priorityHint = input.priorityHint;

  const [updated] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
  if (!updated) {
    throw new Error(`Task not found: ${id}`);
  }

  await logTaskEvent(db, {
    taskId: id,
    eventType: "updated",
    payload: JSON.stringify(input),
  });

  return updated;
}

export async function moveTask(db: Db, id: string, bucket: Bucket): Promise<Task> {
  assertMutationsAllowed();

  const [moved] = await db
    .update(tasks)
    .set({ bucket, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  if (!moved) {
    throw new Error(`Task not found: ${id}`);
  }

  await logTaskEvent(db, {
    taskId: id,
    eventType: "moved",
    payload: JSON.stringify({ bucket }),
  });

  return moved;
}

export async function completeTask(db: Db, id: string): Promise<Task> {
  assertMutationsAllowed();

  const [completed] = await db
    .update(tasks)
    .set({ bucket: "done", blockedReason: null, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  if (!completed) {
    throw new Error(`Task not found: ${id}`);
  }

  await logTaskEvent(db, {
    taskId: id,
    eventType: "completed",
  });

  return completed;
}

export async function blockTask(db: Db, id: string, reason: string): Promise<Task> {
  assertMutationsAllowed();

  const [blocked] = await db
    .update(tasks)
    .set({ blockedReason: reason, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  if (!blocked) {
    throw new Error(`Task not found: ${id}`);
  }

  await logTaskEvent(db, {
    taskId: id,
    eventType: "blocked",
    payload: JSON.stringify({ reason }),
  });

  return blocked;
}

export async function unblockTask(db: Db, id: string): Promise<Task> {
  assertMutationsAllowed();

  const [unblocked] = await db
    .update(tasks)
    .set({ blockedReason: null, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  if (!unblocked) {
    throw new Error(`Task not found: ${id}`);
  }

  await logTaskEvent(db, {
    taskId: id,
    eventType: "unblocked",
  });

  return unblocked;
}

export async function getTask(db: Db, id: string): Promise<Task | null> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
  return task ?? null;
}

export async function listTasks(db: Db, options: ListTasksOptions = {}): Promise<Task[]> {
  const conditions = [];

  if (options.bucket) {
    conditions.push(eq(tasks.bucket, options.bucket));
  }

  if (options.project) {
    conditions.push(eq(tasks.project, options.project));
  }

  if (!options.includeBlocked) {
    conditions.push(isNull(tasks.blockedReason));
  }

  const query = db
    .select()
    .from(tasks)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(tasks.priorityHint, desc(tasks.createdAt));

  if (options.limit) {
    return await query.limit(options.limit);
  }

  return await query;
}

export async function getTodayPlan(db: Db): Promise<Task[]> {
  // Get all Doing tasks + top 5 Next tasks
  const doing = await listTasks(db, { bucket: "doing" });
  const next = await listTasks(db, { bucket: "next", limit: 5 });

  return [...doing, ...next].slice(0, 7); // Max 7 items in today plan
}

export async function getStaleTasks(db: Db, staleDays: number = 7): Promise<Task[]> {
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - staleDays);

  return await db
    .select()
    .from(tasks)
    .where(
      and(
        inArray(tasks.bucket, ["inbox", "next", "doing"]),
        lt(tasks.updatedAt, staleDate),
        isNull(tasks.blockedReason)
      )
    )
    .orderBy(tasks.updatedAt);
}

export async function getTaskEvents(db: Db, taskId: string): Promise<NewTaskEvent[]> {
  return await db
    .select()
    .from(taskEvents)
    .where(eq(taskEvents.taskId, taskId))
    .orderBy(desc(taskEvents.createdAt));
}

async function logTaskEvent(db: Db, event: NewTaskEvent): Promise<void> {
  await db.insert(taskEvents).values(event);
}

export async function createCheckin(db: Db, summary: string): Promise<NewCheckin> {
  const doing = await listTasks(db, { bucket: "doing" });
  const doingIds = doing.map((t) => t.id);

  const [checkin] = await db
    .insert(checkins)
    .values({
      summary,
      doingSnapshot: JSON.stringify(doingIds),
    })
    .returning();

  if (!checkin) {
    throw new Error("Failed to create checkin");
  }

  return checkin;
}

export async function countTasks(db: Db): Promise<Record<Bucket, number>> {
  const result = await db
    .select({
      bucket: tasks.bucket,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .groupBy(tasks.bucket);

  const counts: Record<Bucket, number> = {
    inbox: 0,
    next: 0,
    doing: 0,
    done: 0,
  };

  for (const row of result) {
    counts[row.bucket] = row.count;
  }

  return counts;
}

export async function getCompletedThisWeek(db: Db): Promise<Task[]> {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  return await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.bucket, "done"), gte(tasks.updatedAt, weekStart)))
    .orderBy(desc(tasks.updatedAt))
    .limit(20);
}

// Outbox functions

export async function createOutboxMessage(
  db: Db,
  messageType: OutboxMessageType,
  content: string
): Promise<OutboxMessage> {
  assertMutationsAllowed();

  const [message] = await db.insert(outbox).values({ messageType, content }).returning();

  if (!message) {
    throw new Error("Failed to create outbox message");
  }

  return message;
}

export async function getPendingOutboxMessages(db: Db): Promise<OutboxMessage[]> {
  return await db.select().from(outbox).where(isNull(outbox.deliveredAt)).orderBy(outbox.createdAt);
}

export async function markOutboxMessageDelivered(db: Db, id: string): Promise<OutboxMessage> {
  assertMutationsAllowed();

  const [updated] = await db
    .update(outbox)
    .set({ deliveredAt: new Date() })
    .where(eq(outbox.id, id))
    .returning();

  if (!updated) {
    throw new Error(`Outbox message not found: ${id}`);
  }

  return updated;
}
