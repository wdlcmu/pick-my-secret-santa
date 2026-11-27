/* Sealed-envelope ship walk (Nov 26, 2026): rendered proof for the
   envelope port at 390x844, Playwright + real Chromium, serving the
   local site/ tree at the production origin in-memory (the
   own-card-test harness pattern; /api/links 404s so draws take the
   long-link fallback, /api/progress is intercepted and timestamped).
   Covers: variant-kit results (EN + ES, own card + others, shared
   state), the app.js saved-draw kit, a 20-person results screen
   measured against the pre-change kit (OLD_SITE_DIR), and the
   reveal — tap, second-tap skip, reduced motion, ES/PT faces —
   including the LOAD-BEARING check: the progress "r" post and the
   reveal_opened event fire at the tap, while the card is still
   hidden behind the unsealing envelope.
   Run: node qa/envelope-test.cjs */
const { chromium } = require("/opt/muse/assets/spaces/ts-runtime/dist/node_modules/playwright");
const fs = require("fs");
const path = require("path");

const BASE = "https://pickmysecretsanta.com";
const SITE_DIR = process.env.WALK_SITE_DIR || path.join(__dirname, "..", "site");
const OLD_DIR = process.env.OLD_SITE_DIR || "/tmp/oldsite";
const OUT = path.join(__dirname, "..", "..", "shots") + "/";
fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log("ok -", name); }
  else { fail++; console.log("FAIL -", name, extra || ""); }
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".xml": "application/xml", ".txt": "text/plain", ".png": "image/png" };
function serveLocal(dir, route) {
  const url = new URL(route.request().url());
  let name = decodeURIComponent(url.pathname);
  if (name === "/" || name === "") name = "/index.html";
  if (!/\.[a-z0-9]+$/.test(name)) name += ".html";
  const file = path.join(dir, name);
  try {
    const body = fs.readFileSync(file);
    return route.fulfill({ status: 200, contentType: TYPES[path.extname(file)] || "application/octet-stream", body });
  } catch (e) {
    return route.fulfill({ status: 404, contentType: "text/html", body: "<h1>404</h1>" });
  }
}
const STUBS = () => {
  window.__shared = [];
  window.__copied = [];
  try {
    Object.defineProperty(Navigator.prototype, "share", {
      configurable: true, writable: true,
      value: function (data) { window.__shared.push(data); return Promise.resolve(); }
    });
    Object.defineProperty(Navigator.prototype, "clipboard", {
      configurable: true,
      get: function () { return { writeText: function (t) { window.__copied.push(t); return Promise.resolve(); } }; }
    });
  } catch (e) {}
};

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PMSS_CHROME ||
      require("os").homedir() + "/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell",
    args: ["--no-sandbox", "--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks", "--allow-insecure-localhost", "--host-resolver-rules=MAP pmss.test 127.0.0.1"]
  });

  async function newPage(dir, opts) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 } }, opts || {}));
    const progress = [];
    await ctx.route("**/*", (route) => route.abort());
    await ctx.route("https://pickmysecretsanta.com/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/progress" && route.request().method() === "POST") {
        let e = "?";
        try { e = JSON.parse(route.request().postData() || "{}").e || "?"; } catch (err) {}
        progress.push({ e, at: Date.now() });
        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      }
      if (url.pathname.indexOf("/api/") === 0) {
        return route.fulfill({ status: 404, contentType: "text/plain", body: "nf" });
      }
      return serveLocal(dir, route);
    });
    await ctx.addInitScript(STUBS);
    const page = await ctx.newPage();
    page.__progress = progress;
    page.__ctx = ctx;
    return page;
  }
  const rows = (page) => page.locator(".vd-person");
  async function fillNames(page, names) {
    for (let i = 0; i < names.length; i++) {
      if (i >= await rows(page).count()) {
        const before = await rows(page).count();
        await page.locator(".vd-add:not(.vd-pastebtn)").click();
        await page.waitForFunction((n) => document.querySelectorAll(".vd-person").length > n, before, { timeout: 5000 });
      }
      await rows(page).nth(i).locator(".vd-name").fill(names[i]);
    }
  }
  async function drawAndWait(page) {
    await page.click(".vd-draw");
    await page.waitForSelector(".vd-link", { timeout: 8000 });
    await page.waitForTimeout(800);
  }
  const cardFor = (page, name) => page.locator('.vd-link[data-for="' + name + '"]');

  /* ---------- A. Variant kit results, EN, organizer marked ---------- */
  const page = await newPage(SITE_DIR);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".vd-person");
  await fillNames(page, ["Sam", "Maya", "Jordan", "Priya"]);
  await rows(page).nth(0).locator(".vd-me").click();
  await drawAndWait(page);
  check("A: no JS errors", errors.length === 0, errors.join("; "));
  check("A: four kit cards", await page.locator(".vd-link").count() === 4);
  check("A: every card wears an envelope", await page.locator(".vd-link .env.env-sm").count() === 4);
  const envNames = await page.locator(".vd-link .env-name").allInnerTexts();
  check("A: envelope faces carry the four names", JSON.stringify(envNames) === JSON.stringify(["Sam", "Maya", "Jordan", "Priya"]), envNames.join("|"));
  const sealedSam = await cardFor(page, "Sam").locator(".env-sealedline").innerText();
  const sealedMaya = await cardFor(page, "Maya").locator(".env-sealedline").innerText();
  check("A: own sealed line is first person", sealedSam === "Sealed — only you can open it", sealedSam);
  check("A: other sealed line names the person", sealedMaya === "Sealed — only Maya can open it", sealedMaya);
  check("A: own envelope carries the yours pill", await cardFor(page, "Sam").locator(".env .vd-yours").innerText() === "This is yours");
  check("A: other envelopes carry no yours pill", await cardFor(page, "Maya").locator(".vd-yours").count() === 0);
  check("A: status line still under the envelope", (await cardFor(page, "Maya").locator(".vd-url").innerText()) === "Private link ready");
  const fitA = await cardFor(page, "Jordan").evaluate((card) => {
    const env = card.querySelector(".env").getBoundingClientRect();
    const line = card.querySelector(".env-sealedline").getBoundingClientRect();
    const name = card.querySelector(".env-name").getBoundingClientRect();
    return { lineIn: line.bottom <= env.bottom + 0.5 && line.top >= env.top, nameIn: name.bottom <= env.bottom + 0.5 && name.top >= env.top };
  });
  check("A: name and sealed line sit fully inside the envelope (no clipping)", fitA.lineIn && fitA.nameIn, JSON.stringify(fitA));
  check("A: counter excludes the own card", (await page.locator(".vd-progress").innerText()) === "0 of 3 links shared from this device.");
  const kitText = await page.locator(".vd-share").innerText();
  check("A: no URL or match rendered as page text on results", !/https?:\/\//.test(kitText));
  check("A: no banned claim language on results", !/encrypt|can'?t read|cannot read|zero-knowledge|server cannot/i.test(kitText));
  await page.screenshot({ path: OUT + "shot-env-results.png" });
  await cardFor(page, "Maya").locator(".vd-actions > *").first().click();
  await page.waitForTimeout(300);
  check("A: shared state flips the status", (await cardFor(page, "Maya").locator(".vd-url").innerText()) === "Shared from this device ✓");
  check("A: shared card compacts (vd-done)", ((await cardFor(page, "Maya").getAttribute("class")) || "").indexOf("vd-done") !== -1);
  check("A: counter moves to 1 of 3", (await page.locator(".vd-progress").innerText()) === "1 of 3 links shared from this device.");
  await page.screenshot({ path: OUT + "shot-env-results-shared.png" });

  /* ---------- B. ES kit surface ---------- */
  const pES = await newPage(SITE_DIR);
  await pES.goto(BASE + "/amigo-secreto", { waitUntil: "domcontentloaded" });
  await pES.waitForSelector(".vd-person");
  await fillNames(pES, ["Lucía", "Marco", "Ana"]);
  await rows(pES).nth(0).locator(".vd-me").click();
  await drawAndWait(pES);
  check("B: ES own sealed line", (await cardFor(pES, "Lucía").locator(".env-sealedline").innerText()) === "Sellado — solo tú puedes abrirlo");
  check("B: ES other sealed line", (await cardFor(pES, "Marco").locator(".env-sealedline").innerText()) === "Sellado — solo Marco puede abrirlo");
  check("B: ES yours pill on the envelope", (await cardFor(pES, "Lucía").locator(".env .vd-yours").innerText()) === "Este es tu enlace");
  await pES.screenshot({ path: OUT + "shot-env-kit-es.png" });
  await pES.__ctx.close();

  /* ---------- C. Large roster: 20 people, new vs pre-change kit ---------- */
  const names20 = Array.from({ length: 20 }, (_, i) => "Person" + (i + 1));
  const pBig = await newPage(SITE_DIR);
  await pBig.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await pBig.waitForSelector(".vd-person");
  await fillNames(pBig, names20);
  await drawAndWait(pBig);
  check("C: 20 envelopes render", await pBig.locator(".vd-link .env.env-sm").count() === 20);
  check("C: compact density engaged", await pBig.locator(".vd-links.vd-many").count() === 1);
  const fitC = await cardFor(pBig, "Person20").evaluate((card) => {
    const env = card.querySelector(".env").getBoundingClientRect();
    const line = card.querySelector(".env-sealedline").getBoundingClientRect();
    const name = card.querySelector(".env-name").getBoundingClientRect();
    return { lineIn: line.bottom <= env.bottom + 0.5 && line.top >= env.top, nameIn: name.bottom <= env.bottom + 0.5 && name.top >= env.top };
  });
  check("C: compact envelope text sits fully inside (no clipping)", fitC.lineIn && fitC.nameIn, JSON.stringify(fitC));
  const newH = await pBig.evaluate(() => document.querySelector(".vd-links").scrollHeight);
  await pBig.screenshot({ path: OUT + "shot-env-large20.png", fullPage: true });
  await pBig.__ctx.close();
  let oldH = null;
  if (fs.existsSync(path.join(OLD_DIR, "variant-draw.js"))) {
    const pOld = await newPage(OLD_DIR);
    await pOld.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await pOld.waitForSelector(".vd-person");
    await fillNames(pOld, names20);
    await drawAndWait(pOld);
    oldH = await pOld.evaluate(() => document.querySelector(".vd-links").scrollHeight);
    await pOld.__ctx.close();
  }
  if (oldH) {
    const pct = Math.round(((newH - oldH) / oldH) * 100);
    console.log("20-person .vd-links height: old " + oldH + "px -> new " + newH + "px (" + (pct >= 0 ? "+" : "") + pct + "%)");
    check("C: 20-person results growth stays within 25%", pct <= 25, pct + "%");
  } else {
    check("C: pre-change kit available for height comparison", false, "OLD_SITE_DIR missing");
  }

  /* ---------- D. App.js saved-draw kit wears the envelope too ---------- */
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#savedKitToggle", { timeout: 8000 });
  await page.click("#savedKitToggle");
  await page.waitForSelector("#savedCards .sharecard", { timeout: 8000 });
  check("D: saved kit renders four per-person cards", await page.locator("#savedCards .sharecard[data-for]").count() === 4);
  check("D: saved kit cards wear envelopes", await page.locator("#savedCards .sharecard[data-for] .env.env-sm").count() === 4);
  const savedSam = page.locator('#savedCards .sharecard[data-for="Sam"]');
  check("D: saved own envelope — yours pill + first-person line",
    (await savedSam.locator(".env-yours").innerText()) === "This is yours" &&
    (await savedSam.locator(".env-sealedline").innerText()) === "Sealed — only you can open it");
  const savedMaya = page.locator('#savedCards .sharecard[data-for="Maya"]');
  check("D: saved other envelope names the person",
    (await savedMaya.locator(".env-sealedline").innerText()) === "Sealed — only Maya can open it");
  await page.screenshot({ path: OUT + "shot-env-savedkit.png" });
  await page.__ctx.close();

  /* ---------- Reveal link factory (fresh contexts from here) ---------- */
  async function buildLink(lang) {
    const p = await newPage(SITE_DIR);
    await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await p.waitForFunction(() => window.SS_CORE && window.SS_BANK);
    const url = await p.evaluate(() => {
      const ids = window.SS_BANK.ideas.slice(0, 3).map((i) => i.id);
      const tok = window.SS_CORE.makeToken({ v: 1, g: "Family", b: "$25-$50", you: "Maya", got: "Sam", pi: ids });
      return "https://pickmysecretsanta.com/#p=" + tok + "&t=0123456789abcdef0123456789ab";
    });
    await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
    return { p, url: lang ? url + "&l=" + lang : url };
  }

  /* ---------- E. Reveal EN: accounting at the tap ---------- */
  {
    const { p, url } = await buildLink(null);
    const rerrors = [];
    p.on("pageerror", (e) => rerrors.push(String(e)));
    await p.goto(url, { waitUntil: "domcontentloaded" });
    await p.waitForSelector("#peekBtn", { state: "visible", timeout: 8000 });
    await p.waitForTimeout(400);
    check("E: reveal loads clean", rerrors.length === 0, rerrors.join("; "));
    check("E: progress 'o' posted at load, no 'r' yet",
      p.__progress.filter((x) => x.e === "o").length === 1 && p.__progress.filter((x) => x.e === "r").length === 0,
      JSON.stringify(p.__progress));
    check("E: envelope addressed to Maya", (await p.locator("#envFor").innerText()) === "For Maya");
    check("E: sealed line on the face", (await p.locator("#envSealedLine").innerText()) === "Sealed — only you can open it");
    check("E: tap pill reads Tap to open", (await p.locator("#envTap").innerText()) === "Tap to open");
    check("E: aria label names Maya", (await p.locator("#peekBtn").getAttribute("aria-label")) === "Sealed envelope for Maya. Tap to open it.");
    check("E: card hidden before the tap", await p.locator("#revealCard").isHidden());
    check("E: no budget on the sealed cover", !(await p.locator("#revealCover").innerText()).includes("Budget"));
    await p.screenshot({ path: OUT + "shot-env-reveal-sealed.png" });
    const t0 = Date.now();
    await p.click("#peekBtn");
    const midState = await p.evaluate(() => ({
      unsealing: document.getElementById("envLg").classList.contains("unsealing"),
      cardHidden: document.getElementById("revealCard").hidden,
      queued: (window._fleetQ || []).map((q) => q[0])
    }));
    check("E: unseal animation is running right after the tap", midState.unsealing === true);
    check("E: card still hidden mid-animation", midState.cardHidden === true);
    check("E: reveal_opened already fired at the tap", midState.queued.indexOf("reveal_opened") !== -1, midState.queued.join(","));
    await p.waitForSelector("#revealCard", { state: "visible", timeout: 3000 });
    const cardAt = Date.now();
    const rPost = p.__progress.filter((x) => x.e === "r")[0];
    check("E: progress 'r' posted exactly once", p.__progress.filter((x) => x.e === "r").length === 1);
    check("E: progress 'r' fired at the tap, not at animation end", !!rPost && (rPost.at - t0) < 400 && rPost.at < cardAt, rPost && (rPost.at - t0) + "ms");
    check("E: the unseal beat actually ran (>=500ms to the card)", cardAt - t0 >= 500, (cardAt - t0) + "ms");
    check("E: revealed match is Sam", (await p.locator("#gotName").innerText()) === "Sam");
    await p.screenshot({ path: OUT + "shot-env-reveal-open.png" });
    await p.__ctx.close();
  }

  /* ---------- F. Second tap skips ---------- */
  {
    const { p, url } = await buildLink(null);
    await p.goto(url, { waitUntil: "domcontentloaded" });
    await p.waitForSelector("#peekBtn", { state: "visible", timeout: 8000 });
    await p.click("#peekBtn");
    await p.waitForTimeout(120);
    const t1 = Date.now();
    await p.click("#peekBtn");
    await p.waitForSelector("#revealCard", { state: "visible", timeout: 2000 });
    check("F: second tap skips straight to the card", Date.now() - t1 < 400, (Date.now() - t1) + "ms");
    check("F: the skip still posted 'r' exactly once", p.__progress.filter((x) => x.e === "r").length === 1);
    await p.__ctx.close();
  }

  /* ---------- G. Reduced motion: instant ---------- */
  {
    const p = await newPage(SITE_DIR, { reducedMotion: "reduce" });
    await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await p.waitForFunction(() => window.SS_CORE && window.SS_BANK);
    const url = await p.evaluate(() => {
      const ids = window.SS_BANK.ideas.slice(0, 3).map((i) => i.id);
      const tok = window.SS_CORE.makeToken({ v: 1, g: "Family", b: "$25-$50", you: "Maya", got: "Sam", pi: ids });
      return "https://pickmysecretsanta.com/#p=" + tok + "&t=0123456789abcdef0123456789ab";
    });
    await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
    await p.goto(url, { waitUntil: "domcontentloaded" });
    await p.waitForSelector("#peekBtn", { state: "visible", timeout: 8000 });
    const t0 = Date.now();
    await p.click("#peekBtn");
    await p.waitForSelector("#revealCard", { state: "visible", timeout: 2000 });
    check("G: reduced motion opens instantly", Date.now() - t0 < 400, (Date.now() - t0) + "ms");
    check("G: reduced motion still posts 'r' at the tap", p.__progress.filter((x) => x.e === "r").length === 1);
    await p.__ctx.close();
  }

  /* ---------- H. ES reveal face ---------- */
  {
    const { p, url } = await buildLink("es");
    await p.goto(url, { waitUntil: "domcontentloaded" });
    await p.waitForSelector("#peekBtn", { state: "visible", timeout: 8000 });
    await p.waitForTimeout(300);
    check("H: ES envelope addressed", (await p.locator("#envFor").innerText()) === "Para Maya");
    check("H: ES sealed line", (await p.locator("#envSealedLine").innerText()) === "Sellado — solo tú puedes abrirlo");
    check("H: ES tap pill", (await p.locator("#envTap").innerText()) === "Toca para abrir");
    check("H: ES aria label", (await p.locator("#peekBtn").getAttribute("aria-label")) === "Sobre sellado para Maya. Toca para abrirlo.");
    await p.screenshot({ path: OUT + "shot-env-reveal-es.png" });
    await p.__ctx.close();
  }

  /* ---------- I. PT reveal face ---------- */
  {
    const { p, url } = await buildLink("pt");
    await p.goto(url, { waitUntil: "domcontentloaded" });
    await p.waitForSelector("#peekBtn", { state: "visible", timeout: 8000 });
    await p.waitForTimeout(300);
    check("I: PT envelope addressed", (await p.locator("#envFor").innerText()) === "Para Maya");
    check("I: PT sealed line", (await p.locator("#envSealedLine").innerText()) === "Selado — só você pode abrir");
    check("I: PT tap pill", (await p.locator("#envTap").innerText()) === "Toque para abrir");
    check("I: PT aria label", (await p.locator("#peekBtn").getAttribute("aria-label")) === "Envelope selado para Maya. Toque para abrir.");
    await p.__ctx.close();
  }

  /* ---------- E2. Reveal seam: one continuous motion, no scroll snap ----------
     Billy's dogfood (Nov 26, 2026): "the transition animation isn't
     smooth to the page." Measured here: the whole cover fades as one
     piece mid-transition (opacity strictly between 0 and 1, card not
     yet swapped in), the scroll position never moves, and the card
     rises in where the cover sat. A short viewport gives the page a
     real scroll position to preserve. */
  {
    const p = await newPage(SITE_DIR, { viewport: { width: 390, height: 560 } });
    await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await p.waitForFunction(() => window.SS_CORE && window.SS_BANK);
    const url = await p.evaluate(() => {
      const ids = window.SS_BANK.ideas.slice(0, 3).map((i) => i.id);
      const tok = window.SS_CORE.makeToken({ v: 1, g: "Family", b: "$25-$50", you: "Maya", got: "Sam", pi: ids });
      return "https://pickmysecretsanta.com/#p=" + tok + "&t=0123456789abcdef0123456789ab";
    });
    await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
    await p.goto(url, { waitUntil: "domcontentloaded" });
    await p.waitForSelector("#peekBtn", { state: "visible", timeout: 8000 });
    await p.waitForTimeout(400);
    await p.evaluate(() => window.scrollTo(0, 140));
    const before = await p.evaluate(() => ({
      y: window.scrollY,
      coverTop: document.getElementById("revealCover").getBoundingClientRect().top + window.scrollY
    }));
    check("E2: the test page really is scrolled before the tap", before.y > 0, JSON.stringify(before));
    await p.evaluate(() => document.getElementById("peekBtn").click());
    await p.waitForTimeout(550); // mid-fade: cover on its way out, swap not yet run
    const mid = await p.evaluate(() => ({
      y: window.scrollY,
      coverOpacity: parseFloat(getComputedStyle(document.getElementById("revealCover")).opacity),
      cardHidden: document.getElementById("revealCard").hidden
    }));
    check("E2: mid-transition the whole cover is fading, not popped", mid.coverOpacity > 0.02 && mid.coverOpacity < 0.98, JSON.stringify(mid));
    check("E2: no flash of the card before the cover has faded", mid.cardHidden === true);
    check("E2: scroll position holds mid-transition", mid.y === before.y, before.y + " -> " + mid.y);
    await p.screenshot({ path: OUT + "shot-env-reveal-mid.png" });
    await p.waitForSelector("#revealCard", { state: "visible", timeout: 3000 });
    const entering = await p.evaluate(() => document.getElementById("revealCard").classList.contains("card-in"));
    check("E2: the card rises in (card-in armed by the full ceremony)", entering === true);
    await p.waitForTimeout(600);
    const after = await p.evaluate(() => ({
      y: window.scrollY,
      heroTop: document.querySelector("#revealCard .personhero").getBoundingClientRect().top + window.scrollY,
      focus: document.activeElement && document.activeElement.id
    }));
    check("E2: scroll position holds through the swap (no focus snap)", after.y === before.y, before.y + " -> " + after.y);
    check("E2: the card arrives in place (hero lands where the cover sat)", Math.abs(after.heroTop - before.coverTop) < 120,
      "cover " + Math.round(before.coverTop) + " -> hero " + Math.round(after.heroTop));
    check("E2: focus still lands on the match name for screen readers", after.focus === "gotName", after.focus);
    await p.screenshot({ path: OUT + "shot-env-reveal-landed.png" });
    await p.__ctx.close();
  }

  /* ---------- J. Recipient back control: re-seal, accounting stays exactly once ---------- */
  {
    const { p, url } = await buildLink(null);
    await p.goto(url, { waitUntil: "domcontentloaded" });
    await p.waitForSelector("#peekBtn", { state: "visible", timeout: 8000 });
    await p.click("#peekBtn");
    await p.waitForSelector("#revealCard", { state: "visible", timeout: 3000 });
    check("J: recipient back control reads Seal it again", (await p.locator("#revealBack").innerText()) === "Seal it again",
      await p.locator("#revealBack").innerText());
    await p.click("#revealBack");
    await p.waitForSelector("#revealCover", { state: "visible", timeout: 3000 });
    const sealed = await p.evaluate(() => ({
      cardHidden: document.getElementById("revealCard").hidden,
      unsealing: document.getElementById("envLg").classList.contains("unsealing"),
      gone: document.getElementById("envWrap").classList.contains("gone"),
      coverOut: document.getElementById("revealCover").classList.contains("cover-out")
    }));
    check("J: re-seal returns to the sealed envelope, ceremony state reset",
      sealed.cardHidden === true && !sealed.unsealing && !sealed.gone && !sealed.coverOut, JSON.stringify(sealed));
    await p.screenshot({ path: OUT + "shot-env-reveal-resealed.png" });
    await p.click("#peekBtn");
    await p.waitForSelector("#revealCard", { state: "visible", timeout: 3000 });
    check("J: re-open shows the same match", (await p.locator("#gotName").innerText()) === "Sam");
    check("J: re-open posts no second progress 'r'", p.__progress.filter((x) => x.e === "r").length === 1,
      JSON.stringify(p.__progress));
    const openedCount = await p.evaluate(() => (window._fleetQ || []).filter((q) => q[0] === "reveal_opened").length);
    check("J: reveal_opened fired exactly once across re-seal + re-open", openedCount === 1, String(openedCount));
    await p.__ctx.close();
  }

  /* ---------- K. Organizer back: results -> own reveal (new tab) -> back -> results intact ---------- */
  {
    const p = await newPage(SITE_DIR);
    const perrors = [];
    p.on("pageerror", (e) => perrors.push(String(e)));
    await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await p.waitForSelector(".vd-person");
    await fillNames(p, ["Maya", "Tom", "Priya"]);
    await rows(p).nth(0).locator(".vd-me").click();
    await drawAndWait(p);
    await cardFor(p, "Tom").locator(".vd-actions > *").first().click();
    await p.waitForTimeout(300);
    check("K: setup — counter at 1 of 2 after sharing Tom", (await p.locator(".vd-progress").innerText()) === "1 of 2 links shared from this device.",
      await p.locator(".vd-progress").innerText());
    await p.evaluate(() => window.scrollTo(0, 260));
    const progBefore = p.__progress.length;
    const popupPromise = p.waitForEvent("popup", { timeout: 8000 });
    await cardFor(p, "Maya").locator(".vd-seematch").click();
    const pop = await popupPromise;
    await pop.waitForSelector("#peekBtn", { state: "visible", timeout: 8000 });
    // The baseline is read AFTER the click: Playwright scrolls the
    // tapped card into view first (a test artifact — a real finger
    // is already there). What the round trip must preserve is the
    // state from this moment on: the popup never touches this tab.
    const stateBefore = await p.evaluate(() => ({
      y: window.scrollY,
      counter: document.querySelector(".vd-progress").textContent,
      tom: document.querySelector('.vd-link[data-for="Tom"] .vd-url').textContent
    }));
    check("K: the own reveal opens addressed to Maya", (await pop.locator("#envFor").innerText()) === "For Maya");
    await pop.click("#peekBtn");
    await pop.waitForSelector("#revealCard", { state: "visible", timeout: 3000 });
    check("K: the organizer's back control reads Back to your draw", (await pop.locator("#revealBack").innerText()) === "Back to your draw",
      await pop.locator("#revealBack").innerText());
    await pop.screenshot({ path: OUT + "shot-env-reveal-back.png" });
    const closedPromise = pop.waitForEvent("close", { timeout: 5000 });
    await pop.click("#revealBack");
    await closedPromise;
    check("K: back closes the reveal tab", pop.isClosed());
    const stateAfter = await p.evaluate(() => ({
      y: window.scrollY,
      counter: document.querySelector(".vd-progress").textContent,
      tom: document.querySelector('.vd-link[data-for="Tom"] .vd-url').textContent
    }));
    check("K: results state exactly as left (counter, shared mark, scroll)",
      stateAfter.counter === stateBefore.counter && stateAfter.tom === stateBefore.tom && stateAfter.y === stateBefore.y,
      JSON.stringify({ stateBefore, stateAfter }));
    check("K: the own reveal posted its progress 'r' exactly once",
      p.__progress.slice(progBefore).filter((x) => x.e === "r").length === 1,
      JSON.stringify(p.__progress.slice(progBefore)));
    check("K: no JS errors", perrors.length === 0, perrors.join("; "));
    await p.__ctx.close();
  }

  /* ---------- L. ES organizer back label ---------- */
  {
    const p = await newPage(SITE_DIR);
    await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await p.waitForFunction(() => window.SS_CORE && window.SS_BANK);
    const url = await p.evaluate(() => {
      const ids = window.SS_BANK.ideas.slice(0, 3).map((i) => i.id);
      const tok = window.SS_CORE.makeToken({ v: 1, g: "Familia", b: "$25-$50", you: "Maya", got: "Sam", o: "Maya", pi: ids });
      return "https://pickmysecretsanta.com/#p=" + tok + "&t=0123456789abcdef0123456789ab&l=es";
    });
    await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
    await p.goto(url, { waitUntil: "domcontentloaded" });
    await p.waitForSelector("#peekBtn", { state: "visible", timeout: 8000 });
    await p.click("#peekBtn");
    await p.waitForSelector("#revealCard", { state: "visible", timeout: 3000 });
    check("L: ES organizer back control reads Volver a tu sorteo", (await p.locator("#revealBack").innerText()) === "Volver a tu sorteo",
      await p.locator("#revealBack").innerText());
    await p.__ctx.close();
  }

  await browser.close();
  console.log("\nenvelope tests: " + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("WALK ERROR", e); process.exit(2); });
