import {
  DEMO_COVER_LETTER,
  DEMO_JOB_DESCRIPTION,
  DEMO_MATCH_RESULT,
  DEMO_RESUME_DATA,
  DEMO_REWRITE_SUGGESTIONS,
  DEMO_STUDY_ITEMS,
} from "@/lib/demoData";

describe("demo data fixtures", () => {
  it("exports complete demo payloads", () => {
    expect(DEMO_RESUME_DATA.name).toBeTruthy();
    expect(DEMO_MATCH_RESULT.score).toBeGreaterThan(0);
    expect(DEMO_REWRITE_SUGGESTIONS[0]?.rewrittenBullet).toBeTruthy();
    expect(DEMO_STUDY_ITEMS[0]?.resource).toBeTruthy();
    expect(DEMO_COVER_LETTER).toContain("Dear Hiring Team");
    expect(DEMO_JOB_DESCRIPTION).toContain("Requirements:");
  });
});
