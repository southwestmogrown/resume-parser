import { render, screen } from "@testing-library/react";
import { type ReactNode, useEffect } from "react";
import CheckoutModal from "@/components/CheckoutModal";

const loadStripeMock = jest.fn();

jest.mock("@stripe/stripe-js", () => ({
  loadStripe: (...args: unknown[]) => loadStripeMock(...args),
}));

jest.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PaymentElement: ({ onReady }: { onReady?: () => void }) => {
    useEffect(() => {
      onReady?.();
    }, [onReady]);
    return <div>PaymentElement</div>;
  },
  useElements: () => null,
  useStripe: () => null,
}));

describe("CheckoutModal", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_123";
    loadStripeMock.mockResolvedValue(null);
  });

  it("initializes Stripe only when modal renders", () => {
    expect(loadStripeMock).not.toHaveBeenCalled();

    render(
      <CheckoutModal
        clientSecret="cs_test_123"
        onSuccess={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(loadStripeMock).toHaveBeenCalledWith("pk_test_123");
  });

  it("skips Stripe initialization when publishable key is missing", () => {
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    render(
      <CheckoutModal
        clientSecret="cs_test_123"
        onSuccess={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByRole("dialog", { name: "Checkout" })).toBeInTheDocument();
    expect(loadStripeMock).not.toHaveBeenCalled();
  });
});
