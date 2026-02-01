CREATE TYPE "public"."outbox_message_type" AS ENUM('daily_checkin', 'weekly_review', 'reminder');--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_type" "outbox_message_type" NOT NULL,
	"content" text NOT NULL,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
