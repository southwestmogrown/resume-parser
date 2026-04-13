import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  private readonly callback: MutationCallback;

  constructor(callback: MutationCallback) {
    // The test only needs MutationObserver construction to succeed.
    this.callback = callback;
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
  const originalDocumentScrollHeight = Object.getOwnPropertyDescriptor(document.documentElement, "scrollHeight");
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
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 2400,
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
    if (originalDocumentScrollHeight) {
      Object.defineProperty(document.documentElement, "scrollHeight", originalDocumentScrollHeight);
    }
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

    // 760px target top - 311px centered offset = 449px scroll target once the tooltip buffer is accounted for.
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 449, behavior: "smooth" });
  });

  it("shows a pause button on steps with autoAdvanceMs and hides it on manual steps", () => {
    const autoStep: TourStep = {
      title: "Auto step",
      description: "This one auto-advances.",
      targetSelector: ".tour-target",
      placement: "bottom",
      autoAdvanceMs: 9000,
    };
    const manualStep: TourStep = {
      title: "Manual step",
      description: "This one does not auto-advance.",
      targetSelector: ".tour-target",
      placement: "bottom",
      autoAdvanceMs: 0,
    };

    const { rerender } = render(
      <TourOverlay
        steps={[autoStep]}
        currentStep={0}
        onNext={jest.fn()}
        onPrev={jest.fn()}
        onSkip={jest.fn()}
      />
    );
    act(() => { jest.runAllTimers(); });

    expect(screen.getByRole("button", { name: "Pause auto-advance" })).toBeInTheDocument();

    rerender(
      <TourOverlay
        steps={[manualStep]}
        currentStep={0}
        onNext={jest.fn()}
        onPrev={jest.fn()}
        onSkip={jest.fn()}
      />
    );
    act(() => { jest.runAllTimers(); });

    expect(screen.queryByRole("button", { name: "Pause auto-advance" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resume auto-advance" })).not.toBeInTheDocument();
  });

  it("pausing stops the auto-advance timer and resuming schedules the remainder", async () => {
    const onNext = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const autoStep: TourStep = {
      title: "Auto step",
      description: "Should auto-advance.",
      targetSelector: ".tour-target",
      placement: "bottom",
      autoAdvanceMs: 9000,
    };

    render(
      <div>
        <div className="tour-target" />
        <TourOverlay
          steps={[autoStep]}
          currentStep={0}
          onNext={onNext}
          onPrev={jest.fn()}
          onSkip={jest.fn()}
        />
      </div>
    );

    act(() => { jest.advanceTimersByTime(4000); });
    expect(onNext).not.toHaveBeenCalled();

    // Pause at ~4 s elapsed — about 5 s remaining
    await user.click(screen.getByRole("button", { name: "Pause auto-advance" }));
    expect(screen.getByRole("button", { name: "Resume auto-advance" })).toBeInTheDocument();

    // Advance past the original deadline — auto-timer was cleared so onNext must NOT fire
    act(() => { jest.advanceTimersByTime(6000); });
    expect(onNext).not.toHaveBeenCalled();

    // Resume — the remainder (~5 s) is scheduled
    await user.click(screen.getByRole("button", { name: "Resume auto-advance" }));
    expect(screen.getByRole("button", { name: "Pause auto-advance" })).toBeInTheDocument();

    // Advance remaining time — onNext should fire
    act(() => { jest.advanceTimersByTime(6000); });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("clicking Next while paused resets the pause state for the new step", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const step0: TourStep = {
      title: "Step 0",
      description: "Auto-advances.",
      targetSelector: ".tour-target",
      placement: "bottom",
      autoAdvanceMs: 9000,
    };
    const step1: TourStep = {
      title: "Step 1",
      description: "Also auto-advances.",
      targetSelector: ".tour-target",
      placement: "bottom",
      autoAdvanceMs: 9000,
    };

    const { rerender } = render(
      <div>
        <div className="tour-target" />
        <TourOverlay
          steps={[step0, step1]}
          currentStep={0}
          onNext={jest.fn()}
          onPrev={jest.fn()}
          onSkip={jest.fn()}
        />
      </div>
    );

    act(() => { jest.runAllTimers(); });
    await user.click(screen.getByRole("button", { name: "Pause auto-advance" }));
    expect(screen.getByRole("button", { name: "Resume auto-advance" })).toBeInTheDocument();

    // Move to step 1 — pause state should reset
    rerender(
      <div>
        <div className="tour-target" />
        <TourOverlay
          steps={[step0, step1]}
          currentStep={1}
          onNext={jest.fn()}
          onPrev={jest.fn()}
          onSkip={jest.fn()}
        />
      </div>
    );
    act(() => { jest.runAllTimers(); });

    expect(screen.getByRole("button", { name: "Pause auto-advance" })).toBeInTheDocument();
  });
});
