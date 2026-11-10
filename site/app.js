/* Pick My Secret Santa — page flow. All state lives in this page.
   Names, the draw, and the links never leave the browser. */
(function () {
  "use strict";
  var CORE = window.SS_CORE;
  var BANK = window.SS_BANK.ideas;

  var INTERESTS = [
    ["", "What they like (optional)"],
    ["surprise", "Surprise me"],
    ["cooking", "Cooking"],
    ["tech", "Tech"],
    ["outdoors", "Outdoors"],
    ["games", "Games"],
    ["fitness", "Fitness"],
    ["travel", "Travel"],
    ["cozy", "Cozy things"],
    ["books", "Books"],
    ["science", "Science"],
    ["music", "Music"],
    ["gardening", "Gardening"]
  ];
  var BANDS = [
    { id: "u25", label: "Under $25" },
    { id: "m2550", label: "$25-$50" },
    { id: "m50100", label: "$50-$100" },
    { id: "m100", label: "$100+" }
  ];
  var MAX_PEOPLE = 30;

  /* ---------- Spanish language pack (SPEC-SS-AMIGO-01) ----------
     One draw engine, two languages. English is the literal
     fallback at every call site: T()/TF()/TP() return the
     Spanish string only when this page has resolved to Spanish
     AND the pack (i18n-es.js, loaded before this file) holds
     the key, so a missing key degrades to the English words,
     never to a blank. Language resolution, highest first:
       1. the draw's own language (short-link payload "l",
          group record "lang", saved on-device record "lang")
       2. the long link's &l=es fragment flag
       3. the entry param ?lang=es (the Spanish landing pages)
       4. this device's remembered choice (ss_lang_v1)
     Stored values (budget labels, interest ids, tokens) stay
     English in every language: only display text localizes,
     keyed by band id / interest id, exactly as the pack spec
     requires — a Spanish draw's links validate against the
     same worker and the same core as an English draw's. */
  var LANG = "en";
  function packStr(key) {
    if (LANG !== "es" || !window.SS_ES) return null;
    var v = window.SS_ES[key];
    return typeof v === "string" ? v : null;
  }
  function TF(key, vars) {
    var s = packStr(key);
    if (s == null) return null;
    if (vars) {
      s = s.replace(/\{([a-z]+)\}/g, function (m, k) {
        return vars[k] != null ? String(vars[k]) : m;
      });
    }
    return s;
  }
  function T(key) { return TF(key, null); }
  // Plural pairs ride the pack convention "one | many".
  function TP(key, n, vars) {
    var s = TF(key, vars);
    if (s == null) return null;
    if (s.indexOf(" | ") !== -1) {
      var parts = s.split(" | ");
      s = n === 1 ? parts[0] : parts[1];
    }
    return s;
  }
  function bandDisplay(label) {
    // Display-only: the stored label stays the English band
    // label everywhere it is data (records, tokens, worker).
    if (LANG !== "es" || !label) return label;
    var id = bandIdForLabel(label);
    var key = { u25: "gift_finder_on_surface.budget_u25",
      m2550: "gift_finder_on_surface.budget_2550",
      m50100: "gift_finder_on_surface.budget_50100",
      m100: "gift_finder_on_surface.budget_100plus" }[id];
    return (key && T(key)) || label;
  }
  function interestDisplay(id, label) {
    if (LANG !== "es") return label;
    if (!id) return T("interests.placeholder") || label;
    return T("interests." + id) || label;
  }
  function applyStaticEs() {
    if (!window.SS_ES_DOM) return;
    window.SS_ES_DOM.forEach(function (entry) {
      try {
        var sel = entry[0], mode = entry[1], val = entry[2], idx = entry[3];
        if (mode === "title") { document.title = val; return; }
        var nodes = document.querySelectorAll(sel);
        var targets = idx != null ? (nodes[idx] ? [nodes[idx]] : []) : nodes;
        Array.prototype.forEach.call(targets, function (node) {
          if (mode === "text") node.textContent = val;
          else if (mode === "html") node.innerHTML = val;
          else if (mode === "ph") node.setAttribute("placeholder", val);
          else if (mode === "aria") node.setAttribute("aria-label", val);
        });
      } catch (e) {}
    });
  }
  function refreshLocalizedChrome() {
    // JS-built chrome the static table cannot reach: budget
    // chips and any person rows already on the page.
    try {
      var chips = el("budgetChips");
      if (chips) {
        Array.prototype.forEach.call(chips.children, function (c, i) {
          if (BANDS[i]) c.textContent = bandDisplay(BANDS[i].label);
        });
      }
      var rows = el("peopleRows");
      if (rows) {
        Array.prototype.forEach.call(rows.children, function (row) {
          var name = row.querySelector(".pname");
          if (name) {
            name.placeholder = T("mine.person_name_ph") || name.placeholder;
            var pa = T("step2.person_name_aria"); if (pa) name.setAttribute("aria-label", pa);
          }
          var rm = row.querySelector(".prm");
          if (rm) { var ra = T("step2.remove_person_aria"); if (ra) rm.setAttribute("aria-label", ra); }
          var hint = row.querySelector(".phint");
          if (hint) {
            var ha = T("step2.interest_aria"); if (ha) hint.setAttribute("aria-label", ha);
            Array.prototype.forEach.call(hint.options, function (o, i) {
              if (INTERESTS[i]) o.textContent = interestDisplay(INTERESTS[i][0], INTERESTS[i][1]);
            });
          }
          var wish = row.querySelector(".pwish");
          if (wish) {
            var wp = T("step2.wish_placeholder"); if (wp) wish.placeholder = wp;
            var wa = T("step2.wish_aria"); if (wa) wish.setAttribute("aria-label", wa);
          }
          var tog = row.querySelector(".popt");
          if (tog) {
            var ta = T("step2.optional_details_aria"); if (ta) tog.setAttribute("aria-label", ta);
          }
          refreshOptLabel(row);
        });
      }
    } catch (e) {}
  }
  function setLang(l) {
    if (l !== "es" || LANG === "es") return;
    LANG = "es";
    try { document.documentElement.lang = "es"; } catch (e) {}
    try { window.__SS_LANG = "es"; } catch (e) {}
    applyStaticEs();
    refreshLocalizedChrome();
  }
  function persistLangPref() {
    // Only an organizer-side choice persists on this device:
    // arriving with ?lang=es, or running a draw in Spanish.
    // Opening someone's Spanish link never flips the device.
    try { localStorage.setItem("ss_lang_v1", "es"); } catch (e) {}
  }
  // Entry-level resolution, run at load: the draw-record and
  // short-link languages can only be known after a fetch or a
  // record load, so those call setLang again when they land
  // (initShortReveal / initManage / boot's saved-record pass).
  (function resolveEntryLang() {
    try {
      var q = new URLSearchParams(location.search);
      if (q.get("lang") === "es") { setLang("es"); persistLangPref(); return; }
      if (/[&#]l=es(?![a-z])/.test(location.hash || "")) { setLang("es"); return; }
      // A saved draw record is decisive either way: it is the
      // current draw on this device, and its language (or its
      // absence) is what its organizer chose when they ran it.
      var rec = JSON.parse(localStorage.getItem("ss_draw_v1") || "null");
      if (rec && typeof rec === "object") {
        if (rec.lang === "es") setLang("es");
        return;
      }
      if (localStorage.getItem("ss_lang_v1") === "es") setLang("es");
    } catch (e) {}
  })();

  /* Short links + manage links (Nov 7, 2026, SPEC-SS-
     SHORTLINK-01 / SPEC-SS-MANAGE-01): a /s/<code> or
     /g/<code> address IS a live capability, so the code is
     lifted out of the address the moment this script loads —
     before the page's analytics can copy the address into an
     event (the same reason the head script lifts #setup=).
     The code is held on this page and in this tab's
     sessionStorage, so a reload in this tab keeps working,
     while a fresh open of the original link always works
     from anywhere. The visible address becomes the plain
     home address (a share arrival keeps its ?via=share
     mark). A later tab visit that carries its own intent
     (a #p= link, the own-draw hand-back) drops the stash
     instead of being pulled back here. */
  var PATH_CODE = null;
  var PATH_STRIPPED = false;
  try {
    var _pm = /^\/(s|g)\/([A-Za-z0-9]{8})$/.exec(location.pathname || "");
    if (_pm) {
      PATH_CODE = { kind: _pm[1], code: _pm[2] };
      try { sessionStorage.setItem("ss_path_v1", JSON.stringify(PATH_CODE)); } catch (e) {}
      history.replaceState(null, "", _pm[1] === "s" ? "/?via=share" : "/");
    } else if (/^\/(s|g)(\/|$)/.test(location.pathname || "")) {
      // Stripped short/manage link (Addendum 2070,
      // SPEC-SS-VERIFY2065-02): the address names the /s/ or
      // /g/ family but carries no usable code — the private
      // part was cut off in transit. Never restore a stashed
      // code for it and never land silently on the organizer
      // home: boot shows the missing-part notice instead.
      PATH_STRIPPED = true;
      try { sessionStorage.removeItem("ss_path_v1"); } catch (e) {}
      try { history.replaceState(null, "", "/"); } catch (e) {}
    } else if (!location.hash &&
        (location.search === "" || location.search === "?via=share")) {
      var _savedPath = null;
      try { _savedPath = JSON.parse(sessionStorage.getItem("ss_path_v1") || "null"); } catch (e) {}
      if (_savedPath && (_savedPath.kind === "s" || _savedPath.kind === "g") &&
          /^[A-Za-z0-9]{8}$/.test(_savedPath.code || "")) PATH_CODE = _savedPath;
    }
  } catch (e) {}

  /* ADV-9 / ADV-10 hardening (Oct 29, 2026). Names are cleaned
     at every entry point: invisible characters (zero-width,
     bidi controls) are stripped by core's stripInvisible, so
     "Sam" and "Sam" + a zero-width space become the same name
     and the duplicate warning can see them; truncation walks
     code points and never splits an emoji surrogate pair. */
  function cleanName(s) {
    return CORE.stripInvisible(String(s == null ? "" : s));
  }
  /* Wishlist notes (R2-2, Nov 1, 2026): free text an organizer
     saves for one person, cleaned like a name (invisible
     characters stripped), single-spaced, capped at 200 chars —
     the cap the note field itself sets. */
  function cleanWish(s) {
    var out = CORE.stripInvisible(String(s == null ? "" : s))
      .replace(/\s+/g, " ").trim();
    return truncateName(out, 200);
  }
  function truncateName(s, maxUnits) {
    var out = "", units = 0;
    for (var ch of String(s)) {
      if (units + ch.length > maxUnits) break;
      out += ch; units += ch.length;
    }
    return out;
  }
  function groupNameValue() {
    var input = el("groupName");
    return cleanName(input ? input.value : "").trim();
  }

  /* Organizer first name (Nov 7, 2026, SPEC-SS-TRANSPARENCY-01):
     optional, Step 1. Read at draw time exactly like the group
     name — no state plumbing. Blank is a first-class answer: the
     draw then mints the exact six-key payload it always has. */
  function organizerNameValue() {
    var input = el("organizerName");
    return cleanName(input ? input.value : "").trim();
  }

  function el(id) { return document.getElementById(id); }
  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- Reveal view (private link) ---------- */
  // SPEC-RW-01 (Nov 9, 2026): every reveal error view carries the
  // same paste recovery as the stripped-link notice. A mangled
  // code is exactly when pasting the full link saves the match.
  function showRevealError() {
    el("revealCover").hidden = true;
    el("revealError").hidden = false;
    initPasteRecovery("revealPasteBox", "revealPasteBtn", "revealPasteErr");
  }

  function initReveal(payload, trk) {
    el("organizer").hidden = true;
    var rev = el("reveal");
    rev.hidden = false;
    var picks = [];
    if (payload && payload.v === 1 && Array.isArray(payload.pi)) {
      picks = payload.pi.map(function (id) {
        for (var i = 0; i < BANK.length; i++) if (BANK[i].id === id) return BANK[i];
        return null;
      }).filter(Boolean);
    }
    if (!payload || !payload.you || !payload.got || !picks.length) {
      showRevealError();
      return;
    }
    // Organizer progress (Nov 7, 2026): a valid reveal
    // from a tracked link notes its own opening — codes
    // only, beside the PostHog count that already fires.
    if (trk) postProgress(trk, "o");
    // All-ideas list (breadth build, Oct 30, 2026): every pick's
    // bank name at a glance, inside the card that only opens
    // after Peek — the cover screen still shows no gift data,
    // and the list holds only this person's own pick names.
    var allList = el("allPicks");
    if (allList) {
      picks.forEach(function (p) {
        var li = document.createElement("li");
        li.textContent = p.name;
        allList.appendChild(li);
      });
    }
    /* Gift-depth door (SPEC-SS-GIFTDOOR-01, warroom NEW IDEA 05):
       recipients peek and leave one page deep, while the gift-idea
       pages sit unseen. Under the all-ideas list, render at most
       two quiet text doors to the gift page for the interest these
       picks actually carry. The payload holds pick slugs, not the
       matcher's interest (prep amendment 05-A1), so the dominant
       interest is tallied here from the resolved picks' own
       interests[]: interests on >=2 picks earn a door (top 2, ties
       by first sight); if none reaches 2, the single top interest
       still earns one; no interests at all renders nothing. The
       hand-back block sits above this row (it moved directly under
       the gift card in Addendum 2288), so the own-draw loop keeps
       visual priority, and the doors carry no box chrome -- the
       Recipient Ask box below stays the louder offer (05-A4).
       Interest -> page is the fixed 11-row map verified live at
       build time (05-A3: cooking's page is the foodies page; door
       labels come from the interest noun, never a product word).
       A click fires gift_door_clicked with the enum interest slug
       only -- no names, no match, no link (05-A5). */
    (function () {
      var doorsEl = el("giftDoors");
      if (!doorsEl || !picks.length) return;
      var DOORS = {
        cooking: ["/secret-santa-gift-ideas-for-foodies", "foodie"],
        books: ["/secret-santa-gift-ideas-for-book-lovers", "book"],
        gardening: ["/secret-santa-gift-ideas-for-gardeners", "gardening"],
        music: ["/secret-santa-gift-ideas-for-music-lovers", "music"],
        travel: ["/secret-santa-gift-ideas-for-travelers", "travel"],
        outdoors: ["/secret-santa-gift-ideas-for-outdoor-lovers", "outdoor"],
        tech: ["/secret-santa-gift-ideas-for-tech-lovers", "tech"],
        games: ["/secret-santa-gift-ideas-for-gamers", "game"],
        fitness: ["/secret-santa-gift-ideas-for-fitness-lovers", "fitness"],
        cozy: ["/secret-santa-gift-ideas-for-cozy-lovers", "cozy"],
        science: ["/secret-santa-gift-ideas-for-science-lovers", "science"]
      };
      var tally = {}, order = [];
      picks.forEach(function (pk) {
        (pk.interests || []).forEach(function (slug) {
          if (!DOORS[slug]) return;
          if (!tally[slug]) { tally[slug] = 0; order.push(slug); }
          tally[slug]++;
        });
      });
      if (!order.length) return;
      var ranked = order.slice().sort(function (a, b) {
        return (tally[b] - tally[a]) || (order.indexOf(a) - order.indexOf(b));
      });
      var chosen = ranked.filter(function (s) { return tally[s] >= 2; }).slice(0, 2);
      if (!chosen.length) chosen = ranked.slice(0, 1);
      chosen.forEach(function (slug, i) {
        if (i) doorsEl.appendChild(document.createTextNode("  ·  "));
        var a = document.createElement("a");
        a.setAttribute("href", DOORS[slug][0]);
        a.setAttribute("style", "display:inline-block;min-height:44px;padding:12px 2px");
        var label;
        if (LANG === "es") {
          var esName = interestDisplay(slug, slug);
          label = TF("reveal.gift_door_more", { interest: esName.toLowerCase() }) ||
            ("More " + DOORS[slug][1] + " ideas →");
        } else {
          label = "More " + DOORS[slug][1] + " ideas →";
        }
        a.textContent = label;
        a.addEventListener("click", function () {
          try {
            if (typeof fleetTrack === "function") {
              fleetTrack("gift_door_clicked", mergeProps({ tool: "secret-santa", interest: slug, link_source: revealLinkSource || "share-link" }, drawIdProps()));
            }
          } catch (e) {}
        });
        doorsEl.appendChild(a);
      });
      doorsEl.hidden = false;
    })();
    /* Warm hand-back (Nov 7, 2026, santa-loop #1 + Lever Lab 1):
       the payload already holds the group name (g) and the budget
       label (b) in the open — both are printed on this very page
       (cover chip, match card). Carry them across the own-draw
       click so the organizer home can land warm instead of cold:
       budget pre-selected, group name prefilled. The sealed token
       fragment is left behind, exactly as before; no match, no
       pick, no name ever rides in this href. handback_shown fires
       once per rendered reveal; handback_clicked on either link. */
    (function () {
      var g = Array.from(String(payload.g || "")).slice(0, 40).join("");
      var bandId = "";
      for (var bi = 0; bi < BANDS.length; bi++) {
        if (BANDS[bi].label === payload.b) bandId = BANDS[bi].id;
      }
      /* Gen-2 stamp + carry (SPEC-SS-GEN2-ROSTER-CARRY-01 /
         SPEC-SS-GEN2-STASH-CLOBBER-01): the hand-back href also
         carries `s`. For a short-link reveal `s` is the link's
         own 8-char code — already the capability the recipient
         holds, and it contains no name; the warm landing can
         then fetch the names-only roster from GET /api/links/<code>
         when this device's stash did not survive the hop to
         another browser. For a long link `s` is a short hash of
         the payload's group+you, computed on this device and
         carrying no name: it stamps the stash below, so one
         draw's roster can never be spent under another draw's
         hand-back. The stamp is never an event prop. */
      var hbStamp = "";
      if (revealLinkSource === "short-link" && revealShortCode &&
          /^[A-Za-z0-9]{8}$/.test(revealShortCode)) {
        hbStamp = revealShortCode;
      } else {
        var _h = 0x811c9dc5, _seed = String(payload.g || "") + "\n" + String(payload.you || "");
        for (var _hi = 0; _hi < _seed.length; _hi++) {
          _h ^= _seed.charCodeAt(_hi); _h = Math.imul(_h, 0x01000193) >>> 0;
        }
        hbStamp = "h" + ("0000000" + _h.toString(16)).slice(-8);
      }
      var href = "/?via=own" +
        (g ? "&g=" + encodeURIComponent(g) : "") +
        (bandId ? "&b=" + bandId : "") +
        (hbStamp ? "&s=" + hbStamp : "") +
        (LANG === "es" ? "&lang=es" : "") + "#tool";
      /* Creator prefill (Addendum 2066, the Seoul pattern):
         recipients ran their own draws minutes after peeking
         and re-typed every name. Leave the roster on THIS
         device — never in the href, never sent anywhere —
         so the own-draw form opens filled: the short link's
         stored roster when there is one, else the two names
         this payload itself holds. applyWarmState consumes
         it once when the hand-back lands. */
      var hbPrefill = "pair";
      try {
        var pnames = [];
        if (revealRoster) {
          revealRoster.forEach(function (n) {
            var v = cleanName(String(n || "")).trim();
            if (v && pnames.indexOf(v) === -1) pnames.push(v);
          });
        }
        if (pnames.length < 3) {
          pnames = [payload.you, payload.got].map(function (n) {
            return cleanName(String(n || "")).trim();
          }).filter(Boolean);
        }
        hbPrefill = pnames.length >= 3 ? "roster" : "pair";
        localStorage.setItem("ss_prefill_v1", JSON.stringify({
          g: g, b: bandId, names: pnames,
          source: hbPrefill === "roster" ? "handback-roster" : "handback-pair",
          stamp: hbStamp,
          ts: Date.now()
        }));
      } catch (e) {}
      var cov = el("ownDrawCover"), card = el("ownDrawCard");
      if (cov) cov.setAttribute("href", href);
      if (card) card.setAttribute("href", href);
      /* Split measurement (SPEC-SS-GEN2-MEASURE-01): every
         hand-back event carries the surface it came from. The
         cover's shown fires here, at cover render; the card's
         shown fires only when the reveal card actually opens
         (the Peek handler calls the hook below, exactly once).
         Enums only — no names, links, or codes in props. */
      function hb(name, surface) {
        try {
          if (typeof fleetTrack === "function") {
            fleetTrack(name, mergeProps({ tool: "secret-santa", link_source: revealLinkSource || "share-link", prefill: hbPrefill, surface: surface }, drawIdProps()));
          }
        } catch (e) {}
      }
      hb("handback_shown", "cover");
      if (cov) cov.addEventListener("click", function () { hb("handback_clicked", "cover"); });
      if (card) card.addEventListener("click", function () { hb("handback_clicked", "card"); });
      revealHandbackCardShown = function () { hb("handback_shown", "card"); };
    })();
    el("coverLine").textContent = TF("reveal.cover_line", { name: payload.you }) ||
      ("This one is for " + payload.you + ".");
    // Who set this up (SPEC-SS-TRANSPARENCY-01): only when the
    // payload carries the organizer's first name — every link
    // minted before this change, and every draw where the field
    // was left blank, renders the cover exactly as it does today.
    var coverFrom = el("coverFrom");
    if (coverFrom && payload.o) {
      var orgClean = Array.from(String(payload.o)).slice(0, 40).join("");
      coverFrom.textContent = TF("mine.cover_from", { name: orgClean }) ||
        (payload.g && payload.g !== "Secret Santa"
          ? orgClean + " set up " + payload.g + "'s draw."
          : orgClean + " set up this draw.");
      coverFrom.hidden = false;
    }
    if (payload.b) {
      var cb = el("coverBudget");
      cb.textContent = TF("reveal.cover_budget", { budget: bandDisplay(payload.b) }) ||
        ("Budget: " + payload.b);
      cb.hidden = false;
    }
    var CAT_ICONS = {
      "Cooking": "\uD83C\uDF73", "Outdoors": "\uD83C\uDF32", "Tech": "\uD83D\uDCBB",
      "Books": "\uD83D\uDCDA", "Fitness": "\uD83D\uDCAA", "Cozy home": "\uD83D\uDD6F\uFE0F",
      "Music": "\uD83C\uDFB5", "Games": "\uD83C\uDFB2", "Gardening": "\uD83C\uDF31",
      "Travel": "\u2708\uFE0F", "Experience": "\uD83C\uDF9F\uFE0F", "Sentimental": "\u2764\uFE0F",
      "Kid": "\uD83E\uDDF8", "Practical, no interest needed": "\uD83D\uDD27"
    };
    var pickIdx = 0;
    function showPick() {
      var p = picks[pickIdx % picks.length];
      var cat = p.category || (T("reveal.gift_idea_category_fallback") || "Gift idea");
      el("giftCat").textContent = (CAT_ICONS[cat] ? CAT_ICONS[cat] + " " : "\uD83C\uDF81 ") + cat;
      el("giftName").textContent = p.name;
      // Blurb is the bank's own third text for this idea (what it
      // is, in one line). It was in the bank all along; the card
      // only ever showed why + spec, so a drawn person got less
      // guidance than the bank holds (breadth build, Oct 30, 2026).
      var gb = el("giftBlurb");
      if (gb) gb.textContent = p.blurb || "";
      el("giftWhy").textContent = p.why;
      el("giftSpec").textContent = p.spec;
      // Say how many ideas this person got, so the depth is
      // visible without pressing the button and counting.
      var gc = el("giftCount");
      if (gc) gc.textContent = picks.length > 1
        ? (TF("reveal.gift_idea_counter", { i: pickIdx % picks.length + 1, total: picks.length }) ||
          ("Gift idea " + (pickIdx % picks.length + 1) + " of " + picks.length + "."))
        : "";
    }
    el("peekBtn").addEventListener("click", function () {
      markSeen();
      trackRevealOpened();
      if (revealHandbackCardShown) { revealHandbackCardShown(); revealHandbackCardShown = null; }
      if (trk) postProgress(trk, "r");
      el("revealCover").hidden = true;
      el("revealCard").hidden = false;
      el("hiLine").textContent = TF("reveal.hi_you_got", { name: payload.you }) ||
        ("Hi " + payload.you + ". You got:");
      el("gotName").textContent = payload.got;
      el("budgetLine").textContent = TF("reveal.budget_line", { budget: bandDisplay(payload.b) }) ||
        ("Budget: " + payload.b);
      showPick();
      // Wishlist note (R2-2): notes live only in the saved draw
      // record in THIS browser — never in the link (a v1 token
      // carries exactly its six fields, ids only, by design) and
      // never sent anywhere. So a note appears only when the
      // link is opened on the device whose organizer saved it,
      // for the same group, and only the note for the person on
      // screen. The block on the page says exactly that.
      try {
        var saved = loadDrawRecord();
        var note = saved && saved.group === payload.g && saved.wish
          ? saved.wish[payload.got] : null;
        if (note) {
          el("wishText").textContent = note;
          el("wishBlock").hidden = false;
        }
      } catch (e) {}
      el("gotName").setAttribute("tabindex", "-1");
      el("gotName").focus({ preventScroll: false });
    });
    /* Recipient Ask (SPEC-SS-TRANSPARENCY-01 Part 3, Nov 7, 2026):
       the reveal's own door to the site's Ask, framed for the
       recipient — more gift ideas for the person they drew, at
       the budget in their link. It runs the same on-device
       matcher as the organizer Ask (CORE.matchByWords, words
       never sent or saved, no name ever asked) behind the same
       deterministic secrecy screen (isSecrecyAsk, checked first,
       exactly as runAsk checks it): a secrecy-shaped ask gets
       the honest refusal in post-2079 wording, never picks and
       never any match but the one this recipient already sees. */
    (function initRecipientAsk() {
      var goBtn = el("recipientAskGo");
      if (!goBtn) return;
      var bandId = "m2550";
      for (var rbi = 0; rbi < BANDS.length; rbi++) {
        if (BANDS[rbi].label === payload.b) bandId = BANDS[rbi].id;
      }
      var rTitle = el("recipientAskTitle");
      if (rTitle) rTitle.textContent = TF("mine.recipient_ask_title_for", { name: payload.got }) ||
        ("Need more ideas for " + payload.got + "?");
      var rLab = el("recipientAskLabel");
      if (rLab) rLab.textContent = TF("mine.recipient_ask_label_for", { name: payload.got }) ||
        ("What is " + payload.got + " into?");
      function renderRecipientSecrecy() {
        var box = el("recipientAskResults");
        box.innerHTML = "";
        box.appendChild(make("p", "summaryline", T("mine.ask_secret_title") || "Matches stay secret."));
        box.appendChild(make("p", null,
          T("mine.ask_org_screen") || "Your organizer's screen shows names and links only. It never shows the matches."));
        box.appendChild(make("p", null,
          T("mine.recipient_secret_2") || "Each match is shown only through its own private link, like a note in an envelope, not a locked safe. Anyone who has a link can open it, so keep yours private."));
        box.appendChild(make("p", "hint",
          TF("mine.recipient_secret_hint", { name: payload.got }) ||
          ("Ask for gift ideas for " + payload.got + " instead: say what they are into above.")));
        box.hidden = false;
        trackAskAnswered(0);
      }
      function renderRecipientResults(res) {
        var box = el("recipientAskResults");
        box.innerHTML = "";
        var bandLabelR = BANDS.filter(function (b) { return b.id === bandId; })[0].label;
        if (res.empty) {
          box.appendChild(make("p", null, T("mine.ask_type_first") || "Type a few words first."));
          box.appendChild(make("p", null, T("mine.ask_type_help") || "What they do, eat, read, or play is plenty."));
          box.hidden = false;
          return;
        }
        if (res.heard.length) {
          box.appendChild(make("p", "summaryline",
            TF("mine.ask_heard", { list: res.heard.map(askHeardLabel).join(", ") }) ||
            ("What I heard: " + res.heard.map(askHeardLabel).join(", ") + ".")));
        } else {
          box.appendChild(make("p", "summaryline",
            T("gift_finder_on_surface.no_match") || "Your words did not match a known interest."));
        }
        if (!res.matched) {
          box.appendChild(make("p", null,
            (T("gift_finder_on_surface.here_are_six") || "Here are six picks that fit your budget:") +
            " " + bandDisplay(bandLabelR) + "."));
        } else if (res.backfilled > 0) {
          var matchedN = res.picks.length - res.backfilled;
          box.appendChild(make("p", null,
            TP("gift_finder_on_surface.matched_rest", matchedN, { n: matchedN })
              ? TP("gift_finder_on_surface.matched_rest", matchedN, { n: matchedN }) + " " + bandDisplay(bandLabelR) + "."
              : (matchedN +
                (matchedN === 1 ? " pick matched" : " picks matched") +
                " your words. The rest fit your budget: " + bandLabelR + ".")));
        } else {
          box.appendChild(make("p", null, T("gift_finder_on_surface.matched_your_words") || "Six picks matched your words."));
        }
        res.picks.forEach(function (p) {
          var card = make("div", "askcard");
          card.appendChild(make("span", "cat", "\uD83C\uDF81 " + (p.category || (T("reveal.gift_idea_category_fallback") || "Gift idea"))));
          card.appendChild(make("h3", null, p.name));
          if (p.blurb) card.appendChild(make("p", null, p.blurb));
          card.appendChild(make("p", null, p.why));
          card.appendChild(make("p", "spec", p.spec));
          box.appendChild(card);
        });
        box.appendChild(make("p", "hint",
          TF("mine.recipient_more_hint", { name: payload.got }) ||
          ("More ideas for " + payload.got + ": the picks in your link are still above, when you scroll up.")));
        box.hidden = false;
        trackAskAnswered(res.picks.length);
      }
      function runRecipientAsk() {
        var words = el("recipientAskWords").value;
        if (isSecrecyAsk(words)) { renderRecipientSecrecy(); return; }
        renderRecipientResults(CORE.matchByWords(BANK, bandId, words));
      }
      goBtn.addEventListener("click", runRecipientAsk);
      el("recipientAskWords").addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") { ev.preventDefault(); runRecipientAsk(); }
      });
      Array.prototype.forEach.call(document.querySelectorAll(".recipientaskchip"), function (chip) {
        chip.addEventListener("click", function () {
          el("recipientAskWords").value = chip.textContent;
          runRecipientAsk();
        });
      });
    })();
    el("anotherPick").addEventListener("click", function () {
      pickIdx++;
      showPick();
    });
    el("saveCard").addEventListener("click", function () {
      saveCardImage(payload, picks[pickIdx % picks.length]);
    });
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    var words = String(text).split(/\s+/);
    var line = "", lines = 0;
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        y += lineHeight; lines++;
        if (maxLines && lines >= maxLines) return y;
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) { ctx.fillText(line, x, y); y += lineHeight; }
    return y;
  }

  function saveCardImage(payload, pick) {
    var c = document.createElement("canvas");
    c.width = 1080; c.height = 1080;
    var x = c.getContext("2d");
    x.fillStyle = "#fdf9f0"; x.fillRect(0, 0, 1080, 1080);
    x.fillStyle = "#17603c"; x.fillRect(0, 0, 1080, 210);
    // Small gift box in the header band, so the card shows the
    // brand mark instead of words alone.
    x.fillStyle = "#c1272d"; x.fillRect(52, 62, 96, 76);
    x.fillStyle = "#9c1f24"; x.fillRect(46, 48, 108, 20);
    x.fillStyle = "#fdf9f0"; x.fillRect(92, 48, 16, 90);
    x.fillStyle = "#fdf9f0"; x.textAlign = "center";
    x.font = "800 54px sans-serif";
    x.fillText(payload.g || "Secret Santa", 540, 95);
    x.font = "600 36px sans-serif";
    x.fillText(T("mine.card_subtitle") || "a private match card", 540, 155);
    x.fillStyle = "#2a2118";
    x.font = "600 44px sans-serif";
    x.fillText(TF("mine.card_you_got", { name: payload.you }) || (payload.you + ", you got:"), 540, 330);
    x.fillStyle = "#9c1f24";
    x.font = "800 92px sans-serif";
    wrapText(x, payload.got, 540, 450, 920, 100, 2);
    x.fillStyle = "#2a2118";
    x.font = "700 40px sans-serif";
    x.fillText(TF("mine.card_budget", { budget: bandDisplay(payload.b) }) || ("Budget: " + payload.b), 540, 620);
    x.font = "800 46px sans-serif";
    x.fillStyle = "#17603c";
    var y = wrapText(x, (TF("mine.card_pick", { name: pick.name }) || ("Gift pick: " + pick.name)), 540, 720, 920, 58, 3);
    x.fillStyle = "#71634f";
    x.font = "400 36px sans-serif";
    wrapText(x, pick.why, 540, y + 16, 880, 48, 3);
    x.fillStyle = "#71634f";
    x.font = "600 34px sans-serif";
    x.fillText("Pick My Secret Santa, pickmysecretsanta.com", 540, 1010);
    x.fillStyle = "#17603c";
    x.font = "600 30px sans-serif";
    x.fillText(T("mine.card_run") || "Run your own draw: pickmysecretsanta.com", 540, 1052);
    var a = document.createElement("a");
    a.download = T("reveal.match_card_filename") || "my-secret-santa-card.png";
    a.href = c.toDataURL("image/png");
    a.click();
    trackArtifact();
  }

  /* ---------- Organizer flow ---------- */
  var state = {
    band: "m2550",
    people: [],      // {rowId, name, interest, wish}
    // Keep-apart rules (R2-1): three hand-set pair sources plus
    // the kids-and-adults preset. readPairs() unions them.
    apart: new Set(),        // checklist taps, pairKeys "a:b" of row ids
    couplePairs: new Set(),  // Couples apart preset
    lastPairs: new Set(),    // Last year's pairs preset
    kidRows: new Set(),      // row ids tagged as kids
    kidsApart: false,        // kids preset switched on
    restrictPerson: null,    // row id selected on step 3
    capture: null,           // step-3 preset mode: couple|lastyear|kids
    captureSel: [],          // names tapped so far in a capture mode
    nextRow: 1,
    lastDraw: null,  // {match, tokens}
    savedRec: null   // the on-device draw record (ss_draw_v1), when one exists
  };

  function showStep(n) {
    [1, 2, 3, 4].forEach(function (k) {
      el("step" + k).hidden = k !== n;
    });
    el("tool").scrollIntoView({ behavior: "smooth", block: "start" });
    var h = el("step" + n).querySelector("h2");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }

  // Step 1 — budget chips
  function initStep1() {
    var box = el("budgetChips");
    BANDS.forEach(function (b) {
      var btn = make("button", "chip", bandDisplay(b.label));
      btn.type = "button";
      btn.setAttribute("aria-pressed", b.id === state.band ? "true" : "false");
      btn.addEventListener("click", function () {
        state.band = b.id;
        Array.prototype.forEach.call(box.children, function (c, i) {
          c.setAttribute("aria-pressed", BANDS[i].id === state.band ? "true" : "false");
        });
        // The step-2 words matcher previews picks in the group's
        // budget until its own budget picker is touched.
        var askBand = el("askBand");
        if (askBand) askBand.value = state.band;
      });
      box.appendChild(btn);
    });
    el("toStep2").addEventListener("click", function () { showStep(2); });
  }

  // Step 2 — people rows. Names first (STEP2-FRICTION, Nov 5,
  // 2026): the draw needs names only, so a row shows one name
  // field and the remove button. The two optional fields — what
  // they like, and the wishlist note — sit behind ONE collapsed
  // toggle per person, closed by default, so a ten-person group
  // no longer reads as thirty form fields. The fields keep their
  // classes and semantics; only where they sit has changed.
  var OPT_LABEL = "Add likes or a wishlist note, optional";
  var OPT_LABEL_SET = "Likes or a wishlist note added, tap to change";
  function optLabel() { return T("step2.optional_details_label") || OPT_LABEL; }
  function optLabelSet() { return T("step2.optional_details_label_set") || OPT_LABEL_SET; }

  /* "Start from the sample" (SPEC-FUNNEL-SS-1, Nov 5, 2026;
     funnel dimension study, Addendum 1674). Measured problem:
     73 pageview people -> 1 tool_start person in 28 days — the
     blank Step 2 form is where visitors stop. The sample draw on
     screen one already shows a finished draw; this lets a visitor
     turn THAT into their own editable draft in one tap: Step 2
     opens with the sample's four names filled in (the same four
     names the sample card and the sample script use — Maya, Tom,
     Priya, Sam), each row keeping the full names-first shape
     (editable, removable, optionals behind the same toggle).
     Nothing is drawn and no link exists until the organizer
     confirms with the normal Next / Draw controls — the draft is
     a starting point, not a draw. Funnel counting follows the
     spec exactly: tool_start fires ONCE, on the organizer's
     FIRST name edit in the draft (typing or pasting into a name
     field), with entry "sample-draft" and counts only — never a
     name. The draw's own tool_start at draw time is unchanged. */
  var SAMPLE_DRAFT_NAMES = ["Maya", "Tom", "Priya", "Sam"];
  var sampleDraftActive = false;
  var sampleDraftStarted = false;
  function trackSampleDraftStart() {
    try {
      if (typeof fleetTrack === "function") {
        var n = readPeople().filter(function (p) { return p.name.length > 0; }).length;
        fleetTrack("tool_start", { tool: "secret-santa", entry: "sample-draft", people_count: n });
        fireDrawStarted("sample-draft");
      }
    } catch (e) {}
  }
  function startFromSample() {
    var box = el("peopleRows");
    if (!box) return;
    box.innerHTML = "";
    SAMPLE_DRAFT_NAMES.forEach(function (nm) {
      var row = personRow();
      row.querySelector(".pname").value = nm;
      box.appendChild(row);
    });
    sampleDraftActive = true;
    sampleDraftStarted = false;
    fireNamesAddedFill("sample", SAMPLE_DRAFT_NAMES.length);
    noteNamesMode("rows");
    setEntryMode("rows");
    var note = el("sampleDraftNote");
    if (note) note.hidden = false;
    hideErr("err2");
    updatePeopleCount();
    showStep(2);
    var first = box.querySelector(".pname");
    if (first) {
      setTimeout(function () {
        first.focus({ preventScroll: true });
        try { first.select(); } catch (e) {}
      }, 450);
    }
  }
  function refreshOptLabel(row) {
    var toggle = row.querySelector(".popt");
    if (!toggle) return;
    var hint = row.querySelector(".phint");
    var wish = row.querySelector(".pwish");
    var has = (hint && hint.value) || (wish && wish.value.trim());
    toggle.textContent = has ? optLabelSet() : optLabel();
  }
  function rowOf(node) {
    while (node && !(node.classList && node.classList.contains("prow"))) {
      node = node.parentNode;
    }
    return node;
  }
  function personRow() {
    var rowId = state.nextRow++;
    var row = make("div", "prow");
    var main = make("div", "prowmain");
    var name = document.createElement("input");
    name.type = "text"; name.className = "pname"; name.maxLength = 40;
    name.placeholder = T("mine.person_name_ph") || "Name"; name.autocomplete = "off";
    name.setAttribute("aria-label", T("step2.person_name_aria") || "Person name");
    var rm = make("button", "prm", "×");
    rm.type = "button"; rm.setAttribute("aria-label", T("step2.remove_person_aria") || "Remove person");
    rm.addEventListener("click", function () {
      row.remove();
      dropPersonRestrictions(rowId);
    });
    main.appendChild(name); main.appendChild(rm);
    var hint = document.createElement("select");
    hint.className = "phint";
    hint.setAttribute("aria-label", T("step2.interest_aria") || "What they like (optional)");
    INTERESTS.forEach(function (pair) {
      var o = document.createElement("option");
      o.value = pair[0]; o.textContent = interestDisplay(pair[0], pair[1]);
      hint.appendChild(o);
    });
    // Wishlist note (R2-2): one free-text line, for this
    // person's Santa. It stays on this device (see the step-2
    // hint and the reveal block for exactly where it can
    // appear); it is never put in a link.
    var wish = document.createElement("input");
    wish.type = "text"; wish.className = "pwish"; wish.maxLength = 200;
    wish.placeholder = T("step2.wish_placeholder") || "Wishlist note for their Santa (optional)";
    wish.autocomplete = "off";
    wish.setAttribute("aria-label", T("step2.wish_aria") || "Wishlist note for their Santa (optional)");
    var body = make("div", "poptbody");
    body.id = "popt-" + rowId;
    body.hidden = true;
    body.appendChild(hint); body.appendChild(wish);
    var toggle = document.createElement("button");
    toggle.type = "button"; toggle.className = "popt";
    toggle.textContent = optLabel();
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", body.id);
    toggle.setAttribute("aria-label", T("step2.optional_details_aria") || "Optional details for this person");
    toggle.addEventListener("click", function () {
      var open = body.hidden;
      body.hidden = !open;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) hint.focus();
    });
    row.appendChild(main); row.appendChild(toggle); row.appendChild(body);
    row.dataset.rowId = rowId;
    return row;
  }

  function readPeople() {
    var out = [];
    Array.prototype.forEach.call(el("peopleRows").children, function (row) {
      var name = cleanName(row.querySelector(".pname").value).trim();
      var interest = row.querySelector(".phint").value;
      var wishEl = row.querySelector(".pwish");
      var wish = wishEl ? cleanWish(wishEl.value) : "";
      out.push({ rowId: Number(row.dataset.rowId), name: name, interest: interest, wish: wish });
    });
    return out;
  }

  function updatePeopleCount() {
    var n = readPeople().filter(function (p) { return p.name.length > 0; }).length;
    var line = el("peopleCount");
    var btn = el("drawNowBtn");
    if (n >= 3) {
      line.textContent = TF("step2.people_count", { n: n }) ||
        (n + " people added. You can draw now, or set pairs first.");
      line.hidden = false;
      btn.hidden = false;
    } else {
      line.hidden = true;
      btn.hidden = true;
    }
  }

  /* Bulk add: paste a list or pick a file. All parsing happens
     in this page. Names and interests never leave the browser.
     One person per line. An interest can follow a comma (or a
     tab, the way a spreadsheet pastes). */
  function interestValue(raw) {
    // The INTERESTS value for a typed word, or null when the word
    // is not on the list. Matches the stored value and the label,
    // in any case: "cooking", "Cooking", "cozy" and "Cozy things"
    // all land on the same pick.
    var key = String(raw || "").trim().toLowerCase();
    if (!key) return "";
    for (var i = 0; i < INTERESTS.length; i++) {
      if (INTERESTS[i][0].toLowerCase() === key ||
          INTERESTS[i][1].toLowerCase() === key ||
          interestDisplay(INTERESTS[i][0], INTERESTS[i][1]).toLowerCase() === key) return INTERESTS[i][0];
    }
    return null;
  }

  function splitCsvLine(line) {
    // One CSV line -> fields. Quotes can wrap a field that holds
    // a comma. Good enough for a hand-made group list.
    var fields = [], cur = "", quoted = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (quoted) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else quoted = false;
        } else cur += ch;
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === ",") {
        fields.push(cur); cur = "";
      } else cur += ch;
    }
    fields.push(cur);
    return fields.map(function (f) { return f.trim(); });
  }

  function parseBulk(text) {
    var people = [], noName = 0, dupeLines = 0;
    /* Comma-separated name list (Addendum 2066): one line,
       several names, copied from a group chat — "Maria, John,
       Dan" — becomes one name per line. The guard keeps the
       documented format safe: when the word after the first
       comma is a known interest ("Maria, cooking, ..."),
       the line keeps its name + interest meaning. */
    var rawBulk = String(text || "");
    if (rawBulk.indexOf("\n") === -1 && rawBulk.indexOf("\r") === -1 &&
        rawBulk.indexOf("\t") === -1) {
      var commaParts = rawBulk.split(",");
      if (commaParts.length >= 3 &&
          interestValue((commaParts[1] || "").trim()) === null) {
        rawBulk = commaParts.map(function (s) { return s.trim(); })
          .filter(Boolean).join("\n");
        text = rawBulk;
      }
    }
    // Exact-copy lines inside one paste (STEP2-FRICTION, Nov 5,
    // 2026): the same name with the same interest and the same
    // note, twice, is a paste stutter — count it and keep one.
    // Two people who share a name with DIFFERENT details are
    // not copies: they import as their own rows and keep the
    // duplicate-name warning + draw block they have always had.
    var seen = Object.create(null);
    String(text || "").split(/\r\n|\r|\n/).forEach(function (line) {
      if (!line.trim()) return; // blank lines are just skipped
      var fields = line.indexOf("\t") !== -1 && line.indexOf(",") === -1
        ? line.split("\t").map(function (f) { return f.trim(); })
        : splitCsvLine(line);
      var name = truncateName(cleanName(fields[0] || ""), 40);
      if (!name) { noName++; return; }
      var person = { name: name, interest: "", unknown: false, wish: "" };
      if (fields.length > 1 && fields[1]) {
        var v = interestValue(fields[1]);
        if (v === null) person.unknown = true;
        else person.interest = v;
      }
      // A third field (and anything after it) is the wishlist
      // note: "Maria, cooking, the blue scarf, size M".
      if (fields.length > 2) {
        person.wish = cleanWish(fields.slice(2).join(", "));
      }
      var key = person.name.toLowerCase() + "|" + person.interest +
        "|" + (person.unknown ? "?" : "") + "|" + person.wish.toLowerCase();
      if (seen[key]) { dupeLines++; return; }
      seen[key] = true;
      people.push(person);
    });
    return { people: people, noName: noName, dupeLines: dupeLines };
  }

  function importBulk(text, method) {
    var box = el("peopleRows");
    var parsed = parseBulk(text);
    // Bulk-entry kind (SPEC-SS-MEASURE-05 rider): the file
    // door says so itself; a paste is classified by the same
    // shape test parseBulk's comma pre-pass uses. A fixed kind
    // word only — the pasted text itself never leaves the page.
    var bulkMethod = method || null;
    if (!bulkMethod) {
      var rawTxt = String(text || "");
      var commaParts = rawTxt.split(",");
      bulkMethod = (rawTxt.indexOf("\n") === -1 && rawTxt.indexOf("\r") === -1 &&
        rawTxt.indexOf("\t") === -1 && commaParts.length >= 3 &&
        interestValue((commaParts[1] || "").trim()) === null) ? "bulk-comma" : "bulk-lines";
    }
    var summary = el("bulkSummary");
    if (!parsed.people.length && !parsed.noName) {
      summary.textContent = T("step2.bulk_no_names") || "No names found. Paste one name on each line.";
      summary.hidden = false;
      return;
    }
    var added = 0, capped = 0, unknown = 0;
    var addedNames = [];
    parsed.people.forEach(function (p) {
      // Fill a blank row first, so a big group does not leave a
      // screen of empty rows behind it.
      var target = null;
      Array.prototype.forEach.call(box.children, function (row) {
        if (!target && !row.querySelector(".pname").value.trim()) target = row;
      });
      if (!target) {
        if (box.children.length >= MAX_PEOPLE) { capped++; return; }
        target = personRow();
        box.appendChild(target);
      }
      target.querySelector(".pname").value = p.name;
      target.querySelector(".phint").value = p.interest;
      var wishEl = target.querySelector(".pwish");
      if (wishEl) wishEl.value = p.wish || "";
      refreshOptLabel(target);
      added++;
      addedNames.push(p.name);
      if (p.unknown) unknown++;
    });
    if (added > 0) {
      fireDrawStarted();
      checkSetupCompleted();
      noteNamesMode("paste");
      try {
        if (typeof fleetTrack === "function") {
          fleetTrack("names_added", { tool: "secret-santa", method: bulkMethod, count_bucket: groupSizeBucket(added) });
        }
      } catch (e) {}
    }
    var parts = [];
    parts.push(added === 1
      ? (T("step2.bulk_added_one") || "Added 1 person.")
      : (TF("step2.bulk_added_many", { n: added }) ||
        ("Added " + added + " people.")));
    if (unknown) {
      parts.push(TP("step2.bulk_unknown_interest", unknown, { n: unknown }) ||
        (unknown + (unknown === 1 ? " name had" : " names had") +
          " an interest we do not know. Added with no interest."));
    }
    if (parsed.noName) {
      parts.push(TP("step2.bulk_skipped_noname", parsed.noName, { n: parsed.noName }) ||
        (parsed.noName + (parsed.noName === 1 ? " line" : " lines") +
          " skipped. Each line needs a name first."));
    }
    if (parsed.dupeLines) {
      parts.push(TP("step2.bulk_skipped_dupe", parsed.dupeLines, { n: parsed.dupeLines }) ||
        (parsed.dupeLines + (parsed.dupeLines === 1 ? " line" : " lines") +
          " skipped, exact copies of a line above."));
    }
    if (capped) {
      parts.push(TP("step2.bulk_skipped_over_limit", capped, { n: capped }) ||
        (capped + (capped === 1 ? " line" : " lines") +
          " skipped, over the 30 person limit."));
    }
    // Flag duplicates now, at import time, not just on the share
    // screen after the draw (ADV-7). Same test and same words as
    // the share screen's warning in renderShare: names match
    // trimmed and case-insensitive, and an imported name counts
    // when the roster now holds it more than once.
    var rosterCount = Object.create(null);
    readPeople().forEach(function (p) {
      if (!p.name) return;
      var k = p.name.trim().toLowerCase();
      rosterCount[k] = (rosterCount[k] || 0) + 1;
    });
    var dupeImported = addedNames.some(function (nm) {
      return rosterCount[nm.trim().toLowerCase()] > 1;
    });
    if (dupeImported) {
      parts.push(T("step2.bulk_dupe_warning") || "Two people share a name. Check each link twice.");
    }
    summary.textContent = parts.join(" ");
    summary.hidden = false;
    updatePeopleCount();
  }

  /* Entry mode (paste-first, Nov 8, 2026): step 2 opens on
     the paste box; the rows sit below it, fully live, and a
     quiet toggle swaps which door is in front. entryMode is
     what the step is showing now; namesModeFirst remembers
     which door the organizer actually used first, and rides
     the draw count events as names_mode — the same fixed-
     enum pattern as start_source. Counts and kind words
     only; never a name, never a match. */
  var entryMode = "paste";
  var namesModeFirst = null;
  function noteNamesMode(m) { if (!namesModeFirst) namesModeFirst = m; }
  function namesModeWord() { return namesModeFirst || entryMode; }
  function setEntryMode(mode) {
    entryMode = mode === "rows" ? "rows" : "paste";
    var panel = el("bulkPanel");
    if (panel) panel.hidden = entryMode !== "paste";
    var trow = el("bulkToggleRow");
    if (trow) trow.hidden = entryMode === "paste";
  }

  function initStep2() {
    var box = el("peopleRows");
    for (var i = 0; i < 4; i++) box.appendChild(personRow());
    box.addEventListener("input", updatePeopleCount);
    box.addEventListener("click", updatePeopleCount);
    // SPEC-FUNNEL-SS-1: the sample card's start button + the
    // first-edit tool_start. The button lives in the sample card
    // on screen one; wiring it here keeps it on the organizer
    // path only (a reveal visit returns from boot before this).
    var sampleStartBtn = el("sampleStart");
    if (sampleStartBtn) sampleStartBtn.addEventListener("click", startFromSample);
    box.addEventListener("input", function (e) {
      if (e.target.classList && e.target.classList.contains("pname") &&
          e.target.value.trim()) {
        noteNamesMode("rows");
        fireDrawStarted();
        var rr = rowOf(e.target);
        if (rr) fireNamesAddedRows(rr.dataset.rowId);
        checkSetupCompleted();
      }
    });
    box.addEventListener("input", function (e) {
      if (!sampleDraftActive || sampleDraftStarted) return;
      if (!e.target.classList || !e.target.classList.contains("pname")) return;
      sampleDraftStarted = true;
      trackSampleDraftStart();
    });
    // Fast name entry (STEP2-FRICTION, Nov 5, 2026): Enter in a
    // name field moves to the next row's name field, growing a
    // fresh row at the end; typing in the last row grows one
    // too, so the next empty row is always waiting. Empty extra
    // rows are ignored by readPeople, exactly as the four
    // starter rows always were.
    box.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      if (!e.target.classList || !e.target.classList.contains("pname")) return;
      e.preventDefault();
      var row = rowOf(e.target);
      if (!row) return;
      var next = row.nextElementSibling;
      if (next) { next.querySelector(".pname").focus(); return; }
      if (e.target.value.trim() && box.children.length < MAX_PEOPLE) {
        var fresh = personRow();
        box.appendChild(fresh);
        fresh.querySelector(".pname").focus();
      }
    });
    box.addEventListener("input", function (e) {
      var row = rowOf(e.target);
      if (!row) return;
      refreshOptLabel(row);
      if (e.target.classList && e.target.classList.contains("pname") &&
          row === box.lastElementChild && e.target.value.trim() &&
          box.children.length < MAX_PEOPLE) {
        box.appendChild(personRow());
      }
    });
    box.addEventListener("change", function (e) {
      var row = rowOf(e.target);
      if (row) refreshOptLabel(row);
    });
    el("addPerson").addEventListener("click", function () {
      if (box.children.length >= MAX_PEOPLE) {
        showErr("err2", T("step2.max_people_error") || "Thirty people is the most for one draw.");
        return;
      }
      var row = personRow();
      box.appendChild(row);
      row.querySelector(".pname").focus();
    });
    el("bulkToggle").addEventListener("click", function () {
      setEntryMode("paste");
      el("bulkText").focus();
    });
    el("bulkClose").addEventListener("click", function () {
      setEntryMode("rows");
      var firstName = box.querySelector(".pname");
      if (firstName) firstName.focus();
    });
    el("bulkAdd").addEventListener("click", function () {
      var text = el("bulkText").value;
      if (!text.trim()) {
        var s = el("bulkSummary");
        s.textContent = T("step2.bulk_paste_first") || "Paste names first, one on each line.";
        s.hidden = false;
        return;
      }
      importBulk(text);
      el("bulkText").value = "";
    });
    el("bulkFile").addEventListener("change", function () {
      var input = el("bulkFile");
      var f = input.files && input.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { importBulk(String(reader.result || ""), "bulk-file"); };
      reader.readAsText(f);
      input.value = "";
    });
    el("back1").addEventListener("click", function () { showStep(1); });
    el("toStep3").addEventListener("click", function () {
      var people = readPeople().filter(function (p) { return p.name.length > 0; });
      if (people.length < 3) {
        showErr("err2", T("mine.add_three") || "Add at least three names.");
        return;
      }
      hideErr("err2");
      state.people = people;
      buildPairRows();
      showStep(3);
    });
    // Same draw, one screen earlier: most groups keep nobody apart,
    // so once 3 names exist the organizer can skip the pairs screen.
    // Pairs stay empty; core draw logic is untouched.
    el("drawNowBtn").addEventListener("click", function () {
      var people = readPeople().filter(function (p) { return p.name.length > 0; });
      if (people.length < 3) {
        showErr("err2", T("mine.add_three") || "Add at least three names.");
        return;
      }
      hideErr("err2");
      state.people = people;
      buildPairRows();
      doDraw();
    });
  }

  /* Words matcher (SPEC-SS-ASK-1, Oct 31, 2026): "Say what they
     are into, in your words." Lives on step 2, where each
     person's interest is set. The visitor types a few words for
     ONE person, no name; the box never asks for one, and
     CORE.matchByWords scores the words against the bank's own
     copy, on this device, and returns the same six-picks shape
     the draw's filter path returns. The words are never sent,
     saved, stored, or counted: the one fleet event is counts
     only (how many picks came back), fired through the same
     scrubbed fleetTrack every other count here uses. Trying
     the words changes nothing about the draw; the now-what
     line under the picks tells the organizer to set the heard
     interest on that person's row, and their private link then
     carries picks like these. */
  function trackAskAnswered(count) {
    try {
      if (typeof fleetTrack === "function") {
        fleetTrack("ask_answered", { tool: "secret-santa", results_count: count });
      }
    } catch (e) {}
  }
  function askHeardLabel(interest) {
    for (var i = 0; i < INTERESTS.length; i++) {
      if (INTERESTS[i][0] === interest) return interestDisplay(INTERESTS[i][0], INTERESTS[i][1]);
    }
    return interest;
  }
  function renderAskResults(res, band) {
    var box = el("askResults");
    box.innerHTML = "";
    var bandLabel = BANDS.filter(function (b) { return b.id === band; })[0].label;
    if (res.empty) {
      box.appendChild(make("p", null, T("mine.ask_type_first") || "Type a few words first."));
      box.appendChild(make("p", null, T("mine.ask_type_help") || "What they do, eat, read, or play is plenty."));
      box.hidden = false;
      return;
    }
    if (res.heard.length) {
      box.appendChild(make("p", "summaryline",
        TF("mine.ask_heard", { list: res.heard.map(askHeardLabel).join(", ") }) ||
        ("What I heard: " + res.heard.map(askHeardLabel).join(", ") + ".")));
    } else {
      box.appendChild(make("p", "summaryline",
        T("gift_finder_on_surface.no_match") || "Your words did not match a known interest."));
    }
    if (!res.matched) {
      box.appendChild(make("p", null,
        (T("gift_finder_on_surface.here_are_six") || "Here are six picks that fit your budget:") +
        " " + bandDisplay(bandLabel) + "."));
    } else if (res.backfilled > 0) {
      var matchedN2 = res.picks.length - res.backfilled;
      var matchedEs = TP("gift_finder_on_surface.matched_rest", matchedN2, { n: matchedN2 });
      box.appendChild(make("p", null, matchedEs
        ? matchedEs + " " + bandDisplay(bandLabel) + "."
        : (matchedN2 +
          (matchedN2 === 1 ? " pick matched" : " picks matched") +
          " your words. The rest fit your budget: " + bandLabel + ".")));
    } else {
      box.appendChild(make("p", null, T("gift_finder_on_surface.matched_your_words") || "Six picks matched your words."));
    }
    res.picks.forEach(function (p) {
      var card = make("div", "askcard");
      card.appendChild(make("span", "cat", "\uD83C\uDF81 " + (p.category || (T("reveal.gift_idea_category_fallback") || "Gift idea"))));
      card.appendChild(make("h3", null, p.name));
      if (p.blurb) card.appendChild(make("p", null, p.blurb));
      card.appendChild(make("p", null, p.why));
      var ties = (p.interests || []).filter(function (x) { return res.heard.indexOf(x) >= 0; });
      if (ties.length) {
        card.appendChild(make("p", "whyline",
          TF("mine.ask_picked_because", { list: ties.map(askHeardLabel).join(", ") }) ||
          ("Picked because you said: " + ties.map(askHeardLabel).join(", ") + ".")));
      }
      card.appendChild(make("p", "spec", p.spec));
      box.appendChild(card);
    });
    box.appendChild(make("p", "hint", res.heard.length
      ? (T("gift_finder_on_surface.like_these_hint") || "Like these picks? Set that interest on their row above. Their private link will carry picks like these.")
      : (T("gift_finder_on_surface.or_pick_interest_hint") || "Or pick an interest on their row above. Their private link will carry picks for it.")));
    box.hidden = false;
    trackAskAnswered(res.picks.length);
  }
  function isSecrecyAsk(text) {
    /* SPEC-2 secrecy guard (Nov 1, 2026; broadened same day in the
       re-fix lane after an independent cold QA failed the first
       version on fresh phrasings): a secrecy-shaped ask is not a
       gift ask. It gets the site's own secret-keeping lines (the
       FAQ / organizer page wording), never gift picks, and never
       any match. Checked before the matcher, and before any load:
       the answer needs no bank and reveals nothing. Patterns aim
       at assignment-identity intent (who holds a name, peeking,
       printing or listing pairings, lost-link reveals), not at
       ordinary gift asks about a person's interests. */
    var t = String(text || "").toLowerCase();
    var pats = [
      /who got whom/, /who got who\b/,
      /who drew (?!the short straw)/, /who drew whom/, /who draws names/,
      /who picked my name/, /who has my name/, /who got my name/,
      /who is buying/, /who's buying/, /who bought for me/,
      /who (bought|buys|purchased|purchases) (((a|the) (gift|present)|one|something) )?for me/,
      /who got ((a|the) (gift|present) )?for me/,
      /who(?: is|'s) [a-z]+'s (secret )?santa/,
      /who(?: is|'s| iz) [a-z]+'?s (secret santa|santa|gift giver|giver)/,
      /(who|who's|whos) (is|iz) [a-z]+ (secret )?santa/,
      /(tell me|name|show me|reveal) [a-z]+'?s (secret santa|santa|gift giver|giver)/,
      /name the person (buying|giving|drawing|shopping|assigned)/,
      /whose name (did|does|has|was)/,
      /(let me see|lemme see) who/,
      /which (person|one|coworker|colleague|friend|teammate|member) (drew|got|picked|has|bought)/,
      /who('s| is| was) giving/,
      /who (was|is|got) assigned to (buy|get|give|shop)/,
      /who will [a-z]+ be (buying|giving|shopping)/,
      /who bought [a-z]+'s (gift|present)/,
      /pairing for [a-z]+/,
      /who ended up with/, /which (person|one) (drew|got|picked|has)/,
      /who will (give|buy|be giving|be buying)/,
      /who (purchased|purchases)/, /who('s| is) shopping for/,
      /buying (a gift |one )?for me/,
      /who is my (secret )?santa/, /who's my (secret )?santa/,
      /who is my match/, /who matched/,
      /who (did|does) [a-z ]{0,30}?(draw|drew|get|got|pick|picked|buy|bought|pull|pulled)/,
      /tell me who (got|drew|picked|is|has|matched|bought|buy)/,
      /show me who/, /match list/, /list of (all )?(the )?matches/,
      /all (the )?matches/, /everyone's match/,
      /every pairing/, /all (the )?pairings/,
      /the (whole |full )?draw (result|results|pairings|matches)/,
      /(organizer|organiser|host) (see|know|peek|check)/,
      /(organizer|organiser|host)[^.?!]{0,40}\b(see|peek|know|check|view|list|reveal|show)\b/,
      /can [a-z ]{0,20}see who/,
      /(reveal|show|list|print|display|give me|let me see)[^.?!]{0,40}\b(matches|match list|pairings|pairing|assignments|assignment)\b/,
      /(i set (this|it) up|i ran the draw|i organized|i organised)[^.?!]{0,60}\b(see|show|reveal|list|know|view)\b/,
      /lost (the |my )?links?[^.?!]{0,60}\b(who|pairing|match|drew|reveal)\b/,
      /whisper[^.?!]{0,40}\b(match|matches|name|who|pairing)\b/,
      /decode[^.?!]{0,40}\b(link|token|match)\b/,
      /list everyone/, /who they (bought|drew|got)/,
      /* Round 4 (Addendum 1076): assignment-identity intent in the
         next ring out -- confirmation oracles (a yes/no answer would
         leak a pairing), reverse-direction asks, pull/pair/buyer
         framings, partial reveals, lost-link content, tense and
         typo siblings. Keyed on the intent, not the literal strings. */
      /\bdid (?!everyone\b|everybody\b|someone\b|anyone\b|you\b|we\b|they\b|he\b|she\b|it\b)[a-z]+ (draw|drew|get|got|pick|picked|buy|bought|pull|pulled) (?!everyone\b|everybody\b|someone\b|anyone\b|the\b|a\b|an\b|my\b)[a-z]+\b/,
      /\bis [a-z]+ (buying|shopping|giving) for [a-z]+\b/,
      /confirm[^.?!]{0,60}\b(santa|match|pairing|drew|draw|pair)\b/,
      /will you tell me if/, /tell me if i (am|'m) right/,
      /guess[^.?!]{0,80}\b(tell me if|am i right|i am right|i'm right)\b/,
      /first letter of/,
      /\b(first|last) (letter|initial) of[^.?!]{0,40}\b(santa|name|match)\b/,
      /whose (secret )?santa\b/, /whose (match|name) is\b/,
      /what name did [a-z]+ pull/, /\bname\b[^.?!]{0,24}\bpulled\b/,
      /\bpulled\b[^.?!]{0,30}\b(hat|name|draw)\b/,
      /\bpaired with\b/,
      /who (will be|was) [a-z]+'?s (secret santa|santa|gift giver|giver|buyer|match)/,
      /\b[a-z]+'s buyer\b/,
      /(show|reveal|tell|name)[^.?!]{0,40}[a-z]+'s match\b/,
      /\bjust [a-z]+'s match\b/,
      /the person (shopping|buying|giving) for [a-z]+/,
      /lost[^.?!]{0,30}\blinks?\b[^.?!]{0,60}\b(name|inside|who|match|pairing)\b/,
      /(who|whos|who's) (is|iz) [a-z]+ s (secre\w+ )?santa/,
      /(who|whos|who's|tell|name|show|reveal)[^.?!]{0,50}\bsecre\w{2,}\s+santa\b/
    ];
    for (var i = 0; i < pats.length; i++) { if (pats[i].test(t)) return true; }
    /* "Who got <a name>?" (Addendum 896): the word after "got" --
       past one my/the/a/an -- is a person's name, not the start
       of a gift-idea ask. The stop list keeps ordinary asks
       safe: gift words and adjectives ("who got the best gift
       ideas"), pronouns and relative clauses ("my grandma who
       got me into baking"), and prepositions. */
    var gm = t.match(/who got (?:my |the |a |an )?([a-z]+)/);
    if (gm && !/^(the|a|an|best|good|great|top|perfect|cool|nice|cheap|awesome|amazing|fun|right|same|real|big|little|small|me|my|us|you|it|this|that|them|him|her|his|their|our|your|he|she|we|they|who|whom|everyone|everybody|someone|somebody|anyone|anybody|nobody|gift|gifts|present|presents|idea|ideas|something|anything|nothing|everything|into|in|on|at|to|for|with|from|over|about|music|playlist|bargain|baby|new|just|snacks)$/.test(gm[1])) return true;
    /* "Who picked / has <a name>?" (Addendum 902): the same name
       check for the other assignment verbs. "Who picked Elena?"
       and "who has Tomas?" ask who holds a name; the stop list
       keeps ordinary asks safe ("who has the best gift ideas",
       "who picked a gift for grandma", "who has everything"). */
    var pm = t.match(/who (?:picked|has) (?:my |the |a |an )?([a-z]+)/);
    if (pm && !/^(the|a|an|best|good|great|top|perfect|cool|nice|cheap|awesome|amazing|fun|right|same|real|big|little|small|me|my|us|you|it|this|that|them|him|her|his|their|our|your|he|she|we|they|who|whom|everyone|everybody|someone|somebody|anyone|anybody|nobody|gift|gifts|present|presents|idea|ideas|something|anything|nothing|everything|into|in|on|at|to|for|with|from|over|about|name|up|out|off|music|playlist|bargain|baby|new|just|snacks)$/.test(pm[1])) return true;
    /* "Who had <a name>?" (Addendum 906): the same name check for
       the past-tense hold verb. "Who had Ingrid in the draw?"
       asks who held a name; the stop list keeps ordinary asks
       safe ("who had the best gift ideas"). */
    var hm = t.match(/who (?:had|has had) (?:my |the |a |an )?([a-z]+)/);
    if (hm && !/^(the|a|an|best|good|great|top|perfect|cool|nice|cheap|awesome|amazing|fun|right|same|real|big|little|small|me|my|us|you|it|this|that|them|him|her|his|their|our|your|he|she|we|they|who|whom|everyone|everybody|someone|somebody|anyone|anybody|nobody|gift|gifts|present|presents|idea|ideas|something|anything|nothing|everything|into|in|on|at|to|for|with|from|over|about|name|up|out|off|music|playlist|bargain|baby|new|just|snacks)$/.test(hm[1])) return true;
    /* Reversed santa-for (Addendum 906): "secret santa for
       <name>" with a who/tell/name framing asks whose name that
       person holds -- the same intent as "<name>'s santa",
       reversed. The framing word keeps gift asks that merely
       mention a santa-for context safe. */
    if (/\bsanta for [a-z]+/.test(t) && /(who|whos|who's|tell|name|which|is it)/.test(t)) return true;
    if (/reveal/.test(t) && /(match|who|all|list|draw|pairing)/.test(t)) return true;
    if (/print/.test(t) && /(draw|pairing|match|giver|receiver)/.test(t)) return true;
    if (/peek/.test(t) && /(match|draw|assign|pairing|who|result|list|them|every)/.test(t)) return true;
    return false;
  }
  function renderAskSecrecy() {
    var box = el("askResults");
    box.innerHTML = "";
    box.appendChild(make("p", "summaryline", T("mine.ask_secret_title") || "Matches stay secret."));
    box.appendChild(make("p", null,
      T("mine.ask_secret_1") || "Your screen shows names and links only. It never shows the matches."));
    box.appendChild(make("p", null,
      T("mine.ask_secret_2") || "Each match is shown only through its own private link."));
    box.appendChild(make("p", null,
      T("mine.ask_secret_3") || "Your device saves every link, so what keeps it secret is that you do not peek: a link is hidden from plain sight, not locked."));
    box.appendChild(make("p", "hint",
      T("mine.ask_secret_hint") || "Open your own private link to see just your match."));
    box.hidden = false;
    trackAskAnswered(0);
  }
  function runAsk() {
    if (isSecrecyAsk(el("askWords").value)) { renderAskSecrecy(); return; }
    var band = el("askBand").value;
    var res = CORE.matchByWords(BANK, band, el("askWords").value);
    renderAskResults(res, band);
  }
  function initAsk() {
    el("askGo").addEventListener("click", runAsk);
    el("askWords").addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); runAsk(); }
    });
    Array.prototype.forEach.call(document.querySelectorAll(".askchip"), function (chip) {
      chip.addEventListener("click", function () {
        el("askWords").value = chip.textContent;
        runAsk();
      });
    });
    var door = el("askDoor");
    if (door) {
      door.addEventListener("click", function () {
        showStep(2);
        setTimeout(function () { el("askWords").focus({ preventScroll: true }); }, 400);
      });
    }
  }

  /* Step 3 — keep-apart rules, guided (R2-1 restrictions build,
     Nov 1, 2026; the steal is Elfster's Draw Restrictions
     screen). The old screen made the organizer invent the rules
     pair by pair: an "+ Add a pair" tap plus two dropdown hunts
     per pair, five taps a pair, and the rows reset every time
     the step was entered. This screen works the way Elfster's
     does: tap a person, then tap everyone they must not draw.
     Rules come from four places, all on this device, all
     feeding the one pair set the draw has always honored:
       - hand taps on the per-person checklist,
       - the Couples apart preset (tap the two people),
       - Last year's pairs (the same tap-two-names way — a typed
         field standing in for the account history Elfster uses),
       - Kids and adults apart: tag the kids once, and the cross
         pairs are computed live from the tags, so fixing a tag
         fixes the pairs.
     A pair set two ways is still one pair. readPairs() returns
     the union as [rowId, rowId] rows; doDraw, core, the tokens,
     and the sealed receipt see exactly what they saw before. */
  function pairKey(a, b) { return a < b ? a + ":" + b : b + ":" + a; }
  function splitKey(k) { return k.split(":").map(Number); }

  function personByRow(rowId) {
    for (var i = 0; i < state.people.length; i++) {
      if (state.people[i].rowId === rowId) return state.people[i];
    }
    return null;
  }

  function dropPersonRestrictions(rowId) {
    [state.apart, state.couplePairs, state.lastPairs].forEach(function (set) {
      Array.from(set).forEach(function (k) {
        var ab = splitKey(k);
        if (ab[0] === rowId || ab[1] === rowId) set.delete(k);
      });
    });
    state.kidRows.delete(rowId);
    if (state.restrictPerson === rowId) state.restrictPerson = null;
    state.captureSel = state.captureSel.filter(function (id) { return id !== rowId; });
  }

  function apartHas(a, b) {
    var k = pairKey(a, b);
    return state.apart.has(k) || state.couplePairs.has(k) ||
      state.lastPairs.has(k) ||
      (state.kidsApart && state.kidRows.has(a) !== state.kidRows.has(b));
  }

  function readPairs() {
    var keys = Object.create(null);
    [state.apart, state.couplePairs, state.lastPairs].forEach(function (set) {
      set.forEach(function (k) { keys[k] = true; });
    });
    if (state.kidsApart) {
      state.people.forEach(function (p) {
        state.people.forEach(function (q) {
          if (p.rowId < q.rowId &&
              state.kidRows.has(p.rowId) !== state.kidRows.has(q.rowId)) {
            keys[pairKey(p.rowId, q.rowId)] = true;
          }
        });
      });
    }
    return Object.keys(keys).map(splitKey);
  }

  function buildPairRows() {
    // Name kept for the two step-2 call sites: entering step 3
    // now renders the guided screen from the saved rule state
    // instead of wiping it — going back to fix a name no longer
    // costs the organizer their rules.
    renderRestrictions();
  }

  function onRestrictNameTap(rowId) {
    if (state.capture === "couple" || state.capture === "lastyear") {
      var i = state.captureSel.indexOf(rowId);
      if (i !== -1) state.captureSel.splice(i, 1);
      else {
        state.captureSel.push(rowId);
        if (state.captureSel.length === 2) {
          var set = state.capture === "couple" ? state.couplePairs : state.lastPairs;
          set.add(pairKey(state.captureSel[0], state.captureSel[1]));
          state.captureSel = [];
        }
      }
    } else if (state.capture === "kids") {
      if (state.kidRows.has(rowId)) state.kidRows.delete(rowId);
      else state.kidRows.add(rowId);
    } else {
      state.restrictPerson = rowId;
    }
    renderRestrictions();
  }

  function toggleApart(a, b) {
    var k = pairKey(a, b);
    var wasOn = apartHas(a, b);
    state.apart.delete(k); state.couplePairs.delete(k); state.lastPairs.delete(k);
    var note = el("restrictNote");
    if (!wasOn) {
      state.apart.add(k);
      if (note) note.hidden = true;
    } else if (apartHas(a, b)) {
      // Still on, and only the kids preset can be holding it:
      // say so instead of letting the tap look broken.
      if (note) {
        note.textContent = T("step3.pair_conflict_kids_note") || "That pair is kept apart by Kids and adults apart. Change it with that button below.";
        note.hidden = false;
      }
    } else if (note) {
      note.hidden = true;
    }
    renderRestrictions();
  }

  function renderRestrictions() {
    var people = state.people;
    if (!personByRow(state.restrictPerson) && people.length) {
      state.restrictPerson = people[0].rowId;
    }
    var chips = el("restrictPeople");
    chips.innerHTML = "";
    people.forEach(function (p) {
      var label = p.name;
      var pressed;
      if (state.capture === "kids") {
        pressed = state.kidRows.has(p.rowId);
        if (pressed) label += (T("mine.kid_suffix") || " (kid)");
      } else if (state.capture) {
        pressed = state.captureSel.indexOf(p.rowId) !== -1;
      } else {
        pressed = state.restrictPerson === p.rowId;
        if (state.kidRows.has(p.rowId)) label += (T("mine.kid_suffix") || " (kid)");
      }
      var c = make("button", "chip", label);
      c.type = "button";
      c.setAttribute("aria-pressed", pressed ? "true" : "false");
      c.addEventListener("click", function () { onRestrictNameTap(p.rowId); });
      chips.appendChild(c);
    });
    el("restrictMain").hidden = !!state.capture;
    el("modePanel").hidden = !state.capture;
    if (state.capture) renderModePanel(); else renderRestrictMain();
    updateRestrictSummary();
    updateFourPairNote();
    updateSmallDrawNote();
  }

  function renderRestrictMain() {
    var sel = personByRow(state.restrictPerson);
    var list = el("restrictList");
    list.innerHTML = "";
    if (!sel) { el("restrictForLabel").textContent = ""; return; }
    el("restrictForLabel").textContent = TF("step3.must_not_draw", { name: sel.name }) ||
      (sel.name + " must not draw:");
    state.people.forEach(function (p) {
      if (p.rowId === sel.rowId) return;
      var on = apartHas(sel.rowId, p.rowId);
      var c = make("button", "chip", p.name);
      c.type = "button";
      c.setAttribute("aria-pressed", on ? "true" : "false");
      c.addEventListener("click", function () { toggleApart(sel.rowId, p.rowId); });
      list.appendChild(c);
    });
  }

  function renderModePanel() {
    var title = el("modeTitle"), text = el("modeText"), acts = el("modeActions");
    acts.innerHTML = "";
    function doneBtn(label) {
      var b = make("button", "secondary", label || (T("mine.done") || "Done"));
      b.type = "button";
      b.addEventListener("click", function () {
        state.capture = null; state.captureSel = [];
        renderRestrictions();
      });
      return b;
    }
    if (state.capture === "couple" || state.capture === "lastyear") {
      var couple = state.capture === "couple";
      title.textContent = couple
        ? (T("step3.couples_apart") || "Couples apart")
        : (T("step3.last_year_pairs") || "Last year's pairs");
      text.textContent = state.captureSel.length === 0
        ? (couple ? (T("step3.couples_apart_help_first") || "Tap the first person in a couple.")
                  : (T("step3.last_year_help_first") || "Tap the first of two people who drew each other last year."))
        : (T("step3.now_tap_other") || "Now tap the other person. The pair is kept apart.");
      acts.appendChild(doneBtn());
    } else if (state.capture === "kids") {
      title.textContent = T("step3.kids_adults_apart") || "Kids and adults apart";
      var kids = state.kidRows.size;
      var adults = state.people.length - kids;
      text.textContent = state.kidsApart
        ? (T("step3.kids_adults_on") || "On: no kid draws an adult, and no adult draws a kid. Tap a name to fix a tag.")
        : (T("step3.kids_adults_help") || "Tap every kid. Everyone not tapped counts as an adult.");
      var apply = make("button", "secondary",
        state.kidsApart
          ? (T("mine.kids_off") || "Turn off kids and adults apart")
          : (T("mine.kids_on") || "Keep kids and adults apart"));
      apply.type = "button";
      if (!state.kidsApart && (kids === 0 || adults === 0)) {
        apply.disabled = true;
        if (kids === 0) {
          text.textContent += T("mine.tag_kid_first") || " Tag at least one kid first.";
        } else {
          text.textContent += " " + (T("step3.kids_adults_all_kids_error") ||
            "Every name is tagged as a kid, leave one adult untagged.");
        }
      }
      apply.addEventListener("click", function () {
        state.kidsApart = !state.kidsApart;
        renderRestrictions();
      });
      acts.appendChild(apply);
      acts.appendChild(doneBtn());
    }
  }

  function updateRestrictSummary() {
    var pairs = readPairs();
    el("restrictCount").textContent = pairs.length === 0
      ? (T("step3.pairs_count_none") || "No pairs are kept apart.")
      : (TP("step3.pairs_count", pairs.length, { n: pairs.length }) ||
        (pairs.length + (pairs.length === 1 ? " pair is" : " pairs are") + " kept apart."));
    var box = el("pairChips");
    box.innerHTML = "";
    function chipFor(k, label) {
      var ab = splitKey(k);
      var a = personByRow(ab[0]), b = personByRow(ab[1]);
      if (!a || !b) return;
      var chip = make("span", "pairchip");
      chip.appendChild(document.createTextNode(
        a.name + " + " + b.name + (label ? " · " + label : "")));
      var x = make("button", "pairx", "×");
      x.type = "button";
      x.setAttribute("aria-label",
        TF("step3.remove_pair_aria", { a: a.name, b: b.name }) ||
        ("Remove the keep-apart rule for " + a.name + " and " + b.name));
      x.addEventListener("click", function () {
        state.apart.delete(k); state.couplePairs.delete(k); state.lastPairs.delete(k);
        renderRestrictions();
      });
      chip.appendChild(x);
      box.appendChild(chip);
    }
    state.apart.forEach(function (k) { chipFor(k, ""); });
    state.couplePairs.forEach(function (k) { if (!state.apart.has(k)) chipFor(k, T("mine.chip_couple") || "couple"); });
    state.lastPairs.forEach(function (k) {
      if (!state.apart.has(k) && !state.couplePairs.has(k)) chipFor(k, T("mine.chip_lastyear") || "last year");
    });
    var kl = el("kidsLine");
    if (state.kidsApart && state.kidRows.size &&
        state.kidRows.size < state.people.length) {
      var cross = state.kidRows.size * (state.people.length - state.kidRows.size);
      kl.textContent = TF("step3.kids_adults_adds", { n: cross }) ||
        ("Kids and adults apart adds " + cross +
          (cross === 1 ? " pair" : " pairs") + ".");
      kl.hidden = false;
    } else {
      kl.hidden = true;
    }
  }

  /* SEC-2 (Oct 29, 2026): with 4 people and at least one
     keep-apart pair, one match always gives away another
     (brute-force proven). Show the honesty note on the pairs
     step as soon as that setup exists. */
  function updateFourPairNote() {
    var note = el("fourPairNote");
    if (!note) return;
    var hasPair = false;
    try { hasPair = readPairs().length >= 1; } catch (e) { hasPair = false; }
    note.hidden = !(state.people && state.people.length === 4 && hasPair);
  }

  /* SPEC-01 (Nov 9, 2026, cold-QA): at n=3 ANY keep-apart pair
     makes a fair draw impossible (each of the pair can pick only
     the one remaining name, and both cannot have it). The engine
     correctly returns null, but the old flow explained that only
     after a failed draw, as a bare "no fair draw" with no why.
     Say it on the pairs step, as soon as the setup exists, in the
     same shape as the four-pair note above. */
  function updateSmallDrawNote() {
    var note = el("smallDrawNote");
    if (!note) return;
    var hasPair = false;
    try { hasPair = readPairs().length >= 1; } catch (e) { hasPair = false; }
    note.hidden = !(state.people && state.people.length === 3 && hasPair);
  }

  function initStep3() {
    function startCapture(mode) {
      state.capture = state.capture === mode ? null : mode;
      state.captureSel = [];
      renderRestrictions();
    }
    el("presetCouples").addEventListener("click", function () { startCapture("couple"); });
    el("presetLastYear").addEventListener("click", function () { startCapture("lastyear"); });
    el("presetKids").addEventListener("click", function () { startCapture("kids"); });
    el("clearRestrict").addEventListener("click", function () {
      state.apart.clear(); state.couplePairs.clear(); state.lastPairs.clear();
      state.kidRows.clear(); state.kidsApart = false; state.captureSel = [];
      var note = el("restrictNote");
      if (note) note.hidden = true;
      renderRestrictions();
    });
    el("back2").addEventListener("click", function () { showStep(2); });
    el("drawBtn").addEventListener("click", doDraw);
    // SPEC-SS-COLDQA-02 (Nov 9, 2026): the step-4 "Copy a message for
    // the whole group" button is gone — it was a second copy action for
    // the same job as the "For the group chat" card above it, which is
    // now the one group-message copy on this screen.

    el("redraw").addEventListener("click", doDraw);
    el("startOver").addEventListener("click", function () {
      window.location.hash = "";
      window.location.reload();
    });
  }

  function showErr(id, msg) { var e = el(id); e.textContent = msg; e.hidden = false; }
  function hideErr(id) { el(id).hidden = true; }

  /* DUPE-LINK fix (Oct 29, 2026). Two people who share a name
     can be dealt a token that reads you === got, and parseToken
     rejects every such token (ADV-7), so that person's private
     link can never open. Enforce the step-2 hint at draw time:
     when two roster names are the same after the site's own
     cleaning (cleanName strips invisible characters, then trim
     and case-fold), do not draw at all. The organizer is sent
     back to the names step with a plain error that names the
     problem and the fix. parseToken's you === got rejection
     stays (it guards the forgery surface), drawGroup is not
     changed, and the share screen's duplicate warning in
     renderShare stays as a backstop. */
  function hasDuplicateNames(people) {
    // SEC-1 fix (Oct 29, 2026): the seen-set must not inherit
    // Object.prototype — a plain {} reads "constructor" and
    // "__proto__" as truthy before anything is stored, so a
    // person with one of those names was falsely blocked as a
    // duplicate. A null-prototype object has no inherited keys.
    var seen = Object.create(null);
    for (var i = 0; i < people.length; i++) {
      var k = cleanName(people[i].name).trim().toLowerCase();
      if (!k) continue;
      if (seen[k]) return true;
      seen[k] = true;
    }
    return false;
  }

  /* Draw counting (Oct 31, 2026, Dim 5/12 SPEC items 1+2):
     the fleet taxonomy for the draw itself. tool_start fires
     once per draw attempt that passes the duplicate-name gate
     and engages the draw engine; tool_complete fires only when
     a draw succeeds. Both payloads are counts only — the tool
     name, a short entry word, and a headcount number. They never
     hold a name, a match, a gift pick, a link, or any part of a
     token. fleetTrack is defined by the fleet block in
     index.html; when it is absent (test pages), this is a no-op. */
  /* Entry word for draw counting (SPEC-SS-LOOP-2, Oct 31, 2026;
     group branch Nov 7, 2026, santa-loop #2): the ?via kind word
     in this page's own address — "own" from a reveal page's
     hand-back link, "group" from the group-chat announcement's
     seed line — or "draw" for a plain landing. One of three
     fixed words; nothing else in the address is ever read. The
     same word rides tool_complete, so a recipient- or group-
     started draw is attributable end to end: arrival, start,
     completion. */
  /* SPEC-SS-MEASURE-01..05 (Nov 7, 2026): measurement helpers.
     Buckets and fixed enums only — the same group-size buckets
     draw_created has always used, and the start-source words
     that carry hand-back / run-it-back attribution from the
     landing that consumed a prefill stash to the draw itself
     (sessionStorage, this tab only, never sent anywhere but
     as the enum itself on the draw's own count events). */
  function groupSizeBucket(n) {
    return n <= 5 ? "3-5" : n <= 10 ? "6-10" : n <= 20 ? "11-20" : "21+";
  }
  var START_SOURCES = ["handback-roster", "handback-pair", "handback-roster-remote", "manage-runback", "saved-runback", "manage-another-group"];
  function startSource() {
    try {
      var s = sessionStorage.getItem("ss_start_source");
      if (s && START_SOURCES.indexOf(s) !== -1) return s;
    } catch (e) {}
    return "direct";
  }
  function setStartSource(s) {
    try { sessionStorage.setItem("ss_start_source", s); } catch (e) {}
  }
  function drawEntryWord() {
    try {
      var v = new URLSearchParams(location.search).get("via");
      if (v === "own") return "own-draw";
      if (v === "group") return "group";
    } catch (e) {}
    return "draw";
  }
  function trackDrawStart(count) {
    try {
      if (typeof fleetTrack === "function") {
        /* Entry attribution (Oct 31, 2026, SPEC-SS-LOOP-2): a
           visitor who landed from a reveal page's "Start your
           own draw" link carries ?via=own in this page's own
           address — a kind word the reveal page put there, with
           no name, match, or token part. Their draw counts with
           entry "own-draw" instead of "draw", so a recipient who
           becomes an organizer is visible in the counts end to
           end. The value is one of two fixed words, read from
           this page's query only; nothing else in the address
           is ever read or sent. */
        fleetTrack("tool_start", { tool: "secret-santa", entry: drawEntryWord(), people_count: count, start_source: startSource(), names_mode: namesModeWord() });
      }
    } catch (e) {}
  }
  function trackDrawComplete(count) {
    try {
      if (typeof fleetTrack === "function") {
        fleetTrack("tool_complete", mergeProps({ tool: "secret-santa", entry: drawEntryWord(), results_count: count, start_source: startSource(), names_mode: namesModeWord() }, drawIdProps()));
      }
    } catch (e) {}
  }
  function trackRevealOpened() {
    // Measurement (Sprint Lane 1, Oct 31, 2026): the Peek tap is the
    // moment a recipient actually sees their match. Arrival alone
    // (share_arrival) cannot tell a landed page from a seen match.
    // Counts only: no name, no token, nothing about the match.
    try {
      if (typeof fleetTrack === "function") {
        fleetTrack("reveal_opened", mergeProps({ tool: "secret-santa", link_source: revealLinkSource || "share-link" }, drawIdProps()));
      }
    } catch (e) {}
  }
  function trackArtifact() {
    try {
      if (typeof fleetTrack === "function") {
        fleetTrack("artifact_created", mergeProps({ tool: "secret-santa", artifact: "match-card" }, drawIdProps()));
      }
    } catch (e) {}
  }
  function trackReceiptImage() {
    try {
      if (typeof fleetTrack === "function") {
        fleetTrack("artifact_created", mergeProps({ tool: "secret-santa", artifact: "sealed-receipt" }, drawIdProps()));
      }
    } catch (e) {}
  }

  /* ---------- Draw sealed receipt + on-device resend list ----------
     SS-SEALED-1 (Oct 31, 2026, Wave H top fix). The organizer's
     two pains were recovery and proof: links lived only in the
     open tab, and nothing proved the draw was fair without
     showing matches. After a draw, this browser saves ONE
     record on this device only (localStorage "ss_draw_v1"):
     the group, budget, date, the roster names, how many
     keep-apart pairs were honored, and each person's private
     link. Nothing is sent anywhere; our server never sees it.
     The record lets the organizer resend a lost link after
     closing the tab, and it renders a shareable "draw done"
     receipt — group, date, names, budget, pairs honored — that
     carries NO matches and NO links, so it is safe to post to
     the whole group. Secrecy rules for every surface here:
     a stored token is only ever shown as its owner's link
     (exactly like the share cards); it is never decoded for
     display, and the receipt builder never reads the links
     at all, so no receipt can carry a match. Loading validates
     the record strictly (shape, roster == link owners, every
     token parses and names the same group and budget); any
     failed check treats the record as absent. */
  var DRAW_KEY = "ss_draw_v1";
  var MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  function todayISO() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function dateLabel(iso) {
    var parts = String(iso || "").split("-");
    if (parts.length !== 3) return "";
    if (LANG === "es" && window.SS_ES_MONTHS) {
      return Number(parts[2]) + " de " + window.SS_ES_MONTHS[Number(parts[1]) - 1] + " de " + parts[0];
    }
    return MONTHS[Number(parts[1]) - 1] + " " + Number(parts[2]) + ", " + parts[0];
  }
  function exclusionsLine(rec) {
    if (rec.pairs > 0) {
      var es = rec.pairs === 1
        ? T("receipt.pairs_honored_one")
        : TF("receipt.pairs_honored_many", { n: rec.pairs });
      if (es) return es;
      return rec.pairs + (rec.pairs === 1 ? " pair" : " pairs") +
        " kept apart. Every pair was honored.";
    }
    return T("receipt.pairs_none") || "No pairs were kept apart.";
  }
  function receiptText(rec) {
    return [
      T("receipt.title_line") || "Pick My Secret Santa, draw done",
      TF("receipt.group_line", { group: rec.group }) || ("Group: " + rec.group),
      TF("receipt.drawn_on", { date: dateLabel(rec.date) }) || ("Drawn on " + dateLabel(rec.date) + "."),
      TF("receipt.people_line", { n: rec.names.length, names: rec.names.join(", ") }) ||
        (rec.names.length + " people: " + rec.names.join(", ") + "."),
      TF("receipt.budget_line", { budget: bandDisplay(rec.budget) }) || ("Budget: " + rec.budget + "."),
      exclusionsLine(rec),
      T("receipt.no_self_draw") || "No one drew their own name.",
      T("receipt.shows_no_matches") || "This receipt shows no matches.",
      T("receipt.each_match_in_link") || "Each match is shown only through its own private link.",
      T("receipt.run_your_own") || "Run your own draw at pickmysecretsanta.com, free, no sign-up."
    ].join("\n");
  }
  function saveDrawRecord(rec) {
    try { localStorage.setItem(DRAW_KEY, JSON.stringify(rec)); } catch (e) {}
  }
  function clearDrawRecord() {
    try { localStorage.removeItem(DRAW_KEY); } catch (e) {}
  }
  function loadDrawRecord() {
    try {
      var raw = localStorage.getItem(DRAW_KEY);
      if (!raw) return null;
      var rec = JSON.parse(raw);
      if (!rec || typeof rec !== "object" || rec.v !== 1) return null;
      if (typeof rec.group !== "string" || !rec.group.length || rec.group.length > 40) return null;
      if (BANDS.map(function (b) { return b.label; }).indexOf(rec.budget) === -1) return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rec.date || "")) return null;
      if (!Array.isArray(rec.names) || rec.names.length < 3 || rec.names.length > MAX_PEOPLE) return null;
      for (var i = 0; i < rec.names.length; i++) {
        if (typeof rec.names[i] !== "string" || !rec.names[i].length || rec.names[i].length > 40) return null;
      }
      // Pair count cap is the full matrix, n*(n-1)/2 — the
      // guided restrictions screen (R2-1) can honestly set more
      // pairs than there are people (the kids preset alone can),
      // and the old cap of names.length silently voided those
      // records on the next visit.
      if (typeof rec.pairs !== "number" || rec.pairs < 0 ||
          rec.pairs > (rec.names.length * (rec.names.length - 1)) / 2) return null;
      if (!Array.isArray(rec.links) || rec.links.length !== rec.names.length) return null;
      for (var j = 0; j < rec.links.length; j++) {
        var link = rec.links[j];
        if (!link || link.for !== rec.names[j]) return null;
        if (typeof link.token !== "string" || link.token.length > 2048) return null;
        var payload = CORE.parseToken(link.token);
        if (!payload) return null;
        if (payload.you !== link.for || payload.g !== rec.group || payload.b !== rec.budget) return null;
      }
      // Progress-strip marks (LANE G): sanitize, never reject —
      // a bad mark must not brick the resend list. Keep only
      // names on the roster, at most once each.
      if (Array.isArray(rec.sent)) {
        var cleanSent = [];
        rec.sent.forEach(function (s) {
          if (typeof s === "string" && rec.names.indexOf(s) !== -1 && cleanSent.indexOf(s) === -1) {
            cleanSent.push(s);
          }
        });
        rec.sent = cleanSent;
      } else {
        rec.sent = [];
      }
      // Wishlist notes (R2-2): sanitize, never reject — keep
      // only notes for people on the roster, cleaned and capped
      // the same way they were at entry.
      if (rec.wish && typeof rec.wish === "object" && !Array.isArray(rec.wish)) {
        var cleanWishMap = Object.create(null);
        Object.keys(rec.wish).forEach(function (nm) {
          if (rec.names.indexOf(nm) !== -1 && typeof rec.wish[nm] === "string") {
            var w = cleanWish(rec.wish[nm]);
            if (w) cleanWishMap[nm] = w;
          }
        });
        rec.wish = cleanWishMap;
      } else {
        rec.wish = Object.create(null);
      }
      // Organizer progress codes (Nov 7, 2026): an OPTIONAL
      // field, sanitized and never a reject reason, exactly
      // like `sent` and `wish` above. Kept only when the
      // draw code is well-formed and every person in the
      // draw has exactly one well-formed code; anything
      // else and the record simply has no progress view.
      if (rec.trk && typeof rec.trk === "object" && !Array.isArray(rec.trk)) {
        var trkOk = typeof rec.trk.d === "string" && /^[a-f0-9]{16}$/.test(rec.trk.d) &&
          rec.trk.keys && typeof rec.trk.keys === "object" && !Array.isArray(rec.trk.keys);
        var cleanKeys = Object.create(null);
        if (trkOk) {
          Object.keys(rec.trk.keys).forEach(function (nm) {
            var v = rec.trk.keys[nm];
            if (rec.names.indexOf(nm) !== -1 && typeof v === "string" && /^[a-f0-9]{12}$/.test(v)) {
              cleanKeys[nm] = v;
            } else trkOk = false;
          });
          if (Object.keys(cleanKeys).length !== rec.names.length) trkOk = false;
        }
        if (trkOk) rec.trk = { d: rec.trk.d, keys: cleanKeys };
        else delete rec.trk;
      } else {
        delete rec.trk;
      }
      // Short-link codes (Nov 7, 2026): an OPTIONAL field,
      // sanitized and never a reject reason, exactly like
      // trk above. Kept only when every person in the draw
      // has exactly one well-formed code; the manage code
      // rides along only if it is well-formed too. Anything
      // else and the record simply falls back to long links.
      if (rec.sl && typeof rec.sl === "object" && !Array.isArray(rec.sl)) {
        var slOk = rec.sl.codes && typeof rec.sl.codes === "object" && !Array.isArray(rec.sl.codes);
        var cleanCodes = Object.create(null);
        if (slOk) {
          Object.keys(rec.sl.codes).forEach(function (nm) {
            var v = rec.sl.codes[nm];
            if (rec.names.indexOf(nm) !== -1 && typeof v === "string" && /^[A-Za-z0-9]{8}$/.test(v)) {
              cleanCodes[nm] = v;
            } else slOk = false;
          });
          if (Object.keys(cleanCodes).length !== rec.names.length) slOk = false;
        }
        var mCode = (typeof rec.sl.m === "string" && /^[A-Za-z0-9]{8}$/.test(rec.sl.m)) ? rec.sl.m : null;
        if (slOk) {
          rec.sl = { codes: cleanCodes };
          if (mCode) rec.sl.m = mCode;
        } else delete rec.sl;
      } else {
        delete rec.sl;
      }
      // Draw language (SPEC-SS-AMIGO-01): an OPTIONAL field,
      // sanitized and never a reject reason, exactly like sl
      // above. Kept only when it is the one value this build
      // mints; anything else and the record is an English draw.
      if (rec.lang !== "es") delete rec.lang;
      // Release A P0-1: draw ID, sanitize-never-reject like lang.
      if (!validDrawId(rec.did)) delete rec.did;
      return rec;
    } catch (e) {
      return null;
    }
  }

  function buildReceipt(container, rec) {
    container.innerHTML = "";
    // SPEC-SS-COLDQA-01: on the manage page the group name is already the
    // page heading, so the receipt there omits its group line (the copied
    // receipt text and the receipt picture keep the full statement).
    if (!rec.omitGroupLine) container.appendChild(make("p", "summaryline", rec.group));
    container.appendChild(make("p", null,
      TF("receipt.drawn_on", { date: dateLabel(rec.date) }) || ("Drawn on " + dateLabel(rec.date) + ".")));
    container.appendChild(make("p", null,
      TF("receipt.people_line", { n: rec.names.length, names: rec.names.join(", ") }) ||
      (rec.names.length + " people: " + rec.names.join(", ") + ".")));
    container.appendChild(make("p", null,
      TF("receipt.budget_line", { budget: bandDisplay(rec.budget) }) || ("Budget: " + rec.budget + ".")));
    container.appendChild(make("p", null, exclusionsLine(rec)));
    container.appendChild(make("p", null, T("receipt.no_self_draw") || "No one drew their own name."));
    container.appendChild(make("p", null, T("receipt.shows_no_matches") || "This receipt shows no matches."));
    var row = make("div", "btnrow");
    row.style.marginTop = "12px";
    var copyBtn = make("button", "secondary", T("receipt.copy_receipt") || "Copy receipt");
    copyBtn.type = "button";
    copyBtn.addEventListener("click", function () {
      trackShare("clipboard", "receipt");
      copyText(receiptText(rec), copyBtn, (T("share.copied") || "Copied"));
    });
    var picBtn = make("button", "secondary", T("receipt.save_receipt_picture") || "Save receipt picture");
    picBtn.type = "button";
    picBtn.addEventListener("click", function () { saveReceiptImage(rec); });
    row.appendChild(copyBtn);
    row.appendChild(picBtn);
    container.appendChild(row);
  }

  function saveReceiptImage(rec) {
    var c = document.createElement("canvas");
    c.width = 1080; c.height = 1080;
    var x = c.getContext("2d");
    x.fillStyle = "#fdf9f0"; x.fillRect(0, 0, 1080, 1080);
    x.fillStyle = "#17603c"; x.fillRect(0, 0, 1080, 210);
    x.fillStyle = "#c1272d"; x.fillRect(52, 62, 96, 76);
    x.fillStyle = "#9c1f24"; x.fillRect(46, 48, 108, 20);
    x.fillStyle = "#fdf9f0"; x.fillRect(92, 48, 16, 90);
    x.fillStyle = "#fdf9f0"; x.textAlign = "center";
    var gSize = 54;
    x.font = "800 " + gSize + "px sans-serif";
    while (x.measureText(rec.group).width > 900 && gSize > 28) {
      gSize -= 4; x.font = "800 " + gSize + "px sans-serif";
    }
    x.fillText(rec.group, 540, 100);
    x.font = "600 38px sans-serif";
    x.fillText(T("receipt.image_subtitle") || "draw done", 540, 162);
    x.fillStyle = "#2a2118";
    x.font = "600 42px sans-serif";
    x.fillText(TF("receipt.drawn_on", { date: dateLabel(rec.date) }) || ("Drawn on " + dateLabel(rec.date) + "."), 540, 300);
    x.font = "400 40px sans-serif";
    var y = wrapText(x, TF("receipt.people_line", { n: rec.names.length, names: rec.names.join(", ") }) ||
      (rec.names.length + " people: " + rec.names.join(", ") + "."),
      540, 380, 920, 54, 6);
    x.font = "600 42px sans-serif";
    x.fillText(TF("receipt.budget_line", { budget: bandDisplay(rec.budget) }) || ("Budget: " + rec.budget + "."), 540, y + 30);
    x.font = "400 40px sans-serif";
    y = wrapText(x, exclusionsLine(rec), 540, y + 110, 920, 54, 3);
    x.fillText(T("receipt.no_self_draw") || "No one drew their own name.", 540, y + 26);
    x.fillStyle = "#17603c";
    x.font = "800 46px sans-serif";
    x.fillText(T("receipt.shows_no_matches") || "This receipt shows no matches.", 540, y + 110);
    x.fillStyle = "#71634f";
    x.font = "600 34px sans-serif";
    x.fillText("Pick My Secret Santa, pickmysecretsanta.com", 540, 1010);
    x.fillStyle = "#17603c";
    x.font = "600 30px sans-serif";
    x.fillText(T("receipt.run_your_own") || "Draw your own names in secret, free, no sign-up", 540, 1052);
    var a = document.createElement("a");
    a.download = T("receipt.image_filename") || "secret-santa-draw-sealed.png";
    a.href = c.toDataURL("image/png");
    a.click();
    trackReceiptImage();
  }

  /* Group-chat announcement (santa-value lane, Nov 4, 2026):
     one ready-to-paste message for the whole group chat. It
     announces the draw and the budget, and says private links
     are coming one by one. It carries NO link and NO match:
     links stay per-person, as the flow has always worked. */
  function groupMessageText(group, band) {
    var es = group
      ? TF("messages.group_message_with_group", { group: group, budget: bandDisplay(band) })
      : TF("messages.group_message_no_group", { budget: bandDisplay(band) });
    if (es) return es;
    var head = group
      ? group + "'s Secret Santa draw is done, budget " + band + "."
      : "Our Secret Santa draw is done, budget " + band + ".";
    return head + " Watch your messages: I will send each of you a private link." +
      " Your organizer's screen shows names and links only, never the matches." +
      " Keep your link secret and do not forward it: anyone who has it can open it." +
      " Want to run one for your office or your family? Same free tool, 2 minutes, no sign-up, and the organizer's screen never shows the matches: pickmysecretsanta.com/?via=group";
  }

  function groupMessageCard(group, band) {
    var msg = groupMessageText(group, band);
    var card = make("div", "sharecard");
    card.appendChild(make("p", "who", T("messages.group_message_card_label") || "For the group chat"));
    // SPEC-SS-COLDQA-02: output text never renders as page content — the
    // card shows a short description of the message, not the message
    // itself. The full text rides the Copy button only, unchanged.
    card.appendChild(make("p", "linkready",
      T("messages.group_message_preview") || "A ready-made note for your group chat: the draw is done, and a private link is coming to each person."));
    card.appendChild(make("p", "hint",
      T("share.group_no_links") || "The group message has no match links in it."));
    var row = make("div", "row");
    var btn = make("button", "alt", T("messages.copy_group_message") || "Copy group message");
    btn.type = "button";
    btn.addEventListener("click", function () { trackShare("clipboard", "message"); copyText(msg, btn, (T("share.copied") || "Copied")); });
    row.appendChild(btn);
    // Release B: one generic group share via the native sheet. Its
    // text (groupShareText) carries NO link of any kind — per-person
    // links never travel through a group action.
    if (navigator.share) {
      var gShare = make("button", "alt", T("share.share_group") || "Share with the group");
      gShare.type = "button";
      gShare.addEventListener("click", function () {
        // Same success-only semantics as the per-person native path.
        navigator.share({ title: T("messages.share_sheet_title") || "Pick My Secret Santa", text: groupShareText(group) })
          .then(function () { trackShare("native", "native"); })
          .catch(function () {});
      });
      row.appendChild(gShare);
    }
    card.appendChild(row);
    return card;
  }

  /* Copy all (Nov 7, 2026, SPEC-SS-SIM1107-02): the draw took
     two taps and sending took ten — one block puts the whole
     set on the clipboard, one name + link per line, ready to
     paste. The lines are plain and self-labelling so a paste
     into a group chat still reads per-person; the warning line
     travels with it because a pasted block puts every link in
     one chat — each person must take only their own line, and
     the organizer should send lines privately when the group
     chat is not the right place. URLs resolve at tap time via
     shareUrl, so short links are copied once they exist. */
  function copyAllText(pairs) {
    var lines = pairs.map(function (p) { return p.name + ": " + p.url; });
    return (T("mine.copy_all_head") || "Your Secret Santa private links, take only your own line:") + "\n" +
      lines.join("\n") +
      "\n" + (T("mine.copy_all_foot") || "Each link shows only that person's match. Do not open or forward anyone else's link.");
  }
  function copyAllCard(pairs) {
    var card = make("div", "sharecard");
    card.setAttribute("data-fyg-watch", "");
    card.appendChild(make("p", "who", T("mine.send_all_title") || "Send them all at once"));
    card.appendChild(make("p", "linkready",
      T("mine.copy_all_line") || "One tap copies every name with its private link, one per line: paste it where your group can each take their own line, or send each line privately."));
    var row = make("div", "row");
    var btn = make("button", null, T("mine.copy_all_btn") || "Copy all: names + links");
    btn.type = "button";
    btn.addEventListener("click", function () {
      trackShare("clipboard", "copy_all");
      var fresh = pairs.map(function (p) {
        return { name: p.name, url: shareUrl(p.token, p.name) };
      });
      fresh.forEach(function (p) { markShared(p.name); });
      copyText(copyAllText(fresh), btn, T("mine.copied_all") || "Copied all");
    });
    row.appendChild(btn);
    card.appendChild(row);
    return card;
  }

  /* The group link card (Nov 7, 2026, SPEC-SS-MANAGE-01):
     once a draw has its manage code, both share surfaces
     gain this card. The manage address is short and meant
     to be seen — it is printed, unlike the per-person
     payload links — because bookmarking it is the point.
     It opens opens/nudges/receipt only, never a match. */
  function manageCardEl(rec) {
    if (!rec || !rec.sl || !rec.sl.m) return null;
    var url = SHORT_BASE + "/g/" + rec.sl.m;
    var card = make("div", "sharecard");
    card.setAttribute("data-fyg-watch", "");
    card.appendChild(make("p", "who", T("manage_card_on_share.label") || "Your group link"));
    card.appendChild(make("p", "linkready",
      T("manage_card_on_share.line") || "Manage this draw from any device, who has opened, nudges, the receipt:"));
    // SPEC-SS-COLDQA-03: the manage URL is copy-only now, never printed
    // as page text — same presentation as the per-person links.
    var row = make("div", "row");
    var copyBtn = make("button", null, T("manage_card_on_share.copy_manage_link") || "Copy manage link");
    copyBtn.type = "button";
    copyBtn.addEventListener("click", function () { trackShare("clipboard", "manage_link"); trackManageAction("copy-manage"); copyText(url, copyBtn, (T("share.copied") || "Copied")); });
    var openBtn = make("button", "alt", T("manage_card_on_share.open_manage_page") || "Open manage page");
    openBtn.type = "button";
    openBtn.addEventListener("click", function () { location.href = url; });
    row.appendChild(copyBtn);
    row.appendChild(openBtn);
    card.appendChild(row);
    card.appendChild(make("p", "hint",
      T("manage_card_on_share.bookmark_warning") || "Bookmark it, or save the link. Anyone with it can manage this draw: keep it like a password. It never shows the matches."));
    var remintBtn = make("button", "alt", T("manage_card_on_share.get_new_manage_link") || "Get a new manage link");
    remintBtn.type = "button";
    var armed = false, armTimer = null;
    remintBtn.addEventListener("click", function () {
      if (!armed) {
        armed = true;
        remintBtn.textContent = T("manage_card_on_share.get_new_manage_link_armed") || "Tap again, the old link stops working shortly";
        armTimer = setTimeout(function () {
          armed = false;
          remintBtn.textContent = T("manage_card_on_share.get_new_manage_link") || "Get a new manage link";
        }, 4000);
        return;
      }
      clearTimeout(armTimer);
      armed = false;
      remintBtn.disabled = true;
      fetch(GROUPS_API + "/" + rec.sl.m + "/remint", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "{}"
      }).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (data && typeof data.code === "string") {
            rec.sl.m = data.code;
            saveDrawRecord(rec);
            rerenderShareSurfaces(rec);
          } else {
            remintBtn.disabled = false;
            remintBtn.textContent = T("manage_card_on_share.get_new_manage_link") || "Get a new manage link";
          }
        })
        .catch(function () {
          remintBtn.disabled = false;
          remintBtn.textContent = T("manage_card_on_share.get_new_manage_link") || "Get a new manage link";
        });
    });
    card.appendChild(remintBtn);
    return card;
  }

  /* Legacy upgrade card (NEW-IDEA-01, Nov 7, 2026): shown on
     the saved-draw view when the record has no short links —
     every draw saved before Addendum 2065. One tap runs the
     same mint a fresh draw gets (mintShortLinks with the
     upgraded flag): the per-person payloads already on this
     device are posted, the returned /s/ codes + a new /g/
     manage code are stored on the record, the roster rides
     along so a recipient's hand-back prefills the full group,
     and the cards re-render with short targets. Purely
     additive: the long links are never revoked or rewritten. */
  function upgradeCardEl(rec) {
    var card = make("div", "sharecard");
    card.setAttribute("data-fyg-watch", "");
    card.appendChild(make("p", "who", T("mine.legacy_links_title") || "Short links for this draw"));
    card.appendChild(make("p", "linkready",
      T("mine.upgrade_line") || "This draw was saved before short links existed, so its links are the long kind. Switch and each person gets a short link that is easy to send, plus a group page where you can see who has opened theirs. Your long links keep working either way."));
    var row = make("div", "row");
    var btn = make("button", null, T("mine.upgrade_btn") || "Switch to short links");
    btn.type = "button";
    btn.id = "upgradeShortBtn";
    var note = make("p", "hint", "");
    note.hidden = true;
    btn.addEventListener("click", function () {
      btn.disabled = true;
      btn.textContent = T("mine.upgrade_working") || "Switching\u2026";
      note.hidden = true;
      mintShortLinks(rec, true, function (ok) {
        if (ok) return; // the surfaces already re-rendered with short targets
        btn.disabled = false;
        btn.textContent = T("mine.upgrade_btn") || "Switch to short links";
        note.textContent = T("mine.upgrade_failed") || "Could not switch just now: your long links still work. Check your connection and try again.";
        note.hidden = false;
      });
    });
    row.appendChild(btn);
    card.appendChild(row);
    card.appendChild(note);
    return card;
  }

  function renderShareCardsInto(box, rec) {
    box.innerHTML = "";
    box.appendChild(groupMessageCard(rec.customGroup ? rec.group : null, rec.budget));
    box.appendChild(copyAllCard(rec.links.map(function (link) {
      return { name: link.for, token: link.token };
    })));
    if (!rec.sl) box.appendChild(upgradeCardEl(rec));
    box.appendChild(make("h3", "kit-head", T("share.kit_headline") || "Your draw is ready. Send each person their private match link."));
    box.appendChild(make("p", "kit-explainer", T("share.kit_explainer") || "One link for one person. Whoever opens it sees their match. Send it only to them."));
    rec.links.forEach(function (link) {
      var url = shareUrl(link.token, link.for);
      var card = make("div", "sharecard");
      card.setAttribute("data-for", link.for);
      card.setAttribute("data-fyg-watch", "");
      card.appendChild(make("p", "who", TF("share.for_person", { name: link.for }) || ("For " + link.for)));
      card.appendChild(make("p", "linkready", TF("share.private_link_ready", { name: link.for }) || ("Private link ready: send it only to " + link.for + ".")));
      var row = make("div", "row");
      // SPEC-SS-SHARE1108-01: one copy action per person - the message,
      // which already contains the link. Link-only copy removed.
      var msgBtn = make("button", null, T("share.copy_message") || "Copy message");
      msgBtn.type = "button";
      var msg = rec.customGroup
        ? (TF("messages.per_person_with_group", { group: rec.group, budget: bandDisplay(rec.budget), url: url }) ||
          ("You're in " + rec.group + "'s Secret Santa, budget " + rec.budget +
            ". Tap your private link to see who you got: " + url + " No sign-up, and your organizer's screen shows names and links only, never the matches. Keep your link private anyway: anyone who has it can open it."))
        : (TF("messages.per_person_no_group", { budget: bandDisplay(rec.budget), url: url }) ||
          ("You're in a Secret Santa draw, budget " + rec.budget +
            ". Tap your private link to see who you got: " + url + " No sign-up, and your organizer's screen shows names and links only, never the matches. Keep your link private anyway: anyone who has it can open it."));
      msgBtn.addEventListener("click", function () { trackShare("clipboard", "clipboard", link.for); markShared(link.for); copyText(msg, msgBtn, TF("share.confirm_copied", { name: link.for }) || ("Copied " + link.for + "\u2019s link \u2014 send it only to " + link.for + ".")); });
      row.appendChild(msgBtn);
      kitLinks(row, msg, link.for);
      card.appendChild(row);
      if (sharedList(rec).indexOf(link.for) !== -1) card.appendChild(sharedMarkEl());
      box.appendChild(card);
    });
    var mcSaved = manageCardEl(rec);
    if (mcSaved) box.appendChild(mcSaved);
  }

  /* ---------- Organizer progress strip ----------
     LANE G (Oct 31, 2026): DrawNames-style organizer
     progress, rebuilt for a client-only draw. Nothing
     here talks to a server, and no token is decoded:
     the strip counts the organizer's own Copy / Share
     taps on this device, kept as a "sent" name list
     inside the same on-device draw record (ss_draw_v1).
     The strip says exactly that, out loud: it cannot
     see delivery, and it cannot see who opened a link.
     The marks die with the record when it is cleared. */
  function sharedList(rec) {
    if (!rec || !Array.isArray(rec.sent)) return [];
    return rec.sent.filter(function (s) { return rec.names.indexOf(s) !== -1; });
  }
  function sharedMarkEl() {
    return make("p", "sharedmark", T("share.shared_from_device") || "Shared from this device ✓");
  }
  function buildProgress(rec) {
    var total = rec.names.length;
    var sent = sharedList(rec);
    var left = rec.names.filter(function (n) { return sent.indexOf(n) === -1; });
    var wrap = make("div", "pstrip");
    wrap.setAttribute("data-fyg-watch", "");
    wrap.appendChild(make("p", "pline",
      TF("mine.links_shared_of", { sent: sent.length, total: total }) ||
      (sent.length + " of " + total + " links shared from this device.")));
    var bar = make("div", "pbar");
    var fill = make("div", "pfill");
    fill.style.width = (total ? Math.round((sent.length / total) * 100) : 0) + "%";
    bar.appendChild(fill);
    wrap.appendChild(bar);
    if (left.length) {
      wrap.appendChild(make("p", "hint", TF("share.still_to_send", { names: left.join(", ") }) || ("Still to send: " + left.join(", ") + ".")));
    } else {
      wrap.appendChild(make("p", "hint", T("share.every_link_shared") || "Every link has been shared from this device."));
    }
    wrap.appendChild(make("p", "hint", T("mine.counts_taps") || "This counts your Copy and Share taps here."));
    wrap.appendChild(make("p", "hint", rec.trk
      ? (T("share.sends_only_note") || "This strip counts sends only. Opens are in the list below.")
      : (T("progress.cant_see_who_opened") || "It cannot see who opened a link.")));
    return wrap;
  }
  function renderProgressInto(box, rec) {
    if (!box || !rec) return;
    box.innerHTML = "";
    box.appendChild(buildProgress(rec));
  }
  function paintShared(name) {
    ["shareCards", "savedCards"].forEach(function (id) {
      var box = el(id);
      if (!box) return;
      for (var i = 0; i < box.children.length; i++) {
        var card = box.children[i];
        if (card.getAttribute("data-for") !== name) continue;
        var has = false;
        for (var j = 0; j < card.children.length; j++) {
          if (card.children[j].className === "sharedmark") has = true;
        }
        if (!has) card.appendChild(sharedMarkEl());
      }
    });
  }
  function markShared(name) {
    var rec = state.savedRec;
    if (!rec || !Array.isArray(rec.names) || rec.names.indexOf(name) === -1) return;
    if (!Array.isArray(rec.sent)) rec.sent = [];
    if (rec.sent.indexOf(name) === -1) rec.sent.push(name);
    saveDrawRecord(rec);
    renderProgressInto(el("shareProgress"), rec);
    renderProgressInto(el("savedProgress"), rec);
    paintShared(name);
  }

  function renderSavedSection(rec) {
    var section = el("savedDraw");
    if (!section || !rec) return;
    state.savedRec = rec;
    buildReceipt(el("savedReceiptBody"), rec);
    renderProgressInto(el("savedProgress"), rec);
    renderOpensInto(el("savedOpens"), rec);
    renderShareCardsInto(el("savedCards"), rec);
    section.hidden = false;
  }

  /* Saved-record rename reconcile (SPEC-SS-ORGANIZER-EDIT-01,
     prep amendment E6): a rename on the manage page changes
     names server-side; the organizer's on-device saved record
     still holds the old names inside its tokens and every
     name-keyed map. Join group people to local entries BY CODE
     (the only stable join) and migrate one clone coherently:
     names, link.for, every token's you/got/o, and the sl.codes /
     trk.keys / sent / wish keys. The transform is single-pass
     over an original-name map, so chained renames cannot
     collide. Any mismatch returns null and the caller renders
     the local record unchanged — never a reject reason. */
  function reconcileSavedNames(rec, groupRec) {
    try {
      if (!groupRec || !Array.isArray(groupRec.people)) return null;
      if (!rec.sl || !rec.sl.codes) return null;
      var byCode = {};
      groupRec.people.forEach(function (gp) {
        if (gp && typeof gp.c === "string" && typeof gp.n === "string") byCode[gp.c] = gp.n;
      });
      var map = {};
      var any = false;
      rec.names.forEach(function (nm) {
        var code = rec.sl.codes[nm];
        var gn = code ? byCode[code] : null;
        if (gn && gn !== nm) { map[nm] = gn; any = true; }
      });
      if (!any) return null;
      function rn(v) { return map[v] !== undefined ? map[v] : v; }
      var out = JSON.parse(JSON.stringify(rec));
      out.names = out.names.map(rn);
      out.links.forEach(function (link) {
        link.for = rn(link.for);
        var payload = CORE.parseToken(link.token);
        if (!payload) return;
        var changed = false;
        if (map[payload.you] !== undefined) { payload.you = map[payload.you]; changed = true; }
        if (map[payload.got] !== undefined) { payload.got = map[payload.got]; changed = true; }
        if (payload.o !== undefined && map[payload.o] !== undefined) { payload.o = map[payload.o]; changed = true; }
        if (changed) link.token = CORE.makeToken(payload);
      });
      function remapKeys(obj) {
        if (!obj) return obj;
        var fresh = {};
        Object.keys(obj).forEach(function (k) { fresh[rn(k)] = obj[k]; });
        return fresh;
      }
      if (out.sl && out.sl.codes) out.sl.codes = remapKeys(out.sl.codes);
      if (out.trk && out.trk.keys) out.trk.keys = remapKeys(out.trk.keys);
      if (out.wish) out.wish = remapKeys(out.wish);
      if (Array.isArray(out.sent)) out.sent = out.sent.map(rn);
      for (var vi = 0; vi < out.names.length; vi++) {
        if (!out.links[vi] || out.links[vi].for !== out.names[vi]) return null;
        var vp = CORE.parseToken(out.links[vi].token);
        if (!vp || vp.you !== out.links[vi].for) return null;
      }
      return out;
    } catch (e) { return null; }
  }

  function initSavedSection() {
    var rec = loadDrawRecord();
    if (rec && validDrawId(rec.did)) currentDrawId = rec.did;
    if (rec) renderSavedSection(rec);
    if (rec && rec.sl && rec.sl.m) {
      var mcode = rec.sl.m;
      fetch(GROUPS_API + "/" + encodeURIComponent(mcode))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (groupRec) {
          if (!groupRec) return;
          var cur = state.savedRec;
          if (!cur || !cur.sl || cur.sl.m !== mcode) return;
          var migrated = reconcileSavedNames(cur, groupRec);
          if (migrated) {
            saveDrawRecord(migrated);
            renderSavedSection(migrated);
          }
        })
        .catch(function () {});
    }
    var clearBtn = el("clearDrawBtn");
    if (!clearBtn) return;
    var armed = false, armTimer = null;
    clearBtn.addEventListener("click", function () {
      if (!armed) {
        armed = true;
        clearBtn.textContent = T("saved_draw.clear_draw_armed") || "Tap again to clear for good";
        armTimer = setTimeout(function () {
          armed = false;
          clearBtn.textContent = T("saved_draw.clear_draw") || "Clear saved draw from this device";
        }, 4000);
        return;
      }
      clearTimeout(armTimer);
      armed = false;
      clearBtn.textContent = T("saved_draw.clear_draw") || "Clear saved draw from this device";
      clearDrawRecord();
      state.savedRec = null;
      el("savedDraw").hidden = true;
      var note = el("clearDrawNote");
      if (note) note.hidden = false;
    });
    var backBtn = el("runBackBtn");
    if (backBtn) backBtn.addEventListener("click", function () {
      var rec = state.savedRec;
      if (!rec) return;
      runItBack({
        g: rec.group || rec.customGroup || "",
        b: bandIdForLabel(rec.budget),
        names: rec.names || []
      }, "saved-draw");
    });
  }

  /* Return hook (Oct 31, 2026, SPEC-SS-RETURN-1): leave one
     yes/no mark in this browser — the literal "1", nothing
     else — when a draw succeeds or a match is peeked at. The
     mark itself holds no name, no match, no gift pick, and no
     link part. (The draw's resend record is a separate key,
     "ss_draw_v1" — see the SS-SEALED-1 block above; it stays
     on this device and is never sent anywhere.) The fleet block in
     index.html reads the mark on a later visit: a new session
     (this session is flagged "ss_origin" so it never counts
     itself) fires one counts-only return_visit and shows the
     welcome-back strip on the organizer home. */
  function markSeen() {
    try { localStorage.setItem("ss_seen_v1", "1"); } catch (e) {}
    try { sessionStorage.setItem("ss_origin", "1"); } catch (e) {}
  }
  function showReturnHook() {
    try {
      var seen = localStorage.getItem("ss_seen_v1");
      var origin = sessionStorage.getItem("ss_origin");
      var rh = el("returnHook");
      if (rh && seen === "1" && !origin) rh.hidden = false;
    } catch (e) {}
  }

  function doDraw() {
    var people = state.people;
    if (hasDuplicateNames(people)) {
      showStep(2);
      showErr("err2", T("step2.dupe_names_error") || "Two people share a name. Add a last initial to each, so every private link works.");
      return;
    }
    trackDrawStart(people.length);
    // SEC-3: a draw after the first is a redraw — its share
    // screen must warn that old links still work.
    var isRedraw = !!state.lastDraw;
    var indexOf = Object.create(null);
    people.forEach(function (p, i) { indexOf[p.rowId] = i; });
    var apartIdx = [];
    readPairs().forEach(function (pair) {
      if (indexOf[pair[0]] != null && indexOf[pair[1]] != null) {
        apartIdx.push([indexOf[pair[0]], indexOf[pair[1]]]);
      }
    });
    // ADV-8: the draw seed is crypto-grade (128-bit material
    // from randomSeed), and the gift picks use their OWN
    // independent random seed — never derived from the draw
    // seed — so the gift ids in a link say nothing about the
    // draw, even to someone who pools several links.
    var seed = CORE.randomSeed();
    var match = CORE.drawGroup(people.length, apartIdx, seed);
    if (!match) {
      showStep(3);
      // SPEC-01 (Nov 9, 2026, cold-QA): when the group is small,
      // the bare error read as a dead end — nothing said WHY the
      // rules left no draw. Small groups are fragile: each person
      // has only n-1 names they could draw at all, and keep-apart
      // pairs block some of those. Say that, and name the same
      // recovery as before (remove a pair — or add a person).
      if (people.length <= 4 && apartIdx.length) {
        showErr("err3", TF("step3.no_fair_draw_small_error", { n: people.length, m: people.length - 1 }) ||
          ("No fair draw fits these rules. Small groups are fragile: with " + people.length + " people, each person has only " + (people.length - 1) + " names they could draw, and the keep-apart pairs block too many of them. Remove a keep-apart pair, or add a person, then draw again."));
      } else {
        showErr("err3", T("step3.no_fair_draw_error") || "No fair draw fits these rules. Remove a keep-apart pair or two, then draw again.");
      }
      return;
    }
    hideErr("err3");
    // Release A P0-1: fresh independent draw ID for this draw.
    currentDrawId = newDrawId();
    var rand = CORE.rng(CORE.randomSeed());
    var usedIds = Object.create(null);
    var bandLabel = BANDS.filter(function (b) { return b.id === state.band; })[0].label;
    var groupName = groupNameValue();
    var tokens = people.map(function (giver, gi) {
      var receiver = people[match[gi]];
      var picks = CORE.pickGifts(BANK, state.band, receiver.interest, rand, usedIds);
      if (picks.length) usedIds[picks[0].id] = true;
      // Only pick ids ride in the link, never the gift text: the
      // reveal page resolves them against the same bank. That
      // keeps each private link short enough to forward cleanly.
      var payload = {
        v: 1,
        g: groupName || "Secret Santa",
        b: bandLabel,
        you: giver.name,
        got: receiver.name,
        pi: picks.map(function (p) { return p.id; })
      };
      // Optional organizer name rides only when the organizer
      // typed one (SPEC-SS-TRANSPARENCY-01). parseToken and the
      // links worker both accept it as an optional seventh key,
      // validated like any other name; without it the token is
      // byte-identical in shape to every token before this change.
      var orgName = organizerNameValue();
      if (orgName) payload.o = orgName;
      return { giver: giver.name, token: CORE.makeToken(payload) };
    });
    state.lastDraw = { match: match, tokens: tokens, pairCount: apartIdx.length, isRedraw: isRedraw };
    trackDrawComplete(tokens.length);
    try { var _dcN = people.length; if (window.FA) FA.track("draw_created", mergeProps(mergeProps({ people_count: _dcN, group_size_bucket: groupSizeBucket(_dcN), restrictions: apartIdx.length > 0, start_source: startSource() }, drawIdProps()), firstTouchProps())); } catch (e) {}
    /* SPEC-SHARE-MEASURE-1 (Nov 7, 2026): stamp this device as an
       organizer device (timestamp only) so the share_arrival mark on
       the home page can exclude the organizer's own link previews
       for 24 hours. Device-local, never sent anywhere. */
    try { localStorage.setItem("ss_organizer_v1", String(Date.now())); } catch (e) {}
    markSeen();
    // SS-SEALED-1: save the resend record on this device only and
    // render the sealed receipt into the share step. A redraw
    // replaces the saved record, so the resend list always
    // matches the newest draw (old links still work, as the
    // redraw warning on this step already says).
    // Wishlist notes (R2-2) ride in the record keyed by the
    // person they are FOR. They are never rendered on any
    // organizer surface — the reveal view is the only place one
    // is ever shown, and only the note for the match on screen.
    var wishMap = Object.create(null);
    people.forEach(function (p) { if (p.wish) wishMap[p.name] = p.wish; });
    var sealedRec = {
      v: 1,
      group: groupName || "Secret Santa",
      customGroup: !!groupName,
      budget: bandLabel,
      date: todayISO(),
      names: people.map(function (p) { return p.name; }),
      pairs: apartIdx.length,
      wish: wishMap,
      sent: [],
      trk: makeTrk(people.map(function (p) { return p.name; })),
      links: tokens.map(function (t) { return { for: t.giver, token: t.token }; })
    };
    // SPEC-SS-AMIGO-01: a draw run in Spanish stamps its
    // language onto the record. The record drives the share
    // links (&l=es long links, l:"es" short payloads), the
    // manage page, and the receipt — the whole journey stays
    // in the organizer's language. English draws get no
    // field, exactly as records always looked.
    if (LANG === "es") {
      sealedRec.lang = "es";
      persistLangPref();
    }
    if (currentDrawId) sealedRec.did = currentDrawId;
    saveDrawRecord(sealedRec);
    state.savedRec = sealedRec;
    var sealedBox = el("sealedReceipt");
    if (sealedBox) {
      buildReceipt(el("sealedBody"), sealedRec);
      sealedBox.hidden = false;
    }
    // The saved section is the return-visit surface: it renders
    // on the next page load, not now — step 4 already shows
    // these same cards, and nothing on the page appears twice.
    var savedBox = el("savedDraw");
    if (savedBox) savedBox.hidden = true;
    renderShare(tokens);
    renderProgressInto(el("shareProgress"), sealedRec);
    renderOpensInto(el("shareOpens"), sealedRec);
    showStep(4);
    mintShortLinks(sealedRec);
  }

  /* Short-link minting (Nov 7, 2026): after a draw, hand
     each person's sealed payload to the links worker and
     get back one random code per person, then register the
     group (names + codes + progress keys — never matches)
     for its manage code. All of it is a bonus layer: the
     draw is already saved and shareable with long links,
     and if any mint fails the record simply keeps them.
     When the codes land, the record gains `sl` and every
     share surface re-renders, so the buttons an organizer
     is about to tap carry the short links. */
  function mintShortLinks(rec, upgraded, onSettled) {
    try {
      // Legacy upgrade (NEW-IDEA-01, Nov 7, 2026): a draw saved
      // before progress codes existed has no trk — mint one now
      // so the upgrade can also register the group (manage page
      // + opens) exactly like a fresh draw. The codes live only
      // in this device's record and in the new short links; the
      // stored long links are untouched and keep working.
      if (!rec.trk) {
        rec.trk = makeTrk(rec.names);
        saveDrawRecord(rec);
      }
      if (!validDrawId(rec.did)) {
        rec.did = newDrawId();
        if (!currentDrawId) currentDrawId = rec.did;
        saveDrawRecord(rec);
      }
      var settled = false;
      function settle(ok) {
        if (settled) return;
        settled = true;
        if (typeof onSettled === "function") { try { onSettled(ok); } catch (e) {} }
      }
      var jobs = rec.links.map(function (link) {
        var payload = CORE.parseToken(link.token);
        if (!payload) return Promise.resolve(null);
        // SPEC-SS-AMIGO-01: the stored token stays the frozen
        // six-key shape (core.js does not know a language
        // field). A Spanish draw stamps l:"es" onto the
        // short-link payload copy only — the same posture as
        // the organizer-first-name o field — so the Worker
        // hands the reveal page a Spanish payload while the
        // long links ride &l=es in the fragment instead.
        if (rec.lang === "es") payload.l = "es";
        var t = rec.trk && rec.trk.keys ? rec.trk.d + rec.trk.keys[link.for] : null;
        return fetch(LINKS_API, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ p: payload, t: t, names: rec.names, di: rec.did || undefined })
        }).then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            return data && typeof data.code === "string" ? { name: link.for, code: data.code } : null;
          })
          .catch(function () { return null; });
      });
      var mintedFired = false;
      function fireMinted(linkType, manage) {
        if (mintedFired) return;
        mintedFired = true;
        try {
          if (typeof fleetTrack === "function") {
            var mintProps = mergeProps({ tool: "secret-santa", people_count: rec.links.length, link_type: linkType, manage: manage, group_size_bucket: groupSizeBucket(rec.links.length) }, validDrawId(rec.did) ? { draw_id: rec.did } : {});
            if (upgraded) mintProps.upgraded = true;
            fleetTrack("draw_links_minted", mintProps);
          }
        } catch (e) {}
      }
      Promise.all(jobs).then(function (results) {
        var codes = Object.create(null);
        var allOk = results.length === rec.links.length;
        results.forEach(function (r) { if (r) codes[r.name] = r.code; else allOk = false; });
        if (!allOk || Object.keys(codes).length !== rec.links.length) { fireMinted("long-fallback", false); settle(false); return; }
        rec.sl = { codes: codes };
        saveDrawRecord(rec);
        rerenderShareSurfaces(rec);
        if (!rec.trk) { fireMinted("long-fallback", false); settle(false); return; }
        var groupBody = {
          v: 1, g: rec.group, b: rec.budget, date: rec.date, pairs: rec.pairs,
          d: rec.trk.d,
          people: rec.links.map(function (link) {
            return { n: link.for, c: codes[link.for], k: rec.trk.keys[link.for] };
          })
        };
        // SPEC-SS-AMIGO-01: the group record remembers the
        // draw's language so the manage page renders in it.
        // The Worker stores it only when it is exactly "es"
        // and treats anything else as an English group.
        if (rec.lang === "es") groupBody.lang = "es";
        if (validDrawId(rec.did)) groupBody.di = rec.did;
        return fetch(GROUPS_API, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(groupBody)
        }).then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            if (data && typeof data.code === "string") {
              rec.sl.m = data.code;
              saveDrawRecord(rec);
              rerenderShareSurfaces(rec);
              fireMinted("short", true);
              settle(true);
            } else {
              fireMinted("long-fallback", false);
              settle(false);
            }
          })
          .catch(function () { fireMinted("long-fallback", false); settle(false); });
      }).catch(function () { settle(false); });
    } catch (e) {}
  }

  function rerenderShareSurfaces(rec) {
    try {
      if (state.lastDraw && state.lastDraw.tokens) renderShare(state.lastDraw.tokens);
      renderProgressInto(el("shareProgress"), rec);
      renderOpensInto(el("shareOpens"), rec);
      var savedBox = el("savedDraw");
      if (savedBox && !savedBox.hidden) renderSavedSection(rec);
    } catch (e) {}
  }

  /* Share counting (Oct 31, 2026): one fleet share_intent per
     share tap. The payload is enums only — tool, channel, kind.
     It never holds a name, a match, a gift pick, a link, or any
     part of a token. fleetTrack is defined by the fleet block in
     index.html; when it is absent (test pages), this is a no-op. */
  function trackShare(channel, kind, name) {
    try {
      if (typeof fleetTrack === "function") {
        var props = mergeProps({ tool: "secret-santa", channel: channel, kind: kind }, drawIdProps());
        // Copy-time link type (SPEC-SS-MEASURE-01): computed at
        // the tap, from the same shortUrlFor the copy itself
        // uses — a fixed kind word only, never the link.
        if (name != null) props.link_type = shortUrlFor(name) ? "short" : "long";
        fleetTrack("share_intent", props);
        // P0-2 (Release A): link_copied restored in this single
        // funnel — exactly one fire per successful copy action,
        // beside the share_intent above. Its Nov 8 emitters were
        // removed with the per-person copy buttons (fc2ae28);
        // this restoration covers every copy kind, wider than
        // the original. See the definitions sheet.
        if (channel === "clipboard") {
          var lcProps = mergeProps({ tool: "secret-santa", kind: kind }, drawIdProps());
          if (name != null) lcProps.link_type = props.link_type;
          fleetTrack("link_copied", lcProps);
        }
      }
    } catch (e) {}
  }
  /* Release B (P1-2, Nov 10, 2026): share-kit deep links. The
     per-person message (which already embeds that person's own
     link) is percent-encoded into the href; the link itself is
     never an analytics property — trackShare stays enums-only.
     WhatsApp: https://wa.me/?text=<encoded>. SMS: sms:?&body=
     <encoded> (the ?& form is the cross-platform-safe variant). */
  function waHref(msg) { return "https://wa.me/?text=" + encodeURIComponent(msg); }
  function smsHref(msg) { return "sms:?&body=" + encodeURIComponent(msg); }
  function groupShareText(group) {
    var t = group
      ? TF("messages.group_share_with_group", { group: group })
      : T("messages.group_share_no_group");
    if (t) return t;
    return group
      ? group + "'s Secret Santa draw is ready! Watch your messages: I will send each person a private link to see who they got."
      : "Our Secret Santa draw is ready! Watch your messages: I will send each person a private link to see who they got.";
  }
  /* Share-kit transparency (Nov 10, 2026): flash a named
     confirmation on the tapped control itself, in place of the
     generic state — the label names the person and says send it
     only to them, then restores. UI only: no event changes. */
  function flashLabel(ctl, text) {
    if (ctl.getAttribute("data-kit-orig") == null) ctl.setAttribute("data-kit-orig", ctl.textContent);
    ctl.textContent = text;
    if (ctl._kitTimer) clearTimeout(ctl._kitTimer);
    ctl._kitTimer = setTimeout(function () { ctl.textContent = ctl.getAttribute("data-kit-orig"); }, 1800);
  }
  function kitLinks(row, msg, name) {
    if (navigator.share) {
      var shareBtn = make("button", "alt", T("share.share") || "Share");
      shareBtn.type = "button";
      shareBtn.addEventListener("click", function () {
        // Release B QA (owner update): a canceled or failed native
        // share is NOT a share. share_intent kind=native (and the
        // on-device shared mark) fire only when the share promise
        // RESOLVES; AbortError / any rejection fires nothing. The
        // named confirmation rides the same resolve-only path.
        navigator.share({ title: T("messages.share_sheet_title") || "Pick My Secret Santa", text: msg })
          .then(function () { trackShare("native", "native", name); markShared(name); flashLabel(shareBtn, TF("share.confirm_shared", { name: name }) || ("Shared " + name + "\u2019s link \u2014 send it only to " + name + ".")); })
          .catch(function () {});
      });
      row.appendChild(shareBtn);
    }
    var wa = make("a", "kitbtn", "WhatsApp");
    wa.href = waHref(msg);
    wa.target = "_blank";
    wa.rel = "noopener";
    wa.setAttribute("aria-label", "WhatsApp: " + name);
    wa.addEventListener("click", function () { trackShare("whatsapp", "whatsapp", name); markShared(name); flashLabel(wa, TF("share.confirm_whatsapp", { name: name }) || ("WhatsApp opened with " + name + "\u2019s link \u2014 send it only to " + name + ".")); });
    row.appendChild(wa);
    var sms = make("a", "kitbtn", "SMS");
    sms.href = smsHref(msg);
    sms.setAttribute("aria-label", "SMS: " + name);
    sms.addEventListener("click", function () { trackShare("sms", "sms", name); markShared(name); flashLabel(sms, TF("share.confirm_sms", { name: name }) || ("SMS opened with " + name + "\u2019s link \u2014 send it only to " + name + ".")); });
    row.appendChild(sms);
  }
  function linkTypeFor(name) { return shortUrlFor(name) ? "short" : "long"; }

  function linkFor(token) {
    // ?via=share rides in the query, before the #p= fragment:
    // the query is how the arrival is counted, and the fragment
    // (which holds the match) is never sent to any server.
    return location.origin + location.pathname + "?via=share#p=" + token;
  }

  // -------------------------------------------------------
  // Organizer progress notes (Nov 7, 2026 — the Giftster
  // steal, GPT verdict KEEP, Nov 6 novel finds). Until now
  // the organizer could count their own sends (the strip
  // above) but could never see whether a link was opened —
  // and Nov 6 PostHog showed a real group run a draw
  // (16 arrivals, 10 reveals), so organizers are the users
  // this serves. The record above's shape: per person,
  // opened / saw their match / not opened yet, plus a
  // nudge, and NEVER who anyone got.
  //
  // How it stays honest: at draw time this browser makes
  // one random draw code and one random code per person.
  // The codes — and only the codes — ride in each person's
  // link as &t= AFTER the sealed token: the token format
  // is untouched (core.js still parses exactly its own six
  // fields), and the fragment is never sent to any server
  // by the browser itself. The reveal page reads its own
  // code out of the fragment and notes "opened" / "saw"
  // to /api/progress with a body that holds only the two
  // codes and the one word. The server store (KV, worker
  // secret-santa-progress) holds code -> two timestamps:
  // no names, no matches, no tokens, no gift picks, and
  // every note deletes itself after 120 days. Only this
  // browser can turn codes back into names, because the
  // name <-> code map lives only in the saved draw record
  // on this device. Links from older draws carry no code
  // and behave exactly as they always have.
  // -------------------------------------------------------
  var PROGRESS_API = "https://pickmysecretsanta.com/api/progress";

  /* Short links (Nov 7, 2026): the secret-santa-links
     worker holds one sealed payload per random 8-char code.
     New draws mint codes at draw time (see mintShortLinks);
     when a person's code exists, every surface that hands
     out their link — Copy message, Share, the manage page, the
     nudge — uses the ~40-char /s/ address instead of the
     ~450-char fragment link. The fragment link stays the
     fallback whenever codes are missing (mint failed, an
     older saved draw), and old links work forever: boot
     still routes #p= exactly as before. */
  var LINKS_API = "https://pickmysecretsanta.com/api/links";
  var GROUPS_API = "https://pickmysecretsanta.com/api/groups";
  var SHORT_BASE = "https://pickmysecretsanta.com";

  function shortUrlFor(name) {
    var rec = state.savedRec;
    if (rec && rec.sl && rec.sl.codes && rec.sl.codes[name]) {
      return SHORT_BASE + "/s/" + rec.sl.codes[name];
    }
    return null;
  }

  /* Release A (P0-1/P0-5, Nov 10, 2026): one opaque draw ID per
     draw — 32 lowercase hex from a fresh crypto seed (trkHex uses
     CORE.randomSeed), generated at draw time, independent of every
     link code, name, match and the draw seed. It rides events as
     draw_id and the worker records as the record-level field di
     BESIDE payload p (never inside p). Short-link recipients learn
     it from GET /api/links; long-link recipients never do (C3). */
  var currentDrawId = null;
  var revealDrawId = null;
  var manageDrawId = null;
  function validDrawId(v) { return typeof v === "string" && /^[a-f0-9]{32}$/.test(v) ? v : null; }
  function newDrawId() { return trkHex(32); }
  function activeDrawId() {
    // Route-exclusive contexts first: a page load is a reveal OR
    // a manage page OR the organizer home, never two at once.
    if (revealDrawId) return revealDrawId;
    if (manageDrawId) return manageDrawId;
    if (currentDrawId) return currentDrawId;
    try { if (state && state.savedRec && validDrawId(state.savedRec.did)) return state.savedRec.did; } catch (e) {}
    return null;
  }
  function drawIdProps() {
    var d = activeDrawId();
    return d ? { draw_id: d } : {};
  }
  function mergeProps(base, extra) {
    var out = {};
    Object.keys(base || {}).forEach(function (k) { out[k] = base[k]; });
    Object.keys(extra || {}).forEach(function (k) { out[k] = extra[k]; });
    return out;
  }
  /* P0-5 (slim, per audit C5): stamp first-touch source + landing
     page from the EXISTING fleet_ft2 store onto draw_created.
     Words only: utm_source, else the referring hostname, else
     $direct; landing is the store's path only (the store already
     cut /s//g/ code segments at write). Never the raw referrer. */
  function firstTouchProps() {
    var out = { entry_source: "$direct" };
    try {
      var ft = JSON.parse(localStorage.getItem("fleet_ft2") || "null");
      if (ft) {
        if (typeof ft.s === "string" && ft.s) out.entry_source = ft.s.slice(0, 100);
        else if (typeof ft.r === "string" && ft.r) {
          try { var h = new URL(ft.r).hostname; if (h) out.entry_source = h.slice(0, 100); } catch (e) {}
        }
        if (typeof ft.u === "string" && ft.u) {
          try { out.entry_landing = new URL(ft.u).pathname.slice(0, 100); }
          catch (e) { out.entry_landing = ft.u.replace(/^https?:\/\/[^/]+/, "").split("?")[0].slice(0, 100); }
        }
      }
    } catch (e) {}
    if (!out.entry_landing) {
      var lp = location.pathname || "/";
      if (/^\/(s|g)\/[^/]/.test(lp)) lp = lp.replace(/^\/(s|g)\/[^/]+.*$/, "/$1/");
      out.entry_landing = lp.slice(0, 100);
    }
    return out;
  }
  /* P0-4: real funnel middle. draw_started fires once per setup
     session at the first real setup interaction; setup_completed
     fires once when the roster first holds >=3 unique names. */
  var drawStartedFired = false;
  var setupCompletedFired = false;
  function fireDrawStarted(entry) {
    if (drawStartedFired) return;
    drawStartedFired = true;
    try {
      if (typeof fleetTrack === "function") {
        fleetTrack("draw_started", { tool: "secret-santa", entry: entry || drawEntryWord(), names_mode: namesModeWord() });
      }
    } catch (e) {}
  }
  function validNameCount() {
    var seen = Object.create(null), n = 0;
    try {
      readPeople().forEach(function (pp) {
        var k = (pp.name || "").toLowerCase();
        if (k && !seen[k]) { seen[k] = true; n++; }
      });
    } catch (e) {}
    return n;
  }
  function checkSetupCompleted() {
    if (setupCompletedFired) return;
    var n = validNameCount();
    if (n < 3) return;
    setupCompletedFired = true;
    try {
      if (typeof fleetTrack === "function") {
        fleetTrack("setup_completed", { tool: "secret-santa", people_count: n });
      }
    } catch (e) {}
  }
  var namesAddedRows = Object.create(null);
  function fireNamesAddedRows(rowId) {
    if (rowId == null || namesAddedRows[rowId]) return;
    namesAddedRows[rowId] = true;
    try {
      if (typeof fleetTrack === "function") {
        // C7 shape: method rows, NO count_bucket (a 1-name bucket
        // label would read as the misleading "3-5").
        fleetTrack("names_added", { tool: "secret-santa", method: "rows" });
      }
    } catch (e) {}
  }
  function fireNamesAddedFill(method, count) {
    try {
      if (typeof fleetTrack === "function") {
        fleetTrack("names_added", { tool: "secret-santa", method: method, count_bucket: groupSizeBucket(count) });
      }
    } catch (e) {}
  }

  function trkHex(chars) {
    var rnd = CORE.rng(CORE.randomSeed());
    var out = "";
    while (out.length < chars) {
      out += Math.floor(rnd() * 4294967296).toString(16).padStart(8, "0");
    }
    return out.slice(0, chars);
  }

  function makeTrk(names) {
    var keys = Object.create(null);
    names.forEach(function (nm) { keys[nm] = trkHex(12); });
    return { d: trkHex(16), keys: keys };
  }

  // The reveal page's own progress code, read out of the
  // fragment it arrived with. Null for older links.
  function parseTrkRef() {
    var m = /[&#]t=([a-f0-9]{28})(?![a-f0-9])/.exec(location.hash || "");
    if (!m) return null;
    return { d: m[1].slice(0, 16), k: m[1].slice(16) };
  }

  function postProgress(trk, ev) {
    try {
      fetch(PROGRESS_API, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ d: trk.d, k: trk.k, e: ev }),
        keepalive: true
      }).catch(function () {});
    } catch (e) { /* progress is a bonus; the reveal never waits on it */ }
  }

  // The link a person actually receives for a new draw:
  // their short link when this draw has one, else their
  // sealed long link plus their progress code.
  function shareUrl(token, name) {
    var short = shortUrlFor(name);
    if (short) return short;
    var base = linkFor(token);
    var rec = state.savedRec;
    // SPEC-SS-AMIGO-01: the long link carries the draw's
    // language as &l=es in the fragment — the same sideband
    // pattern as the &t= progress ref (the frozen token
    // itself has no language field). The recipient's page
    // reads it in resolveEntryLang.
    var langRef = rec && rec.lang === "es" ? "&l=es" : "";
    if (rec && rec.trk && rec.trk.keys && rec.trk.keys[name]) {
      return base + "&t=" + rec.trk.d + rec.trk.keys[name] + langRef;
    }
    return base + langRef;
  }

  function nudgeText(rec, name, url) {
    return (TF("messages.nudge", { name: name, url: url, budget: bandDisplay(rec.budget) }) ||
    ("Hi " + name + " - a nudge from your Secret Santa organizer. " +
      "Your private link is still unopened: " + url + " " +
      "Tap it to see who you got (budget " + rec.budget + "). " +
      "Takes ten seconds, and my screen never shows your match."));
  }

  function buildOpensInto(box, rec, byKey, failed) {
    box.innerHTML = "";
    var wrap = make("div", "pstrip opensview");
    wrap.setAttribute("data-fyg-watch", "");
    wrap.appendChild(make("p", "pline", T("progress.who_opened_title") || "Who has opened their link"));
    if (failed) {
      wrap.appendChild(make("p", "hint",
        (!box || box.id !== "manageOpens")
          ? (T("progress.could_not_check_saved") || "Could not check just now. Your links still work: check again in a bit.")
          : (T("progress.could_not_check_manage") || "Could not check just now. Your links still work: check again in a bit.")));
    } else {
      var opened = 0, seen = 0;
      rec.names.forEach(function (nm) {
        var e = byKey[rec.trk.keys[nm]];
        if (e && e.r) { opened++; seen++; }
        else if (e && e.o) { opened++; }
      });
      wrap.appendChild(make("p", null,
        TF("progress.opened_summary", { opened: opened, total: rec.names.length, seen: seen }) ||
        (opened + " of " + rec.names.length + " have opened · " + seen + " saw their match")));
      var bar = make("div", "pbar");
      var fill = make("div", "pfill");
      fill.style.width = (rec.names.length ? Math.round(opened / rec.names.length * 100) : 0) + "%";
      bar.appendChild(fill);
      wrap.appendChild(bar);
      rec.names.forEach(function (nm) {
        var e = byKey[rec.trk.keys[nm]];
        var row = make("div", "prow");
        row.appendChild(make("span", "pname", nm));
        if (e && e.r) row.appendChild(make("span", "pchip seen", T("progress.seen_chip") || "Saw their match"));
        else if (e && e.o) row.appendChild(make("span", "pchip opened", T("progress.opened_chip") || "Opened"));
        else {
          row.appendChild(make("span", "pchip", T("progress.not_opened_chip") || "Not opened yet"));
          var link = null;
          rec.links.forEach(function (l) { if (l.for === nm) link = l; });
          if (link) {
            var url = shareUrl(link.token, nm);
            var nb = make("button", "altbtn", TF("messages.copy_nudge_for", { name: nm }) || ("Copy a nudge for " + nm));
            nb.type = "button";
            nb.addEventListener("click", function () {
              trackShare("clipboard", "message", nm); copyText(nudgeText(rec, nm, url), nb, (T("share.copied") || "Copied"));
            });
            row.appendChild(nb);
          }
        }
        wrap.appendChild(row);
      });
    }
    var again = make("button", "secondary", T("progress.check_again") || "Check again");
    again.type = "button";
    again.style.marginTop = "10px";
    again.addEventListener("click", function () { renderOpensInto(box, rec); });
    wrap.appendChild(again);
    wrap.appendChild(make("p", "hint",
      (!box || box.id !== "manageOpens")
        ? (T("progress.opens_only_note_saved") || "Opens only. This never shows who anyone got. It runs on a random code: the note holds no name and no match.")
        : (T("progress.opens_only_note_manage") || "Opens only. This never shows who anyone got. It runs on a random code: the note holds no name and no match.")));
    box.appendChild(wrap);
  }

  function renderOpensInto(box, rec) {
    if (!box) return;
    if (!rec || !rec.trk) { box.innerHTML = ""; return; }
    box.innerHTML = "";
    var wrap = make("div", "pstrip opensview");
    wrap.setAttribute("data-fyg-watch", "");
    wrap.appendChild(make("p", "pline", T("progress.who_opened_title") || "Who has opened their link"));
    wrap.appendChild(make("p", "hint", T("progress.checking") || "Checking…"));
    box.appendChild(wrap);
    fetch(PROGRESS_API + "?d=" + encodeURIComponent(rec.trk.d) +
      "&ks=" + encodeURIComponent(rec.names.map(function (nm) { return rec.trk.keys[nm]; }).join(",")))
      .then(function (r) { if (!r.ok) throw new Error("bad"); return r.json(); })
      .then(function (data) { buildOpensInto(box, rec, (data && data.p) || {}, false); })
      .catch(function () { buildOpensInto(box, rec, null, true); });
  }

  function copyText(text, btn, doneLabel) {
    function done() {
      var old = btn.textContent;
      btn.textContent = doneLabel;
      setTimeout(function () { btn.textContent = old; }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        window.prompt(T("share.copy_prompt_fallback") || "Copy this link:", text);
      });
    } else {
      window.prompt(T("share.copy_prompt_fallback") || "Copy this link:", text);
    }
  }

  function renderShare(tokens) {
    // Duplicate-name warning (SEC-1: null-prototype seen-set,
    // same fix as hasDuplicateNames)
    var seen = Object.create(null), dupe = false;
    state.people.forEach(function (p) {
      var k = p.name.trim().toLowerCase();
      if (seen[k]) dupe = true;
      seen[k] = true;
    });
    var warn = el("dupeWarn");
    if (dupe) {
      warn.textContent = T("share.dupe_warning") || "Two people share a name. Check each link twice.";
      warn.hidden = false;
    } else {
      warn.hidden = true;
    }
    var threeNote = el("threePersonNote");
    if (threeNote) threeNote.hidden = tokens.length !== 3;
    // SEC-2: n=4 with a keep-apart pair always leaks one other
    // match — disclose it exactly in that setup, nowhere else.
    var fourNote = el("fourPersonNote");
    if (fourNote) {
      var pairCount = state.lastDraw && typeof state.lastDraw.pairCount === "number"
        ? state.lastDraw.pairCount : 0;
      fourNote.hidden = !(tokens.length === 4 && pairCount >= 1);
    }
    // SEC-3: after a redraw, warn that old links still work.
    var redrawWarn = el("redrawWarn");
    if (redrawWarn) redrawWarn.hidden = !(state.lastDraw && state.lastDraw.isRedraw);
    var box = el("shareCards");
    box.innerHTML = "";
    var rawGroupName = groupNameValue();
    var groupName = rawGroupName || "Secret Santa";
    var bandLabel = BANDS.filter(function (b) { return b.id === state.band; })[0].label;
    // SPEC-SS-COLDQA-01 (Nov 9, 2026): one fact, one place — the sealed
    // receipt on this same screen is the single statement of group /
    // date / count / budget. The old summary line printed group, count
    // and budget a second time above it, so it now stays empty + hidden.
    el("drawSummary").textContent = "";
    el("drawSummary").hidden = true;
    box.appendChild(groupMessageCard(rawGroupName || null, bandLabel));
    box.appendChild(copyAllCard(tokens.map(function (t) {
      return { name: t.giver, token: t.token };
    })));
    tokens.forEach(function (t) {
      var link = shareUrl(t.token, t.giver);
      var card = make("div", "sharecard");
      card.setAttribute("data-for", t.giver);
      card.setAttribute("data-fyg-watch", "");
      card.appendChild(make("p", "who", TF("share.for_person", { name: t.giver }) || ("For " + t.giver)));
      card.appendChild(make("p", "linkready", TF("share.private_link_ready", { name: t.giver }) || ("Private link ready: send it only to " + t.giver + ".")));
      var row = make("div", "row");
      // SPEC-SS-SHARE1108-01: one copy action per person - the message,
      // which already contains the link. Link-only copy removed.
      var msgBtn = make("button", null, T("share.copy_message") || "Copy message");
      msgBtn.type = "button";
      var msg = rawGroupName
        ? (TF("messages.per_person_with_group", { group: groupName, budget: bandDisplay(bandLabel), url: link }) ||
          ("You're in " + groupName + "'s Secret Santa, budget " + bandLabel +
            ". Tap your private link to see who you got: " + link + " No sign-up, and your organizer's screen shows names and links only, never the matches. Keep your link private anyway: anyone who has it can open it."))
        : (TF("messages.per_person_no_group", { budget: bandDisplay(bandLabel), url: link }) ||
          ("You're in a Secret Santa draw, budget " + bandLabel +
            ". Tap your private link to see who you got: " + link + " No sign-up, and your organizer's screen shows names and links only, never the matches. Keep your link private anyway: anyone who has it can open it."));
      msgBtn.addEventListener("click", function () { trackShare("clipboard", "clipboard", t.giver); markShared(t.giver); copyText(msg, msgBtn, TF("share.confirm_copied", { name: t.giver }) || ("Copied " + t.giver + "\u2019s link \u2014 send it only to " + t.giver + ".")); });
      row.appendChild(msgBtn);
      kitLinks(row, msg, t.giver);
      card.appendChild(row);
      if (state.savedRec && sharedList(state.savedRec).indexOf(t.giver) !== -1) {
        card.appendChild(sharedMarkEl());
      }
      box.appendChild(card);
    });
    var mcFresh = manageCardEl(state.savedRec);
    if (mcFresh) box.appendChild(mcFresh);
  }

  /* Setup link prefill (gate fix loop, Nov 3, 2026). The
     #setup= fragment — lifted out of the address by the head
     script in index.html before analytics load, and held on
     window.__SS_SETUP — carries a group's setup from the
     ChatGPT connector: group name, budget band, roster, and
     keep-apart pairs. It is applied to the very form a
     hand-typed setup uses. Nothing is drawn here and no match
     exists; the draw still runs only when the organizer taps
     Draw, in this browser, as always. A payload core rejects
     is ignored whole — the organizer just gets the empty
     form. */
  function applySetup(payload) {
    if (payload.g) {
      var gInput = el("groupName");
      if (gInput) gInput.value = payload.g;
    }
    if (payload.b) {
      state.band = payload.b;
      var chipBox = el("budgetChips");
      Array.prototype.forEach.call(chipBox.children, function (c, i) {
        c.setAttribute("aria-pressed", BANDS[i].id === state.band ? "true" : "false");
      });
      var askBand = el("askBand");
      if (askBand) askBand.value = state.band;
    }
    var rows = el("peopleRows");
    rows.innerHTML = "";
    var rowIds = [];
    payload.n.forEach(function (name) {
      var row = personRow();
      row.querySelector(".pname").value = name;
      rows.appendChild(row);
      rowIds.push(Number(row.dataset.rowId));
    });
    state.people = readPeople().filter(function (p) { return p.name.length > 0; });
    if (state.people.length) fireNamesAddedFill("prefill", state.people.length);
    if (payload.x && payload.x.length) {
      payload.x.forEach(function (pair) {
        state.apart.add(pairKey(rowIds[pair[0]], rowIds[pair[1]]));
      });
      renderRestrictions();
    }
    updatePeopleCount();
  }

  /* Warm state (Nov 7, 2026, santa-loop #1): a recipient who
     tapped the reveal page's hand-back lands with ?via=own plus
     the two open facts from their draw — g (group name) and b
     (budget band id). Render the tool warm: budget chip pre-
     selected to b, group-name field prefilled with g (fully
     editable and clearable; a draw for a different group just
     types over it), and the recipient-aware head line in place
     of the plain one. Fires own_draw_warm_shown once, so the
     funnel reads arrival → warm-shown → start. The values are
     read from this page's query only, validated against the
     site's own band list and the form's own 40-char name limit,
     and never sent anywhere — the fleet scrubber already cuts
     the address down to the via kind word before any event. */
  /* Creator prefill (Addendum 2066): fill the name rows from
     a roster — the draw a recipient just peeked in, a saved
     draw run back, the manage page's group. Same row shape
     the sample draft uses; nothing is drawn until the person
     taps Draw. Returns how many names landed. */
  function fillPeopleForm(names) {
    var box = el("peopleRows");
    if (!box) return 0;
    var clean = [];
    (names || []).forEach(function (n) {
      var v = truncateName(cleanName(String(n || "")).trim(), 40);
      if (v && clean.indexOf(v) === -1) clean.push(v);
    });
    clean = clean.slice(0, MAX_PEOPLE);
    if (!clean.length) return 0;
    box.innerHTML = "";
    clean.forEach(function (nm) {
      var row = personRow();
      row.querySelector(".pname").value = nm;
      box.appendChild(row);
    });
    hideErr("err2");
    updatePeopleCount();
    noteNamesMode("rows");
    setEntryMode("rows");
    fireNamesAddedFill("prefill", clean.length);
    return clean.length;
  }

  function showPrefillNote(text) {
    var note = el("prefillNote");
    if (!note) return;
    note.querySelector("p").innerHTML = "";
    note.querySelector("p").appendChild(document.createTextNode(text));
    note.hidden = false;
  }

  function bandIdForLabel(label) {
    var id = "";
    BANDS.forEach(function (x) { if (x.label === label) id = x.id; });
    return id;
  }

  /* Run it back (Addendum 2066): a returning organizer's
     last group, one tap back into the form — names, group
     and budget filled, landing on the names step ready to
     draw. Nothing is drawn until they tap Draw. */
  function runItBack(prefill, source) {
    applyBand(prefill.b || "");
    var gn = el("groupName");
    if (gn && prefill.g) gn.value = Array.from(String(prefill.g)).slice(0, 40).join("");
    var n = fillPeopleForm(prefill.names || []);
    if (n >= 3) {
      showPrefillNote(T("saved_draw.prefill_last_group") || "Your last group, filled in: names, group and budget. Change anything, then draw.");
      showStep(2);
    } else {
      showStep(1);
    }
    try {
      if (typeof fleetTrack === "function") fleetTrack("run_it_back", { tool: "secret-santa", source: source === "manage" ? "manage" : "saved-draw" });
    } catch (e) {}
    setStartSource(source === "manage" ? "manage-runback" : "saved-runback");
    var tool = el("tool");
    if (tool) tool.scrollIntoView();
  }

  function applyBand(bandId) {
    if (!bandId) return;
    state.band = bandId;
    var box = el("budgetChips");
    if (box) {
      Array.prototype.forEach.call(box.children, function (c, i) {
        c.setAttribute("aria-pressed", BANDS[i].id === state.band ? "true" : "false");
      });
    }
    var askBand = el("askBand");
    if (askBand) askBand.value = state.band;
  }

  function applyWarmState() {
    try {
      var q = new URLSearchParams(location.search);
      if (q.get("via") !== "own") return;
      var g = q.get("g") || "";
      var b = q.get("b") || "";
      var sParam = q.get("s") || "";
      var bandOk = BANDS.some(function (x) { return x.id === b; });
      /* Prefill stash (Addendum 2066): a roster left on this
         device by a reveal (recipient -> creator) or by the
         manage page's run-it-back. One-shot and a week stale
         at most; names only ever live on this device. */
      var stash = null;
      try { stash = JSON.parse(localStorage.getItem("ss_prefill_v1") || "null"); } catch (e) {}
      if (stash && (!Array.isArray(stash.names) ||
          (!stash.names.length && stash.source !== "manage-another-group") ||
          (stash.ts && Date.now() - stash.ts > 7 * 24 * 3600 * 1000))) stash = null;
      /* Stash stamp check (SPEC-SS-GEN2-STASH-CLOBBER-01): a
         hand-back stash is stamped with its source link's
         identity and the hand-back href carries the same stamp
         in `s`. A mismatch means the single stash slot now
         belongs to a DIFFERENT draw than the one this landing
         came from (a second reveal overwrote it) \u2014 ignore it
         rather than mixing one draw's group and budget with
         another's roster. Manage stashes carry no stamp and
         their landings carry no `s`: unchanged. A hand-back
         landing with no `s` (a pre-stamp href) keeps the old
         behavior. */
      if (stash && sParam &&
          (stash.source === "handback-roster" || stash.source === "handback-pair") &&
          stash.stamp !== sParam) stash = null;
      var prefillSource = "none";
      if (stash && (stash.source === "handback-roster" || stash.source === "handback-pair" ||
          stash.source === "manage-runback" || stash.source === "manage-another-group")) prefillSource = stash.source;
      if (stash) {
        if (!g && stash.g) g = String(stash.g);
        if (!bandOk && stash.b && BANDS.some(function (x) { return x.id === stash.b; })) {
          b = stash.b;
          bandOk = true;
        }
      }
      /* Roster carry (SPEC-SS-GEN2-ROSTER-CARRY-01): a short-link
         hand-back whose stash did not survive (another browser,
         a chat app's webview, a second device) can still land
         warm \u2014 the href's own code fetches the link record,
         whose names ride beside the payload, and those names
         become the roster prefill under the source word
         handback-roster-remote. The code is the only thing in
         the URL; names never appear in any URL, event, or log.
         A bogus or expired code degrades to exactly the old
         pair/blank landing, with no error shown. */
      var remoteCode = null;
      if (/^[A-Za-z0-9]{8}$/.test(sParam) &&
          !(stash && stash.names && stash.names.length >= 2)) remoteCode = sParam;
      if (!g && !bandOk && !stash && !remoteCode) return;
      var finished = false;
      function finish(remoteNames) {
        if (finished) return;
        finished = true;
        if (!g && !bandOk && !stash && !(remoteNames && remoteNames.length >= 2)) return;
        if (bandOk) {
          state.band = b;
          var box = el("budgetChips");
          Array.prototype.forEach.call(box.children, function (c, i) {
            c.setAttribute("aria-pressed", BANDS[i].id === state.band ? "true" : "false");
          });
          var askBand = el("askBand");
          if (askBand) askBand.value = state.band;
        }
        if (g) {
          var gn = el("groupName");
          if (gn && !gn.value) gn.value = Array.from(String(g)).slice(0, 40).join("");
        }
        var effNames = null, effSource = prefillSource;
        if (remoteNames && remoteNames.length >= 2) { effNames = remoteNames; effSource = "handback-roster-remote"; }
        else if (stash && stash.names.length >= 2) effNames = stash.names;
        var rosterFilled = 0;
        if (effNames) {
          rosterFilled = fillPeopleForm(effNames);
          try { localStorage.removeItem("ss_prefill_v1"); } catch (e) {}
          if (rosterFilled >= 3) {
            showPrefillNote(T("saved_draw.prefill_from_draw") || "Filled in from the draw you were in, the same names, group and budget. Change anything, then draw.");
          } else if (rosterFilled === 2) {
            showPrefillNote(T("saved_draw.prefill_two_names") || "Two names filled in from the link you opened. Add the rest of your group, then draw.");
          }
        }
        var wh = el("warmHead");
        if (wh) {
          el("warmTitle").textContent = g
            ? (TF("step1.warm_title_group", { group: g }) || ("Run it for " + g + ", or any group."))
            : (T("step1.warm_title_plain") || "Your turn to run the draw.");
          if (effSource === "manage-another-group") {
            // Another-group landing (NEW IDEA 02): budget carried,
            // names and group deliberately blank \u2014 say exactly that,
            // never the roster copy above, and spend the stash.
            try { localStorage.removeItem("ss_prefill_v1"); } catch (e) {}
            el("warmTitle").textContent = T("mine.another_group_title") || "A draw for another group.";
            var wp = wh.querySelector("p");
            if (wp) wp.textContent = T("mine.another_group_landing_line") || "Your budget carried over from your other draw. Add this group's name and names: nobody will see who anyone got.";
          }
          wh.hidden = false;
          var st = el("step1Title");
          if (st) st.hidden = true;
        }
        if (effSource !== "none") setStartSource(effSource);
        try {
          if (typeof fleetTrack === "function") {
            fleetTrack("own_draw_warm_shown", { tool: "secret-santa", prefill_source: effSource, roster_filled: rosterFilled >= 3 ? "3+" : (rosterFilled === 2 ? 2 : 0) });
          }
        } catch (e) {}
        // A full roster means the names step IS the start:
        // land there, one tap from the draw (Addendum 2066).
        if (rosterFilled >= 3) showStep(2);
      }
      if (remoteCode) {
        fetch(LINKS_API + "/" + encodeURIComponent(remoteCode))
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            var names = null;
            if (data) {
              if (!g && data.p && data.p.g) g = Array.from(String(data.p.g)).slice(0, 40).join("");
              if (!bandOk && data.p && data.p.b) {
                var rb = bandIdForLabel(data.p.b);
                if (rb) { b = rb; bandOk = true; }
              }
              if (Array.isArray(data.n)) {
                var rr = [];
                data.n.forEach(function (n) {
                  var v = cleanName(String(n || "")).trim();
                  if (v && rr.indexOf(v) === -1) rr.push(v);
                });
                if (rr.length >= 2) names = rr.slice(0, MAX_PEOPLE);
              }
            }
            finish(names);
          })
          .catch(function () { finish(null); });
      } else {
        finish(null);
      }
    } catch (e) {}
  }

  /* ---------- Short-link reveal + manage view ---------- */

  // Roster handed from a short-link record to initReveal
  // (Addendum 2066): the group names stored beside the
  // payload, used only to prefill the recipient's own draw.
  var revealRoster = null;

  // Which door this reveal came through (SPEC-SS-MEASURE-02):
  // set by the two boot paths before initReveal runs — a fixed
  // kind word only, never the code, never the path.
  var revealLinkSource = null;

  // The short-link code this reveal arrived through (gen-2
  // roster carry, SPEC-SS-GEN2-ROSTER-CARRY-01): set by
  // initShortReveal before initReveal runs; null for long
  // links. Held on this page only, exactly like PATH_CODE —
  // never an event prop, never rendered as text.
  var revealShortCode = null;

  // Peek hook (SPEC-SS-GEN2-MEASURE-01): set by initReveal's
  // hand-back block; the Peek handler calls it once so the
  // card surface's handback_shown is counted at the moment
  // the card actually opens, not at cover render.
  var revealHandbackCardShown = null;

  // A short-link arrival counts exactly like a long-link
  // arrival (SPEC-SHARE-MEASURE-1 rules, mirrored): once
  // per recipient device, never the organizer's own
  // previews within 24 hours of their draw.
  function trackShortArrival() {
    try {
      if (typeof fleetTrack !== "function") return;
      var orgTs = 0, seen = null;
      try { orgTs = parseInt(localStorage.getItem("ss_organizer_v1") || "0", 10) || 0; } catch (e) {}
      try { seen = localStorage.getItem("ss_arrived_v1"); } catch (e) {}
      if (!seen && (Date.now() - orgTs) > 24 * 60 * 60 * 1000) {
        try { localStorage.setItem("ss_arrived_v1", "1"); } catch (e) {}
        fleetTrack("share_arrival", mergeProps({ tool: "secret-santa", via: "short-link" }, drawIdProps()));
      }
    } catch (e) {}
  }

  function initShortReveal(code) {
    el("organizer").hidden = true;
    var rev = el("reveal");
    rev.hidden = false;
    el("coverLine").textContent = T("reveal.opening_link") || "Opening your private link…";
    var pb = el("peekBtn");
    if (pb) pb.hidden = true;
    fetch(LINKS_API + "/" + encodeURIComponent(code))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.p) throw new Error("gone");
        var trk = null;
        if (data.t && /^[a-f0-9]{28}$/.test(data.t)) {
          trk = { d: data.t.slice(0, 16), k: data.t.slice(16) };
        }
        revealDrawId = validDrawId(data.di) ? data.di : null;
        trackShortArrival();
        // The identical reveal the long link runs — same
        // cover, same one-tap Peek, same gift picks, same
        // progress notes (the stored ref rides along).
        revealRoster = null;
        if (Array.isArray(data.n)) {
          var rr = data.n.map(function (n) { return cleanName(String(n || "")).trim(); }).filter(Boolean);
          if (rr.length >= 3) revealRoster = rr.slice(0, MAX_PEOPLE);
        }
        revealLinkSource = "short-link";
        revealShortCode = code;
        // SPEC-SS-AMIGO-01: the payload's language wins before
        // the reveal renders — a Spanish draw's recipient never
        // sees an English cover, not even for one frame.
        if (data.p.l === "es") setLang("es");
        initReveal(data.p, trk);
        if (pb) pb.hidden = false;
      })
      .catch(function () {
        try { sessionStorage.removeItem("ss_path_v1"); } catch (e) {}
        showRevealError();
      });
  }

  function trackManageAction(action) {
    try {
      if (typeof fleetTrack === "function") {
        fleetTrack("manage_action", mergeProps({ tool: "secret-santa", action: action }, drawIdProps()));
      }
    } catch (e) {}
  }

  function renderManageRows(box, code, rec, byKey, failed) {
    box.innerHTML = "";
    var wrap = make("div", "pstrip opensview");
    wrap.setAttribute("data-fyg-watch", "");
    wrap.appendChild(make("p", "pline", T("progress.who_opened_title") || "Who has opened their link"));
    if (failed) {
      wrap.appendChild(make("p", "hint",
        T("progress.could_not_check_manage") || "Could not check opens just now. The links below still work: check again in a bit."));
    } else {
      var opened = 0, seen = 0;
      rec.people.forEach(function (person) {
        var e = byKey[person.k];
        if (e && e.r) { opened++; seen++; }
        else if (e && e.o) { opened++; }
      });
      wrap.appendChild(make("p", null,
        TF("progress.opened_summary", { opened: opened, total: rec.people.length, seen: seen }) ||
        (opened + " of " + rec.people.length + " have opened · " + seen + " saw their match")));
      var bar = make("div", "pbar");
      var fill = make("div", "pfill");
      fill.style.width = (rec.people.length ? Math.round((opened / rec.people.length) * 100) : 0) + "%";
      bar.appendChild(fill);
      wrap.appendChild(bar);
    }
  /* Rename (SPEC-SS-ORGANIZER-EDIT-01): one button per manage
     row, revoked rows included — a dead link's name still shows
     on the manage page and in the live giver's link, so it can
     still be fixed. The first tap opens the editor (the arm);
     Save is the confirm. The server patches labels only; the
     pairing never changes. */
  function attachRename(box, code, rec, row, person) {
    var btn = make("button", "altbtn", TF("mine.rename_btn", { name: person.n }) || ("Rename " + person.n));
    btn.type = "button";
    btn.addEventListener("click", function () {
      if (row.querySelector(".renamebox")) return;
      btn.disabled = true;
      var edit = make("div", "renamebox");
      var input = document.createElement("input");
      input.type = "text";
      input.value = person.n;
      input.maxLength = 40;
      input.setAttribute("aria-label", TF("mine.rename_aria", { name: person.n }) || ("New name for " + person.n));
      edit.appendChild(input);
      var srow = make("div", "row");
      var saveBtn = make("button", null, T("mine.rename_save") || "Save new name");
      saveBtn.type = "button";
      var cancelBtn = make("button", "altbtn", T("mine.rename_cancel") || "Cancel");
      cancelBtn.type = "button";
      srow.appendChild(saveBtn);
      srow.appendChild(cancelBtn);
      edit.appendChild(srow);
      var err = make("p", "hint", "");
      err.hidden = true;
      edit.appendChild(err);
      edit.appendChild(make("p", "hint",
        T("mine.rename_note") || "This fixes the name on the manage page and on private links that open through this site from now on. A long link you already sent keeps the old name: it was sealed when you sent it."));
      row.appendChild(edit);
      try { input.focus(); input.select(); } catch (e) {}
      cancelBtn.addEventListener("click", function () { loadManageRows(box, code, rec); });
      saveBtn.addEventListener("click", function () {
        var newName = cleanName(input.value).trim();
        err.hidden = true;
        if (!newName || newName.length > 40) {
          err.textContent = T("mine.rename_err_bad") || "That name doesn\u2019t work: check it and try again.";
          err.hidden = false;
          return;
        }
        if (newName === person.n) { loadManageRows(box, code, rec); return; }
        saveBtn.disabled = true;
        cancelBtn.disabled = true;
        fetch(GROUPS_API + "/" + code + "/rename", {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ c: person.c, name: newName })
        }).then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            if (data && data.ok) {
              trackManageAction("rename");
              person.n = newName;
              var rb = document.getElementById("manageReceiptBox");
              if (rb) buildReceipt(rb, {
                group: rec.g, date: rec.date, budget: rec.b,
                names: rec.people.map(function (p) { return p.n; }),
                pairs: rec.pairs
              });
              loadManageRows(box, code, rec);
            } else {
              saveBtn.disabled = false;
              cancelBtn.disabled = false;
              err.textContent = T("mine.rename_err_save") || "That name couldn\u2019t be saved: it may match another name in the group, or the draw couldn\u2019t be checked. Try again.";
              err.hidden = false;
            }
          })
          .catch(function () {
            saveBtn.disabled = false;
            cancelBtn.disabled = false;
            err.textContent = T("mine.rename_err_conn") || "That name couldn\u2019t be saved: check your connection and try again.";
            err.hidden = false;
          });
      });
    });
    row.appendChild(btn);
  }

    rec.people.forEach(function (person) {
      var e = byKey ? byKey[person.k] : null;
      var row = make("div", "prow");
      row.appendChild(make("span", "pname", person.n));
      if (person.x) {
        row.appendChild(make("span", "pchip", T("manage_view.link_revoked_chip") || "Link revoked"));
        attachRename(box, code, rec, row, person);
        wrap.appendChild(row);
        return;
      }
      if (!failed) {
        if (e && e.r) row.appendChild(make("span", "pchip seen", T("progress.seen_chip") || "Saw their match"));
        else if (e && e.o) row.appendChild(make("span", "pchip opened", T("progress.opened_chip") || "Opened"));
        else row.appendChild(make("span", "pchip", T("progress.not_opened_chip") || "Not opened yet"));
      }
      var url = SHORT_BASE + "/s/" + person.c;
      var copyBtn = make("button", "altbtn", TF("manage_view.copy_link_for", { name: person.n }) || ("Copy " + person.n + "'s link"));
      copyBtn.type = "button";
      copyBtn.addEventListener("click", function () { trackShare("clipboard", "link", person.n); trackManageAction("copy-link"); copyText(url, copyBtn, (T("share.copied") || "Copied")); });
      row.appendChild(copyBtn);
      if (!failed && !(e && (e.o || e.r))) {
        var nb = make("button", "altbtn", TF("messages.copy_nudge_for", { name: person.n }) || ("Copy a nudge for " + person.n));
        nb.type = "button";
        nb.addEventListener("click", function () {
          trackShare("clipboard", "message", person.n); trackManageAction("copy-nudge");
          copyText(nudgeText({ budget: rec.b }, person.n, url), nb, (T("share.copied") || "Copied"));
        });
        row.appendChild(nb);
      }
      var revBtn = make("button", "altbtn", TF("manage_view.revoke_link", { name: person.n }) || ("Revoke " + person.n + "'s link"));
      revBtn.type = "button";
      var armed = false, armTimer = null;
      revBtn.addEventListener("click", function () {
        if (!armed) {
          armed = true;
          revBtn.textContent = T("manage_view.revoke_armed") || "Tap again to revoke for good";
          armTimer = setTimeout(function () {
            armed = false;
            revBtn.textContent = TF("manage_view.revoke_link", { name: person.n }) || ("Revoke " + person.n + "'s link");
          }, 4000);
          return;
        }
        clearTimeout(armTimer);
        armed = false;
        trackManageAction("revoke");
        revBtn.disabled = true;
        fetch(GROUPS_API + "/" + code + "/revoke", {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ c: person.c })
        }).then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            if (data && data.ok) {
              person.x = true;
              loadManageRows(box, code, rec);
            } else {
              revBtn.disabled = false;
              revBtn.textContent = TF("manage_view.revoke_link", { name: person.n }) || ("Revoke " + person.n + "'s link");
            }
          })
          .catch(function () {
            revBtn.disabled = false;
            revBtn.textContent = TF("manage_view.revoke_link", { name: person.n }) || ("Revoke " + person.n + "'s link");
          });
      });
      attachRename(box, code, rec, row, person);
      row.appendChild(revBtn);
      wrap.appendChild(row);
    });
    var again = make("button", "secondary", T("progress.check_again") || "Check again");
    again.type = "button";
    again.style.marginTop = "10px";
    again.addEventListener("click", function () { trackManageAction("check-again"); loadManageRows(box, code, rec); });
    wrap.appendChild(again);
    wrap.appendChild(make("p", "hint",
      T("progress.opens_only_note_manage") || "Opens only. This page never shows who anyone got: each match is shown only through that person's own link."));
    box.appendChild(wrap);
  }

  function loadManageRows(box, code, rec) {
    fetch(PROGRESS_API + "?d=" + encodeURIComponent(rec.d) +
      "&ks=" + encodeURIComponent(rec.people.map(function (p) { return p.k; }).join(",")))
      .then(function (r) { if (!r.ok) throw new Error("bad"); return r.json(); })
      .then(function (data) { renderManageRows(box, code, rec, (data && data.p) || {}, false); })
      .catch(function () { renderManageRows(box, code, rec, null, true); });
  }

  function renderManage(sec, code, rec) {
    sec.innerHTML = "";
    sec.appendChild(make("h2", null, rec.g));
    // SPEC-SS-COLDQA-01: no summary line here — the receipt below is the
    // single statement of date / count / budget on the manage page; the
    // old line printed all three a second time above it.
    var opensBox = make("div", null);
    sec.appendChild(opensBox);
    loadManageRows(opensBox, code, rec);
    var receiptBox = make("div", null);
    receiptBox.id = "manageReceiptBox";
    buildReceipt(receiptBox, {
      group: rec.g, date: rec.date, budget: rec.b,
      names: rec.people.map(function (p) { return p.n; }),
      pairs: rec.pairs, omitGroupLine: true
    });
    sec.appendChild(receiptBox);
    var url = SHORT_BASE + "/g/" + code;
    var card = make("div", "sharecard");
    card.appendChild(make("p", "who", T("manage_view.your_group_link") || "Your group link"));
    // SPEC-SS-COLDQA-03: this page IS the manage link — printing its own
    // URL as text helped no one. The address rides the Copy button only.
    var row = make("div", "row");
    var copyBtn = make("button", null, T("manage_card_on_share.copy_manage_link") || "Copy manage link");
    copyBtn.type = "button";
    copyBtn.addEventListener("click", function () { trackShare("clipboard", "manage_link"); trackManageAction("copy-manage"); copyText(url, copyBtn, (T("share.copied") || "Copied")); });
    row.appendChild(copyBtn);
    card.appendChild(row);
    card.appendChild(make("p", "hint",
      T("manage_view.group_link_warning") || "Anyone with this link can manage the draw: keep it like a password."));
    sec.appendChild(card);
    var backBtn2 = make("button", "secondary", T("manage_view.run_it_back") || "Run it back with this group");
    backBtn2.type = "button";
    backBtn2.addEventListener("click", function () {
      try {
        localStorage.setItem("ss_prefill_v1", JSON.stringify({
          g: rec.g, b: bandIdForLabel(rec.b),
          names: rec.people.map(function (p) { return p.n; }),
          source: "manage-runback",
          ts: Date.now()
        }));
      } catch (e) {}
      // A manage run-back is an organizer bringing their own
      // group back — it must never read as a recipient
      // hand-back conversion (SPEC-SS-MEASURE-04.4/05).
      try {
        if (typeof fleetTrack === "function") fleetTrack("run_it_back", { tool: "secret-santa", source: "manage" });
      } catch (e) {}
      setStartSource("manage-runback");
      try { sessionStorage.removeItem("ss_path_v1"); } catch (e) {}
      location.href = "/?via=own#tool";
    });
    sec.appendChild(backBtn2);
    sec.appendChild(make("p", "hint",
      T("manage_view.run_it_back_note") || "Start a new draw with the same names and budget, filled in on this device."));
    // Another group (NEW IDEA 02): the proven second motion —
    // same organizer, DIFFERENT group (office done, family next).
    // One card on the manage view only, never the recipient side:
    // budget + settings ride the 2066 prefill-stash mechanism with
    // names EMPTY and the group blank; the draw it leads to counts
    // under start_source "manage-another-group" (MEASURE-05 split).
    var anotherCard = make("div", "sharecard");
    anotherCard.appendChild(make("p", "who", T("mine.manage_another_title") || "Running another group too?"));
    anotherCard.appendChild(make("p", "hint",
      T("mine.manage_another_line") || "Start a fresh draw with this draw's budget, new group, new names, filled in on this device."));
    var anotherRow = make("div", "row");
    var anotherBtn = make("button", null, T("mine.another_group_btn") || "Start a draw for another group");
    anotherBtn.type = "button";
    anotherBtn.addEventListener("click", function () {
      try {
        localStorage.setItem("ss_prefill_v1", JSON.stringify({
          g: "", b: bandIdForLabel(rec.b),
          names: [],
          source: "manage-another-group",
          ts: Date.now()
        }));
      } catch (e) {}
      trackManageAction("another-group");
      setStartSource("manage-another-group");
      try { sessionStorage.removeItem("ss_path_v1"); } catch (e) {}
      location.href = "/?via=own#tool";
    });
    anotherRow.appendChild(anotherBtn);
    anotherCard.appendChild(anotherRow);
    sec.appendChild(anotherCard);
    var homeBtn = make("button", "secondary", T("manage_view.back_to_tool") || "Back to the tool");
    homeBtn.type = "button";
    homeBtn.addEventListener("click", function () {
      try { sessionStorage.removeItem("ss_path_v1"); } catch (e) {}
      location.href = "/";
    });
    sec.appendChild(homeBtn);
  }

  function initManage(code) {
    el("organizer").hidden = true;
    var org = el("organizer");
    var sec = make("section", "block");
    sec.id = "manageView";
    sec.setAttribute("aria-label", T("manage_view.aria_label") || "Manage this draw");
    org.parentNode.insertBefore(sec, org.nextSibling);
    var status = make("p", "sub", T("manage_view.opening_group") || "Opening your group…");
    sec.appendChild(status);
    var manageResponded = false;
    fetch(GROUPS_API + "/" + encodeURIComponent(code))
      .then(function (r) { manageResponded = true; return r.ok ? r.json() : null; })
      .then(function (rec) {
        if (!rec || !Array.isArray(rec.people) || !rec.people.length) throw new Error("gone");
        manageDrawId = validDrawId(rec.di) ? rec.di : null;
        try {
          if (typeof fleetTrack === "function") {
            fleetTrack("manage_opened", mergeProps({ tool: "secret-santa", result: "ok", people_bucket: groupSizeBucket(rec.people.length) }, drawIdProps()));
          }
        } catch (e) {}
        // SPEC-SS-AMIGO-01: the group record's language wins
        // before the view renders — the manage page speaks the
        // language the draw was run in.
        if (rec.lang === "es") {
          setLang("es");
          sec.setAttribute("aria-label", T("manage_view.aria_label") || "Manage this draw");
        }
        renderManage(sec, code, rec);
      })
      .catch(function () {
        try {
          if (typeof fleetTrack === "function") {
            fleetTrack("manage_opened", { tool: "secret-santa", result: manageResponded ? "not-found" : "load-error" });
          }
        } catch (e) {}
        // SPEC-RW-01 (Nov 9, 2026): the manage error gets a real
        // headline (it was one small gray paragraph, easy to miss)
        // and the same paste recovery as the other error views.
        sec.innerHTML = "";
        sec.appendChild(make("h2", null, T("manage_view.bad_link_title") || "This manage link does not work."));
        sec.appendChild(make("p", "sub", T("manage_view.bad_link_body") || "It may have been replaced by a newer one. On the device that ran the draw, open your saved draw and copy the current group link."));
        var mLab = make("label", "lab", T("recovery.paste_label") || "Have the full link in a message? Paste it here.");
        mLab.htmlFor = "managePasteBox";
        sec.appendChild(mLab);
        var mBox = make("input", null); mBox.type = "text"; mBox.id = "managePasteBox";
        mBox.setAttribute("autocomplete", "off");
        mBox.setAttribute("placeholder", T("recovery.paste_placeholder") || "Paste your full link");
        sec.appendChild(mBox);
        var mRow = make("div", "navrow");
        var mBtn = make("button", "primary", T("recovery.open_my_link") || "Open my link");
        mBtn.type = "button"; mBtn.id = "managePasteBtn";
        mRow.appendChild(mBtn); sec.appendChild(mRow);
        var mErr = make("p", "hint", T("recovery.bad_paste") || "That link doesn\u2019t work. Check you copied the whole thing.");
        mErr.id = "managePasteErr"; mErr.hidden = true;
        sec.appendChild(mErr);
        initPasteRecovery("managePasteBox", "managePasteBtn", "managePasteErr");
      });
  }

  /* Paste-a-link recovery (NEW IDEA 03): the stripped-link
     notice (Addendum 2075) was honest but a dead end, while the
     recipient usually still has the full link as text in the
     chat — the tap lost the private part, the message did not.
     One paste box on the notice only. The pasted text is read
     once, on this device, and cleared the moment it is read:
     it is never rendered back as visible text (the 2059 rule),
     never stored, and never sent anywhere. A recovered link
     routes exactly as if it had arrived intact. */
  function initPasteRecovery(boxId, btnId, errId) {
    var box = document.getElementById(boxId || "pasteLinkBox");
    var btn = document.getElementById(btnId || "pasteLinkBtn");
    var err = document.getElementById(errId || "pasteLinkErr");
    if (!box || !btn || box.getAttribute("data-wired")) return;
    box.setAttribute("data-wired", "1");
    function attempt() {
      var text = String(box.value || "");
      box.value = "";
      if (err) err.hidden = true;
      var pm = /#p=([A-Za-z0-9\-_]+)/.exec(text);
      var sm = /\/(s|g)\/([A-Za-z0-9]{8})(?![A-Za-z0-9])/.exec(text);
      text = "";
      if (pm && pm[1]) {
        // Setting the hash reboots into the reveal through the
        // boot hashchange handler — the identical arrival path.
        location.hash = "#p=" + pm[1];
        return;
      }
      if (sm) { location.href = "/" + sm[1] + "/" + sm[2]; return; }
      if (err) err.hidden = false;
    }
    btn.addEventListener("click", attempt);
    box.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); attempt(); }
    });
    box.addEventListener("paste", function () { setTimeout(attempt, 0); });
  }

  /* ---------- Boot ---------- */
  function boot() {
    // Short + manage links first (Nov 7, 2026): the code
    // was lifted out of the address at load; route on it
    // before anything else. A #p= link never sets it.
    if (PATH_CODE && PATH_CODE.kind === "s") { initShortReveal(PATH_CODE.code); return; }
    if (PATH_CODE && PATH_CODE.kind === "g") { initManage(PATH_CODE.code); return; }
    var m = /#p=([A-Za-z0-9\-_]+)/.exec(location.hash || "");
    var bootToken = m ? m[1] : null;
    // A private link pasted into an already-open tab arrives as a
    // hash change, not a fresh load. Reboot into the reveal view
    // for the NEW link. This must register on the reveal path too
    // (SAFETY LANE 3, Oct 31, 2026): it used to register only on
    // the organizer path and only while the reveal was hidden, so
    // on a shared device a second person's link opened in the
    // first person's tab silently kept showing the first match.
    // Reload only when the token actually changes, so re-tapping
    // your own link does nothing.
    window.addEventListener("hashchange", function () {
      var nm = /#p=([A-Za-z0-9\-_]+)/.exec(location.hash || "");
      if (nm && nm[1] !== bootToken) location.reload();
    });
    if (m) {
      revealLinkSource = "share-link";
      initReveal(CORE.parseToken(m[1]), parseTrkRef());
      return;
    }
    // Stripped-link arrival (Nov 7, 2026, office-sim): a share link
    // whose private #p= part was cut off in transit (some apps and
    // in-app browsers drop the fragment) used to land silently on
    // the organizer home — on the organizer's own phone that renders
    // their saved draw, which reads exactly like "the link opened
    // the organizer screen." Say what happened, out loud, instead.
    try {
      var viaQ = new URLSearchParams(location.search || "").get("via");
      // An empty #p= token is a stripped link too (Addendum
      // 2070, SPEC-SS-VERIFY2065-03): the marker survived but
      // the token did not. A valid token returned above; a
      // garbage one lands on the reveal error view — only the
      // empty one used to slip through to a silent home.
      var pEmpty = /^#p=(&|$)/.test(location.hash || "");
      if (viaQ === "share" || PATH_STRIPPED || pEmpty) {
        var ln = document.getElementById("linkMissingNote");
        if (ln) { ln.hidden = false; ln.setAttribute("tabindex", "-1"); ln.focus({ preventScroll: false }); }
        initPasteRecovery();
      }
    } catch (e) {}
    initStep1();
    initStep2();
    initAsk();
    initStep3();
    initSavedSection();
    showReturnHook();
    var setupPayload = null;
    try {
      setupPayload = window.__SS_SETUP ? CORE.parseSetupToken(window.__SS_SETUP) : null;
    } catch (e) { setupPayload = null; }
    if (setupPayload) applySetup(setupPayload);
    applyWarmState();
    el("startBtn").addEventListener("click", function () {
      setTimeout(function () { el("groupName").focus({ preventScroll: true }); }, 350);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
