# Issues — BYOK + Demo Mode

Branch: `feat/byok-demo-mode`

These four issues can be worked in parallel by separate agents. Issues 1 and 2 are independent of 3 and 4, but Issue 4 depends on Issue 3 being done first.

---

## Issue 1 — BYOK: API Route Auth Refactor

**Files:** `src/app/api/extract/route.ts`, `src/app/api/score/route.ts`

**Context:**
Both routes currently validate against a shared `ACCESS_KEY` env var. Under BYOK, users supply their own Anthropic API key. The routes should accept it via header and pass it directly to the Anthropic client — no shared secret needed.

**Tasks:**
- Remove the `ACCESS_KEY` / `process.env.ACCESS_KEY` check from both routes.
- Read the user's key from the `x-api-key` request header.
- If the header is missing or empty, return `401 { error: "Anthropic API key required" }`.
- Instantiate the Anthropic client per-request: `new Anthropic({ apiKey })` instead of the module-level `const client = new Anthropic()`.
- Wrap the Anthropic `client.messages.create` call in a try/catch that distinguishes auth errors: if the Anthropic SDK throws with a 401/403 status, return `401 { error: "Invalid Anthropic API key" }` to the caller. All other Anthropic errors continue to return 500.
- Remove `ACCESS_KEY` from `.env.example` and add `# ACCESS_KEY removed — users supply their own Anthropic key via BYOK` as a comment.
- Do not touch any other logic in the routes.

**Acceptance criteria:**
- A request with a missing `x-api-key` header returns 401.
- A request with a valid Anthropic key but missing body fields (e.g. empty resume) returns 400 as before.
- A request with an invalid Anthropic key returns 401 with a clear error message.
- The `ACCESS_KEY` env var is no longer referenced anywhere in route code.

---

## Issue 2 — BYOK: Gate Modal Redesign

**Files:** `src/components/AccessKeyGate.tsx`

**Context:**
The current gate validates a shared passphrase via a probe request to `/api/extract`. Under BYOK, the user pastes their own Anthropic API key. There's no shared secret to validate against, so we drop the probe entirely and do client-side format validation only. The first real API call will surface a bad key with a clear error. The modal also needs trust messaging explaining we never touch the key.

**Tasks:**
- Change the modal heading from "Access Required" to "Your Anthropic API Key".
- Change the subtitle to:
  > Paste your Anthropic API key to use Resume Parser. Your key is stored only in your browser session and is sent directly to Anthropic — we never log, store, or see it.
- Change the input placeholder from "Access key" to `sk-ant-...`.
- Change the input `type` from `"password"` to `"text"` so the user can see what they pasted. Add a show/hide toggle button if you like, but it is not required.
- Remove the probe fetch to `/api/extract`. Instead, on submit, validate the input client-side:
  - Trim whitespace.
  - If it does not start with `sk-ant-`, set error: `"That doesn't look like an Anthropic API key. It should start with sk-ant-"`.
  - If it passes, store in sessionStorage under the key `resume-parser-api-key` (rename from `resume-parser-access-key`) and call `onKey(trimmed)`.
- Below the submit button, add a small line of text:
  > View the source on GitHub to verify.
  Link the text "View the source on GitHub" to the repo URL — use a placeholder `https://github.com/YOUR_USERNAME/resume-parser` that can be updated at deploy time via a `NEXT_PUBLIC_GITHUB_URL` env var (fall back to `#` if unset). Read the env var with `process.env.NEXT_PUBLIC_GITHUB_URL`.
- The `loading` state and `setLoading` can be removed since there is no async probe anymore. The `useCallback` around `handleSubmit` can remain but the function becomes synchronous.
- The "Try Demo" button is added in Issue 4 — leave a `{onDemo && <button ...>}` slot or just a comment `{/* Try Demo button — added in Issue 4 */}` so Issue 4 can add it without a merge conflict. Add `onDemo?: () => void` to the `AccessKeyGateProps` interface.
- Update `.env.example` to document `NEXT_PUBLIC_GITHUB_URL=`.

**Acceptance criteria:**
- Entering a string that does not start with `sk-ant-` shows the format error without any network call.
- Entering a valid-looking key stores it and unlocks the gate.
- The trust messaging and source link are visible below the form.
- The `loading` spinner is gone (no async step).

---

## Issue 3 — Demo Data Fixture

**Files:** `src/lib/demoData.ts` (new file)

**Context:**
The demo mode needs realistic canned data that looks like a real analysis result — a complete `ResumeData` and a `MatchResult` — plus a sample job description string to pre-fill the textarea. This issue creates that fixture. No UI changes.

**Tasks:**
- Create `src/lib/demoData.ts` exporting three named constants:

```ts
export const DEMO_RESUME_DATA: ResumeData = { ... }
export const DEMO_MATCH_RESULT: MatchResult = { ... }
export const DEMO_JOB_DESCRIPTION: string = `...`
```

- Make the data realistic and polished. Use this persona:

  **Candidate:** Jordan Rivera, a mid-level full-stack engineer with 4 years of experience.
  - Skills: TypeScript, React, Next.js, Node.js, PostgreSQL, Docker, REST APIs, GraphQL, Git, Tailwind CSS
  - Experience: 2 years at a SaaS startup as Software Engineer; 2 years at a digital agency as Frontend Developer
  - Education: BS Computer Science, State University, 2020
  - Summary: "Full-stack engineer specializing in React and Node.js applications, with a track record of shipping customer-facing features in fast-paced startup environments."

  **Job description:** A senior full-stack role at a B2B SaaS company. Requirements include TypeScript, React, Node.js, PostgreSQL, AWS (a gap for Jordan), REST API design, CI/CD pipelines (a partial gap), and 5+ years experience (a gap). Nice-to-haves: GraphQL, Docker, Tailwind.

  **Match result:** Score: 72. Matched: TypeScript, React, Next.js, Node.js, PostgreSQL, REST APIs, GraphQL, Docker, Tailwind CSS. Missing: AWS, CI/CD pipelines, 5+ years experience. Recommendation: 2–3 sentences noting strong technical alignment but gaps in cloud infrastructure and seniority.

- The job description string should be 150–250 words, formatted as a realistic posting (company intro, responsibilities, requirements, nice-to-haves).
- Import `ResumeData` and `MatchResult` from `@/lib/types` for type safety.

**Acceptance criteria:**
- `DEMO_RESUME_DATA` satisfies the `ResumeData` interface (no TS errors).
- `DEMO_MATCH_RESULT` satisfies the `MatchResult` interface.
- `DEMO_JOB_DESCRIPTION` is a non-empty string.
- No runtime logic — just data.

---

## Issue 4 — Demo Mode: Page Wiring + UX

**Files:** `src/app/page.tsx`, `src/components/AccessKeyGate.tsx`, `src/components/JobDescription.tsx`

**Depends on:** Issue 3 (needs `DEMO_RESUME_DATA`, `DEMO_MATCH_RESULT`, `DEMO_JOB_DESCRIPTION`)

**Context:**
The demo flow lets a visitor explore the app without an Anthropic key. Clicking "Try Demo" on the gate modal bypasses auth, pre-fills the job description, simulates the two-phase loading sequence, and displays the canned results. A visible badge makes clear it is demo output.

**Tasks:**

### Gate modal (`AccessKeyGate.tsx`)
- Add `onDemo?: () => void` to `AccessKeyGateProps` (scaffolded in Issue 2).
- Add a "Try Demo" button below the submit button, visible only when `onDemo` is provided:
  ```
  [Enter]
  ──── or ────
  [Try Demo  →  no API key needed]
  ```
  Style it as a ghost/outline button (border, transparent background) to visually de-emphasize it relative to the primary Enter button.
- Clicking it calls `onDemo()` and does nothing else.

### Page (`page.tsx`)
- Add `isDemoMode` boolean state, initialized to `false`.
- Add a `handleDemo` callback:
  1. Set `isDemoMode(true)`.
  2. Pre-set `jobDescription` to `DEMO_JOB_DESCRIPTION`.
  3. Simulate phase 1 loading: set `loadingExtraction(true)`, wait 1200 ms, set `resumeData(DEMO_RESUME_DATA)`, set `loadingExtraction(false)`.
  4. Simulate phase 2 loading: set `loadingScore(true)`, wait 900 ms, set `matchResult(DEMO_MATCH_RESULT)`, set `loadingScore(false)`.
  5. Use `setTimeout`/`Promise` delay — no actual fetch.
- Pass `handleDemo` to `<AccessKeyGate onDemo={handleDemo}>`.
- When `isDemoMode` is true:
  - Disable the Analyze button and show tooltip text "Not available in demo mode" (use `title` attribute).
  - Show a demo mode notice banner above the output panels:
    ```
    Demo mode — showing pre-loaded sample results. Enter your Anthropic API key to analyze your own resume.
    ```
    Style it as a muted amber/yellow info strip (not an error). Include a small "Enter key" link/button that programmatically re-shows the gate (set `isDemoMode(false)` and reset the unlocked state — see note below).
- When the user clicks "Enter key" from the demo banner, the gate should reappear. The simplest approach: lift the `unlocked` state up to `page.tsx` and pass it as a prop to `AccessKeyGate`, or add a `locked` prop. Choose whichever requires the least change.

### JobDescription component (`JobDescription.tsx`)
- Accept an optional `value` prop (controlled mode) in addition to the existing `onChange` prop, so `page.tsx` can pre-fill it during demo. If `value` is provided, the component is controlled; otherwise it manages its own state as before.
  - Check how `JobDescription.tsx` currently works before deciding exact implementation.

**Acceptance criteria:**
- Clicking "Try Demo" on the gate bypasses auth, closes the gate, and starts the loading animation.
- After the simulated delay, `ResumeProfile` and `MatchScore` populate with demo data.
- The job description textarea is pre-filled with `DEMO_JOB_DESCRIPTION`.
- The "Demo mode" banner is visible above the results.
- The Analyze button is disabled in demo mode.
- Clicking "Enter key" in the banner re-shows the gate.
- BYOK flow (Issues 1 & 2) is unaffected when `isDemoMode` is false.
