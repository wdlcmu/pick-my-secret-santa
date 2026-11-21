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
  check("index loads the PT pack at rk47", idxSrc.includes("i18n-pt.js?v=rk47"));
  check("index loads the ES pack at rk46", idxSrc.includes("i18n-es.js?v=rk46"));
  check("index loads app.js at rk35", idxSrc.includes("app.js?v=rk35"));
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
  check("reveal carries the handback card directly under the match, above the gift ideas (moved Nov 21, 2026)",
    idxSrcH.includes('id="ownDrawAfter"') &&
    idxSrcH.indexOf('id="ownDrawAfterGifts"') > idxSrcH.indexOf('id="gotName"') &&
    idxSrcH.indexOf('id="ownDrawAfterGifts"') < idxSrcH.indexOf('id="giftLabel"') &&
    idxSrcH.indexOf('id="ownDrawAfterGifts"') < idxSrcH.indexOf('id="ownDrawBlock"'));
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
    check(`claims ${name} hero sub`, sub && stripTags(sub[1]) === exp.hero_sub, sub && stripTags(sub[1]));
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
  check("homepage sample bridge at the completed state",
    idxHtmlSrc.includes('id="sampleBridge"') && idxHtmlSrc.includes('<span class="sb-main">Start your own draw</span>') && idxHtmlSrc.includes('<span class="sb-sub">Free · about 2 minutes</span>'));
  const dnoSrc = readSite("draw-names-online.html");
  check("draw-names sample bridge replaces the plain end link",
    dnoSrc.includes('id="sampleBridge"') && dnoSrc.includes('<span class="sb-sub">Free</span>') && !dnoSrc.includes('<p style="margin-top:10px"><a href="#tool">Start your own draw</a></p>'));
  // The draw-names bridge subline carries Free only: that page's H1 is
  // the time claim, and simfix 2 holds it to exactly one mention.
  const esPageSrc = readSite("amigo-secreto.html");
  check("ES lander sample bridge",
    esPageSrc.includes('id="sampleBridge"') && esPageSrc.includes("Haz tu propio sorteo") && esPageSrc.includes("Gratis · unos 2 minutos"));
  const ptPageSrc = readSite("amigo-secreto-online.html");
  check("PT lander sample bridge",
    ptPageSrc.includes('id="sampleBridge"') && ptPageSrc.includes("Faça seu próprio sorteio") && ptPageSrc.includes("Grátis · uns 2 minutos"));
  check("bridges focus the form's first field",
    ["index.html", "draw-names-online.html", "amigo-secreto.html", "amigo-secreto-online.html"]
      .every((f) => readSite(f).includes('closest("a.samplebridge")')));
  const esPackRaw = readSite("i18n-es.js");
  const ptPackRaw = readSite("i18n-pt.js");
  check("ES pack strips drop the free check, the button and bridge carry it",
    esPackRaw.includes("✓ Sin registro · ✓ Sin correos") && !esPackRaw.includes("✓ Gratis ·") &&
    esPackRaw.includes("Comienza tu sorteo gratis") && esPackRaw.includes('"#sampleBridge .sb-main"') && esPackRaw.includes("Gratis · unos 2 minutos"));
  check("PT pack strips drop the free check, the button and bridge carry it",
    ptPackRaw.includes("✓ Sem cadastro · ✓ Sem e-mails") && !ptPackRaw.includes("✓ Grátis ·") &&
    ptPackRaw.includes("Comece seu sorteio grátis") && ptPackRaw.includes('"#sampleBridge .sb-main"') && ptPackRaw.includes("Grátis · uns 2 minutos"));

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
  check("item 2: the handback card sits directly under the match, above the gift ideas",
    idxHtmlSrc.indexOf('id="ownDrawAfterGifts"') > idxHtmlSrc.indexOf('id="gotName"') &&
    idxHtmlSrc.indexOf('id="ownDrawAfterGifts"') < idxHtmlSrc.indexOf('id="giftLabel"') &&
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
  check("hero trim (Nov 21, 2026): the organizer sentence lives only in the strip",
    !idxHtmlSrc.includes("You can be in the draw too") &&
    idxHtmlSrc.includes("Type the names, and each person gets a private link showing only their own match. About 2 minutes.") &&
    idxHtmlSrc.includes("✓ Organizer can join without seeing the matches") &&
    readSite("secret-santa-generator.html").includes("Type the names, and each person gets a private link showing only their own match. About 2 minutes.") &&
    readSite("draw-names-online.html").includes("Type the names, and each person gets a private link showing only their own match.</p>") &&
    esPackRaw.includes('"home.subline": "Escribe los nombres y cada persona recibe un enlace privado que muestra solo su asignación. Toma unos 2 minutos."') &&
    ptPackRaw.includes('"home.subline": "Digite os nomes e cada pessoa recebe um link privado que mostra só a sua combinação. Leva uns 2 minutos."'));
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
// renderer exists, both kits wire it, the manage reprint sits
// behind its own declaration gate, the packs carry every key,
// no slips string uses an em dash, the print rules are in the
// stylesheet, every draw page loads the module, and the
// Privacy page states the print truth in all three languages.
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
  check("variant kit wires the slips card at the results surface",
    vdSrc.includes("SS_SLIPS.open") && vdSrc.includes('surface: "results"'));
  check("variant string tables carry slips strings in all three languages",
    (vdSrc.match(/slipsBtn:/g) || []).length === 3 &&
    (vdSrc.match(/slipsWarn:/g) || []).length === 3 &&
    (vdSrc.match(/slipsKeep:/g) || []).length === 3);
  check("app kit wires the results slips card",
    appSrcS.includes("slipsCardEl(rec)") && appSrcS.includes("slipsPeopleFromRec"));
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
    appSrc2.includes("You can also tap what you're into on your link, so your Secret Santa gets better gift ideas."));
  check("interests: app.js reads the organizer boolean endpoint",
    appSrc2.includes("/interests-status") && appSrc2.includes("manage_view.interests_added_chip"));
  check("interests: re-deal maps the payload's band label to the band code",
    appSrc2.includes("BANDS[bi].label === payload.b"));
  const idxSrc3 = fs.readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
  check("interests: index carries the entry block and the match line",
    idxSrc3.includes('id="interestBlock"') && idxSrc3.includes('id="interestChips"') &&
    idxSrc3.includes('id="matchInterestsLine"'));
  check("interests: index loads core.js at v2116", idxSrc3.includes("core.js?v=2116"));
  const helperSrc2 = fs.readFileSync(new URL("../site/helper.js", import.meta.url), "utf8");
  check("interests: helper PACK_PIN matches the bumped packs",
    helperSrc2.includes('PACK_PIN = { es: "rk46", pt: "rk47" }'));
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
    esSrc.includes("También puedes tocar lo que te gusta en tu enlace"));
  check("interests: PT nudge invites interests",
    ptSrc.includes("Você também pode tocar no que você curte no seu link"));
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
  check("simfix 1: named-group per-person text carries the brand in app.js (both builders)",
    (appSrcF.match(/Secret Santa draw on Pick My Secret Santa, budget/g) || []).length >= 2);
  check("simfix 1: variant personMsg brands the named-group branch in EN, ES and PT",
    vdSrc.includes("'s Secret Santa draw on Pick My Secret Santa, budget") &&
    vdSrc.includes("amigo secreto de \" + g + \" en Pick My Secret Santa") &&
    vdSrc.includes("amigo secreto de \" + g + \" no Pick My Secret Santa"));
  check("simfix 1: packs brand the named-group message and the group-link message",
    esSrc.includes("amigo secreto de {group} en Pick My Secret Santa") &&
    ptSrc.includes("amigo secreto de {group} no Pick My Secret Santa") &&
    esSrc.includes("amigo secreto en Pick My Secret Santa ya está hecho") &&
    ptSrc.includes("amigo secreto no Pick My Secret Santa já foi feito") &&
    appSrcF.includes("Our Secret Santa draw on Pick My Secret Santa is done"));
  check("simfix 2: generator screen one says the time claim exactly once",
    (genSrc.match(/About 2 minutes\./g) || []).length === 1);
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
  check("simfix 7: nudge feedback names the nudge in app.js and both packs",
    (appSrcF.match(/share\.confirm_nudge_copied/g) || []).length === 2 &&
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

console.log(`\ncore tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
