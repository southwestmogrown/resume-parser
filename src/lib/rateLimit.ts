type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

// Best-effort protection for single-instance/serverful deployments.
// For horizontally scaled or serverless production environments, replace this
// with a shared store such as Redis.

export function clearRateLimitStore() {
  rateLimitStore.clear();
}

function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const [first] = forwarded.split(",");
    if (first?.trim()) return first.trim();
  }

  return headers.get("x-real-ip") ?? "unknown";
}

export function isRateLimited(
  headers: Headers,
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const clientKey = `${key}:${getClientIp(headers)}`;
  const existing = rateLimitStore.get(clientKey);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(clientKey, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (existing.count >= limit) {
    return true;
  }

  existing.count += 1;
  rateLimitStore.set(clientKey, existing);
  return false;
}
