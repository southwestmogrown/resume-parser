import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorCard from "@/components/ErrorCard";

describe("ErrorCard", () => {
  it("renders the error message with alert role", () => {
    render(<ErrorCard message="Something went wrong" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders retry button and calls onRetry when clicked", async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    render(<ErrorCard message="Failed" onRetry={onRetry} />);

    const retryBtn = screen.getByRole("button", { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();
    await user.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders dismiss button and calls onDismiss when clicked", async () => {
    const onDismiss = jest.fn();
    const user = userEvent.setup();
    render(<ErrorCard message="Error" onDismiss={onDismiss} />);

    const dismissBtn = screen.getByRole("button", { name: /Dismiss/i });
    expect(dismissBtn).toBeInTheDocument();
    await user.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not render action buttons when neither callback is provided", () => {
    render(<ErrorCard message="Read-only error" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders both retry and dismiss when both are provided", () => {
    render(<ErrorCard message="Both" onRetry={jest.fn()} onDismiss={jest.fn()} />);
    expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dismiss/i })).toBeInTheDocument();
  });
});
