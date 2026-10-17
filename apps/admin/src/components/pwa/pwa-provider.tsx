"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useT } from "@/i18n/client";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

type PwaState = {
  /** Browser offers a native install prompt (Chrome/Edge/Android). */
  canInstall: boolean;
  /** iOS Safari: no prompt exists, show "Add to Home Screen" steps. */
  isIosBrowser: boolean;
  /** Already running as an installed app. */
  isInstalled: boolean;
  install: () => Promise<void>;
};

const PwaContext = createContext<PwaState>({ canInstall: false, isIosBrowser: false, isInstalled: false, install: async () => {} });
export const usePwa = () => useContext(PwaContext);

// Browser facts read through useSyncExternalStore (server snapshot: not installed, not iOS).
function subscribeDisplayMode(cb: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () => {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
};
const noopSubscribe = () => () => {};

export function PwaProvider({ children }: { children: ReactNode }) {
  const { t } = useT();
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const refreshRequested = useRef(false);
  const [canInstall, setCanInstall] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const standalone = useSyncExternalStore(subscribeDisplayMode, isStandalone, () => false);
  const ios = useSyncExternalStore(noopSubscribe, isIos, () => false);
  const isInstalled = standalone || justInstalled;
  const isIosBrowser = ios && !isInstalled;
  const [updateReady, setUpdateReady] = useState<ServiceWorker | null>(null);

  // Service worker: register in production, offer a refresh when a new version is waiting.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    // Reload only when the user tapped "Refresh". The first activation of a brand-new worker also fires
    // controllerchange, and reloading then would interrupt whatever the user is doing (e.g. signing in).
    const onController = () => {
      if (!refreshRequested.current) return;
      refreshRequested.current = false;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onController);

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        const watch = (worker: ServiceWorker | null) => {
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(worker);
          });
        };
        if (reg.waiting && navigator.serviceWorker.controller) setUpdateReady(reg.waiting);
        reg.addEventListener("updatefound", () => watch(reg.installing));
        // Check for a new version whenever the app comes back to the foreground.
        const check = () => document.visibilityState === "visible" && reg.update().catch(() => {});
        document.addEventListener("visibilitychange", check);
      })
      .catch(() => {});
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onController);
  }, []);

  // Native install prompt (Chrome / Edge / Android).
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      deferred.current = null;
      setCanInstall(false);
      setJustInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // No pinch / double-tap zoom: iOS Safari ignores user-scalable=no, so block its gesture events too.
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", block);
    document.addEventListener("gesturechange", block);
    return () => {
      document.removeEventListener("gesturestart", block);
      document.removeEventListener("gesturechange", block);
    };
  }, []);

  const install = useCallback(async () => {
    const ev = deferred.current;
    if (!ev) return;
    await ev.prompt();
    await ev.userChoice;
    deferred.current = null;
    setCanInstall(false);
  }, []);

  const value = useMemo(() => ({ canInstall, isIosBrowser, isInstalled, install }), [canInstall, isIosBrowser, isInstalled, install]);

  return (
    <PwaContext value={value}>
      {children}
      {updateReady && (
        <div className="toast" role="status">
          <span>{t("pwa.updateReady")}</span>
          <button
            type="button"
            onClick={() => {
              refreshRequested.current = true;
              updateReady.postMessage({ type: "SKIP_WAITING" });
            }}
          >
            {t("pwa.refresh")}
          </button>
        </div>
      )}
    </PwaContext>
  );
}
