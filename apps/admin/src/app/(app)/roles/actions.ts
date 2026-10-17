"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authorize, type ActionResult } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_CODE_RE, optStr, str } from "@/lib/validation";
import type { FormState } from "../users/actions";

export async function createRole(_prev: FormState, fd: FormData): Promise<FormState> {
  const auth = await authorize("admin.roles", "create");
  if ("error" in auth) return auth.error;

  const code = str(fd, "code").toLowerCase();
  const name = str(fd, "name");
  if (!ROLE_CODE_RE.test(code)) return { ok: false, error: "INVALID_CODE" };
  if (!name) return { ok: false, error: "INVALID_NAME" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .insert({ code, name, description: optStr(fd, "description") })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.code === "23505" ? "DUPLICATE" : error.message };

  revalidatePath("/roles");
  redirect(`/roles/${data.id}`);
}

export async function updateRole(roleId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const auth = await authorize("admin.roles", "update");
  if ("error" in auth) return auth.error;

  const name = str(fd, "name");
  if (!name) return { ok: false, error: "INVALID_NAME" };

  const supabase = await createClient();
  const { data: role } = await supabase.from("roles").select("is_system").eq("id", roleId).maybeSingle();
  if (!role) return { ok: false, error: "NOT_FOUND" };
  if (role.is_system) return { ok: false, error: "SYSTEM_ROLE" };

  const { error } = await supabase
    .from("roles")
    .update({ name, description: optStr(fd, "description"), is_active: fd.get("is_active") === "on" })
    .eq("id", roleId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/roles/${roleId}`);
  revalidatePath("/roles");
  return { ok: true, message: "SAVED" };
}

export async function deleteRole(roleId: string): Promise<ActionResult> {
  const auth = await authorize("admin.roles", "delete");
  if ("error" in auth) return auth.error;

  const supabase = await createClient();
  const { data: role } = await supabase.from("roles").select("is_system").eq("id", roleId).maybeSingle();
  if (!role) return { ok: false, error: "NOT_FOUND" };
  if (role.is_system) return { ok: false, error: "SYSTEM_ROLE" };

  const { error } = await supabase.from("roles").delete().eq("id", roleId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/roles");
  redirect("/roles");
}
