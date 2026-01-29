#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { closePool, getDb } from "../db/client.js";
import type { Bucket } from "../db/schema.js";
import * as repo from "../db/repo.js";

import {
  executeTask_block,
  executeTask_complete,
  executeTask_create,
  executeTask_get,
  executeTask_list,
  executeTask_move,
  executeTask_unblock,
  executeTask_update,
  executeTasks_count,
  executeTasks_review,
  executeTasks_today,
  toolDescriptions,
  toolSchemas,
} from "./tools.js";

const server = new McpServer({
  name: "tasker",
  version: "0.1.0",
});

const db = getDb();

// Register tools
server.tool(
  "task_create",
  toolDescriptions.task_create,
  toolSchemas.task_create.shape,
  async (args) => {
    const result = await executeTask_create(db, toolSchemas.task_create.parse(args));
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "task_update",
  toolDescriptions.task_update,
  toolSchemas.task_update.shape,
  async (args) => {
    const result = await executeTask_update(db, toolSchemas.task_update.parse(args));
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool("task_move", toolDescriptions.task_move, toolSchemas.task_move.shape, async (args) => {
  const result = await executeTask_move(db, toolSchemas.task_move.parse(args));
  return { content: [{ type: "text", text: result }] };
});

server.tool(
  "task_complete",
  toolDescriptions.task_complete,
  toolSchemas.task_complete.shape,
  async (args) => {
    const result = await executeTask_complete(db, toolSchemas.task_complete.parse(args));
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "task_block",
  toolDescriptions.task_block,
  toolSchemas.task_block.shape,
  async (args) => {
    const result = await executeTask_block(db, toolSchemas.task_block.parse(args));
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "task_unblock",
  toolDescriptions.task_unblock,
  toolSchemas.task_unblock.shape,
  async (args) => {
    const result = await executeTask_unblock(db, toolSchemas.task_unblock.parse(args));
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool("task_list", toolDescriptions.task_list, toolSchemas.task_list.shape, async (args) => {
  const result = await executeTask_list(db, toolSchemas.task_list.parse(args));
  return { content: [{ type: "text", text: result }] };
});

server.tool("task_get", toolDescriptions.task_get, toolSchemas.task_get.shape, async (args) => {
  const result = await executeTask_get(db, toolSchemas.task_get.parse(args));
  return { content: [{ type: "text", text: result }] };
});

server.tool(
  "tasks_today",
  toolDescriptions.tasks_today,
  toolSchemas.tasks_today.shape,
  async () => {
    const result = await executeTasks_today(db);
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "tasks_review",
  toolDescriptions.tasks_review,
  toolSchemas.tasks_review.shape,
  async (args) => {
    const result = await executeTasks_review(db, toolSchemas.tasks_review.parse(args));
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "tasks_count",
  toolDescriptions.tasks_count,
  toolSchemas.tasks_count.shape,
  async () => {
    const result = await executeTasks_count(db);
    return { content: [{ type: "text", text: result }] };
  }
);

// Register resources
async function formatTaskList(bucket: Bucket): Promise<string> {
  const tasks = await repo.listTasks(db, { bucket });
  if (tasks.length === 0) return `No tasks in ${bucket}.`;
  return tasks.map((t) => `- [${t.id.slice(0, 8)}] ${t.title}`).join("\n");
}

server.resource("inbox", "tasks://inbox", { description: "Inbox tasks" }, async () => ({
  contents: [{ uri: "tasks://inbox", text: await formatTaskList("inbox"), mimeType: "text/plain" }],
}));

server.resource("next", "tasks://next", { description: "Next tasks" }, async () => ({
  contents: [{ uri: "tasks://next", text: await formatTaskList("next"), mimeType: "text/plain" }],
}));

server.resource("doing", "tasks://doing", { description: "Doing tasks" }, async () => ({
  contents: [{ uri: "tasks://doing", text: await formatTaskList("doing"), mimeType: "text/plain" }],
}));

server.resource("today", "tasks://today", { description: "Today plan" }, async () => {
  const result = await executeTasks_today(db);
  return {
    contents: [{ uri: "tasks://today", text: result, mimeType: "text/plain" }],
  };
});

// Cleanup on exit
process.on("SIGINT", async () => {
  await closePool();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closePool();
  process.exit(0);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Tasker MCP server running on stdio");
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
