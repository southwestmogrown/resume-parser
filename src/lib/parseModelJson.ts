export function stripJsonCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
}

export function parseModelJson<T>(text: string): T {
  return JSON.parse(stripJsonCodeFences(text)) as T;
}
