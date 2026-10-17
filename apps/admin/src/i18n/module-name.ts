import type { MessageKey } from "./messages";

/** Localised module name; modules added later fall back to the name stored in the database. */
export function moduleName(t: (k: MessageKey) => string, code: string, fallback: string): string {
  const key = `module.${code}` as MessageKey;
  const label = t(key);
  return label === key ? fallback : label;
}

export function appLabel(app: string): string {
  return `HIG ${app.charAt(0).toUpperCase()}${app.slice(1)}`;
}
