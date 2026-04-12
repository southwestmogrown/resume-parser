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
        <div className="app-shell" style={{ display: "grid", placeItems: "center", padding: "var(--space-6)" }}>
          <div className="card card-accent result-card" style={{ maxWidth: "520px", width: "100%" }}>
            <div>
              <div className="eyebrow">runtime error</div>
              <h2 style={{ fontSize: "1.4rem" }}>Something broke.</h2>
            </div>
            <p className="result-muted">{this.state.message}</p>
            <button type="button" onClick={() => this.setState({ hasError: false, message: "" })} className="btn-ghost">
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
