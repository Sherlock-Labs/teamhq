# Shipped Product Improvements — Fast-Track Scope

Scoped by Thomas (PM). These follow the lightweight iteration track (Operating Agreement #5): Thomas scopes → builder implements → Robert eyeballs → Enzo spot-checks.

---

## 1. QuoteVoice — PDF Export of Estimates

**What:** Add a "Download PDF" button to completed estimates. The contractor speaks their estimate, AI structures it, and now they can hand a professional-looking PDF to the customer on-site.

**Why:** Contractors need to share estimates with customers. Right now they can only view in-app. PDF export is table-stakes for a quoting tool. Highest impact-to-effort of all pitches.

**Acceptance Criteria:**
- [ ] "Download PDF" button visible on completed estimate screen
- [ ] PDF includes: contractor name/logo (if set), customer name, line items with quantities and prices, subtotal/tax/total, date, estimate number
- [ ] PDF renders cleanly on A4/Letter paper
- [ ] Works on iOS and Android (triggers native share sheet or downloads)
- [ ] Handles estimates with 1-50+ line items without layout breaking

**Owner:** Jonah (backend PDF generation) + Zara (mobile button/share). Robert specs the PDF layout first (30 min).

---

## 2. VoiceNote Pro — RevenueCat Receipt Validation Retry

**What:** Add exponential backoff retry logic when RevenueCat receipt validation fails. Currently a failed validation means the user's purchase isn't recognized until they restart the app.

**Why:** This is a reliability fix, not a feature. Users who pay and don't get access will churn immediately. RevenueCat's API has transient failures. No retry = lost revenue.

**Acceptance Criteria:**
- [ ] Failed receipt validation retries with exponential backoff (1s, 2s, 4s, max 3 retries)
- [ ] User sees a non-blocking "Verifying purchase..." indicator during retries
- [ ] After max retries, show clear error with "Try Again" button
- [ ] Successful retry grants access immediately without app restart
- [ ] Retries do not duplicate purchases or trigger duplicate webhooks

**Owner:** Jonah (backend retry logic) or Zara (if client-side validation). Andrei scopes the retry architecture (backoff strategy, failure detection points).

---

## 3. OST Tool — Print Stylesheet

**What:** Add a print-optimized CSS stylesheet so Opportunity Solution Trees can be printed or saved as PDF from the browser.

**Why:** Product managers present OSTs in meetings. Currently printing produces garbled output. A clean print stylesheet is 30 minutes of CSS work with high user satisfaction impact.

**Acceptance Criteria:**
- [ ] Cmd+P / Ctrl+P produces a clean, readable tree layout
- [ ] Tree nodes display with readable font sizes and proper spacing
- [ ] Navigation, toolbar, and interactive elements are hidden in print
- [ ] Works in Chrome, Safari, Firefox
- [ ] Landscape orientation auto-suggested for wide trees

**Owner:** Alice (CSS only — single file change). No architecture or design spec needed.
