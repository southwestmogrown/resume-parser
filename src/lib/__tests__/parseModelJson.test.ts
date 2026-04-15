import { parseModelJson } from "@/lib/parseModelJson";

describe("parseModelJson", () => {
  it("parses plain JSON", () => {
    expect(parseModelJson<{ ok: boolean }>('{"ok":true}')).toEqual({ ok: true });
  });

  it("parses fenced JSON", () => {
    expect(parseModelJson<{ ok: boolean }>('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });

  it("parses JSON when prose precedes fenced completion output", () => {
    const message = [
      "You're done on this one.",
      "",
      "```json",
      '{"question_complete":true,"answer":{"questionId":"q1"}}',
      "```",
    ].join("\n");

    expect(
      parseModelJson<{ question_complete: boolean; answer: { questionId: string } }>(message)
    ).toEqual({
      question_complete: true,
      answer: { questionId: "q1" },
    });
  });

  it("throws when no parseable JSON exists", () => {
    expect(() => parseModelJson("not json")).toThrow("Unable to parse JSON");
  });
});
