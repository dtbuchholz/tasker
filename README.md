# Tasker

A Telegram-first personal task management agent powered by Claude Code. Captures tasks via text/voice notes and manages them using an Inbox/Next/Doing/Done bucket system.

## Architecture

```
Telegram (takopi) --> Claude Code agent --> MCP server --> Postgres
```

- **Agent-as-runtime**: Claude Code processes messages and decides actions
- **MCP server**: Provides deterministic tools for database operations
- **External Postgres**: Managed database (Neon/Supabase) for persistence

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure database

Copy `.env.example` to `.env` and set your Postgres connection string:

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL
```

### 3. Run migrations

```bash
pnpm db:migrate
```

### 4. Build

```bash
pnpm build
```

## Usage

### MCP Server

Start the MCP server for Claude Code to use:

```bash
pnpm mcp
```

### Available Tools

| Tool            | Description                                           |
| --------------- | ----------------------------------------------------- |
| `task_create`   | Create a new task in a bucket                         |
| `task_update`   | Update task fields (title, notes, estimate, priority) |
| `task_move`     | Move task between buckets                             |
| `task_complete` | Mark task as done                                     |
| `task_block`    | Block a task with reason                              |
| `task_unblock`  | Unblock a task                                        |
| `task_list`     | List tasks by bucket (with optional filters)          |
| `task_get`      | Get single task by ID                                 |
| `tasks_today`   | Get today plan (Doing + top Next)                     |
| `tasks_review`  | Get stale tasks (>N days)                             |
| `tasks_count`   | Get task counts by bucket                             |

### Bucket System

- **Inbox**: Capture zone for new tasks, needs triage
- **Next**: Curated queue of ready-to-work tasks (10-15 max)
- **Doing**: Active work in progress (1-3 typical, 5 max)
- **Done**: Completed tasks

### Example Interactions

**Add tasks:**

```
"buy groceries, call mom, fix the login bug"
→ Creates 3 tasks in Inbox
```

**Check today's plan:**

```
"what should I work on?"
→ Shows Doing tasks + top Next tasks
```

**Complete a task:**

```
"done with the login bug"
→ Moves task to Done
```

**Block a task:**

```
"blocked on groceries - waiting for paycheck"
→ Marks task as blocked with reason
```

## Development

```bash
# Run tests
pnpm test

# Type check
pnpm type-check

# Lint
pnpm lint

# Format
pnpm format
```

## Configuration

See `CLAUDE.md` for agent behavior rules and `AGENTS.md` for detailed task management semantics.

### Environment Variables

| Variable          | Description                     |
| ----------------- | ------------------------------- |
| `DATABASE_URL`    | Postgres connection string      |
| `ALLOW_MUTATIONS` | Set to `false` for dry-run mode |
