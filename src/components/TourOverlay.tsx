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

const TOOLTIP_WIDTH = 340;
const TOOLTIP_HEIGHT = 180;
const TOOLTIP_GAP = 16;
const NAV_OFFSET = 96;
const VIEWPORT_MARGIN = 24;
const LAYOUT_SETTLE_MS = 350;

function getTargetElement(selector: string): HTMLElement | null {
  if (selector === "body") return null;
  return document.querySelector<HTMLElement>(selector);
}

function getSpotlightRect(target: HTMLElement | null): SpotlightRect | null {
  if (!target) return null;
  const r = target.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function getTooltipPosition(
  rect: SpotlightRect | null,
  placement: TourStep["placement"]
): { top: number; left: number } {
  if (!rect || placement === "center") {
    return {
      top: window.innerHeight / 2 - TOOLTIP_HEIGHT / 2,
      left: window.innerWidth / 2 - TOOLTIP_WIDTH / 2,
    };
  }

  let top = 0;
  let left = 0;

  if (placement === "bottom") {
    top = rect.top + rect.height + TOOLTIP_GAP;
    left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  } else if (placement === "top") {
    top = rect.top - TOOLTIP_HEIGHT - TOOLTIP_GAP;
    left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  } else if (placement === "right") {
    top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
    left = rect.left + rect.width + TOOLTIP_GAP;
  } else if (placement === "left") {
    top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
    left = rect.left - TOOLTIP_WIDTH - TOOLTIP_GAP;
  } else {
    top = window.innerHeight / 2 - TOOLTIP_HEIGHT / 2;
    left = window.innerWidth / 2 - TOOLTIP_WIDTH / 2;
  }

  return {
    top: Math.max(12, Math.min(top, window.innerHeight - TOOLTIP_HEIGHT - 12)),
    left: Math.max(12, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - 12)),
  };
}

function scrollTargetIntoView(target: HTMLElement | null) {
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const topEdge = NAV_OFFSET + 12;
  const bottomEdge = window.innerHeight - VIEWPORT_MARGIN;
  const needsScroll = rect.top < topEdge || rect.bottom > bottomEdge;
  if (!needsScroll) return;

  const absoluteTop = window.scrollY + rect.top;
  const availableHeight = window.innerHeight - NAV_OFFSET - VIEWPORT_MARGIN;
  const centeredOffset =
    rect.height >= availableHeight
      ? NAV_OFFSET + 12
      : Math.max(NAV_OFFSET, (window.innerHeight - rect.height) / 2);
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
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

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

  useEffect(() => {
    clearAutoTimer();
    clearSettleTimer();
    clearRaf();

    let resizeObserver: ResizeObserver | null = null;
    let layoutObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    const updatePosition = () => {
      const target = getTargetElement(step.targetSelector);
      const rect = getSpotlightRect(target);
      setSpotlightRect(rect);
      setTooltipPos(getTooltipPosition(rect, step.placement ?? "bottom"));
    };

    const scheduleUpdate = () => {
      clearRaf();
      rafRef.current = window.requestAnimationFrame(updatePosition);
    };

    step.onActivate?.();

    rafRef.current = window.requestAnimationFrame(() => {
      const target = getTargetElement(step.targetSelector);
      scrollTargetIntoView(target);
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
      clearRaf();
      clearSettleTimer();
      clearAutoTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAutoTimer();
      clearSettleTimer();
      clearRaf();
    };
  }, [clearAutoTimer, clearRaf, clearSettleTimer]);

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
            background: "rgba(0,0,0,0.72)",
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
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 4px rgba(57,217,184,0.22), 0 0 32px 8px rgba(57,217,184,0.18)",
            zIndex: 901,
            pointerEvents: "none",
            transition: "all 0.35s ease",
          }}
        />
      )}

      {/* Tooltip card */}
      {tooltipPos && (
        <div
          style={{
            position: "fixed",
            top: tooltipPos.top,
            left: tooltipPos.left,
            width: TOOLTIP_WIDTH,
            background: "var(--ps-bg-card)",
            border: "1px solid var(--ps-border-mid)",
            borderRadius: 12,
            padding: "var(--space-5)",
            zIndex: 902,
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
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
