"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { str } from "@/lib/validation";

export type LoginState = { error?: "invalid" | "inactive" } | undefined;

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: str(formData, "email"),
    password: String(formData.get("password") ?? ""),
  });
  if (error || !data.user) return { error: "invalid" };

  const { data: row } = await supabase
    .from("users")
    .select("is_active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!row?.is_active) {
    await supabase.auth.signOut();
    return { error: "inactive" };
  }
  await supabase.from("users").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
