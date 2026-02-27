# SyncTracker

SyncTracker is a Responsibility & Execution Visibility System that makes ownership, accountability chains, and task synchronization transparent across teams.

Instead of hiding work inside issue trackers and DMs, SyncTracker models execution as **responsibility graphs**: who owns what, who is supporting whom, and where tasks are blocked. A real‑time **Graph View** and **Responsibility Tree View** give leads and ICs a shared, live picture of work in motion. The system combines **Socket.IO + Redis** for real-time propagation, **Prisma + PostgreSQL** for persistence, and **Zustand + React Flow** for a responsive visualization layer. An AI agent (Antigravity) supports the development workflow by scaffolding code, generating tests, and helping keep frontend and backend behavior consistent.

---

## Features

- **Real-time task synchronization**
  - Socket.IO for low-latency updates
  - Redis pub/sub adapter for horizontal scaling and cross-instance broadcasting
  - Live task lifecycle events (created, updated, status changed, ownership transferred)

- **Responsibility visualization**
  - **Interactive Graph View (React Flow)**:
    - Task at the center, with owners, contributors, helpers, and reviewers as connected nodes
  - **Responsibility Tree View**:
    - Hierarchical Task → Owner → Contributors → Reviewers breakdown

- **Task operations**
  - Task creation modal with validation
  - Per-task milestones
  - Ownership transfer requests and approvals
  - Sync-status updates (`IN_SYNC`, `NEEDS_UPDATE`, `BLOCKED`, `HELP_REQUESTED`)

- **Dashboard and UX**
  - Sidebar navigation: Dashboard, Team, Tasks, Activity
  - Graph/Tree view toggles with URL-based deep linking (`?view=graph|tree`)
  - Task and team search / filtering
  - Live connection indicators and participant counts
  - Task side panel with logs, milestones, and handover controls

- **State and data management**
  - Zustand stores for UI and domain state
  - TanStack Query for data fetching, caching, and invalidation
  - Central socket listener to bridge Socket.IO events into client state

- **Security & persistence**
  - JWT-based authentication with HttpOnly cookies
  - Password hashing via bcrypt
  - Prisma ORM with PostgreSQL (e.g. Neon) as the primary datastore
  - Redis as Socket.IO adapter and event bus

- **AI Agent-assisted development**
  - Antigravity agent used to:
    - Generate and refine test scripts (Prisma models, auth flows, Socket.IO behavior)
    - Propose code structure, API shapes, and Zustand stores
    - Apply changes according to `system.md` design constraints
    - Execute integration tasks in isolated phases (e.g., routing, modal behavior, graph wiring)
    - Validate live synchronization flows without exhaustive manual testing

---

## Tech Stack

### Frontend

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State management**: Zustand
- **Data fetching**: TanStack Query
- **Visualization**: React Flow (`@xyflow/react`)
- **UI**: Custom + shadcn-style components
- **Icons**: Lucide

### Backend

- **Runtime**: Next.js API Routes
- **Database**: PostgreSQL (Neon or compatible)
- **ORM**: Prisma
- **Real-time**: Socket.IO
- **Pub/Sub**: Redis (Socket.IO Redis adapter)
- **Auth**: JWT + bcrypt
- **Validation**: Zod

---

## System Architecture

### 1. Real-time event flow

1. **Client initialization**
   - User signs in via `/api/auth/login` and receives a JWT stored in an HttpOnly cookie.
   - Protected routes are wrapped in `ProtectedRoute`, which:
     - Checks the session via `/api/auth/me`.
     - Redirects unauthenticated users to `/login`.

2. **HTTP data fetching**
   - TanStack Query hooks (`useTasks`, team queries, etc.) call Next.js API routes.
   - API handlers use Prisma to read/write PostgreSQL and return normalized JSON payloads.
   - The `useTaskStore` Zustand store is hydrated with the current `Task[]` from these responses.

3. **Socket.IO connection**
   - A singleton Socket.IO client (`src/lib/socket.ts`) is initialized with:
     - `withCredentials: true` so JWT cookies are sent during handshake.
     - A configurable `NEXT_PUBLIC_API_URL`.
   - The `SocketListener` component:
     - Connects the socket when mounted.
     - Subscribes to events like:
       - `task_created`
       - `task_updated`
       - `sync_updated`
       - `help_requested`
       - `transfer_requested`
       - `transfer_resolved`
     - Updates Zustand state and invalidates relevant TanStack Query caches.

4. **Server-side events**
   - Next.js API routes handle mutations (e.g., create task, update status, add milestone) via Prisma.
   - After a successful write, handlers emit Socket.IO events using a shared server emitter (`socket-emitter`).
   - Other server instances receive these via the Redis adapter and forward them to subscribed clients.

### 2. Redis adapter usage

- Socket.IO on the backend is configured with the **Redis adapter**, so all instances share:
  - A pub channel for outbound events.
  - A sub channel for inbound events.
- When a handler emits `task_created`, the adapter:
  - Publishes to Redis.
  - Other Node workers subscribed to that channel receive the event.
  - Each worker forwards the event to the appropriate clients (rooms).

This decouples per-instance memory from event propagation and allows horizontal scaling.

### 3. Socket rooms

Socket rooms are used to scope events:

- `user:{userId}`:
  - User-specific events (new assignments, transfer requests).
- `task:{taskId}`:
  - Events scoped to all participants in a given task.
- Optional workspace/org rooms (if multi-tenant):
  - `org:{orgId}` for organization-level events.

When a task is created:

- All relevant users are joined to `task:{taskId}`.
- A `task_created` event is published globally.
- A `task_assigned` event is sent specifically to `user:{ownerId}`.

### 4. Client state synchronization

- **Zustand**:
  - `useTaskStore` holds the normalized task list and participant sync statuses.
  - `useUIStore` controls which dashboard tab is active, side panel visibility, and other UI state.
- **React Query**:
  - Responsible for initial fetch and refetch (e.g., after POST/PUT/PATCH).
  - `SocketListener` invalidates query keys when server events arrive.
- **Views**:
  - **Graph View** (`SyncGraph`):
    - Builds React Flow nodes/edges from `Task[]` and participant roles.
    - Reacts to task store updates automatically.
  - **Responsibility Tree View**:
    - Renders a hierarchical tree of tasks and participants from the same store.
- **Live indicators**:
  - Connection status is derived from `socket.connected` and heartbeat checks.
  - Online participant count is computed from the number of participants with `syncStatus === "IN_SYNC"` across tasks.

### 5. Agent-assisted development workflow

The Antigravity AI Agent supports the development lifecycle:

- **Scaffolding and structure**
  - Proposes initial file/folder layouts for `app`, `components`, `store`, and `lib`.
  - Generates React components for the dashboard shell, graph, tree, and modals.
  - Suggests Zustand store shapes and API contracts consistent with `system.md`.

- **Backend and integration**
  - Produces Prisma models and migrations aligned with the task/ownership domain.
  - Generates Next.js API route handlers with Zod schemas for:
    - Task CRUD
    - Milestones
    - Sync status updates
    - Ownership transfers
  - Writes Socket.IO integration code and Redis adapter configuration.

- **Testing and verification**
  - Generates test scripts and scenarios for:
    - Prisma operations (task + milestone lifecycle).
    - Auth flows (registration, login, logout, protected routes).
    - Real-time events (mock events verifying store updates).
  - Performs integration tasks in isolated phases (e.g., first wiring state, then wiring UI).
  - Spot-checks live synchronization behavior during development, reducing manual regression effort.

---

## Project Structure

> Paths are relative to the repository root and may be slightly simplified.

```text
src/
  app/
    (auth)/
      login/page.tsx
      register/page.tsx
    api/
      auth/
        login/route.ts
        register/route.ts
        me/route.ts
        logout/route.ts
      users/route.ts
      tasks/
        route.ts                  # GET/POST tasks
        [taskId]/route.ts         # GET/PUT single task
        [taskId]/milestones/route.ts
        [taskId]/sync/route.ts
        [taskId]/participants/route.ts
        [taskId]/transfer/route.ts
      health/route.ts
    layout.tsx                    # Root layout with Providers + ProtectedRoute
    page.tsx                      # Dashboard entry (DashboardShell, default tab)
    team/page.tsx                 # Team tab
    tasks/page.tsx                # Tasks tab
    activity/page.tsx             # Activity/logs tab
    globals.css

  components/
    auth/
      ProtectedRoute.tsx
    dashboard/
      DashboardShell.tsx          # Sidebar, header, routing between main views
      TasksView.tsx
      TeamView.tsx
      LogsView.tsx
    interactive-graph/
      SyncGraph.tsx
      CustomNode.tsx
      layout.ts
    responsibility-tree/
      ResponsibilityTree.tsx
    task-details/
      SidePanel.tsx
      CreateTaskModal.tsx
    SocketListener.tsx
    Providers.tsx                 # React Query provider

  hooks/
    useTasks.ts                   # Fetch + normalize tasks into Zustand

  lib/
    prisma.ts
    auth.ts
    socket.ts                     # Browser Socket.IO client
    socket-emitter.ts             # Backend Socket.IO emitter
    validations.ts                # Zod schemas

  store/
    useAuthStore.ts
    useTaskStore.ts
    useUIStore.ts

  prisma/
    schema.prisma                 # Task, user, participant, log, milestone models
```

---

## Environment Variables

Create a `.env` file in the project root. The following table documents the main variables:

| Variable               | Required | Description                                                  | Example                                                        |
| ---------------------- | -------- | ------------------------------------------------------------ | -------------------------------------------------------------- |
| `NODE_ENV`             | Yes      | Runtime environment                                          | `development` / `production`                                   |
| `DATABASE_URL`         | Yes      | PostgreSQL connection string (Neon or similar)              | `postgresql://user:pass@host:5432/sync?sslmode=require`        |
| `NEXT_PUBLIC_API_URL`  | Yes      | Public base URL used by the Socket.IO client                | `http://localhost:3000`                                       |
| `REDIS_URL`            | Yes      | Redis connection string for Socket.IO adapter               | `redis://localhost:6379`                                      |
| `JWT_SECRET`           | Yes      | Secret key for signing JWT tokens                           | `replace_me_with_a_long_random_secret`                        |
| `BCRYPT_SALT_ROUNDS`   | No       | Salt rounds for bcrypt hashing                              | `10`                                                           |
| `PORT`                 | No       | Port for the Next.js server                                 | `3000`                                                        |

Example `.env.example`:

```bash
NODE_ENV=development

DATABASE_URL=postgresql://user:pass@localhost:5432/sync-tracker?sslmode=disable

NEXT_PUBLIC_API_URL=http://localhost:3000

REDIS_URL=redis://localhost:6379

JWT_SECRET=replace_me_with_a_long_random_secret
BCRYPT_SALT_ROUNDS=10

PORT=3000
```

---

## Local Development Setup

### 1. Clone and install dependencies

```bash
git clone <your-repo-url> sync-tracker
cd sync-tracker

npm install
# or: pnpm install / yarn install
```

### 2. Configure environment

- Copy `.env.example` to `.env` and fill in:
  - `DATABASE_URL` (PostgreSQL / Neon)
  - `REDIS_URL`
  - `JWT_SECRET`
  - `NEXT_PUBLIC_API_URL` (usually `http://localhost:3000` in dev)

### 3. Setup database (Prisma + PostgreSQL)

```bash
npx prisma migrate dev
# Optional: seed example data
# npx prisma db seed
```

To inspect the schema and data:

```bash
npx prisma studio
```

### 4. Ensure Redis is running

If you don’t already have Redis running:

```bash
docker run --name sync-redis -p 6379:6379 redis:7
```

Verify `REDIS_URL` matches your local setup.

### 5. Run the development server

```bash
npm run dev
```

- Navigate to `http://localhost:3000`.
- Register a new user at `/register` and then log in via `/login`.

### 6. Optional: Use the AI Agent (Antigravity) locally

If you have the Antigravity agent wired into your workflow (e.g., via VS Code / Cursor):

- Use it to:
  - Generate new components or API handlers consistent with existing patterns.
  - Create new Prisma migrations and Zod schemas for extended functionality.
  - Draft tests when you change the Prisma models, auth flows, or Socket.IO events.

The agent is especially useful for keeping frontend state, backend APIs, and TypeScript types aligned when iterating quickly.

### 7. Build and run production

```bash
npm run build
npm start
```

Use this in combination with your hosting provider (Vercel, Fly.io, etc.) or a process manager like PM2.

---

## Test Instructions

### 1. TypeScript and linting

If scripts are configured in `package.json`:

```bash
npm run lint        # ESLint + Next.js recommended rules
npm run typecheck   # Standalone TypeScript check, if present
```

### 2. Automated tests (suggested patterns)

If/when you add Jest / Vitest / Playwright:

```bash
npm test
# or
npm run test:unit
npm run test:e2e
```

Typical areas to cover:

- **Prisma / DB**
  - Task creation, milestone creation, participant linking.
  - Ownership transfer invariants.
- **Auth**
  - Registration, login, logout, and protected route access.
  - JWT expiry and invalid token handling.
- **Socket.IO**
  - Event emission on task creation/update.
  - Client subscription and store updates.

### 3. AI agent-assisted tests

The Antigravity agent can help by:

- **Generating test scaffolds**
  - Propose Jest/Vitest test files for:
    - `/api/tasks` routes.
    - `/api/tasks/[taskId]/milestones`.
    - Auth routes (`/api/auth/login`, `/api/auth/register`, `/api/auth/me`).
    - Socket.IO event handlers and client listeners.

- **Validating flows**
  - Suggest integration sequences:
    - “Create task → add milestone → update sync status → check React Flow / tree state.”
  - Generate mock WebSocket event payloads and assert corresponding Zustand updates.

- **Regression checks**
  - After refactoring:
    - Ask the agent to re-derive expected API shapes and store types from `schema.prisma` and `validations.ts`.
    - Use it to ensure tests and types match the new designs.

### 4. Manual smoke tests

1. Log in and open the Dashboard.
2. Create a task via the **New Task** modal.
3. Confirm:
   - Task appears in Graph View.
   - Task appears in Tree View.
   - Task shows up in the Tasks tab with correct participant counts.
4. Open task details:
   - Add a milestone.
   - Change sync status.
5. Open a second browser window:
   - Verify that changes propagate in real time across sessions (graph, tree, side panel, logs).

---

## Roadmap

- **Short term**
  - Add role-based access control (RBAC) for tasks and organizations.
  - Enhance Activity filters and provide export (CSV/JSON).
  - Improve error surfaces in the UI (per-operation feedback, retry strategies).

- **Medium term**
  - SLA-style views for responsibility chains (latency, failure rates, chronic blockers).
  - Advanced analytics dashboards showing hotspots and ownership load distribution.
  - Webhook and chat integrations (Slack, Teams, incident management tools).
  - Improved offline/online handling and conflict resolution for sync status.

- **Long term**
  - Multi-tenant support with strict workspace isolation.
  - Pluggable task sources (Jira, GitHub, Linear) mapped into the responsibility graph.
  - Policy engine for auto-escalation, routing, and enforcement (e.g., “no orphaned tasks” rules).
  - Deeper AI integration to suggest reassignments, detect bottlenecks, and forecast risk.

---

## Author

SyncTracker is developed with a focus on **operational clarity** and **execution transparency**. The project combines robust real-time infrastructure, a clear domain model for responsibility, and AI-assisted engineering workflows.

