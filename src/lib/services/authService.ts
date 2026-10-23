import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { User, Role } from "@/types";

export const authService = {
  async getSession() {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async getProfile(userId: string): Promise<User | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (error || !data) return null;
      return {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        avatar_url: data.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        role: data.role as Role,
        title: data.title || "Team Member",
        department: data.department || "General",
        status: data.status || "online",
        created_at: data.created_at,
      };
    } catch {
      return null;
    }
  },

  async signUp(data: {
    email: string;
    password: string;
    full_name: string;
    role?: Role;
    title?: string;
    department?: string;
  }): Promise<{ user: User | null; error: string | null }> {
    if (!isSupabaseConfigured || !supabase) {
      return { user: null, error: "Supabase not configured." };
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            role: data.role || "member",
            title: data.title || "Team Member",
            department: data.department || "General",
          },
        },
      });

      if (authError) {
        return { user: null, error: authError.message };
      }

      if (!authData.user) {
        return { user: null, error: "Signup completed, please confirm email or sign in." };
      }

      // Check or create profile
      const userProfile: User = {
        id: authData.user.id,
        email: data.email,
        full_name: data.full_name,
        avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        role: (data.role || "member") as Role,
        title: data.title || "Team Member",
        department: data.department || "General",
        status: "online",
        created_at: new Date().toISOString(),
      };

      await supabase.from("profiles").upsert(userProfile);

      return { user: userProfile, error: null };
    } catch (err: any) {
      return { user: null, error: err.message || "Failed to sign up." };
    }
  },

  async signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    if (!isSupabaseConfigured || !supabase) {
      return { user: null, error: "Supabase not configured." };
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        return { user: null, error: authError.message };
      }

      if (!authData.user) {
        return { user: null, error: "Invalid credentials." };
      }

      const profile = await this.getProfile(authData.user.id);
      if (profile) {
        return { user: profile, error: null };
      }

      const fallbackUser: User = {
        id: authData.user.id,
        email: authData.user.email || email,
        full_name: authData.user.user_metadata?.full_name || email.split("@")[0],
        avatar_url: authData.user.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        role: (authData.user.user_metadata?.role as Role) || "member",
        status: "online",
        created_at: new Date().toISOString(),
      };

      await supabase.from("profiles").upsert(fallbackUser);
      return { user: fallbackUser, error: null };
    } catch (err: any) {
      return { user: null, error: err.message || "Failed to sign in." };
    }
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
  },
};
