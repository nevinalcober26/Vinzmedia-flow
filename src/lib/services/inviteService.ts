import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { WorkspaceInvite, User, Role } from "@/types";

const LOCAL_INVITES_KEY = "vinzflow_workspace_invites";
const LOCAL_PENDING_KEY = "vinzflow_pending_approvals";

function getLocalInvites(): WorkspaceInvite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_INVITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalInvites(invites: WorkspaceInvite[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_INVITES_KEY, JSON.stringify(invites));
  } catch {}
}

function getLocalPending(): User[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPending(users: User[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_PENDING_KEY, JSON.stringify(users));
  } catch {}
}

export const inviteService = {
  // Generate and store an invitation
  async createInvite(
    workspaceId: string,
    email: string,
    role: Role = "member",
    invitedBy: string = "",
    invitedByName: string = "Workspace Administrator"
  ): Promise<{ invite: WorkspaceInvite; inviteUrl: string }> {
    const token = `inv_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;
    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite: WorkspaceInvite = {
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      email: email.trim().toLowerCase(),
      token,
      role,
      invited_by: invitedBy,
      invited_by_name: invitedByName,
      status: "pending",
      created_at: now.toISOString(),
      expires_at: expires.toISOString(),
    };

    // Save locally
    const current = getLocalInvites();
    saveLocalInvites([invite, ...current.filter((i) => i.email !== invite.email)]);

    // Try Supabase if table exists
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("workspace_invites").insert({
          id: invite.id,
          workspace_id: invite.workspace_id,
          email: invite.email,
          token: invite.token,
          role: invite.role,
          invited_by: invite.invited_by || null,
          status: "pending",
          expires_at: invite.expires_at,
        });
      } catch (err) {
        console.warn("workspace_invites database sync notice:", err);
      }
    }

    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    const inviteUrl = `${baseUrl}/invite?token=${token}`;

    return { invite, inviteUrl };
  },

  // Retrieve an invite by its secret token
  async getInviteByToken(token: string): Promise<WorkspaceInvite | null> {
    if (!token) return null;

    // Check local invites
    const local = getLocalInvites().find((i) => i.token === token);
    if (local) return local;

    // Check Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("workspace_invites")
          .select("*")
          .eq("token", token)
          .single();

        if (!error && data) {
          return {
            id: data.id,
            workspace_id: data.workspace_id,
            email: data.email,
            token: data.token,
            role: data.role || "member",
            invited_by: data.invited_by,
            status: data.status || "pending",
            created_at: data.created_at,
            expires_at: data.expires_at,
          };
        }
      } catch {}
    }

    // Fallback: If it's a validly formed token, allow generic registration
    if (token.startsWith("inv_") || token.length >= 8) {
      return {
        id: crypto.randomUUID(),
        workspace_id: "b0000000-0000-0000-0000-000000000001",
        email: "",
        token,
        role: "member",
        invited_by: "",
        status: "pending",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      };
    }

    return null;
  },

  // Submit invited user registration (sets status to pending approval)
  async submitRegistration(
    token: string,
    fullName: string,
    username: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
      const newUserId = crypto.randomUUID();

      const pendingUser: User = {
        id: newUserId,
        email: cleanEmail,
        full_name: fullName.trim(),
        username: cleanUsername,
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          fullName
        )}`,
        role: "member",
        title: "Workspace Member (Pending)",
        department: "General",
        status: "offline",
        approval_status: "pending",
        created_at: new Date().toISOString(),
      };

      // 1. Try Supabase Auth Sign Up
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: password,
            options: {
              data: {
                full_name: fullName.trim(),
                username: cleanUsername,
                role: "member",
                approval_status: "pending",
              },
            },
          });

          if (!authError && authData.user) {
            pendingUser.id = authData.user.id;
          }

          // Insert or update profile in public.profiles with pending status
          await supabase.from("profiles").upsert({
            id: pendingUser.id,
            email: cleanEmail,
            full_name: fullName.trim(),
            avatar_url: pendingUser.avatar_url,
            role: "member",
            title: "Workspace Member (Pending)",
            status: "offline",
            approval_status: "pending",
          });

          // Mark invite as accepted
          await supabase
            .from("workspace_invites")
            .update({ status: "accepted", username: cleanUsername, full_name: fullName.trim() })
            .eq("token", token);
        } catch (dbErr) {
          console.warn("Supabase auth signup notice:", dbErr);
        }
      }

      // 2. Save to local pending store so backend admin sees immediately
      const currentPending = getLocalPending();
      saveLocalPending([
        pendingUser,
        ...currentPending.filter((u) => u.email !== cleanEmail),
      ]);

      // Update local invite
      const invites = getLocalInvites();
      const updatedInvites = invites.map((inv) =>
        inv.token === token
          ? {
              ...inv,
              status: "accepted" as const,
              username: cleanUsername,
              full_name: fullName.trim(),
              password,
            }
          : inv
      );
      saveLocalInvites(updatedInvites);

      return { success: true, user: pendingUser };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to submit registration" };
    }
  },

  // Get list of users waiting for administrator/owner approval
  async getPendingApprovals(workspaceId: string): Promise<User[]> {
    const local = getLocalPending().filter((u) => u.approval_status === "pending");

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("approval_status", "pending")
          .order("created_at", { ascending: false });

        if (!error && data) {
          const dbUsers: User[] = data.map((d: any) => ({
            id: d.id,
            email: d.email,
            full_name: d.full_name,
            username: d.username || d.email?.split("@")[0] || "",
            avatar_url: d.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(d.full_name)}`,
            role: "member",
            title: d.title || "Member",
            department: d.department || "General",
            status: "offline",
            approval_status: "pending",
            created_at: d.created_at,
          }));

          // Merge local and db
          const merged = [...dbUsers];
          for (const l of local) {
            if (!merged.some((m) => m.email.toLowerCase() === l.email.toLowerCase())) {
              merged.push(l);
            }
          }
          return merged;
        }
      } catch {}
    }

    return local;
  },

  // Admin approves a pending user -> becomes an active Member!
  async approveUser(user: User, workspaceId: string): Promise<boolean> {
    try {
      const approvedUser: User = {
        ...user,
        role: "member",
        status: "online",
        approval_status: "approved",
      };

      // 1. Remove from local pending
      const pending = getLocalPending().filter((u) => u.id !== user.id && u.email !== user.email);
      saveLocalPending(pending);

      // 2. Update Supabase
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from("profiles")
            .update({
              role: "member",
              status: "online",
              approval_status: "approved",
            })
            .eq("id", user.id);

          await supabase.from("workspace_members").upsert({
            workspace_id: workspaceId,
            user_id: user.id,
            role: "member",
          });

          await supabase
            .from("workspace_invites")
            .update({ status: "approved" })
            .eq("email", user.email);
        } catch (err) {
          console.warn("Supabase approval update notice:", err);
        }
      }

      return true;
    } catch {
      return false;
    }
  },

  // Admin rejects a pending applicant
  async rejectUser(userId: string, email: string): Promise<boolean> {
    try {
      const pending = getLocalPending().filter((u) => u.id !== userId && u.email !== email);
      saveLocalPending(pending);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from("profiles")
            .update({ approval_status: "rejected" })
            .eq("id", userId);

          await supabase
            .from("workspace_invites")
            .update({ status: "rejected" })
            .eq("email", email);
        } catch {}
      }

      return true;
    } catch {
      return false;
    }
  },

  // Get active invites
  getActiveInvites(workspaceId: string): WorkspaceInvite[] {
    return getLocalInvites().filter(
      (inv) =>
        inv.workspace_id === workspaceId &&
        inv.status === "pending" &&
        new Date(inv.expires_at) > new Date()
    );
  },

  // Revoke an invitation
  async revokeInvite(inviteId: string) {
    const updated = getLocalInvites().filter((i) => i.id !== inviteId);
    saveLocalInvites(updated);
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("workspace_invites").delete().eq("id", inviteId);
      } catch {}
    }
  },
};
