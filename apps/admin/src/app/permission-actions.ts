"use server";

import { revalidatePath } from "next/cache";
import { authorize, type ActionResult } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * One cell of the permission grid:
 *   inherit  not set (the row is removed)
 *   denied   explicitly denied
 *   allowed  allowed, for an action that takes no scope
 *   own | team | all   allowed, with that reach (for an action that takes a scope)
 * The database checks the choice against what the module declares (core.module_actions).
 */
export type PermState = "inherit" | "denied" | "allowed" | "own" | "team" | "all";
export type PermEntry = { moduleId: string; action: string; state: PermState };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTION_RE = /^[a-z][a-z0-9_]*$/;
const STATES = new Set<PermState>(["inherit", "denied", "allowed", "own", "team", "all"]);
const SCOPES = new Set<PermState>(["own", "team", "all"]);
const MAX_ENTRIES = 300;

function valid(entries: PermEntry[]): boolean {
  return (
    Array.isArray(entries) &&
    entries.length > 0 &&
    entries.length <= MAX_ENTRIES &&
    entries.every((e) => UUID_RE.test(e.moduleId) && ACTION_RE.test(e.action) && STATES.has(e.state))
  );
}

function fail(error: { code?: string; message: string }): ActionResult {
  // 23514 = the module does not allow this choice (e.g. a scope on an action that takes none)
  return { ok: false, error: error.code === "23514" ? "INVALID_SCOPE" : error.message };
}

/** One upsert for every grant, one delete per module for every "not set" entry. */
async function writeMany(table: "role_permissions" | "user_permissions", ownerCol: "role_id" | "user_id", ownerId: string, entries: PermEntry[]) {
  const supabase = await createClient();

  const rows = entries
    .filter((e) => e.state !== "inherit")
    .map((e) => ({
      [ownerCol]: ownerId,
      module_id: e.moduleId,
      action: e.action,
      allowed: e.state !== "denied",
      scope: SCOPES.has(e.state) ? e.state : null,
    }));
  if (rows.length) {
    const { error } = await supabase.from(table).upsert(rows, { onConflict: `${ownerCol},module_id,action` });
    if (error) return error;
  }

  const clears = new Map<string, string[]>();
  for (const e of entries) if (e.state === "inherit") clears.set(e.moduleId, [...(clears.get(e.moduleId) ?? []), e.action]);
  const results = await Promise.all(
    [...clears].map(([moduleId, actions]) => supabase.from(table).delete().eq(ownerCol, ownerId).eq("module_id", moduleId).in("action", actions)),
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
  if (error) return fail(error);
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
  if (error) return fail(error);
  revalidatePath(`/users/${userId}`);
  return { ok: true };
}
