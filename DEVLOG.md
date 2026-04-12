# DEVLOG

## 2026-04-12 — UI/UX Overhaul + Payment Flow Issues

### Changes Made

**1. JobDescription Textarea Overflow Fix** (`src/components/JobDescription.tsx`)
- Changed `resize-none` → `resize-y`
- Added `max-h-[400px]` and `overflow-y-auto`
- Textarea now scrolls instead of overflowing page

**2. State Persistence + Pipeline Resume** (`src/app/page.tsx`)
- `handlePay()` saves `jobDescription`, `resumeData`, `githubProfile`, `inputMode` to sessionStorage before Stripe redirect
- Stripe redirect handler restores state from sessionStorage after token is obtained
- Added `runPaidPhasesRef()` function to run paid phases (2-4) without re-extracting PDF
- Added `useEffect` to auto-trigger paid phases when token becomes available after redirect
- Added refs (`jobDescriptionRef`, `resumeDataRef`, `githubProfileRef`, `inputModeRef`) to avoid stale closure issues
- Refs are kept in sync via `useEffect` calls

**3. PayGate Positioning** (`src/app/page.tsx`)
- PayGate now renders in results section position (`mt-10`) instead of inline
- PayGate and results are mutually exclusive (ternary instead of &&)
- Analyze button hidden when PayGate is showing

**4. UX Polish** (`src/app/page.tsx`)
- Added step indicator: Upload → Describe → Analyze → Results
- Added `getAnalyzeButtonText()` for phase-specific loading text
- Spinner shows for any loading phase

### Known Issues

**Post-Payment Redirect: State Not Restoring**

After Stripe payment completes and redirects back, the sessionStorage state is not being properly restored. Symptoms:
- Page appears empty or partially empty after redirect
- PayGate shows but resume extraction result is gone
- No errors in console

**Debugging attempted:**
- Token IS being minted successfully (Supabase shows rows)
- Redeem-token API returns 200 with valid token
- sessionStorage IS being saved before redirect (verified via code review)
- Debug logging shows token received but state restoration may not be working

**Likely root cause:** React closure or timing issue with state restoration. The `setState` calls in the redirect handler may not be completing before `window.history.replaceState()` clears the URL, or there may be a React batching/timing issue.

**To investigate:**
1. Add `console.log` after each `setX()` call in the redirect handler to verify state is being set
2. Consider using `window.location.reload()` after state is confirmed set, rather than `replaceState`
3. Check if the page is crashing during render after state restoration (React Error Boundary)
4. Verify sessionStorage values in browser DevTools during the redirect flow

### Files Modified
- `src/components/JobDescription.tsx` - textarea overflow fix
- `src/app/page.tsx` - state persistence, pipeline resume, PayGate positioning, UX polish
- `src/app/api/webhook/route.ts` - added debug logging (now removed)
