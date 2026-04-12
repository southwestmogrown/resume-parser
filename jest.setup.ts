import "@testing-library/jest-dom";

class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds = [0];

  constructor(private readonly callback: IntersectionObserverCallback) {}

  disconnect() {}

  observe = (element: Element) => {
    this.callback(
      [
        {
          boundingClientRect: element.getBoundingClientRect(),
          intersectionRatio: 1,
          intersectionRect: element.getBoundingClientRect(),
          isIntersecting: true,
          rootBounds: null,
          target: element,
          time: Date.now(),
        },
      ],
      this
    );
  };

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  unobserve() {}
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: jest.fn(),
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

Object.defineProperty(navigator, "clipboard", {
  writable: true,
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  window.history.replaceState({}, "", "/");
});
