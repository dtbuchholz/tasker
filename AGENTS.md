# Task Management Semantics

## Bucket Definitions

### Inbox

- **Purpose**: Capture zone for all new tasks
- **Meaning**: "I need to process this later"
- **Move out when**: During planning/review, promoted to Next or archived
- **Contains**: Raw captures, unclear scope, needs triage

### Next

- **Purpose**: Curated queue of ready-to-work tasks
- **Meaning**: "I could start this soon"
- **Move out when**: Starting work (→ Doing) or deprioritized (→ Inbox)
- **Contains**: Clear scope, actionable, prioritized
- **Limit**: Keep to 10-15 tasks max for meaningful queue

### Doing

- **Purpose**: Active work in progress
- **Meaning**: "I'm working on this today/now"
- **Move out when**: Completed (→ Done) or stopped (→ Next)
- **Contains**: Current focus, time-boxed work
- **Limit**: 1-3 tasks typically, never more than 5
- **Followup target**: Only Doing tasks get status checks

### Done

- **Purpose**: Record of completed work
- **Meaning**: "This is finished"
- **Move out when**: Never (archive is implicit)
- **Contains**: Completed tasks with timestamps

## Priority Hints

- **P1**: Must do today / urgent / blocking others
- **P2**: Should do soon / important but not urgent
- **P3**: Nice to have / can wait / low stakes

Priorities are hints, not hard rules. Default to no priority if unclear.

## Time Estimates

- Express in minutes: `~15m`, `~30m`, `~60m`, `~120m`
- Round to common intervals: 15, 30, 45, 60, 90, 120
- If unsure, omit rather than guess
- Estimates help with daily planning, not accountability

## Projects

- Optional grouping tag: `#project-name`
- Lowercase, hyphenated
- Use for filtering/reporting, not hierarchy
- Examples: `#home`, `#work`, `#side-project`

## Blocked Tasks

- Blocked tasks stay in their bucket but are excluded from lists by default
- Always record a reason: "waiting on X", "needs Y first"
- Unblock explicitly when blocker is resolved
- Review blocked tasks in stale reviews

## Stale Task Handling

Tasks become stale when untouched for 7+ days.

**Review actions**:

1. **Reschedule**: Update timestamp, optionally move bucket
2. **Archive**: Move to Done with note "archived - no longer relevant"
3. **Split**: Break into smaller tasks if too big
4. **Clarify**: Add notes if scope was unclear

## Response Tone

- **Fluff minimal**: No "Great!", "Sure thing!", etc.
- **Bullet points**: Compact, scannable
- **IDs visible**: Show first 8 chars of UUID for reference
- **Timestamps optional**: Only when relevant
- **Emoji sparing**: ✓ for success, ⏰ for followup, ⚠️ for warnings

## Followup Etiquette

- Only ask about Doing tasks
- Max 5 followups per interaction
- Check if still working, blocked, or should deprioritize
- Don't followup more than once per day per task
- Frame as helpful check, not nagging

## Bulk Operations

When user sends multiple tasks:

1. Parse each item
2. Create all in Inbox
3. Summarize: "Created 5 tasks in Inbox"
4. Optionally offer to triage: "Want to move any to Next?"

When user asks to clear/archive:

1. List what will be affected
2. Confirm before bulk move
3. Report counts after

## Natural Language Parsing

**Task indicators**:

- Imperative verbs: "buy X", "call Y", "fix Z"
- TODO markers: "need to", "should", "have to"
- Questions about doing: "can you add...", "remind me to..."

**Metadata extraction**:

- Time estimates: "30 min", "~1hr", "quick"
- Priority: "urgent", "important", "when I get a chance"
- Project: "#project" or contextual ("for work", "at home")

**Not tasks**:

- Questions: "what's on my list?"
- Status updates: "I finished X"
- Configuration: "set my timezone"
