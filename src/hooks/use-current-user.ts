import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase.ts";
import { toast } from "sonner";

export type DbUser = {
  id: string;
  auth_id: string;
  name: string | null;
  email: string | null;
  role: "admin" | "user";
};

export function useCurrentUser() {
  const [user, setUser] = useState<DbUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Check if developer bypass or POC role is active
    const savedDevRole = localStorage.getItem("casejourney_dev_role");
    if (savedDevRole === "admin" || savedDevRole === "user") {
      if (active) {
        setUser({
          id: savedDevRole === "admin" ? "00000000-0000-0000-0000-000000000001" : "00000000-0000-0000-0000-000000000002",
          auth_id: savedDevRole === "admin" ? "00000000-0000-0000-0000-000000000001" : "00000000-0000-0000-0000-000000000002",
          name: savedDevRole === "admin" ? "Admin" : "Aditya",
          email: savedDevRole === "admin" ? "admin@casejourney.com" : "aditya@casejourney.com",
          role: savedDevRole as "admin" | "user",
        });
        setIsLoading(false);
      }
      return;
    }

    async function fetchUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          if (active) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }

        const authUser = session.user;

        // Call the SECURITY DEFINER RPC which bypasses RLS for profile creation.
        const { data, error: rpcError } = await supabase.rpc("get_or_create_user_profile", {
          p_auth_id: authUser.id,
          p_email: authUser.email ?? "",
          p_name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null,
        });

        if (rpcError) {
          if (rpcError.message?.includes("NOT_AUTHORIZED")) {
            await supabase.auth.signOut();
            toast.error("This email is not authorized to access CaseJourney. Please contact the administrator.");
            if (active) {
              setUser(null);
              setIsLoading(false);
            }
            return;
          }
          throw rpcError;
        }

        const profile = data as DbUser;

        // Log login if not done in this browser session
        if (profile && !sessionStorage.getItem("hasLoggedLogin")) {
          const { error: logError } = await supabase.from("usage_logs").insert({
            user_id: profile.id,
            action_type: "login",
            metadata: { provider: authUser.app_metadata?.provider || "email" }
          });
          if (!logError) {
            sessionStorage.setItem("hasLoggedLogin", "true");
          }
        }

        if (active) {
          setUser(profile);
        }
      } catch (err) {
        console.error("useCurrentUser error:", err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    fetchUser();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      // Re-check dev role on any auth changes
      const currentDevRole = localStorage.getItem("casejourney_dev_role");
      if (currentDevRole === "admin" || currentDevRole === "user") {
        setUser({
          id: "00000000-0000-0000-0000-000000000001",
          auth_id: "00000000-0000-0000-0000-000000000001",
          name: currentDevRole === "admin" ? "Dev Admin" : "Dev Candidate",
          email: currentDevRole === "admin" ? "dev-admin@casejourney.com" : "dev-candidate@casejourney.com",
          role: currentDevRole as "admin" | "user",
        });
        setIsLoading(false);
        return;
      }

      if (event === "SIGNED_OUT" || (event as string) === "TOKEN_REFRESH_FAILED") {
        setUser(null);
        setIsLoading(false);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchUser();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    isLoading,
    isAdmin: user?.role === "admin",
    isUser: user?.role === "user",
  };
}
