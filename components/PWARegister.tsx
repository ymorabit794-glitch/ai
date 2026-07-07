"use client";

import { useEffect } from "react";

// Registers the service worker so Chrome can install the site as a
// Google-signed WebAPK (a real app, no Play Protect warning).
export default function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore */
      });
    }
  }, []);
  return null;
}
