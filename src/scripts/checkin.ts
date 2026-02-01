#!/usr/bin/env node
import { getDb, closePool } from "../db/client.js";
import * as repo from "../db/repo.js";
import { formatDailyCheckin, formatWeeklyReview } from "./lib/formatter.js";
import type { OutboxMessageType } from "../db/schema.js";

async function main() {
  const isWeekly = process.argv.includes("--weekly");
  const dryRun = process.argv.includes("--dry-run");
  const messageType: OutboxMessageType = isWeekly ? "weekly_review" : "daily_checkin";

  const db = getDb();

  try {
    // Gather data
    const [todayPlan, staleTasks, counts, inboxTasks] = await Promise.all([
      repo.getTodayPlan(db),
      repo.getStaleTasks(db, 7),
      repo.countTasks(db),
      repo.listTasks(db, { bucket: "inbox" }),
    ]);

    let message: string;

    if (isWeekly) {
      const completedThisWeek = await repo.getCompletedThisWeek(db);
      message = formatWeeklyReview({
        todayPlan,
        staleTasks,
        counts,
        inboxTasks,
        completedThisWeek,
      });
    } else {
      message = formatDailyCheckin({
        todayPlan,
        staleTasks,
        counts,
        inboxTasks,
      });
    }

    if (dryRun) {
      console.log("[DRY RUN] Would create outbox message:\n");
      console.log(message);
      return;
    }

    // Write to outbox
    const outboxMessage = await repo.createOutboxMessage(db, messageType, message);
    console.log(`Created ${messageType} message: ${outboxMessage.id}`);

    // Also output the message for debugging/logging
    console.log("\n" + message);
  } finally {
    await closePool();
  }
}

main().catch((err) => {
  console.error("Check-in failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
