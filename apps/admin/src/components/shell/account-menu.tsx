"use client";

import { useRef, useSyncExternalStore, useTransition } from "react";
import { useT } from "@/i18n/client";
import { setLocale } from "@/app/actions";
import { signOut } from "@/app/login/actions";
import { usePwa } from "@/components/pwa/pwa-provider";
import { avatarClass, initials } from "@/lib/avatar";
import { IconDownload, IconLogout } from "./icons";

type Theme = "system" | "light" | "dark";
const THEMES: Theme[] = ["system", "light", "dark"];
const BAR = { light: "#ffffff", dark: "#121820" };

// The theme lives in localStorage + the <html data-theme> attribute (set before paint by an inline script).
const themeListeners = new Set<() => void>();
function subscribeTheme(cb: () => void) {
  themeListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    themeListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function readTheme(): Theme {
  try {
    const saved = localStorage.getItem("theme");
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  try {
    if (theme === "system") {
      root.removeAttribute("data-theme");
      localStorage.removeItem("theme");
    } else {
      root.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
    }
  } catch {}
  // Keep the browser / status bar color in step with an explicit choice.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    if (!m.dataset.orig) m.dataset.orig = m.content;
    m.content = theme === "system" ? m.dataset.orig : BAR[theme];
  });
}

export function AccountMenu({ name, email, seed }: { name: string; email: string; seed: string }) {
  const { t, locale } = useT();
  const pwa = usePwa();
  const ref = useRef<HTMLDialogElement>(null);
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "system" as Theme);
  const [pending, start] = useTransition();

  const choose = (next: Theme) => {
    applyTheme(next);
    themeListeners.forEach((l) => l());
  };

  return (
    <>
      <button
        type="button"
        className={`avatar avatar-sm ${avatarClass(seed)}`}
        style={{ border: 0 }}
        aria-label={t("account.open")}
        aria-haspopup="dialog"
        onClick={() => ref.current?.showModal()}
      >
        {initials(name)}
      </button>

      <dialog
        ref={ref}
        className="sheet"
        aria-label={t("account.title")}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close(); // tap on the backdrop
        }}
      >
        <div className="sheet-grab" aria-hidden />
        <div className="sheet-body">
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <span className={`avatar ${avatarClass(seed)}`}>{initials(name)}</span>
            <div style={{ minWidth: 0 }}>
              <b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</b>
              <span style={{ display: "block", color: "var(--fg-3)", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>
            </div>
          </div>

          <div className="sheet-sec">
            <span className="lbl">{t("account.language")}</span>
            <div className="seg" role="group" aria-label={t("account.language")}>
              {(["km", "en"] as const).map((l) => (
                <button key={l} type="button" aria-pressed={locale === l} disabled={pending} onClick={() => start(() => setLocale(l))}>
                  {l === "km" ? "ខ្មែរ" : "English"}
                </button>
              ))}
            </div>
          </div>

          <div className="sheet-sec">
            <span className="lbl">{t("account.theme")}</span>
            <div className="seg" role="group" aria-label={t("account.theme")}>
              {THEMES.map((th) => (
                <button key={th} type="button" aria-pressed={theme === th} onClick={() => choose(th)}>
                  {t(`theme.${th}` as const)}
                </button>
              ))}
            </div>
          </div>

          {pwa.isInstalled ? (
            <p className="msg msg-ok" style={{ margin: 0 }}>{t("account.installed")}</p>
          ) : pwa.canInstall ? (
            <button type="button" className="btn btn-block" onClick={() => pwa.install()}>
              <IconDownload /> {t("account.install")}
            </button>
          ) : pwa.isIosBrowser ? (
            <p className="msg" style={{ margin: 0, background: "var(--surface-2)", color: "var(--fg-2)" }}>{t("account.installIos")}</p>
          ) : null}

          <form action={signOut}>
            <button type="submit" className="btn btn-block btn-danger">
              <IconLogout /> {t("account.signOut")}
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
