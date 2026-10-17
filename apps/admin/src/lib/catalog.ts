import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type ModuleRow = { id: string; app: string; code: string; name: string; description: string | null; is_active: boolean };
export type ActionRow = { code: string; name: string };
export type ScopeRow = { code: string; name: string; description: string | null; rank: number };
export type ModuleActionRow = { module_id: string; action: string; scoped: boolean };

export const getModules = cache(async (): Promise<ModuleRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("modules")
    .select("id, app, code, name, description, is_active")
    .order("app")
    .order("sort_order");
  return data ?? [];
});

/** Things a person can do: view, add, edit, delete, ... in display order. */
export const getActions = cache(async (): Promise<ActionRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("actions").select("code, name").order("sort_order");
  return data ?? [];
});

/** How far an action reaches: own, team, all (narrow to wide). */
export const getScopes = cache(async (): Promise<ScopeRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("scopes").select("code, name, description, rank").order("rank");
  return data ?? [];
});

/** Which actions each module has, and which of them take a scope. */
export const getModuleActions = cache(async (): Promise<ModuleActionRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("module_actions").select("module_id, action, scoped");
  return data ?? [];
});
