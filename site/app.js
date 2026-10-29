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
      el("giftWhy").textContent = p.why;
      el("giftSpec").textContent = p.spec;
    }
    el("peekBtn").addEventListener("click", function () {
      el("revealCover").hidden = true;
      el("revealCard").hidden = false;
      el("hiLine").textContent = "Hi " + payload.you + ". You got:";
      el("gotName").textContent = payload.got;
      el("budgetLine").textContent = "Budget: " + payload.b;
      showPick();
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
  }

  /* ---------- Organizer flow ---------- */
  var state = {
    band: "m2550",
    people: [],      // {rowId, name, interest}
    pairs: [],       // {rowA, rowB} as row ids
    nextRow: 1,
    lastDraw: null   // {match, tokens}
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
      state.pairs = state.pairs.filter(function (p) {
        return p.rowA !== rowId && p.rowB !== rowId;
      });
    });
    row.appendChild(name); row.appendChild(hint); row.appendChild(rm);
    row.dataset.rowId = rowId;
    return row;
  }

  function readPeople() {
    var out = [];
    Array.prototype.forEach.call(el("peopleRows").children, function (row) {
      var name = cleanName(row.querySelector(".pname").value).trim();
      var interest = row.querySelector(".phint").value;
      out.push({ rowId: Number(row.dataset.rowId), name: name, interest: interest });
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
      var person = { name: name, interest: "", unknown: false };
      if (fields.length > 1 && fields[1]) {
        var v = interestValue(fields[1]);
        if (v === null) person.unknown = true;
        else person.interest = v;
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
    var rosterCount = {};
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

  // Step 3 — keep-apart pairs
  function pairRow(people) {
    var row = make("div", "pairrow");
    function personSelect() {
      var s = document.createElement("select");
      s.setAttribute("aria-label", "Should not draw each other: first person");
      people.forEach(function (p) {
        var o = document.createElement("option");
        o.value = p.rowId; o.textContent = p.name;
        s.appendChild(o);
      });
      return s;
    }
    var a = personSelect(), b = personSelect();
    if (people.length > 1) b.selectedIndex = 1;
    var rm = make("button", "prm", "×");
    rm.type = "button"; rm.setAttribute("aria-label", "Remove pair");
    rm.addEventListener("click", function () { row.remove(); });
    row.appendChild(a); row.appendChild(b); row.appendChild(rm);
    return row;
  }

  function buildPairRows() {
    // Start with zero pair rows on purpose: a row the organizer
    // never touched must not silently become a rule. With three
    // people, one default pair can make the draw impossible.
    el("pairRows").innerHTML = "";
  }

  function initStep3() {
    el("addPair").addEventListener("click", function () {
      el("pairRows").appendChild(pairRow(state.people));
    });
    el("back2").addEventListener("click", function () { showStep(2); });
    el("drawBtn").addEventListener("click", doDraw);
    el("redraw").addEventListener("click", doDraw);
    el("startOver").addEventListener("click", function () {
      window.location.hash = "";
      window.location.reload();
    });
  }

  function readPairs() {
    var pairs = [];
    Array.prototype.forEach.call(el("pairRows").children, function (row) {
      var sels = row.querySelectorAll("select");
      var a = Number(sels[0].value), b = Number(sels[1].value);
      if (a && b && a !== b) pairs.push([a, b]);
    });
    return pairs;
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
    var seen = {};
    for (var i = 0; i < people.length; i++) {
      var k = cleanName(people[i].name).trim().toLowerCase();
      if (!k) continue;
      if (seen[k]) return true;
      seen[k] = true;
    }
    return false;
  }

  function doDraw() {
    var people = state.people;
    if (hasDuplicateNames(people)) {
      showStep(2);
      showErr("err2", "Two people share a name. Add a last initial to each, so every private link works.");
      return;
    }
    var indexOf = {};
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
      showErr("err3", "That draw cannot work. Remove one pair you marked.");
      return;
    }
    hideErr("err3");
    var rand = CORE.rng(CORE.randomSeed());
    var usedIds = {};
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
    state.lastDraw = { match: match, tokens: tokens };
    renderShare(tokens);
    showStep(4);
  }

  function linkFor(token) {
    return location.origin + location.pathname + "#p=" + token;
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
    // Duplicate-name warning
    var seen = {}, dupe = false;
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
      card.appendChild(make("p", "who", "For " + t.giver));
      card.appendChild(make("p", "link", link));
      var row = make("div", "row");
      var copyBtn = make("button", null, "Copy link");
      copyBtn.type = "button";
      copyBtn.addEventListener("click", function () { copyText(link, copyBtn, "Copied"); });
      var msgBtn = make("button", "alt", "Copy message");
      msgBtn.type = "button";
      var msg = rawGroupName
        ? "You are in " + groupName + "'s Secret Santa. Budget: " + bandLabel +
          ". Your private link: " + link + " — it shows only your match. Keep it secret."
        : "You are in our Secret Santa draw. Budget: " + bandLabel +
          ". Your private link: " + link + " — it shows only your match. Keep it secret.";
      msgBtn.addEventListener("click", function () { copyText(msg, msgBtn, "Copied"); });
      row.appendChild(copyBtn);
      row.appendChild(msgBtn);
      if (navigator.share) {
        var shareBtn = make("button", "alt", "Share");
        shareBtn.type = "button";
        shareBtn.addEventListener("click", function () {
          navigator.share({ title: "Secret Santa", text: msg }).catch(function () {});
        });
        row.appendChild(shareBtn);
      }
      card.appendChild(row);
      box.appendChild(card);
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    var m = /#p=([A-Za-z0-9\-_]+)/.exec(location.hash || "");
    if (m) {
      initReveal(CORE.parseToken(m[1]));
      return;
    }
    initStep1();
    initStep2();
    initStep3();
    el("startBtn").addEventListener("click", function () {
      setTimeout(function () { el("groupName").focus({ preventScroll: true }); }, 350);
    });
    // A private link pasted into an already-open tab arrives as a
    // hash change, not a fresh load. Reboot into the reveal view.
    window.addEventListener("hashchange", function () {
      if (/#p=[A-Za-z0-9\-_]+/.test(location.hash || "") && el("reveal").hidden) {
        location.reload();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
