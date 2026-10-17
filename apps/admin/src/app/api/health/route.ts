import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Deployment self-check. Reports only booleans and error codes: no secrets, no data.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: !!url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: !!key,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  if (!url || !key) return NextResponse.json({ ok: false, env }, { status: 500 });

  // As anon, an exposed `core` schema answers 42501 (no privilege);
  // an unexposed one answers PGRST106 (invalid schema).
  const supabase = createClient(url, key, { db: { schema: "core" }, auth: { persistSession: false } });
  const { error } = await supabase.from("modules").select("id").limit(1);
  const code = error?.code ?? null;

  // No error code at all means the request never got an answer from Supabase.
  if (error && !code) {
    return NextResponse.json(
      { ok: false, env, core: { exposed: null, code: null, hint: "Could not reach Supabase from the server", detail: error.message.slice(0, 200) } },
      { status: 502 },
    );
  }
  const coreExposed = code === "42501" || code === null;
  return NextResponse.json(
    { ok: coreExposed, env, core: { exposed: coreExposed, code, hint: coreExposed ? null : "Add `core` to Exposed schemas in Supabase Data API settings" } },
    { status: coreExposed ? 200 : 503 },
  );
}
