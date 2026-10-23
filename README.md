# VinzFlow — Enterprise Project Management & Team Collaboration Platform

VinzFlow is a modern, fully responsive, production-ready SaaS application for project management and team collaboration. Inspired by the speed and elegance of **Linear** and **Notion** paired with the deep task execution capabilities of **ClickUp** and **Asana**.

![VinzFlow Project Management](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80)

---

## ✨ Features Overview

### 1. 🎨 Design & Interaction
- **Aesthetic:** Minimalist Linear/Notion dark mode and crisp light mode with persistent local preferences.
- **Navigation:** Collapsible left sidebar, sticky top navbar with breadcrumbs, project switcher, and command palette.
- **Global Command Palette:** Hit `⌘ / Ctrl + K` to search across tasks, projects, notes, and team members with instant navigation.
- **Keyboard Shortcuts:** Press `?` anywhere to reveal shortcut cheat sheets.

### 2. 📊 Centralized Main Dashboard
- **Key Metrics:** Active Projects, Assigned to Me, In Progress, Completed, Overdue alerts, and Health Score.
- **Task Distribution Bar:** Real-time visual breakdown across Backlog, To Do, In Progress, In Review, and Done.
- **Upcoming Deadlines & Overdue Watch:** Alerts for urgent deliverables.
- **Active Projects & Health:** Live progress bars driven by task completion states.
- **Recent Team Activity Feed:** Real-time audit trail of comments, moves, and creations.

### 3. 📋 Fully Draggable Kanban Board (`@dnd-kit`)
- **Drag & Drop:** Drag cards between columns and reorder cards within columns.
- **Real Persistence:** Moving a card updates its status in the database and recalculates project progress percentages. Positions remain intact upon page refresh.
- **Celebration Feedback:** Completing tasks triggers an optimistic confetti celebration.
- **Customizable Columns:** Add, rename, collapse/expand, and delete columns.
- **Filter Toolbar:** Filter on-the-fly by assignee, priority, status, or search query.
- **Mobile & Keyboard Accessible:** Built with pointer, touch, and keyboard sensors.

### 4. 📑 List / Table View
- **Structured Spreadsheet View:** Collapsible status groups, customizable density (comfortable/compact).
- **Inline Editing:** Instantly update status, priority, due dates, and assignees.
- **Multi-select & Bulk Actions:** Bulk select tasks to update statuses or delete in one click.

### 5. 📅 Master Calendar & Gantt Timeline
- **Monthly/Weekly Calendar:** Interactive calendar placing tasks on their target dates.
- **Gantt Schedule View:** Horizontal duration bars, milestone diamonds, and dependency markers.

### 6. 📝 Quick Notes (Notion-inspired Scratchpad)
- **Instant Drawer:** Accessible from any page via the top bar or `Q` key.
- **Markdown & Checklists:** Rich notes with tags and pinned notes.
- **Convert to Task:** Turn any note into a full project task with one click.

### 7. 📢 Team Announcements Center
- **Bulletins:** Urgent, Important, and General announcements with rich formatted content.
- **Interactive Reactions:** Emoji reactions with live counts and read/unread status tracking.

### 8. 👥 Team & Workspace Roles
- **Multi-Role RBAC:** Workspace Owner, Administrator, Project Manager, Member, and Guest.
- **Workload Capacity:** Monitors estimated hours vs capacity (40h/week) with overload warnings.
- **Live User Persona Switcher:** Switch between Alex Morgan, Elena Rostova, Marcus Chen, and David Kim to test permissions and multi-user interactions.

### 9. ⏱️ Integrated Time Tracker
- **Live Stopwatch Timer:** Start/stop active tracking from task slide-over or top bar.
- **Manual Logs:** Add manual time entries with descriptions and billable flags.

---

## 🛠️ Technology Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router, React 18, TypeScript)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with CSS variables
- **Icons:** [Lucide React](https://lucide.dev/)
- **Drag & Drop:** [@dnd-kit/core](https://dndkit.com/), `@dnd-kit/sortable`, `@dnd-kit/utilities`
- **Animations:** [Framer Motion](https://www.framer.com/motion/) & [Canvas-Confetti](https://www.npmjs.com/package/canvas-confetti)
- **Database & RLS:** PostgreSQL schema with Row Level Security (`supabase/migrations/001_initial_schema.sql`)
- **Real-Time Sync:** Native `BroadcastChannel` cross-tab synchronization + Supabase Realtime client readiness.

---

## 🚀 Getting Started

### 1. Installation

```bash
# Clone the repository and navigate to folder
cd "Project Management"

# Install dependencies
npm install
```

### 2. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build

```bash
npm run build
npm start
```

---

## 🗄️ Database Migrations (Supabase)

To connect VinzFlow to a hosted Supabase PostgreSQL instance:

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Set your Supabase project credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Run the SQL migration located at `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor. It sets up all tables, foreign keys, indexes, and Row Level Security policies.

*(Note: If no Supabase credentials are provided, VinzFlow seamlessly operates in high-performance local-first persistent mode with full cross-tab synchronization).*

---

## ⌨️ Global Shortcuts

| Shortcut | Action |
| --- | --- |
| `⌘ / Ctrl + K` | Global Command Palette & Fuzzy Search |
| `?` | Keyboard Shortcuts Cheat Sheet |
| `Esc` | Close slide-over or modal |
| `Q` | Open Quick Notes Scratchpad |
| `N` | Quick Create Task |
| `P` | Create New Project |
| `1` | Switch to Kanban Board View |
| `2` | Switch to List Table View |
| `3` | Switch to Calendar View |
| `4` | Switch to Gantt Timeline View |

---

## 📄 License
MIT License. Built for internal team collaboration and enterprise scale.
