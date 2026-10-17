"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authorize, type ActionResult } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMAIL_RE, USERNAME_RE, optStr, str } from "@/lib/validation";

export type FormState = ActionResult | undefined;

const GENDERS = ["male", "female", "other"];

function profileFields(fd: FormData) {
  const gender = str(fd, "gender");
  const locale = str(fd, "locale");
  return {
    full_name: str(fd, "full_name"),
    full_name_km: optStr(fd, "full_name_km"),
    employee_code: optStr(fd, "employee_code"),
    position: optStr(fd, "position"),
    department: optStr(fd, "department"),
    hire_date: optStr(fd, "hire_date"),
    gender: GENDERS.includes(gender) ? gender : null,
    date_of_birth: optStr(fd, "date_of_birth"),
    address: optStr(fd, "address"),
    emergency_contact_name: optStr(fd, "emergency_contact_name"),
    emergency_contact_phone: optStr(fd, "emergency_contact_phone"),
    locale: locale === "en" ? "en" : "km",
  };
}

export async function createUser(_prev: FormState, fd: FormData): Promise<FormState> {
  const auth = await authorize("admin.users", "create");
  if ("error" in auth) return auth.error;

  const email = str(fd, "email").toLowerCase();
  const username = str(fd, "username").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const fields = profileFields(fd);

  if (!EMAIL_RE.test(email)) return { ok: false, error: "INVALID_EMAIL" };
  if (!USERNAME_RE.test(username)) return { ok: false, error: "INVALID_USERNAME" };
  if (password.length < 8) return { ok: false, error: "INVALID_PASSWORD" };
  if (!fields.full_name) return { ok: false, error: "INVALID_NAME" };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, error: "NO_SERVICE_KEY" };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    phone: optStr(fd, "phone") ?? undefined,
    user_metadata: { username, full_name: fields.full_name },
  });
  if (error || !data.user) return { ok: false, error: error?.message ?? "CREATE_FAILED" };

  // The auth trigger created core.users + an empty profile; complete the profile.
  const supabase = await createClient();
  const { error: pErr } = await supabase.from("user_profiles").update(fields).eq("user_id", data.user.id);
  if (pErr) return { ok: false, error: pErr.message };

  revalidatePath("/users");
  redirect(`/users/${data.user.id}`);
}

export async function updateUser(userId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const auth = await authorize("admin.users", "update");
  if ("error" in auth) return auth.error;

  const username = str(fd, "username").toLowerCase();
  if (!USERNAME_RE.test(username)) return { ok: false, error: "INVALID_USERNAME" };
  const fields = profileFields(fd);
  if (!fields.full_name) return { ok: false, error: "INVALID_NAME" };

  const supabase = await createClient();
  const { error: uErr } = await supabase
    .from("users")
    .update({ username, phone: optStr(fd, "phone") })
    .eq("id", userId);
  if (uErr) return { ok: false, error: uErr.message };
  const { error: pErr } = await supabase.from("user_profiles").update(fields).eq("user_id", userId);
  if (pErr) return { ok: false, error: pErr.message };

  revalidatePath(`/users/${userId}`);
  revalidatePath("/users");
  return { ok: true, message: "SAVED" };
}

export async function setUserActive(userId: string, active: boolean): Promise<ActionResult> {
  const auth = await authorize("admin.users", "update");
  if ("error" in auth) return auth.error;
  if (userId === auth.user.id && !active) return { ok: false, error: "SELF" };

  const supabase = await createClient();
  const { error } = await supabase.from("users").update({ is_active: active }).eq("id", userId);
  if (error) return { ok: false, error: error.message };

  // Also block sign-in at the auth layer when we can.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await createAdminClient().auth.admin.updateUserById(userId, {
      ban_duration: active ? "none" : "876000h",
    });
  }
  revalidatePath(`/users/${userId}`);
  revalidatePath("/users");
  return { ok: true };
}

export async function setUserRole(userId: string, roleId: string, assigned: boolean): Promise<ActionResult> {
  const auth = await authorize("admin.roles", "update");
  if ("error" in auth) return auth.error;

  const supabase = await createClient();
  if (assigned) {
    const { error } = await supabase.from("user_roles").upsert({ user_id: userId, role_id: roleId });
    if (error) return { ok: false, error: error.message };
  } else {
    // Anti-lockout: you cannot drop your own super_admin role.
    if (userId === auth.user.id) {
      const { data: role } = await supabase.from("roles").select("is_system").eq("id", roleId).maybeSingle();
      if (role?.is_system) return { ok: false, error: "SELF" };
    }
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role_id", roleId);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath(`/users/${userId}`);
  return { ok: true };
}
