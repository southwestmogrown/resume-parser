/** @jest-environment node */

jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((options: unknown) => ({ options })),
}));

jest.mock("stripe", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((key: string, options: unknown) => ({
    key,
    options,
    checkout: { sessions: {} },
    webhooks: {},
  })),
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn().mockImplementation((url: string, key: string) => ({ url, key })),
}));

describe("server client singletons", () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("creates and caches the Anthropic client", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const Anthropic = (await import("@anthropic-ai/sdk")).default as unknown as jest.Mock;
    const { getAnthropic } = await import("@/lib/anthropic");

    const first = getAnthropic();
    const second = getAnthropic();

    expect(first).toBe(second);
    expect(Anthropic).toHaveBeenCalledTimes(1);
    expect(Anthropic).toHaveBeenCalledWith({ apiKey: "test-key" });
  });

  it("throws when the Anthropic key is missing", async () => {
    const { getAnthropic } = await import("@/lib/anthropic");

    expect(() => getAnthropic()).toThrow("ANTHROPIC_API_KEY environment variable is not set");
  });

  it("creates and caches the Stripe client", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    const Stripe = (await import("stripe")).default as unknown as jest.Mock;
    const { getStripe } = await import("@/lib/stripe");

    const first = getStripe();
    const second = getStripe();

    expect(first).toBe(second);
    expect(Stripe).toHaveBeenCalledTimes(1);
    expect(Stripe).toHaveBeenCalledWith("sk_test_123", {
      apiVersion: "2026-03-25.dahlia",
    });
  });

  it("throws when the Stripe secret is missing", async () => {
    const { getStripe } = await import("@/lib/stripe");

    expect(() => getStripe()).toThrow("STRIPE_SECRET_KEY environment variable is not set");
  });

  it("creates and caches the Supabase admin client", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    const { createClient } = await import("@supabase/supabase-js");
    const mockedCreateClient = createClient as unknown as jest.Mock;
    const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");

    const first = getSupabaseAdmin();
    const second = getSupabaseAdmin();

    expect(first).toBe(second);
    expect(mockedCreateClient).toHaveBeenCalledTimes(1);
    expect(mockedCreateClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-role"
    );
  });

  it("throws when Supabase env vars are missing", async () => {
    const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");

    expect(() => getSupabaseAdmin()).toThrow("Supabase admin environment variables are not set");
  });
});
