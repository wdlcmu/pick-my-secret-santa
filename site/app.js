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

  function el(id) { return document.getElementById(id); }
  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- Reveal view (private link) ---------- */
  function initReveal(payload) {
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
      el("revealCover").hidden = true;
      el("revealError").hidden = false;
      return;
    }
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
    el("coverLine").textContent = "This one is for " + payload.you + ".";
    if (payload.b) {
      var cb = el("coverBudget");
      cb.textContent = "Budget: " + payload.b;
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
      var cat = p.category || "Gift idea";
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
        ? "Gift idea " + (pickIdx % picks.length + 1) + " of " + picks.length + "."
        : "";
    }
    el("peekBtn").addEventListener("click", function () {
      markSeen();
      trackRevealOpened();
      el("revealCover").hidden = true;
      el("revealCard").hidden = false;
      el("hiLine").textContent = "Hi " + payload.you + ". You got:";
      el("gotName").textContent = payload.got;
      el("budgetLine").textContent = "Budget: " + payload.b;
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
    x.fillText("a private match card", 540, 155);
    x.fillStyle = "#2a2118";
    x.font = "600 44px sans-serif";
    x.fillText(payload.you + ", you got:", 540, 330);
    x.fillStyle = "#9c1f24";
    x.font = "800 92px sans-serif";
    wrapText(x, payload.got, 540, 450, 920, 100, 2);
    x.fillStyle = "#2a2118";
    x.font = "700 40px sans-serif";
    x.fillText("Budget: " + payload.b, 540, 620);
    x.font = "800 46px sans-serif";
    x.fillStyle = "#17603c";
    var y = wrapText(x, "Gift pick: " + pick.name, 540, 720, 920, 58, 3);
    x.fillStyle = "#71634f";
    x.font = "400 36px sans-serif";
    wrapText(x, pick.why, 540, y + 16, 880, 48, 3);
    x.fillStyle = "#71634f";
    x.font = "600 34px sans-serif";
    x.fillText("Pick My Secret Santa", 540, 1010);
    var a = document.createElement("a");
    a.download = "my-secret-santa-card.png";
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
      var btn = make("button", "chip", b.label);
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

  // Step 2 — people rows
  function personRow() {
    var rowId = state.nextRow++;
    var row = make("div", "prow");
    var name = document.createElement("input");
    name.type = "text"; name.className = "pname"; name.maxLength = 40;
    name.placeholder = "Name"; name.autocomplete = "off";
    name.setAttribute("aria-label", "Person name");
    var hint = document.createElement("select");
    hint.className = "phint";
    hint.setAttribute("aria-label", "What they like (optional)");
    INTERESTS.forEach(function (pair) {
      var o = document.createElement("option");
      o.value = pair[0]; o.textContent = pair[1];
      hint.appendChild(o);
    });
    var rm = make("button", "prm", "×");
    rm.type = "button"; rm.setAttribute("aria-label", "Remove person");
    rm.addEventListener("click", function () {
      row.remove();
      dropPersonRestrictions(rowId);
    });
    // Wishlist note (R2-2): one free-text line under the name,
    // for this person's Santa. It stays on this device (see the
    // step-2 hint and the reveal block for exactly where it can
    // appear); it is never put in a link.
    var wish = document.createElement("input");
    wish.type = "text"; wish.className = "pwish"; wish.maxLength = 200;
    wish.placeholder = "Wishlist note for their Santa (optional)";
    wish.autocomplete = "off";
    wish.setAttribute("aria-label", "Wishlist note for their Santa (optional)");
    row.appendChild(name); row.appendChild(hint); row.appendChild(rm);
    row.appendChild(wish);
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
      line.textContent = n + " people added. You can draw now, or set pairs first.";
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
          INTERESTS[i][1].toLowerCase() === key) return INTERESTS[i][0];
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
    var people = [], noName = 0;
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
      people.push(person);
    });
    return { people: people, noName: noName };
  }

  function importBulk(text) {
    var box = el("peopleRows");
    var parsed = parseBulk(text);
    var summary = el("bulkSummary");
    if (!parsed.people.length && !parsed.noName) {
      summary.textContent = "No names found. Paste one name on each line.";
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
      added++;
      addedNames.push(p.name);
      if (p.unknown) unknown++;
    });
    var parts = [];
    parts.push("Added " + added + (added === 1 ? " person." : " people."));
    if (unknown) {
      parts.push(unknown + (unknown === 1 ? " name had" : " names had") +
        " an interest we do not know. Added with no interest.");
    }
    if (parsed.noName) {
      parts.push(parsed.noName + (parsed.noName === 1 ? " line" : " lines") +
        " skipped. Each line needs a name first.");
    }
    if (capped) {
      parts.push(capped + (capped === 1 ? " line" : " lines") +
        " skipped — over the 30 person limit.");
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
      parts.push("Two people share a name. Check each link twice.");
    }
    summary.textContent = parts.join(" ");
    summary.hidden = false;
    updatePeopleCount();
  }

  function initStep2() {
    var box = el("peopleRows");
    for (var i = 0; i < 4; i++) box.appendChild(personRow());
    box.addEventListener("input", updatePeopleCount);
    box.addEventListener("click", updatePeopleCount);
    el("addPerson").addEventListener("click", function () {
      if (box.children.length >= MAX_PEOPLE) {
        showErr("err2", "Thirty people is the most for one draw.");
        return;
      }
      var row = personRow();
      box.appendChild(row);
      row.querySelector(".pname").focus();
    });
    el("bulkToggle").addEventListener("click", function () {
      var panel = el("bulkPanel");
      panel.hidden = !panel.hidden;
      if (!panel.hidden) el("bulkText").focus();
    });
    el("bulkClose").addEventListener("click", function () {
      el("bulkPanel").hidden = true;
    });
    el("bulkAdd").addEventListener("click", function () {
      var text = el("bulkText").value;
      if (!text.trim()) {
        var s = el("bulkSummary");
        s.textContent = "Paste names first, one on each line.";
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
      reader.onload = function () { importBulk(String(reader.result || "")); };
      reader.readAsText(f);
      input.value = "";
    });
    el("back1").addEventListener("click", function () { showStep(1); });
    el("toStep3").addEventListener("click", function () {
      var people = readPeople().filter(function (p) { return p.name.length > 0; });
      if (people.length < 3) {
        showErr("err2", "Add at least three names.");
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
        showErr("err2", "Add at least three names.");
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
      if (INTERESTS[i][0] === interest) return INTERESTS[i][1];
    }
    return interest;
  }
  function renderAskResults(res, band) {
    var box = el("askResults");
    box.innerHTML = "";
    var bandLabel = BANDS.filter(function (b) { return b.id === band; })[0].label;
    if (res.empty) {
      box.appendChild(make("p", null, "Type a few words first."));
      box.appendChild(make("p", null, "What they do, eat, read, or play is plenty."));
      box.hidden = false;
      return;
    }
    if (res.heard.length) {
      box.appendChild(make("p", "summaryline",
        "What I heard: " + res.heard.map(askHeardLabel).join(", ") + "."));
    } else {
      box.appendChild(make("p", "summaryline",
        "Your words did not match a known interest."));
    }
    if (!res.matched) {
      box.appendChild(make("p", null,
        "Here are six picks that fit your budget: " + bandLabel + "."));
    } else if (res.backfilled > 0) {
      box.appendChild(make("p", null,
        (res.picks.length - res.backfilled) +
        (res.picks.length - res.backfilled === 1 ? " pick matched" : " picks matched") +
        " your words. The rest fit your budget: " + bandLabel + "."));
    } else {
      box.appendChild(make("p", null, "Six picks matched your words."));
    }
    res.picks.forEach(function (p) {
      var card = make("div", "askcard");
      card.appendChild(make("span", "cat", "\uD83C\uDF81 " + (p.category || "Gift idea")));
      card.appendChild(make("h3", null, p.name));
      if (p.blurb) card.appendChild(make("p", null, p.blurb));
      card.appendChild(make("p", null, p.why));
      var ties = (p.interests || []).filter(function (x) { return res.heard.indexOf(x) >= 0; });
      if (ties.length) {
        card.appendChild(make("p", "whyline",
          "Picked because you said: " + ties.map(askHeardLabel).join(", ") + "."));
      }
      card.appendChild(make("p", "spec", p.spec));
      box.appendChild(card);
    });
    box.appendChild(make("p", "hint", res.heard.length
      ? "Like these picks? Set that interest on their row above. Their private link will carry picks like these."
      : "Or pick an interest on their row above. Their private link will carry picks for it."));
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
      /who drew/, /who drew whom/, /who draws names/,
      /who picked my name/, /who has my name/, /who got my name/,
      /who is buying/, /who's buying/, /who bought for me/,
      /who (bought|buys) (((a|the) (gift|present)|one|something) )?for me/,
      /who got ((a|the) (gift|present) )?for me/,
      /buying (a gift |one )?for me/,
      /who is my (secret )?santa/, /who's my (secret )?santa/,
      /who is my match/, /who matched/,
      /who (did|does) [a-z ]{0,30}?(draw|drew|get|got|pick|picked|buy|bought)/,
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
      /lost (the |my )?links?[^.?!]{0,60}\b(who|pairing|match|drew|reveal)\b/
    ];
    for (var i = 0; i < pats.length; i++) { if (pats[i].test(t)) return true; }
    /* "Who got <a name>?" (Addendum 896): the word after "got" --
       past one my/the/a/an -- is a person's name, not the start
       of a gift-idea ask. The stop list keeps ordinary asks
       safe: gift words and adjectives ("who got the best gift
       ideas"), pronouns and relative clauses ("my grandma who
       got me into baking"), and prepositions. */
    var gm = t.match(/who got (?:my |the |a |an )?([a-z]+)/);
    if (gm && !/^(the|a|an|best|good|great|top|perfect|cool|nice|cheap|awesome|amazing|fun|right|same|real|big|little|small|me|my|us|you|it|this|that|them|him|her|his|their|our|your|he|she|we|they|who|whom|everyone|everybody|someone|somebody|anyone|anybody|nobody|gift|gifts|present|presents|idea|ideas|something|anything|nothing|everything|into|in|on|at|to|for|with|from|over|about)$/.test(gm[1])) return true;
    if (/reveal/.test(t) && /(match|who|all|list|draw|pairing)/.test(t)) return true;
    if (/print/.test(t) && /(draw|pairing|match|giver|receiver)/.test(t)) return true;
    if (/peek/.test(t) && /(match|draw|assign|pairing|who|result|list|them|every)/.test(t)) return true;
    return false;
  }
  function renderAskSecrecy() {
    var box = el("askResults");
    box.innerHTML = "";
    box.appendChild(make("p", "summaryline", "Matches stay secret."));
    box.appendChild(make("p", null,
      "Your screen shows names and links only. It never shows the matches."));
    box.appendChild(make("p", null,
      "Each match lives inside its private link."));
    box.appendChild(make("p", null,
      "There is no master list of who got whom."));
    box.appendChild(make("p", "hint",
      "Open your own private link to see just your match."));
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
        note.textContent = "That pair is kept apart by Kids and adults apart. Change it with that button below.";
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
        if (pressed) label += " (kid)";
      } else if (state.capture) {
        pressed = state.captureSel.indexOf(p.rowId) !== -1;
      } else {
        pressed = state.restrictPerson === p.rowId;
        if (state.kidRows.has(p.rowId)) label += " (kid)";
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
  }

  function renderRestrictMain() {
    var sel = personByRow(state.restrictPerson);
    var list = el("restrictList");
    list.innerHTML = "";
    if (!sel) { el("restrictForLabel").textContent = ""; return; }
    el("restrictForLabel").textContent = sel.name + " must not draw:";
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
      var b = make("button", "secondary", label || "Done");
      b.type = "button";
      b.addEventListener("click", function () {
        state.capture = null; state.captureSel = [];
        renderRestrictions();
      });
      return b;
    }
    if (state.capture === "couple" || state.capture === "lastyear") {
      var couple = state.capture === "couple";
      title.textContent = couple ? "Couples apart" : "Last year's pairs";
      text.textContent = state.captureSel.length === 0
        ? (couple ? "Tap the first person in a couple."
                  : "Tap the first of two people who drew each other last year.")
        : "Now tap the other person. The pair is kept apart.";
      acts.appendChild(doneBtn());
    } else if (state.capture === "kids") {
      title.textContent = "Kids and adults apart";
      var kids = state.kidRows.size;
      var adults = state.people.length - kids;
      text.textContent = state.kidsApart
        ? "On: no kid draws an adult, and no adult draws a kid. Tap a name to fix a tag."
        : "Tap every kid. Everyone not tapped counts as an adult.";
      var apply = make("button", "secondary",
        state.kidsApart ? "Turn off kids and adults apart" : "Keep kids and adults apart");
      apply.type = "button";
      if (!state.kidsApart && (kids === 0 || adults === 0)) {
        apply.disabled = true;
        text.textContent += kids === 0
          ? " Tag at least one kid first."
          : " Every name is tagged as a kid — leave one adult untagged.";
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
      ? "No pairs are kept apart."
      : pairs.length + (pairs.length === 1 ? " pair is" : " pairs are") + " kept apart.";
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
        "Remove the keep-apart rule for " + a.name + " and " + b.name);
      x.addEventListener("click", function () {
        state.apart.delete(k); state.couplePairs.delete(k); state.lastPairs.delete(k);
        renderRestrictions();
      });
      chip.appendChild(x);
      box.appendChild(chip);
    }
    state.apart.forEach(function (k) { chipFor(k, ""); });
    state.couplePairs.forEach(function (k) { if (!state.apart.has(k)) chipFor(k, "couple"); });
    state.lastPairs.forEach(function (k) {
      if (!state.apart.has(k) && !state.couplePairs.has(k)) chipFor(k, "last year");
    });
    var kl = el("kidsLine");
    if (state.kidsApart && state.kidRows.size &&
        state.kidRows.size < state.people.length) {
      var cross = state.kidRows.size * (state.people.length - state.kidRows.size);
      kl.textContent = "Kids and adults apart adds " + cross +
        (cross === 1 ? " pair" : " pairs") + ".";
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
    // Group rules message (Oct 30, 2026, vs-AI gift-depth build):
    // the Oct 29 study's Q4 asked for a rules message the
    // organizer can send the whole group, and the site only had
    // per-person messages. This copies one ready message: group,
    // budget, secrecy, and how the links work. No exchange date
    // is invented — the site does not hold one.
    el("groupMsgBtn").addEventListener("click", function () {
      trackShare("clipboard", "group_message");
      var btn = el("groupMsgBtn");
      var raw = groupNameValue();
      var bandLabel = BANDS.filter(function (b) { return b.id === state.band; })[0].label;
      var msg = (raw ? "Our " + raw + " Secret Santa draw is ready."
                     : "Our Secret Santa draw is ready.") +
        " Budget: " + bandLabel + "." +
        " I will send each person a private link." +
        " Your link shows only your match." +
        " Keep your match secret." +
        " Please stay inside the budget.";
      copyText(msg, btn, "Copied");
    });
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
        var entry = "draw";
        try {
          if (new URLSearchParams(location.search).get("via") === "own") entry = "own-draw";
        } catch (e) {}
        fleetTrack("tool_start", { tool: "secret-santa", entry: entry, people_count: count });
      }
    } catch (e) {}
  }
  function trackDrawComplete(count) {
    try {
      if (typeof fleetTrack === "function") {
        fleetTrack("tool_complete", { tool: "secret-santa", results_count: count });
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
        fleetTrack("reveal_opened", { tool: "secret-santa" });
      }
    } catch (e) {}
  }
  function trackArtifact() {
    try {
      if (typeof fleetTrack === "function") {
        fleetTrack("artifact_created", { tool: "secret-santa", artifact: "match-card" });
      }
    } catch (e) {}
  }
  function trackReceiptImage() {
    try {
      if (typeof fleetTrack === "function") {
        fleetTrack("artifact_created", { tool: "secret-santa", artifact: "sealed-receipt" });
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
     closing the tab, and it renders a shareable "draw sealed"
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
    return MONTHS[Number(parts[1]) - 1] + " " + Number(parts[2]) + ", " + parts[0];
  }
  function exclusionsLine(rec) {
    if (rec.pairs > 0) {
      return rec.pairs + (rec.pairs === 1 ? " pair" : " pairs") +
        " kept apart. Every pair was honored.";
    }
    return "No pairs were kept apart.";
  }
  function receiptText(rec) {
    return [
      "Pick My Secret Santa — draw sealed",
      "Group: " + rec.group,
      "Drawn on " + dateLabel(rec.date) + ".",
      rec.names.length + " people: " + rec.names.join(", ") + ".",
      "Budget: " + rec.budget + ".",
      exclusionsLine(rec),
      "No one drew their own name.",
      "This receipt shows no matches.",
      "Each match lives only in its own private link."
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
      return rec;
    } catch (e) {
      return null;
    }
  }

  function buildReceipt(container, rec) {
    container.innerHTML = "";
    container.appendChild(make("p", "summaryline", rec.group));
    container.appendChild(make("p", null, "Drawn on " + dateLabel(rec.date) + "."));
    container.appendChild(make("p", null,
      rec.names.length + " people: " + rec.names.join(", ") + "."));
    container.appendChild(make("p", null, "Budget: " + rec.budget + "."));
    container.appendChild(make("p", null, exclusionsLine(rec)));
    container.appendChild(make("p", null, "No one drew their own name."));
    container.appendChild(make("p", null, "This receipt shows no matches."));
    var row = make("div", "btnrow");
    row.style.marginTop = "12px";
    var copyBtn = make("button", "secondary", "Copy receipt");
    copyBtn.type = "button";
    copyBtn.addEventListener("click", function () {
      trackShare("clipboard", "receipt");
      copyText(receiptText(rec), copyBtn, "Copied");
    });
    var picBtn = make("button", "secondary", "Save receipt picture");
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
    x.fillText("draw sealed", 540, 162);
    x.fillStyle = "#2a2118";
    x.font = "600 42px sans-serif";
    x.fillText("Drawn on " + dateLabel(rec.date) + ".", 540, 300);
    x.font = "400 40px sans-serif";
    var y = wrapText(x, rec.names.length + " people: " + rec.names.join(", ") + ".",
      540, 380, 920, 54, 6);
    x.font = "600 42px sans-serif";
    x.fillText("Budget: " + rec.budget + ".", 540, y + 30);
    x.font = "400 40px sans-serif";
    y = wrapText(x, exclusionsLine(rec), 540, y + 110, 920, 54, 3);
    x.fillText("No one drew their own name.", 540, y + 26);
    x.fillStyle = "#17603c";
    x.font = "800 46px sans-serif";
    x.fillText("This receipt shows no matches.", 540, y + 110);
    x.fillStyle = "#71634f";
    x.font = "600 34px sans-serif";
    x.fillText("Pick My Secret Santa", 540, 1010);
    var a = document.createElement("a");
    a.download = "secret-santa-draw-sealed.png";
    a.href = c.toDataURL("image/png");
    a.click();
    trackReceiptImage();
  }

  function renderShareCardsInto(box, rec) {
    box.innerHTML = "";
    rec.links.forEach(function (link) {
      var url = linkFor(link.token);
      var card = make("div", "sharecard");
      card.setAttribute("data-for", link.for);
      card.appendChild(make("p", "who", "For " + link.for));
      card.appendChild(make("p", "link", url));
      var row = make("div", "row");
      var copyBtn = make("button", null, "Copy link");
      copyBtn.type = "button";
      copyBtn.addEventListener("click", function () { trackShare("clipboard", "link"); markShared(link.for); copyText(url, copyBtn, "Copied"); });
      var msgBtn = make("button", "alt", "Copy message");
      msgBtn.type = "button";
      var msg = rec.customGroup
        ? "You are in " + rec.group + "'s Secret Santa. Budget: " + rec.budget +
          ". Your private link: " + url + " — it shows only your match. Keep it secret."
        : "You are in our Secret Santa draw. Budget: " + rec.budget +
          ". Your private link: " + url + " — it shows only your match. Keep it secret.";
      msgBtn.addEventListener("click", function () { trackShare("clipboard", "message"); markShared(link.for); copyText(msg, msgBtn, "Copied"); });
      row.appendChild(copyBtn);
      row.appendChild(msgBtn);
      if (navigator.share) {
        var shareBtn = make("button", "alt", "Share");
        shareBtn.type = "button";
        shareBtn.addEventListener("click", function () {
          trackShare("native", "message");
          markShared(link.for);
          navigator.share({ title: "Secret Santa", text: msg }).catch(function () {});
        });
        row.appendChild(shareBtn);
      }
      card.appendChild(row);
      if (sharedList(rec).indexOf(link.for) !== -1) card.appendChild(sharedMarkEl());
      box.appendChild(card);
    });
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
    return make("p", "sharedmark", "Shared from this device ✓");
  }
  function buildProgress(rec) {
    var total = rec.names.length;
    var sent = sharedList(rec);
    var left = rec.names.filter(function (n) { return sent.indexOf(n) === -1; });
    var wrap = make("div", "pstrip");
    wrap.appendChild(make("p", "pline",
      sent.length + " of " + total + " links shared from this device."));
    var bar = make("div", "pbar");
    var fill = make("div", "pfill");
    fill.style.width = (total ? Math.round((sent.length / total) * 100) : 0) + "%";
    bar.appendChild(fill);
    wrap.appendChild(bar);
    if (left.length) {
      wrap.appendChild(make("p", "hint", "Still to send: " + left.join(", ") + "."));
    } else {
      wrap.appendChild(make("p", "hint", "Every link has been shared from this device."));
    }
    wrap.appendChild(make("p", "hint", "This counts your Copy and Share taps here."));
    wrap.appendChild(make("p", "hint", "It cannot see who opened a link."));
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
    renderShareCardsInto(el("savedCards"), rec);
    section.hidden = false;
  }

  function initSavedSection() {
    var rec = loadDrawRecord();
    if (rec) renderSavedSection(rec);
    var clearBtn = el("clearDrawBtn");
    if (!clearBtn) return;
    var armed = false, armTimer = null;
    clearBtn.addEventListener("click", function () {
      if (!armed) {
        armed = true;
        clearBtn.textContent = "Tap again to clear for good";
        armTimer = setTimeout(function () {
          armed = false;
          clearBtn.textContent = "Clear saved draw from this device";
        }, 4000);
        return;
      }
      clearTimeout(armTimer);
      armed = false;
      clearBtn.textContent = "Clear saved draw from this device";
      clearDrawRecord();
      state.savedRec = null;
      el("savedDraw").hidden = true;
      var note = el("clearDrawNote");
      if (note) note.hidden = false;
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
      showErr("err2", "Two people share a name. Add a last initial to each, so every private link works.");
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
      showErr("err3", "No fair draw fits these rules. Remove a keep-apart pair or two, then draw again.");
      return;
    }
    hideErr("err3");
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
      return { giver: giver.name, token: CORE.makeToken(payload) };
    });
    state.lastDraw = { match: match, tokens: tokens, pairCount: apartIdx.length, isRedraw: isRedraw };
    trackDrawComplete(tokens.length);
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
      links: tokens.map(function (t) { return { for: t.giver, token: t.token }; })
    };
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
    showStep(4);
  }

  /* Share counting (Oct 31, 2026): one fleet share_intent per
     share tap. The payload is enums only — tool, channel, kind.
     It never holds a name, a match, a gift pick, a link, or any
     part of a token. fleetTrack is defined by the fleet block in
     index.html; when it is absent (test pages), this is a no-op. */
  function trackShare(channel, kind) {
    try {
      if (typeof fleetTrack === "function") {
        fleetTrack("share_intent", { tool: "secret-santa", channel: channel, kind: kind });
      }
    } catch (e) {}
  }

  function linkFor(token) {
    // ?via=share rides in the query, before the #p= fragment:
    // the query is how the arrival is counted, and the fragment
    // (which holds the match) is never sent to any server.
    return location.origin + location.pathname + "?via=share#p=" + token;
  }

  function copyText(text, btn, doneLabel) {
    function done() {
      var old = btn.textContent;
      btn.textContent = doneLabel;
      setTimeout(function () { btn.textContent = old; }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        window.prompt("Copy this link:", text);
      });
    } else {
      window.prompt("Copy this link:", text);
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
      warn.textContent = "Two people share a name. Check each link twice.";
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
    el("drawSummary").textContent =
      groupName + " · " + tokens.length + " people · Budget: " + bandLabel;
    tokens.forEach(function (t) {
      var link = linkFor(t.token);
      var card = make("div", "sharecard");
      card.setAttribute("data-for", t.giver);
      card.appendChild(make("p", "who", "For " + t.giver));
      card.appendChild(make("p", "link", link));
      var row = make("div", "row");
      var copyBtn = make("button", null, "Copy link");
      copyBtn.type = "button";
      copyBtn.addEventListener("click", function () { trackShare("clipboard", "link"); markShared(t.giver); copyText(link, copyBtn, "Copied"); });
      var msgBtn = make("button", "alt", "Copy message");
      msgBtn.type = "button";
      var msg = rawGroupName
        ? "You are in " + groupName + "'s Secret Santa. Budget: " + bandLabel +
          ". Your private link: " + link + " — it shows only your match. Keep it secret."
        : "You are in our Secret Santa draw. Budget: " + bandLabel +
          ". Your private link: " + link + " — it shows only your match. Keep it secret.";
      msgBtn.addEventListener("click", function () { trackShare("clipboard", "message"); markShared(t.giver); copyText(msg, msgBtn, "Copied"); });
      row.appendChild(copyBtn);
      row.appendChild(msgBtn);
      if (navigator.share) {
        var shareBtn = make("button", "alt", "Share");
        shareBtn.type = "button";
        shareBtn.addEventListener("click", function () {
          trackShare("native", "message");
          markShared(t.giver);
          navigator.share({ title: "Secret Santa", text: msg }).catch(function () {});
        });
        row.appendChild(shareBtn);
      }
      card.appendChild(row);
      if (state.savedRec && sharedList(state.savedRec).indexOf(t.giver) !== -1) {
        card.appendChild(sharedMarkEl());
      }
      box.appendChild(card);
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
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
      initReveal(CORE.parseToken(m[1]));
      return;
    }
    initStep1();
    initStep2();
    initAsk();
    initStep3();
    initSavedSection();
    showReturnHook();
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
