import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";

/** Active people who can be someone's manager, named in the viewer's language. */
export const getManagerOptions = cache(async (): Promise<{ id: string; name: string }[]> => {
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const { data } = await supabase.from("users").select("id, username, user_profiles(full_name, full_name_km)").eq("is_active", true).order("username");
  return (data ?? []).map((u) => {
    const p = Array.isArray(u.user_profiles) ? u.user_profiles[0] : u.user_profiles;
    return { id: u.id, name: (locale === "km" ? p?.full_name_km : null) || p?.full_name || u.username };
  });
});
