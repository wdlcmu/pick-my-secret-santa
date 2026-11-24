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
    // Matches count against the SELECTABLE pool (non-Kid, non-retired):
    // since the Nov 20, 2026 retirement, m100/fitness has no dealable
    // interest match by design — its only fitness picks were the two
    // retired ones plus a Kid pick — so the top-pick assertion below
    // must not demand what the picker is forbidden to deal.
    const matching = BANK.filter(i => i.budget === band && i.category !== "Kid" && !i.retired && (!interest || i.interests.includes(interest)));
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
  check("index loads the PT pack at rk60", idxSrc.includes("i18n-pt.js?v=rk60"));
  check("index loads the ES pack at rk59", idxSrc.includes("i18n-es.js?v=rk59"));
  check("index loads app.js at rk47", idxSrc.includes("app.js?v=rk47"));
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
  // Every draw entry surface loads the shared variant draw, which
  // builds the chip on mount. Since SPEC-SS-CONVERGE-01 (Nov 18,
  // 2026) the homepage is one of those surfaces: it mounts the
  // module and loads its script and stylesheet exactly like the
  // variant pages, so the chip reaches it by the same guarantee.
  const variantPages = ["amigo-invisible.html", "amigo-secreto-online.html", "amigo-secreto-sin-correo.html",
    "amigo-secreto.html", "draw-names-online.html", "gift-exchange-name-draw.html", "kris-kringle-generator.html",
    "secret-santa-for-remote-teams.html", "secret-santa-generator-for-classroom.html", "secret-santa-generator-no-sign-up.html",
    "secret-santa-generator-with-exclusions.html", "secret-santa-generator-without-email.html", "secret-santa-generator.html",
    "secret-santa-name-picker.html", "secret-snowflake-generator.html", "virtual-secret-santa.html"];
  check("all 16 variant draw surfaces load variant-draw.js",
    variantPages.every(f => fs.readFileSync(new URL("../site/" + f, import.meta.url), "utf8").includes('src="/variant-draw.js"')));
  const idxSrc2 = fs.readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
  check("homepage draw surface mounts the shared variant draw (SPEC-SS-CONVERGE-01)",
    idxSrc2.includes('data-vdraw data-lang="en"') && idxSrc2.includes('src="/variant-draw.js"') &&
    idxSrc2.includes('href="/variant-draw.css"'));
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
  const idxSrc2 = fs.readFileSync(new URL("../site/helper.js", import.meta.url), "utf8");
  check("helper chat widget reads the packs for its dynamic strings",
    idxSrc2.includes("function ct(key, fallback)") &&
    idxSrc2.includes('ct("chat_who_you"') &&
    idxSrc2.includes('ct("chat_thinking"') && idxSrc2.includes('ct("chat_no_reply"') &&
    idxSrc2.includes('ct("chat_error"'));
  // Santa's Helper ES/PT (Nov 20, 2026): the full helper_* key set
  // lives in both packs, and helper.js resolves its chrome through it.
  const helperKeysES = Object.keys(ES.SS_ES).filter(k => k.startsWith("ask_entry_points.helper_"));
  const helperKeysPT = Object.keys(PT.SS_PT).filter(k => k.startsWith("ask_entry_points.helper_"));
  check("both packs carry the full helper string set (61 keys)",
    helperKeysES.length === 61 && helperKeysPT.length === 61 &&
    helperKeysES.every(k => k in PT.SS_PT));
  check("helper resolves its storage note and chrome through the packs",
    idxSrc2.includes('ct("helper_storage_note"') && idxSrc2.includes('ct("helper_entry_label"') &&
    idxSrc2.includes('ct("helper_chip_organize"'));
}


// 15. Gift-idea telemetry (Nov 20, 2026): the reveal carousel advance
//     fires gift_idea_next with the position now on screen and the
//     pick's bank id; the match-card save carries the same position
//     on the existing artifact_created event (no second save event).
{
  const appSrcT = fs.readFileSync(new URL("../site/app.js", import.meta.url), "utf8");
  check("app.js fires gift_idea_next from the carousel advance",
    appSrcT.includes('fleetTrack("gift_idea_next"') &&
    appSrcT.includes("trackGiftIdeaNext(pickIdx % picks.length + 1, picks[pickIdx % picks.length])"));
  check("gift_idea_next carries position, pick id and draw id props",
    appSrcT.includes("position: position") && appSrcT.includes("pick_id: pick && pick.id") &&
    appSrcT.includes('}, drawIdProps()));'));
  check("match-card artifact carries the on-screen gift position",
    appSrcT.includes("trackArtifact(giftPosition, pick,") &&
    appSrcT.includes("aProps.position = giftPosition") &&
    appSrcT.includes("aProps.save_route = saveRoute") &&
    appSrcT.includes('saveCardImage(payload, picks[pickIdx % picks.length], pickIdx % picks.length + 1)'));
  // The sealed-receipt picture delivers through the same mechanism
  // (Nov 21, 2026): no data-URL anchor download remains in
  // saveReceiptImage, and the sealed-receipt artifact carries its
  // own save_route so receipt saves read separately from card saves.
  const receiptFn = appSrcT.slice(appSrcT.indexOf("function saveReceiptImage"),
    appSrcT.indexOf("Group-chat announcement"));
  check("receipt picture routes through deliverCardImage, no data-URL anchor",
    receiptFn.includes("deliverCardImage(c, {") &&
    receiptFn.includes('boxId: "receiptSaveBox"') &&
    receiptFn.includes("trackReceiptImage(route)") &&
    !receiptFn.includes('createElement("a")') &&
    !receiptFn.includes("toDataURL"));
  check("receipt artifact carries its own save_route",
    appSrcT.includes("function trackReceiptImage(saveRoute)") &&
    appSrcT.includes('artifact: "sealed-receipt"') &&
    appSrcT.includes("rProps.save_route = saveRoute"));
}


// 16. UI click coverage (Nov 20, 2026): helper.js carries the generic
//     ui_click net — one event for clicks no semantic event claims, with
//     stamp-based suppression so covered controls never double-fire, and
//     identifier-only properties (the element's text is never read:
//     several buttons carry a person's name).
{
  const helperSrc = fs.readFileSync(new URL("../site/helper.js", import.meta.url), "utf8");
  check("helper.js fires the generic ui_click event",
    helperSrc.includes('"ui_click"') && helperSrc.includes("__SS_UICLICK__"));
  check("ui_click suppression wraps both semantic routes",
    helperSrc.includes("__ssUiWrap") && helperSrc.includes("window.fleetTrack") &&
    helperSrc.includes("window.FA.track") && helperSrc.includes("lastEvPerf >= evTs - 1"));
  check("ui_click slug never reads element text",
    !helperSrc.slice(helperSrc.indexOf("SPEC-SS-UICLICK-01")).includes("textContent"));
}


// 17. Handback card after the gift ideas (Nov 20, 2026): a second,
//     higher own-draw placement directly after the gift carousel.
//     It rides the warm hand-back (stash surface "after_gifts") and
//     handback_shown separates the placements ("after_gifts" vs the
//     lower door's "lower"); the lower #ownDrawBlock stays untouched.
{
  const idxSrcH = fs.readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
  const appSrcH = fs.readFileSync(new URL("../site/app.js", import.meta.url), "utf8");
  check("reveal carries the handback card after the gift ideas, under the match's gifts (moved back Nov 23, 2026, SPEC-SS-REVEALBATCH-01)",
    idxSrcH.includes('id="ownDrawAfter"') &&
    idxSrcH.indexOf('id="ownDrawAfterGifts"') > idxSrcH.indexOf('id="gotName"') &&
    idxSrcH.indexOf('id="ownDrawAfterGifts"') > idxSrcH.indexOf('id="giftLabel"') &&
    idxSrcH.indexOf('id="ownDrawAfterGifts"') > idxSrcH.indexOf('id="allPicks"') &&
    idxSrcH.indexOf('id="ownDrawAfterGifts"') < idxSrcH.indexOf('id="giftDoors"'));
  check("after-gifts button is the filled berry start class",
    idxSrcH.includes('class="owndraw-start" id="ownDrawAfter"'));
  check("after-gifts door rides the warm hand-back and writes its stash surface",
    appSrcH.includes('oag.setAttribute("href", href)') &&
    appSrcH.includes('writeHbStash("after_gifts")'));
  check("handback_shown separates the placements",
    appSrcH.includes('hb("handback_shown", "card", "lower")') &&
    appSrcH.includes('hb("handback_shown", "after_gifts", "after_gifts")'));
  const loadPackH = (file) => {
    const w = {};
    new Function("window", fs.readFileSync(new URL(file, import.meta.url), "utf8"))(w);
    return w;
  };
  const ESH = loadPackH("../site/i18n-es.js");
  const PTH = loadPackH("../site/i18n-pt.js");
  check("packs carry the after-gifts strings",
    ["handback.after_title", "handback.after_line", "handback.after_cta", "handback.after_caption"]
      .every(k => k in ESH.SS_ES && k in PTH.SS_PT) &&
    appSrcH.includes('T("handback.after_cta")'));
}


// 99. Claims consistency — the five hero surfaces must match site/claims.json
//     verbatim, slot by slot. Intentional differences are recorded IN the
//     registry (its per-surface values ARE the settled wording), so any
//     divergence here is drift. Change a page and the registry together.
{
  const REG = JSON.parse(fs.readFileSync(new URL("../site/claims.json", import.meta.url), "utf8"));
  const unesc = (t) => t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
  const stripTags = (t) => unesc(t.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  const metaOf = (h, attr, val) => {
    const m = h.match(new RegExp('<meta[^>]+' + attr + '=["\']' + val.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '["\'][^>]*>'));
    if (!m) return null;
    const c = m[0].match(/content="([^"]*)"/);
    return c ? unesc(c[1]) : null;
  };
  const webappDesc = (h) => {
    for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      let ld; try { ld = JSON.parse(m[1]); } catch { continue; }
      const nodes = Array.isArray(ld?.["@graph"]) ? ld["@graph"] : [ld];
      for (const n of nodes) if (n && n["@type"] === "WebApplication") return n.description ?? null;
    }
    return null;
  };
  for (const [name, exp] of Object.entries(REG.surfaces)) {
    const h = fs.readFileSync(new URL("../" + exp.file, import.meta.url), "utf8");
    const title = h.match(/<title>([\s\S]*?)<\/title>/);
    check(`claims ${name} title`, title && unesc(title[1].trim()) === exp.title, title && title[1]);
    check(`claims ${name} meta description`, metaOf(h, "name", "description") === exp.meta_description);
    check(`claims ${name} og:title`, metaOf(h, "property", "og:title") === exp.og_title);
    check(`claims ${name} og:description`, metaOf(h, "property", "og:description") === exp.og_description);
    check(`claims ${name} og:image`, metaOf(h, "property", "og:image") === exp.og_image);
    check(`claims ${name} twitter:title`, metaOf(h, "name", "twitter:title") === exp.twitter_title);
    check(`claims ${name} twitter:description`, metaOf(h, "name", "twitter:description") === exp.twitter_description);
    const h1 = h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    check(`claims ${name} h1`, h1 && stripTags(h1[1]) === exp.h1, h1 && stripTags(h1[1]));
    const sub = h.match(/<p class="sub">([\s\S]*?)<\/p>/);
    if (exp.hero_sub) check(`claims ${name} hero sub`, sub && stripTags(sub[1]) === exp.hero_sub, sub && stripTags(sub[1]));
    const strip = h.match(/<p class="claimstrip">([\s\S]*?)<\/p>/);
    check(`claims ${name} claim strip`, strip && stripTags(strip[1]) === exp.claim_strip, strip && stripTags(strip[1]));
    check(`claims ${name} jsonld webapp description`, webappDesc(h) === exp.jsonld_webapp_description);
    const foot = h.match(/<footer>([\s\S]*?)<\/footer>/);
    const links = foot ? [...foot[1].matchAll(/href="([^"]+)"/g)].map((m) => m[1]) : [];
    check(`claims ${name} footer links`, JSON.stringify(links) === JSON.stringify(exp.footer_links), links);
    if (exp.below_cta) check(`claims ${name} below-cta line`, h.includes(exp.below_cta));
    if (exp.limit_statement) check(`claims ${name} limit statement`, h.includes(exp.limit_statement));
    for (const bad of REG.forbidden_strings) check(`claims ${name} free of stale string "${bad.slice(0, 24)}…"`, !h.includes(bad));
  }
  const dno = REG.surfaces["draw-names-online"];
  check("claims privacy fragment in draw-names-online meta",
    typeof dno.meta_description === "string" && dno.meta_description.includes(REG.facts.privacy_fragment_required_in["draw-names-online.meta_description"]));
  // Free prominence + sample bridge (Nov 21, 2026, friend-visit fix,
  // refined same day on Billy's screenshot verdict "still not
  // immediately clear it's free"): the strip first led with Free in
  // ink-weight type, but four bold checks still read as fine print —
  // so the free claim moved INTO the primary start button ("Start
  // your free draw") and OUT of the strip, leaving Free exactly once
  // in the hero region, in its loudest element. Each sample card
  // carries a berry bridge to the visitor's own (empty) form at its
  // completed state.
  for (const [name, exp] of Object.entries(REG.surfaces)) {
    check(`claims ${name} strip carries no free check (the button carries it)`,
      !exp.claim_strip.includes("✓ Free") && !exp.claim_strip.includes("✓ Gratis") && !exp.claim_strip.includes("✓ Grátis") &&
      (exp.claim_strip.startsWith("✓ No sign-up") || exp.claim_strip.startsWith("✓ Sin registro") || exp.claim_strip.startsWith("✓ Sem cadastro")),
      exp.claim_strip);
  }
  const readSite = (f) => fs.readFileSync(new URL("../site/" + f, import.meta.url), "utf8");
  for (const f of ["index.html", "secret-santa-generator.html", "draw-names-online.html", "amigo-secreto.html", "amigo-secreto-online.html", "share.html"]) {
    check(`claim strip set in ink-weight type in ${f}`,
      readSite(f).includes(".claimstrip{font-size:16px;color:var(--ink);font-weight:700;"));
  }
  const idxHtmlSrc = readSite("index.html");
  check("hero start buttons carry the free claim in all three languages",
    idxHtmlSrc.includes('id="startBtn">Start your free draw</a>') &&
    readSite("secret-santa-generator.html").includes('<a class="cta" href="#tool">Start your free draw</a>') &&
    readSite("draw-names-online.html").includes('<a class="cta" href="#tool">Start your free draw</a>') &&
    readSite("amigo-secreto.html").includes('<a class="cta" href="#tool">Comienza tu sorteo gratis</a>') &&
    readSite("amigo-secreto-online.html").includes('<a class="cta" href="#tool">Comece seu sorteio grátis</a>'));
  /* Nov 21, 2026 (evening, Billy's landscape-screenshot call): the
     sample-card bridge is REMOVED again. The hero's "Start your free
     draw" is the one main start action; the homepage sample card holds
     exactly two CTA buttons — Run it again + Start from the sample.
     (Nov 23, 2026, SPEC-SS-SAMPLELINKS-01: the "Open Maya's sample
     link" toggle is GONE — every sample row now carries its own
     tappable link into a per-person peek; section 26 guards it. The
     auto-playing sample cards (draw-names + both landers) carry no
     start button again, and their pre-bridge plain end links are NOT
     restored. */
  check("homepage sample card: bridge gone, exactly the two CTA buttons remain",
    !idxHtmlSrc.includes("sampleBridge") && !idxHtmlSrc.includes("samplebridge") &&
    idxHtmlSrc.includes('<button class="samplego" id="sampleRun" type="button">Run it again</button>') &&
    idxHtmlSrc.includes('<button class="sampledraft" id="sampleStart" type="button">Start from the sample</button>') &&
    !idxHtmlSrc.includes('id="sampleOpen"'));
  const dnoSrc = readSite("draw-names-online.html");
  check("draw-names sample card: bridge gone, plain end link not restored",
    !dnoSrc.includes("sampleBridge") && !dnoSrc.includes("samplebridge") &&
    !dnoSrc.includes('<p style="margin-top:10px"><a href="#tool">Start your own draw</a></p>'));
  const esPageSrc = readSite("amigo-secreto.html");
  check("ES lander sample card: bridge gone",
    !esPageSrc.includes("sampleBridge") && !esPageSrc.includes("samplebridge"));
  const ptPageSrc = readSite("amigo-secreto-online.html");
  check("PT lander sample card: bridge gone",
    !ptPageSrc.includes("sampleBridge") && !ptPageSrc.includes("samplebridge"));
  check("no page keeps the bridge focus handler",
    ["index.html", "draw-names-online.html", "amigo-secreto.html", "amigo-secreto-online.html"]
      .every((f) => !readSite(f).includes('closest("a.samplebridge")')));
  const esPackRaw = readSite("i18n-es.js");
  const ptPackRaw = readSite("i18n-pt.js");
  check("ES pack strips drop the free check, the button carries it, no bridge rules",
    esPackRaw.includes("✓ Sin registro · ✓ Sin correos") && !esPackRaw.includes("✓ Gratis ·") &&
    esPackRaw.includes("Comienza tu sorteo gratis") && !esPackRaw.includes("#sampleBridge"));
  check("PT pack strips drop the free check, the button carries it, no bridge rules",
    ptPackRaw.includes("✓ Sem cadastro · ✓ Sem e-mails") && !ptPackRaw.includes("✓ Grátis ·") &&
    ptPackRaw.includes("Comece seu sorteio grátis") && !ptPackRaw.includes("#sampleBridge"));

  /* Nov 21, 2026 (late, Billy's duplication read on his own
     screenshot): the sample card said "sample draw" twice in half an
     inch — the gold pill ("Sample draw, not a real one") stacked
     directly on the "Try a sample draw" heading. One fact, one
     place: the heading carries it; the pill is GONE from every
     sample card and from both packs (element, badge string, DOM
     binding, chip CSS), and the packs moved to rk51/rk52 in the
     same commit. */
  check("pill cut: no samplechip anywhere in the five sample-card pages",
    ["index.html", "draw-names-online.html", "secret-santa-generator.html", "amigo-secreto.html", "amigo-secreto-online.html"]
      .every((f) => !readSite(f).includes("samplechip")));
  check("pill cut: the pill text is gone in all three languages",
    !idxHtmlSrc.includes("Sample draw, not a real one") && !dnoSrc.includes("Sample draw, not a real one") &&
    !esPageSrc.includes("Sorteo de muestra, no es uno real") && !ptPageSrc.includes("Sorteio de exemplo, não é um de verdade"));
  check("pill cut: packs carry no badge string or chip binding",
    !esPackRaw.includes("sample.badge") && !ptPackRaw.includes("sample.badge") &&
    !esPackRaw.includes(".samplechip") && !ptPackRaw.includes(".samplechip"));
  check("pill cut: the heading still carries the fact on the homepage card",
    idxHtmlSrc.includes("<h2>Try a sample draw</h2>") &&
    esPackRaw.includes("Prueba un sorteo de muestra") && ptPackRaw.includes("Experimente um sorteio de exemplo"));

  /* Items 1-3 (Nov 21, 2026, Billy's added scope): the restored
     organizer name field + own-card treatment, the reveal handback
     moved under the match, and the group/private telemetry split. */
  const vdSrcFB = fs.readFileSync(new URL("../site/variant-draw.js", import.meta.url), "utf8");
  const vdCssFB = fs.readFileSync(new URL("../site/variant-draw.css", import.meta.url), "utf8");
  const appSrcFB = fs.readFileSync(new URL("../site/app.js", import.meta.url), "utf8");
  check("item 1: the organizer name field exists in all three variant string tables",
    vdSrcFB.includes('orgLabel: "Your name (optional)"') &&
    vdSrcFB.includes('orgLabel: "Tu nombre (opcional)"') &&
    vdSrcFB.includes('orgLabel: "Seu nome (opcional)"') &&
    vdSrcFB.includes('"vd-org-"'));
  check("item 1: the name rides the token and the record, and the draft round-trips it",
    vdSrcFB.includes("if (orgName) payload.o = orgName;") &&
    vdSrcFB.includes("if (orgName) rec.o = orgName;") &&
    vdSrcFB.includes("org: orgInput.value.trim()") &&
    vdSrcFB.includes('org: d.org || ""'));
  check("item 1: the variant kit marks the own card and never opens the walk on it",
    vdSrcFB.includes("function ownNameFor(rec)") &&
    vdSrcFB.includes("vd-yours") && vdSrcFB.includes("S.yoursMark") &&
    vdSrcFB.includes('if (!nextFound && ownRow) ownRow.classList.add("vd-next");') &&
    vdCssFB.includes(".vd-yours{"));
  check("item 1: the app.js kit carries the same own-card treatment and mark",
    appSrcFB.includes("function kitOwnName(rec)") &&
    appSrcFB.includes('T("share.yours") || "This is yours"') &&
    appSrcFB.includes('if (!nextFound && ownCard) ownCard.classList.add("nextcard");') &&
    idxHtmlSrc.includes(".yoursmark{"));
  check("item 1: the packs translate the yours mark",
    esPackRaw.includes('"share.yours": "Este es tu enlace"') &&
    ptPackRaw.includes('"share.yours": "Este é o seu link"'));
  /* Organizer prefill (SPEC-SS-ORGPREFILL-01, Nov 22, 2026):
     committing "Your name" lands it in the first empty roster
     slot, once — the behavior matrix is walked in the lane's
     rendered tests; these guards pin the wiring and the rules
     the walk relies on. */
  const prefillBody = vdSrcFB.slice(vdSrcFB.indexOf("function prefillOrganizerName()"),
    vdSrcFB.indexOf('orgInput.addEventListener("change", prefillOrganizerName);'));
  check("org prefill: the fill is wired to the field's change commit, never to keystrokes",
    vdSrcFB.includes('orgInput.addEventListener("change", prefillOrganizerName);') &&
    !vdSrcFB.includes('addEventListener("input", prefillOrganizerName)') &&
    (vdSrcFB.match(/prefillOrganizerName/g) || []).length === 2);
  check("org prefill: the match rule is the marking rule — trimmed, case-insensitive, both sides",
    prefillBody.includes("var v = orgInput.value.trim();") &&
    prefillBody.includes("var key = v.toLowerCase();") &&
    prefillBody.includes("cur.toLowerCase() === key") &&
    vdSrcFB.includes("String(rec.links[j].for).trim().toLowerCase() === raw"));
  check("org prefill: first empty slot only — no overwrite, no added row, typed-path fill",
    prefillBody.includes("if (!cur && !firstEmpty) firstEmpty = inp;") &&
    prefillBody.includes("if (!firstEmpty) return;") &&
    !prefillBody.includes("addRow") && !prefillBody.includes("appendChild") &&
    prefillBody.includes('firstEmpty.dispatchEvent(new Event("input", { bubbles: true }));'));
  check("org prefill: draft restore never retro-fills (it sets the field directly, no event)",
    vdSrcFB.includes('orgInput.value = Array.from(d.org).slice(0, 40).join("");') &&
    !vdSrcFB.slice(vdSrcFB.indexOf("function applyStoredDraft"), vdSrcFB.indexOf("function restoreDraft"))
      .includes("prefillOrganizerName"));
  check("item 2: the handback card sits after the gift ideas (Nov 23, 2026 reorder)",
    idxHtmlSrc.indexOf('id="ownDrawAfterGifts"') > idxHtmlSrc.indexOf('id="gotName"') &&
    idxHtmlSrc.indexOf('id="ownDrawAfterGifts"') > idxHtmlSrc.indexOf('id="giftLabel"') &&
    idxHtmlSrc.indexOf('id="ownDrawAfterGifts"') > idxHtmlSrc.indexOf('id="allPicks"') &&
    (idxHtmlSrc.match(/id="ownDrawAfterGifts"/g) || []).length === 1);
  check("item 2: the handback line and caption carry the new wording in all three languages",
    appSrcFB.includes('|| "Everyone gets their own private match.";') &&
    appSrcFB.includes('|| "Free · about 2 minutes";') &&
    esPackRaw.includes('"handback.after_caption": "Gratis · unos 2 minutos"') &&
    ptPackRaw.includes('"handback.after_caption": "Grátis · uns 2 minutos"') &&
    esPackRaw.includes('"handback.after_line": "Cada persona recibe su propia asignación en privado."') &&
    ptPackRaw.includes('"handback.after_line": "Cada pessoa recebe sua combinación em privado."'.replace("combinación", "combinação")));
  check("item 3: the two link types scrub to different landing markers",
    appSrcFB.includes('history.replaceState(null, "", "/?via=share");') &&
    appSrcFB.includes('history.replaceState(null, "", "/?via=group");') &&
    appSrcFB.includes('location.search === "?via=group"') &&
    appSrcFB.includes('viaQ === "group"'));
  check("item 3: link_type rides the group page, private arrival and reveal events",
    appSrcFB.includes('link_type: "group", people_bucket') &&
    appSrcFB.includes('via: "short-link", link_type: "private"') &&
    appSrcFB.includes('link_type: revealLinkSource === "group-link" ? "group" : "private"'));
  check("item 3: a group landing's first touch is stamped via group",
    idxHtmlSrc.includes('if(p==="/e/"&&!via)via="group";'));
  check("hero paragraph cut (Nov 21, 2026, evening): the paragraph is gone from every entry hero, the strip keeps the organizer check",
    !idxHtmlSrc.includes("Type the names, and each person gets a private link") &&
    !idxHtmlSrc.includes("You can be in the draw too") &&
    idxHtmlSrc.includes("✓ Organizer can join without seeing the matches") &&
    !readSite("secret-santa-generator.html").includes("Type the names, and each person gets a private link") &&
    !readSite("draw-names-online.html").includes("Type the names, and each person gets a private link") &&
    !readSite("amigo-secreto.html").includes("Escribe los nombres y cada persona recibe un enlace privado") &&
    !readSite("amigo-secreto-online.html").includes("Digite os nomes e cada pessoa recebe um link privado") &&
    !esPackRaw.includes('"home.subline"') && !ptPackRaw.includes('"home.subline"') &&
    !esPackRaw.includes('".hero .sub"') && !ptPackRaw.includes('".hero .sub"'));
  /* Phone landscape (Nov 21, 2026, added scope 2): the landscape
     treatment exists on every touched surface and lives entirely
     inside the one phone-landscape query, so portrait cannot move. */
  const LANDQ = "@media (orientation:landscape) and (max-height:500px) and (max-width:1023px)";
  check("landscape: homepage widens, grids hero+sample and the reveal",
    idxHtmlSrc.includes(LANDQ) && idxHtmlSrc.includes("#revealCard{display:grid") &&
    idxHtmlSrc.includes("#organizer[hidden]{display:none}") && idxHtmlSrc.includes("#revealCard[hidden]{display:none}") &&
    idxHtmlSrc.includes("#organizer>section.samplecard{grid-column:2;grid-row:1"));
  check("landscape: query pages widen and split hero from sample/form",
    readSite("secret-santa-generator.html").includes(LANDQ) &&
    readSite("draw-names-online.html").includes(LANDQ) &&
    readSite("amigo-secreto.html").includes(LANDQ) &&
    readSite("amigo-secreto-online.html").includes(LANDQ));
  check("landscape: form rows, kit cards and the helper bubble adapt",
    vdCssFB.includes(LANDQ) && vdCssFB.includes(".vd-people{display:grid") && vdCssFB.includes(".vd-links{display:grid") &&
    readSite("helper.css").includes(LANDQ) && readSite("helper.css").includes(".shp-bubble{max-width:180px"));
  // Secrecy guardrail (Billy, Nov 20, 2026): unscoped secrecy claims are
  // change-controlled by census. Every file that loads the shared draw
  // module must be inside the guardrail scope, and every in-scope file's
  // pattern counts must equal the registry census exactly — a new
  // unscoped claim (or an unrecorded removal) fails here.
  const SG = REG.secrecy_guardrail;
  check("secrecy guardrail present in registry", !!SG && Array.isArray(SG.patterns) && !!SG.census);
  if (SG) {
    const sgPats = SG.patterns.map((p) => new RegExp(p, "gi"));
    const siteDir = new URL("../site/", import.meta.url);
    const drawModulePages = fs.readdirSync(siteDir)
      .filter((f) => f.endsWith(".html"))
      .filter((f) => fs.readFileSync(new URL(f, siteDir), "utf8").includes("variant-draw"))
      .map((f) => "site/" + f)
      .sort();
    check("secrecy guardrail scope covers every draw-module page",
      drawModulePages.every((f) => SG.scope_files.includes(f)),
      drawModulePages.filter((f) => !SG.scope_files.includes(f)));
    for (const file of SG.scope_files) {
      const text = fs.readFileSync(new URL("../" + file, import.meta.url), "utf8");
      const expected = SG.census[file] || {};
      const actual = {};
      SG.patterns.forEach((p, i) => {
        const n = (text.match(sgPats[i]) || []).length;
        if (n) actual[p] = n;
      });
      check(`secrecy census ${file.replace("site/", "")}`,
        JSON.stringify(actual) === JSON.stringify(expected),
        `actual ${JSON.stringify(actual)} vs census ${JSON.stringify(expected)}`);
    }
  }
}

// Printable slips (SPEC-SS-SLIPS-01, Nov 20, 2026): the shared
// renderer exists, the manage reprint sits behind its own
// declaration gate, the packs carry every key, no slips string
// uses an em dash, the print rules are in the stylesheet, every
// draw page loads the module, and the Privacy page states the
// print truth in all three languages. Nov 23, 2026 (Billy's
// order): the slips card and the Start over button are REMOVED
// from the post-draw handoff — the guards below now assert
// their absence on both handoff kits, so they cannot silently
// return; the manage-page gated reprint is the only slips
// surface left.
{
  const loadPackS = (file) => {
    const w = {};
    new Function("window", fs.readFileSync(new URL(file, import.meta.url), "utf8"))(w);
    return w;
  };
  const ES = loadPackS("../site/i18n-es.js");
  const PT = loadPackS("../site/i18n-pt.js");
  const slipsSrc = fs.readFileSync(new URL("../site/slips.js", import.meta.url), "utf8");
  const vdSrc = fs.readFileSync(new URL("../site/variant-draw.js", import.meta.url), "utf8");
  const appSrcS = fs.readFileSync(new URL("../site/app.js", import.meta.url), "utf8");
  const vdCss = fs.readFileSync(new URL("../site/variant-draw.css", import.meta.url), "utf8");
  const privSrc = fs.readFileSync(new URL("../site/privacy.html", import.meta.url), "utf8");
  check("slips.js exposes SS_SLIPS.open", slipsSrc.includes("window.SS_SLIPS") && slipsSrc.includes("open: open"));
  check("slips.js fires the preview and print events",
    slipsSrc.includes("slips_opened_preview") && slipsSrc.includes("slips_print_invoked"));
  check("slips.js never puts names through innerHTML", !slipsSrc.includes("innerHTML"));
  check("variant handoff has NO slips card (removed Nov 23, 2026)",
    !vdSrc.includes("vd-slips") && !vdSrc.includes("SS_SLIPS.open"));
  check("variant handoff has NO Start over button (removed Nov 23, 2026)",
    !vdSrc.includes("vd-again"));
  check("variant string tables carry slips strings in all three languages",
    (vdSrc.match(/slipsBtn:/g) || []).length === 3 &&
    (vdSrc.match(/slipsWarn:/g) || []).length === 3 &&
    (vdSrc.match(/slipsKeep:/g) || []).length === 3);
  check("app handoff kit has NO results slips card (removed Nov 23, 2026)",
    !appSrcS.includes("slipsCardEl") && !appSrcS.includes("slipsPeopleFromRec"));
  check("app manage wires the gated slips reprint",
    appSrcS.includes("showSlipsGate") && appSrcS.includes("slips_gate_declared") &&
    appSrcS.includes("/pairings"));
  const usedKeys = [...new Set([...appSrcS.matchAll(/T\("(slips\.[a-z_]+)"\)|TF\("(slips\.[a-z_]+)"/g)].map(m => m[1] || m[2]))];
  check("app.js asks the packs for slips keys", usedKeys.length >= 15, usedKeys.length);
  check("ES pack holds every slips key app.js uses", usedKeys.every(k => k in ES.SS_ES),
    usedKeys.filter(k => !(k in ES.SS_ES)));
  check("PT pack holds every slips key app.js uses", usedKeys.every(k => k in PT.SS_PT),
    usedKeys.filter(k => !(k in PT.SS_PT)));
  const slipsStrings = [
    ...Object.entries(ES.SS_ES).filter(([k]) => k.startsWith("slips.")).map(([, v]) => v),
    ...Object.entries(PT.SS_PT).filter(([k]) => k.startsWith("slips.")).map(([, v]) => v),
    ...[...vdSrc.matchAll(/slips\w+: ((?:"[^"]*")|(?:function))/g)].map(m => m[1])
  ];
  check("no slips string uses an em dash", slipsStrings.every(s => !s.includes("\u2014")));
  check("print rules scope the sheet to the open state",
    vdCss.includes("@media print") && vdCss.includes("body.ss-slips-open") &&
    vdCss.includes("break-inside:avoid") && vdCss.includes("rotate(180deg)"));
  const drawPages = ["index.html", "secret-santa-generator.html", "draw-names-online.html",
    "amigo-secreto.html", "amigo-secreto-online.html", "amigo-invisible.html",
    "amigo-secreto-sin-correo.html", "gift-exchange-name-draw.html",
    "kris-kringle-generator.html", "secret-santa-for-remote-teams.html",
    "secret-santa-generator-for-classroom.html", "secret-santa-generator-no-sign-up.html",
    "secret-santa-generator-with-exclusions.html", "secret-santa-generator-without-email.html",
    "secret-santa-name-picker.html", "secret-snowflake-generator.html",
    "virtual-secret-santa.html"];
  check("every draw page loads slips.js",
    drawPages.every(p => fs.readFileSync(new URL("../site/" + p, import.meta.url), "utf8")
      .includes('<script src="/slips.js?v=sl1"></script>')));
  check("privacy states the print truth in EN, ES and PT",
    privSrc.includes("folded paper slips") &&
    privSrc.includes("papeletas de papel dobladas") &&
    privSrc.includes("bilhetes de papel dobrados"));
}

// 18. Recipient interests (SPEC-SS-INTERESTS-01, Nov 21, 2026):
//     pickGifts takes the match's tapped interests as an array
//     (any match earns the single-interest +3), and the reveal /
//     manage wiring carries the feature's strings. The privacy
//     rules themselves (giver-only values, organizer boolean)
//     are asserted against the Worker in the lane's API tests.
{
  for (const band of ["u25", "m2550", "m50100", "m100"]) {
    const asStr = CORE.pickGifts(BANK, band, "cooking", CORE.rng(5), {});
    const asArr = CORE.pickGifts(BANK, band, ["cooking"], CORE.rng(5), {});
    check(`interests: [cooking] deals exactly like "cooking" in ${band}`,
      JSON.stringify(asArr.map(p => p.id)) === JSON.stringify(asStr.map(p => p.id)));
    const blank = CORE.pickGifts(BANK, band, "", CORE.rng(5), {});
    const empty = CORE.pickGifts(BANK, band, [], CORE.rng(5), {});
    check(`interests: [] deals exactly like the blank hint in ${band}`,
      JSON.stringify(empty.map(p => p.id)) === JSON.stringify(blank.map(p => p.id)));
    const multi = CORE.pickGifts(BANK, band, ["cooking", "books"], CORE.rng(5), {});
    check(`interests: multi-interest deal returns in-band picks in ${band}`,
      multi.length >= 1 && multi.every(p => p.budget === band && p.category !== "Kid" && !p.retired));
    const anyMatch = BANK.some(i => i.budget === band && i.category !== "Kid" && !i.retired &&
      (i.interests.includes("cooking") || i.interests.includes("books")));
    if (anyMatch) {
      check(`interests: multi-interest top pick matches one of them in ${band}`,
        multi[0].interests.includes("cooking") || multi[0].interests.includes("books"),
        multi[0] && multi[0].name);
    }
  }
  const appSrc2 = fs.readFileSync(new URL("../site/app.js", import.meta.url), "utf8");
  check("interests: app.js writes through the own-code endpoint",
    appSrc2.includes("/interests") && appSrc2.includes("recipient_interests_saved"));
  check("interests: app.js fires the giver-shown event",
    appSrc2.includes("match_interests_shown"));
  check("interests: app.js renders the no-topics empty state in the match slot",
    appSrc2.includes('"reveal.match_none"') && appSrc2.includes('"mi" in extra'));
  check("interests: app.js carries the truthful disclosure fallback",
    appSrc2.includes("The organizer can see that you added something, never what."));
  check("interests: app.js nudge fallback invites interests",
    appSrc2.includes("add what you're into so your Santa gets gift ideas for you"));
  check("interests: app.js reads the organizer boolean endpoint",
    appSrc2.includes("/interests-status") && appSrc2.includes("manage_view.interests_added_chip"));
  check("interests: re-deal maps the payload's band label to the band code",
    appSrc2.includes("BANDS[bi].label === payload.b"));
  const idxSrc3 = fs.readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
  check("interests: index carries the entry block and the match line",
    idxSrc3.includes('id="interestBlock"') && idxSrc3.includes('id="interestChips"') &&
    idxSrc3.includes('id="matchInterestsLine"'));
  check("interests: index loads core.js at v2118", idxSrc3.includes("core.js?v=2118"));
  const helperSrc2 = fs.readFileSync(new URL("../site/helper.js", import.meta.url), "utf8");
  check("interests: helper PACK_PIN matches the bumped packs",
    helperSrc2.includes('PACK_PIN = { es: "rk56", pt: "rk57" }'));
  const esSrc = fs.readFileSync(new URL("../site/i18n-es.js", import.meta.url), "utf8");
  const ptSrc = fs.readFileSync(new URL("../site/i18n-pt.js", import.meta.url), "utf8");
  for (const [nm, src] of [["ES", esSrc], ["PT", ptSrc]]) {
    check(`interests: ${nm} pack carries the reveal strings`,
      src.includes('"reveal.interests_heading"') && src.includes('"reveal.interests_line"') &&
      src.includes('"reveal.match_into"') && src.includes('"reveal.match_surprise"') &&
      src.includes('"reveal.match_none"') &&
      src.includes('"reveal.interests_save_failed"'));
    check(`interests: ${nm} pack carries the organizer chip`,
      src.includes('"manage_view.interests_added_chip"'));
  }
  check("interests: ES nudge invites interests",
    esSrc.includes("agrega lo que te gusta, para que tu amigo secreto tenga ideas de regalo para ti"));
  check("interests: PT nudge invites interests",
    ptSrc.includes("adicione do que você gosta, para o seu amigo secreto ter ideias de presente para você"));
  const privSrc2 = fs.readFileSync(new URL("../site/privacy.html", import.meta.url), "utf8");
  check("interests: privacy states the storage truth in EN, ES and PT",
    privSrc2.includes("only the person who drew you can see what you picked") &&
    privSrc2.includes("solo la persona que te sorteó puede ver lo que elegiste") &&
    privSrc2.includes("só a pessoa que tirou você pode ver o que você escolheu"));
  const claims2 = JSON.parse(fs.readFileSync(new URL("../site/claims.json", import.meta.url), "utf8"));
  check("interests: claims.json records the settled behavior",
    typeof claims2.facts.recipient_interests === "string" &&
    claims2.facts.recipient_interests.includes("never what"));

  // ---- Nov 21, 2026: full-flow sim fixes (Opportunities 1-10) ----
  const appSrcF = fs.readFileSync(new URL("../site/app.js", import.meta.url), "utf8");
  const idxSrcF = fs.readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
  const vdSrc = fs.readFileSync(new URL("../site/variant-draw.js", import.meta.url), "utf8");
  const genSrc = fs.readFileSync(new URL("../site/secret-santa-generator.html", import.meta.url), "utf8");
  const dnoSrc = fs.readFileSync(new URL("../site/draw-names-online.html", import.meta.url), "utf8");
  const helperCssSrc = fs.readFileSync(new URL("../site/helper.css", import.meta.url), "utf8");
  check("simfix 1 (as rewritten by SPEC-SS-INVITE-01): named-group per-person text names the group in app.js (both builders)",
    (appSrcF.match(/Secret Santa is on, budget/g) || []).length >= 2);
  check("simfix 1 (as rewritten by SPEC-SS-INVITE-01): variant personMsg names the group in EN, ES and PT",
    vdSrc.includes("You're in! \" + g + \" Secret Santa is on, budget") &&
    vdSrc.includes("amigo secreto de \" + g + \" ya está en marcha") &&
    vdSrc.includes("amigo secreto de \" + g + \" já está valendo"));
  check("simfix 1 (as rewritten by SPEC-SS-INVITE-01): packs name the group in the invite and the announcement",
    esSrc.includes("amigo secreto de {group} ya está en marcha") &&
    ptSrc.includes("amigo secreto de {group} já está valendo") &&
    esSrc.includes("¡El amigo secreto ya está en marcha!") &&
    ptSrc.includes("O amigo secreto já está valendo!") &&
    appSrcF.includes("Secret Santa is on! The names are drawn, budget"));
  check("simfix 2 (as amended by the evening paragraph cut): the generator's hero no longer carries the time claim at all",
    (genSrc.match(/About 2 minutes\./g) || []).length === 0);
  check("simfix 2: draw-names screen one says the time claim exactly once (the H1)",
    (dnoSrc.match(/about 2 minutes/g) || []).length === 1 &&
    dnoSrc.includes("<h1>Draw names online in about 2 minutes.</h1>") &&
    !dnoSrc.includes("not even you. About 2 minutes."));
  check("simfix 3: index carries the carousel previous control",
    idxSrcF.includes('id="prevPick"'));
  check("simfix 3: app.js wires previous with its own telemetry event",
    appSrcF.includes('el("prevPick")') && appSrcF.includes("gift_idea_prev") &&
    appSrcF.includes("function trackGiftIdeaPrev"));
  check("simfix 3: packs label the previous control",
    esSrc.includes('"#prevPick"') && ptSrc.includes('"#prevPick"'));
  check("simfix 4: the after-gifts handback uses the one name in EN, ES and PT",
    idxSrcF.includes('id="ownDrawAfter" href="/?via=own#tool">Start your own draw</a>') &&
    appSrcF.includes('T("handback.after_cta") || "Start your own draw"') &&
    esSrc.includes('"handback.after_cta": "Haz tu propio sorteo"') &&
    ptSrc.includes('"handback.after_cta": "Faça seu próprio sorteio"'));
  check("simfix 5: a plain tap on the gift unwraps through the same finish()",
    appSrcF.includes("TAP_MS = 300") && appSrcF.includes('addEventListener("pointerup", release)'));
  check("simfix 6: copy controls name the message they copy, in app.js, variant and both packs",
    appSrcF.includes('"Copy " + link.for + "\\u2019s message"') &&
    appSrcF.includes('"Copy " + t.giver + "\\u2019s message"') &&
    vdSrc.includes('Copy " + n + "\\u2019s message"') &&
    vdSrc.includes("Copiar el mensaje de ") && vdSrc.includes("Copiar a mensagem de ") &&
    esSrc.includes('"share.copy_link_for": "Copiar el mensaje de {name}"') &&
    ptSrc.includes('"share.copy_link_for": "Copiar a mensagem de {name}"') &&
    esSrc.includes('"share.confirm_copied_msg"') && ptSrc.includes('"share.confirm_copied_msg"'));
  check("simfix 6: the manage page still copies a bare link under its link label",
    appSrcF.includes('TF("manage_view.copy_link_for", { name: person.n })'));
  check("simfix 7: nudge feedback names the nudge in app.js and both packs (3 surfaces since Nov 23, 2026: completion kit, manage rows, Still waiting)",
    (appSrcF.match(/share\.confirm_nudge_copied/g) || []).length === 3 &&
    esSrc.includes('"share.confirm_nudge_copied": "Recordatorio de {name} copiado') &&
    ptSrc.includes('"share.confirm_nudge_copied": "Lembrete de {name} copiado'));
  check("simfix 9: helper bubble yields to the blocks it covered; interests block yields the button",
    helperSrc2.includes("BUBBLE_YIELD_SEL") && helperSrc2.includes(".vd-link") &&
    helperSrc2.includes("#interestBlock") && helperSrc2.includes("bubbleBlockedBy") &&
    helperCssSrc.includes("scroll-padding-bottom:104px"));
  check("simfix 10: fallback disclosure exists in all three variant string tables and renders off the mint state",
    vdSrc.includes('fallbackNote: "These are long links: they work, but this draw has no manage page and no opened tracking."') &&
    vdSrc.includes("fallbackNote: \"Estos son enlaces largos") &&
    vdSrc.includes("fallbackNote: \"Estes são links longos") &&
    vdSrc.includes("rec.mintSettled && !rec.sl") && vdSrc.includes("S.fallbackNote"));
}

// ---- Nov 21, 2026 (evening): the sample gift mirrors the real unwrap ----
// Billy, from his screenshot of the opened sample peek: "Should this
// be hold?" — yes: the preview rehearses the real reveal, so its gift
// carries the real button's label, hold bar and tap fallback, wired
// with the same constants as app.js wireUnwrap. No "not a real link"
// disclaimer was added (his call, same message).
// Nov 23, 2026 (delight pass): the tap fallback is REMOVED on both
// surfaces at Billy's direction — the box itself (900 ms hold,
// sub-300 ms press, Space/Enter from the keyboard) is the only
// path, so the preview still mirrors the real link exactly.
{
  const idxSrcH = fs.readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
  const esSrcH = fs.readFileSync(new URL("../site/i18n-es.js", import.meta.url), "utf8");
  const ptSrcH = fs.readFileSync(new URL("../site/i18n-pt.js", import.meta.url), "utf8");
  const llmsFullSrc = fs.readFileSync(new URL("../site/llms-full.txt", import.meta.url), "utf8");
  check("hold mirror: the sample gift carries the real reveal's label and hold bar; the tap button is gone from both surfaces",
    idxSrcH.includes('<span id="peekLabel">Press and hold to unwrap your match</span>') &&
    idxSrcH.includes('<span id="sampleUnwrapLabel">Press and hold to unwrap your match</span>') &&
    idxSrcH.includes('<span class="holdbar" aria-hidden="true"><span id="sampleHoldFill"></span></span>') &&
    !idxSrcH.includes("sampleTap") && !idxSrcH.includes("peekTap") &&
    idxSrcH.includes("#holdFill,#sampleHoldFill"));
  check("hold mirror: the old tap-only sample label is gone from the page and the llms dump",
    !idxSrcH.includes("Tap to unwrap your match") && !llmsFullSrc.includes("Tap to unwrap your match") &&
    llmsFullSrc.includes("Press and hold to unwrap your match"));
  check("hold mirror: the sample wiring mirrors wireUnwrap (900 ms hold, 300 ms tap, cancel + keyboard, no tap button)",
    idxSrcH.includes("wireSampleUnwrap") && idxSrcH.includes("var HOLD_MS = 900") &&
    idxSrcH.includes("var TAP_MS = 300") &&
    idxSrcH.includes('btn.addEventListener("pointerup", release)') &&
    idxSrcH.includes('btn.addEventListener("pointerleave", cancel)') &&
    idxSrcH.includes('btn.addEventListener("keydown"') &&
    !idxSrcH.includes('getElementById("sampleTap")'));
  check("hold mirror: ES pack gives the sample gift the real reveal's labels (tap entries removed)",
    esSrcH.includes('"#sampleUnwrapLabel"') && !esSrcH.includes('"#sampleTap"') && !esSrcH.includes('"#peekTap"') &&
    (esSrcH.match(/Mantén presionado para abrir tu regalo/g) || []).length >= 2 &&
    !esSrcH.includes("O toca para abrir"));
  check("hold mirror: PT pack gives the sample gift the real reveal's labels (tap entries removed)",
    ptSrcH.includes('"#sampleUnwrapLabel"') && !ptSrcH.includes('"#sampleTap"') && !ptSrcH.includes('"#peekTap"') &&
    (ptSrcH.match(/Pressione e segure para abrir seu presente/g) || []).length >= 2 &&
    !ptSrcH.includes("Ou toque para abrir"));
}

// ---- Nov 21, 2026 (evening, added scope): two cuts, one keep ----
// Billy, approving Muse's recommendation: cut the "What we don't do"
// checklist (two of its three lines duplicate the hero strip) and cut
// the hero paragraph entirely (the sample card carries the
// private-link mechanism). The maker section is explicitly KEPT.
// The landers' same-heading prose sections are a different component
// — their first paragraph is the storage disclosure — and stay.
{
  const idxSrcC = fs.readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
  const esSrcC = fs.readFileSync(new URL("../site/i18n-es.js", import.meta.url), "utf8");
  const ptSrcC = fs.readFileSync(new URL("../site/i18n-pt.js", import.meta.url), "utf8");
  const asSrcC = fs.readFileSync(new URL("../site/amigo-secreto.html", import.meta.url), "utf8");
  const asoSrcC = fs.readFileSync(new URL("../site/amigo-secreto-online.html", import.meta.url), "utf8");
  const aiSrcC = fs.readFileSync(new URL("../site/amigo-invisible.html", import.meta.url), "utf8");
  check("cuts: the 'What we don't do' checklist is off the homepage and out of both packs",
    !idxSrcC.includes('aria-label="What we don\'t do"') && !idxSrcC.includes("We don&apos;t sell gifts") &&
    !esSrcC.includes("home.what_we_dont_do") && !ptSrcC.includes("home.what_we_dont_do") &&
    !esSrcC.includes("What we don't do") && !ptSrcC.includes("What we don't do"));
  check("cuts: screen one now runs H1 -> claim strip -> countdown -> free start button",
    idxSrcC.indexOf("<h1>The easiest Secret Santa generator for drawing names.</h1>") > -1 &&
    idxSrcC.indexOf("<h1>The easiest Secret Santa generator for drawing names.</h1>") < idxSrcC.indexOf('<p class="claimstrip">') &&
    idxSrcC.indexOf('<p class="claimstrip">') < idxSrcC.indexOf('<div class="cdx">') &&
    idxSrcC.indexOf('<div class="cdx">') < idxSrcC.indexOf("Start your free draw"));
  check("keep: the maker section is present on the homepage (line singularized Nov 21, 2026, night)",
    idxSrcC.includes("<h2>Made by a dad, on the side</h2>") &&
    idxSrcC.includes("I&apos;m Billy, a dad in Redmond. I built this tool on the side, with AI."));
  /* Nov 21, 2026 (night, Billy's nit on the live maker section): the
     maker line said "I build these tools" — plural — on a one-tool
     site. Singular now in all three languages, pages and packs:
     "I built this tool" / "Creé esta herramienta" / "Criei esta
     ferramenta". The packs moved to rk52/rk53 in the same commit. */
  const mkPages = ["index.html", "draw-names-online.html", "secret-santa-generator.html"]
    .map((f) => fs.readFileSync(new URL("../site/" + f, import.meta.url), "utf8"));
  const mkEsPages = ["amigo-secreto.html", "amigo-invisible.html", "amigo-secreto-sin-correo.html"]
    .map((f) => fs.readFileSync(new URL("../site/" + f, import.meta.url), "utf8"));
  const mkPtPage = fs.readFileSync(new URL("../site/amigo-secreto-online.html", import.meta.url), "utf8");
  const mkEsPack = fs.readFileSync(new URL("../site/i18n-es.js", import.meta.url), "utf8");
  const mkPtPack = fs.readFileSync(new URL("../site/i18n-pt.js", import.meta.url), "utf8");
  check("maker singular: EN entry pages say 'I built this tool', 'these tools' gone",
    mkPages.every((s) => s.includes("I built this tool on the side, with AI.") && !s.includes("these tools")));
  check("maker singular: ES landers and pack say 'Creé esta herramienta', plural gone",
    mkEsPages.every((s) => s.includes("Creé esta herramienta en mi tiempo libre, con IA.") && !s.includes("Creo estas herramientas")) &&
    mkEsPack.includes("Creé esta herramienta en mi tiempo libre, con IA.") && !mkEsPack.includes("Creo estas herramientas"));
  check("maker singular: PT lander and pack say 'Criei esta ferramenta', plural gone",
    mkPtPage.includes("Criei esta ferramenta no meu tempo livre, com IA.") && !mkPtPage.includes("Crio estas ferramentas") &&
    mkPtPack.includes("Criei esta ferramenta no meu tempo livre, com IA.") && !mkPtPack.includes("Crio estas ferramentas"));
  check("cuts: the landers' prose sections keep their storage disclosure (different component, not cut)",
    asSrcC.includes("<h2>Lo que no hacemos</h2>") && asSrcC.includes("se guardan en nuestro servidor, en una forma que podemos leer") &&
    asoSrcC.includes("<h2>O que não fazemos</h2>") && asoSrcC.includes("guardados no nosso servidor, de uma forma que conseguimos ler") &&
    aiSrcC.includes("<h2>Lo que no hacemos</h2>") && aiSrcC.includes("se guardan en nuestro servidor, en una forma que podemos leer"));
}

// ---- Nov 21, 2026 (night): Phase 3 — one shared body under three headlines ----
// Homepage, /draw-names-online and /secret-santa-generator carry the
// homepage's lean body below their own headline blocks (title, H1,
// meta, canonical stay per-page; FAQ/HowTo schema untouched). The
// ES/PT landers mirror the template in their languages. Static
// proxies here; the rendered visible-text identity proof is the
// lane walk (REPORT.md, Phase 3).
{
  const rd = (f) => fs.readFileSync(new URL("../site/" + f, import.meta.url), "utf8");
  const homeU = rd("index.html"), dnoU = rd("draw-names-online.html"), genU = rd("secret-santa-generator.html");
  const SHARED = ['<div class="cdx">', '¿Amigo secreto? Haz el sorteo en español',
    '<section class="block" aria-label="Gift picks">', '<h2>Common questions</h2>',
    '<section class="block" aria-label="Who made this">',
    'id="sampleUnwrapLabel"'];
  // Nov 23, 2026 (Part 4, Billy's order): the footer Share link
  // is gone from every footer — the old SHARED expectation of
  // href="/share?src=footer" is superseded; absence is asserted
  // in section 28 below.
  for (const [nm, src] of [["draw-names-online", dnoU], ["generator", genU]]) {
    check(`unify: ${nm} carries every canonical below-headline block`,
      SHARED.every((s) => src.includes(s)));
  }
  const visTxt = (s) => s.replace(/<script[\s\S]*?<\/script>/g, "");
  check("unify: DNO's cut items are gone from visible copy (steps, rules line, Why section, Ready block, Elfster line, share button)",
    !visTxt(dnoU).includes('class="vsteps"') && !visTxt(dnoU).includes("No one draws their own name") &&
    !visTxt(dnoU).includes("Why the matches stay between the players") && !visTxt(dnoU).includes("Ready to draw names online?") &&
    !visTxt(dnoU).includes("Elfster needs accounts") && !dnoU.includes('<button type="button" class="ss-share-btn">') && !visTxt(dnoU).includes("Gift ideas too"));
  check("unify: the generator's cut items are gone from visible copy (stats, answer, run, never-asks, gets, planning, its Q&A block)",
    !visTxt(genU).includes('class="vstats"') && !visTxt(genU).includes("The answer first") && !visTxt(genU).includes("Run your draw") &&
    !visTxt(genU).includes("What the site never asks for") && !visTxt(genU).includes("What each person gets") &&
    !visTxt(genU).includes("Keep planning") && !visTxt(genU).includes("Is this Secret Santa generator free?"));
  check("unify: the sample organizer note is cut on every sample card (it duplicated the strip)",
    !homeU.includes("samplenote") && !dnoU.includes("samplenote") && !genU.includes("samplenote") &&
    !rd("amigo-secreto.html").includes("samplenote") && !rd("amigo-secreto-online.html").includes("samplenote") &&
    !rd("i18n-es.js").includes('".samplenote"') && !rd("i18n-pt.js").includes('".samplenote"'));
  check("unify: the landers' 1-2-3 step sections are cut, their disclosure sections stay",
    !rd("amigo-secreto.html").includes("<h2>Cómo funciona</h2>") && !rd("amigo-secreto-online.html").includes("<h2>Como funciona</h2>") &&
    rd("amigo-secreto.html").includes("<h2>Lo que no hacemos</h2>") && rd("amigo-secreto-online.html").includes("<h2>O que não fazemos</h2>"));
  check("unify: per-page headlines stay distinct (Nov 23, 2026: home + generator H1s aligned to search intent)",
    homeU.includes("<h1>The easiest Secret Santa generator for drawing names.</h1>") &&
    dnoU.includes("<h1>Draw names online in about 2 minutes.</h1>") &&
    genU.includes("<h1>Secret Santa generator — draw names in about 2 minutes</h1>"));
}


// ---- Nov 21, 2026 (late): budget chips deal 3 + 2; the AI panel moves to /ai ----
// Billy's two calls in one pass: the draw form's budget chips wrapped
// raggedly (3 / 1 / 1) — they now form one box that wraps three bands,
// then $100+ beside Other amount; and the "Works with your AI" panel
// leaves the consumer pages for a single developer page, /ai, with one
// footer link keeping the path. The old panel's "the draw itself stays
// here on the site" went false the night the v2 MCP server shipped
// (it runs the draw in chat), so /ai describes the tools as they are.
{
  const rd = (f) => fs.readFileSync(new URL("../site/" + f, import.meta.url), "utf8");
  const homeP = rd("index.html"), dnoP = rd("draw-names-online.html"), genP = rd("secret-santa-generator.html");
  const asP = rd("amigo-secreto.html"), asoP = rd("amigo-secreto-online.html");
  const vdP = rd("variant-draw.js"), vdCssP = rd("variant-draw.css"), aiP = rd("ai.html");
  check("chips: the free chip rides in the same box as the band chips (no separate free row)",
    vdP.includes("chips.appendChild(freeChip)") && !vdP.includes("vd-chips-free") && !vdCssP.includes("vd-chips-free"));
  check("chips: the budget chip box deals two rows of uniform one-third chips (fixed third, no grow)",
    vdCssP.includes(".vd-chips .vd-chip{flex:0 1 calc((100% - 16px)/3)"));
  check("chips: every budget chip is the same 48px height with a flex-centered label (no row stretches when a label wraps)",
    vdCssP.includes("height:48px") && vdCssP.includes("display:flex;align-items:center;justify-content:center"));
  check("panel: the Works with your AI section is off all three consumer entry pages",
    [homeP, dnoP, genP].every((s) => !s.includes('class="works-with-ai"') && !s.includes('id="worksWithAi"')));
  check("panel: the false stays-on-the-site sentence is gone from every page incl. /ai",
    [homeP, dnoP, genP, aiP].every((s) => !s.includes("stays here on the site")));
  check("panel: the landers never carried the section and still do not",
    !asP.includes("works-with-ai") && !asoP.includes("works-with-ai"));
  check("panel: each consumer footer links to the developer page",
    [homeP, dnoP, genP].every((s) => s.includes('<a href="/ai">For developers</a>')));
  check("panel: /ai carries the connect block (address, copy control, both setup blocks)",
    aiP.includes("https://mcp.pickmysecretsanta.com/mcp") && aiP.includes('class="wai-copy"') &&
    aiP.includes("claude mcp add --transport http secret-santa") && aiP.includes("Claude Desktop or Cursor"));
  check("panel: /ai describes the in-chat draw honestly and carries the canonical storage sentence",
    aiP.includes("Run the draw in chat") &&
    aiP.includes("The draw is picked in your browser. To make the private links work, the names and matches are stored on our server, in a form we can read."));
  check("panel: the sitemap lists the developer page",
    rd("sitemap.xml").includes("<loc>https://pickmysecretsanta.com/ai</loc>"));
}

// ---- Nov 22, 2026: a stored Other with no words restores as the default band ----
// Billy, on /draw-names-online: "the default was other." A bare tap
// on the free chip saves the draft with free set and an empty text;
// restoring it reopened the form on Other amount with an empty
// field, a state that carries no budget at all. The stored-draft
// landing (applyStoredDraft, shared by restore and the Start-fresh
// undo) now lands free mode only when the draft carries actual
// budget words: an empty or whitespace-only free text falls to the
// $25-$50 default and re-mirrors, while a draft with real words
// still restores as Other with its text. Fresh state is unchanged.
{
  const vdB = fs.readFileSync(new URL("../site/variant-draw.js", import.meta.url), "utf8");
  check("budget default: fresh form state starts on the middle band with free mode off",
    vdB.includes('var band = "m2550";') && vdB.includes("var bandFree = false;"));
  check("budget default: the stored-draft landing reads the draft's free text before landing it",
    vdB.includes("var draftBf = typeof d.bf === \"string\"") && vdB.includes("if (d.free && !draftBf.replace("));
  check("budget default: an empty free text lands on the $25-$50 default and re-mirrors",
    vdB.includes("bandFree = false;\n      band = \"m2550\";") && vdB.includes("freeInput.value = \"\";"));
  check("budget default: a free text with words still restores as Other with its text",
    vdB.includes("} else if (d.free) {") && vdB.includes("freeInput.value = draftBf;"));
}

// 20. Free-text banding (SPEC-SS-FREEBAND-01, Nov 22, 2026): a
//     free-text budget used to band every draw m2550 while every
//     surface displayed the typed words — an undisclosed
//     approximation. CORE.resolveFreeBand now reads the typed
//     amount (first number, comma/period decimals, thousands
//     separators), detects its currency, converts to a USD
//     equivalent with a static approximate table (banding only),
//     and both draw paths plus the step-2 words matcher resolve
//     the band from the text at the moment they consume it. The
//     typed text still rides as `bf` and displays verbatim; only
//     the stored band becomes honest. No number (or no currency,
//     read as USD) falls back exactly as before.
{
  const R = CORE.resolveFreeBand;
  check("freeband: resolver is exported", typeof R === "function");
  check("freeband: '20€' bands under $25 (EUR converted)", R("20€") === "u25", R("20€"));
  check("freeband: '$200' bands $100+", R("$200") === "m100", R("$200"));
  check("freeband: '£75' bands $50-$100 (GBP converted)", R("£75") === "m50100", R("£75"));
  check("freeband: 'about 40 dollars' bands $25-$50", R("about 40 dollars") === "m2550", R("about 40 dollars"));
  check("freeband: 'no limit lol' keeps the middle-band fallback", R("no limit lol") === "m2550", R("no limit lol"));
  check("freeband: empty text keeps the middle-band fallback", R("") === "m2550" && R(null) === "m2550");
  check("freeband: a bare number reads as USD", R("150") === "m100" && R("10") === "u25" && R("30") === "m2550");
  check("freeband: band edges — 25 and 50 in the middle band, 100 in $50-$100",
    R("$25") === "m2550" && R("$50") === "m2550" && R("$100") === "m50100" && R("$101") === "m100");
  check("freeband: decimal comma parses ('20,50 €' is under $25)", R("20,50 €") === "u25", R("20,50 €"));
  check("freeband: thousands separators parse ('1,000 pesos' is $50-$100 in MXN)",
    R("1,000 pesos") === "m50100", R("1,000 pesos"));
  check("freeband: European thousands parse ('1.000 €' is $100+)", R("1.000 €") === "m100", R("1.000 €"));
  check("freeband: won convert at scale ('30000 won' is under $25)", R("30000 won") === "u25", R("30000 won"));
  check("freeband: reais convert ('R$ 100' is under $25)", R("R$ 100") === "u25", R("R$ 100"));
  check("freeband: the first number wins ('25-50 range' bands on 25)", R("25-50 range") === "m2550", R("25-50 range"));

  const vdF = fs.readFileSync(new URL("../site/variant-draw.js", import.meta.url), "utf8");
  const appF = fs.readFileSync(new URL("../site/app.js", import.meta.url), "utf8");
  check("freeband: the variant draw resolves the band from the free text at draw time",
    vdF.includes("if (budgetFree) band = CORE.resolveFreeBand(budgetFree);"));
  check("freeband: the classic draw resolves the band from the free text at draw time",
    appF.includes("if (budgetFree) state.band = CORE.resolveFreeBand(budgetFree);"));
  check("freeband: the step-2 words matcher resolves in free mode",
    appF.includes("if (state.bandFree) band = CORE.resolveFreeBand(currentBudgetFree());"));
  check("freeband: resolution is gated on a typed text in both draws (band-chip draws untouched)",
    (vdF.match(/if \(budgetFree\)/g) || []).length >= 2 && (appF.match(/if \(budgetFree\)/g) || []).length >= 2);
  // The token a resolved free-text draw mints: `b` carries the
  // resolved band's label, `bf` the words verbatim — the exact
  // shape parseToken already accepts, and the shape every
  // downstream reader (reveal re-deal, recipient Ask) keys off.
  const fbTok = CORE.makeToken({ v: 1, g: "Test", b: "Under $25", bf: "20€", you: "Ana", got: "Ben", pi: ["x"] });
  const fbBack = CORE.parseToken(fbTok);
  check("freeband: a resolved-band token roundtrips with bf verbatim",
    !!fbBack && fbBack.b === "Under $25" && fbBack.bf === "20€");
}

// 21. Cold-flow sim fixes (Nov 22, 2026, Billy: "Ship those
//     changes"): the sim's live walk at 3/10/20 people found
//     (1) gift ideas repeating across a draw's lists — each
//     person's six was picked independently, with only the
//     previous lead picks remembered; (2) a Santa's
//     interest-matched list reshuffling on every visit — the
//     reveal re-deal took a fresh random seed per load; and
//     (3) no way to delete a whole draw — cleanup took 33
//     per-link revokes and the records still remained.
//     Fix 1 deals the picks across the whole draw
//     (CORE.dealDrawPicks in both draw paths, and in the MCP
//     server's vendored core); fix 2 seeds the re-deal with a
//     stable key (CORE.pickGiftsForKey); fix 3 adds the manage
//     page's delete (worker endpoint + this client wiring; the
//     worker's own API tests live with the worker).
{
  const D = CORE.dealDrawPicks;
  check("deal: dealDrawPicks is exported", typeof D === "function");
  const dealPool = (band) => BANK.filter((i) => i.budget === band && i.category !== "Kid" && !i.retired);

  // A 3-person $25-$50 draw deals 18 slots from a 50-idea pool:
  // nothing may repeat anywhere in the draw.
  for (const seed of [11, 222, 3333]) {
    const dealt = D(BANK, "m2550", ["", "", ""], CORE.rng(seed));
    const all = dealt.flat().map((p) => p.id);
    check("deal: 3-person m2550 draw (seed " + seed + ") deals 18 distinct ideas",
      dealt.length === 3 && dealt.every((six) => six.length === 6) && new Set(all).size === 18,
      { dealt: dealt.map((s) => s.map((p) => p.id)) });
  }

  // The exhaustion case the brief names: 20 people in the
  // $50-$100 band. The dealable pool (band, non-Kid, non-retired)
  // is 25 ideas for 120 slots, so every idea is dealt 4 or 5
  // times — balanced reuse, never a third dealing before every
  // idea has been dealt twice, and never twice in one person's six.
  {
    const pool = dealPool("m50100");
    check("deal: the m50100 dealable pool is 25 ideas", pool.length === 25, pool.length);
    for (const seed of [7, 99, 12345]) {
      const dealt = D(BANK, "m50100", Array(20).fill(""), CORE.rng(seed));
      const counts = {};
      let perPersonOk = true;
      dealt.forEach((six) => {
        if (six.length !== 6 || new Set(six.map((p) => p.id)).size !== 6) perPersonOk = false;
        six.forEach((p) => { counts[p.id] = (counts[p.id] || 0) + 1; });
      });
      const vals = pool.map((i) => counts[i.id] || 0);
      const mn = Math.min(...vals), mx = Math.max(...vals);
      check("deal: 20-person m50100 draw (seed " + seed + ") deals every idea, balanced within 1",
        perPersonOk && Object.keys(counts).length === pool.length && mx - mn <= 1 && mn >= 4,
        { mn, mx, distinct: Object.keys(counts).length });
    }
  }

  // Sweep: sizes 3..30, every band — six distinct in-band picks
  // per person, every time.
  {
    let sweepOk = true, sweepExtra = "";
    for (const band of ["u25", "m2550", "m50100", "m100"]) {
      const poolIds = new Set(dealPool(band).map((i) => i.id));
      for (let n = 3; n <= 30 && sweepOk; n += 3) {
        const dealt = D(BANK, band, Array(n).fill("surprise"), CORE.rng(n * 31 + band.length));
        for (const six of dealt) {
          if (six.length !== 6 || new Set(six.map((p) => p.id)).size !== 6 ||
              !six.every((p) => poolIds.has(p.id))) { sweepOk = false; sweepExtra = band + " n=" + n; }
        }
      }
    }
    check("deal: sweep sizes 3..30 x 4 bands — six distinct in-band picks per person", sweepOk, sweepExtra);
  }

  // Interest preference survives the deal: the first person
  // dealt, whose receiver wants an interest the pool holds,
  // leads with a matching idea (the pickGifts finish).
  {
    const pool = dealPool("m2550");
    const someInterest = ["cooking", "books", "tech", "games", "music"]
      .find((x) => pool.some((i) => i.interests.includes(x)));
    const dealt = D(BANK, "m2550", [someInterest, "", ""], CORE.rng(4242));
    check("deal: an interest the pool holds still leads its receiver's list",
      !!someInterest && dealt[0][0].interests.includes(someInterest),
      { someInterest, lead: dealt[0][0] && dealt[0][0].id });
  }

  // The token a dealt draw mints keeps its exact shape.
  {
    const dealt = D(BANK, "m2550", ["", "", ""], CORE.rng(8));
    const tok = CORE.makeToken({ v: 1, g: "Test", b: "$25-$50", you: "Ana", got: "Ben", pi: dealt[0].map((p) => p.id) });
    const back = CORE.parseToken(tok);
    check("deal: a dealt draw's token roundtrips with six unique picks",
      !!back && back.pi.length === 6 && new Set(back.pi).size === 6);
  }

  const vdD = fs.readFileSync(new URL("../site/variant-draw.js", import.meta.url), "utf8");
  const appD = fs.readFileSync(new URL("../site/app.js", import.meta.url), "utf8");
  check("deal: the variant draw deals across the group",
    vdD.includes("CORE.dealDrawPicks(BANK, band,"));
  check("deal: the classic draw deals across the group",
    appD.includes("CORE.dealDrawPicks(BANK, state.band,"));
  check("deal: neither draw path keeps the old lead-pick-only memory",
    !vdD.includes("usedIds[picks[0].id] = true") && !appD.includes("usedIds[picks[0].id] = true"));

  // Fix 2 — the stable re-deal.
  const K = CORE.pickGiftsForKey;
  check("stable: pickGiftsForKey is exported", typeof K === "function");
  {
    const key = ["draw42", "Ana", "Ben", "m2550", "books,cooking"].join("\u0000");
    const a = K(BANK, "m2550", ["books", "cooking"], key).map((p) => p.id);
    const b = K(BANK, "m2550", ["books", "cooking"], key).map((p) => p.id);
    check("stable: the same key deals the same six, in the same order",
      JSON.stringify(a) === JSON.stringify(b) && a.length === 6, { a, b });
    check("stable: the keyed deal is exactly pickGifts on the keyed rng",
      JSON.stringify(a) === JSON.stringify(
        CORE.pickGifts(BANK, "m2550", ["books", "cooking"], CORE.rng(key), null).map((p) => p.id)));
    const outs = new Set();
    for (const ids of [["books"], ["cooking"], ["tech"], ["games"], ["music"], ["travel"]]) {
      outs.add(JSON.stringify(K(BANK, "m2550", ids, ["draw42", "Ana", "Ben", "m2550", ids.join(",")].join("\u0000")).map((p) => p.id)));
    }
    check("stable: different interest sets re-deal (the key actually seeds)", outs.size >= 2, outs.size);
  }
  check("stable: the reveal re-deals through the keyed path",
    appD.includes("CORE.pickGiftsForKey(BANK, bandId, matchInt.ids, dealKey)"));
  check("stable: the key carries draw, giver, match, band and the sorted interest ids",
    appD.includes('matchInt.ids.slice().sort().join(",")') &&
    appD.includes('di: data.di || null') && appD.includes('di: data2.di || null'));
  check("stable: the old per-load random re-deal is gone",
    !appD.includes("pickGifts(BANK, bandId, matchInt.ids, CORE.rng(CORE.randomSeed())"));

  // Fix 3 — the delete control's client wiring (the worker
  // endpoint and its residue proof live in the worker tests).
  check("delete: the manage page posts to the draw's delete endpoint",
    appD.includes('"/" + encodeURIComponent(code) + "/delete"'));
  check("delete: the control is labeled 'Delete this draw'",
    appD.includes('"Delete this draw"'));
  check("delete: the confirm carries the mandated plain copy",
    appD.includes("This deletes the draw and every link for good. This cannot be undone."));
  check("delete: success clears this device's saved record only when it is this draw",
    appD.includes("savedRec2.sl.m === code") && appD.includes("clearDrawRecord()"));
  const esD = fs.readFileSync(new URL("../site/i18n-es.js", import.meta.url), "utf8");
  const ptD = fs.readFileSync(new URL("../site/i18n-pt.js", import.meta.url), "utf8");
  const deleteKeys = ["title", "line", "btn", "confirm_line", "confirm_btn", "cancel_btn", "error", "done_title", "done_line"];
  check("delete: the ES pack carries every manage_delete string",
    deleteKeys.every((k) => esD.includes('"manage_delete.' + k + '":')));
  check("delete: the PT pack carries every manage_delete string",
    deleteKeys.every((k) => ptD.includes('"manage_delete.' + k + '":')));
}

// 22. Mobile audit fixes (Nov 22, 2026, Billy: "Fix all" — the
//     same-day mobile audit's four defects). D1: the Helper's
//     auto-expanded bubble covered the reveal gift card's text
//     and its dismiss x measured 28x28. D2: the browser focus
//     ring around the script-focused match name rendered as a
//     black frame with a stepped top border. D3: the header
//     brand link measured 34px tall (25px on the ES wordmark),
//     under the 44px tap floor. D4: the countdown unit labels
//     rendered at 9.9px portrait / 8.8px landscape, the smallest
//     text on the site. These guards hold the static shape; the
//     rendered measurements live in the lane's walk.
{
  const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), "utf8");
  const helperJs = read("../site/helper.js");
  const yieldDef = helperJs.slice(helperJs.indexOf("var BUBBLE_YIELD_SEL"),
    helperJs.indexOf("var BUBBLE_YIELD_SEL") + 1200);
  check("D1: the bubble's yield set covers the gift card",
    yieldDef.includes(".giftcard"), yieldDef);
  check("D1: the yield repaint also runs on re-renders, not only on scroll",
    helperJs.includes("new MutationObserver(queueYield)") &&
    helperJs.includes('addEventListener("click", queueYield, true)'));
  const helperCss = read("../site/helper.css");
  const xBlock = helperCss.slice(helperCss.indexOf(".shp-bubble-x{"),
    helperCss.indexOf("}", helperCss.indexOf(".shp-bubble-x{")));
  const xDims = ["width", "height", "min-width", "min-height"].map((k) => {
    const m = new RegExp(k + ":(\\d+)px").exec(xBlock);
    return m ? Number(m[1]) : 0;
  });
  check("D1: the bubble dismiss tap area is at least 44x44",
    xDims.every((n) => n >= 44), xDims.join(","));
  const indexHtml = read("../site/index.html");
  check("D2: the script-focused match name carries no focus frame",
    indexHtml.includes(".matchname:focus{outline:none}"));
  const siteDir = new URL("../site/", import.meta.url);
  const htmlFiles = fs.readdirSync(siteDir).filter((f) => f.endsWith(".html"));
  const brandRule = ".topbar a.brandhome{display:flex;align-items:center;gap:9px;text-decoration:none;color:inherit;min-height:44px}";
  const brandFiles = htmlFiles.filter((f) => read("../site/" + f).includes("a.brandhome"));
  check("D3: every page's header brand link is at least 44px tall (" + brandFiles.length + " pages)",
    brandFiles.length >= 40 && brandFiles.every((f) => read("../site/" + f).includes(brandRule)),
    brandFiles.length + " brand pages");
  const amigoFiles = htmlFiles.filter((f) => f.startsWith("amigo-"));
  check("D3: every ES lander's wordmark link is at least 44px tall (" + amigoFiles.length + " pages)",
    amigoFiles.length === 4 && amigoFiles.every((f) =>
      read("../site/" + f).includes(".topbar a.wordmark{text-decoration:none;display:flex;align-items:center;min-height:44px}")),
    amigoFiles.join(","));
  for (const f of ["index.html", "draw-names-online.html", "secret-santa-generator.html"]) {
    const src = read("../site/" + f);
    check("D4: " + f + " countdown unit labels are at least 11px in both compositions",
      src.includes(".cdx-cell i{font-style:normal;font-size:.6875rem") &&
      src.includes("#organizer>.hero .cdx-cell i{font-size:.6875rem") &&
      !src.includes(".cdx-cell i{font-style:normal;font-size:.62rem") &&
      !src.includes(".cdx-cell i{font-size:.55rem"));
  }
}

// 23. Form order (SPEC-SS-FORMORDER-01, Nov 22, 2026, Billy's
//     approval): on the shared variant form, the roster moves
//     above the budget and the optional organizer field. The
//     target sequence is group name, Who is in?, Gift budget,
//     Your name, Pairs to keep apart, Draw. This is a DOM-order
//     guard only — field ids, listeners, the draft mirror, the
//     organizer prefill and every budget behavior keep their own
//     guards above.
{
  const vdOrder = fs.readFileSync(new URL("../site/variant-draw.js", import.meta.url), "utf8");
  const appendAt = (needle) => vdOrder.indexOf(needle);
  const groupAt = appendAt("form.appendChild(gl);");
  const whoAt = appendAt('form.appendChild(el("span", "vd-label", S.whoLabel));');
  const peopleAt = appendAt("form.appendChild(peopleBox);");
  const budgetAt = appendAt('form.appendChild(el("span", "vd-label", S.budgetLabel));');
  const chipsAt = appendAt("form.appendChild(chips);");
  const freeAt = appendAt("form.appendChild(freeWrap);");
  const orgAt = appendAt("form.appendChild(ol);");
  const orgInputAt = appendAt("form.appendChild(orgInput);");
  const pairsAt = appendAt("form.appendChild(details);");
  const drawAt = appendAt("form.appendChild(drawBtn);");
  check("form order: group name, roster, budget, organizer, pairs, then Draw",
    [groupAt, whoAt, peopleAt, budgetAt, chipsAt, freeAt, orgAt, orgInputAt, pairsAt, drawAt]
      .every((n) => n >= 0) &&
    groupAt < whoAt && whoAt < peopleAt && peopleAt < budgetAt &&
    budgetAt < chipsAt && chipsAt < freeAt && freeAt < orgAt &&
    orgAt < orgInputAt && orgInputAt < pairsAt && pairsAt < drawAt,
    [groupAt, whoAt, peopleAt, budgetAt, chipsAt, freeAt, orgAt, orgInputAt, pairsAt, drawAt].join(","));
  const vdCssOrder = fs.readFileSync(new URL("../site/variant-draw.css", import.meta.url), "utf8");
  check("form order: the first-label margin rule keys off first-child, not element type",
    vdCssOrder.includes(".vd-label:first-child{margin-top:0}") &&
    !vdCssOrder.includes(".vd-label:first-of-type"));
}

// 24. Manage findability (SPEC-SS-MANAGEFIND-01 / HEALTH-01,
//     Nov 22, 2026, Billy: "Ship both manage-page
//     improvements"): the status block under the manage page's
//     group name gains (1) the pairings entry line — one plain
//     line that scrolls the existing pairings card into view
//     and opens the SAME declaration gate, never a way around
//     it — and (2) the checked line, rendered only when the
//     server's counts-only /health verification returns ok in
//     full. The endpoint's truth proof (bijection, self-pair,
//     missing record, revoke) lives in the worker tests; here
//     the client wiring and the pack strings are guarded.
{
  const appM = fs.readFileSync(new URL("../site/app.js", import.meta.url), "utf8");
  check("managefind: the entry line carries the mandated copy",
    appM.includes("Running this for a group you're not in? See all the pairings."));
  check("managefind: the entry line is a button in the status block, above the people rows",
    appM.includes('make("button", "peekentry"') &&
    appM.indexOf('make("button", "peekentry"') > appM.indexOf("function renderManage") &&
    appM.indexOf('make("button", "peekentry"') < appM.indexOf("loadManageRows(opensBox, code, rec)"));
  check("managefind: the entry line scrolls the pairings card in and opens the same gate",
    appM.includes("peekEntry.addEventListener(\"click\"") &&
    appM.includes("peekCard.scrollIntoView();") &&
    appM.includes("showPeekGate(code, peekListBox);"));
  check("managefind: the gate itself is untouched — the pairings fetch still lives only in its confirm handlers",
    (appM.match(/\/pairings"/g) || []).length === 2 &&
    appM.includes('T("manage_peek.declare")'));
  check("health: the manage page asks the counts-only health endpoint",
    appM.includes('"/" + encodeURIComponent(code) + "/health"'));
  check("health: the line renders only on a full ok with a numeric count",
    appM.includes("data.ok === true && typeof data.n === \"number\""));
  check("health: the line carries the mandated format",
    appM.includes('"Checked: " + data.n + " links, everyone has a match, nobody drew themselves."') &&
    appM.includes('TF("manage_health.line", { n: data.n })'));
  check("health: the line is inserted in the status block, above the entry line",
    appM.includes("statusBox.insertBefore(healthLine, peekEntry)"));
  const esM = fs.readFileSync(new URL("../site/i18n-es.js", import.meta.url), "utf8");
  const ptM = fs.readFileSync(new URL("../site/i18n-pt.js", import.meta.url), "utf8");
  check("managefind: the ES pack carries the entry line and the checked line",
    esM.includes('"manage_peek.entry":') && esM.includes('"manage_health.line":'));
  check("managefind: the PT pack carries the entry line and the checked line",
    ptM.includes('"manage_peek.entry":') && ptM.includes('"manage_health.line":'));
  const idxM = fs.readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
  check("managefind: the entry line gets the manage text-button tap treatment",
    idxM.includes("#manageView .peekentry{") && idxM.includes("min-height:44px"));
  const hlpM = fs.readFileSync(new URL("../site/helper.js", import.meta.url), "utf8");
  check("managefind: helper pack pins follow the packs (es rk56, pt rk57)",
    hlpM.includes('PACK_PIN = { es: "rk56", pt: "rk57" }'));
}

// 25. Delight pass (Nov 23, 2026, Billy: "Agree fix all" plus
//     the sample/unwrap additions the same morning):
//     (1) the Helper greeting is cut to two lines in all three
//     locales — the capability line, then the privacy line,
//     which is load-bearing and never dropped; the header
//     consent subline is unchanged. (2) On the answer pages
//     (the ones carrying an "In short" card stack) the stack's
//     sections join both Helper yield sets, so the collapsed
//     entry never covers card text. (3) The opt-in delight
//     layer: delight.js loads on exactly the three entry pages
//     and the ES/PT landers; the draw ceremony lives in
//     variant-draw.js, gated on the opt-in flag and on reduced
//     motion, bounded by the mint settling and ~600 ms with a
//     6 s cap. (4) The "Or tap to unwrap" button is gone from
//     the real reveal's wiring too (its markup and the sample's
//     are held by the hold-mirror block above); the keyboard
//     unwrap stays.
{
  const rdD = (f) => fs.readFileSync(new URL("../site/" + f, import.meta.url), "utf8");
  const hlpD = rdD("helper.js"), esD = rdD("i18n-es.js"), ptD = rdD("i18n-pt.js");
  check("delight: the Helper greeting is the two mandated lines (EN), the long greeting gone",
    hlpD.includes("I can set up your draw, open your link, or answer questions.") &&
    hlpD.includes("Names and draws never do.") &&
    !hlpD.includes("step by step, answer questions about how Secret Santa works here"));
  check("delight: the ES greeting carries the same two lines",
    esD.includes("Puedo organizar tu sorteo, abrir tu enlace o responder preguntas.") &&
    esD.includes("Los nombres y los sorteos nunca.") &&
    !esD.includes("organizar tu sorteo paso a paso"));
  check("delight: the PT greeting carries the same two lines",
    ptD.includes("Posso organizar seu sorteio, abrir seu link ou responder perguntas.") &&
    ptD.includes("Os nomes e os sorteios nunca.") &&
    !ptD.includes("organizar seu sorteio passo a passo"));
  check("delight: the Helper header consent subline is unchanged",
    hlpD.includes('consent: "Gift draw helper · I only act when you tap or ask"'));
  check("delight: the answer-card sections join the Helper yield sets on In-short pages only",
    hlpD.includes("CARD_YIELD") && hlpD.includes('section.block[aria-label="In short"]') &&
    hlpD.includes('", section.block"') && hlpD.includes("+ CARD_YIELD"));
  const dlD = rdD("delight.js");
  check("delight: delight.js sets the opt-in flag and gates everything on reduced motion",
    dlD.includes("__SS_DELIGHT__") && dlD.includes("prefers-reduced-motion") &&
    dlD.includes("IntersectionObserver") && dlD.includes("ss-snow") &&
    dlD.includes('classList.add("js")') && dlD.includes("ss-fade"));
  const delightPages = ["index.html", "draw-names-online.html", "secret-santa-generator.html",
    "amigo-secreto.html", "amigo-invisible.html", "amigo-secreto-sin-correo.html", "amigo-secreto-online.html"];
  check("delight: exactly the three entry pages and the ES/PT landers load delight.js",
    delightPages.every((f) => rdD(f).includes('<script src="/delight.js?v=d1"></script>')) &&
    !rdD("kris-kringle-generator.html").includes("delight.js") &&
    !rdD("how-many-people-do-you-need-for-secret-santa.html").includes("delight.js"));
  const vdD = rdD("variant-draw.js");
  check("delight: the draw ceremony is opt-in, reduced-motion safe, and bounded by the mint",
    vdD.includes("startCeremony(rec)") && vdD.includes("window.__SS_DELIGHT__") &&
    vdD.includes("rec.mintSettled && elapsed >= 600") && vdD.includes("elapsed >= 6000") &&
    vdD.includes('shuffling: "Shuffling the names…"') &&
    vdD.includes('shuffling: "Mezclando los nombres…"') &&
    vdD.includes('shuffling: "Misturando os nomes…"'));
  const appD2 = rdD("app.js");
  check("delight: the real reveal has no tap-button wiring; the keyboard unwrap stays",
    !appD2.includes('el("peekTap")') && !appD2.includes("#peekTap is the plain-tap fallback") &&
    appD2.includes('btn.addEventListener("keydown"') && appD2.includes("var HOLD_MS = 900"));
}

// 26. Start-from-the-sample scroll (Nov 23, 2026): after the
//     sample roster lands in the form, the form must come into
//     view — Billy's desktop bug was the roster copying while the
//     page never scrolled. The kit exposes one shared scroll
//     helper (explicit window scroll + a settle re-check, instant
//     under reduced motion); every Start-from-the-sample wiring
//     (the homepage bridge in app.js, the inline wiring on the
//     two query pages) must call it, and the homepage focus must
//     be fine-pointer only so mobile never gets an uninvited
//     keyboard.
{
  const rdD = (f) => fs.readFileSync(new URL("../site/" + f, import.meta.url), "utf8");
  const vdS = rdD("variant-draw.js");
  check("sample-scroll: the kit exposes the shared scroll helper with a settle re-check",
    vdS.includes("window.__SS_VDRAW_SCROLL__ = scrollFormIntoView") &&
    vdS.includes("prefers-reduced-motion: reduce") &&
    vdS.includes("window.scrollTo") && vdS.includes("innerHeight - 60"));
  const appS = rdD("app.js");
  check("sample-scroll: the homepage bridge scrolls via the helper and focuses fine-pointer only",
    appS.includes("window.__SS_VDRAW_SCROLL__()") &&
    appS.includes('matchMedia("(pointer: fine)")'));
  check("sample-scroll: both query pages scroll via the helper",
    rdD("draw-names-online.html").includes("window.__SS_VDRAW_SCROLL__") &&
    rdD("secret-santa-generator.html").includes("window.__SS_VDRAW_SCROLL__"));
}

// 27. "Random code" sweep (Nov 23, 2026, Billy's order): the
//     phrase was internal jargon that read like a privacy
//     protection. No page may carry it (or its ES/PT forms);
//     the privacy short version carries the approved plain
//     replacement, and the open-notes passage keeps the facts
//     (filed under the draw's code; no name, no match, no gift
//     pick; 120-day deletion) in all three languages.
{
  const rdE = (f) => fs.readFileSync(new URL("../site/" + f, import.meta.url), "utf8");
  const privE = rdE("privacy.html"), llmsE = rdE("llms-full.txt");
  check("random-code sweep: privacy and llms-full carry no 'random code' in any language",
    !/random code|código al azar|código aleatório|códigos al azar|códigos aleatórios/i.test(privE) &&
    !/random code|código al azar|código aleatório|códigos al azar|códigos aleatórios/i.test(llmsE));
  check("random-code sweep: the approved short-version replacement is on /privacy",
    privE.includes("A draw also notes which of its links have been opened. The note holds no name and no match, just that the link was opened."));
  check("random-code sweep: the open-notes facts survive (filed under the draw's code, 120 days, EN/ES/PT)",
    privE.includes("filed under the draw's code") && privE.includes("deletes itself after 120 days") &&
    privE.includes("guardada bajo el código de ese sorteo") && privE.includes("120 días") &&
    privE.includes("guardada sob o código daquele sorteio") && privE.includes("120 dias"));
}

// 28. One standard footer + plugin truth (Nov 23, 2026, Part 4,
//     Billy's "yes ship it"): every page's footer carries the
//     same link row (Home · Privacy · For developers · Terms —
//     Terms kept because the footers were its only inbound path)
//     and the ChatGPT plugin highlight line; no footer carries a
//     Share link; /ai states the v2.0.0 published status; and the
//     v1 "plugin never draws" framing is gone from the legal
//     pages and the llms files.
{
  const rdF = (f) => fs.readFileSync(new URL("../site/" + f, import.meta.url), "utf8");
  const pagesF = fs.readdirSync(new URL("../site/", import.meta.url))
    .filter((f) => f.endsWith(".html") && f !== "og-card.html");
  const HL = ["Secret Santa plugin</a> is approved and live.",
    "plugin de Secret Santa</a> está aprobado y activo.",
    "plugin de Secret Santa</a> está aprovado e ativo."];
  check("footer: every page carries the standard footer (plugin highlight present)",
    pagesF.every((f) => HL.some((h) => rdF(f).includes(h))), pagesF.length);
  check("footer: no page's footer links Share",
    pagesF.every((f) => {
      const m = rdF(f).match(/<footer[\s\S]*?<\/footer>/g) || [];
      return m.every((foot) => !foot.includes("/share"));
    }));
  check("footer: every page's footer links /ai as For developers (or its ES/PT label)",
    pagesF.every((f) => {
      const m = rdF(f).match(/<footer[\s\S]*?<\/footer>/g) || [];
      return m.some((foot) => foot.includes('<a href="/ai">For developers</a>') ||
        foot.includes('<a href="/ai">Para desarrolladores</a>') ||
        foot.includes('<a href="/ai">Para desenvolvedores</a>'));
    }));
  check("footer: /ai states the ChatGPT plugin is approved and live (v2.0.0)",
    rdF("ai.html").includes("plugin for ChatGPT is approved and live (v2.0.0)"));
  check("plugin truth: the v1 'never draws' framing is gone from legal pages and llms files",
    ["privacy.html", "terms.html", "llms.txt", "llms-full.txt"].every((f) =>
      !/never draws|never assigns|nunca sortea|nunca sorteia|never sees a match|three tools/i.test(rdF(f))));
  check("plugin truth: the MCP lists four tools including the draw tool",
    rdF("llms.txt").includes("four tools") && rdF("llms.txt").includes("draw_secret_santa_names"));
}

// ---- Nov 23, 2026: SPEC-SS-RESEND-01 — the manage page's Still
// waiting section (Billy's approval after the draw-death forensic).
// Guards: the section builds only from the known-unopened set, the
// per-person reminder is the locked nudge (one person's link only),
// the group reminder can never carry a link in any language, its
// event is counts-only, and both packs carry every new string.
{
  const appR = fs.readFileSync(new URL("../site/app.js", import.meta.url), "utf8");
  const esR = fs.readFileSync(new URL("../site/i18n-es.js", import.meta.url), "utf8");
  const ptR = fs.readFileSync(new URL("../site/i18n-pt.js", import.meta.url), "utf8");
  check("resend: Still waiting section exists and builds only from known-unopened, non-revoked people",
    appR.includes('T("manage_view.still_waiting_title") || "Still waiting"') &&
    appR.includes("if (!(e2 && (e2.o || e2.r))) waiting.push(person);") &&
    appR.includes("if (person.x) return;"));
  check("resend: per-person reminder reuses the locked nudge with only that person's link, share-first, as manage_nudge/still_waiting",
    appR.includes('nudgeText({ budget: rec.b, bf: rec.bf }, person.n, surl)') &&
    appR.includes('var surl = SHORT_BASE + "/s/" + person.c;') &&
    appR.includes('surface: "still_waiting"') &&
    appR.includes('TF("manage_view.copy_reminder_for", { name: person.n })'));
  check("resend: group reminder event fires counts only (no names, no codes)",
    appR.includes('fleetTrack("manage_group_reminder"') &&
    appR.includes("waiting_count: waiting.length") &&
    appR.includes('trackManageAction("copy-group-reminder")'));
  const grpEs = (esR.match(/"messages\.group_reminder": "([^"]*)"/) || [])[1] || "";
  const grpPt = (ptR.match(/"messages\.group_reminder": "([^"]*)"/) || [])[1] || "";
  check("resend: group reminder templates carry no link in any language (the leak rule)",
    !/http|\/s\/|pickmysecretsanta\.com/.test(grpEs) && !/http|\/s\/|pickmysecretsanta\.com/.test(grpPt) &&
    !/http|\/s\//.test("still haven't opened their private links") &&
    grpEs.includes("{names}") && grpPt.includes("{names}"));
  check("resend: ES and PT packs carry every new Still waiting string",
    ["still_waiting_title", "copy_reminder_for", "copy_group_reminder", "group_reminder_copied", "list_and"]
      .every((k) => esR.includes('"manage_view.' + k + '"') && ptR.includes('"manage_view.' + k + '"')));
}

// 25. Group name generator (SPEC-SS-GROUPNAME-01, Nov 23, 2026,
//     Billy's "Ship it"): the shared form's group name field
//     arrives prefilled with a generated name and carries a
//     shuffle button that rolls another. Flavor is Billy's call:
//     short names with mischief in them, workplace-safe; the
//     generator is a word-bank picker, never an AI call and
//     never labeled AI. The behavioral proofs (prefill on load,
//     shuffle changes + never repeats, cleared stays cleared
//     through a draw, draws complete named and unnamed, ES/PT
//     banks are their own) live in the lane's rendered walk;
//     here the wiring and the banks are guarded.
{
  const vdG = fs.readFileSync(new URL("../site/variant-draw.js", import.meta.url), "utf8");
  const vdCssG = fs.readFileSync(new URL("../site/variant-draw.css", import.meta.url), "utf8");
  check("groupname: generator and banks ship in the shared form module",
    vdG.includes("SPEC-SS-GROUPNAME-01") && vdG.includes("var GROUP_BANKS") &&
    vdG.includes("function genGroupName(avoid)") &&
    vdG.includes("window.__SS_GROUPNAME__ = { next: genGroupName, banks: GROUP_BANKS }"));
  check("groupname: Billy's approved fixed names are in the EN bank",
    ["Reindeer Games", "Elf Chaos", "Santa's Suspects", "Mistletoe Mayhem",
     "Sleigh All Day", "Claus and Effect", "The Naughty List", "Jingle Squad",
     "Tinsel Trouble", "Yule Fools", "Ho Ho Homies", "Elf Surveillance",
     "Wrap Stars", "Feral Elves"].every((n) => vdG.includes('"' + n + '"')));
  check("groupname: ES and PT banks carry their own jokes, not translations",
    vdG.includes('"Operación Turrón"') && vdG.includes('"La Pandilla del Turrón"') &&
    vdG.includes('"Turma do Panetone"') && vdG.includes('"Operação Panetone"'));
  check("groupname: all three packs carry the shuffle button's aria label",
    vdG.includes('groupShuffleAria: "Shuffle a new group name"') &&
    vdG.includes('groupShuffleAria: "Generar otro nombre de grupo"') &&
    vdG.includes('groupShuffleAria: "Gerar outro nome de grupo"') &&
    vdG.includes('shuffleBtn.setAttribute("aria-label", S.groupShuffleAria)'));
  check("groupname: the field arrives prefilled, set directly (no event, no draft write)",
    vdG.includes("groupInput.value = genGroupName(null);") &&
    vdG.includes("var groupAuto = true;"));
  check("groupname: a generator-owned value is not draft content and the bridge can land over it",
    vdG.includes('group: groupAuto ? "" : groupInput.value.trim()') &&
    vdG.includes("(p.groupForce || !groupInput.value || groupAuto)"));
  check("groupname: shuffle fires a counts-only event — the name never rides it",
    vdG.includes('track("group_name_shuffled", { tool: "secret-santa" })'));
  check("groupname: never labeled AI anywhere in the module",
    !/AI[- ](generated|generator|powered)/i.test(vdG));
  check("groupname: shuffle button geometry — 48px target at the field's right end, text padded clear",
    vdCssG.includes(".vd-groupwrap{position:relative}") &&
    vdCssG.includes(".vd-groupwrap .vd-input{padding-right:58px}") &&
    vdCssG.includes("width:48px;height:48px") &&
    vdCssG.includes(".vd-input.vd-rolling{animation:none}"));
}

// 26. Sample tappable links (SPEC-SS-SAMPLELINKS-01, Nov 23, 2026,
//     Billy's "make the sample show tappable links"): after the
//     sample draw runs, every row shows that person's sample
//     private link as a tappable element in the row itself;
//     tapping it opens the demo reveal sealed for that person
//     only. The Maya-only "Open Maya's sample link" line is
//     removed (one fact, one place); the disclaimer line stays.
//     HARD RULE: the list never displays a pairing — each row's
//     markup names exactly one person, its own. Behavioral
//     proofs (each link opens the correct person's reveal and
//     no one else's, targets >=44px, ES/PT identical behavior)
//     live in the lane's rendered walk; here the wiring and the
//     no-pairing rule are guarded.
{
  const readPg = (f) => fs.readFileSync(new URL("../site/" + f, import.meta.url), "utf8");
  const enNames = ["Maya", "Tom", "Priya", "Sam"];
  const listRows = (src) => {
    const ul = src.match(/<ul class="samplelist">([\s\S]*?)<\/ul>/);
    if (!ul) return [];
    return [...ul[1].matchAll(/<li class="locked">([\s\S]*?)<\/li>/g)].map((m) => m[1]);
  };
  for (const pg of ["index.html", "draw-names-online.html", "secret-santa-generator.html"]) {
    const src = readPg(pg);
    check(`samplelinks ${pg}: all four rows carry a tappable sample link`,
      [0, 1, 2, 3].every((i) => src.includes(`class="slink" data-giver="${i}"`)) &&
      src.includes("SPEC-SS-SAMPLELINKS-01"));
    check(`samplelinks ${pg}: the Maya-only line is gone, the disclaimer stays`,
      !src.includes('id="sampleOpen"') && !src.includes('class="sampleopen"') &&
      src.includes("This is a sample. Nothing here is a real link."));
    check(`samplelinks ${pg}: per-person peek wiring (fillPeek/openPeek, peek ids)`,
      src.includes("function fillPeek(giver)") && src.includes("function openPeek(giver)") &&
      src.includes("window.__SS_SAMPLE__") &&
      src.includes('id="samplePeekLab"') && src.includes('id="sampleFor"') && src.includes('id="sampleHi"'));
    check(`samplelinks ${pg}: link style carries the 44px target`,
      src.includes(".samplelist li .slink{") && src.includes("min-height:44px"));
    const rowsHtml = listRows(src);
    check(`samplelinks ${pg}: list rows never display a pairing`,
      rowsHtml.length === 4 && rowsHtml.every((row, i) =>
        enNames.filter((n) => row.includes(n)).length === 1 && row.includes(enNames[i])));
  }
  const landers = [
    { pg: "amigo-secreto.html", names: ["Valentina", "Diego", "Camila", "Andrés"], label: "Enlace privado de " },
    { pg: "amigo-secreto-online.html", names: ["Mariana", "Diego", "Camila", "André"], label: "Link privado de " },
  ];
  for (const { pg, names, label } of landers) {
    const src = readPg(pg);
    check(`samplelinks ${pg}: all four rows carry a tappable sample link in the page language`,
      [0, 1, 2, 3].every((i) => src.includes(`class="slink" data-giver="${i}"`)) &&
      names.every((n) => src.includes(label + n)) &&
      src.includes("SPEC-SS-SAMPLELINKS-01"));
    check(`samplelinks ${pg}: per-person peek table + wiring (seed-7 MATCH, fillPeek)`,
      src.includes("var MATCH = [1, 3, 0, 2];") && src.includes("function fillPeek(giver)") &&
      src.includes('id="samplePeekLab"') && src.includes('id="sampleMatch"') && src.includes('id="sampleGiftName"'));
    check(`samplelinks ${pg}: link style carries the 44px target`,
      src.includes(".samplelist li .slink{") && src.includes("min-height:44px"));
    const rowsHtml = listRows(src);
    check(`samplelinks ${pg}: list rows never display a pairing`,
      rowsHtml.length === 4 && rowsHtml.every((row, i) =>
        names.filter((n) => row.includes(n)).length === 1 && row.includes(names[i])));
  }
}

// ---------- 27. SPEC-SS-MEASURE-02: measurement gaps closed (Nov 23, 2026) ----------
// The all-buttons engagement audit found: link_copied's kind was
// the channel ("clipboard") for most per-person copies, so they
// could not be counted alone; the start-from-sample press and
// the Draw press were invisible; failed draw validations left
// no trace; the reveal's interests block and gift list had no
// presentation events. These guards pin the instrumentation
// (source level; the hermetic walk proves the live fires).
{
  const readSrc = (f) => fs.readFileSync(new URL("../site/" + f, import.meta.url), "utf8");
  const vd = readSrc("variant-draw.js");
  const app = readSrc("app.js");
  // Item 1 — kind taxonomy, module side.
  check("27a vd link_copied kind comes from the copy target", vd.includes('kind: target || "clipboard"'));
  check("27b vd per-person copies pass person-link", (vd.match(/trackShareVia\("clipboard", "person-link"\)/g) || []).length === 2);
  check("27c vd group message maps to all-links", vd.includes('kind === "message" ? "all-links" : kind'));
  // Item 1 — kind taxonomy, app.js side (single funnel).
  check("27d copyKindFor maps every copy kind", app.includes("function copyKindFor(kind, name)") &&
    app.includes('if (name != null) return "person-link";') &&
    app.includes('return "all-links";') && app.includes('return "manage-link";') &&
    app.includes('return "organizer-link";') && app.includes("return null;"));
  check("27e trackShare routes link_copied through copyKindFor", app.includes("var lcKind = copyKindFor(kind, name);") &&
    app.includes("if (lcKind) {"));
  // Item 2 — sample-start press on the button, both handlers.
  check("27f sample_start_pressed fires in both sample-start handlers",
    (app.match(/fleetTrack\("sample_start_pressed", \{ tool: "secret-santa" \}\)/g) || []).length === 2);
  // Item 3 — draw press + validation failures, module form.
  check("27g vd draw_pressed fires at doDraw entry", vd.includes('track("draw_pressed", { tool: "secret-santa" });'));
  check("27h vd validation reasons are the coarse set", vd.includes('reason: "too-few-names"') &&
    vd.includes('reason: "other"') && vd.includes('reason: "exclusions-conflict"'));
  check("27i vd draw_pressed precedes the first validation", vd.indexOf('track("draw_pressed"') < vd.indexOf('reason: "too-few-names"'));
  // Item 3 — draw press + validation failures, wizard (legacy surface).
  check("27j wizard draw presses route through trackDrawPress", (app.match(/trackDrawPress\(\)/g) || []).length >= 4);
  check("27k wizard validation reasons wired", app.includes('trackDrawInvalid("too-few-names")') &&
    app.includes('trackDrawInvalid("exclusions-conflict")') &&
    (app.match(/trackDrawInvalid\("other"\)/g) || []).length === 2);
  check("27l press/invalid helpers fire the exact event names", app.includes('fleetTrack("draw_pressed", { tool: "secret-santa" })') &&
    app.includes('fleetTrack("draw_validation_failed", { tool: "secret-santa", reason: reason })'));
  // Item 4 — reveal section presentation, once per view.
  check("27m gift list + interests presentation events fire at unwrap", app.includes('fleetTrack("gift_list_viewed"') &&
    app.includes('fleetTrack("interests_section_viewed"') && app.includes("sectionViewsFired"));
  // Item 5 — nudge event spellings at their fire sites (code-side
  // confirmation; production firing was proven live Nov 23).
  check("27n manage_nudge spelled identically at both fire sites",
    (app.match(/fleetTrack\("manage_nudge"/g) || []).length === 2 &&
    app.includes('surface: "still_waiting"'));
  check("27o manage_group_reminder fire site intact", (app.match(/fleetTrack\("manage_group_reminder"/g) || []).length === 1);
  // Payload hygiene: none of the new events carries a name-shaped prop.
  check("27p new events carry counts/enums only", !/draw_pressed[\s\S]{0,120}(name|link|token)/.test(app) &&
    !/draw_pressed[\s\S]{0,120}(name|link|token)/.test(vd));
}

// ---------- 28. SPEC-SS-REVEALBATCH-01: reveal batch + handback landing (Nov 23, 2026) ----------
// Item 1: gift ideas directly under the match; the organize card
// after them. Item 2: a persistent saved line under the interest
// chips. Item 3: an already-unwrapped link skips the ceremony.
// Item 4: the hand-back landing puts the clicker inside an EMPTY
// form (no roster prefill through a recipient link, ever), in
// view and focused, and the draw it leads to carries
// start_source "handback" so click->start is countable.
{
  const readSrc = (f) => fs.readFileSync(new URL("../site/" + f, import.meta.url), "utf8");
  const idx = readSrc("index.html");
  const app = readSrc("app.js");
  const vd = readSrc("variant-draw.js");
  const es = readSrc("i18n-es.js");
  const pt = readSrc("i18n-pt.js");
  // Item 1 — order (the section-17/item-2 guards pin the full
  // chain; here: gifts precede the card, card precedes the doors).
  check("28a gift label sits directly under the match, card after the all-ideas list",
    idx.indexOf('id="giftLabel"') > idx.indexOf('id="gotName"') &&
    idx.indexOf('id="giftLabel"') < idx.indexOf('id="ownDrawAfterGifts"') &&
    idx.indexOf('id="allPicks"') < idx.indexOf('id="ownDrawAfterGifts"'));
  // Item 2 — saved line element + painter + localized strings.
  check("28b saved line element lives under the chips",
    idx.indexOf('id="interestSavedLine"') > idx.indexOf('id="interestChips"') &&
    idx.indexOf('id="interestSavedLine"') < idx.indexOf('id="interestSaveNote"'));
  check("28c paintSaved reflects picks, surprise, and the empty state",
    app.includes("function paintSaved()") && app.includes('savedLine.hidden = true; return;') &&
    app.includes('T("reveal.interests_saved_surprise")') && app.includes('TF("reveal.interests_saved", { list: list })'));
  check("28d saved-line strings exist in ES and PT packs",
    es.includes('"reveal.interests_saved"') && es.includes('"reveal.interests_saved_surprise"') && es.includes('"reveal.interests_saved_and": "y"') &&
    pt.includes('"reveal.interests_saved"') && pt.includes('"reveal.interests_saved_surprise"') && pt.includes('"reveal.interests_saved_and": "e"'));
  check("28e paint() drives the saved line (toggles + failure revert)",
    app.includes("paintSaved();\n      }"));
  // Item 3 — skip ceremony wiring.
  check("28f short reveal checks progress before rendering, fail-open",
    app.includes('PROGRESS_API + "?d=" + encodeURIComponent(trk.d) + "&ks=" + encodeURIComponent(trk.k)') &&
    app.includes("settle(!!(p && p.r))") && app.includes("setTimeout(function () { settle(false); }, 1500);"));
  check("28g initReveal runs doPeek directly when skipCeremony is set",
    app.includes("if (extra && extra.skipCeremony) {") && app.includes('el("revealCover").hidden = true;\n      doPeek();'));
  // Item 4 — no roster through a recipient link + landing + attribution.
  check("28h hand-back landings never apply names (stash or remote)",
    app.includes('var isHandback = effSource === "handback-roster"') && app.includes("if (!isHandback) {"));
  check("28i hand-back landing scrolls into the form and marks the source",
    app.includes('vdApply({ startSource: "handback" })') && app.includes("landInDrawForm();") &&
    app.includes("function landInDrawForm()") && app.includes('window.__SS_VDRAW_SCROLL__'));
  check("28j focus follows the sample-scroll discipline (fine pointer, 700ms settle)",
    app.includes('window.matchMedia("(pointer: fine)").matches') &&
    app.includes('document.querySelector("[data-vdraw] .vd-name")'));
  check("28k module claims the handback source on the first started draw only",
    vd.includes('if (p.startSource === "handback") pendingStartSource = "handback";') &&
    vd.includes('if (pendingStartSource) { drawSource = pendingStartSource; pendingStartSource = null; }') &&
    vd.includes('start_source: drawSource'));
  check("28l handback_clicked firing is unchanged (consumed landings only)",
    (app.match(/fleetTrack\("handback_clicked"/g) || []).length === 1);
}

// ---------- 29. SPEC-SS-GLIMPSE-01: sample interests glimpse (Nov 23, 2026) ----------
// The sample demo reveal gains a STATIC glimpse of the interests
// ask a real link carries (Part 4's shipped wording): heading,
// line, the 12 chip topics as plain spans — never buttons, never
// a save loop — plus one caption in the sample's aside voice,
// filled per sample person. The walk proves no /interests POST
// fires from the demo.
{
  const readSrc = (f) => fs.readFileSync(new URL("../site/" + f, import.meta.url), "utf8");
  const enPages = ["index.html", "draw-names-online.html", "secret-santa-generator.html"];
  const enChips = ["Surprise me", "Cooking", "Tech", "Outdoors", "Games", "Fitness", "Travel", "Cozy things", "Books", "Science", "Music", "Gardening"];
  for (const f of enPages) {
    const src = readSrc(f);
    const block = src.slice(src.indexOf('class="intglimpse"'), src.indexOf('id="sampleIntCaption"') + 200);
    check("29 " + f + ": glimpse present with the real ask's wording",
      src.includes('id="sampleIntCaption"') && src.includes("Want gift ideas that fit you?") &&
      src.includes("The organizer can see that you added something, never what."));
    check("29 " + f + ": all 12 topics as static spans, no button in the glimpse",
      enChips.every((c) => block.includes("<span>" + c + "</span>")) && !block.includes("<button"));
    check("29 " + f + ": caption is filled per giver from NAMES",
      src.includes('"In a real link, " + NAMES[giver] + " also picks what they\'re into'));
    check("29 " + f + ": static chip styling shipped", src.includes(".intchips span{"));
  }
  const es = readSrc("amigo-secreto.html");
  const esChips = ["Sorpréndeme", "Cocina", "Tecnología", "Aire libre", "Juegos", "Ejercicio", "Viajes", "Cosas acogedoras", "Libros", "Ciencia", "Música", "Jardinería"];
  const esBlock = es.slice(es.indexOf('class="intglimpse"'), es.indexOf('id="sampleIntCaption"') + 200);
  check("29 ES: glimpse present with the shipped ES ask wording",
    es.includes('id="sampleIntCaption"') && es.includes("¿Quieres ideas de regalo pensadas para ti?") &&
    es.includes("El organizador puede ver que agregaste algo, nunca qué."));
  check("29 ES: all 12 topics as static spans, no button in the glimpse",
    esChips.every((c) => esBlock.includes("<span>" + c + "</span>")) && !esBlock.includes("<button"));
  check("29 ES: caption is filled per giver", es.includes('"En un enlace real, " + name + " también elige lo que le gusta'));
  const pt = readSrc("amigo-secreto-online.html");
  const ptChips = ["Me surpreenda", "Cozinha", "Tecnologia", "Ar livre", "Jogos", "Exercícios", "Viagens", "Coisas aconchegantes", "Livros", "Ciência", "Música", "Jardinagem"];
  const ptBlock = pt.slice(pt.indexOf('class="intglimpse"'), pt.indexOf('id="sampleIntCaption"') + 200);
  check("29 PT: glimpse present with the shipped PT ask wording",
    pt.includes('id="sampleIntCaption"') && pt.includes("Quer ideias de presente que combinam com você?") &&
    pt.includes("O organizador pode ver que você adicionou algo, nunca o quê."));
  check("29 PT: all 12 topics as static spans, no button in the glimpse",
    ptChips.every((c) => ptBlock.includes("<span>" + c + "</span>")) && !ptBlock.includes("<button"));
  check("29 PT: caption is filled per giver", pt.includes('"Num link real, " + name + " também escolhe do que gosta'));
  const llms = readSrc("llms-full.txt");
  check("29 llms-full mirrors the glimpse (heading, chips line, caption)",
    llms.includes("Want gift ideas that fit you?") &&
    llms.includes("Surprise me · Cooking · Tech · Outdoors") &&
    llms.includes("In a real link, Maya also picks what they're into, so their Santa sees gift ideas for them."));
}


// ---------- 30. SPEC-SS-INVITE-01: message family rewrite (Nov 23, 2026) ----------
// Billy approved the new per-person invite verbatim ("🎅 You're in!
// {group} Secret Santa is on…") and pre-approved same-pass rewrites
// of the group announcement, the per-person nudge/reminder, and the
// group reminder ("ship changes, don't wait for me"). Guards: the
// new text renders in all three languages and both builders; the
// honesty pair (shows only your match / anyone with the link can
// open it) survives in every per-person message; group-facing
// templates stay link-free; the unnamed-group fallbacks render
// cleanly (no dangling possessive, no double space); the old
// templates are gone from all four files.
// Nov 23 (later): Billy swapped the family's fixed opener from
// the tree to Santa (🎄 -> 🎅) across every template above; the
// group-name banks keep their own varied emoji, tree included.
{
  const appI = fs.readFileSync(new URL("../site/app.js", import.meta.url), "utf8");
  const esI = fs.readFileSync(new URL("../site/i18n-es.js", import.meta.url), "utf8");
  const ptI = fs.readFileSync(new URL("../site/i18n-pt.js", import.meta.url), "utf8");
  const vdI = fs.readFileSync(new URL("../site/variant-draw.js", import.meta.url), "utf8");
  const raw = (src, key) => (src.match(new RegExp('"' + key.replace(/\./g, "\\.") + '": "([^"]*)"')) || [])[1] || "";

  check("30 invite: app.js both builders carry the new invite fallback, named and unnamed",
    (appI.match(/Tap it to reveal who you got/g) || []).length === 4 &&
    (appI.match(/🎅 You're in! Secret Santa is on, budget/g) || []).length === 2 &&
    (appI.match(/TF\("messages\.per_person_with_group"/g) || []).length === 2 &&
    (appI.match(/TF\("messages\.per_person_no_group"/g) || []).length === 2);
  check("30 invite: packs open with Santa, carry group/budget/link and the line break, and drop the {name} slot",
    ["messages.per_person_with_group", "messages.per_person_no_group"].every((k) => {
      const a = raw(esI, k), b = raw(ptI, k);
      return a.startsWith("🎅") && b.startsWith("🎅") &&
        a.includes("{budget}") && a.includes("{url}") && a.includes("{url}\\n") && !a.includes("{name}") &&
        b.includes("{budget}") && b.includes("{url}") && b.includes("{url}\\n") && !b.includes("{name}");
    }) && raw(esI, "messages.per_person_with_group").includes("{group}") &&
      raw(ptI, "messages.per_person_with_group").includes("{group}"));
  check("30 invite: honesty pair present in the packs (ES and PT)",
    raw(esI, "messages.per_person_with_group").includes("Solo muestra tu asignación") &&
    raw(esI, "messages.per_person_with_group").includes("quien tenga el enlace puede abrirlo") &&
    raw(ptI, "messages.per_person_with_group").includes("Ele mostra só a sua combinação") &&
    raw(ptI, "messages.per_person_with_group").includes("quem tiver o link pode abrir"));
  check("30 invite: variant personMsg carries the new text in EN, ES and PT",
    vdI.includes("🎅 You're in! \" + g + \" Secret Santa is on, budget") &&
    vdI.includes("Tap it to reveal who you got") &&
    vdI.includes("Tócalo para descubrir a quién te tocó") &&
    vdI.includes("Toque para descobrir quem você tirou"));
  check("30 announcement: link-free, names the group, tells the group to watch for their private link (all builders/languages)",
    appI.includes("Watch your messages: I'll send each of you your own private link") &&
    vdI.includes("Watch your messages: I'll send each of you your own private link") &&
    vdI.includes("Estén atentos a sus mensajes") && vdI.includes("Fiquem de olho nas mensagens") &&
    ["messages.group_message_with_group", "messages.group_message_no_group"].every((k) =>
      !/http|\{url\}/.test(raw(esI, k)) && !/http|\{url\}/.test(raw(ptI, k)) &&
      raw(esI, k).includes("{budget}") && raw(ptI, k).includes("{budget}")) &&
    raw(esI, "messages.group_message_with_group").includes("{group}") &&
    raw(ptI, "messages.group_message_with_group").includes("{group}"));
  check("30 nudge: warmer open, only that person's link, honesty pair (EN fallback + packs)",
    appI.includes("your private link is still waiting for you") &&
    appI.includes('TF("messages.nudge"') &&
    raw(esI, "messages.nudge").includes("{name}") && raw(esI, "messages.nudge").includes("{url}") &&
    raw(esI, "messages.nudge").includes("Solo muestra tu asignación") &&
    raw(esI, "messages.nudge").includes("quien tenga el enlace puede abrirlo") &&
    raw(ptI, "messages.nudge").includes("{name}") && raw(ptI, "messages.nudge").includes("{url}") &&
    raw(ptI, "messages.nudge").includes("Ele mostra só a sua combinação") &&
    raw(ptI, "messages.nudge").includes("quem tiver o link pode abrir"));
  check("30 group reminder: {names} kept, warmer wording, EN fallback updated",
    raw(esI, "messages.group_reminder").startsWith("Hola a todos 🎅") &&
    raw(ptI, "messages.group_reminder").startsWith("Olá a todos 🎅") &&
    appI.includes("still haven't opened their private links") &&
    !appI.includes("still need to open their private links"));
  const OLD = ["You're in a Secret Santa draw on Pick My Secret Santa",
    "Secret Santa draw on Pick My Secret Santa, budget",
    "Estás en el amigo secreto de", "Estás en un sorteo de amigo secreto en Pick My Secret Santa",
    "Você está no amigo secreto de", "Você está em um sorteio de amigo secreto no Pick My Secret Santa",
    "a nudge from your Secret Santa organizer", "Your private link is still unopened",
    "don't forward it",
    "Our Secret Santa draw on Pick My Secret Santa is done",
    "Nuestro sorteo de amigo secreto en Pick My Secret Santa ya está hecho",
    "Nosso sorteio de amigo secreto no Pick My Secret Santa já foi feito"];
  check("30 group-link share message: warm open, the group link only, tap-your-name instruction (fallback + packs)",
    appI.includes("🎅 Secret Santa is on! The names are drawn. Here is the group link: ") &&
    raw(esI, "group_link.share_msg").startsWith("🎅") && raw(esI, "group_link.share_msg").includes("{url}") &&
    raw(ptI, "group_link.share_msg").startsWith("🎅") && raw(ptI, "group_link.share_msg").includes("{url}"));
  check("30 nudge: the EN fallback itself carries the interests clause and the honesty pair",
    (() => { const s = appI.slice(appI.indexOf("function nudgeText"), appI.indexOf("function nudgeText") + 1200);
      return s.includes("add what you're into so your Santa gets gift ideas for you") &&
        s.includes("anyone with the link can open it"); })());
  check("30 old templates are gone from all four files",
    [appI, esI, ptI, vdI].every((s) => OLD.every((o) => !s.includes(o))));
  check("30 the Santa opener replaced the tree in every message template (banks and fixtures keep theirs)",
    (appI.match(/🎄/g) || []).length === 0 &&
    (esI.match(/🎄/g) || []).length === 0 &&
    (ptI.match(/🎄/g) || []).length === 0 &&
    (vdI.match(/🎄/g) || []).length === 3 &&
    vdI.includes("🎄 Tinsel Trouble") && vdI.includes("🎄 Caos Navideño") && vdI.includes("🎄 Bagunça Natalina") &&
    appI.includes("Hi everyone 🎅 A quick Secret Santa reminder") &&
    appI.includes("🎅 A quick reminder from your Secret Santa organizer") &&
    raw(esI, "messages.nudge").includes("🎅") && raw(ptI, "messages.nudge").includes("🎅") &&
    raw(esI, "messages.group_reminder").includes("🎅") && raw(ptI, "messages.group_reminder").includes("🎅"));
}


// ---------- 31. SPEC-SS-GROUPNAME-02: family + office flavors, emoji sprinkle (Nov 23, 2026) ----------
// Billy, dogfooding the generator ("Rogue Plotters 2026"): group
// names should sometimes carry a matching emoji, and the banks
// should speak to family/friends groups AND company teams. The
// flavors interleave in one pool (the form cannot know the group
// type); a curated emoji set per language carries ONE matching
// emoji at the start; the picker takes that set about one roll
// in three. Behavioral proofs (sampled share in band, family and
// office names in sampled output, emoji intact in the field and
// inside a generated invite) live in the lane's rendered walk.
{
  const vd2 = fs.readFileSync(new URL("../site/variant-draw.js", import.meta.url), "utf8");
  const bankRegion = vd2.slice(vd2.indexOf("var GROUP_BANKS"), vd2.indexOf("function pickOf"));
  const emojiArrays = [...bankRegion.matchAll(/emoji: \[([\s\S]*?)\],/g)]
    .map((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((s) => s[1]));

  check("31 banks: family fixed entries ship in all three languages",
    ["Cousin Chaos", "The Sibling Syndicate", "Grandma's Cookie Crew", "The In-Law League",
     "Family Group Chat", "The Cousin Council", "Sibling Shenanigans",
     "Primos Traviesos", "El Consejo de Primos", "Hermanos del Lío", "La Mesa Familiar",
     "El Grupo de la Familia", "El Club de los Suegros", "Abuelos Traviesos",
     "Primos Sapecas", "O Conselho dos Primos", "Irmãos da Bagunça", "A Mesa da Família",
     "Grupo da Família", "O Clube dos Sogros", "Família do Panetone"]
      .every((n) => bankRegion.includes('"' + n + '"')));
  check("31 banks: office fixed entries ship in all three languages",
    ["Break Room Bandits", "Watercooler Wrappers", "The Standup Schemers", "Q4 Carolers",
     "The Paperclip Plotters", "Inbox Elves", "The Coffee Break Club",
     "La Pausa del Café", "Charlas del Dispensador", "La Reunión Exprés",
     "Villancicos de Oficina", "El Equipo del Viernes", "Correos Traviesos",
     "Turma do Cafezinho", "Papo do Bebedouro", "Reunião Relâmpago", "Clube do Grampeador",
     "Coral do Fim de Ano", "Turma do Fechamento", "E-mails Sapecas"]
      .every((n) => bankRegion.includes('"' + n + '"')));
  check("31 banks: combinatorial vocabulary carries the family and office flavors",
    ['"Cousins", "Siblings", "In-Laws", "Coworkers", "Teammates"',
     '"Watercooler", "Paperclip"', '"Coffee", "Inbox", "Q4"',
     '"Primos", "Hermanos", "Abuelos", "Suegros", "Compañeros", "Equipos"',
     '"Primos", "Irmãos", "Avós", "Sogros", "Colegas", "Times"']
      .every((s) => bankRegion.includes(s)));
  check("31 banks: office stays kind — no boss or named-role jokes anywhere in the banks",
    !/boss|jefe|chefe|manager|gerente/i.test(bankRegion));
  check("31 emoji: all three banks carry a curated emoji set of 12+ entries",
    emojiArrays.length === 3 && emojiArrays.every((a) => a.length >= 12),
    emojiArrays.map((a) => a.length));
  check("31 emoji: every entry starts with exactly one emoji, then a space, then the name",
    emojiArrays.every((a) => a.every((s) => {
      const chars = [...s];
      const pict = chars.filter((ch) => /\p{Extended_Pictographic}/u.test(ch)).length;
      let i = 1;
      if (chars[i] === "\uFE0F") i++;
      return pict === 1 && /\p{Extended_Pictographic}/u.test(chars[0]) && chars[i] === " ";
    })));
  check("31 emoji: the sets span the chaos, family and office flavors in every language",
    emojiArrays.every((a) =>
      a.some((s) => /🐧|🦌|🧝|⛄|🎅/.test(s)) &&
      a.some((s) => /📱|🏠/.test(s)) &&
      a.some((s) => /☕|💧|💻|📎|🗓️|📧/.test(s))));
  check("31 emoji: the picker takes the emoji set about one roll in three, inside the no-repeat build",
    vd2.includes("if (B.emoji && Math.random() < 1 / 3) { name = pickOf(B.emoji); }") &&
    vd2.includes('if (name.length <= 52 && Math.random() < 0.18) name += " " + year;'));
  check("31 emoji: representative matched pairs ship (penguin, reindeer, elf, snowman, paperclip)",
    ["🐧 Penguin Chaos", "🦌 Reindeer Games", "🧝 Elf Surveillance", "⛄ Snowman Shenanigans",
     "📎 Paperclip Plotters", "🐧 Pingüinos Traviesos", "🦌 Renos Locos", "🧝 Duendes en Fuga",
     "⛄ Muñecos de Nieve Traviesos", "📎 El Club del Clip", "🐧 Pinguins Doidos",
     "🦌 Renas Doidas", "🧝 Elfos em Fuga", "⛄ Bonecos de Neve Bagunceiros", "📎 Clube do Clipe"]
      .every((n) => bankRegion.includes('"' + n + '"')));
}

// 32. Sample link fix + sample-start press parity (SPEC-SS-SAMPLELINKFIX-01
//     + SPEC-SS-MEASURE-03, Nov 23, 2026). Bug: a sample run landing
//     after a mid-run link tap refilled the open peek with giver 0
//     (Maya) — finish() called fillPeek(0) unconditionally. And
//     sample_start_pressed fired only in app.js's Start-from-the-
//     sample handlers, never on a sample run itself.
{
  const readSite32 = (f) => fs.readFileSync(new URL("../site/" + f, import.meta.url), "utf8");
  const enPages32 = ["index.html", "draw-names-online.html", "secret-santa-generator.html"];
  const enSrc32 = enPages32.map(readSite32);
  check("32a finish() refills the open peek for its own person on all EN sample pages",
    enSrc32.every((s) => s.includes("fillPeek(peek.hidden ? 0 : peekGiver);")));
  check("32b no EN sample page still refills giver 0 unconditionally",
    enSrc32.every((s) => !s.includes("fillPeek(0);")));
  check("32c each EN peek fill is parameterized by the tapped giver (greeting + match)",
    enSrc32.every((s) => s.includes("var receiver = curAssignment[giver];") &&
      s.includes('"Hi " + NAMES[giver]') && s.includes("NAMES[receiver]")));
  const seed7 = CORE.drawGroup(4, [], 7);
  check("32d the known dealt assignment (seed 7) is the shipped [1,3,0,2]",
    JSON.stringify(seed7) === JSON.stringify([1, 3, 0, 2]), seed7);
  const names32 = ["Maya", "Tom", "Priya", "Sam"];
  check("32e under the known assignment every giver's reveal names that giver and only their match",
    names32.every((n, g) => seed7[g] !== g && names32[seed7[g]] !== n) &&
    JSON.stringify(names32.map((n, g) => names32[seed7[g]])) ===
    JSON.stringify(["Tom", "Sam", "Maya", "Priya"]));
  check("32f the lander peek tables carry the same known assignment",
    ["amigo-secreto.html", "amigo-secreto-online.html"].every((f) =>
      readSite32(f).includes("var MATCH = [1, 3, 0, 2];")));
  check("32g sample_start_pressed fires at the sample run's fire site on every EN page",
    enSrc32.every((s) => {
      const demo = s.indexOf('fleetTrack("sample_demo_start", { tool: "secret-santa", demo: true, people_count: 4 });');
      const press = s.indexOf('fleetTrack("sample_start_pressed", { tool: "secret-santa" });');
      return demo > -1 && press > demo && press - demo < 800 &&
        s.lastIndexOf('if (!auto && typeof fleetTrack === "function") {', demo) > -1 &&
        s.lastIndexOf('if (!auto && typeof fleetTrack === "function") {', demo) ===
        s.lastIndexOf('if (!auto && typeof fleetTrack === "function") {', press);
    }));
  check("32h the query pages' own Start-from-the-sample wiring fires it too (homepage rides the app.js bridge)",
    ["draw-names-online.html", "secret-santa-generator.html"].every((f) => {
      const s = readSite32(f);
      return (s.match(/fleetTrack\("sample_start_pressed", \{ tool: "secret-santa" \}\)/g) || []).length === 2 &&
        s.includes('startBtn.addEventListener("click", function () {\n    /* SPEC-SS-MEASURE-03');
    }) &&
    (readSite32("index.html").match(/fleetTrack\("sample_start_pressed", \{ tool: "secret-santa" \}\)/g) || []).length === 1);
}

console.log(`\ncore tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
