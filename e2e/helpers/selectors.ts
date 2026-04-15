/**
 * Central selector map for Playwright E2E tests.
 *
 * Priority: semantic / ARIA selectors first.
 * data-testid only where no semantic selector exists.
 * CSS class fallbacks are commented with reason.
 */

export const SEL = {
  // ── Navigation ────────────────────────────────────────────────────
  brandLink: '[aria-label="PassStack home"]',

  // ── Upload ────────────────────────────────────────────────────────
  fileInput: 'input[type="file"]',
  dropzone: '[data-testid="upload-dropzone"]',

  // ── Analyze ───────────────────────────────────────────────────────
  analyzeButton: '[data-testid="analyze-button"]',
  newAnalysisButton: '[data-testid="new-analysis-button"]',

  // ── Workspace layout ──────────────────────────────────────────────
  workspaceSidebar: '[data-testid="workspace-sidebar"]',
  resultPanel: '[data-testid="result-panel"]',

  // ── Score ──────────────────────────────────────────────────────────
  scoreRing: '[role="img"][aria-label*="Match score"]',

  // ── Tabs ──────────────────────────────────────────────────────────
  tabBar: '[role="tablist"]',
  lockedIcon: '[aria-label="locked"]',

  // ── PayGate ───────────────────────────────────────────────────────
  unlockButton: '[data-testid="unlock-button"]',

  // ── Modals ────────────────────────────────────────────────────────
  checkoutDialog: '[role="dialog"][aria-label="Checkout"]',
  phase0Dialog: '[role="dialog"][aria-label="Enhance your resume"]',
  closeCheckout: 'button[aria-label="Close checkout"]',
  // CSS class — no role/aria attribute on the reset confirm modal
  resetConfirmModal: '.reset-confirm-modal',

  // ── Chat (Phase 0 + STAR) ─────────────────────────────────────────
  chatLog: '[role="log"]',
  typingIndicator: '[role="status"][aria-label="Typing"]',
  errorAlert: '[role="alert"]',

  // ── STAR Prep ─────────────────────────────────────────────────────
  // CSS class fallback — no ARIA role on question cards; class is stable
  starQuestionCard: '.star-q-card',
  starActiveCard: '.star-q-card--active',
  starDoneCard: '.star-q-card--done',

  // ── Batch ─────────────────────────────────────────────────────────
  batchRow: '[data-testid="batch-row"]',
  // CSS class — only class distinguishes selected row
  batchRowSelected: '.batch-row--selected',

  // ── Checkout ──────────────────────────────────────────────────────
  checkoutSubmit: '[data-testid="checkout-submit"]',

  // ── Optimized Resume ──────────────────────────────────────────────
  generateResumeButton: '[data-testid="generate-resume-button"]',

  // ── Tour (demo only) ──────────────────────────────────────────────
  // CSS class — tour overlay has no ARIA role
  tourOverlay: '.tour-overlay',
  tourTooltip: '.tour-tooltip',
} as const;
