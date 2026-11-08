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
     Returns up to 6 ideas from the group's budget band. Interest
     matches come first; ideas already handed out in this draw are
     avoided while the pool allows. Falls back to the whole band.
     Six, not three (Oct 30, 2026, vs-AI gift-depth build): the
     Oct 29 study's gift questions were answered from a 3-pick
     token while 17 of 48 band x interest cells held 6 or more
     matching ideas the drawn person never saw. The depth was in
     the bank; the cap was here and in parseToken. */
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
    return ranked.slice(0, 6);
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
       - gift picks: 1 to 6 ids (pickGifts returns at most 6;
         tokens issued before Oct 30, 2026 carry 1 to 3 and still
         parse — the range only widened),
         each a bank slug of at most 56 chars (the longest id in
         bank.js) in slug shape, with no repeats (pickGifts never
         repeats a pick in one token).
       - the token itself: at most 2048 chars. The longest token
         the app can build is 1,023 chars, measured on a worst
         case payload (three 40-char multibyte names + six
         56-char ids + JSON overhead).
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
      // A v1 token made by the app carries exactly these six keys,
      // plus — since SPEC-SS-TRANSPARENCY-01 (Nov 7, 2026) — one
      // optional seventh: `o`, the organizer's first name, present
      // only when the organizer typed one on Step 1. It is held to
      // the same hygiene as `you`/`got` below.
      var keys = Object.keys(payload).sort().join(",");
      if (keys !== "b,g,got,pi,v,you" && keys !== "b,g,got,o,pi,v,you") return null;
      if (payload.o !== undefined && !cleanShortString(payload.o, NAME_MAX)) return null;
      if (!cleanShortString(payload.you, NAME_MAX)) return null;
      if (!cleanShortString(payload.got, NAME_MAX)) return null;
      if (payload.you === payload.got) return null;
      if (!cleanShortString(payload.g, NAME_MAX)) return null;
      if (BUDGET_LABELS.indexOf(payload.b) === -1) return null;
      if (!Array.isArray(payload.pi) || !payload.pi.length || payload.pi.length > 6) return null;
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

  /* Setup link (gate fix loop, Nov 3, 2026). The ChatGPT
     connector's setup tool configures a group inside the chat —
     names, keep-apart pairs, budget — and returns ONE pre-filled
     link: https://pickmysecretsanta.com/#setup=<token>. The
     token carries SETUP ONLY: the group name, the budget band,
     the roster, and keep-apart pairs as roster indexes. No match
     exists in it, ever — the draw still runs in the organizer's
     browser, exactly like a hand-typed setup. The payload rides
     in the URL fragment, which browsers never send to a server,
     and index.html strips the fragment before analytics load;
     app.js then pre-fills the organizer form from it.
     Encoding is the same base64url-of-UTF-8-JSON as makeToken.
     Validation mirrors the token hygiene above, with the site's
     own limits: names and group name cap at 40 chars (the form
     inputs), the roster is 3 to 30 (the form's own bounds), the
     budget is one of the four band ids in app.js, pairs are
     index pairs inside the roster with no self-pairs and no
     repeats, and duplicate names are rejected outright — the
     organizer flow itself refuses to draw with duplicates, so a
     setup link carrying them could only be hand-made. */
  var SETUP_TOKEN_MAX = 8192;
  var SETUP_PAIRS_MAX = 200;
  var SETUP_BANDS = ["u25", "m2550", "m50100", "m100"];
  function makeSetupToken(payload) {
    var json = JSON.stringify(payload);
    var b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function parseSetupToken(token) {
    try {
      if (typeof token !== "string" || !token.length || token.length > SETUP_TOKEN_MAX) return null;
      if (!/^[A-Za-z0-9\-_]+$/.test(token)) return null;
      var b64 = token.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      var json = decodeURIComponent(escape(atob(b64)));
      if (json.length > SETUP_TOKEN_MAX) return null;
      var payload = JSON.parse(json);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
      if (payload.v !== 1) return null;
      var keys = Object.keys(payload);
      for (var k = 0; k < keys.length; k++) {
        if (["v", "g", "b", "n", "x"].indexOf(keys[k]) === -1) return null;
      }
      if (payload.g !== undefined && !cleanShortString(payload.g, NAME_MAX)) return null;
      if (payload.b !== undefined && SETUP_BANDS.indexOf(payload.b) === -1) return null;
      if (!Array.isArray(payload.n) || payload.n.length < 3 || payload.n.length > 30) return null;
      var seenName = Object.create(null);
      for (var i = 0; i < payload.n.length; i++) {
        if (!cleanShortString(payload.n[i], NAME_MAX)) return null;
        var fold = payload.n[i].toLowerCase();
        if (seenName[fold]) return null;
        seenName[fold] = true;
      }
      if (payload.x !== undefined) {
        if (!Array.isArray(payload.x) || payload.x.length > SETUP_PAIRS_MAX) return null;
        var seenPair = Object.create(null);
        for (var j = 0; j < payload.x.length; j++) {
          var pair = payload.x[j];
          if (!Array.isArray(pair) || pair.length !== 2) return null;
          var a = pair[0], b = pair[1];
          if (!Number.isInteger(a) || !Number.isInteger(b)) return null;
          if (a < 0 || b < 0 || a >= payload.n.length || b >= payload.n.length || a >= b) return null;
          var pk = a + ":" + b;
          if (seenPair[pk]) return null;
          seenPair[pk] = true;
        }
      }
      return payload;
    } catch (e) {
      return null;
    }
  }

  /* ---------- Words matcher (SPEC-SS-ASK-1, Oct 31, 2026) ----------
     "Say what they are into, in your words." The visitor types a
     few plain words for one person; this scores those words
     against the bank's own copy (name, category, blurb, why,
     spec, interests) inside one budget band and returns up to
     six ideas, the same six-picks shape pickGifts returns.
     Pure and deterministic: no randomness, no storage, and no
     network anything: it runs in this page, on the words typed
     on that step, exactly like today's interest filters. It
     never sees a name: the step asks for words only.
     Parity with the filter path, by construction: a word that
     names an interest (or a plain synonym for one) is "heard"
     as that interest, and every idea carrying a heard interest
     outranks every idea that does not (interest score 100+ vs a
     copy score capped at 60), so the word path returns exactly
     min(6, cell size) interest ideas, the same count the
     filter path's +3 sort guarantees, then backfills from the
     band, labeled as backfill by the caller. When no interest
     is heard, the band is ranked by copy overlap alone. When
     nothing matches at all, matched is false and the picks are
     the band's first six in bank order, for the caller to label
     honestly as budget picks anyone can use. */
  var ASK_STOP = {};
  ("a an the and or of for to in on at is are was were be been " +
   "who whom that this it its he she they them their his her him " +
   "my your our i me we you with without into about over under " +
   "love like enjoy hate want need know really very always just " +
   "gift present idea buy get lot bit much many every day time " +
   "thing stuff way person someone friend").split(" ").forEach(function (w) {
    ASK_STOP[w] = true;
  });
  /* Plain words people type -> the bank interest they mean.
     Keys are stemmed forms (see askStems). An interest's own
     name maps to itself (as its stem: "cooking" stems to
     "cook"). One interest per word; where a word could mean
     two, it maps to the one the bank's copy backs up. */
  var ASK_SYNONYMS = {
    cook: "cooking", kitchen: "cooking", food: "cooking",
    foodie: "cooking", bake: "cooking", baker: "cooking",
    chef: "cooking", grill: "cooking", bbq: "cooking",
    barbecue: "cooking", coffee: "cooking", tea: "cooking",
    recipe: "cooking", spicy: "cooking", spice: "cooking",
    snack: "cooking", chocolate: "cooking", wine: "cooking",
    outdoor: "outdoors", outside: "outdoors", hike: "outdoors",
    camp: "outdoors", trail: "outdoors", nature: "outdoors",
    fish: "outdoors", adventure: "outdoors", picnic: "outdoors",
    beach: "outdoors", mountain: "outdoors", snow: "outdoors",
    ski: "outdoors", kayak: "outdoors", climb: "outdoors",
    tech: "tech", gadget: "tech", computer: "tech",
    phone: "tech", code: "tech", geek: "tech", nerd: "tech",
    electronic: "tech", robot: "tech", drone: "tech",
    headphone: "tech",
    game: "games", gamer: "games", gaming: "games",
    board: "games", puzzle: "games", card: "games",
    chess: "games", video: "games", trivia: "games",
    lego: "games",
    fitness: "fitness", gym: "fitness", run: "fitness",
    runner: "fitness", yoga: "fitness", workout: "fitness",
    exercise: "fitness", sport: "fitness", lift: "fitness",
    weight: "fitness", marathon: "fitness", train: "fitness",
    health: "fitness", healthy: "fitness", cycle: "fitness",
    bike: "fitness", swim: "fitness",
    travel: "travel", trip: "travel", vacation: "travel",
    flight: "travel", fly: "travel", road: "travel",
    journey: "travel", wanderlust: "travel", passport: "travel",
    abroad: "travel",
    cozy: "cozy", cosy: "cozy", homebody: "cozy",
    candle: "cozy", blanket: "cozy", bath: "cozy",
    comfort: "cozy", snug: "cozy", warm: "cozy",
    relax: "cozy", fireplace: "cozy", hygge: "cozy",
    sleep: "cozy",
    book: "books", read: "books", novel: "books",
    literature: "books", library: "books", story: "books",
    author: "books", poetry: "books", comic: "books",
    science: "science", space: "science", star: "science",
    astronomy: "science", chemistry: "science",
    physics: "science", stem: "science", crystal: "science",
    experiment: "science", planet: "science",
    dinosaur: "science",
    music: "music", guitar: "music", piano: "music",
    vinyl: "music", record: "music", concert: "music",
    sing: "music", song: "music", instrument: "music",
    drum: "music", listen: "music",
    garden: "gardening", gardener: "gardening",
    plant: "gardening", flower: "gardening", herb: "gardening",
    grow: "gardening", seed: "gardening", soil: "gardening",
    vegetable: "gardening", succulent: "gardening"
  };
  function askStems(text) {
    // One text -> a set of stemmed word forms. The same stemmer
    // runs on the visitor's words and on the bank's copy, so a
    // word matches itself in any plain form: "cooking" and
    // "cook", "candles" and "candle", "stories" and "story".
    var set = Object.create(null);
    String(text == null ? "" : text).toLowerCase()
      .split(/[^a-z0-9']+/).forEach(function (raw) {
        var t = raw.replace(/^'+|'+$/g, "");
        if (t.slice(-2) === "'s") t = t.slice(0, -2);
        t = t.replace(/'/g, "");
        if (!t) return;
        var base = t;
        if (base.length > 4 && base.slice(-3) === "ies") base = base.slice(0, -3) + "y";
        var variants = [base];
        if (base.length > 3 && base.slice(-1) === "s" && base.slice(-2) !== "ss") {
          variants.push(base.slice(0, -1));
        }
        if (base.length > 5 && base.slice(-3) === "ing") {
          variants.push(base.slice(0, -3));
          variants.push(base.slice(0, -3) + "e");
        }
        if (base.length > 4 && base.slice(-2) === "ed") {
          variants.push(base.slice(0, -2));
          variants.push(base.slice(0, -1));
        }
        variants.forEach(function (v) { if (v.length >= 2) set[v] = true; });
      });
    return set;
  }
  function askQuery(text) {
    // The visitor's words -> {stems, heard}: stems with the
    // filler words dropped, and the interests those words name,
    // in the order the visitor said them.
    var stems = askStems(text);
    var heard = [];
    Object.keys(stems).forEach(function (s) {
      if (ASK_STOP[s]) { delete stems[s]; return; }
      var interest = ASK_SYNONYMS[s];
      if (interest && heard.indexOf(interest) === -1) heard.push(interest);
    });
    return { stems: stems, heard: heard };
  }
  function askCopyScore(idea, stems) {
    var fields = [
      [idea.name, 5], [idea.category, 4], [idea.blurb, 3],
      [idea.why, 3], [idea.spec, 2]
    ];
    var total = 0;
    var cache = fields.map(function (f) { return [askStems(f[0]), f[1]]; });
    Object.keys(stems).forEach(function (s) {
      cache.forEach(function (pair) { if (pair[0][s]) total += pair[1]; });
    });
    return Math.min(total, 60);
  }
  function matchByWords(bank, band, words) {
    var q = askQuery(words);
    if (!Object.keys(q.stems).length) {
      return { picks: [], heard: [], matched: false, backfilled: 0, empty: true };
    }
    var pool = bank.filter(function (idea) { return idea.budget === band; });
    if (!pool.length) pool = bank.slice();
    var scored = pool.map(function (idea, idx) {
      var copy = askCopyScore(idea, q.stems);
      var hit = q.heard.some(function (h) {
        return idea.interests.indexOf(h) !== -1;
      });
      return { idea: idea, idx: idx, hit: hit, score: hit ? 100 + copy : copy };
    });
    if (!scored.some(function (x) { return x.score > 0; })) {
      return {
        picks: pool.slice(0, 6), heard: q.heard,
        matched: false, backfilled: Math.min(6, pool.length), empty: false
      };
    }
    scored.sort(function (a, b) {
      return (b.score - a.score) || (a.idx - b.idx);
    });
    var picks = scored.filter(function (x) { return x.score > 0; })
      .slice(0, 6).map(function (x) { return x.idea; });
    var backfilled = 0;
    if (picks.length < 6) {
      var used = Object.create(null);
      picks.forEach(function (p) { used[p.id] = true; });
      for (var i = 0; i < pool.length && picks.length < 6; i++) {
        if (!used[pool[i].id]) { picks.push(pool[i]); backfilled++; }
      }
    }
    return {
      picks: picks, heard: q.heard,
      matched: true, backfilled: backfilled, empty: false
    };
  }

  var api = {
    rng: rng,
    randomSeed: randomSeed,
    stripInvisible: stripInvisible,
    shuffled: shuffled,
    findAssignment: findAssignment,
    drawGroup: drawGroup,
    pickGifts: pickGifts,
    matchByWords: matchByWords,
    makeToken: makeToken,
    parseToken: parseToken,
    makeSetupToken: makeSetupToken,
    parseSetupToken: parseSetupToken
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.SS_CORE = api;
})(typeof window !== "undefined" ? window : globalThis);
