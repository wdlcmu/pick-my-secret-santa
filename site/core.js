/* Pick My Secret Santa — core logic. Pure functions, no DOM.
   Used by app.js in the browser and by qa/core-tests.mjs in node.
   The draw runs only in the organizer's browser. Nothing here
   sends or saves anything. */

(function (global) {
  "use strict";

  /* Seeded RNG (ADV-8 hardening, Oct 29, 2026).
     The draw seed used to be (Math.random() * 1e9) | 0 — about
     30 bits — and this rng held a single 32-bit state word, so a
     wider seed could not have helped: the whole stream lived in
     2^32 states. This rng keeps a 128-bit state (xoshiro128**)
     seeded through TWO independent 32-bit hashes of the full
     seed material, so the effective seed space is 2^64 even
     though the state expansion starts from 64 hash bits.
     Seed material can be a number, a string, a BigInt, or an
     array / typed array of words (randomSeed below returns a
     Uint32Array of 4 crypto-random words = 128 bits of entropy,
     of which the dual hash carries 64 into the state). Every
     part of the material feeds both hashes, so two seeds that
     differ only in a high word still land in unrelated states.
     Same seed -> same stream, as before (tests rely on it). */
  function fnvStep(h, prime, b) {
    return Math.imul(h ^ b, prime);
  }
  function seedHashes(seed) {
    var h1 = 0x811c9dc5, h2 = 0x9747b28c;
    var P1 = 0x01000193, P2 = 0x85ebca6b;
    function feedByte(b) {
      h1 = fnvStep(h1, P1, b & 0xff);
      h2 = fnvStep(h2, P2, ((b & 0xff) << 1) ^ 0x5a);
    }
    function feedWord(w) {
      feedByte(w); feedByte(w >>> 8); feedByte(w >>> 16); feedByte(w >>> 24);
    }
    function feedString(s) {
      feedWord(s.length);
      for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        feedByte(c); feedByte(c >>> 8);
      }
    }
    if (seed == null) { feedByte(0); }
    else if (typeof seed === "number") { feedByte(1); feedString(String(seed)); }
    else if (typeof seed === "bigint") { feedByte(2); feedString(seed.toString()); }
    else if (typeof seed === "string") { feedByte(3); feedString(seed); }
    else if (typeof seed.length === "number") {
      feedByte(4); feedWord(seed.length);
      for (var j = 0; j < seed.length; j++) feedWord(Number(seed[j]) >>> 0);
    } else { feedByte(5); feedString(String(seed)); }
    return [h1 >>> 0, h2 >>> 0];
  }
  function splitmix32(a) {
    return function () {
      a |= 0; a = (a + 0x9e3779b9) | 0;
      var z = a;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
      return (z ^ (z >>> 16)) >>> 0;
    };
  }
  function rotl32(x, k) { return ((x << k) | (x >>> (32 - k))) >>> 0; }
  function rng(seed) {
    var hs = seedHashes(seed);
    var sm1 = splitmix32(hs[0] | 0), sm2 = splitmix32(hs[1] | 0);
    var s = [sm1(), sm2(), sm1(), sm2()];
    if ((s[0] | s[1] | s[2] | s[3]) === 0) s[0] = 0x9e3779b9;
    return function () {
      var result = Math.imul(rotl32(Math.imul(s[1] >>> 0, 5), 7), 9);
      var t = (s[1] << 9) >>> 0;
      s[2] = (s[2] ^ s[0]) >>> 0;
      s[3] = (s[3] ^ s[1]) >>> 0;
      s[1] = (s[1] ^ s[2]) >>> 0;
      s[0] = (s[0] ^ s[3]) >>> 0;
      s[2] = (s[2] ^ t) >>> 0;
      s[3] = rotl32(s[3] >>> 0, 11);
      return (result >>> 0) / 4294967296;
    };
  }

  /* A fresh crypto-grade seed: 4 words (128 bits) from
     crypto.getRandomValues. Used for the draw and, separately
     and independently, for the gift picks (ADV-8: the gift
     stream must not be derived from the draw seed, so gift ids
     in a token carry no information about the draw). The
     Math.random fallback only runs where WebCrypto is missing;
     every current browser has it. */
  function randomSeed() {
    var words = new Uint32Array(4);
    var c = (typeof global !== "undefined" && global.crypto) ||
            (typeof globalThis !== "undefined" ? globalThis.crypto : null);
    if (c && c.getRandomValues) {
      c.getRandomValues(words);
      return words;
    }
    for (var i = 0; i < 4; i++) {
      words[i] = (Math.floor(Math.random() * 4294967296) ^
        (Date.now() >>> 0) ^ ((i + 1) * 0x9e3779b9)) >>> 0;
    }
    return words;
  }

  /* Invisible-character stripping (ADV-9, Oct 29, 2026).
     Zero-width chars (U+200B, U+200C, U+FEFF) and bidi controls
     (U+202A-U+202E, U+2066-U+2069) let a name look identical to
     another name while comparing different, which defeated the
     duplicate-name warning, and a bidi override inside a token
     could spoof the displayed name. U+200D (zero-width joiner)
     is the one exception: it is how family emoji are built
     (person ZWJ person ZWJ child), and tokens already issued
     with such names must keep opening, so a joiner between two
     pictographic code points is kept; any other joiner (after a
     letter, at the edge) is stripped like the rest. */
  function isPictographic(cp) {
    // U+FE0F (the emoji variation selector) counts too: it is
    // part of the emoji on its left, as in the heart-on-fire
    // sequence U+2764 U+FE0F U+200D U+1F525.
    return cp >= 0x1f000 || (cp >= 0x2300 && cp <= 0x27bf) ||
      cp === 0x2764 || cp === 0x2b50 || cp === 0xfe0f;
  }
  function stripInvisible(s) {
    if (typeof s !== "string") return s;
    var noBad = s.replace(/[\u200b\u200c\ufeff\u202a-\u202e\u2066-\u2069]/g, "");
    if (noBad.indexOf("\u200d") === -1) return noBad;
    var cps = Array.from(noBad);
    var out = [];
    for (var i = 0; i < cps.length; i++) {
      if (cps[i] === "\u200d") {
        var prev = out.length ? out[out.length - 1].codePointAt(0) : 0;
        var next = i + 1 < cps.length ? cps[i + 1].codePointAt(0) : 0;
        if (!(isPictographic(prev) && isPictographic(next))) continue;
      }
      out.push(cps[i]);
    }
    return out.join("");
  }

  function shuffled(list, rand) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  /* findAssignmentMatching(people, banned, rand)
     Randomized bipartite matching (Kuhn's algorithm). A valid
     draw is exactly a perfect matching between givers and allowed
     receivers, so this always finishes in polynomial time and
     returns null only when no draw truly exists. Kept as the
     fallback for the uniform sampler below: it is complete, but
     the matching it finds is not a uniform random draw (whole-draw
     patterns leaned one way — adversarial pass ADV-3). */
  function findAssignmentMatching(people, banned, rand) {
    var n = people.length;
    function allowed(g, r) {
      return g !== r && !banned[g + ":" + r];
    }
    // Each giver's allowed receivers, in random order so the
    // matching found is a random one.
    var adj = people.map(function (g) {
      return shuffled(people.filter(function (r) {
        return allowed(g, r);
      }), rand);
    });
    var matchR = new Array(n).fill(-1); // receiver -> giver
    function tryKuhn(g, seen) {
      for (var i = 0; i < adj[g].length; i++) {
        var r = adj[g][i];
        if (seen[r]) continue;
        seen[r] = true;
        if (matchR[r] === -1 || tryKuhn(matchR[r], seen)) {
          matchR[r] = g;
          return true;
        }
      }
      return false;
    }
    var givers = shuffled(people, rand);
    for (var k = 0; k < givers.length; k++) {
      var seen = new Array(n).fill(false);
      if (!tryKuhn(givers[k], seen)) return null;
    }
    var match = new Array(n).fill(-1);
    matchR.forEach(function (g, r) { if (g !== -1) match[g] = r; });
    return match;
  }

  /* findAssignment(people, apart, rand)
     people: array of indexes [0..n-1]
     apart: array of [i, j] pairs that must not draw each other
            (either direction). A person never draws themself.
     Returns an array match where match[giver] = receiver, or null
     when no valid draw exists.
     Method: uniform rejection sampling first, matching fallback.
     Shuffle the receivers with Fisher-Yates (shuffled above) and
     accept the draw only if it is a valid derangement that honors
     every keep-apart pair. Every valid draw is a permutation, so
     each one is exactly as likely to be shuffled as any other —
     accepted draws are uniform over all valid draws. (The P0
     matching sampler alone under-sampled two-mutual-swap draws
     by about 17% at n=4 — ADV-3, fixed Oct 28, 2026.)
     Retry a bounded number of times, then fall back to the
     matching search above, so the P0 termination guarantee
     holds: tightly constrained draws the sampler is unlikely to
     hit are still found, and impossible sets still return null
     fast (the old backtracking search could run effectively
     forever on some impossible sets — 12 people kept apart from
     one person froze the page for 15+ seconds; 30, 100+). */
  function findAssignment(people, apart, rand) {
    var n = people.length;
    if (n < 3) return null;
    var banned = {};
    apart.forEach(function (pair) {
      banned[pair[0] + ":" + pair[1]] = true;
      banned[pair[1] + ":" + pair[0]] = true;
    });
    var MAX_ATTEMPTS = 1000;
    for (var attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      var perm = shuffled(people, rand);
      var ok = true;
      for (var k = 0; k < n && ok; k++) {
        var giver = people[k];
        var receiver = perm[k];
        if (receiver === giver || banned[giver + ":" + receiver]) ok = false;
      }
      if (ok) {
        var match = new Array(n).fill(-1);
        for (var m = 0; m < n; m++) match[people[m]] = perm[m];
        return match;
      }
    }
    return findAssignmentMatching(people, banned, rand);
  }

  /* drawGroup(count, apartPairs, seed)
     findAssignment either finds a valid draw (uniform sampler,
     with the complete matching search as its fallback) or proves
     none exists, so no outer retries are needed (the old 60-retry
     loop only multiplied the pre-P0 freeze). */
  function drawGroup(count, apartPairs, seed) {
    var rand = rng(seed == null ? randomSeed() : seed);
    var people = [];
    for (var i = 0; i < count; i++) people.push(i);
    return findAssignment(people, apartPairs, rand);
  }

  /* pickGifts(bank, band, interest, rand, usedIds)
     Returns up to 3 ideas from the group's budget band. Interest
     matches come first; ideas already handed out in this draw are
     avoided while the pool allows. Falls back to the whole band. */
  function pickGifts(bank, band, interest, rand, usedIds) {
    var pool = bank.filter(function (idea) { return idea.budget === band; });
    if (!pool.length) pool = bank.slice();
    // "surprise" is stored as its own value, so the record of what
    // the person picked stays honest. It picks like a blank hint:
    // any interest can win.
    var want = interest === "surprise" ? "" : interest;
    function score(idea) {
      var s = 0;
      if (want && idea.interests.indexOf(want) !== -1) s += 3;
      if (usedIds && usedIds[idea.id]) s -= 2;
      return s;
    }
    var ranked = shuffled(pool, rand).sort(function (a, b) {
      return score(b) - score(a);
    });
    return ranked.slice(0, 3);
  }

  // Token: one person's match, carried in their private link.
  // Encoding is base64url of UTF-8 JSON. It hides the match from
  // a casual glance; it is not a password lock. Site copy says so.
  function makeToken(payload) {
    var json = JSON.stringify(payload);
    var b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  /* Token hygiene (ADV-7, Oct 28, 2026). parseToken used to accept
     any string fields of any length, so a 200k-char name rendered
     as-is and bit-flipped tokens that still decoded as JSON showed
     nonsense names instead of the friendly error view. The caps
     below come from the site's own limits, so no link the app ever
     made can hit them:
       - names and the group name: 40 chars — the name input, the
         group-name input, and the bulk importer all cap at 40
         (app.js personRow / index.html #groupName / parseBulk).
       - budget: exactly one of the four band labels in app.js
         (longest real label, "Under $25", is 9 chars).
       - gift picks: 1 to 3 ids (pickGifts returns at most 3),
         each a bank slug of at most 56 chars (the longest id in
         bank.js) in slug shape, with no repeats (pickGifts never
         repeats a pick in one token).
       - the token itself: at most 2048 chars. The longest token
         the app can build is under 800 chars (three 40-char
         multibyte names + three 56-char ids + JSON overhead).
     A valid draw also never names the same string as giver and
     receiver (drawGroup returns a derangement by person, and the
     organizer flow steers duplicate names apart with a last
     initial), so you === got in a token is a forgery or a flip,
     never a real self-draw the token can prove. Anything that
     fails a check returns null, and app.js shows its existing
     "This link does not work." view for null. A flip that still
     lands on a short, clean, plausible name cannot be detected
     here — the token carries no roster or checksum by design —
     but every flip that breaks the shape above now errors. */
  var TOKEN_MAX = 2048;
  var NAME_MAX = 40;
  var PICK_ID_MAX = 56;
  var BUDGET_LABELS = ["Under $25", "$25-$50", "$50-$100", "$100+"];
  function cleanShortString(s, max) {
    if (typeof s !== "string") return false;
    if (!s.length || s.length > max) return false;
    if (s.trim() !== s) return false; // real values are stored trimmed
    // Control chars and the replacement char only arrive via a
    // corrupted or hand-made token; real names never carry them.
    if (/[\u0000-\u001f\u007f-\u009f\ufffd]/.test(s)) return false;
    // ADV-9: zero-width and bidi controls only arrive the same
    // way — the organizer flow strips them before a token is
    // made (stripInvisible), so a token still carrying one is
    // hand-made or corrupted. stripInvisible keeps only an
    // emoji-joining U+200D, so any string it would change is
    // rejected here; family-emoji names pass untouched.
    if (stripInvisible(s) !== s) return false;
    return true;
  }

  function parseToken(token) {
    try {
      if (typeof token !== "string" || !token.length || token.length > TOKEN_MAX) return null;
      if (!/^[A-Za-z0-9\-_]+$/.test(token)) return null;
      var b64 = token.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      var json = decodeURIComponent(escape(atob(b64)));
      if (json.length > TOKEN_MAX) return null;
      var payload = JSON.parse(json);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
      if (payload.v !== 1) return null;
      // A v1 token made by the app carries exactly these six keys.
      var keys = Object.keys(payload).sort().join(",");
      if (keys !== "b,g,got,pi,v,you") return null;
      if (!cleanShortString(payload.you, NAME_MAX)) return null;
      if (!cleanShortString(payload.got, NAME_MAX)) return null;
      if (payload.you === payload.got) return null;
      if (!cleanShortString(payload.g, NAME_MAX)) return null;
      if (BUDGET_LABELS.indexOf(payload.b) === -1) return null;
      if (!Array.isArray(payload.pi) || !payload.pi.length || payload.pi.length > 3) return null;
      var seenPick = {};
      for (var i = 0; i < payload.pi.length; i++) {
        var id = payload.pi[i];
        if (typeof id !== "string" || !id.length || id.length > PICK_ID_MAX) return null;
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) return null;
        if (seenPick[id]) return null;
        seenPick[id] = true;
      }
      return payload;
    } catch (e) {
      return null;
    }
  }

  var api = {
    rng: rng,
    randomSeed: randomSeed,
    stripInvisible: stripInvisible,
    shuffled: shuffled,
    findAssignment: findAssignment,
    drawGroup: drawGroup,
    pickGifts: pickGifts,
    makeToken: makeToken,
    parseToken: parseToken
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.SS_CORE = api;
})(typeof window !== "undefined" ? window : globalThis);
