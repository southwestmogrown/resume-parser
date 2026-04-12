/** @jest-environment node */

import { NextRequest } from "next/server";
import { POST as postCreateCheckout } from "@/app/api/create-checkout/route";
import { POST as postGithubProfile } from "@/app/api/github-profile/route";
import { POST as postRedeemToken } from "@/app/api/redeem-token/route";
import { POST as postWebhook } from "@/app/api/webhook/route";

const mockCreateSession = jest.fn();
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
    mockCreateSession.mockResolvedValue({ url: "https://checkout.stripe.test/session" });

    const response = await postCreateCheckout(
      new NextRequest("http://localhost/api/create-checkout", {
        method: "POST",
        headers: { origin: "https://resume-parser.app" },
      })
    );

    await expect(response.json()).resolves.toEqual({ url: "https://checkout.stripe.test/session" });
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: "https://resume-parser.app/app?token={CHECKOUT_SESSION_ID}&success=true",
        cancel_url: "https://resume-parser.app/app?canceled=true",
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
    mockRetrieveSession.mockResolvedValueOnce({ id: "sess_paid", payment_status: "paid" });
    mockMintToken.mockRejectedValueOnce(new Error("db down"));
    response = await postRedeemToken(jsonRequest({ sessionId: "sess_paid" }));
    expect(response.status).toBe(502);

    mockGetTokenBySessionId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockRetrieveSession.mockResolvedValueOnce({ id: "sess_missing", payment_status: "paid" });
    mockMintToken.mockResolvedValueOnce("new-token");
    response = await postRedeemToken(jsonRequest({ sessionId: "sess_missing" }));
    expect(response.status).toBe(500);

    mockGetTokenBySessionId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ token: "fresh", uses_remaining: 4, expires_at: "2099-01-01T00:00:00.000Z" });
    mockRetrieveSession.mockResolvedValueOnce({ id: "sess_success", payment_status: "paid" });
    mockMintToken.mockResolvedValueOnce("fresh");
    response = await postRedeemToken(jsonRequest({ sessionId: "sess_success" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ token: "fresh" });
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
      data: { object: { id: "sess_123" } },
    });
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
      data: { object: { id: "sess_123" } },
    });
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
});
