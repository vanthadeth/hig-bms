"use server";

import { revalidatePath } from "next/cache";
import { authorize, type ActionResult } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type PermState = "allowed" | "denied" | "inherit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function write(
  table: "role_permissions" | "user_permissions",
  ownerCol: "role_id" | "user_id",
  ownerId: string,
  moduleId: string,
  scope: string,
  state: PermState,
) {
  const supabase = await createClient();
  if (state === "inherit") {
    return supabase.from(table).delete().eq(ownerCol, ownerId).eq("module_id", moduleId).eq("scope", scope);
  }
  return supabase
    .from(table)
    .upsert({ [ownerCol]: ownerId, module_id: moduleId, scope, allowed: state === "allowed" }, {
      onConflict: `${ownerCol},module_id,scope`,
    });
}

export async function setRolePermission(
  roleId: string,
  moduleId: string,
  scope: string,
  state: PermState,
): Promise<ActionResult> {
  const auth = await authorize("admin.permissions", "update");
  if ("error" in auth) return auth.error;
  if (![roleId, moduleId].every((v) => UUID_RE.test(v))) return { ok: false, error: "INVALID" };

  const supabase = await createClient();
  const { data: role } = await supabase.from("roles").select("is_system").eq("id", roleId).maybeSingle();
  if (!role) return { ok: false, error: "NOT_FOUND" };
  if (role.is_system) return { ok: false, error: "SYSTEM_ROLE" };

  const { error } = await write("role_permissions", "role_id", roleId, moduleId, scope, state);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/roles/${roleId}`);
  return { ok: true };
}

export async function setUserPermission(
  userId: string,
  moduleId: string,
  scope: string,
  state: PermState,
): Promise<ActionResult> {
  const auth = await authorize("admin.permissions", "update");
  if ("error" in auth) return auth.error;
  if (![userId, moduleId].every((v) => UUID_RE.test(v))) return { ok: false, error: "INVALID" };

  // Anti-lockout: nobody may deny themselves access to the Admin app.
  if (userId === auth.user.id && state === "denied") {
    const supabase = await createClient();
    const { data: m } = await supabase.from("modules").select("app").eq("id", moduleId).maybeSingle();
    if (m?.app === "admin") return { ok: false, error: "SELF" };
  }

  const { error } = await write("user_permissions", "user_id", userId, moduleId, scope, state);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/users/${userId}`);
  return { ok: true };
}
