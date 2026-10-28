/* Pick My Secret Santa — core logic. Pure functions, no DOM.
   Used by app.js in the browser and by qa/core-tests.mjs in node.
   The draw runs only in the organizer's browser. Nothing here
   sends or saves anything. */

(function (global) {
  "use strict";

  // Small seeded RNG so a draw is reproducible inside one session.
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffled(list, rand) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  /* findAssignment(people, apart, rand)
     people: array of indexes [0..n-1]
     apart: array of [i, j] pairs that must not draw each other
            (either direction). A person never draws themself.
     Returns an array match where match[giver] = receiver, or null
     when no valid draw exists.
     Method: randomized bipartite matching (Kuhn's algorithm).
     A valid draw is exactly a perfect matching between givers and
     allowed receivers, so this always finishes in polynomial time
     and returns null only when no draw truly exists. The old
     backtracking search could run effectively forever on some
     impossible keep-apart sets (measured: a 12-person group with
     one person kept apart from everyone else froze the page for
     15+ seconds; 30 people, 100+ seconds) — a dead end on the
     core flow, fixed Oct 28, 2026 (adversarial pass, P0). */
  function findAssignment(people, apart, rand) {
    var n = people.length;
    if (n < 3) return null;
    var banned = {};
    apart.forEach(function (pair) {
      banned[pair[0] + ":" + pair[1]] = true;
      banned[pair[1] + ":" + pair[0]] = true;
    });
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

  /* drawGroup(count, apartPairs, seed)
     findAssignment is a complete matching search: one call either
     finds a valid draw or proves none exists, so no retries are
     needed (the old 60-retry loop only multiplied the freeze). */
  function drawGroup(count, apartPairs, seed) {
    var rand = rng(seed || ((Math.random() * 1e9) | 0));
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

  function parseToken(token) {
    try {
      var b64 = String(token).replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      var payload = JSON.parse(decodeURIComponent(escape(atob(b64))));
      if (!payload || payload.v !== 1) return null;
      if (typeof payload.you !== "string" || typeof payload.got !== "string") return null;
      if (!Array.isArray(payload.pi) || !payload.pi.length) return null;
      if (!payload.pi.every(function (x) { return typeof x === "string"; })) return null;
      return payload;
    } catch (e) {
      return null;
    }
  }

  var api = {
    rng: rng,
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
