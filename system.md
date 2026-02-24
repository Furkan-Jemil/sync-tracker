SyncTracker – Execution Visibility & 
Responsibility Graph 
1. Product Vision 
SyncTracker is not a traditional task manager. 
It is a Responsibility & Sync Intelligence System designed to: 
● Make accountability explicit 
● Visualize responsibility chains 
● Track execution transparency 
● Show who is synced with whom 
● Log help requests, blockers, and time spent 
● Provide both structured and visual representations of task ownership 
The core principle: 
Every task must have traceable responsibility and visible sync status. 
2. Core Concepts 
2.1 Responsibility Model 
Every task must define: 
● Assigned By (who delegated it) 
● Primary Responsible Owner (accountable person) 
● Participants 
○ Contributor 
○ Helper 
○ Reviewer 
○ Observer 
Responsibility must be explicitly accepted. 
No silent assignment. 
2.2 Sync State Model 
Each participant has a live sync status: 
● IN_SYNC 
● NEEDS_UPDATE 
● BLOCKED 
● HELP_REQUESTED 
Status is user-controlled but time-sensitive (system can flag stale sync). 
3. Dual Visualization System 
We will implement: 
1. Responsibility Tree View (Structured) 
2. Interactive Sync Graph View (Dynamic) 
Both views represent the same underlying data. 
4. Responsibility Tree View (Structured 
View) 
Purpose: 
Clear hierarchical understanding of responsibility flow. 
Layout Structure: 
Task 
├── Assigned By: User A 
├── Responsible Owner: User B 
│     ├── Contributor: User C 
│     ├── Contributor: User D 
│     └── Helper: User E 
└── Reviewer: User F 
Requirements: 
● Expandable/collapsible tree 
● Status indicator next to each user (color-coded) 
● Clicking a user opens a side panel 
● Side panel shows: 
○ Sync status 
○ Last update 
○ Time logged 
○ Milestones completed 
○ Help requests made 
○ Notes 
Goal: 
Structured clarity without visual noise. 
5. Interactive Sync Graph View 
Purpose: 
Dynamic relationship visualization. 
Graph Structure: 
Nodes: 
● Task (central node) 
● Users 
Edges: 
● Assignment edge (Assigned By → Responsible) 
● Responsibility edge (Responsible → Contributors) 
● Collaboration edge (Contributor ↔ Helper) 
● Review edge (Responsible → Reviewer) 
Node Color Rules: 
● Green → In Sync 
● Yellow → Needs Update 
● Red → Blocked 
● Blue → Help Requested 
Behavior: 
● Nodes animate in when someone joins 
● Clicking a node opens detailed side panel 
● Hover shows quick summary 
● If user is BLOCKED, node pulses subtly 
● If sync stale beyond threshold, node auto-flags yellow 
Layout Rule: 
Fixed hierarchy layout: 
● Task in center (or top) 
● Responsible directly below/center 
● Contributors branching outward 
● Reviewers on outer layer 
Do NOT allow free-floating messy layout. 
Clarity > flexibility. 
6. Task Lifecycle Flow 
6.1 Task Creation 
Required fields: 
● Title 
● Description 
● Assigned By 
● Responsible Owner 
Responsible Owner must: 
● Accept responsibility explicitly 
System logs: 
"User X accepted responsibility at timestamp" 
6.2 Adding Participants 
When adding a participant: 
System logs: 
"User Y joined task and synced at timestamp" 
New participant must: 
● View task history 
● Acknowledge sync 
6.3 Sync Updates 
Participants can log: 
● Progress update 
● Blocked status 
● Help request 
● General note 
Each action creates: 
● Sync log entry 
● Graph update 
● Tree view update 
6.4 Help Request Flow 
When HELP_REQUESTED: 
● Responsible Owner notified 
● Assigner notified 
● Status changes to blue 
● Graph visually updates 
System logs: 
"User Z requested help" 
6.5 Responsibility Transfer 
If Responsible Owner changes: 
● Old owner must confirm transfer 
● New owner must accept responsibility 
● System logs both events 
● Graph updates edge direction 
No silent transfers allowed. 
7. Time & Milestones 
7.1 Time Tracking 
Users log: 
● Time spent 
● Optional description 
Displayed in: 
● Side panel 
● Aggregate task analytics 
7.2 Milestones / Subtasks 
Each task supports: 
● Ordered subtasks 
● Completed by 
● Timestamp 
Graph impact: 
● Milestone completion can visually pulse the responsible node 
8. Real-Time Behavior 
Use WebSockets for: 
● Sync status change 
● Participant join 
● Help request 
● Milestone completion 
● Responsibility transfer 
Graph and tree must update live. 
No page refresh. 
Core Philosophy 
This system is not about managing tasks. 
It is about: 
● Visible responsibility 
● Execution transparency 
● Real-time sync awareness 
● Cultural accountability reinforcement 