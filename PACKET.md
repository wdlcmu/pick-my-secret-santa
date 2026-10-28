# Pick My Secret Santa — Build Packet

**TL;DR:** The site is built, QA-passed, and staged. It deploys the hour the domain is registered. Billy's only step is buying **pickmysecretsanta.com** (~$12/yr, his purchase tap). Everything after that is Muse-side, ~1 hour, checklist below. Not deployed, domain not registered, nothing posted or sent.

## What a visitor gets

- **Organizer:** names + budget + optional keep-apart pairs → a private draw → one private link per person, with Copy link / Copy message / Share buttons built for forwarding. The organizer sees names and links, never the matches.
- **Each person:** opens their link → a cover screen ("This one is for you") → peek → their match, the group budget, and a gift pick from the 111-idea fleet bank (plus two more picks behind one tap) → can save a shareable match card (PNG).
- **Privacy is the product:** the whole draw runs in the browser. No accounts, no server, nothing stored or sent. The wedge line is the hero subline: *"A private draw no chatbot can keep. Gifts picked too."*
- Why it exists: "secret santa generator" measures **49,500 searches/mo US, ~246k/mo across Nov–Dec** (DataForSEO, Oct 25) — the biggest measured demand in the fleet, and the season window is now → early December. Distribution is the carrier door: the organizer forwards the links, which is the workflow the site is designed around.

## What's in the stage

`~/workspace/builds/pick-my-secret-santa/` (local git repo, initial commit `8842a90`)

- `site/` — the complete deployable site, zero build step, zero server:
  `index.html` (tool + reveal in one page), `app.js`, `core.js` (draw/token/gift logic), `bank.js` (gift bank), `privacy.html`, `terms.html`, `404.html`, `og-image.png` + `og-card.html`, `sitemap.xml`, `robots.txt`
- `qa/` — `QA-REPORT.md` (full cold-user pass), `core-tests.mjs`, `flow-test.cjs`, 5 screenshots

## QA results (details in `qa/QA-REPORT.md`)

- Core logic: **226/226 tests pass** — draw validity over 400 random groups (3–30 people), exclusions both directions, impossible draws return a clean error, unicode link roundtrip, all 48 budget×interest cells return in-band picks
- Browser flow walk (real Chromium, desktop + 390px mobile): **34/34 pass** — full organizer walk, token-by-token draw verification, fresh-link reveal, save-card PNG download, all error paths, no horizontal overflow, ≥44px tap targets, zero JS errors
- **Two real bugs found and fixed by QA:** (1) an untouched keep-apart row silently became a rule and could make a 3-person draw impossible; (2) private links were ~700 chars of baked gift text — now ~230 chars carrying gift IDs only, which is also more private
- Template v2: homepage rendered view **101 words, FK 2.57** (limits 300 / 3.0); hero 4-word headline, 10-word subline, 1 CTA; footer "Built with Muse."
- Visual standard: 5/6 pass; hero is illustration-led (custom mascot) rather than photo-led — called out openly in the QA report, Billy's call if he wants it changed

## Bank adaptation note

`site/bank.js` is a **verbatim copy** of The Present Picker's live 111-idea bank (`builds/present-picker/mcp-server/bank.json`), trimmed to the fields this tool uses (name, blurb, why, spec, budget, interests, category) — no content edits, no silent fork. The header in the file records the source. If the PP bank changes (e.g., the staged 137-idea merge), re-copy and re-run `qa/core-tests.mjs`. Inherited thin cells (3 budget×interest cells have zero in-band matches; the interest simply doesn't boost there, budget stays hard) are listed in the QA report.

## Launch checklist — starts the moment the domain is registered

Billy's step (the only one):
1. **Register pickmysecretsanta.com** (Cloudflare Registrar, ~$12/yr).

Muse's steps (fleet API patterns, all proven Oct 25 on the other seven domains):
2. Confirm the Cloudflare zone is active; note the zone id.
3. Create GitHub repo `pick-my-secret-santa`, push this stage (repo creation is a launch step on purpose — nothing public while staged).
4. Cloudflare Pages project from the repo, publish directory `site/`; attach apex + `www` (CNAME www → the Pages host, per fleet pattern).
5. Enable Email Routing: settings on, MX route1/2/3 + SPF + DKIM, rule `hello@pickmysecretsanta.com` → wdlcmu@gmail.com; verify via API + DoH. (Footers/legal already carry the address with STAGED comments marking this step.)
6. Uncomment the Cloudflare Web Analytics beacon in `index.html`, `privacy.html`, `terms.html` and set the real token (placeholders `__CF_BEACON_TOKEN__` are marked `LAUNCH:`). Tier-2 measurement standard = Cloudflare WA + Search Console (per Billy's Oct 25 analytics decision; no PostHog).
7. Search Console: add the domain property under wdlcmu@gmail.com (DNS TXT verify via API), submit `sitemap.xml`. (Needs Billy's signed-in browser session if Google challenges.)
8. Deploy, then proof pack back to Billy: live URL + live screenshot + commit link + word counts/FK (Operating Instructions v2; tier-2 measurement note instead of a PostHog event).
9. Add the cross-links (fleet internal-linking graph): PMC → Secret Santa and Secret Santa → Present Picker, on the next ship wave for those sites.
10. Season note: every week of November counts (~246k searches Nov–Dec). If registration slips past mid-November, the 2026 season is mostly gone and this becomes a 2027 asset — the build keeps either way.

## Explicitly not done (by design)

- Domain NOT registered (Billy's purchase tap)
- Nothing deployed or public; no GitHub repo created yet
- Email routing NOT enabled (no zone exists yet); contact address is staged in copy only
- No posts, emails, or announcements; no plugin/MCP (tier-2 web tool; a plugin would need the 3-YES gate and a server — v2 conversation, not this launch)
