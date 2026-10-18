import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase.ts";
import type { Session, User } from "@supabase/supabase-js";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authMode: "magiclink" | "otp";
  signin: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, name: string, password: string) => Promise<void>;
  developerBypass: (role: "admin" | "user") => void;
  signout: () => Promise<void>;
  error: Error | null;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authMode: "magiclink",
  signin: async () => {},
  signInWithEmail: async () => {},
  verifyOtp: async () => {},
  signInWithPassword: async () => {},
  signUpWithPassword: async () => {},
  developerBypass: () => {},
  signout: async () => {},
  error: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // local dev bypass state
  const [isDevMode, setIsDevMode] = useState(false);
  const [devUser, setDevUser] = useState<User | null>(null);
  const [devSession, setDevSession] = useState<Session | null>(null);

  useEffect(() => {
    // Check if developer bypass was previously activated
    const savedDevRole = localStorage.getItem("casejourney_dev_role");
    if (savedDevRole === "admin" || savedDevRole === "user") {
      const mockEmail = savedDevRole === "admin" ? "admin@casejourney.com" : "aditya@casejourney.com";
      const mockName = savedDevRole === "admin" ? "Admin" : "Aditya";
      const mockU: User = {
        id: savedDevRole === "admin" ? "00000000-0000-0000-0000-000000000001" : "00000000-0000-0000-0000-000000000002",
        app_metadata: {},
        user_metadata: { full_name: mockName },
        aud: "authenticated",
        created_at: new Date().toISOString(),
        email: mockEmail,
      } as any;

      const mockS: Session = {
        access_token: "mock-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh",
        user: mockU,
      };

      setDevUser(mockU);
      setDevSession(mockS);
      setIsDevMode(true);
      setIsLoading(false);
      return;
    }

    // Get initial session from Supabase if not in dev mode
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) {
        setSession(s);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        setSession(s);
      } else if (event === "SIGNED_OUT" || (event as string) === "TOKEN_REFRESH_FAILED") {
        // Clear any stale session state — stale refresh tokens cause cascading
        // CORS/fetch errors on the next OTP send if not cleaned up immediately.
        setSession(null);
      } else {
        setSession(s);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signin = async () => {
    try {
      setError(null);
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signInError) throw signInError;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  const authMode = (import.meta.env.VITE_AUTH_MODE === "otp" ? "otp" : "magiclink") as "magiclink" | "otp";

  const signInWithEmail = async (email: string) => {
    try {
      setError(null);
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: authMode === "otp"
          ? { shouldCreateUser: true }
          : { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (otpError) throw otpError;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  const verifyOtp = async (email: string, token: string) => {
    try {
      setError(null);
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (verifyError) throw verifyError;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  const signInWithPassword = async (email: string, password: string) => {
    try {
      setError(null);
      const { error: passError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (passError) throw passError;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  const signUpWithPassword = async (email: string, name: string, password: string) => {
    try {
      setError(null);
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signUpError) throw signUpError;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  const developerBypass = (role: "admin" | "user") => {
    localStorage.setItem("casejourney_dev_role", role);
    const mockEmail = role === "admin" ? "dev-admin@casejourney.com" : "dev-candidate@casejourney.com";
    const mockName = role === "admin" ? "Dev Admin" : "Dev Candidate";
    const mockU: User = {
      id: "dev-bypass-id-1234",
      app_metadata: {},
      user_metadata: { full_name: mockName },
      aud: "authenticated",
      created_at: new Date().toISOString(),
      email: mockEmail,
    } as any;

    const mockS: Session = {
      access_token: "mock-token",
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "mock-refresh",
      user: mockU,
    };

    setDevUser(mockU);
    setDevSession(mockS);
    setIsDevMode(true);
  };

  const signout = async () => {
    if (isDevMode) {
      localStorage.removeItem("casejourney_dev_role");
      setDevUser(null);
      setDevSession(null);
      setIsDevMode(false);
      return;
    }

    try {
      setError(null);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const currentSession = isDevMode ? devSession : session;
  const currentUser = isDevMode ? devUser : (session?.user ?? null);

  return (
    <AuthContext.Provider
      value={{
        session: currentSession,
        user: currentUser,
        isAuthenticated: !!currentSession,
        isLoading,
        authMode,
        signin,
        signInWithEmail,
        verifyOtp,
        signInWithPassword,
        signUpWithPassword,
        developerBypass,
        signout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useUser() {
  const { user } = useAuth();
  return { user, profile: user?.user_metadata ?? {} };
}
