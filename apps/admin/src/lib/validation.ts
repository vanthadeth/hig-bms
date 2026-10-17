export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const optStr = (fd: FormData, k: string) => str(fd, k) || null;

export const USERNAME_RE = /^[a-z0-9._-]{3,40}$/;
export const ROLE_CODE_RE = /^[a-z][a-z0-9_]*$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
