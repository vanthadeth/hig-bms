import type { MessageKey } from "@/i18n/messages";

const MAP: Record<string, MessageKey> = {
  FORBIDDEN: "common.forbidden",
  UNAUTHENTICATED: "common.forbidden",
  SELF: "users.cannotSelf",
  SYSTEM_ROLE: "roles.systemLocked",
  NO_SERVICE_KEY: "users.noServiceKey",
  INVALID_PASSWORD: "users.passwordHint",
  INVALID_CODE: "roles.codeHint",
  INVALID_NAME: "users.nameRequired",
  INVALID_USERNAME: "users.usernameInvalid",
  INVALID_EMAIL: "users.emailInvalid",
  DUPLICATE: "roles.duplicate",
  SAVED: "common.saved",
};

export function resultText(
  t: (k: MessageKey) => string,
  res: { ok: boolean; error?: string; message?: string } | undefined,
): string | null {
  if (!res) return null;
  const code = res.ok ? res.message : res.error;
  if (!code) return null;
  return MAP[code] ? t(MAP[code]) : res.ok ? code : t("common.error");
}
