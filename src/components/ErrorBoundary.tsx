"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Something went wrong",
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-brand-bg">
          <div className="rounded-2xl border border-brand-border bg-brand-surface p-8 text-center">
            <p className="text-sm text-brand-red">{this.state.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, message: "" })}
              className="mt-4 text-xs text-brand-muted underline hover:text-brand-text"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
