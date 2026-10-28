/* Cold-user flow walk for Pick My Secret Santa (Playwright, real Chromium).
   Run: node qa/flow-test.cjs   (expects the static server on :8931) */
const { chromium } = require("/opt/muse/assets/spaces/ts-runtime/dist/node_modules/playwright");
const fs = require("fs");

const BASE = "https://pickmysecretsanta.com";
const OUT = __dirname + "/";
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log("ok -", name); }
  else { fail++; console.log("FAIL -", name, extra || ""); }
}

(async () => {
  const browser = await chromium.launch({
    executablePath: "/opt/meta-chromium/chrome",
    args: ["--no-sandbox", "--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks", "--allow-insecure-localhost", "--host-resolver-rules=MAP pmss.test 127.0.0.1"]
  });

  // Serve the staged site/ tree at the real production origin, in-memory.
  const SITE_DIR = require("path").join(__dirname, "..", "site");
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
    ".xml": "application/xml", ".txt": "text/plain", ".png": "image/png" };
  async function serveLocal(route) {
    const url = new URL(route.request().url());
    let name = decodeURIComponent(url.pathname);
    if (name === "/" || name === "") name = "/index.html";
    const file = require("path").join(SITE_DIR, name);
    try {
      const body = fs.readFileSync(file);
      const ext = require("path").extname(file);
      await route.fulfill({ status: 200, contentType: TYPES[ext] || "application/octet-stream", body });
    } catch (e) {
      await route.fulfill({ status: 404, contentType: "text/html", body: "<h1>404</h1>" });
    }
  }
  async function newServedPage(opts) {
    const ctx = await browser.newContext(opts);
    await ctx.route("https://pickmysecretsanta.com/**", serveLocal);
    return ctx.newPage();
  }

  /* ---------- Desktop: full organizer walk ---------- */
  const page = await newServedPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  check("page loads with no JS errors", errors.length === 0, errors.join("; "));
  check("hero headline present",
    await page.locator("h1").first().innerText() === "Draw Secret Santa names in secret.");
  check("exactly one hero CTA", await page.locator(".hero .cta").count() === 1);
  await page.screenshot({ path: OUT + "shot-hero-desktop.png" });

  // Rendered visible-text measure of the initial view (fleet scorer logic).
  const rendered = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync(OUT + "rendered-home.txt", rendered);
  const words = rendered.split(/\s+/).filter(Boolean);
  console.log("rendered initial view words:", words.length);

  await page.click("#startBtn");
  await page.waitForTimeout(450);
  check("step 1 visible after Start", await page.locator("#step1").isVisible());
  await page.fill("#groupName", "Office Crew");
  // budget: choose $50-$100 (third chip)
  await page.locator("#budgetChips .chip").nth(2).click();
  await page.click("#toStep2");
  check("step 2 visible", await page.locator("#step2").isVisible());
  const names = ["Ana", "Ben", "Cleo", "Dev", "Esme"];
  for (let i = 0; i < names.length; i++) {
    if (i >= 4) await page.click("#addPerson");
    await page.locator("#peopleRows .prow").nth(i).locator(".pname").fill(names[i]);
  }
  // give Cleo a cooking hint (her match's gift should lean cooking)
  await page.locator("#peopleRows .prow").nth(2).locator(".phint").selectOption("cooking");
  await page.click("#toStep3");
  check("step 3 visible", await page.locator("#step3").isVisible());
  // keep Ana and Ben apart: add a pair row (defaults select the first two people)
  await page.click("#addPair");
  await page.click("#drawBtn");
  await page.waitForTimeout(200);
  check("step 4 (share) visible", await page.locator("#step4").isVisible());
  const cardCount = await page.locator(".sharecard").count();
  check("one share card per person", cardCount === 5, cardCount);

  const links = await page.locator(".sharecard .link").allInnerTexts();
  check("every card carries a private link",
    links.every(l => l.includes("#p=")), links[0]);
  // Decode every token in-page and verify the draw end to end.
  const verify = await page.evaluate((links) => {
    const out = [];
    for (const l of links) {
      const tok = l.split("#p=")[1];
      out.push(window.SS_CORE.parseToken(tok));
    }
    return out;
  }, links);
  check("all tokens parse", verify.every(Boolean));
  const givers = verify.map(p => p.you).sort();
  const receivers = verify.map(p => p.got).sort();
  check("givers are the five names", JSON.stringify(givers) === JSON.stringify([...names].sort()));
  check("receivers are a permutation", JSON.stringify(receivers) === JSON.stringify([...names].sort()));
  check("nobody drew themself", verify.every(p => p.you !== p.got));
  const ana = verify.find(p => p.you === "Ana"), ben = verify.find(p => p.you === "Ben");
  check("kept-apart pair honored both ways", ana.got !== "Ben" && ben.got !== "Ana",
    `Ana->${ana.got} Ben->${ben.got}`);
  check("budget label baked into every token",
    verify.every(p => p.b === "$50-$100"));
  check("every match has 3 gift picks", verify.every(p => Array.isArray(p.pi) && p.pi.length === 3));
  check("private links stay short enough to forward", links.every(l => l.length < 300), Math.max(...links.map(l => l.length)));
  await page.screenshot({ path: OUT + "shot-share-desktop.png", fullPage: false });

  /* ---------- Reveal: open Esme's link fresh ---------- */
  const esmeLink = links[names.indexOf("Esme")];
  const rpage = await newServedPage({ viewport: { width: 390, height: 844 } });
  const rerrors = [];
  rpage.on("pageerror", e => rerrors.push(String(e)));
  await rpage.goto(esmeLink, { waitUntil: "networkidle" });
  check("reveal loads clean", rerrors.length === 0, rerrors.join("; "));
  check("cover names the owner", (await rpage.locator("#coverLine").innerText()).includes("Esme"));
  check("match hidden before peek", await rpage.locator("#revealCard").isHidden());
  await rpage.screenshot({ path: OUT + "shot-reveal-cover-mobile.png" });
  await rpage.click("#peekBtn");
  const got = await rpage.locator("#gotName").innerText();
  const esmePayload = verify.find(p => p.you === "Esme");
  check("revealed match matches the token", got === esmePayload.got, got + " vs " + esmePayload.got);
  check("gift card visible", await rpage.locator(".giftcard").isVisible());
  const gift1 = await rpage.locator("#giftName").innerText();
  const pickNames = await rpage.evaluate((ids) =>
    ids.map(id => (window.SS_BANK.ideas.find(i => i.id === id) || {}).name), esmePayload.pi);
  check("gift pick is pick #1 from the token", gift1 === pickNames[0], gift1);
  await rpage.click("#anotherPick");
  const gift2 = await rpage.locator("#giftName").innerText();
  check("another pick cycles", gift2 === pickNames[1], gift2);
  // Save-card produces a real PNG download.
  const dlPromise = rpage.waitForEvent("download", { timeout: 5000 }).catch(() => null);
  await rpage.click("#saveCard");
  const dl = await dlPromise;
  check("save card downloads a PNG", !!dl && (await dl.suggestedFilename()).endsWith(".png"),
    dl && (await dl.suggestedFilename()));
  await rpage.screenshot({ path: OUT + "shot-reveal-mobile.png" });
  // Geometry probe at 390px: no sideways scroll.
  const overflow = await rpage.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("no horizontal overflow at 390px", overflow <= 0, overflow);

  /* ---------- Mobile organizer + tap targets ---------- */
  const mpage = await newServedPage({ viewport: { width: 390, height: 844 } });
  await mpage.goto(BASE + "/", { waitUntil: "networkidle" });
  const mOverflow = await mpage.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("home: no horizontal overflow at 390px", mOverflow <= 0, mOverflow);
  const ctaBox = await mpage.locator(".hero .cta").boundingBox();
  check("hero CTA tap height >= 44px", ctaBox && ctaBox.height >= 44, ctaBox && ctaBox.height);
  await mpage.screenshot({ path: OUT + "shot-hero-mobile.png" });

  /* ---------- Error paths ---------- */
  const epage = await newServedPage({ viewport: { width: 390, height: 844 } });
  await epage.goto(BASE + "/", { waitUntil: "networkidle" });
  await epage.click("#startBtn"); await epage.waitForTimeout(400);
  await epage.click("#toStep2");
  await epage.locator("#peopleRows .prow").nth(0).locator(".pname").fill("Solo");
  await epage.locator("#peopleRows .prow").nth(1).locator(".pname").fill("Duo");
  await epage.click("#toStep3");
  check("two names blocked with a plain error",
    (await epage.locator("#err2").isVisible()) &&
    (await epage.locator("#err2").innerText()).includes("at least three"));
  // Impossible draw: 3 people, A apart from both others.
  await epage.locator("#peopleRows .prow").nth(2).locator(".pname").fill("Trio");
  await epage.click("#toStep3");
  check("step 3 reached with 3 names", await epage.locator("#step3").isVisible());
  // pair row 1: Solo <> Duo (add + defaults). Pair 2: Solo <> Trio.
  await epage.click("#addPair");
  await epage.click("#addPair");
  const pairRows = epage.locator("#pairRows .pairrow");
  await pairRows.nth(1).locator("select").nth(0).selectOption({ index: 0 }); // Solo
  await pairRows.nth(1).locator("select").nth(1).selectOption({ index: 2 }); // Trio
  await epage.click("#drawBtn");
  await epage.waitForTimeout(200);
  check("impossible draw stays on step 3 with error",
    (await epage.locator("#step3").isVisible()) &&
    (await epage.locator("#err3").innerText()).includes("cannot work"));
  // Tampered link.
  await epage.goto(BASE + "/#p=garbagegarbage", { waitUntil: "networkidle" });
  await epage.locator("#revealError").waitFor({ state: "visible", timeout: 4000 }).catch(() => {});
  check("tampered link shows the friendly error",
    await epage.locator("#revealError").isVisible());

  /* ---------- Duplicate names ---------- */
  const dpage = await newServedPage({ viewport: { width: 390, height: 844 } });
  await dpage.goto(BASE + "/", { waitUntil: "networkidle" });
  await dpage.click("#startBtn"); await dpage.waitForTimeout(400);
  await dpage.click("#toStep2");
  for (const [i, n] of ["Sam", "Sam", "Jo"].entries()) {
    await dpage.locator("#peopleRows .prow").nth(i).locator(".pname").fill(n);
  }
  await dpage.click("#toStep3");
  await dpage.click("#drawBtn");
  await dpage.locator("#dupeWarn").waitFor({ state: "visible", timeout: 4000 }).catch(() => {});
  check("duplicate names trigger the check-twice warning",
    await dpage.locator("#dupeWarn").isVisible());

  /* ---------- Unicode names roundtrip ---------- */
  const upage = await newServedPage({ viewport: { width: 390, height: 844 } });
  await upage.goto(BASE + "/", { waitUntil: "networkidle" });
  await upage.click("#startBtn"); await upage.waitForTimeout(400);
  await upage.click("#toStep2");
  for (const [i, n] of ["Zoë", "小明", "Renée"].entries()) {
    await upage.locator("#peopleRows .prow").nth(i).locator(".pname").fill(n);
  }
  await upage.click("#toStep3");
  await upage.click("#drawBtn");
  await upage.locator(".sharecard .link").first().waitFor({ state: "visible", timeout: 4000 }).catch(() => {});
  const ulinks = await upage.locator(".sharecard .link").allInnerTexts();
  const uverify = await upage.evaluate((links) =>
    links.map(l => window.SS_CORE.parseToken(l.split("#p=")[1])), ulinks);
  check("unicode names survive the token roundtrip",
    uverify.every(Boolean) &&
    JSON.stringify(uverify.map(p => p.you).sort()) === JSON.stringify(["Zoë", "小明", "Renée"].sort()));

  /* ---------- Bulk add: 25-person paste, mobile, end to end ---------- */
  const bpage = await newServedPage({ viewport: { width: 390, height: 844 } });
  const berrors = [];
  bpage.on("pageerror", e => berrors.push(String(e)));
  await bpage.goto(BASE + "/", { waitUntil: "networkidle" });
  await bpage.click("#startBtn"); await bpage.waitForTimeout(400);
  await bpage.click("#toStep2");
  await bpage.click("#bulkToggle");
  check("bulk panel opens", await bpage.locator("#bulkPanel").isVisible());
  const lines25 = [];
  for (let i = 1; i <= 25; i++) lines25.push("Person " + String(i).padStart(2, "0"));
  lines25[0] = "Person 01, cooking";
  lines25[1] = "Person 02, COZY";
  lines25[2] = "Person 03, surprise me";
  lines25.splice(5, 0, ""); // an empty line is skipped quietly
  await bpage.fill("#bulkText", lines25.join("\n"));
  await bpage.click("#bulkAdd");
  const bSummary = await bpage.locator("#bulkSummary").innerText();
  check("25-person paste says Added 25 people", bSummary.includes("Added 25 people."), bSummary);
  check("25 rows after import", await bpage.locator("#peopleRows .prow").count() === 25,
    await bpage.locator("#peopleRows .prow").count());
  check("comma interest imported",
    await bpage.locator("#peopleRows .prow").nth(0).locator(".phint").inputValue() === "cooking");
  check("interest match does not care about case",
    await bpage.locator("#peopleRows .prow").nth(1).locator(".phint").inputValue() === "cozy");
  check("surprise me imported as its own value",
    await bpage.locator("#peopleRows .prow").nth(2).locator(".phint").inputValue() === "surprise");
  await bpage.click("#drawNowBtn");
  await bpage.waitForTimeout(200);
  check("25-person draw reaches the share step", await bpage.locator("#step4").isVisible());
  check("25 share cards", await bpage.locator(".sharecard").count() === 25,
    await bpage.locator(".sharecard").count());
  const blinks = await bpage.locator(".sharecard .link").allInnerTexts();
  const bverify = await bpage.evaluate((links) =>
    links.map(l => window.SS_CORE.parseToken(l.split("#p=")[1])), blinks);
  check("25-person tokens all parse", bverify.every(Boolean));
  check("25-person draw: nobody drew themself", bverify.every(p => p.you !== p.got));
  check("25-person draw: every match has 3 gift picks",
    bverify.every(p => Array.isArray(p.pi) && p.pi.length === 3));
  check("bulk walk had no JS errors", berrors.length === 0, berrors.join("; "));
  const boverflow = await bpage.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("no horizontal overflow at 390px after big import", boverflow <= 0, boverflow);

  /* ---------- Bulk add: cap at 30, unknown interest, duplicates ---------- */
  const cpage2 = await newServedPage({ viewport: { width: 390, height: 844 } });
  await cpage2.goto(BASE + "/", { waitUntil: "networkidle" });
  await cpage2.click("#startBtn"); await cpage2.waitForTimeout(400);
  await cpage2.click("#toStep2");
  await cpage2.click("#bulkToggle");
  const big = ["Maria, cooking", "Sam, skateboarding", "Maria, tech", ", books"];
  for (let i = 4; i <= 35; i++) big.push("Guest " + i);
  await cpage2.fill("#bulkText", big.join("\n"));
  await cpage2.click("#bulkAdd");
  const cSummary = await cpage2.locator("#bulkSummary").innerText();
  check("cap summary says Added 30 people", cSummary.includes("Added 30 people."), cSummary);
  check("cap summary counts lines over the limit",
    cSummary.includes("5 lines skipped — over the 30 person limit."), cSummary);
  check("cap summary counts the line with no name",
    cSummary.includes("1 line skipped. Each line needs a name first."), cSummary);
  check("cap summary flags the unknown interest",
    cSummary.includes("1 name had an interest we do not know."), cSummary);
  check("rows stop at 30", await cpage2.locator("#peopleRows .prow").count() === 30,
    await cpage2.locator("#peopleRows .prow").count());
  check("first Maria kept her cooking interest",
    await cpage2.locator("#peopleRows .prow").nth(0).locator(".phint").inputValue() === "cooking");
  check("unknown interest imported as blank",
    await cpage2.locator("#peopleRows .prow").nth(1).locator(".phint").inputValue() === "");
  check("duplicate Maria imported as her own row",
    await cpage2.locator("#peopleRows .prow").nth(2).locator(".pname").inputValue() === "Maria");
  await cpage2.click("#drawNowBtn");
  await cpage2.locator("#dupeWarn").waitFor({ state: "visible", timeout: 4000 }).catch(() => {});
  check("imported duplicate names trigger the check-twice warning",
    await cpage2.locator("#dupeWarn").isVisible());
  check("30 share cards after capped import",
    await cpage2.locator(".sharecard").count() === 30);

  /* ---------- Bulk add: CSV file + a Surprise me draw ---------- */
  const fpage = await newServedPage({ viewport: { width: 390, height: 844 } });
  await fpage.goto(BASE + "/", { waitUntil: "networkidle" });
  await fpage.click("#startBtn"); await fpage.waitForTimeout(400);
  await fpage.click("#toStep2");
  await fpage.click("#bulkToggle");
  await fpage.locator("#bulkFile").setInputFiles({
    name: "group.csv", mimeType: "text/csv",
    buffer: Buffer.from("Ana,cooking\nBen,Books\nCleo\n", "utf8")
  });
  await fpage.waitForFunction(
    () => !document.getElementById("bulkSummary").hidden, null, { timeout: 4000 }).catch(() => {});
  const fSummary = await fpage.locator("#bulkSummary").innerText();
  check("CSV file says Added 3 people", fSummary.includes("Added 3 people."), fSummary);
  check("CSV first column is the name",
    await fpage.locator("#peopleRows .prow").nth(0).locator(".pname").inputValue() === "Ana");
  check("CSV second column is the interest",
    await fpage.locator("#peopleRows .prow").nth(0).locator(".phint").inputValue() === "cooking");
  check("CSV interest match does not care about case",
    await fpage.locator("#peopleRows .prow").nth(1).locator(".phint").inputValue() === "books");
  check("CSV row with no interest stays blank",
    await fpage.locator("#peopleRows .prow").nth(2).locator(".phint").inputValue() === "");
  await fpage.locator("#peopleRows .prow").nth(2).locator(".phint").selectOption("surprise");
  check("surprise option stores its own value",
    await fpage.locator("#peopleRows .prow").nth(2).locator(".phint").inputValue() === "surprise");
  await fpage.click("#toStep3");
  await fpage.click("#drawBtn");
  await fpage.waitForTimeout(200);
  check("surprise draw reaches the share step", await fpage.locator("#step4").isVisible());
  const flinks = await fpage.locator(".sharecard .link").allInnerTexts();
  const fverify = await fpage.evaluate((links) =>
    links.map(l => window.SS_CORE.parseToken(l.split("#p=")[1])), flinks);
  check("surprise draw tokens parse with 3 picks each",
    fverify.every(p => p && Array.isArray(p.pi) && p.pi.length === 3));

  await browser.close();
  console.log(`\nflow tests: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("HARNESS ERROR:", e); process.exit(2); });
