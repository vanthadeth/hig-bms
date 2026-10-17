const TINTS = ["av1", "av2", "av3", "av4", "av5"];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = Array.from(parts[0])[0] ?? "";
  const second = parts[1] ? (Array.from(parts[1])[0] ?? "") : "";
  return (first + second).toUpperCase();
}

/** Stable tint per person so the same user always gets the same color. */
export function avatarClass(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return TINTS[Math.abs(h) % TINTS.length];
}
