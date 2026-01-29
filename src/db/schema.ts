import { pgTable, text, timestamp, integer, pgEnum, uuid } from "drizzle-orm/pg-core";

export const bucketEnum = pgEnum("bucket", ["inbox", "next", "doing", "done"]);

export const priorityEnum = pgEnum("priority", ["p1", "p2", "p3"]);

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  bucket: bucketEnum("bucket").notNull().default("inbox"),
  notesMd: text("notes_md"),
  project: text("project"),
  estimateMinutes: integer("estimate_minutes"),
  priorityHint: priorityEnum("priority_hint"),
  blockedReason: text("blocked_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskEventTypeEnum = pgEnum("task_event_type", [
  "created",
  "updated",
  "moved",
  "completed",
  "blocked",
  "unblocked",
]);

export const taskEvents = pgTable("task_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id),
  eventType: taskEventTypeEnum("event_type").notNull(),
  payload: text("payload"), // JSON string for flexibility
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const checkins = pgTable("checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  summary: text("summary").notNull(),
  doingSnapshot: text("doing_snapshot"), // JSON array of task IDs
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskEvent = typeof taskEvents.$inferSelect;
export type NewTaskEvent = typeof taskEvents.$inferInsert;
export type Checkin = typeof checkins.$inferSelect;
export type NewCheckin = typeof checkins.$inferInsert;
export type Bucket = (typeof bucketEnum.enumValues)[number];
export type Priority = (typeof priorityEnum.enumValues)[number];
