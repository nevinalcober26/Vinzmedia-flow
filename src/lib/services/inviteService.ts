import { supabase, createInvitationClient } from "@/lib/supabase";
import { WorkspaceInvite, User, Role } from "@/types";

function database() {
  if (!supabase)
    throw new Error("Connect Supabase to manage team invitations.");
  return supabase;
}

export const inviteService = {
  async createInvite(
    workspaceId: string,
    email: string,
    role: Role = "member",
    invitedBy = "",
    invitedByName = "Workspace Administrator",
  ): Promise<{ invite: WorkspaceInvite; inviteUrl: string }> {
    const db = database();
    const invite = {
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      email: email.trim().toLowerCase(),
      token: `inv_${crypto.randomUUID().replace(/-/g, "")}`,
      role: role === "owner" ? "member" : role,
      invited_by: invitedBy,
      status: "pending" as const,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    };
    const { error } = await db.from("workspace_invites").insert(invite);
    if (error) throw error;
    return {
      invite: { ...invite, invited_by_name: invitedByName },
      inviteUrl: `${window.location.origin}/invite?token=${invite.token}`,
    };
  },

  async getInviteByToken(token: string): Promise<WorkspaceInvite | null> {
    if (!token) return null;
    const { data, error } = await database().rpc("lookup_workspace_invite", {
      invite_token: token,
    });
    if (error) throw error;
    return data;
  },

  async submitRegistration(
    token: string,
    fullName: string,
    username: string,
    email: string,
    password: string,
  ): Promise<{
    success: boolean;
    user?: User;
    error?: string;
    needsSignIn?: boolean;
  }> {
    try {
      const db = database();
      const invite = await this.getInviteByToken(token);
      if (!invite)
        throw new Error("This invitation is invalid, expired or already used.");
      const cleanEmail = email.trim().toLowerCase();
      if (invite.email && invite.email.toLowerCase() !== cleanEmail)
        throw new Error("Use the email address this invitation was sent to.");
      const { data: sessionData } = await db.auth.getUser();
      if (sessionData.user) {
        if (sessionData.user.email?.toLowerCase() !== cleanEmail)
          throw new Error("Sign out first to register another email address.");
        const { error } = await db.rpc("request_workspace_join", {
          invite_token: token,
        });
        if (error) throw error;
      } else {
        const { data, error } = await db.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              username: username.trim().replace(/^@/, ""),
              invite_token: token,
            },
          },
        });
        if (
          error &&
          (error.code === "user_already_exists" ||
            error.code === "email_exists" ||
            /already registered/i.test(error.message))
        ) {
          return {
            success: false,
            needsSignIn: true,
            error:
              "This email already has an account. Use your existing password below to request workspace access.",
          };
        }
        if (error) throw error;
        if (!data.user || data.user.identities?.length === 0)
          return {
            success: false,
            needsSignIn: true,
            error:
              "This email already has an account. Use your existing password below to request workspace access.",
          };
        // The signup trigger queues the request atomically, including when email confirmation is enabled.
        // Confirm the invite was consumed so an unapplied SQL migration cannot report false success.
        const remaining = await this.getInviteByToken(token);
        await db.auth.signOut();
        if (remaining)
          throw new Error(
            "Approval setup is missing. Ask the administrator to run team_approval_required.sql before joining.",
          );
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          (error as { message?: string }).message ||
          "Registration failed. Please try again.",
      };
    }
  },

  async joinWithExistingAccount(
    token: string,
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> {
    const client = createInvitationClient();
    try {
      const { error: signInError } = await client.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) throw signInError;
      const { error } = await client.rpc("request_workspace_join", {
        invite_token: token,
      });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          (error as { message?: string }).message ||
          "Unable to request access. Check your existing account password.",
      };
    } finally {
      await client.auth.signOut({ scope: "local" });
    }
  },

  async getPendingApprovals(workspaceId: string, strict = false): Promise<User[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.rpc("pending_workspace_joins", {
      target_workspace: workspaceId,
    });
    if (error) {
      if (strict) throw new Error("Could not load Pending Approvals. Check your connection and run the latest team approval SQL in Supabase. " + error.message);
      console.warn("Pending approvals unavailable:", error.message);
      return [];
    }
    return data || [];
  },

  async approveUser(user: User, workspaceId: string): Promise<boolean> {
    const { error } = await database().rpc("review_workspace_join", {
      target_workspace: workspaceId,
      target_user: user.id,
      approve: true,
    });
    return !error;
  },

  async rejectUser(userId: string, workspaceId: string): Promise<boolean> {
    const { error } = await database().rpc("review_workspace_join", {
      target_workspace: workspaceId,
      target_user: userId,
      approve: false,
    });
    return !error;
  },

  async getActiveInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("workspace_invites")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());
    return error ? [] : data || [];
  },

  async revokeInvite(inviteId: string): Promise<boolean> {
    const { data, error } = await database()
      .from("workspace_invites")
      .delete()
      .eq("id", inviteId)
      .select("id");
    return !error && !!data?.length;
  },
};
