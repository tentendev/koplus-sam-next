"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

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
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const root = rootRef.current;
      if (!root || !contextSafe) return;

      const media = gsap.matchMedia();

      media.add(
        {
          isCompact: "(max-width: 767px)",
          isWide: "(min-width: 768px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (mediaContext) => {
          const { isCompact, reduceMotion } = mediaContext.conditions as {
            isCompact: boolean;
            isWide: boolean;
            reduceMotion: boolean;
          };

          if (reduceMotion) return;

          let entranceTimeline: ReturnType<typeof gsap.timeline> | null = null;
          let entranceTargets: Element[] = [];
          let modalTimeline: ReturnType<typeof gsap.timeline> | null = null;

          const clearEntrance = () => {
            entranceTimeline?.kill();
            if (entranceTargets.length) {
              gsap.set(entranceTargets, {
                clearProps: "willChange,transform,opacity,visibility",
              });
            }
            entranceTimeline = null;
            entranceTargets = [];
          };

          const animateEntrance = contextSafe(() => {
            const header = root.querySelector<HTMLElement>(
              '[data-sam-motion="header"]',
            );
            const visual = root.querySelector<HTMLElement>(
              '[data-sam-motion="visual"]',
            );
            const intro = Array.from(
              root.querySelectorAll<HTMLElement>(
                '[data-sam-motion="intro"]',
              ),
            );
            const sections = Array.from(
              root.querySelectorAll<HTMLElement>(
                '[data-sam-motion="section"]',
              ),
            );
            const summary = root.querySelector<HTMLElement>(
              '[data-sam-motion="summary"]',
            );

            if (!visual || !intro.length) return;

            clearEntrance();
            entranceTargets = [
              ...(header ? [header] : []),
              visual,
              ...intro,
              ...sections,
              ...(summary ? [summary] : []),
            ];

            gsap.set(entranceTargets, {
              willChange: "transform, opacity",
            });

            const lift = isCompact ? 6 : 10;
            entranceTimeline = gsap.timeline({
              defaults: { ease: "power2.out" },
              onComplete: () => {
                gsap.set(entranceTargets, {
                  clearProps: "willChange,transform,opacity,visibility",
                });
              },
            });

            entranceTimeline.addLabel("reveal", 0);

            if (header) {
              entranceTimeline.fromTo(
                header,
                { autoAlpha: 0, y: -5 },
                { autoAlpha: 1, y: 0, duration: 0.42 },
                "reveal",
              );
            }

            entranceTimeline
              .fromTo(
                visual,
                {
                  autoAlpha: 0,
                  y: lift,
                  scale: isCompact ? 0.996 : 0.992,
                },
                {
                  autoAlpha: 1,
                  y: 0,
                  scale: 1,
                  duration: 0.78,
                },
                "reveal+=0.06",
              )
              .fromTo(
                intro,
                { autoAlpha: 0, y: lift },
                {
                  autoAlpha: 1,
                  y: 0,
                  duration: 0.56,
                  stagger: 0.055,
                },
                "reveal+=0.12",
              );

            if (sections.length) {
              entranceTimeline.fromTo(
                sections,
                { autoAlpha: 0, y: lift },
                {
                  autoAlpha: 1,
                  y: 0,
                  duration: 0.5,
                  stagger: 0.06,
                },
                "reveal+=0.24",
              );
            }

            if (summary) {
              entranceTimeline.fromTo(
                summary,
                { autoAlpha: 0, y: 8 },
                { autoAlpha: 1, y: 0, duration: 0.44 },
                "reveal+=0.34",
              );
            }
          });

          const animateModalIn = contextSafe(() => {
            const modal = root.querySelector<HTMLElement>("#quote-modal");
            const backdrop =
              root.querySelector<HTMLElement>("#quote-backdrop");
            const panel = root.querySelector<HTMLElement>("#quote-panel");
            if (!modal || !backdrop || !panel) return;

            modalTimeline?.kill();
            gsap.set(modal, { clearProps: "pointerEvents" });
            gsap.set([backdrop, panel], {
              willChange: "transform, opacity",
            });

            modalTimeline = gsap
              .timeline({
                defaults: { ease: "power2.out" },
                onComplete: () => {
                  gsap.set([backdrop, panel], {
                    clearProps: "willChange,transform,opacity,visibility",
                  });
                },
              })
              .fromTo(
                backdrop,
                { autoAlpha: 0 },
                { autoAlpha: 1, duration: 0.32 },
              )
              .fromTo(
                panel,
                { autoAlpha: 0, y: 12, scale: 0.995 },
                { autoAlpha: 1, y: 0, scale: 1, duration: 0.46 },
                "<0.04",
              );
          });

          const animateModalOut = contextSafe((event: Event) => {
            const modal = root.querySelector<HTMLElement>("#quote-modal");
            const backdrop =
              root.querySelector<HTMLElement>("#quote-backdrop");
            const panel = root.querySelector<HTMLElement>("#quote-panel");
            if (
              !modal ||
              !backdrop ||
              !panel ||
              modal.classList.contains("hidden")
            ) {
              return;
            }

            event.preventDefault();
            modalTimeline?.kill();
            gsap.set(modal, { pointerEvents: "none" });

            modalTimeline = gsap
              .timeline({
                onComplete: () => {
                  modal.classList.add("hidden");
                  document.body.style.overflow = "";
                  gsap.set(modal, { clearProps: "pointerEvents" });
                  gsap.set([backdrop, panel], {
                    clearProps: "willChange,transform,opacity,visibility",
                  });
                },
              })
              .to(panel, {
                autoAlpha: 0,
                y: 8,
                scale: 0.996,
                duration: 0.26,
                ease: "power2.in",
              })
              .to(
                backdrop,
                {
                  autoAlpha: 0,
                  duration: 0.24,
                  ease: "power1.in",
                },
                "<",
              );
          });

          const animateSuccess = contextSafe(() => {
            const success =
              root.querySelector<HTMLElement>("#quote-success");
            if (!success || success.classList.contains("hidden")) return;

            const items = Array.from(success.children);
            gsap.fromTo(
              items,
              { autoAlpha: 0, y: 8 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.48,
                stagger: 0.065,
                ease: "power2.out",
                clearProps: "transform,opacity,visibility",
              },
            );
          });

          const handleClick = contextSafe((event: MouseEvent) => {
            const target =
              event.target instanceof Element ? event.target : null;
            if (!target) return;

            const choice = target.closest<HTMLElement>(
              ".swatch, .acc-swatch, .door-btn, .panel-btn, .acc-toggle, #qty-minus, #qty-plus",
            );
            if (choice) {
              gsap.fromTo(
                choice,
                { scale: 0.965 },
                {
                  scale: 1,
                  duration: 0.28,
                  ease: "power2.out",
                  overwrite: "auto",
                  clearProps: "transform",
                },
              );

              const visual = root.querySelector<HTMLElement>(
                '[data-sam-motion="visual"]',
              );
              if (
                visual &&
                choice.matches(
                  ".swatch, .acc-swatch, .door-btn, .panel-btn, .acc-toggle",
                )
              ) {
                gsap.fromTo(
                  visual,
                  { scale: 0.998 },
                  {
                    scale: 1,
                    duration: 0.44,
                    ease: "power1.out",
                    overwrite: "auto",
                    clearProps: "transform",
                  },
                );
              }
            }

            const accordion = target.closest<HTMLElement>(
              ".cfg-row-header, .section-toggle",
            );
            if (!accordion) return;

            const body = accordion.classList.contains("section-toggle")
              ? accordion
                  .closest<HTMLElement>(".cfg-section")
                  ?.querySelector<HTMLElement>(".section-body")
              : accordion
                  .closest<HTMLElement>(".cfg-row")
                  ?.querySelector<HTMLElement>(".cfg-row-body");
            const isOpen = body?.classList.contains("open")
              ? true
              : body
                ? !body.classList.contains("hidden")
                : false;

            if (body && isOpen && body.children.length) {
              gsap.fromTo(
                Array.from(body.children),
                { autoAlpha: 0, y: 4 },
                {
                  autoAlpha: 1,
                  y: 0,
                  duration: 0.34,
                  stagger: 0.03,
                  ease: "power1.out",
                  clearProps: "transform,opacity,visibility",
                },
              );
            }
          });

          const observer = new MutationObserver((records) => {
            if (
              records.some(
                (record) =>
                  record.type === "childList" && record.target === root,
              )
            ) {
              animateEntrance();
            }
          });

          observer.observe(root, { childList: true });
          root.addEventListener("click", handleClick);
          root.addEventListener("sam:quote-open", animateModalIn);
          root.addEventListener("sam:quote-close", animateModalOut);
          root.addEventListener("sam:quote-success", animateSuccess);
          animateEntrance();

          return () => {
            observer.disconnect();
            root.removeEventListener("click", handleClick);
            root.removeEventListener("sam:quote-open", animateModalIn);
            root.removeEventListener("sam:quote-close", animateModalOut);
            root.removeEventListener("sam:quote-success", animateSuccess);
            clearEntrance();
            modalTimeline?.kill();
            document.body.style.overflow = "";
          };
        },
      );

      return () => media.revert();
    },
    { scope: rootRef },
  );

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

  return <div id="sam-app" ref={rootRef} className="sam-motion-root" />;
}
