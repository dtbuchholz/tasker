CREATE TYPE "public"."bucket" AS ENUM('inbox', 'next', 'doing', 'done');--> statement-breakpoint
CREATE TYPE "public"."outbox_message_type" AS ENUM('daily_checkin', 'weekly_review', 'reminder');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('p1', 'p2', 'p3');--> statement-breakpoint
CREATE TYPE "public"."task_event_type" AS ENUM('created', 'updated', 'moved', 'completed', 'blocked', 'unblocked');--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"summary" text NOT NULL,
	"doing_snapshot" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_type" "outbox_message_type" NOT NULL,
	"content" text NOT NULL,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"event_type" "task_event_type" NOT NULL,
	"payload" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"bucket" "bucket" DEFAULT 'inbox' NOT NULL,
	"notes_md" text,
	"project" text,
	"estimate_minutes" integer,
	"priority_hint" "priority",
	"blocked_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_events" ADD CONSTRAINT "task_events_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;