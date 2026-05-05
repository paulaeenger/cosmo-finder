"use client";

import { useEffect } from "react";

/**
 * Registers the service worker on first page load.
 *
 * Lives in layout.tsx so it runs on every route. Bails silently if
 * service workers aren't supported (older browsers, file:// pages, etc.)
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        // Check for updates every hour the page is open
        const interval = setInterval(() => reg.update().catch(() => {}), 3600_000);
        return () => clearInterval(interval);
      } catch (e) {
        // Service worker registration failed — likely a dev environment
        // or HTTPS issue. Silently fall back to non-PWA behavior.
        console.warn("Service worker registration failed:", e);
      }
    };

    register();
  }, []);

  return null;
}
