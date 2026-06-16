"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    SamApp?: (cfg: { el: string; apiBase: string; series: string }) => void;
  }
}

// Mounts the (classic, global) configurator script into an empty div and boots
// it for the given line. React owns the wrapper div but never its children, so
// the script's own innerHTML rendering is left untouched.
export default function Configurator({
  series,
  apiBase,
}: {
  series: string;
  apiBase: string;
}) {
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const boot = () => window.SamApp?.({ el: "#sam-app", apiBase, series });

    if (window.SamApp) {
      boot();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-sam-configurator]",
    );
    if (existing) {
      existing.addEventListener("load", boot);
      return;
    }
    const s = document.createElement("script");
    s.src = "/sam-configurator.js";
    s.async = true;
    s.setAttribute("data-sam-configurator", "");
    s.addEventListener("load", boot);
    document.body.appendChild(s);
  }, [series, apiBase]);

  return <div id="sam-app" />;
}
