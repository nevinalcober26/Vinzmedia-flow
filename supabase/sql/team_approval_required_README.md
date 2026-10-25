# Team approval required

Run the complete `team_approval_required.sql` file in Supabase SQL Editor after `workspace_roles.sql` and the existing invitation schema (migration 004). Then refresh the app. Codex has not applied this SQL to the live project.

Owners and Admins create an invitation with the intended role. Registration creates a pending request for that specific workspace. It does not create membership or grant sidebar/project access. In **Team → Pending Approvals**, an Owner or Admin approves or rejects the applicant. Only successful approval activates the invited role, including Admin, Project Manager, Member and Guest. Ownership is not transferable by invitation.

The signup trigger no longer joins new accounts to the first workspace. Creating your own independent workspace remains separate from joining someone else's team. Existing signed-in users can use an invitation to request membership without replacing their account. Previously registered users should sign in first and reopen the invitation.

The migration preserves approved members, including existing Owners/Admins. Applicants explicitly marked pending by the older system are moved into the new queue and any premature membership is removed. The actual workspace owner is excluded from that cleanup. Legacy accounts that are already marked approved are not retroactively rejected.

Invitations are single-use, expire after seven days, and enforce the invited email when specified. Invalid/revoked invitations cannot submit requests. Signup metadata cannot assign privileges. Direct membership inserts fail unless a request has been approved, except enrollment by the actual creator of a workspace. Approval and role activation run in one transaction. Clients cannot edit approval records or approve themselves.

The app no longer stores invitation passwords locally or silently reports successful database changes when they fail. The approval list reloads on window focus and every 30 seconds.

Validation: `scripts/test-team-approval.mjs` tests actual PostgreSQL triggers/RPCs in PGlite, including every role, self-approval denial, direct enrollment denial, invalid tokens, rejection, workspace isolation and metadata escalation. This does not replace verifying the SQL in the live Supabase project.
