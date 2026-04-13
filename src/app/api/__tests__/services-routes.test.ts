/** @jest-environment node */

import { NextRequest } from "next/server";
import { POST as postCreateCheckout } from "@/app/api/create-checkout/route";
import { POST as postCreatePaymentIntent } from "@/app/api/create-payment-intent/route";
import { POST as postGithubProfile } from "@/app/api/github-profile/route";
import { POST as postMintFromPaymentIntent } from "@/app/api/mint-from-payment-intent/route";
import { POST as postRedeemToken } from "@/app/api/redeem-token/route";
import { POST as postWebhook } from "@/app/api/webhook/route";

const mockCreateSession = jest.fn();
const mockCreatePaymentIntent = jest.fn();
const mockRetrievePaymentIntent = jest.fn();
const mockRetrievePrice = jest.fn();
const mockRetrieveSession = jest.fn();
const mockConstructEvent = jest.fn();
const mockGetTokenBySessionId = jest.fn();
const mockMintToken = jest.fn();

jest.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        create: (...args: unknown[]) => mockCreateSession(...args),
        retrieve: (...args: unknown[]) => mockRetrieveSession(...args),
      },
    },
    paymentIntents: {
      create: (...args: unknown[]) => mockCreatePaymentIntent(...args),
      retrieve: (...args: unknown[]) => mockRetrievePaymentIntent(...args),
    },
    prices: {
      retrieve: (...args: unknown[]) => mockRetrievePrice(...args),
    },
    webhooks: { constructEvent: (...args: unknown[]) => mockConstructEvent(...args) },
  }),
}));

jest.mock("@/lib/tokens", () => ({
  getTokenBySessionId: (...args: unknown[]) => mockGetTokenBySessionId(...args),
  mintToken: (...args: unknown[]) => mockMintToken(...args),
}));

const jsonRequest = (body: string | object, headers?: Record<string, string>) =>
  new NextRequest("http://localhost/api/test", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });

describe("service API routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a checkout session", async () => {
    process.env.STRIPE_PRICE_ID = "price_123";
    mockCreateSession.mockResolvedValue({ client_secret: "seti_123_secret_456" });

    const response = await postCreateCheckout(
      new NextRequest("http://localhost/api/create-checkout", {
        method: "POST",
        headers: { origin: "https://resume-parser.app" },
      })
    );

    await expect(response.json()).resolves.toEqual({ clientSecret: "seti_123_secret_456" });
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: "https://resume-parser.app/app?token={CHECKOUT_SESSION_ID}&success=true",
        metadata: { product: "resume_analysis" },
      })
    );
  });

  it("creates a payment intent for the configured analysis price", async () => {
    process.env.STRIPE_PRICE_ID = "price_123";
    mockRetrievePrice.mockResolvedValueOnce({ unit_amount: 500, currency: "usd" });
    mockCreatePaymentIntent.mockResolvedValueOnce({
      id: "pi_123",
      client_secret: "pi_123_secret_456",
    });

    const response = await postCreatePaymentIntent(
      new NextRequest("http://localhost/api/create-payment-intent", { method: "POST" })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      clientSecret: "pi_123_secret_456",
      paymentIntentId: "pi_123",
    });
    expect(mockCreatePaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 500,
        currency: "usd",
        metadata: {
          product: "resume_analysis",
          price_id: "price_123",
        },
      })
    );
  });

  it("handles GitHub profile validation and upstream failures", async () => {
    let response = await postGithubProfile(jsonRequest("{"));
    expect(response.status).toBe(400);

    response = await postGithubProfile(jsonRequest({ username: "  " }));
    expect(response.status).toBe(400);

    const fetchSpy = jest.spyOn(global, "fetch");
    fetchSpy
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    response = await postGithubProfile(jsonRequest({ username: "@missing" }));
    expect(response.status).toBe(404);

    fetchSpy
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    response = await postGithubProfile(jsonRequest({ username: "@boom" }));
    expect(response.status).toBe(502);

    fetchSpy.mockRejectedValueOnce(new Error("offline"));
    response = await postGithubProfile(jsonRequest({ username: "@offline" }));
    expect(response.status).toBe(502);

    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ login: "jordan", bio: "Builder", public_repos: 12, followers: 5 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              name: "resume-parser",
              description: "A cool app",
              language: "TypeScript",
              stargazers_count: 3,
              html_url: "https://github.com/jordan/resume-parser",
              fork: false,
            },
            {
              name: "forked-repo",
              description: null,
              language: "JavaScript",
              stargazers_count: 0,
              html_url: "https://github.com/jordan/forked-repo",
              fork: true,
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );

    response = await postGithubProfile(jsonRequest({ username: "@jordan" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      profile: {
        username: "jordan",
        bio: "Builder",
        publicRepos: 12,
        followers: 5,
        topLanguages: ["TypeScript"],
        repos: [
          {
            name: "resume-parser",
            description: "A cool app",
            language: "TypeScript",
            stars: 3,
            url: "https://github.com/jordan/resume-parser",
          },
        ],
      },
    });

    fetchSpy.mockRestore();
  });

  it("redeems tokens across the payment lifecycle", async () => {
    process.env.STRIPE_PRICE_ID = "price_123";
    let response = await postRedeemToken(jsonRequest({}));
    expect(response.status).toBe(400);

    mockGetTokenBySessionId.mockResolvedValueOnce({ token: "used", uses_remaining: 0, expires_at: "2099-01-01T00:00:00.000Z" });
    response = await postRedeemToken(jsonRequest({ sessionId: "sess_used" }));
    expect(response.status).toBe(410);

    mockGetTokenBySessionId.mockResolvedValueOnce({ token: "expired", uses_remaining: 1, expires_at: "2000-01-01T00:00:00.000Z" });
    response = await postRedeemToken(jsonRequest({ sessionId: "sess_expired" }));
    expect(response.status).toBe(410);

    mockGetTokenBySessionId.mockResolvedValueOnce(null);
    mockRetrieveSession.mockRejectedValueOnce(new Error("stripe down"));
    response = await postRedeemToken(jsonRequest({ sessionId: "sess_error" }));
    expect(response.status).toBe(502);

    mockGetTokenBySessionId.mockResolvedValueOnce(null);
    mockRetrieveSession.mockResolvedValueOnce({ id: "sess_pending", payment_status: "unpaid" });
    response = await postRedeemToken(jsonRequest({ sessionId: "sess_pending" }));
    expect(response.status).toBe(402);

    mockGetTokenBySessionId.mockResolvedValueOnce(null);
    mockRetrievePrice.mockResolvedValueOnce({ unit_amount: 500, currency: "usd" });
    mockRetrieveSession.mockResolvedValueOnce({
      id: "sess_paid",
      payment_status: "paid",
      amount_total: 500,
      currency: "usd",
      metadata: { product: "resume_analysis" },
    });
    mockMintToken.mockRejectedValueOnce(new Error("db down"));
    response = await postRedeemToken(jsonRequest({ sessionId: "sess_paid" }));
    expect(response.status).toBe(502);

    mockGetTokenBySessionId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockRetrievePrice.mockResolvedValueOnce({ unit_amount: 500, currency: "usd" });
    mockRetrieveSession.mockResolvedValueOnce({
      id: "sess_missing",
      payment_status: "paid",
      amount_total: 500,
      currency: "usd",
      metadata: { product: "resume_analysis" },
    });
    mockMintToken.mockResolvedValueOnce("new-token");
    response = await postRedeemToken(jsonRequest({ sessionId: "sess_missing" }));
    expect(response.status).toBe(500);

    mockGetTokenBySessionId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ token: "fresh", uses_remaining: 4, expires_at: "2099-01-01T00:00:00.000Z" });
    mockRetrievePrice.mockResolvedValueOnce({ unit_amount: 500, currency: "usd" });
    mockRetrieveSession.mockResolvedValueOnce({
      id: "sess_success",
      payment_status: "paid",
      amount_total: 500,
      currency: "usd",
      metadata: { product: "resume_analysis" },
    });
    mockMintToken.mockResolvedValueOnce("fresh");
    response = await postRedeemToken(jsonRequest({ sessionId: "sess_success" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ token: "fresh" });

    mockGetTokenBySessionId.mockResolvedValueOnce(null);
    mockRetrievePrice.mockResolvedValueOnce({ unit_amount: 500, currency: "usd" });
    mockRetrieveSession.mockResolvedValueOnce({
      id: "sess_wrong_price",
      payment_status: "paid",
      amount_total: 600,
      currency: "usd",
      metadata: { product: "resume_analysis" },
    });
    response = await postRedeemToken(jsonRequest({ sessionId: "sess_wrong_price" }));
    expect(response.status).toBe(400);
  });

  it("verifies webhook signatures and mints tokens", async () => {
    mockConstructEvent.mockImplementationOnce(() => {
      throw new Error("bad signature");
    });

    let response = await postWebhook(
      new NextRequest("http://localhost/api/webhook", {
        method: "POST",
        body: "payload",
        headers: { "stripe-signature": "sig" },
      })
    );
    expect(response.status).toBe(400);

    mockConstructEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "sess_123",
          payment_status: "paid",
          amount_total: 500,
          currency: "usd",
          metadata: { product: "resume_analysis" },
        },
      },
    });
    mockRetrievePrice.mockResolvedValueOnce({ unit_amount: 500, currency: "usd" });
    mockMintToken.mockRejectedValueOnce(new Error("db down"));
    response = await postWebhook(
      new NextRequest("http://localhost/api/webhook", {
        method: "POST",
        body: "payload",
        headers: { "stripe-signature": "sig" },
      })
    );
    expect(response.status).toBe(500);

    mockConstructEvent.mockReturnValueOnce({
      type: "payment_intent.created",
      data: { object: { id: "pi_123" } },
    });
    response = await postWebhook(
      new NextRequest("http://localhost/api/webhook", {
        method: "POST",
        body: "payload",
        headers: { "stripe-signature": "sig" },
      })
    );
    await expect(response.json()).resolves.toEqual({ received: true });

    mockConstructEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "sess_123",
          payment_status: "paid",
          amount_total: 500,
          currency: "usd",
          metadata: { product: "resume_analysis" },
        },
      },
    });
    mockRetrievePrice.mockResolvedValueOnce({ unit_amount: 500, currency: "usd" });
    response = await postWebhook(
      new NextRequest("http://localhost/api/webhook", {
        method: "POST",
        body: "payload",
        headers: { "stripe-signature": "sig" },
      })
    );
    expect(response.status).toBe(200);
    expect(mockMintToken).toHaveBeenCalledWith("sess_123");
  });

  it("verifies payment intents before minting tokens", async () => {
    process.env.STRIPE_PRICE_ID = "price_123";

    let response = await postMintFromPaymentIntent(jsonRequest({}));
    expect(response.status).toBe(400);

    mockRetrievePaymentIntent.mockResolvedValueOnce({ id: "pi_pending", status: "processing" });
    response = await postMintFromPaymentIntent(jsonRequest({ paymentIntentId: "pi_pending" }));
    expect(response.status).toBe(402);

    mockRetrievePaymentIntent.mockResolvedValueOnce({
      id: "pi_wrong",
      status: "succeeded",
      amount: 600,
      currency: "usd",
      metadata: { product: "resume_analysis" },
    });
    mockRetrievePrice.mockResolvedValueOnce({ unit_amount: 500, currency: "usd" });
    response = await postMintFromPaymentIntent(jsonRequest({ paymentIntentId: "pi_wrong" }));
    expect(response.status).toBe(400);

    mockRetrievePaymentIntent.mockResolvedValueOnce({
      id: "pi_good",
      status: "succeeded",
      amount: 500,
      currency: "usd",
      metadata: { product: "resume_analysis" },
    });
    mockRetrievePrice.mockResolvedValueOnce({ unit_amount: 500, currency: "usd" });
    mockMintToken.mockResolvedValueOnce({ token: "analysis-token", expiresAt: "2099-01-01T00:00:00.000Z" });
    response = await postMintFromPaymentIntent(jsonRequest({ paymentIntentId: "pi_good" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      token: "analysis-token",
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
  });
});
