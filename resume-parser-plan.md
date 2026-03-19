# ai-resume-parser — GitHub Issues

## Milestones

| Milestone | Due |
|---|---|
| M1 — Foundation | End of Day 1 |
| M2 — UI & Analysis | End of Day 2 |
| M3 — Polish & Ship | End of Day 3 |

---

## M1 — Foundation

### #1 — Scaffold Next.js project and repo structure
**Labels:** `setup`
**Milestone:** M1 — Foundation

Bootstrap the app, configure Tailwind with dark theme colors, install dependencies, establish folder structure. Connect to Railway and Vercel on first push.

**Acceptance criteria**
- Repo exists on GitHub, public, with description set
- App runs locally on `localhost:3000` with no errors
- Railway project connected for future API route deployment
- Vercel connected for frontend deployment
- `.env.local` and `.env.example` in place

**Commits**
```
chore: initialize Next.js app with TypeScript and Tailwind
chore: establish folder structure and install dependencies
chore: configure Tailwind dark theme with brand colors
```

---

### #2 — Define TypeScript types
**Labels:** `types`
**Milestone:** M1 — Foundation

Create `lib/types.ts` with all shared interfaces covering the resume extraction output, match score output, and API request/response shapes.

**Acceptance criteria**
- All interfaces exported from `lib/types.ts`
- Covers ResumeData, MatchResult, AnalysisRequest, AnalysisResponse
- No TypeScript errors

**Commits**
```
feat: define TypeScript interfaces in lib/types.ts
```

---

### #3 — Build PDF extraction utility
**Labels:** `util`
**Milestone:** M1 — Foundation

Implement `lib/extractPdfText.ts`. Accepts a File object from the browser upload, reads it as an ArrayBuffer, converts to base64 for passing to the Anthropic API. Claude handles PDF parsing natively — no PDF library needed.

**Acceptance criteria**
- Function accepts a File and returns a base64 string
- Works with standard single and multi-page PDF resumes
- Handles file read errors gracefully

**Commits**
```
feat: add PDF to base64 utility for Anthropic document input
```

---

### #4 — Build /api/analyze route
**Labels:** `api`
**Milestone:** M1 — Foundation

Create `app/api/analyze/route.ts`. POST handler accepts base64 resume PDF and job description text. Makes two sequential Claude calls — extraction then scoring. Returns structured JSON. Validates API key header.

**Acceptance criteria**
- `POST /api/analyze` with valid payload returns AnalysisResponse JSON
- Returns 401 if API key header is missing or invalid
- Returns 400 if resume or jobDescription fields are missing
- Verified with curl before moving to UI

**Commits**
```
feat: add /api/analyze route with two-phase Claude pipeline
feat: add API key gate to /api/analyze route
```

---

## M2 — UI & Analysis

### #5 — Build ResumeUpload component
**Labels:** `component`
**Milestone:** M2 — UI & Analysis

Left panel input. Drag-and-drop zone that accepts PDF files only. Shows filename and page count after upload. Clear button to reset. Calls parent onChange with the File object.

**Acceptance criteria**
- Accepts PDF via click or drag-and-drop
- Rejects non-PDF files with an inline error message
- Shows uploaded filename after selection
- Clear button resets to empty state
- onChange fires with File object

**Commits**
```
feat: add ResumeUpload component with drag-and-drop
```

---

### #6 — Build JobDescription component
**Labels:** `component`
**Milestone:** M2 — UI & Analysis

Right panel input. Textarea for pasting job description text. Character count display. Clear button. Calls parent onChange with the string value.

**Acceptance criteria**
- Textarea expands to fill available height
- Character count updates as user types
- Clear button resets to empty
- onChange fires with current string value

**Commits**
```
feat: add JobDescription textarea component with character count
```

---

### #7 — Build ResumeProfile component
**Labels:** `component`
**Milestone:** M2 — UI & Analysis

Displays structured extraction output. Shows candidate name, summary, skills as pills, experience timeline, and education. Renders a skeleton loading state while extraction is in progress.

**Acceptance criteria**
- Renders all ResumeData fields correctly
- Skills render as individual pills
- Loading skeleton matches component dimensions
- Empty/null state renders nothing

**Commits**
```
feat: add ResumeProfile component with loading skeleton
```

---

### #8 — Build MatchScore component
**Labels:** `component`
**Milestone:** M2 — UI & Analysis

Displays match score output. Large percentage score with color coding (green ≥80%, amber 60–80%, red <60%). Matched skills list, missing skills list, and a short recommendation paragraph. Renders a skeleton while scoring is in progress.

**Acceptance criteria**
- Score renders with correct color threshold logic
- Matched and missing skills render as separate lists
- Recommendation paragraph renders below
- Loading skeleton shown while awaiting score phase

**Commits**
```
feat: add MatchScore component with color-coded score display
```

---

### #9 — Assemble page and wire analysis pipeline
**Labels:** `integration`
**Milestone:** M2 — UI & Analysis

Compose all components in `app/page.tsx`. Wire up the two-phase analysis: convert PDF to base64, POST to /api/analyze, stream extraction result first then score. Manage loading states for each phase independently so ResumeProfile populates before MatchScore.

**Acceptance criteria**
- Full page renders with both input panels and output panels
- Analyze button disabled until both resume and JD are provided
- ResumeProfile populates as soon as extraction phase completes
- MatchScore populates after scoring phase completes
- Error state displays if API call fails
- API key sent as request header from env var

**Commits**
```
feat: assemble analysis page with two-phase pipeline
```

---

## M3 — Polish & Ship

### #10 — Add API key gate UI
**Labels:** `feature`
**Milestone:** M3 — Polish & Ship

Simple passphrase gate on the frontend. On first visit, show a modal asking for the access key. Store in sessionStorage. All API calls include it as a header. Wrong key returns 401 and prompts re-entry.

**Acceptance criteria**
- Gate modal appears on first visit
- Correct key dismisses modal and persists for the session
- Wrong key shows an error message
- API route validates key against ACCESS_KEY env var

**Commits**
```
feat: add session-based access key gate
```

---

### #11 — Polish pass
**Labels:** `polish`
**Milestone:** M3 — Polish & Ship

Loading states, error boundaries, empty states, page title, meta description, favicon. Analyze button shows spinner during processing. Results panel hidden until first analysis completes.

**Acceptance criteria**
- No layout shift during loading states
- Error message visible if API call fails
- Page title reads "Resume Parser — Shane Wilkey"
- Favicon set

**Commits**
```
fix: add loading states and error handling throughout
chore: set page title, favicon, and meta description
```

---

### #12 — Write README and deploy to production
**Labels:** `docs`
**Milestone:** M3 — Polish & Ship

README covers what it is, how it works technically, local setup instructions, env var documentation, and access key instructions for demo visitors.

**Acceptance criteria**
- README renders cleanly on GitHub
- Production URL live on Vercel
- ACCESS_KEY env var set in Vercel
- ANTHROPIC_API_KEY set in Vercel
- Demo walkthrough recorded (Loom, 90 seconds)

**Commits**
```
docs: add README with setup and access key instructions
chore: configure production environment variables
```