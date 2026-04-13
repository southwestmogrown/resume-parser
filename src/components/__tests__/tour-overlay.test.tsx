import { act, render } from "@testing-library/react";
import TourOverlay from "@/components/TourOverlay";
import type { TourStep } from "@/lib/tourConfig";

const requestAnimationFrameMock = jest.fn((callback: FrameRequestCallback) => {
  callback(0);
  return 1;
});

const cancelAnimationFrameMock = jest.fn();

class MockResizeObserver implements ResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}

  disconnect() {}
  unobserve() {}

  observe(target: Element) {
    this.callback(
      [
        {
          borderBoxSize: [] as unknown as ReadonlyArray<ResizeObserverSize>,
          contentBoxSize: [] as unknown as ReadonlyArray<ResizeObserverSize>,
          contentRect: { width: 320, height: 210, top: 0, left: 0, right: 320, bottom: 210, x: 0, y: 0, toJSON: () => ({}) } as DOMRectReadOnly,
          devicePixelContentBoxSize: [] as unknown as ReadonlyArray<ResizeObserverSize>,
          target,
        },
      ],
      this
    );
  }
}

class MockMutationObserver implements MutationObserver {
  constructor(callback: MutationCallback) {
    void callback;
  }

  disconnect() {}
  observe() {}
  takeRecords(): MutationRecord[] {
    return [];
  }
}

describe("TourOverlay", () => {
  const originalResizeObserver = global.ResizeObserver;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const originalInnerHeight = window.innerHeight;
  const originalInnerWidth = window.innerWidth;
  const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
  const originalMutationObserver = global.MutationObserver;
  let currentRect: DOMRect;

  const steps: TourStep[] = [
    {
      title: "Target step",
      description: "Focus this control.",
      targetSelector: ".tour-target",
      placement: "bottom",
      autoAdvanceMs: 0,
    },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(global, "ResizeObserver", {
      configurable: true,
      writable: true,
      value: MockResizeObserver,
    });
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      writable: true,
      value: requestAnimationFrameMock,
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      writable: true,
      value: cancelAnimationFrameMock,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 900,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1280,
    });
    Object.defineProperty(global, "MutationObserver", {
      configurable: true,
      writable: true,
      value: MockMutationObserver,
    });
    currentRect = {
      top: 140,
      left: 120,
      width: 180,
      height: 52,
      bottom: 192,
      right: 300,
      x: 120,
      y: 140,
      toJSON: () => ({}),
    } as DOMRect;
    HTMLElement.prototype.getBoundingClientRect = jest.fn(function mockRect() {
      return this.classList.contains("tour-target")
        ? currentRect
        : ({
            top: 0,
            left: 0,
            width: 320,
            height: 210,
            bottom: 210,
            right: 320,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          } as DOMRect);
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    Object.defineProperty(global, "ResizeObserver", {
      configurable: true,
      writable: true,
      value: originalResizeObserver,
    });
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      writable: true,
      value: originalRequestAnimationFrame,
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      writable: true,
      value: originalCancelAnimationFrame,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: originalInnerHeight,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: originalInnerWidth,
    });
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    Object.defineProperty(global, "MutationObserver", {
      configurable: true,
      writable: true,
      value: originalMutationObserver,
    });
  });

  it("raises the highlighted target above the overlay and restores it on unmount", () => {
    const onNext = jest.fn();
    const onPrev = jest.fn();
    const onSkip = jest.fn();

    const { container, unmount } = render(
      <div>
        <div className="tour-target">Upload target</div>
        <TourOverlay steps={steps} currentStep={0} onNext={onNext} onPrev={onPrev} onSkip={onSkip} />
      </div>
    );

    const target = container.querySelector(".tour-target") as HTMLElement;

    act(() => {
      jest.runAllTimers();
    });

    expect(target).toHaveAttribute("data-tour-active", "true");
    expect(target).toHaveStyle({ position: "relative", zIndex: "900", isolation: "isolate" });

    unmount();

    expect(target).not.toHaveAttribute("data-tour-active");
    expect(target.style.position).toBe("");
    expect(target.style.zIndex).toBe("");
    expect(target.style.isolation).toBe("");
  });

  it("scrolls low targets into view when the tooltip needs room below them", () => {
    const onNext = jest.fn();
    const onPrev = jest.fn();
    const onSkip = jest.fn();

    currentRect = {
      top: 760,
      left: 120,
      width: 180,
      height: 52,
      bottom: 812,
      right: 300,
      x: 120,
      y: 760,
      toJSON: () => ({}),
    } as DOMRect;

    render(
      <div>
        <div className="tour-target">Pay button</div>
        <TourOverlay steps={steps} currentStep={0} onNext={onNext} onPrev={onPrev} onSkip={onSkip} />
      </div>
    );

    act(() => {
      jest.runAllTimers();
    });

    expect(window.scrollTo).toHaveBeenCalled();
  });
});
