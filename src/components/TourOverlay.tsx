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

function getSpotlightRect(selector: string): SpotlightRect | null {
  if (selector === "body") return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
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

  const clearAutoTimer = useCallback(() => {
    if (autoTimerRef.current !== null) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  // Compute spotlight rect + tooltip position on step change
  useEffect(() => {
    clearAutoTimer();
    // Small delay to let DOM update after state changes
    const raf = requestAnimationFrame(() => {
      const r = getSpotlightRect(step.targetSelector);
      setSpotlightRect(r);
      if (r) {
        // Position tooltip relative to target
        const PLACEMENT = step.placement ?? "bottom";
        const TOOLTIP_W = 340;
        const TOOLTIP_H = 180;
        const GAP = 16;
        let top = 0;
        let left = 0;

        if (PLACEMENT === "center" || !r) {
          // Center tooltip on screen
          top = window.innerHeight / 2 - TOOLTIP_H / 2;
          left = window.innerWidth / 2 - TOOLTIP_W / 2;
        } else if (PLACEMENT === "bottom") {
          top = r.top + r.height + GAP;
          left = r.left + r.width / 2 - TOOLTIP_W / 2;
        } else if (PLACEMENT === "top") {
          top = r.top - TOOLTIP_H - GAP;
          left = r.left + r.width / 2 - TOOLTIP_W / 2;
        } else if (PLACEMENT === "right") {
          top = r.top + r.height / 2 - TOOLTIP_H / 2;
          left = r.left + r.width + GAP;
        } else if (PLACEMENT === "left") {
          top = r.top + r.height / 2 - TOOLTIP_H / 2;
          left = r.left - TOOLTIP_W - GAP;
        }

        // Clamp to viewport
        top = Math.max(12, Math.min(top, window.innerHeight - TOOLTIP_H - 12));
        left = Math.max(12, Math.min(left, window.innerWidth - TOOLTIP_W - 12));

        setTooltipPos({ top, left });
      } else {
        setTooltipPos(null);
      }

      // Fire step's onActivate (e.g., populating form fields, clicking buttons)
      step.onActivate?.();

      // Auto-advance via onNext (handleTourNext in AppExperience).
      // NOTE: We intentionally do NOT include handleTourNext in the deps array.
      // handleTourNext is recreated every time tourStep changes, but that only
      // matters for the click handler (which fires synchronously). The auto-advance
      // effect fires once per currentStep value, and each time it reads the
      // CURRENT onNext from the closure — which has the latest state values
      // because onNext (handleTourNext) is stable across the single async wait.
      if (step.autoAdvanceMs && step.autoAdvanceMs > 0) {
        autoTimerRef.current = setTimeout(() => {
          onNext();
        }, step.autoAdvanceMs);
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      clearAutoTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAutoTimer();
  }, [clearAutoTimer]);

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
          background: spotlightRect
            ? "transparent"
            : "rgba(0,0,0,0.72)",
          zIndex: 899,
          pointerEvents: spotlightRect ? "none" : "auto",
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
            boxShadow: "0 0 0 4px rgba(57,217,184,0.25), 0 0 32px 8px rgba(57,217,184,0.18)",
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
            width: 340,
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
