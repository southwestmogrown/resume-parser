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

    let depth = 1;
    let inString = false;
    let escaping = false;

    for (let i = start + 1; i < trimmed.length; i++) {
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

      if (depth < 0) {
        break;
      }

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
  } catch (initialError) {
    const extracted = findParseableJsonObject(stripped);
    if (!extracted) {
      const reason = initialError instanceof Error ? initialError.message : "unknown parse error";
      throw new SyntaxError(`Unable to parse JSON from model response: ${reason}`);
    }
    return JSON.parse(extracted) as T;
  }
}
