# Pick My Secret Santa — Cold-User QA Report

Run: Sun Oct 25, 2026 (evening, PT) · Build: staged at `~/workspace/builds/pick-my-secret-santa/site/`
Method: node logic tests + real-Chromium (Playwright) flow walk at desktop 1280px and mobile 390px, production origin simulated in-memory. Screenshots in this folder (`qa/`).

## Results at a glance

- **Core logic tests: 226 passed, 0 failed** (`qa/core-tests.mjs`)
- **Browser flow tests: 34 passed, 0 failed** (`qa/flow-test.cjs`)
- Bugs found by QA and fixed during the pass: **2** (both below)
- Template v2: homepage rendered view **101 words, FK 2.57** — PASS (limits: ≤300 words, FK ≤3)

## Flow walk (what a cold user does)

Organizer: Start → group name + budget chips → names with optional gift hints → optional keep-apart pairs → draw → one share card per person (Copy link / Copy message / system Share where available). Verified end-to-end in the browser: all five tokens decoded and checked — givers and receivers are the same five names, nobody drew themself, the kept-apart pair was honored both ways, budget label correct in every link, 3 gift picks per match, links under 300 characters.

Recipient: opens a private link fresh → cover screen names them and hides the match → "Peek at my match" → their person, the budget, and a gift card (category, why, what to look for) → "See another pick" cycles the other baked picks → "Save this card" downloads a real 1080×1080 PNG. Verified: revealed match and gifts match the token exactly.

## Input-handler audit

- Fewer than 3 names: blocked with "Add at least three names." (tested)
- Impossible keep-apart set: stays on step 3 with "That draw cannot work. Loosen one keep-apart pair." (tested)
- Tampered / garbage link: friendly error view, no crash (tested)
- Duplicate names: share screen shows "Two people share a name. Check each link twice." (tested)
- Unicode names (Zoë, 小明， Renée): survive the link roundtrip exactly (tested)
- All user strings render via textContent — no innerHTML path for names or group text
- 400 random groups (3–30 people, random exclusions): every returned draw was a valid derangement; 395/400 drew, 5 were genuinely impossible constraint sets (correctly null)

## Bugs QA caught and fixed

1. **An untouched keep-apart row silently became a rule.** Step 3 auto-created one pair row (first two people), and with 3 people that default pair can make the draw mathematically impossible — the organizer gets a confusing error for a rule they never chose. Fix: step 3 now starts with zero pair rows; pairs exist only when the organizer adds them. Re-tested green.
2. **Private links were ~700 characters** (full gift text baked in) — a wall of base64 on the share screen, the site's primary surface. Fix: links now carry only gift-pick IDs (~230 chars total); the reveal page resolves them against the same bank it already ships. Side benefit: a decoded link no longer reveals gift text at a glance — more private, not less.
3. Small hardening in the same pass: a link pasted into an already-open tab (hash change, no reload) now reboots into the reveal view; malformed payloads (valid encoding, wrong shape) fall into the friendly error view instead of throwing.

## Mobile / iOS checks

- No horizontal overflow at 390px on home or reveal (scrollWidth probe, animations running)
- Hero CTA tap height ≥44px measured; step buttons full-width on mobile
- No hover-dependent or gesture-dependent interactions anywhere — the flow is taps and typing only, so the touch-action failure class from the Oct 13 lesson does not apply; focus moves to each step heading for screen readers

## Copy measures (fleet scorer, raw-file method, same as fleet baselines)

| Page | Words | FK grade | Limit | Verdict |
|---|---|---|---|---|
| index (rendered initial view) | 101 | 2.57 | ≤300 / ≤3 | PASS |
| index (all static text incl. hidden steps) | 210 | 2.86 | — | — |
| privacy | 197 | 3.49 | legal exempt (fleet PP privacy: 3.57) | in family |
| terms | 275 | 2.88 | legal exempt | in family |
| 404 | 26 | 0.95 | — | — |

Hero: headline "Secret Santa, drawn in secret." (4 words ≤6) · subline "A private draw no chatbot can keep. Gifts picked too." (10 words ≤12, carries the wedge) · exactly 1 CTA. Footer: "Built with Muse." · Contact: hello@pickmysecretsanta.com (staged — routing enables at launch).

## Bank / path enumeration

- Gift bank: verbatim copy of The Present Picker's live 111-idea bank (`present-picker/mcp-server/bank.json` → `site/bank.js`), fields trimmed to what this tool uses; provenance header in the file. No content fork — if the PP bank changes, re-copy and re-run the tests.
- All 48 budget×interest cells (4 bands × 11 interests + none) return ≥1 pick; the #1 pick is always in-band; when the interest has a match in-band, #1 uses it.
- **Thin cells (inherited from the PP bank, same as PP's own documented backlog):** 21 cells have fewer than 3 interest matches in-band; 3 have zero (Under-band interest matches of 1 in u25 travel/cozy/science/music/gardening; zero in $50–$100 music, $100+ games, $100+ gardening). Behavior in those cells: budget stays the hard filter, the interest simply doesn't boost. Recorded here, not silently patched — bank changes are a quiz/bank gate (demand-sim + Billy's tap on the PP side).

## Visual standard self-grade (6 items)

1. Photo-forward hero — **partial, honest miss**: the hero is illustration-led (custom gift-box mascot, warm paper/pine/berry palette), not photo-led. Rationale: the fleet's other tool sites (ThawDay calculator, FMB) also lead with illustration/marks; a stock-photo hero on a utility draw tool reads generic. Flagged for Billy's eye in the packet rather than silently passed.
2. Distinct color atmosphere — PASS (paper #fdf9f0 / pine #17603c / berry #c1272d / gold #d9a441, unlike any other fleet site)
3. Image-led cards/sections — PASS (icon steps, mascot marks, gift cards)
4. One memorable visual mark — PASS (gift box wearing a Santa hat; reused in header, hero, reveal, favicon, 404)
5. Shareable visual artifact with the site's own data — PASS ("Save this card" 1080×1080 PNG with group, match, budget, gift pick)
6. og/social card — PASS (`og-image.png` rendered from `og-card.html`, 1200×630, verified visually)

## Billy-sim — likeliest questions, answered

1. *"Can the organizer cheat and peek?"* — They see names and links only, never matches; the reveal needs the person's own link. The privacy page says the honest version: links are "hidden from plain sight, not locked" — anyone holding a link can open it. No overclaiming.
2. *"What if two people have the same name?"* — Works; the share screen warns the organizer to check each link twice.
3. *"Why no accounts / email invites?"* — Deliberate: zero data held is the wedge. Email invites would need a server and kill the privacy claim. The carrier is the organizer's own messages — that's the distribution door this site was designed around.
4. *"Does it work for an office of 30?"* — Yes, capped at 30 rows; draws verified to 30.
5. *"What does it cost to run?"* — $0 beyond the domain: static files, no server, no database.
6. *"Where's the photo hero?"* — See visual grade item 1: illustration-led by design choice, flagged openly.
