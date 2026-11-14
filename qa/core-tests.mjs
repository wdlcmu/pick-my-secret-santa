/* Core logic tests for Pick My Secret Santa.
   Run: node qa/core-tests.mjs  (from the build root) */
import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const CORE = require("../site/core.js");
const bankSrc = fs.readFileSync(new URL("../site/bank.js", import.meta.url), "utf8");
const BANK = JSON.parse(bankSrc.slice(bankSrc.indexOf("{"), bankSrc.lastIndexOf("}") + 1)).ideas;

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; console.log("FAIL:", name, extra || ""); }
}

// 1. Bank integrity — the copy matches the fleet bank size and bands.
//    (Was 111 at the Oct 25 copy; the Oct 30, 2026 re-copy holds 212.)
check("bank has 212 ideas", BANK.length === 212, BANK.length);
const bands = [...new Set(BANK.map(i => i.budget))].sort();
check("bank bands are the 4 fleet bands",
  JSON.stringify(bands) === JSON.stringify(["m100", "m2550", "m50100", "u25"]), bands);

// 2. Draw validity at scale: 400 random groups, sizes 3..30.
const rand = CORE.rng(20261025);
let valid = 0, trials = 0;
for (let t = 0; t < 400; t++) {
  const n = 3 + Math.floor(rand() * 28);
  const apart = [];
  const pairCount = Math.floor(rand() * Math.min(6, n - 1));
  for (let p = 0; p < pairCount; p++) {
    const a = Math.floor(rand() * n), b = Math.floor(rand() * n);
    if (a !== b) apart.push([a, b]);
  }
  const seed = (rand() * 1e9) | 0;
  const m = CORE.drawGroup(n, apart, seed);
  trials++;
  if (!m) continue; // constrained case may be impossible; counted below
  const seen = new Set(m);
  let ok = seen.size === n;
  for (let g = 0; g < n && ok; g++) {
    if (m[g] === g) ok = false;
    for (const [a, b] of apart) {
      if ((g === a && m[g] === b) || (g === b && m[g] === a)) ok = false;
    }
  }
  if (ok) valid++;
  else check("draw " + t + " is a clean derangement", false, { n, apart, m });
}
console.log(`draw trials: ${trials}, returned draws: ${valid} (all returned draws valid)`);
check("at least 370 of 400 random groups drew", valid >= 370, valid);

// 3. Unconstrained draws always succeed, sizes 3..30.
for (let n = 3; n <= 30; n++) {
  const m = CORE.drawGroup(n, [], 1000 + n);
  check("unconstrained draw n=" + n, !!m && new Set(m).size === n && m.every((r, g) => r !== g));
}

// 4. Impossible draws return null, never a broken match.
//    A<->B apart in a 3-person group where A,B apart leaves no legal draw for C? Use:
//    3 people, pairs (0,1) and (0,2): person 0 can draw nobody -> impossible.
check("impossible draw returns null",
  CORE.drawGroup(3, [[0, 1], [0, 2]], 42) === null);
//    2 people is below the minimum.
check("two people returns null", CORE.drawGroup(2, [], 42) === null);

// 5. Exclusion honored in both directions, targeted case.
for (let s = 0; s < 50; s++) {
  const m = CORE.drawGroup(4, [[0, 1]], 5000 + s);
  check("pair apart honored seed " + s, !!m && m[0] !== 1 && m[1] !== 0);
}

// 6. Token roundtrip, including unicode names and gift picks.
const payload = {
  v: 1, g: "Familie 🎄", b: "$25-$50",
  you: "Zoë Ñ", got: "小明",
  pi: ["pour-over-coffee-dripper-with-paper-filters", "cast-iron-skillet-10-inch-pre-seasoned"]
};
const tok = CORE.makeToken(payload);
check("token is url-safe", /^[A-Za-z0-9\-_]+$/.test(tok), tok);
const back = CORE.parseToken(tok);
check("token roundtrips", JSON.stringify(back) === JSON.stringify(payload));
check("tampered token rejected", CORE.parseToken(tok.slice(0, -3) + "zzz") === null);
check("garbage token rejected", CORE.parseToken("not-a-token") === null);
check("empty token rejected", CORE.parseToken("") === null);

// 7. Full path enumeration: every budget band x every interest choice
//    returns at least one pick, and the top pick is always in-band.
const interests = ["", "surprise", "cooking", "tech", "outdoors", "games", "fitness",
  "travel", "cozy", "books", "science", "music", "gardening"];
let thinCells = [];
for (const band of ["u25", "m2550", "m50100", "m100"]) {
  for (const interest of interests) {
    const picks = CORE.pickGifts(BANK, band, interest, CORE.rng(7), {});
    check(`cell ${band}/${interest || "none"} returns picks`, picks.length >= 1);
    check(`cell ${band}/${interest || "none"} top pick in band`,
      picks.length === 0 || picks[0].budget === band, picks[0] && picks[0].budget);
    const matching = BANK.filter(i => i.budget === band && (!interest || i.interests.includes(interest)));
    if (interest && matching.length < 3) thinCells.push(`${band}/${interest}: ${matching.length} interest matches in band`);
    if (interest && matching.length > 0) {
      check(`cell ${band}/${interest} top pick uses the interest`,
        picks[0].interests.includes(interest), picks[0] && picks[0].name);
    }
  }
}
console.log("thin cells (interest matches in band < 3):");
thinCells.forEach(c => console.log("  -", c));

// 8. Group variety: one draw never hands the same top pick to two givers
//    while the band pool is larger than the group.
{
  const r = CORE.rng(99);
  const used = {};
  const tops = [];
  for (let g = 0; g < 10; g++) {
    const picks = CORE.pickGifts(BANK, "m2550", "", r, used);
    if (picks.length) { used[picks[0].id] = true; tops.push(picks[0].id); }
  }
  check("10 givers get distinct top picks in the 40-idea band",
    new Set(tops).size === tops.length, tops);
}

// 9. Surprise me: stored as its own value, picks like a blank hint.
//    Same seed, same picks as "" in every band.
for (const band of ["u25", "m2550", "m50100", "m100"]) {
  const sp = CORE.pickGifts(BANK, band, "surprise", CORE.rng(5), {});
  const bl = CORE.pickGifts(BANK, band, "", CORE.rng(5), {});
  check(`surprise returns picks in ${band}`, sp.length >= 1);
  check(`surprise top pick in band ${band}`, sp.length === 0 || sp[0].budget === band);
  check(`surprise picks match blank picks in ${band}`,
    JSON.stringify(sp.map(p => p.id)) === JSON.stringify(bl.map(p => p.id)));
}

// 10. Kid-signal guard (Gift Ideas UX Review Problem D, Nov 10,
//     2026): Kid-category ideas need a kid signal. pickGifts has no
//     kid input at all, so it never returns them; matchByWords
//     filters them unless the words say child.
const kidIdea = p => p.category === "Kid";
for (const band of ["u25", "m2550", "m50100", "m100"]) {
  for (const interest of interests) {
    const picks = CORE.pickGifts(BANK, band, interest, CORE.rng(11), {});
    check(`guard: pickGifts ${band}/${interest || "none"} returns no Kid picks`,
      picks.every(p => !kidIdea(p)), picks.map(p => p.id));
  }
}
{
  // The screenshot case: adult books+cozy words, no kid signal.
  const r1 = CORE.matchByWords(BANK, "m2550", "Reads novels in a big cozy chair");
  check("guard: books+cozy words return picks", r1.picks.length >= 1, r1.picks.length);
  check("guard: books+cozy words return no Kid picks",
    r1.picks.every(p => !kidIdea(p)), r1.picks.map(p => p.id));
  check("guard: storybook is not among books+cozy picks",
    !r1.picks.some(p => p.id === "personalized-storybook-starring-the-child"));
  // A kid signal lets Kid ideas compete again.
  const r2 = CORE.matchByWords(BANK, "m2550", "My kid loves dinosaurs");
  check("guard: kid words return picks", r2.picks.length >= 1, r2.picks.length);
  check("guard: kid words allow Kid picks",
    r2.picks.some(p => kidIdea(p)), r2.picks.map(p => p.id));
  // Gibberish (no-match fallback slice) is guarded too.
  const r3 = CORE.matchByWords(BANK, "m2550", "Zebra xylophone quantum");
  check("guard: no-match fallback returns no Kid picks",
    r3.picks.every(p => !kidIdea(p)), r3.picks.map(p => p.id));
  // Adult cooking stays clean.
  const r4 = CORE.matchByWords(BANK, "m2550", "Loves cooking and trying new recipes");
  check("guard: cooking words return no Kid picks",
    r4.picks.every(p => !kidIdea(p)), r4.picks.map(p => p.id));
}

// 11. Free-text budget (SPEC-SS-BUDGETFREE-01, Nov 13, 2026):
//     the optional `bf` token key. The token's `b` stays a real
//     band label (the fallback band the picks came from); `bf`
//     is display text held to name hygiene at a 30-char cap.
{
  const bfPayload = {
    v: 1, g: "Familie 🎄", b: "$25-$50", bf: "20€",
    you: "Zoë Ñ", got: "小明",
    pi: ["pour-over-coffee-dripper-with-paper-filters"]
  };
  const bfTok = CORE.makeToken(bfPayload);
  const bfBack = CORE.parseToken(bfTok);
  check("bf token roundtrips", JSON.stringify(bfBack) === JSON.stringify(bfPayload));
  check("bf token keeps the fallback band label", bfBack && bfBack.b === "$25-$50");
  const bfOrg = { ...bfPayload, o: "Maria" };
  check("bf + organizer-name token roundtrips",
    JSON.stringify(CORE.parseToken(CORE.makeToken(bfOrg))) === JSON.stringify(bfOrg));
  check("bf at the 30-char cap parses",
    CORE.parseToken(CORE.makeToken({ ...bfPayload, bf: "x".repeat(30) })) !== null);
  check("bf over the 30-char cap rejected",
    CORE.parseToken(CORE.makeToken({ ...bfPayload, bf: "x".repeat(31) })) === null);
  check("bf empty rejected",
    CORE.parseToken(CORE.makeToken({ ...bfPayload, bf: "" })) === null);
  check("bf untrimmed rejected",
    CORE.parseToken(CORE.makeToken({ ...bfPayload, bf: " 20€ " })) === null);
  check("bf with a control char rejected",
    CORE.parseToken(CORE.makeToken({ ...bfPayload, bf: "20€\n" })) === null);
  check("bf non-string rejected",
    CORE.parseToken(CORE.makeToken({ ...bfPayload, bf: 20 })) === null);
  check("bf does not rescue a bad band label",
    CORE.parseToken(CORE.makeToken({ ...bfPayload, b: "20€" })) === null);
  check("unknown extra key still rejected",
    CORE.parseToken(CORE.makeToken({ ...bfPayload, zz: "x" })) === null);
  // A free-text draw's picks come from the middle band, exactly
  // like a $25-$50 draw: same seed, same picks.
  const fp = CORE.pickGifts(BANK, "m2550", "cooking", CORE.rng(42), {});
  check("fallback band m2550 returns picks for a free-text draw",
    fp.length >= 1 && fp.every(p => p.budget === "m2550"));
}

// 12. Portuguese pack (SPEC-SS-AMIGO-PT-01, Nov 13, 2026): the PT
//     pack mirrors the ES pack key for key, placeholders and
//     plural pairs included; the load-bearing PT strings are the
//     approval package's drafted ones; a PT payload round-trips
//     its language; the site wiring points at the PT page/pack.
{
  const loadPack = (file) => {
    const w = {};
    const src = fs.readFileSync(new URL(file, import.meta.url), "utf8");
    new Function("window", src)(w);
    return w;
  };
  const ES = loadPack("../site/i18n-es.js");
  const PT = loadPack("../site/i18n-pt.js");
  const esKeys = Object.keys(ES.SS_ES);
  const ptKeys = Object.keys(PT.SS_PT);
  check("PT pack holds every ES key", esKeys.every(k => k in PT.SS_PT),
    esKeys.filter(k => !(k in PT.SS_PT)).slice(0, 5));
  check("PT pack adds no keys over ES (full parity since Task M closed the group_link_warning gap)",
    JSON.stringify(ptKeys.filter(k => !(k in ES.SS_ES))) === JSON.stringify([]),
    ptKeys.filter(k => !(k in ES.SS_ES)));
  check("PT values are all non-empty strings",
    ptKeys.every(k => typeof PT.SS_PT[k] === "string" && PT.SS_PT[k].trim().length > 0));
  const ph = (s) => { const m = String(s).match(/\{[a-z]+\}/g); return m ? [...new Set(m)].sort().join(",") : ""; };
  check("PT placeholders match ES per key",
    esKeys.every(k => ph(ES.SS_ES[k]) === ph(PT.SS_PT[k])),
    esKeys.filter(k => ph(ES.SS_ES[k]) !== ph(PT.SS_PT[k])).slice(0, 5));
  check("PT plural pairs match ES per key",
    esKeys.every(k => String(ES.SS_ES[k]).includes(" | ") === String(PT.SS_PT[k]).includes(" | ")));
  check("PT months are 12", PT.SS_PT_MONTHS.length === 12, PT.SS_PT_MONTHS.length);
  check("PT DOM table mirrors ES (count, selector, mode, index)",
    PT.SS_PT_DOM.length === ES.SS_ES_DOM.length &&
    ES.SS_ES_DOM.every((e, i) => PT.SS_PT_DOM[i][0] === e[0] && PT.SS_PT_DOM[i][1] === e[1] && PT.SS_PT_DOM[i][3] === e[3]),
    PT.SS_PT_DOM.length + " vs " + ES.SS_ES_DOM.length);
  check("PT DOM values are all non-empty",
    PT.SS_PT_DOM.every(e => typeof e[2] === "string" && e[2].trim().length > 0));
  // Load-bearing strings, verbatim from the approval package.
  check("PT manage bookmark warning is the package's drafted text",
    PT.SS_PT["manage_card_on_share.bookmark_warning"] === "Guarde nos favoritos ou salve este link: quem tiver este link pode administrar o sorteio e abrir o link privado de cada pessoa. Cuide dele como uma senha e nunca poste no grupo.");
  check("PT manage group-link warning present with the password line",
    typeof PT.SS_PT["manage_view.group_link_warning"] === "string" &&
    PT.SS_PT["manage_view.group_link_warning"].includes("como uma senha"));
  check("PT share heading is the package's send-each-link line",
    PT.SS_PT["share.send_each_link"] === "Envie cada link privado.");
  const lost = PT.SS_PT_DOM.find(e => e[0] === "#lostLinkHint");
  check("PT lost-link hint present in the DOM table",
    !!lost && lost[2] === "Se você perder este link, peça ao seu organizador para enviar de novo: ele consegue.");
  // PT payload round-trip: the frozen token carries no language;
  // the short-link payload copy stamps l:"pt" and survives a
  // JSON round-trip untouched, and the token still validates.
  const tok = CORE.makeToken({ v: 1, g: "Grupo", b: "$25-$50", you: "Mariana", got: "Diego", pi: ["insulated-steel-water-bottle-32-oz"] });
  const parsed = CORE.parseToken(tok);
  check("PT draw token validates with no language field", !!parsed && !("l" in parsed));
  const payload = { ...parsed, l: "pt" };
  const round = JSON.parse(JSON.stringify(payload));
  check("PT payload round-trips l:pt", round.l === "pt" && round.you === "Mariana" && round.got === "Diego");
  // Site wiring (source-level).
  const appSrc = fs.readFileSync(new URL("../site/app.js", import.meta.url), "utf8");
  check("app.js stamps the record language generically", appSrc.includes("sealedRec.lang = LANG"));
  check("app.js stamps payload.l from the record", appSrc.includes("payload.l = rec.lang"));
  check("app.js stamps groupBody.lang from the record", appSrc.includes("groupBody.lang = rec.lang"));
  check("app.js resolves pt as a language", appSrc.includes('l === "es" || l === "pt"'));
  const idxSrc = fs.readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
  check("index loads the PT pack at rk08", idxSrc.includes("i18n-pt.js?v=rk08"));
  check("index loads the ES pack at rk07", idxSrc.includes("i18n-es.js?v=rk07"));
  check("index loads app.js at rk07", idxSrc.includes("app.js?v=rk07"));
  check("index links the PT page from the homepage", idxSrc.includes('href="/amigo-secreto-online"'));
  check("index declares the pt hreflang", idxSrc.includes('hreflang="pt" href="https://pickmysecretsanta.com/amigo-secreto-online"'));
  const ptPage = fs.readFileSync(new URL("../site/amigo-secreto-online.html", import.meta.url), "utf8");
  check("PT page mounts the variant draw in pt", ptPage.includes('data-vdraw data-lang="pt"'));
  check("PT page carries the package title", ptPage.includes("<title>Amigo Secreto Online: sorteie os nomes grátis, sem cadastro</title>"));
  check("PT page carries the package H1", ptPage.includes("<h1>Amigo secreto online, sem complicação</h1>"));
  check("PT page carries the package privacy line", ptPage.includes("Nosso servidor guarda cada nome e cada par para os links curtos funcionarem, de um jeito que a gente consegue ler."));
  const smSrc = fs.readFileSync(new URL("../site/sitemap.xml", import.meta.url), "utf8");
  check("sitemap lists the PT page", smSrc.includes("<loc>https://pickmysecretsanta.com/amigo-secreto-online</loc>"));
  const vdSrc = fs.readFileSync(new URL("../site/variant-draw.js", import.meta.url), "utf8");
  check("variant draw stamps lang pt on the record", vdSrc.includes('if (PT) rec.lang = "pt";'));
}

// 13. Task M (Nov 13, 2026): variant-surface parity — the free-text
//     budget chip reaches every draw surface, the Ask strings live
//     in the language packs, and the ES pack carries the manage
//     group-link warning app.js calls.
{
  const loadPack = (file) => {
    const w = {};
    const src = fs.readFileSync(new URL(file, import.meta.url), "utf8");
    new Function("window", src)(w);
    return w;
  };
  const ES = loadPack("../site/i18n-es.js");
  const PT = loadPack("../site/i18n-pt.js");
  const vd = fs.readFileSync(new URL("../site/variant-draw.js", import.meta.url), "utf8");
  // Free-text budget in the variant draw, all three languages.
  check("variant draw carries the free-text chip label in EN/ES/PT",
    vd.includes('budgetFree: "Other amount"') && vd.includes('budgetFree: "Otro monto"') && vd.includes('budgetFree: "Outro valor"'));
  check("variant draw caps the free-text budget at 30 chars",
    vd.includes("var BUDGET_FREE_MAX = 30;") && vd.includes("freeInput.maxLength = 30"));
  check("variant draw cleans the free-text budget with SS_CORE hygiene",
    vd.includes("CORE.stripInvisible") && vd.includes("function cleanBudgetFree(CORE, s)"));
  check("variant draw rides bf on the token payload", vd.includes("if (budgetFree) payload.bf = budgetFree;"));
  check("variant draw rides bf on the record", vd.includes("if (budgetFree) rec.bf = budgetFree;"));
  check("variant draw rides bf on the group record", vd.includes("if (rec.bf) groupBody.bf = rec.bf;"));
  check("variant draw displays bf over the band label", vd.includes("rec.bf || rec.budget"));
  check("variant free chip falls back to the middle band for picks", vd.includes('band = "m2550";'));
  // Every draw entry surface: the homepage carries the chip in
  // static HTML; each variant page loads the shared variant draw,
  // which now builds the chip on mount.
  const variantPages = ["amigo-invisible.html", "amigo-secreto-online.html", "amigo-secreto-sin-correo.html",
    "amigo-secreto.html", "draw-names-online.html", "gift-exchange-name-draw.html", "kris-kringle-generator.html",
    "secret-santa-for-remote-teams.html", "secret-santa-generator-for-classroom.html", "secret-santa-generator-no-sign-up.html",
    "secret-santa-generator-with-exclusions.html", "secret-santa-generator-without-email.html", "secret-santa-generator.html",
    "secret-santa-name-picker.html", "secret-snowflake-generator.html", "virtual-secret-santa.html"];
  check("all 16 variant draw surfaces load variant-draw.js",
    variantPages.every(f => fs.readFileSync(new URL("../site/" + f, import.meta.url), "utf8").includes('src="/variant-draw.js"')));
  check("homepage draw surface carries the free-text chip in static HTML",
    fs.readFileSync(new URL("../site/index.html", import.meta.url), "utf8").includes('id="budgetFreeChip"'));
  // Ask strings: keys exist in both packs with identical key sets.
  const askKeys = ["ask_words.recipient_helper", "ask_words.recipient_privacy",
    "ask_words.chip_grill", "ask_words.chip_trails", "ask_words.chip_chair"];
  check("Ask words keys present in both packs (parity)",
    askKeys.every(k => typeof ES.SS_ES[k] === "string" && ES.SS_ES[k].length > 0 &&
                       typeof PT.SS_PT[k] === "string" && PT.SS_PT[k].length > 0));
  check("Ask pill key present in both packs",
    typeof ES.SS_ES["ask_entry_points.ask_about_draw"] === "string" &&
    typeof PT.SS_PT["ask_entry_points.ask_about_draw"] === "string");
  // Ask DOM coverage: both DOM tables translate the recipient
  // helper line, the privacy line, both untranslated chip groups
  // and the Ask pill, with values matching the string keys.
  const domHas = (DOM, sel, idx) => DOM.some(e => e[0] === sel && (idx == null || e[3] === idx) && typeof e[2] === "string" && e[2].length > 0);
  for (const [nm, P, D] of [["ES", ES.SS_ES, ES.SS_ES_DOM], ["PT", PT.SS_PT, PT.SS_PT_DOM]]) {
    check(nm + " DOM translates the recipient Ask helper line",
      D.some(e => e[0] === "#recipientAsk > p:nth-of-type(2)" && e[2] === P["ask_words.recipient_helper"]));
    check(nm + " DOM translates the recipient Ask privacy line",
      D.some(e => e[0] === "#recipientAsk p.hint" && e[2] === P["ask_words.recipient_privacy"]));
    check(nm + " DOM translates the recipient preset chips",
      [0, 1, 2].every(i => D.some(e => e[0] === ".recipientaskchip" && e[3] === i && e[2] === P[["ask_words.chip_grill", "ask_words.chip_trails", "ask_words.chip_chair"][i]])));
    check(nm + " DOM translates the gift-panel preset chips",
      [0, 1, 2].every(i => D.some(e => e[0] === ".askp-chip" && e[3] === i && e[2] === P[["ask_words.chip_grill", "ask_words.chip_trails", "ask_words.chip_chair"][i]])));
    check(nm + " DOM translates the Ask pill label",
      D.some(e => e[0] === "#sscPill" && e[2] === P["ask_entry_points.ask_about_draw"]));
    check(nm + " privacy line keeps the on-device / never-visible truth",
      /dispositivo|aparelho/.test(P["ask_words.recipient_helper"]) &&
      /nunca/.test(P["ask_words.recipient_privacy"]));
  }
  // The ES manage group-link warning app.js calls.
  check("ES pack carries manage_view.group_link_warning with the password line",
    typeof ES.SS_ES["manage_view.group_link_warning"] === "string" &&
    ES.SS_ES["manage_view.group_link_warning"].includes("contraseña"));
  check("PT pack still carries manage_view.group_link_warning",
    typeof PT.SS_PT["manage_view.group_link_warning"] === "string");
}

// 14. Task M2 (Nov 13, 2026): the floating Ask chat widget - its
//     static chrome is covered by DOM entries in both packs (with
//     values tied to the ask_entry_points.chat_* string keys), its
//     dynamic strings read the packs at send time, and app.js
//     re-applies the static table after the document is parsed
//     (the panel markup sits after the app.js tag, so an
//     entry-resolved language's single parse-time pass missed it
//     and the same-language setLang from the payload never
//     revisited it - the pill stayed English on ES/PT reveals).
{
  const loadPack = (file) => {
    const w = {};
    const src = fs.readFileSync(new URL(file, import.meta.url), "utf8");
    new Function("window", src)(w);
    return w;
  };
  const ES = loadPack("../site/i18n-es.js");
  const PT = loadPack("../site/i18n-pt.js");
  const chatKeys = ["chat_title", "chat_privacy", "chat_greeting", "chat_chip_setup",
    "chat_chip_organizer_see", "chat_draw_note", "chat_placeholder", "chat_input_aria",
    "chat_close_aria", "chat_chips_aria", "chat_who_ai", "chat_who_you", "chat_thinking",
    "chat_no_reply", "chat_error"];
  check("chat widget keys present in both packs (parity)",
    chatKeys.every(k => typeof ES.SS_ES["ask_entry_points." + k] === "string" && ES.SS_ES["ask_entry_points." + k].length > 0 &&
                        typeof PT.SS_PT["ask_entry_points." + k] === "string" && PT.SS_PT["ask_entry_points." + k].length > 0));
  for (const [nm, P, D] of [["ES", ES.SS_ES, ES.SS_ES_DOM], ["PT", PT.SS_PT, PT.SS_PT_DOM]]) {
    const K = (k) => P["ask_entry_points." + k];
    check(nm + " DOM translates the chat panel title",
      D.some(e => e[0] === "#sscTitle" && e[2] === K("chat_title")));
    check(nm + " DOM translates the chat helper line",
      D.some(e => e[0] === "#sscPanel > p:nth-of-type(1)" && e[2] === K("chat_privacy")));
    check(nm + " DOM translates the chat greeting bubble",
      D.some(e => e[0] === "#sscThread .ssc-bubble" && e[1] === "html" && e[3] === 0 &&
        e[2].includes(K("chat_greeting")) && e[2].includes(K("chat_who_ai"))));
    check(nm + " DOM translates the chat starter chips",
      D.some(e => e[0] === ".ssc-chip" && e[3] === 0 && e[2] === K("chat_chip_setup")) &&
      D.some(e => e[0] === ".ssc-chip" && e[3] === 1 && e[2] === K("chat_chip_organizer_see")));
    check(nm + " DOM translates the chat input placeholder",
      D.some(e => e[0] === "#sscQ" && e[1] === "ph" && e[2] === K("chat_placeholder")));
    check(nm + " DOM translates the chat input aria-label",
      D.some(e => e[0] === "#sscQ" && e[1] === "aria" && e[2] === K("chat_input_aria")));
    check(nm + " DOM translates the chat send button",
      D.some(e => e[0] === ".ssc-send" && e[2] === P["ask_entry_points.send"]));
    check(nm + " DOM translates the chat close aria-label",
      D.some(e => e[0] === "#sscClose" && e[1] === "aria" && e[2] === K("chat_close_aria")));
    check(nm + " DOM translates the chat chips group aria-label",
      D.some(e => e[0] === ".ssc-chips" && e[1] === "aria" && e[2] === K("chat_chips_aria")));
    check(nm + " DOM translates the chat draw note",
      D.some(e => e[0] === "#sscPanel .ssc-note" && e[2] === K("chat_draw_note")));
  }
  check("chat privacy line keeps the cannot-see-anyone's-draw truth in ES and PT",
    ES.SS_ES["ask_entry_points.chat_privacy"].includes("no puede ver el sorteo de nadie") &&
    PT.SS_PT["ask_entry_points.chat_privacy"].includes("não pode ver o sorteio de ninguém"));
  const appSrc2 = fs.readFileSync(new URL("../site/app.js", import.meta.url), "utf8");
  check("app.js re-applies the static table once the document is parsed",
    appSrc2.includes('document.addEventListener("DOMContentLoaded"') &&
    appSrc2.includes('if (LANG !== "en") { applyStaticEs(); refreshLocalizedChrome(); }'));
  const idxSrc2 = fs.readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
  check("index chat widget reads the packs for its dynamic strings",
    idxSrc2.includes("function ct(key, fallback)") &&
    idxSrc2.includes("ct('chat_who_you'") && idxSrc2.includes("ct('chat_who_ai'") &&
    idxSrc2.includes("ct('chat_thinking'") && idxSrc2.includes("ct('chat_no_reply'") &&
    idxSrc2.includes("ct('chat_error'"));
}

console.log(`\ncore tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
