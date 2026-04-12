import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "@/components/ErrorBoundary";
import LandingPage from "@/components/LandingPage";

function Boom() {
  throw new Error("kaboom");
}

describe("LandingPage and ErrorBoundary", () => {
  it("renders the landing page and responds to scroll", () => {
    render(<LandingPage />);
    expect(screen.getByText("Stop guessing why you're getting ghosted.")).toBeInTheDocument();
    const nav = document.querySelector(".site-nav") as HTMLElement;
    expect(nav).not.toHaveClass("site-nav--scrolled");

    Object.defineProperty(window, "scrollY", { configurable: true, value: 20 });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(nav).toHaveClass("site-nav--scrolled");
    expect(screen.getAllByText("[ testimonial coming ]").length).toBe(3);
  });

  it("catches runtime errors and resets", async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something broke.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("Something broke.")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
