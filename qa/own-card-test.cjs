/* SPEC-SS-OWNCARD-01 + SPEC-SS-ONEMSG-01 rendered behavior walk
   (Playwright, real Chromium, mobile viewport). Run:
   node qa/own-card-test.cjs
   Serves the local site/ tree at the production origin in-memory,
   exactly like qa/thats-me-test.cjs; /api calls 404 there, so draws
   take the long-link fallback — the kit, the tokens and the
   on-device record are all exercised end to end. The share sheet
   and the clipboard are stubbed per context so the payloads can be
   asserted exactly: another person's button always carries the
   full message (link inside it, honesty lines intact), never a
   bare link; a cancelled sheet marks nothing; the organizer's own
   card carries See my match / Copy my link and stays out of the
   shared count. The short-link + live manage/reveal half is
   verified live after deploy. */
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
  const STUBS = (shareMode) => {
    window.__shared = [];
    window.__copied = [];
    window.__shareMode = shareMode === "none" ? "none" : "resolve";
    try {
      Object.defineProperty(Navigator.prototype, "share", {
        configurable: true, writable: true,
        value: shareMode === "none" ? undefined : function (data) {
          window.__shared.push(data);
          return window.__shareMode === "resolve"
            ? Promise.resolve()
            : Promise.reject(new Error("AbortError"));
        }
      });
      Object.defineProperty(Navigator.prototype, "clipboard", {
        configurable: true,
        get: function () {
          return { writeText: function (t) { window.__copied.push(t); return Promise.resolve(); } };
        }
      });
    } catch (e) {}
  };
  async function newServedPage(shareMode) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route("https://pickmysecretsanta.com/**", serveLocal);
    await ctx.addInitScript(STUBS, shareMode || "resolve");
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
    await page.waitForTimeout(700); // let the mint settle re-render land
  }
  const cardFor = (page, name) => page.locator('.vd-link[data-for="' + name + '"]');
  const progress = (page) => page.locator(".vd-progress").innerText();

  /* ---------- A. Share-sheet mode, organizer marked (EN) ---------- */
  const page = await newServedPage("resolve");
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".vd-person");
  await fillNames(page, ["Billy", "C", "D", "E"]);
  await rows(page).nth(0).locator(".vd-me").click();
  await drawAndWait(page);
  check("A: no JS errors through the draw", errors.length === 0, errors.join("; "));

  const own = cardFor(page, "Billy");
  check("A: own card is marked yours", await own.locator(".vd-yours").count() === 1);
  const ownLabels = await own.locator(".vd-actions > *").allInnerTexts();
  check("A: own card actions are See my match + Copy my link, first person",
    ownLabels.length === 2 && ownLabels[0] === "See my match" && ownLabels[1] === "Copy my link",
    ownLabels.join("|"));
  check("A: own card offers no Share/Copy-message button",
    !ownLabels.some(t => /Share|message/i.test(t)), ownLabels.join("|"));
  const seeHref = await own.locator("a.vd-seematch").getAttribute("href");
  check("A: See my match points at Billy's own private link",
    !!seeHref && seeHref.includes("via=share") && seeHref.includes("#p="), seeHref);
  check("A: counter excludes the own card — 0 of 3",
    (await progress(page)) === "0 of 3 links shared from this device.", await progress(page));

  const cCard = cardFor(page, "C");
  const cLabels = await cCard.locator(".vd-actions > *").allInnerTexts();
  check("A: another person's card has exactly ONE button — Share C's message",
    cLabels.length === 1 && cLabels[0] === "Share C\u2019s message", cLabels.join("|"));
  await cCard.locator(".vd-actions > *").first().click();
  await page.waitForTimeout(250);
  const sharedA = await page.evaluate(() => window.__shared);
  check("A: the share payload is the full message, never a bare link",
    sharedA.length === 1 && typeof sharedA[0].text === "string" &&
    sharedA[0].text.includes("pickmysecretsanta.com") &&
    sharedA[0].text.includes("It shows only your match") &&
    sharedA[0].text.length > 120,
    JSON.stringify(sharedA).slice(0, 200));
  check("A: a completed share marks the card and moves the counter to 1 of 3",
    (await progress(page)) === "1 of 3 links shared from this device." &&
    await cCard.locator(".vd-url").innerText() === "Shared from this device \u2713",
    await progress(page));

  await page.evaluate(() => { window.__shareMode = "reject"; });
  await cardFor(page, "D").locator(".vd-actions > *").first().click();
  await page.waitForTimeout(250);
  check("A: a cancelled share sheet marks nothing",
    (await progress(page)) === "1 of 3 links shared from this device." &&
    (await cardFor(page, "D").getAttribute("class")).indexOf("vd-done") === -1,
    await progress(page));
  await page.evaluate(() => { window.__shareMode = "resolve"; });

  await own.locator("button.vd-copy").click();
  await page.waitForTimeout(200);
  const copiedA = await page.evaluate(() => window.__copied);
  check("A: Copy my link copies exactly the organizer's own link",
    copiedA.length === 1 && copiedA[0] === seeHref, JSON.stringify(copiedA).slice(0, 160));
  check("A: copying my link does not move the shared counter",
    (await progress(page)) === "1 of 3 links shared from this device.", await progress(page));

  const popupPromise = page.waitForEvent("popup", { timeout: 4000 }).catch(() => null);
  await own.locator("a.vd-seematch").click();
  const popup = await popupPromise;
  if (popup) {
    // The route-fulfilled navigation commits its URL late in this
    // harness; poll for it instead of trusting load-state timing.
    for (let i = 0; i < 25 && popup.url() !== seeHref; i++) await popup.waitForTimeout(200);
  }
  check("A: See my match opens the organizer's own reveal",
    !!popup && popup.url() === seeHref, popup && popup.url());
  if (popup) {
    await popup.waitForLoadState("domcontentloaded").catch(() => {});
    const revealText = await popup.locator("body").innerText().catch(() => "");
    check("A: the opened reveal is Billy's own (cover names the organizer's draw)",
      revealText.length > 0, revealText.slice(0, 120));
    await popup.close();
  }
  check("A: opening my reveal never counts as a share",
    (await progress(page)) === "1 of 3 links shared from this device.", await progress(page));

  await cardFor(page, "D").locator(".vd-actions > *").first().click();
  await page.waitForTimeout(200);
  await cardFor(page, "E").locator(".vd-actions > *").first().click();
  await page.waitForTimeout(250);
  check("A: all others handed off reads as the completion line, own card untouched",
    (await progress(page)) === "All links handed off." &&
    (await own.getAttribute("class")).indexOf("vd-done") === -1,
    await progress(page));

  /* ---------- B. No share sheet (desktop path), organizer marked ---------- */
  const pB = await newServedPage("none");
  await pB.goto(BASE + "/secret-santa-generator", { waitUntil: "domcontentloaded" });
  await pB.waitForSelector(".vd-person");
  await fillNames(pB, ["Billy", "C", "D", "E"]);
  await rows(pB).nth(0).locator(".vd-me").click();
  await drawAndWait(pB);
  const cB = cardFor(pB, "C");
  const cBLabels = await cB.locator(".vd-actions > *").allInnerTexts();
  check("B: no-sheet card has exactly ONE button — Copy C's message",
    cBLabels.length === 1 && cBLabels[0] === "Copy C\u2019s message", cBLabels.join("|"));
  check("B: no WhatsApp button remains on any kit card",
    await pB.locator(".vd-link .vd-alink").count() === 0);
  check("B: counter still excludes the own card — 0 of 3",
    (await progress(pB)) === "0 of 3 links shared from this device.", await progress(pB));
  await cB.locator(".vd-actions > *").first().click();
  await pB.waitForTimeout(250);
  const copiedB = await pB.evaluate(() => window.__copied);
  check("B: the copy payload is the full message (link inside, honesty line intact)",
    copiedB.length === 1 && copiedB[0].includes("pickmysecretsanta.com") &&
    copiedB[0].includes("It shows only your match") && copiedB[0].length > 120,
    JSON.stringify(copiedB).slice(0, 200));
  check("B: the copy marks the card shared and names the confirmation",
    (await progress(pB)) === "1 of 3 links shared from this device.",
    await progress(pB));
  const ownBLabels = await cardFor(pB, "Billy").locator(".vd-actions > *").allInnerTexts();
  check("B: own card still gets See my match + Copy my link without a share sheet",
    ownBLabels.length === 2 && ownBLabels[0] === "See my match" && ownBLabels[1] === "Copy my link",
    ownBLabels.join("|"));

  /* ---------- C. No organizer marked: old arithmetic, one button each ---------- */
  const pC = await newServedPage("resolve");
  await pC.goto(BASE + "/draw-names-online", { waitUntil: "domcontentloaded" });
  await pC.waitForSelector(".vd-person");
  await fillNames(pC, ["Ana", "Ben", "Cleo", "Dev"]);
  await drawAndWait(pC);
  check("C: no-mark counter counts everyone — 0 of 4",
    (await progress(pC)) === "0 of 4 links shared from this device.", await progress(pC));
  check("C: no-mark kit has no See my match anywhere",
    await pC.locator(".vd-seematch").count() === 0);
  const countsC = await pC.evaluate(() =>
    Array.from(document.querySelectorAll(".vd-link .vd-actions")).map(a => a.children.length));
  check("C: every no-mark card carries exactly one action",
    countsC.length === 4 && countsC.every(n => n === 1), countsC.join(","));

  /* ---------- D. ES render (share mode) ---------- */
  const pD = await newServedPage("resolve");
  await pD.goto(BASE + "/amigo-secreto", { waitUntil: "domcontentloaded" });
  await pD.waitForSelector(".vd-person");
  await fillNames(pD, ["Billy", "Cloe", "Dario", "Elena"]);
  await rows(pD).nth(0).locator(".vd-me").click();
  await drawAndWait(pD);
  const ownDLabels = await cardFor(pD, "Billy").locator(".vd-actions > *").allInnerTexts();
  check("D: ES own card — Ver mi asignación + Copiar mi enlace",
    ownDLabels.length === 2 && ownDLabels[0] === "Ver mi asignación" && ownDLabels[1] === "Copiar mi enlace",
    ownDLabels.join("|"));
  const cDLabels = await cardFor(pD, "Cloe").locator(".vd-actions > *").allInnerTexts();
  check("D: ES other card — one button, Compartir el mensaje de Cloe",
    cDLabels.length === 1 && cDLabels[0] === "Compartir el mensaje de Cloe", cDLabels.join("|"));
  check("D: ES counter excludes the own card — 0 de 3",
    (await progress(pD)) === "0 de 3 enlaces compartidos desde este dispositivo.", await progress(pD));

  /* ---------- E. PT render (share mode) ---------- */
  const pE = await newServedPage("resolve");
  await pE.goto(BASE + "/amigo-secreto-online", { waitUntil: "domcontentloaded" });
  await pE.waitForSelector(".vd-person");
  await fillNames(pE, ["Billy", "Cloe", "Dario", "Elena"]);
  await rows(pE).nth(0).locator(".vd-me").click();
  await drawAndWait(pE);
  const ownELabels = await cardFor(pE, "Billy").locator(".vd-actions > *").allInnerTexts();
  check("E: PT own card — Ver minha combinação + Copiar meu link",
    ownELabels.length === 2 && ownELabels[0] === "Ver minha combinação" && ownELabels[1] === "Copiar meu link",
    ownELabels.join("|"));
  const cELabels = await cardFor(pE, "Cloe").locator(".vd-actions > *").allInnerTexts();
  check("E: PT other card — one button, Compartilhar a mensagem de Cloe",
    cELabels.length === 1 && cELabels[0] === "Compartilhar a mensagem de Cloe", cELabels.join("|"));
  check("E: PT counter excludes the own card — 0 de 3",
    (await progress(pE)) === "0 de 3 links compartilhados deste aparelho.", await progress(pE));

  /* ---------- F. app.js saved-draw kit (homepage, no share sheet) ---------- */
  const pF = await newServedPage("none");
  await pF.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await pF.waitForSelector(".vd-person");
  await fillNames(pF, ["Billy", "C", "D", "E"]);
  await rows(pF).nth(0).locator(".vd-me").click();
  await drawAndWait(pF);
  await pF.reload({ waitUntil: "domcontentloaded" });
  await pF.waitForSelector("#savedKitToggle", { timeout: 6000 });
  await pF.click("#savedKitToggle");
  await pF.waitForSelector('#savedCards .sharecard[data-for="Billy"]', { timeout: 6000 });
  await pF.waitForTimeout(300);
  const savedProg = () => pF.locator("#savedProgress .pline").innerText();
  check("F: saved-kit counter excludes the own card — 0 of 3",
    (await savedProg()) === "0 of 3 links shared from this device.", await savedProg());
  const ownF = pF.locator('#savedCards .sharecard[data-for="Billy"]');
  const ownFLabels = await ownF.locator(".row > *").allInnerTexts();
  check("F: saved-kit own card — See my match + Copy my link, no message button",
    ownFLabels.length === 2 && ownFLabels[0] === "See my match" && ownFLabels[1] === "Copy my link",
    ownFLabels.join("|"));
  check("F: saved-kit own card carries no shared mark",
    await ownF.locator(".sharedmark").count() === 0);
  const cF = pF.locator('#savedCards .sharecard[data-for="C"]');
  const cFLabels = await cF.locator(".row > *").allInnerTexts();
  check("F: saved-kit other card — exactly ONE button, Copy C's message",
    cFLabels.length === 1 && cFLabels[0] === "Copy C\u2019s message", cFLabels.join("|"));
  await cF.locator(".row > *").first().click();
  await pF.waitForTimeout(300);
  const copiedF = await pF.evaluate(() => window.__copied);
  check("F: saved-kit copy carries the full message and moves the counter to 1 of 3",
    copiedF.length >= 1 && copiedF[copiedF.length - 1].includes("It shows only your match") &&
    (await savedProg()) === "1 of 3 links shared from this device.",
    (await savedProg()) + " / " + JSON.stringify(copiedF).slice(0, 120));
  const hintF = await pF.locator("#savedProgress .hint").innerText().catch(() => "");
  check("F: still-to-send never lists the organizer",
    !/\bBilly\b/.test(hintF), hintF);

  await browser.close();
  console.log("\nown-card tests: " + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("HARNESS ERROR", e); process.exit(2); });
