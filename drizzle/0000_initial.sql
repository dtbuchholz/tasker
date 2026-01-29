-- Enums
CREATE TYPE "bucket" AS ENUM ('inbox', 'next', 'doing', 'done');
CREATE TYPE "priority" AS ENUM ('p1', 'p2', 'p3');
CREATE TYPE "task_event_type" AS ENUM ('created', 'updated', 'moved', 'completed', 'blocked', 'unblocked');

-- Tasks table
CREATE TABLE "tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "bucket" "bucket" NOT NULL DEFAULT 'inbox',
  "notes_md" text,
  "project" text,
  "estimate_minutes" integer,
  "priority_hint" "priority",
  "blocked_reason" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Task events (audit log)
CREATE TABLE "task_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" uuid NOT NULL REFERENCES "tasks"("id"),
  "event_type" "task_event_type" NOT NULL,
  "payload" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Checkins (summary log)
CREATE TABLE "checkins" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "summary" text NOT NULL,
  "doing_snapshot" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX "tasks_bucket_idx" ON "tasks"("bucket");
CREATE INDEX "tasks_project_idx" ON "tasks"("project");
CREATE INDEX "tasks_updated_at_idx" ON "tasks"("updated_at");
CREATE INDEX "task_events_task_id_idx" ON "task_events"("task_id");
