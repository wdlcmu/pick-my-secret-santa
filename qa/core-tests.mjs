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
check("bank has 111 ideas", BANK.length === 111, BANK.length);
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
const interests = ["", "cooking", "tech", "outdoors", "games", "fitness",
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

console.log(`\ncore tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
