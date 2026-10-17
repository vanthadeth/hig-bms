"use server";

import { revalidatePath } from "next/cache";
import { authorize, type ActionResult } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type PermState = "allowed" | "denied" | "inherit";
export type PermEntry = { moduleId: string; scope: string; state: PermState };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCOPE_RE = /^[a-z][a-z0-9_]*$/;
const STATES = new Set<PermState>(["allowed", "denied", "inherit"]);
const MAX_ENTRIES = 300;

function valid(entries: PermEntry[]): boolean {
  return (
    Array.isArray(entries) &&
    entries.length > 0 &&
    entries.length <= MAX_ENTRIES &&
    entries.every((e) => UUID_RE.test(e.moduleId) && SCOPE_RE.test(e.scope) && STATES.has(e.state))
  );
}

/** One upsert for every allowed/denied entry, one delete per module for every "not set" entry. */
async function writeMany(table: "role_permissions" | "user_permissions", ownerCol: "role_id" | "user_id", ownerId: string, entries: PermEntry[]) {
  const supabase = await createClient();

  const rows = entries
    .filter((e) => e.state !== "inherit")
    .map((e) => ({ [ownerCol]: ownerId, module_id: e.moduleId, scope: e.scope, allowed: e.state === "allowed" }));
  if (rows.length) {
    const { error } = await supabase.from(table).upsert(rows, { onConflict: `${ownerCol},module_id,scope` });
    if (error) return error;
  }

  const clears = new Map<string, string[]>();
  for (const e of entries) if (e.state === "inherit") clears.set(e.moduleId, [...(clears.get(e.moduleId) ?? []), e.scope]);
  const results = await Promise.all(
    [...clears].map(([moduleId, scopes]) => supabase.from(table).delete().eq(ownerCol, ownerId).eq("module_id", moduleId).in("scope", scopes)),
  );
  return results.find((r) => r.error)?.error ?? null;
}

export async function setRolePermissions(roleId: string, entries: PermEntry[]): Promise<ActionResult> {
  const auth = await authorize("admin.permissions", "update");
  if ("error" in auth) return auth.error;
  if (!UUID_RE.test(roleId) || !valid(entries)) return { ok: false, error: "INVALID" };

  const supabase = await createClient();
  const { data: role } = await supabase.from("roles").select("is_system").eq("id", roleId).maybeSingle();
  if (!role) return { ok: false, error: "NOT_FOUND" };
  if (role.is_system) return { ok: false, error: "SYSTEM_ROLE" };

  const error = await writeMany("role_permissions", "role_id", roleId, entries);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/roles/${roleId}`);
  return { ok: true };
}

export async function setUserPermissions(userId: string, entries: PermEntry[]): Promise<ActionResult> {
  const auth = await authorize("admin.permissions", "update");
  if ("error" in auth) return auth.error;
  if (!UUID_RE.test(userId) || !valid(entries)) return { ok: false, error: "INVALID" };

  // Anti-lockout: nobody may deny themselves access to the Admin app.
  if (userId === auth.user.id && entries.some((e) => e.state === "denied")) {
    const supabase = await createClient();
    const ids = [...new Set(entries.filter((e) => e.state === "denied").map((e) => e.moduleId))];
    const { data: mods } = await supabase.from("modules").select("app").in("id", ids);
    if (mods?.some((m) => m.app === "admin")) return { ok: false, error: "SELF" };
  }

  const error = await writeMany("user_permissions", "user_id", userId, entries);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/users/${userId}`);
  return { ok: true };
}
