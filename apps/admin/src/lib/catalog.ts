import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type ModuleRow = { id: string; app: string; code: string; name: string; description: string | null; is_active: boolean };
export type ScopeRow = { code: string; name: string };

export const getModules = cache(async (): Promise<ModuleRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("modules")
    .select("id, app, code, name, description, is_active")
    .order("app")
    .order("sort_order");
  return data ?? [];
});

export const getScopes = cache(async (): Promise<ScopeRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("scopes").select("code, name").order("sort_order");
  return data ?? [];
});
