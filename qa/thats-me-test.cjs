/* SPEC-SS-THATSME-01 rendered behavior walk (Playwright, real
   Chromium, mobile viewport). Run: node qa/thats-me-test.cjs
   Serves the local site/ tree at the production origin in-memory,
   exactly like qa/flow-test.cjs; /api calls 404 there, so draws
   take the long-link fallback — the kit, the tokens and the
   on-device record are all exercised end to end. The short-link
   + manage-page half is verified live after deploy. */
const { chromium } = require("/opt/muse/assets/spaces/ts-runtime/dist/node_modules/playwright");
const fs = require("fs");

const BASE = "https://pickmysecretsanta.com";
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log("ok -", name); }
  else { fail++; console.log("FAIL -", name, extra || ""); }
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PMSS_CHROME ||
      require("os").homedir() + "/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell",
    args: ["--no-sandbox", "--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks", "--allow-insecure-localhost", "--host-resolver-rules=MAP pmss.test 127.0.0.1"]
  });
  const SITE_DIR = require("path").join(__dirname, "..", "site");
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
    ".xml": "application/xml", ".txt": "text/plain", ".png": "image/png" };
  async function serveLocal(route) {
    const url = new URL(route.request().url());
    let name = decodeURIComponent(url.pathname);
    if (name === "/" || name === "") name = "/index.html";
    if (!/\.[a-z0-9]+$/.test(name)) name += ".html"; // Pages serves extensionless
    const file = require("path").join(SITE_DIR, name);
    try {
      const body = fs.readFileSync(file);
      const ext = require("path").extname(file);
      await route.fulfill({ status: 200, contentType: TYPES[ext] || "application/octet-stream", body });
    } catch (e) {
      await route.fulfill({ status: 404, contentType: "text/html", body: "<h1>404</h1>" });
    }
  }
  async function newServedPage(opts, seedDraft) {
    const ctx = await browser.newContext(opts || { viewport: { width: 390, height: 844 } });
    await ctx.route("https://pickmysecretsanta.com/**", serveLocal);
    if (seedDraft) {
      await ctx.addInitScript((d) => {
        try { localStorage.setItem("ss_draft_v1", JSON.stringify(d)); } catch (e) {}
      }, seedDraft);
    }
    return ctx.newPage();
  }
  const rows = (page) => page.locator(".vd-person");
  async function fillNames(page, names) {
    for (let i = 0; i < names.length; i++) {
      if (i >= await rows(page).count()) await page.click(".vd-add");
      await rows(page).nth(i).locator(".vd-name").fill(names[i]);
    }
  }
  async function drawAndWait(page) {
    await page.click(".vd-draw");
    await page.waitForSelector(".vd-link", { timeout: 6000 });
    await page.waitForTimeout(250);
  }

  /* ---------- 1. The form: no field, a toggle on every row ---------- */
  const page = await newServedPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".vd-person");
  check("no JS errors on load", errors.length === 0, errors.join("; "));
  const formText = await page.locator(".vdraw").innerText();
  check("the 'Your name (optional)' field is gone", !formText.includes("Your name (optional)"));
  check("no input offers a first-name placeholder", await page.locator('.vdraw input[placeholder="Your first name"]').count() === 0);
  check("every roster row carries a That's me toggle",
    await page.locator(".vd-person .vd-me").count() === await rows(page).count());
  check("toggle label is That's me",
    (await rows(page).first().locator(".vd-me").innerText()) === "That's me");
  const meBox = await rows(page).first().locator(".vd-me").boundingBox();
  check("toggle tap target >= 44px tall", meBox && meBox.height >= 44, meBox && meBox.height);
  const overflow0 = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("no horizontal overflow at 390px with the toggle in the row", overflow0 <= 0, overflow0);
  check("the storage line under the Draw button is unchanged",
    (await page.locator(".vd-note").innerText()) ===
      "Names and matches are stored on our server for the short links, in a form we can read.");

  /* ---------- 2. Marker: set, move, clear ---------- */
  await fillNames(page, ["Billy", "Ssss", "Hhh", "Kkk"]);
  await rows(page).nth(0).locator(".vd-me").click();
  check("tap marks the row", await rows(page).nth(0).locator(".vd-me").getAttribute("aria-pressed") === "true");
  check("marked toggle shows the check", (await rows(page).nth(0).locator(".vd-me").innerText()).includes("✓"));
  await rows(page).nth(2).locator(".vd-me").click();
  check("tapping another row moves the mark",
    await rows(page).nth(0).locator(".vd-me").getAttribute("aria-pressed") === "false" &&
    await rows(page).nth(2).locator(".vd-me").getAttribute("aria-pressed") === "true");
  await rows(page).nth(2).locator(".vd-me").click();
  check("tapping the marked row clears the mark",
    await page.locator('.vd-me[aria-pressed="true"]').count() === 0);
  // Mark Billy again for the picker + draw scenarios.
  await rows(page).nth(0).locator(".vd-me").click();

  /* ---------- 3. The picker lists each participant exactly once ---------- */
  await page.click(".vd-pairs summary");
  const opts = await page.locator(".vd-pairrow select").first().locator("option").allInnerTexts();
  check("picker options are the four roster names, each once",
    JSON.stringify(opts) === JSON.stringify(["Billy", "Ssss", "Hhh", "Kkk"]), opts.join("|"));

  /* ---------- 4. Duplicate flag: appears, names the name, disappears ---------- */
  await rows(page).nth(1).locator(".vd-name").fill("Billy");
  await page.waitForSelector(".vd-dupeflag", { timeout: 3000 }).catch(() => {});
  check("duplicate flag appears", await page.locator(".vd-dupeflag").count() === 1);
  check("flag text names the duplicated name and the fix",
    (await page.locator(".vd-dupeflag").innerText()).includes("Two people are named Billy") &&
    (await page.locator(".vd-dupeflag").innerText()).includes("add a last initial"));
  check("both duplicate rows are outlined",
    await page.locator(".vd-person.vd-dupe").count() === 2);
  check("the mark stays on its own row while a same-name sibling appears",
    await rows(page).nth(0).locator(".vd-me").getAttribute("aria-pressed") === "true" &&
    await rows(page).nth(1).locator(".vd-me").getAttribute("aria-pressed") === "false");
  check("the draw is NOT blocked by the flag alone (button still enabled)",
    await page.locator(".vd-draw").isEnabled());
  await rows(page).nth(1).locator(".vd-name").fill("Ssss");
  await page.waitForTimeout(150);
  check("flag disappears when the duplicate is fixed", await page.locator(".vd-dupeflag").count() === 0);
  check("duplicate outlines clear too", await page.locator(".vd-person.vd-dupe").count() === 0);

  /* ---------- 5. Full draw with the mark: kit + token + record ---------- */
  await drawAndWait(page);
  const kitNames = await page.locator(".vd-link .env-name").allInnerTexts();
  check("kit lists the four people", kitNames.length === 4, kitNames.join("|"));
  const yoursAt = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".vd-link"));
    return cards.map(c => ({
      who: c.querySelector(".env-name").textContent,
      yours: !!c.querySelector(".vd-yours")
    }));
  });
  check("exactly one kit card is marked as the organizer's own — Billy's",
    yoursAt.filter(c => c.yours).length === 1 && yoursAt.find(c => c.yours).who === "Billy",
    JSON.stringify(yoursAt));
  const rec = await page.evaluate(() => JSON.parse(localStorage.getItem("ss_draw_v1") || "null"));
  check("the on-device record carries o = the marked name", rec && rec.o === "Billy", rec && rec.o);
  const billyToken = await page.evaluate(() => {
    const r = JSON.parse(localStorage.getItem("ss_draw_v1") || "null");
    const link = r.links.find(l => l.for === "Billy");
    return window.SS_CORE.parseToken(link.token);
  });
  check("Billy's private-link token carries o = Billy (the reveal cover line's source)",
    billyToken && billyToken.o === "Billy", billyToken && billyToken.o);

  /* ---------- 6. Full draw with NO mark: everything works, no o anywhere ---------- */
  const p2 = await newServedPage();
  await p2.goto(BASE + "/secret-santa-generator", { waitUntil: "domcontentloaded" });
  await p2.waitForSelector(".vd-person");
  await fillNames(p2, ["Ana", "Ben", "Cleo", "Dev"]);
  await drawAndWait(p2);
  check("no-mark draw completes with a full kit", await p2.locator(".vd-link").count() === 4);
  check("no-mark kit marks nobody's card", await p2.locator(".vd-yours").count() === 0);
  const rec2 = await p2.evaluate(() => JSON.parse(localStorage.getItem("ss_draw_v1") || "null"));
  check("no-mark record carries no o", rec2 && rec2.o === undefined, rec2 && String(rec2.o));
  const toks2 = await p2.evaluate(() => {
    const r = JSON.parse(localStorage.getItem("ss_draw_v1") || "null");
    return r.links.map(l => window.SS_CORE.parseToken(l.token));
  });
  check("no-mark tokens carry no o", toks2.every(t => t && t.o === undefined));

  /* ---------- 7. Draft migration ---------- */
  const base = { v: 1, group: "", band: "m2550", free: 0, names: ["Billy", "Ssss", "Hhh", "Kkk"], ints: {}, pairs: [], t: Date.now() };
  // (a) pre-ship draft: org matches exactly one roster row.
  const pA = await newServedPage(undefined, { ...base, org: "ssss" });
  await pA.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await pA.waitForSelector(".vd-person");
  await pA.waitForTimeout(300);
  check("migration: a retired-org draft pre-marks the matching row (case-insensitive)",
    await rows(pA).nth(1).locator(".vd-me").getAttribute("aria-pressed") === "true");
  const storedA = await pA.evaluate(() => JSON.parse(localStorage.getItem("ss_draft_v1") || "null"));
  check("migration: the stored draft is rewritten in the new shape (me, no org)",
    storedA && storedA.me === "Ssss" && storedA.org === undefined, JSON.stringify(storedA));
  // (b) pre-ship draft: org matches nobody.
  const pB = await newServedPage(undefined, { ...base, org: "Nobody" });
  await pB.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await pB.waitForSelector(".vd-person");
  await pB.waitForTimeout(300);
  check("migration: an unmatched retired-org value drops silently — no mark, roster intact",
    await pB.locator('.vd-me[aria-pressed="true"]').count() === 0 &&
    await rows(pB).count() === 4);
  // (c) new-shape draft: me marks its row.
  const pC = await newServedPage(undefined, { ...base, me: "Hhh" });
  await pC.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await pC.waitForSelector(".vd-person");
  await pC.waitForTimeout(300);
  check("migration: a new-shape draft's me pre-marks its row",
    await rows(pC).nth(2).locator(".vd-me").getAttribute("aria-pressed") === "true");
  // (d) no field resurrects on any migrated draft.
  check("migration: the retired field never resurrects",
    !(await pA.locator(".vdraw").innerText()).includes("Your name (optional)") &&
    !(await pC.locator(".vdraw").innerText()).includes("Your name (optional)"));

  /* ---------- 8. Spanish + Portuguese surfaces ---------- */
  const pES = await newServedPage();
  await pES.goto(BASE + "/amigo-secreto", { waitUntil: "domcontentloaded" });
  await pES.waitForSelector(".vd-person");
  check("ES: no field, toggle reads Soy yo",
    !(await pES.locator(".vdraw").innerText()).includes("Tu nombre (opcional)") &&
    (await rows(pES).first().locator(".vd-me").innerText()) === "Soy yo");
  await fillNames(pES, ["María", "María", "Luz", "Ana"]);
  await pES.waitForSelector(".vd-dupeflag", { timeout: 3000 }).catch(() => {});
  check("ES: duplicate flag renders in Spanish",
    (await pES.locator(".vd-dupeflag").innerText() || "").includes("Dos personas se llaman María"));
  const pPT = await newServedPage();
  await pPT.goto(BASE + "/amigo-secreto-online", { waitUntil: "domcontentloaded" });
  await pPT.waitForSelector(".vd-person");
  check("PT: no field, toggle reads Sou eu",
    !(await pPT.locator(".vdraw").innerText()).includes("Seu nome (opcional)") &&
    (await rows(pPT).first().locator(".vd-me").innerText()) === "Sou eu");

  /* ---------- 9. draw-names-online: form changed, page intact ---------- */
  const pD = await newServedPage();
  await pD.goto(BASE + "/draw-names-online", { waitUntil: "domcontentloaded" });
  await pD.waitForSelector(".vd-person");
  check("draw-names-online: no organizer field, toggle present",
    !(await pD.locator(".vdraw").innerText()).includes("Your name (optional)") &&
    await pD.locator(".vd-person .vd-me").count() >= 4);
  const dnoHtml = await pD.content();
  check("draw-names-online: pinned page copy untouched (storage sentence still on the page)",
    dnoHtml.includes("names and matches are stored on our server"));

  await browser.close();
  console.log(`\nthats-me tests: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("HARNESS ERROR:", e); process.exit(2); });
