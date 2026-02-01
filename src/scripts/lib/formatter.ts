import type { Bucket, Task } from "../../db/schema.js";

export interface CheckinData {
  todayPlan: Task[];
  staleTasks: Task[];
  counts: Record<Bucket, number>;
  inboxTasks: Task[];
}

export interface WeeklyData extends CheckinData {
  completedThisWeek: Task[];
}

function formatTaskLine(task: Task): string {
  const parts = [`[${task.id.slice(0, 8)}] ${task.title}`];
  if (task.estimateMinutes) parts.push(`~${task.estimateMinutes}m`);
  if (task.blockedReason) parts.push(`BLOCKED`);
  return parts.join(" ");
}

function getDaysAgo(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function getDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function getWeekOfDate(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  return monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatFollowupQuestions(doingTasks: Task[], max: number = 5): string {
  if (doingTasks.length === 0) return "";

  const questions = doingTasks.slice(0, max).map((task) => {
    const daysInDoing = getDaysAgo(task.updatedAt);
    if (daysInDoing > 2) {
      return `• "${task.title}" - still working on this? (${daysInDoing}d)`;
    }
    return `• "${task.title}" - any blockers?`;
  });

  return ["", "Followup:", ...questions].join("\n");
}

export function formatDailyCheckin(data: CheckinData): string {
  const { todayPlan, staleTasks, inboxTasks } = data;
  const lines: string[] = ["Good morning! Here's your daily check-in:"];

  const doing = todayPlan.filter((t) => t.bucket === "doing");
  const next = todayPlan.filter((t) => t.bucket === "next");

  if (doing.length > 0) {
    lines.push("", `DOING (${doing.length}):`);
    doing.forEach((t) => lines.push(`• ${formatTaskLine(t)}`));
  }

  if (next.length > 0) {
    lines.push("", `NEXT UP (${next.length}):`);
    next.forEach((t) => lines.push(`• ${formatTaskLine(t)}`));
  }

  if (doing.length === 0 && next.length === 0) {
    lines.push("", "No tasks in Doing or Next. Time to plan your day!");
  }

  if (inboxTasks.length > 0) {
    lines.push("", `Inbox needs triage (${inboxTasks.length} items)`);
  }

  if (staleTasks.length > 0) {
    lines.push("", `Stale tasks (${staleTasks.length}):`);
    staleTasks.slice(0, 5).forEach((t) => {
      const daysAgo = getDaysAgo(t.updatedAt);
      lines.push(`• ${formatTaskLine(t)} [${daysAgo}d ago]`);
    });
  }

  // Add followup questions for doing tasks
  const followup = formatFollowupQuestions(doing);
  if (followup) {
    lines.push(followup);
  }

  return lines.join("\n");
}

export function formatWeeklyReview(data: WeeklyData): string {
  const { todayPlan, staleTasks, counts, completedThisWeek } = data;
  const lines: string[] = [`Weekly Review - Week of ${getWeekOfDate()}`];

  // Completed this week
  if (completedThisWeek.length > 0) {
    lines.push("", `Completed this week (${completedThisWeek.length}):`);
    completedThisWeek.slice(0, 10).forEach((t) => {
      const day = getDayName(t.updatedAt);
      lines.push(`• ${t.title} (${day})`);
    });
    if (completedThisWeek.length > 10) {
      lines.push(`• ... and ${completedThisWeek.length - 10} more`);
    }
  } else {
    lines.push("", "No tasks completed this week.");
  }

  // Current state
  lines.push(
    "",
    "Current state:",
    `  Inbox: ${counts.inbox} | Next: ${counts.next} | Doing: ${counts.doing} | Done: ${counts.done}`
  );

  // Stale tasks
  if (staleTasks.length > 0) {
    lines.push("", `Stale tasks needing attention (${staleTasks.length}):`);
    staleTasks.slice(0, 5).forEach((t) => {
      const daysAgo = getDaysAgo(t.updatedAt);
      lines.push(`• ${formatTaskLine(t)} [${daysAgo}d ago]`);
    });
  }

  // Focus for next week
  const doing = todayPlan.filter((t) => t.bucket === "doing");
  const next = todayPlan.filter((t) => t.bucket === "next");
  const focusTasks = [...doing, ...next].slice(0, 3);

  if (focusTasks.length > 0) {
    lines.push("", "Focus for next week:");
    focusTasks.forEach((t) => lines.push(`• ${formatTaskLine(t)}`));
  }

  return lines.join("\n");
}
