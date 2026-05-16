import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface ChangelogItem {
  category: "feature" | "improvement" | "fix";
  text: string;
}

export interface Changelog {
  id: string;
  version: string;
  title: string;
  released_at: string;
  items: ChangelogItem[];
}

export function useChangelog() {
  const { user } = useAuth();
  const [latest, setLatest] = useState<Changelog | null>(null);
  const [unseen, setUnseen] = useState<Changelog | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("changelogs")
      .select("*")
      .eq("is_published", true)
      .order("released_at", { ascending: false })
      .limit(1)
      .single();

    if (!data) { setLoading(false); return; }

    setLatest(data as Changelog);

    const { data: view } = await supabase
      .from("changelog_views")
      .select("id")
      .eq("user_id", user.id)
      .eq("changelog_id", data.id)
      .maybeSingle();

    if (!view) setUnseen(data as Changelog);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const markAsSeen = useCallback(async (changelogId: string) => {
    if (!user) return;
    await supabase
      .from("changelog_views")
      .upsert({ user_id: user.id, changelog_id: changelogId }, { onConflict: "user_id,changelog_id" });
    setUnseen(null);
  }, [user]);

  return { latest, unseen, loading, markAsSeen };
}
