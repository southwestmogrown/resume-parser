export function stripJsonCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
}

function findParseableJsonObject(text: string): string | null {
  const trimmed = text.trim();

  for (let start = 0; start < trimmed.length; start++) {
    if (trimmed[start] !== "{") continue;

    let depth = 0;
    let inString = false;
    let escaping = false;

    for (let i = start; i < trimmed.length; i++) {
      const ch = trimmed[i];

      if (escaping) {
        escaping = false;
        continue;
      }

      if (ch === "\\") {
        escaping = true;
        continue;
      }

      if (ch === "\"") {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === "{") depth++;
      if (ch === "}") depth--;

      if (depth === 0) {
        const candidate = trimmed.slice(start, i + 1).trim();
        try {
          JSON.parse(candidate);
          return candidate;
        } catch {
          break;
        }
      }
    }
  }

  return null;
}

export function parseModelJson<T>(text: string): T {
  const stripped = stripJsonCodeFences(text);
  try {
    return JSON.parse(stripped) as T;
  } catch {
    const extracted = findParseableJsonObject(stripped);
    if (!extracted) {
      throw new SyntaxError("Unable to parse JSON from model response");
    }
    return JSON.parse(extracted) as T;
  }
}
