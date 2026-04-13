export const MAX_RESUME_BASE64_CHARS = 15_000_000;
export const MAX_JOB_DESCRIPTION_CHARS = 25_000;
export const MAX_PROFILE_TEXT_CHARS = 12_000;
export const MAX_CONVERSATION_MESSAGES = 40;
export const MAX_MESSAGE_CHARS = 4_000;

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isStringWithinLimit(value: unknown, maxChars: number): value is string {
  return isNonEmptyString(value) && value.trim().length <= maxChars;
}
