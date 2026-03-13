import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type UserRole = "super_admin" | "partner" | "user";

export interface UserProfile {
  id: string;
  name?: string;
  phone?: string;
  company_name?: string;
  cnpj?: string;
  business_type?: string;
  subscription_status?: string;
  profile_photo_url?: string;
  company_logo_url?: string;
  role: UserRole;
  onboarding_completed?: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isTrialExpired: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, phone: string, companyName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function checkTrialExpired(profile: UserProfile | null): boolean {
  if (!profile) return false;
  if (profile.role === "super_admin" || profile.role === "partner") return false;
  const created = new Date(profile.created_at);
  const now = new Date();
  const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 7;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Track whether initial session has been resolved to avoid double-fetching
  const initialized = useRef(false);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (data) {
        setProfile({
          ...data,
          role: (data.role as UserRole) || "user",
        });
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    // 1. Resolve the initial session first (synchronous-ish via getSession)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
      initialized.current = true;
    });

    // 2. Listen for future auth events (sign in, sign out, token refresh)
    //    NOTE: onAuthStateChange fires SYNCHRONOUSLY on subscribe with the
    //    current session – we skip that first fire to avoid double-fetch
    //    and use getSession above for the initial state instead.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Skip the very first synchronous fire (handled by getSession above)
        if (!initialized.current) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Kick off profile fetch without blocking the listener
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, name: string, phone: string, companyName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone, company_name: companyName } },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const isTrialExpired = checkTrialExpired(profile);

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, isTrialExpired, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
