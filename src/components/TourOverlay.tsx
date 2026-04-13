"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TourStep } from "@/lib/tourConfig";

interface TourOverlayProps {
  steps: TourStep[];
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface SavedTargetStyles {
  element: HTMLElement;
  position: string;
  zIndex: string;
  isolation: string;
}

const TOOLTIP_WIDTH = 340;
const TOOLTIP_INITIAL_HEIGHT = 180;
const TOOLTIP_GAP = 16;
const NAV_OFFSET = 96;
const VIEWPORT_MARGIN = 24;
const LAYOUT_SETTLE_MS = 350;
// Backdrop opacity while the active target is lifted above the overlay.
const OVERLAY_ALPHA = 0.58;
// Max share of viewport height reserved so top/bottom tooltips stay visible with the target.
const VERTICAL_TOOLTIP_BUFFER_RATIO = 0.34;
// Smaller viewport reservation for side tooltips, which need less vertical clearance.
const SIDE_TOOLTIP_BUFFER_RATIO = 0.28;

function getTargetElement(selector: string): HTMLElement | null {
  if (selector === "body") return null;
  return document.querySelector<HTMLElement>(selector);
}

function getSpotlightRect(target: HTMLElement | null): SpotlightRect | null {
  if (!target) return null;
  const r = target.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function getPlacementCandidates(
  preferredPlacement: TourStep["placement"]
): Array<Exclude<TourStep["placement"], "center" | undefined>> {
  switch (preferredPlacement) {
    case "top":
      return ["top", "bottom", "right", "left"];
    case "left":
      return ["left", "right", "bottom", "top"];
    case "right":
      return ["right", "left", "bottom", "top"];
    case "bottom":
    default:
      return ["bottom", "top", "right", "left"];
  }
}

function getRawTooltipPosition(
  rect: SpotlightRect,
  placement: Exclude<TourStep["placement"], "center" | undefined>,
  tooltipSize: { width: number; height: number }
): { top: number; left: number } {
  if (placement === "bottom") {
    return {
      top: rect.top + rect.height + TOOLTIP_GAP,
      left: rect.left + rect.width / 2 - tooltipSize.width / 2,
    };
  }

  if (placement === "top") {
    return {
      top: rect.top - tooltipSize.height - TOOLTIP_GAP,
      left: rect.left + rect.width / 2 - tooltipSize.width / 2,
    };
  }

  if (placement === "right") {
    return {
      top: rect.top + rect.height / 2 - tooltipSize.height / 2,
      left: rect.left + rect.width + TOOLTIP_GAP,
    };
  }

  return {
    top: rect.top + rect.height / 2 - tooltipSize.height / 2,
    left: rect.left - tooltipSize.width - TOOLTIP_GAP,
  };
}

function getTooltipPosition(
  rect: SpotlightRect | null,
  placement: TourStep["placement"],
  tooltipSize: { width: number; height: number }
): { top: number; left: number } {
  if (!rect || placement === "center") {
    return {
      top: Math.max(
        VIEWPORT_MARGIN,
        Math.min(
          window.innerHeight / 2 - tooltipSize.height / 2,
          window.innerHeight - tooltipSize.height - VIEWPORT_MARGIN
        )
      ),
      left: Math.max(
        VIEWPORT_MARGIN,
        Math.min(
          window.innerWidth / 2 - tooltipSize.width / 2,
          window.innerWidth - tooltipSize.width - VIEWPORT_MARGIN
        )
      ),
    };
  }

  const candidates = getPlacementCandidates(placement);
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const scoredCandidates = candidates.map((candidatePlacement) => {
    const raw = getRawTooltipPosition(rect, candidatePlacement, tooltipSize);
    const clampedTop = Math.max(
      VIEWPORT_MARGIN,
      Math.min(raw.top, viewportHeight - tooltipSize.height - VIEWPORT_MARGIN)
    );
    const clampedLeft = Math.max(
      VIEWPORT_MARGIN,
      Math.min(raw.left, viewportWidth - tooltipSize.width - VIEWPORT_MARGIN)
    );

    const overflow =
      Math.max(0, VIEWPORT_MARGIN - raw.top) +
      Math.max(0, raw.top + tooltipSize.height + VIEWPORT_MARGIN - viewportHeight) +
      Math.max(0, VIEWPORT_MARGIN - raw.left) +
      Math.max(0, raw.left + tooltipSize.width + VIEWPORT_MARGIN - viewportWidth);

    const overlapWidth = Math.max(
      0,
      Math.min(clampedLeft + tooltipSize.width, rect.left + rect.width) - Math.max(clampedLeft, rect.left)
    );
    const overlapHeight = Math.max(
      0,
      Math.min(clampedTop + tooltipSize.height, rect.top + rect.height) - Math.max(clampedTop, rect.top)
    );

    return {
      top: clampedTop,
      left: clampedLeft,
      score: overflow * 10 + overlapWidth * overlapHeight,
    };
  });

  scoredCandidates.sort((a, b) => a.score - b.score);
  return scoredCandidates[0] ?? { top: VIEWPORT_MARGIN, left: VIEWPORT_MARGIN };
}

function scrollTargetIntoView(
  target: HTMLElement | null,
  placement: TourStep["placement"],
  tooltipSize: { width: number; height: number }
) {
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const tooltipBuffer =
    placement === "top" || placement === "bottom"
      ? Math.min(tooltipSize.height + TOOLTIP_GAP, Math.floor(window.innerHeight * VERTICAL_TOOLTIP_BUFFER_RATIO))
      : Math.min(Math.max(tooltipSize.height / 2, 120), Math.floor(window.innerHeight * SIDE_TOOLTIP_BUFFER_RATIO));
  const topEdge = NAV_OFFSET + 12 + (placement === "top" ? tooltipBuffer : 0);
  const bottomEdge = window.innerHeight - VIEWPORT_MARGIN - (placement === "bottom" ? tooltipBuffer : 0);
  const needsScroll = rect.top < topEdge || rect.bottom > bottomEdge;
  if (!needsScroll) return;

  const absoluteTop = window.scrollY + rect.top;
  const availableHeight = window.innerHeight - NAV_OFFSET - VIEWPORT_MARGIN;
  const centeredOffset =
    rect.height >= availableHeight
      ? NAV_OFFSET + 12
      : Math.max(NAV_OFFSET, (window.innerHeight - rect.height - tooltipBuffer) / 2);
  const maxScrollTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const targetTop = Math.max(0, Math.min(absoluteTop - centeredOffset, maxScrollTop));
  window.scrollTo({ top: targetTop, behavior: "smooth" });
}

export default function TourOverlay({
  steps,
  currentStep,
  onNext,
  onPrev,
  onSkip,
}: TourOverlayProps) {
  const step = steps[currentStep];
  const totalSteps = steps.length;
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: TOOLTIP_WIDTH, height: TOOLTIP_INITIAL_HEIGHT });
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const activeTargetRef = useRef<SavedTargetStyles | null>(null);

  const clearAutoTimer = useCallback(() => {
    if (autoTimerRef.current !== null) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current !== null) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const clearRaf = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const clearActiveTarget = useCallback(() => {
    if (!activeTargetRef.current) return;
    const { element, position, zIndex, isolation } = activeTargetRef.current;
    element.removeAttribute("data-tour-active");
    element.style.position = position;
    element.style.zIndex = zIndex;
    element.style.isolation = isolation;
    activeTargetRef.current = null;
  }, []);

  const highlightTarget = useCallback((target: HTMLElement | null) => {
    clearActiveTarget();
    if (!target) return;

    activeTargetRef.current = {
      element: target,
      position: target.style.position,
      zIndex: target.style.zIndex,
      isolation: target.style.isolation,
    };

    target.dataset.tourActive = "true";
    if (!target.style.position || target.style.position === "static") {
      target.style.position = "relative";
    }
    target.style.zIndex = "900";
    target.style.isolation = "isolate";
  }, [clearActiveTarget]);

  useEffect(() => {
    const tooltip = tooltipRef.current;
    if (!tooltip || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setTooltipSize((current) => {
        const nextWidth = Math.ceil(width);
        const nextHeight = Math.ceil(height);
        if (current.width === nextWidth && current.height === nextHeight) return current;
        return { width: nextWidth, height: nextHeight };
      });
    });

    observer.observe(tooltip);
    return () => observer.disconnect();
  }, [currentStep, tooltipPos]);

  useEffect(() => {
    clearAutoTimer();
    clearSettleTimer();
    clearRaf();
    clearActiveTarget();

    let resizeObserver: ResizeObserver | null = null;
    let layoutObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    const updatePosition = () => {
      const target = getTargetElement(step.targetSelector);
      const rect = getSpotlightRect(target);
      setSpotlightRect(rect);
      setTooltipPos(getTooltipPosition(rect, step.placement ?? "bottom", tooltipSize));
    };

    const scheduleUpdate = () => {
      clearRaf();
      rafRef.current = window.requestAnimationFrame(updatePosition);
    };

    step.onActivate?.();

    rafRef.current = window.requestAnimationFrame(() => {
      const target = getTargetElement(step.targetSelector);
      highlightTarget(target);
      scrollTargetIntoView(target, step.placement ?? "bottom", tooltipSize);
      updatePosition();

      if (target && typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => scheduleUpdate());
        resizeObserver.observe(target);
      }

      if (typeof ResizeObserver !== "undefined") {
        layoutObserver = new ResizeObserver(() => scheduleUpdate());
        layoutObserver.observe(document.documentElement);
        layoutObserver.observe(document.body);
      }

      if (typeof MutationObserver !== "undefined") {
        mutationObserver = new MutationObserver(() => scheduleUpdate());
        mutationObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        });
      }
    });

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    // Wait for state-driven layout changes and sticky positioning to settle before the final measurement.
    settleTimerRef.current = setTimeout(() => {
      scheduleUpdate();
    }, LAYOUT_SETTLE_MS);

    if (step.autoAdvanceMs && step.autoAdvanceMs > 0) {
      autoTimerRef.current = setTimeout(() => {
        onNext();
      }, step.autoAdvanceMs);
    }

    return () => {
      resizeObserver?.disconnect();
      layoutObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      clearActiveTarget();
      clearRaf();
      clearSettleTimer();
      clearAutoTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearActiveTarget, clearAutoTimer, clearRaf, clearSettleTimer, currentStep, highlightTarget, steps, tooltipSize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAutoTimer();
      clearSettleTimer();
      clearRaf();
      clearActiveTarget();
    };
  }, [clearActiveTarget, clearAutoTimer, clearRaf, clearSettleTimer]);

  if (!step) return null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <>
      {/* Dim overlay — pointer-events: none so the app stays interactive beneath the tour UI */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: `rgba(0,0,0,${OVERLAY_ALPHA})`,
            zIndex: 899,
            pointerEvents: "auto",
          }}
        />

      {/* Spotlight cutout: thin border ring around target */}
      {spotlightRect && (
        <div
          style={{
            position: "fixed",
            top: spotlightRect.top - 4,
            left: spotlightRect.left - 4,
            width: spotlightRect.width + 8,
            height: spotlightRect.height + 8,
            borderRadius: 10,
            border: "2.5px solid var(--ps-accent)",
            boxShadow: `0 0 0 9999px rgba(0,0,0,${OVERLAY_ALPHA}), 0 0 0 4px rgba(57,217,184,0.22), 0 0 32px 8px rgba(57,217,184,0.18)`,
            zIndex: 901,
            pointerEvents: "none",
            transition: "all 0.35s ease",
          }}
        />
      )}

      {/* Tooltip card */}
      {tooltipPos && (
        <div
          ref={tooltipRef}
          style={{
            position: "fixed",
            top: tooltipPos.top,
            left: tooltipPos.left,
            width: `min(${TOOLTIP_WIDTH}px, calc(100vw - ${VIEWPORT_MARGIN * 2}px))`,
            maxHeight: `calc(100vh - ${VIEWPORT_MARGIN * 2}px)`,
            background: "var(--ps-bg-card)",
            border: "1px solid var(--ps-border-mid)",
            borderRadius: 12,
            padding: "var(--space-5)",
            zIndex: 902,
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            overflowY: "auto",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(57,217,184,0.1)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ps-accent)", fontFamily: "'Geist Mono', monospace" }}>
                Step {currentStep + 1} of {totalSteps}
              </span>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ps-text-primary)", margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                {step.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onSkip}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--ps-text-faint)",
                fontSize: 14,
                padding: "2px 4px",
                flexShrink: 0,
              }}
              aria-label="Skip tour"
            >
              ✕
            </button>
          </div>

          {/* Description */}
          <p style={{ fontSize: "0.875rem", color: "var(--ps-text-secondary)", lineHeight: 1.6, margin: 0 }}>
            {step.description}
          </p>

          {/* Progress bar */}
          <div style={{ height: 3, background: "var(--ps-border)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "var(--ps-accent)", borderRadius: 99, transition: "width 0.4s ease" }} />
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              onClick={onPrev}
              disabled={isFirst}
              style={{
                background: "none",
                border: "1px solid var(--ps-border-mid)",
                borderRadius: 6,
                padding: "7px 14px",
                cursor: isFirst ? "not-allowed" : "pointer",
                color: isFirst ? "var(--ps-text-faint)" : "var(--ps-text-secondary)",
                fontSize: 11,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                fontFamily: "'Geist Mono', monospace",
                opacity: isFirst ? 0.45 : 1,
              }}
            >
              ← Back
            </button>

            {!isLast ? (
              <button
                type="button"
                onClick={onNext}
                style={{
                  background: "var(--ps-accent)",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 18px",
                  cursor: "pointer",
                  color: "var(--ps-accent-text)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  fontFamily: "'Geist Mono', monospace",
                  fontWeight: 600,
                }}
              >
                {step.autoAdvanceMs && step.autoAdvanceMs > 0 ? "Next →" : "Next →"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onSkip}
                style={{
                  background: "var(--ps-accent)",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 18px",
                  cursor: "pointer",
                  color: "var(--ps-accent-text)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  fontFamily: "'Geist Mono', monospace",
                  fontWeight: 600,
                }}
              >
                Finish
              </button>
            )}
          </div>
        </div>
      )}

      {/* Fallback centered tooltip when no target found (step 0 — "body" selector) */}
      {!tooltipPos && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 380,
            background: "var(--ps-bg-card)",
            border: "1px solid var(--ps-border-mid)",
            borderRadius: 12,
            padding: "var(--space-6)",
            zIndex: 902,
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(57,217,184,0.1)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ps-accent)", fontFamily: "'Geist Mono', monospace" }}>
                Step {currentStep + 1} of {totalSteps}
              </span>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ps-text-primary)", margin: "4px 0 0", fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                {step.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onSkip}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--ps-text-faint)",
                fontSize: 14,
                padding: "2px 4px",
              }}
            >
              ✕
            </button>
          </div>

          <p style={{ fontSize: "0.9rem", color: "var(--ps-text-secondary)", lineHeight: 1.65, margin: 0 }}>
            {step.description}
          </p>

          <div style={{ height: 3, background: "var(--ps-border)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "var(--ps-accent)", borderRadius: 99, transition: "width 0.4s ease" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onNext}
              style={{
                background: "var(--ps-accent)",
                border: "none",
                borderRadius: 6,
                padding: "8px 20px",
                cursor: "pointer",
                color: "var(--ps-accent-text)",
                fontSize: 11,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                fontFamily: "'Geist Mono', monospace",
                fontWeight: 600,
              }}
            >
              Start tour →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
