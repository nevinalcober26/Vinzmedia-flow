# Workspace roles setup

1. Open `workspace_roles.sql`, copy the whole file, and run it in your Supabase project's SQL Editor as the database administrator.
2. Reload the application. Open **Team & Roles → Manage roles & access** (also available under **Settings → Role-Based Access Control**).
3. Select a built-in role or add a custom role. Check its pages and action permissions, then save. Assign it from the member's role dropdown.

Owner retains full access. Owner and Super Admin manage role definitions and assignments; neither can demote themselves through this screen. New invitations start as Member and can then be assigned a different role. Role changes refresh when a member returns focus to the application.

The SQL preserves existing custom role definitions and assignments when rerun. It adds protected role tables, seeds existing workspaces, and initializes future workspaces/members. It adds restrictive policies for core workspace, membership, project, task, note, announcement, client, and file operations without removing existing narrower policies.

Sidebar switches hide pages and block navigation. They are not field-level data isolation: shared project data can still appear on other permitted pages. Existing specialized policies for billing, time entries, storage, and project/task child tables remain in place; this script is not a replacement for an audit of legacy database access policies.

The SQL was exercised against a temporary PostgreSQL-compatible PGlite database with allow/deny tests. It has not been executed against your live Supabase project. The reproducible test is `scripts/test-workspace-roles.mjs` (requires `@electric-sql/pglite`, or a `PGLITE_MODULE` path to its module).

Invoices use the invoice logo URL from Settings when set, otherwise the workspace logo, otherwise the app icon. Sender settings including this optional URL are stored in this browser, matching the existing sender-settings behavior.
