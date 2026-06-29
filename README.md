# Course Admin Desk — Validation Mockup

A clickable, frontend-only prototype that demonstrates **one** thing: messy
reconciliation inputs go in, a clean anomaly-flagged report comes out, and
students self-serve their results through a private lookup instead of texting
the lecturer.

This is a **validation demo, not a product**. No backend, no database, no auth,
no payments, no real file processing. All data is hardcoded in `src/data.js`.
The whole thing is walkable by a non-technical person in under 2 minutes.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL. Build with `npm run build`.

## Stack

- Vite + React, single-page app (three tabbed views, no router needed).
- Tailwind CSS. Plain and fast — this is a tool, not a marketing site. Mobile
  friendly (the student lookup is meant to be opened on a phone).
- All demo data lives in `src/data.js` as plain text. No fetch, no
  localStorage, no server.

## The three screens

1. **Reconcile** — two side-by-side panes, pre-filled with the sign-in register
   (from the class rep) and the marked scores (from the lecturer). One
   `Reconcile` button. Inputs are editable so a live demo can tweak them.
2. **Report** (the hero) — a summary bar plus a clean Matched list and three
   color-coded anomaly buckets: **Missing Script**, **Unregistered Paper**, and
   **ID Typo Candidate**. The typo candidate has a `Resolve → merge` button that
   moves the pair into Matched and updates counts live.
3. **Student Lookup** — one matric input. A matched student sees `Score: X / 20`;
   a flagged student gets a "Proceed to Room 104" message; an unknown matric
   gets "No record found." Students only ever see their own result.

## What the seed data is engineered to produce

Scores are out of 20.

- **10 clean matches.**
- **Missing Script:** `CSC/20/0470` Okeke Ucheoma — signed, no marked paper.
- **Unregistered Paper:** `CSC/20/0475` Adebayo Kunle — marked, never signed.
- **ID Typo Candidate:** register `CSC/20/04A8` vs marked `CSC/20/0468`, both
  named "Lawal Bisi" — a handwritten "A" misread for "6". Resolving merges them
  and reveals score 10.
- `Adeyemi Tunde` (0412) and `Adeyemi Tunji` (0447) are intentionally similar
  names, but they match correctly by matric — proving the tool doesn't get
  fooled by lookalikes.

## Reconciliation logic (see `src/reconcile.js`)

1. Exact matric match on both lists → Matched.
2. In register only → Missing Script.
3. In marked only → Unregistered Paper.
4. Scan the leftover Missing-Script and Unregistered-Paper items for typo
   candidates: matrics that differ by exactly one character **and** have a
   matching name. Pull those into the ID Typo Candidate bucket.
5. `Resolve` merges the pair into Matched and updates all counts.

No fuzzy-matching library — a one-character-difference check plus name equality
is enough for the demo.

## Out of scope (intentionally not built)

No OCR / photo scanning, no real auth or accounts, no payments or billing, no
backend / API / database, no required CSV upload (textarea paste is the input).
