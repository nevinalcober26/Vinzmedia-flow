# Client project board sharing

Run `project_board_sharing.sql` in your Supabase SQL Editor after `workspace_roles.sql`, then refresh the app. This SQL has not been applied to the live project by Codex.

In a Kanban board, Owners and Super Admins can choose **Share with client**, select a project, and choose **Anyone with link** or **With password**. Protected boards require a password of at least 12 characters (maximum 72 UTF-8 bytes). Copy the generated link and send the password separately. Use the deployed app to generate a link accessible to clients; localhost links only work on your computer.

Clients need no app account. They see project name and task titles, statuses and due dates. Task descriptions, comments, assignees, attachments, notes, time logs, billing and other projects are excluded. Clients cannot edit the board. Refresh progress retrieves the current saved tasks.

Disable stops future reads. Updating access generates a new random link and invalidates the previous one. Previously viewed information cannot be recalled from a client's screen. Links are marked noindex and no-referrer; public means anyone possessing the link can view it, not a searchable directory.

Passwords are bcrypt-hashed in an inaccessible private table. Only the narrow read RPC is available anonymously; core project/task RLS is unchanged. The password endpoint permits at most 20 checks per board per minute, then asks visitors to wait. Passwords are held only in page memory for refresh, never in URLs or local storage.

Validation: `scripts/test-board-sharing.mjs` exercises real PostgreSQL/pgcrypto via PGlite, including owner/admin authorization, denied member/anonymous management, scoped data, password checks, throttling, disabled links and rotation. Set PGLITE_MODULE and PGLITE_CRYPTO_MODULE if PGlite is installed outside this repository.
