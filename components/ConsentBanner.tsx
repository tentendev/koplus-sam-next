"use client";

import { useEffect, useState } from "react";

/**
 * Cookie consent banner backing Google Consent Mode v2.
 *
 * The consent DEFAULTS (analytics/ads = 'denied') are set in app/layout.tsx via a
 * beforeInteractive script, so GA4 never stores analytics cookies until a visitor
 * opts in here. On "Accept" we flip analytics_storage to 'granted' and remember the
 * choice in localStorage; on "Decline" we persist the denied state. A returning
 * visitor's stored choice is re-applied in the layout script, so the banner only
 * appears the first time (or after they clear their choice).
 *
 * NOTE (legal): wording and scope should be reviewed/signed off by the client.
 * Only analytics_storage is granted on accept — no ad signals — because the site
 * runs no advertising today. Extend the granted signals here if that changes.
 */

const STORAGE_KEY = "koplus-cookie-consent";

type Consent = "granted" | "denied";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function applyConsent(choice: Consent) {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* storage may be unavailable (private mode) — non-fatal */
  }
  window.gtag?.("consent", "update", {
    analytics_storage: choice === "granted" ? "granted" : "denied",
  });
}

export default function ConsentBanner() {
  // Start hidden; decide on mount so SSR markup matches and we can read storage.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (stored !== "granted" && stored !== "denied") setVisible(true);
  }, []);

  if (!visible) return null;

  const decide = (choice: Consent) => {
    applyConsent(choice);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm motion-safe:animate-[slideup_.25s_ease-out]"
      style={{ boxShadow: "0 -2px 16px rgba(0,0,0,0.08)" }}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-sm leading-relaxed text-gray-600">
          We use analytics cookies to understand how the configurator is used and
          improve it. They&rsquo;re only set if you accept. See our{" "}
          <a
            href="https://cdn.prod.website-files.com/5edcaf96992873f032795a12/64d0af566c344d903692fd53_Koplus_Website%20Privacy%20Policy_RS.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-900 underline underline-offset-2 hover:text-gray-700"
          >
            privacy policy
          </a>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => decide("denied")}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => decide("granted")}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
