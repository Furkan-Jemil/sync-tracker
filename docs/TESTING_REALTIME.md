# SyncTracker — Frontend Real-Time Testing Guide

Manual QA procedures for verifying Socket.IO event propagation across the graph and tree views.

---

## Prerequisites

1. **Start Redis** (required for Socket.IO adapter):
   ```bash
   docker run -d -p 6379:6379 redis
   ```
2. **Start the dev server**:
   ```bash
   npm run dev
   ```
3. **Seed the database** with at least 2 tasks and 3+ participants:
   ```bash
   npx prisma db seed
   ```

---

## Test 1 — Room Join & Event Isolation

**Goal:** Events for Task A must NOT appear in a tab viewing Task B.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open **Tab 1** → login as User A → navigate to Task A | Graph/Tree renders Task A participants |
| 2 | Open **Tab 2** → login as User B → navigate to Task B | Graph/Tree renders Task B participants |
| 3 | Open **Tab 3** → login as User C → navigate to Task A | Graph/Tree renders Task A participants |
| 4 | In Tab 1, trigger a sync update (e.g. mark a participant as `BLOCKED`) | Tab 1 and Tab 3 update immediately |
| 5 | Check Tab 2 | **No changes** — Tab 2 is in Task B's room |

**Console verification:** Open DevTools in each tab. Only tabs in the matching `task:` room should log `[sync_updated]`.

---

## Test 2 — `sync_updated` Color Changes

**Goal:** Node colors and pulse animations reflect each `SyncStatus`.

| Step | Action | Expected Node Color |
|------|--------|---------------------|
| 1 | Set participant to `IN_SYNC` via API or UI | **Emerald** (green) — solid, no animation |
| 2 | Set participant to `NEEDS_UPDATE` | **Amber** (yellow) — solid |
| 3 | Set participant to `BLOCKED` | **Rose** (red) — **pulsing animation** |
| 4 | Set participant to `HELP_REQUESTED` | **Blue** — outer glow effect |

**API shortcut** to trigger from terminal:
```bash
curl -X POST http://localhost:3000/api/tasks/TASK_ID/sync \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","status":"BLOCKED"}'
```

**Verify in both views:**
- Switch to **Graph View** → node color matches
- Switch to **Tree View** → badge and row color match
- Both views update without a page refresh

---

## Test 3 — `help_requested` Notification

**Goal:** Help request reaches the task owner's global room.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open **Tab 1** as the task owner (joined to `user:<ownerId>` room) | — |
| 2 | Open **Tab 2** as a contributor on the same task | — |
| 3 | From Tab 2, trigger a help request | Tab 2's node turns **blue** (HELP_REQUESTED) |
| 4 | Check Tab 1 | Console logs `[help_requested]` with requestor details |
| 5 | Check any tab NOT in the owner's user room | **No** help_requested event received |

**API shortcut:**
```bash
curl -X POST http://localhost:3000/api/tasks/TASK_ID/sync \
  -H "Content-Type: application/json" \
  -d '{"userId":"CONTRIBUTOR_ID","status":"HELP_REQUESTED","note":"Blocked on env vars"}'
```

---

## Test 4 — `milestone_updated` Logging

**Goal:** All users in the task room receive milestone completion events.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open 2+ tabs logged into the same task | — |
| 2 | Trigger a milestone completion event (via API or seed script) | All tabs log `[milestone_updated]` in the console |
| 3 | Verify payload includes `milestoneId`, `isCompleted`, `completedById` | ✅ |

---

## Test 5 — Multi-User Concurrent Updates

**Goal:** Rapid, overlapping status changes from multiple users resolve correctly.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open **3 tabs** as different users, all on the same task | — |
| 2 | Simultaneously trigger status changes from Tab 1 and Tab 2 (within 1 second) | All 3 tabs converge to the same final state |
| 3 | Verify the graph layout doesn't break or duplicate nodes | No visual glitches |
| 4 | Refresh any tab | State matches the other tabs (Zustand + TanStack Query re-sync) |

---

## Test 6 — Pulse Animation Performance

**Goal:** BLOCKED pulse animation doesn't cause jank or GPU hangs.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set **3+ participants** to `BLOCKED` simultaneously | All nodes pulse smoothly |
| 2 | Open Chrome DevTools → Performance tab → record 5 seconds | FPS stays above **55 fps** |
| 3 | Switch between Graph and Tree views rapidly | No layout thrashing or memory leaks |

---

## Quick DevTools Checklist

Open the browser console and verify these log lines appear at the right times:

```
[socket] Connected ✓  id=...                    ← on page load
[sync_updated] Task task-1 — user u-alex: ...   ← on status change
[help_requested] User u-jamie needs help ...    ← on help request
[milestone_updated] Task task-1 — milestone ... ← on milestone event
```

If `[socket] Connection error:` appears, check that:
- Redis is running on port `6379`
- `NEXT_PUBLIC_API_URL` is set in `.env`
- The custom server (`npm run dev`) is running, not `next dev`
