import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase.ts";
import { Spinner } from "@/components/ui/spinner.tsx";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for Supabase to finish exchanging the magic link token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        // Small delay so the session cookie is fully written before AppShell
        // calls getSession() — prevents the race where useCurrentUser sees null
        // and immediately signs the user back out.
        setTimeout(() => navigate("/", { replace: true }), 300);
      }
      if (event === "SIGNED_OUT") {
        navigate("/", { replace: true });
      }
    });

    // Fallback: if token exchange takes too long or fails, go home after 8s
    const fallback = setTimeout(() => navigate("/", { replace: true }), 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-svh gap-4">
      <Spinner className="size-8" />
      <p className="text-sm text-muted-foreground">Signing you in...</p>
    </div>
  );
}
