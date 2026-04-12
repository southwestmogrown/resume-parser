/** @jest-environment node */

const getSupabaseAdmin = jest.fn();

jest.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin,
}));

describe("tokens", () => {
  const createSupabaseMock = () => {
    const maybeSingle = jest.fn();
    const single = jest.fn();
    const insert = jest.fn();
    const updateEq = jest.fn();
    const eq = jest.fn((field: string) => {
      if (field === "stripe_session_id") return { maybeSingle };
      return { single };
    });
    const select = jest.fn(() => ({ eq }));
    const update = jest.fn(() => ({ eq: updateEq }));
    const from = jest.fn(() => ({ select, insert, update }));

    return { from, maybeSingle, single, insert, update, updateEq };
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("generates a 64-character token", async () => {
    const { generateToken } = await import("@/lib/tokens");

    expect(generateToken()).toMatch(/^[a-f0-9]{64}$/);
  });

  it("returns a token record by session id", async () => {
    const supabase = createSupabaseMock();
    supabase.maybeSingle.mockResolvedValue({
      data: { token: "abc", uses_remaining: 4, expires_at: "2099-01-01T00:00:00.000Z" },
      error: null,
    });
    getSupabaseAdmin.mockReturnValue(supabase);
    const { getTokenBySessionId } = await import("@/lib/tokens");

    await expect(getTokenBySessionId("sess_123")).resolves.toEqual({
      token: "abc",
      uses_remaining: 4,
      expires_at: "2099-01-01T00:00:00.000Z",
    });
  });

  it("returns null when token lookup fails", async () => {
    const supabase = createSupabaseMock();
    supabase.maybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    getSupabaseAdmin.mockReturnValue(supabase);
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { getTokenBySessionId } = await import("@/lib/tokens");

    await expect(getTokenBySessionId("sess_123")).resolves.toBeNull();

    errorSpy.mockRestore();
  });

  it("returns an existing token during minting when one already exists", async () => {
    const supabase = createSupabaseMock();
    supabase.maybeSingle.mockResolvedValue({
      data: { token: "existing", uses_remaining: 4, expires_at: "2099-01-01T00:00:00.000Z" },
      error: null,
    });
    getSupabaseAdmin.mockReturnValue(supabase);
    const { mintToken } = await import("@/lib/tokens");

    await expect(mintToken("sess_123")).resolves.toBe("existing");
    expect(supabase.insert).not.toHaveBeenCalled();
  });

  it("mints a new token when one does not exist", async () => {
    const supabase = createSupabaseMock();
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    supabase.insert.mockResolvedValue({ error: null });
    getSupabaseAdmin.mockReturnValue(supabase);
    const { mintToken } = await import("@/lib/tokens");

    const token = await mintToken("sess_123");

    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_session_id: "sess_123",
        uses_remaining: 4,
      })
    );
  });

  it("returns the duplicate token when insert collides", async () => {
    const supabase = createSupabaseMock();
    supabase.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { token: "duplicate", uses_remaining: 4, expires_at: "2099-01-01T00:00:00.000Z" },
        error: null,
      });
    supabase.insert.mockResolvedValue({ error: { code: "23505" } });
    getSupabaseAdmin.mockReturnValue(supabase);
    const { mintToken } = await import("@/lib/tokens");

    await expect(mintToken("sess_123")).resolves.toBe("duplicate");
  });

  it("throws when a duplicate insert cannot be recovered", async () => {
    const supabase = createSupabaseMock();
    supabase.maybeSingle.mockResolvedValue({ data: null, error: null });
    supabase.insert.mockResolvedValue({ error: { code: "23505" } });
    getSupabaseAdmin.mockReturnValue(supabase);
    const { mintToken } = await import("@/lib/tokens");

    await expect(mintToken("sess_123")).rejects.toThrow(
      "Duplicate token detected, but the existing token record could not be loaded"
    );
  });

  it("throws when token minting fails for another reason", async () => {
    const supabase = createSupabaseMock();
    supabase.maybeSingle.mockResolvedValue({ data: null, error: null });
    supabase.insert.mockResolvedValue({ error: { code: "500", message: "insert failed" } });
    getSupabaseAdmin.mockReturnValue(supabase);
    const { mintToken } = await import("@/lib/tokens");

    await expect(mintToken("sess_123")).rejects.toThrow("Failed to mint token: insert failed");
  });

  it("returns false when token validation cannot find a record", async () => {
    const supabase = createSupabaseMock();
    supabase.single.mockResolvedValue({ data: null, error: { message: "missing" } });
    getSupabaseAdmin.mockReturnValue(supabase);
    const { validateAndConsumeToken } = await import("@/lib/tokens");

    await expect(validateAndConsumeToken("abc")).resolves.toBe(false);
  });

  it("returns false when a token is exhausted or expired", async () => {
    const supabase = createSupabaseMock();
    getSupabaseAdmin.mockReturnValue(supabase);
    const { validateAndConsumeToken } = await import("@/lib/tokens");

    supabase.single.mockResolvedValueOnce({
      data: { id: "1", uses_remaining: 0, expires_at: "2099-01-01T00:00:00.000Z" },
      error: null,
    });
    await expect(validateAndConsumeToken("abc")).resolves.toBe(false);

    supabase.single.mockResolvedValueOnce({
      data: { id: "1", uses_remaining: 1, expires_at: "2000-01-01T00:00:00.000Z" },
      error: null,
    });
    await expect(validateAndConsumeToken("abc")).resolves.toBe(false);
  });

  it("updates the remaining uses for a valid token", async () => {
    const supabase = createSupabaseMock();
    supabase.single.mockResolvedValue({
      data: { id: "1", uses_remaining: 2, expires_at: "2099-01-01T00:00:00.000Z" },
      error: null,
    });
    supabase.updateEq.mockResolvedValue({ error: null });
    getSupabaseAdmin.mockReturnValue(supabase);
    const { validateAndConsumeToken } = await import("@/lib/tokens");

    await expect(validateAndConsumeToken("abc")).resolves.toBe(true);
    expect(supabase.update).toHaveBeenCalledWith({ uses_remaining: 1 });
  });

  it("returns false when consuming the token fails", async () => {
    const supabase = createSupabaseMock();
    supabase.single.mockResolvedValue({
      data: { id: "1", uses_remaining: 2, expires_at: "2099-01-01T00:00:00.000Z" },
      error: null,
    });
    supabase.updateEq.mockResolvedValue({ error: { message: "update failed" } });
    getSupabaseAdmin.mockReturnValue(supabase);
    const { validateAndConsumeToken } = await import("@/lib/tokens");

    await expect(validateAndConsumeToken("abc")).resolves.toBe(false);
  });
});
