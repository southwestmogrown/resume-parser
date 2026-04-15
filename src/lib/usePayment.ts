"use client";

import { useCallback, useEffect } from "react";
import type { UseWorkspaceReturn } from "@/lib/useWorkspace";

export function usePayment(ws: UseWorkspaceReturn) {
  const {
    setAnalysisToken, setPaymentState,
    setCheckoutClientSecret, setError,
    setResumeData, setMatchResult, setGithubProfile, setLinkedinProfile,
    setJobDescriptions,
    pollTimeoutRef, isMountedRef,
  } = ws;

  // ── Stripe redirect handling ────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("token");
    const success = params.get("success");
    const canceled = params.get("canceled");

    if (success || canceled) {
      const savedJds = sessionStorage.getItem("pending_jds");
      const savedResumeData = sessionStorage.getItem("pending_resume_data");
      const savedMatchResult = sessionStorage.getItem("pending_match_result");
      const savedGithubProfile = sessionStorage.getItem("pending_github_profile");
      const savedLinkedinProfile = sessionStorage.getItem("pending_linkedin_profile");

      if (savedJds) {
        try { setJobDescriptions(JSON.parse(savedJds)); } catch { sessionStorage.removeItem("pending_jds"); }
      }
      if (savedResumeData) {
        try { setResumeData(JSON.parse(savedResumeData)); } catch { sessionStorage.removeItem("pending_resume_data"); }
      }
      if (savedMatchResult) {
        try { setMatchResult(JSON.parse(savedMatchResult)); } catch { sessionStorage.removeItem("pending_match_result"); }
      }
      if (savedGithubProfile) {
        try { setGithubProfile(JSON.parse(savedGithubProfile)); } catch { sessionStorage.removeItem("pending_github_profile"); }
      }
      if (savedLinkedinProfile) {
        try { setLinkedinProfile(JSON.parse(savedLinkedinProfile)); } catch { sessionStorage.removeItem("pending_linkedin_profile"); }
      }

      sessionStorage.removeItem("pending_jds");
      sessionStorage.removeItem("pending_resume_data");
      sessionStorage.removeItem("pending_match_result");
      sessionStorage.removeItem("pending_github_profile");
      sessionStorage.removeItem("pending_linkedin_profile");
    }

    if (canceled) {
      setPaymentState("canceled");
      window.history.replaceState({}, "", "/app");
      return;
    }

    if (success && sessionId) {
      setPaymentState("pending");
      let attempts = 0;
      let redeeming = false;

      const clearPollTimeout = () => {
        if (pollTimeoutRef.current !== null) {
          window.clearTimeout(pollTimeoutRef.current);
          pollTimeoutRef.current = null;
        }
      };

      const pollForToken = () => {
        pollTimeoutRef.current = window.setTimeout(async () => {
          if (!isMountedRef.current) { clearPollTimeout(); return; }
          if (redeeming) { pollForToken(); return; }

          redeeming = true;
          attempts += 1;

          try {
            const response = await fetch("/api/redeem-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId }),
            });

            if (!isMountedRef.current) { clearPollTimeout(); return; }

            if (response.ok) {
              const { token } = await response.json();
              if (!isMountedRef.current) { clearPollTimeout(); return; }
              setAnalysisToken(token);
              setPaymentState("paid");
              clearPollTimeout();
              window.history.replaceState({}, "", "/app");
              return;
            }

            if (attempts >= 10) {
              clearPollTimeout();
              setPaymentState("canceled");
              window.history.replaceState({}, "", "/app");
              return;
            }
          } finally {
            redeeming = false;
          }

          if (isMountedRef.current) pollForToken();
        }, 1000);
      };

      pollForToken();
      return clearPollTimeout;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Open checkout (PaymentIntent flow) ─────────────────────────────────
  const openCheckout = useCallback(async () => {
    try {
      const response = await fetch("/api/create-payment-intent", { method: "POST" });
      if (!response.ok) throw new Error("Checkout setup failed.");
      const { clientSecret } = await response.json();
      setCheckoutClientSecret(clientSecret as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout setup failed.");
    }
  }, [setCheckoutClientSecret, setError]);

  const handlePay = useCallback(async () => {
    await openCheckout();
  }, [openCheckout]);

  return { openCheckout, handlePay };
}
