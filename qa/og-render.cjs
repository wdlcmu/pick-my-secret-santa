const { chromium } = require("/opt/muse/assets/spaces/ts-runtime/dist/node_modules/playwright");
const fs = require("fs");
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/meta-chromium/chrome",
    args: ["--no-sandbox", "--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks"] });
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 } });
  const SITE_DIR = require("path").join(__dirname, "..", "site");
  await ctx.route("https://pickmysecretsanta.com/**", async (route) => {
    const url = new URL(route.request().url());
    let name = decodeURIComponent(url.pathname);
    if (name === "/") name = "/og-card.html";
    try {
      const body = fs.readFileSync(require("path").join(SITE_DIR, name));
      await route.fulfill({ status: 200, contentType: "text/html", body });
    } catch (e) { await route.fulfill({ status: 404, body: "nf" }); }
  });
  const page = await ctx.newPage();
  await page.goto("https://pickmysecretsanta.com/og-card.html", { waitUntil: "networkidle" });
  await page.screenshot({ path: require("path").join(SITE_DIR, "og-image.png") });
  console.log("og-image.png written");
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
