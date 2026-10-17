import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
};

/** Signed-in, active user or null. Memoised per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return null;

  const { data: row } = await supabase
    .from("users")
    .select("id, username, email, is_active, user_profiles(full_name)")
    .eq("id", uid)
    .maybeSingle();
  if (!row || !row.is_active) return null;

  const profile = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: profile?.full_name || row.username,
  };
});

/** Resolved permissions of the current user as "module:action" keys (any scope). */
export const getPermissions = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("effective_permissions");
  const set = new Set<string>();
  for (const p of (data ?? []) as { module_code: string; action: string; allowed: boolean; scope: string | null }[]) {
    if (p.allowed) set.add(`${p.module_code}:${p.action}`);
  }
  return set;
});

export async function can(module: string, action: string): Promise<boolean> {
  return (await getPermissions()).has(`${module}:${action}`);
}

/** For pages: redirect when signed out, or to /forbidden when not allowed. */
export async function requirePermission(module: string, action: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await can(module, action))) redirect("/forbidden");
  return user;
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

/** For server actions: returns the user or an ActionResult error (never trusts the client). */
export async function authorize(
  module: string,
  action: string,
): Promise<{ user: CurrentUser } | { error: ActionResult & { ok: false } }> {
  const user = await getCurrentUser();
  if (!user) return { error: { ok: false, error: "UNAUTHENTICATED" } };
  if (!(await can(module, action))) return { error: { ok: false, error: "FORBIDDEN" } };
  return { user };
}
