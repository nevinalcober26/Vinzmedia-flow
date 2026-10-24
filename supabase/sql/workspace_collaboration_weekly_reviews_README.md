# Workspace collaboration and weekly reviews

Run the complete `workspace_collaboration_weekly_reviews.sql` file in the SQL Editor for the VinzFlow Supabase project, then refresh the app. It expects the existing workspace role and timeclock SQL from earlier updates.

The script adds note tags/color support and note-save policies, an atomic announcement reaction toggle, automatic owner membership for new workspaces, weekly review records, and a Supabase Cron job. It can be rerun without erasing existing notes, workspaces, reactions, or reviews.

Reminders run every Sunday at 18:00 Asia/Dubai (14:00 UTC). Each member with Time Tracking access gets one reminder per project where they logged time that Monday–Sunday week. Already-finalized projects are skipped. The cron job runs in Supabase even when the app is closed; the app refreshes notifications every 30 seconds and on focus.

Open a reminder from the top bar to load its project and week. In Time Tracking, use **Review entries**, check the work summaries and recorded durations, and choose **Finalize**. Finalization records your own time totals and entry count for that project/week. Subsequent entry edits, additions or deletions reopen its review. These reviews do not lock editing or approve another member's time.

Notes: adding a tag saves on Enter or leaving the field; leading # characters are normalized. A save error is now reported instead of silently displaying an unsaved change.

Announcement reactions: each signed-in workspace member can toggle their own reaction. Updates run atomically in the database so one user's click doesn't overwrite another user's reactions.

Workspace creation now persists to Supabase. Empty workspaces remain empty; data loaders no longer fetch other workspaces as a fallback. Previously local-only workspaces are not automatically imported. Existing project/task data is not moved or deleted by this update.

The SQL's functions and access rules were tested in a temporary PostgreSQL-compatible database. The actual cron scheduler and live project still require applying this SQL in Supabase. The last query in the file should show an active `vinzflow-weekly-time-review` job.
