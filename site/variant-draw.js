"use strict";
/* SPEC-SS-SHAPE-PARITY-01 (Nov 9, 2026): the complete draw, living ON
   each generator-variant page, so a visitor who lands on a variant
   never has to travel to the homepage to start. This module is a
   faithful port of the homepage draw's core protocol (site/app.js
   doDraw + mintShortLinks), minus the homepage-only surfaces
   (sample draw, guide, saved-draw section):
   - the assignment comes from SS_CORE.drawGroup (same sampler);
   - each private link is an SS_CORE.makeToken payload of the frozen
     shape {v,g,b,you,got,pi} — the reveal page resolves it exactly
     like a homepage draw, and gift pick ids ride in the link;
   - the on-device record is the same ss_draw_v1 shape the homepage
     saves, so a draw made here shows up in the homepage's saved-draw
     and manage surfaces on a return visit;
   - short links mint through the same /api/links + /api/groups
     worker calls, with the same long-link fallback (long links are
     copy-only here, never printed as text);
   - analytics fire the same event names with the same prop shapes
     (tool_start, tool_complete, draw_created, draw_links_minted,
     share_intent) through the page's own fleetTrack.
   Spanish pages (data-lang="es") run the same flow in Spanish and
   stamp lang:"es" on the record, exactly like a homepage draw made
   in Spanish (SPEC-SS-AMIGO-01). */
(function () {
  var mount = document.querySelector("[data-vdraw]");
  if (!mount) return;
  var LANG = mount.getAttribute("data-lang") === "es" ? "es" : "en";
  var ES = LANG === "es";

  var BANDS = [
    { id: "u25", label: "Under $25" },
    { id: "m2550", label: "$25-$50" },
    { id: "m50100", label: "$50-$100" },
    { id: "m100", label: "$100+" }
  ];
  var INTERESTS = ES ? [
    ["", "Lo que le gusta (opcional)"], ["surprise", "Sorpréndeme"],
    ["cooking", "Cocina"], ["tech", "Tecnología"], ["outdoors", "Aire libre"],
    ["games", "Juegos"], ["fitness", "Ejercicio"], ["travel", "Viajes"],
    ["cozy", "Cosas acogedoras"], ["books", "Libros"], ["science", "Ciencia"],
    ["music", "Música"], ["gardening", "Jardinería"]
  ] : [
    ["", "What they like (optional)"], ["surprise", "Surprise me"],
    ["cooking", "Cooking"], ["tech", "Tech"], ["outdoors", "Outdoors"],
    ["games", "Games"], ["fitness", "Fitness"], ["travel", "Travel"],
    ["cozy", "Cozy things"], ["books", "Books"], ["science", "Science"],
    ["music", "Music"], ["gardening", "Gardening"]
  ];
  var S = ES ? {
    heading: "Haz el sorteo aquí",
    sub: "Escribe los nombres, sortea en secreto y envía a cada persona su enlace privado.",
    groupLabel: "Nombre del grupo (opcional)",
    groupPh: "Ej.: Oficina 2026",
    budgetLabel: "Presupuesto del regalo",
    whoLabel: "¿Quiénes participan? (de 3 a 30 personas)",
    namePh: "Nombre",
    addPerson: "+ Agregar una persona",
    pairsSummary: "Parejas que no deben salir juntas (opcional)",
    pairsHelp: "Solo si dos personas no deben regalarse entre sí, como parejas o compañeros de piso.",
    pairAdd: "Agregar",
    pairSep: " y ",
    pairSuffix: " no salen juntos",
    drawBtn: "Sortear los nombres",
    drawing: "Sorteando…",
    note: "El sorteo se hace en tu navegador. Ningún nombre se envía a nuestro servidor. Tus enlaces quedan guardados en este dispositivo.",
    errFew: "Agrega al menos 3 nombres para sortear.",
    errDupe: "Dos personas comparten el mismo nombre. Agrega una inicial a cada una para que cada enlace privado funcione.",
    errDrawSmall: "Ningún sorteo justo cumple estas reglas. Los grupos pequeños son frágiles: cada persona solo puede sacar algunos nombres y las parejas bloquean demasiados. Quita una pareja o agrega una persona y sortea de nuevo.",
    errDraw: "Ningún sorteo justo cumple estas reglas. Quita una pareja o dos y sortea de nuevo.",
    doneH: "Tu sorteo está listo",
    doneSub: "Envía a cada persona solo su propio enlace. Ninguna pantalla aquí muestra quién salió con quién.",
    redrawNote: "Sorteo nuevo, enlaces nuevos: los anteriores siguen funcionando, así que envía estos nuevos.",
    linkReady: "Enlace privado listo",
    preparing: "Preparando tu enlace privado…",
    copy: "Copiar",
    copied: "Copiado",
    copyLinkFor: "Copiar el enlace de ",
    groupMsg: "Copiar el mensaje para el grupo",
    manageLabel: "Tu enlace de organizador: guárdalo para ver quién abrió el suyo y reenviar enlaces",
    manageCopy: "Copiar enlace de organizador",
    manageOpen: "Abrir la página de gestión",
    again: "Empezar de nuevo",
    groupMsgHead: function (g, b) { return g ? "El sorteo de amigo secreto de " + g + " está listo, presupuesto " + b + "." : "Nuestro sorteo de amigo secreto está listo, presupuesto " + b + "."; },
    groupMsgTail: " Revisen sus mensajes: le enviaré a cada uno un enlace privado. Mi pantalla muestra solo nombres y enlaces, nunca las parejas. Guarda tu enlace en secreto y no lo reenvíes: quien lo tenga puede abrirlo. ¿Quieres organizar uno para tu oficina o tu familia? La misma herramienta gratuita, 2 minutos, sin registro: pickmysecretsanta.com/?via=group"
  } : {
    heading: "Start your draw here",
    sub: "Add the names, draw in secret, send each person their private link.",
    groupLabel: "Group name (optional)",
    groupPh: "e.g. Office party 2026",
    budgetLabel: "Gift budget",
    whoLabel: "Who is in? (3 to 30 people)",
    namePh: "Name",
    addPerson: "+ Add a person",
    pairsSummary: "Pairs to keep apart (optional)",
    pairsHelp: "Only if two people must not draw each other, like partners or roommates.",
    pairAdd: "Add pair",
    pairSep: " & ",
    pairSuffix: " stay apart",
    drawBtn: "Draw the names",
    drawing: "Drawing…",
    note: "The draw runs in your browser. No names are sent to our server. Your links stay saved on this device.",
    errFew: "Add at least 3 names to draw.",
    errDupe: "Two people share a name. Add a last initial to each, so every private link works.",
    errDrawSmall: "No fair draw fits these rules. Small groups are fragile: each person has only a few names they could draw, and the keep-apart pairs block too many of them. Remove a keep-apart pair, or add a person, then draw again.",
    errDraw: "No fair draw fits these rules. Remove a keep-apart pair or two, then draw again.",
    doneH: "Your draw is done",
    doneSub: "Send each person only their own link. No screen here shows who got whom.",
    redrawNote: "New draw, new links — the old ones still work, so resend these new ones.",
    linkReady: "Private link ready",
    preparing: "Preparing your private link…",
    copy: "Copy",
    copied: "Copied",
    copyLinkFor: "Copy link for ",
    groupMsg: "Copy the group message",
    manageLabel: "Your organizer link — bookmark it to watch who has opened theirs and to resend links",
    manageCopy: "Copy organizer link",
    manageOpen: "Open the manage page",
    again: "Start over",
    groupMsgHead: function (g, b) { return g ? g + "'s Secret Santa draw is done, budget " + b + "." : "Our Secret Santa draw is done, budget " + b + "."; },
    groupMsgTail: " Watch your messages: I will send each of you a private link. Your organizer's screen shows names and links only, never the matches. Keep your link secret and do not forward it: anyone who has it can open it. Want to run one for your office or your family? Same free tool, 2 minutes, no sign-up, and the organizer's screen never shows the matches: pickmysecretsanta.com/?via=group"
  };

  var LINKS_API = "https://pickmysecretsanta.com/api/links";
  var GROUPS_API = "https://pickmysecretsanta.com/api/groups";
  var BASE = "https://pickmysecretsanta.com";
  var MAX_PEOPLE = 30;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function track(name, props) {
    // Two fleet analytics generations exist across the variant pages:
    // most define a global fleetTrack(); the flat-template pages
    // (remote teams, gift exchange) expose window.FA.track instead —
    // the same fallback order the pages' own helpers use.
    try {
      if (typeof fleetTrack === "function") { fleetTrack(name, props); return; }
      if (window.FA && typeof window.FA.track === "function") window.FA.track(name, props);
    } catch (e) {}
  }
  function groupSizeBucket(n) { return n <= 5 ? "3-5" : n <= 10 ? "6-10" : n <= 20 ? "11-20" : "21+"; }
  function todayISO() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function copyText(text, btn) {
    function done() {
      if (!btn) return;
      var old = btn.textContent;
      btn.textContent = S.copied;
      setTimeout(function () { btn.textContent = old; }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { legacy(); });
    } else { legacy(); }
    function legacy() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  /* ---------------- build the form ---------------- */
  var card = el("div", "vd-card");
  card.appendChild(el("h2", "vd-h", S.heading));
  card.appendChild(el("p", "vd-sub", S.sub));

  var form = el("div", "vd-form");
  var share = el("div", "vd-share");
  share.hidden = true;
  card.appendChild(form);
  card.appendChild(share);
  mount.appendChild(card);

  var groupInput = el("input", "vd-input");
  groupInput.type = "text";
  groupInput.maxLength = 60;
  groupInput.placeholder = S.groupPh;
  var gl = el("label", "vd-label", S.groupLabel);
  gl.htmlFor = "vd-group-" + (mount.id || "tool");
  groupInput.id = gl.htmlFor;
  form.appendChild(gl);
  form.appendChild(groupInput);

  form.appendChild(el("span", "vd-label", S.budgetLabel));
  var chips = el("div", "vd-chips");
  chips.setAttribute("role", "group");
  var band = "m2550";
  var chipBtns = BANDS.map(function (b) {
    // SPEC-SS-COLDQA-04: display-only localization — the stored band
    // label stays the English canonical string (records, tokens and the
    // worker all key off it); only the chip's visible words translate.
    // The other three bands are bare ranges, identical in both languages.
    var btn = el("button", "vd-chip", (ES && b.id === "u25") ? "Menos de $25" : b.label);
    btn.type = "button";
    btn.setAttribute("aria-pressed", b.id === band ? "true" : "false");
    btn.addEventListener("click", function () {
      band = b.id;
      chipBtns.forEach(function (c, i) { c.setAttribute("aria-pressed", BANDS[i].id === band ? "true" : "false"); });
    });
    chips.appendChild(btn);
    return btn;
  });
  form.appendChild(chips);

  form.appendChild(el("span", "vd-label", S.whoLabel));
  var peopleBox = el("div", "vd-people");
  form.appendChild(peopleBox);
  var rowSeq = 0;
  function addRow() {
    if (peopleBox.children.length >= MAX_PEOPLE) return;
    var row = el("div", "vd-person");
    row.dataset.rowId = String(++rowSeq);
    var name = el("input", "vd-input vd-name");
    name.type = "text";
    name.placeholder = S.namePh;
    name.maxLength = 40;
    name.setAttribute("aria-label", S.namePh);
    var sel = el("select", "vd-select vd-interest");
    INTERESTS.forEach(function (it) {
      var o = el("option", null, it[1]);
      o.value = it[0];
      sel.appendChild(o);
    });
    sel.setAttribute("aria-label", INTERESTS[0][1]);
    var rm = el("button", "vd-remove", "×");
    rm.type = "button";
    rm.setAttribute("aria-label", "Remove");
    rm.addEventListener("click", function () {
      row.parentNode.removeChild(row);
      prunePairs();
      refreshPairSelects();
    });
    name.addEventListener("input", refreshPairSelects);
    row.appendChild(name);
    row.appendChild(sel);
    row.appendChild(rm);
    peopleBox.appendChild(row);
    refreshPairSelects();
  }
  var addBtn = el("button", "vd-add", S.addPerson);
  addBtn.type = "button";
  addBtn.addEventListener("click", addRow);
  form.appendChild(addBtn);

  var err = el("p", "vd-err");
  err.setAttribute("role", "alert");
  err.hidden = true;
  form.appendChild(err);

  /* keep-apart pairs */
  var pairs = []; // [rowIdA, rowIdB]
  var details = el("details", "vd-pairs");
  details.appendChild(el("summary", null, S.pairsSummary));
  details.appendChild(el("p", null, S.pairsHelp));
  var pairRow = el("div", "vd-pairrow");
  var selA = el("select", "vd-select");
  var selB = el("select", "vd-select");
  var pairAdd = el("button", "vd-pairadd", S.pairAdd);
  pairAdd.type = "button";
  pairRow.appendChild(selA);
  pairRow.appendChild(selB);
  pairRow.appendChild(pairAdd);
  details.appendChild(pairRow);
  var pairChips = el("div", "vd-pairchips");
  details.appendChild(pairChips);
  form.appendChild(details);

  function rowName(rowId) {
    var rows = peopleBox.children;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].dataset.rowId === String(rowId)) {
        return rows[i].querySelector(".vd-name").value.trim();
      }
    }
    return "";
  }
  function refreshPairSelects() {
    [selA, selB].forEach(function (sel) {
      var cur = sel.value;
      sel.innerHTML = "";
      var rows = peopleBox.children;
      for (var i = 0; i < rows.length; i++) {
        var nm = rows[i].querySelector(".vd-name").value.trim();
        if (!nm) continue;
        var o = el("option", null, nm);
        o.value = rows[i].dataset.rowId;
        sel.appendChild(o);
      }
      if (cur) sel.value = cur;
    });
    renderPairChips();
  }
  function prunePairs() {
    var alive = {};
    var rows = peopleBox.children;
    for (var i = 0; i < rows.length; i++) alive[rows[i].dataset.rowId] = true;
    pairs = pairs.filter(function (p) { return alive[String(p[0])] && alive[String(p[1])]; });
  }
  function renderPairChips() {
    pairChips.innerHTML = "";
    pairs.forEach(function (p, idx) {
      var label = rowName(p[0]) + S.pairSep + rowName(p[1]) + S.pairSuffix + " ×";
      var chip = el("button", "vd-pairchip", label);
      chip.type = "button";
      chip.addEventListener("click", function () {
        pairs.splice(idx, 1);
        renderPairChips();
      });
      pairChips.appendChild(chip);
    });
  }
  pairAdd.addEventListener("click", function () {
    var a = selA.value, b = selB.value;
    if (!a || !b || a === b) return;
    var dup = pairs.some(function (p) {
      return (String(p[0]) === a && String(p[1]) === b) || (String(p[0]) === b && String(p[1]) === a);
    });
    if (!dup) { pairs.push([a, b]); renderPairChips(); }
  });

  var drawBtn = el("button", "vd-draw", S.drawBtn);
  drawBtn.type = "button";
  form.appendChild(drawBtn);
  form.appendChild(el("p", "vd-note", S.note));

  for (var i = 0; i < 4; i++) addRow();

  /* ---------------- the draw (port of app.js doDraw) ---------------- */
  var lastRec = null;
  function showErr(msg) { err.textContent = msg; err.hidden = false; }
  function hideErr() { err.hidden = true; err.textContent = ""; }

  function gatherPeople() {
    var out = [];
    var rows = peopleBox.children;
    for (var i = 0; i < rows.length; i++) {
      var nm = rows[i].querySelector(".vd-name").value.trim();
      if (!nm) continue;
      out.push({
        rowId: rows[i].dataset.rowId,
        name: nm,
        interest: rows[i].querySelector(".vd-interest").value || ""
      });
    }
    return out;
  }

  function longUrl(rec, link) {
    var base = BASE + "/?via=share#p=" + link.token;
    var ref = "";
    if (rec.trk && rec.trk.keys && rec.trk.keys[link.for]) ref = "&t=" + rec.trk.d + rec.trk.keys[link.for];
    if (rec.lang === "es") ref += "&l=es";
    return base + ref;
  }
  function urlFor(rec, link) {
    if (rec.sl && rec.sl.codes && rec.sl.codes[link.for]) return BASE + "/s/" + rec.sl.codes[link.for];
    return longUrl(rec, link);
  }

  function renderShare(rec) {
    share.innerHTML = "";
    share.appendChild(el("h3", "vd-h3", S.doneH));
    share.appendChild(el("p", "vd-sub2", S.doneSub));
    if (rec.isRedraw) {
      var rn = el("p", "vd-redraw", S.redrawNote);
      share.appendChild(rn);
    }
    var box = el("div", "vd-links");
    rec.links.forEach(function (link) {
      var row = el("div", "vd-link");
      var who = el("div", "vd-who");
      who.appendChild(el("b", null, link.for));
      var short = !!(rec.sl && rec.sl.codes && rec.sl.codes[link.for]);
      // SPEC-SS-COLDQA-03: a person's link is never printed as page text
      // here either — copy-only, exactly like the homepage share screen.
      // The URL rides the Copy button below; the row just says it is ready.
      who.appendChild(el("span", "vd-url", (short || rec.mintSettled) ? S.linkReady : S.preparing));
      var btn = el("button", "vd-copy", S.copy);
      btn.type = "button";
      btn.setAttribute("aria-label", S.copyLinkFor + link.for);
      btn.addEventListener("click", function () {
        track("share_intent", { tool: "secret-santa", channel: "clipboard", kind: "person-link" });
        copyText(urlFor(rec, link), btn);
      });
      row.appendChild(who);
      row.appendChild(btn);
      box.appendChild(row);
    });
    share.appendChild(box);

    var msgBtn = el("button", "vd-msg", S.groupMsg);
    msgBtn.type = "button";
    msgBtn.addEventListener("click", function () {
      track("share_intent", { tool: "secret-santa", channel: "clipboard", kind: "message" });
      copyText(S.groupMsgHead(rec.customGroup ? rec.group : "", rec.budget) + S.groupMsgTail, msgBtn);
    });
    share.appendChild(msgBtn);

    if (rec.sl && rec.sl.m) {
      var mg = el("div", "vd-manage");
      mg.appendChild(el("span", "vd-label", S.manageLabel));
      var murl = BASE + "/g/" + rec.sl.m;
      // SPEC-SS-COLDQA-03: the organizer URL is copy-only too, never
      // printed as page text (same presentation as everywhere else).
      var btns = el("div", "vd-manage-btns");
      var mc = el("button", "vd-copy", S.manageCopy);
      mc.type = "button";
      mc.addEventListener("click", function () {
        track("share_intent", { tool: "secret-santa", channel: "clipboard", kind: "manage-link" });
        copyText(murl, mc);
      });
      var mo = el("a", "vd-manage-open", S.manageOpen);
      mo.href = murl;
      mo.target = "_blank";
      mo.rel = "noopener";
      btns.appendChild(mc);
      btns.appendChild(mo);
      mg.appendChild(btns);
      share.appendChild(mg);
    }

    var again = el("button", "vd-again", S.again);
    again.type = "button";
    again.addEventListener("click", function () {
      share.hidden = true;
      form.hidden = false;
      mount.scrollIntoView({ block: "start" });
    });
    share.appendChild(again);
  }

  function trkHex(CORE, chars) {
    var rnd = CORE.rng(CORE.randomSeed());
    var out = "";
    while (out.length < chars) out += Math.floor(rnd() * 4294967296).toString(16).padStart(8, "0");
    return out.slice(0, chars);
  }
  function makeTrk(CORE, names) {
    var keys = Object.create(null);
    names.forEach(function (nm) { keys[nm] = trkHex(CORE, 12); });
    return { d: trkHex(CORE, 16), keys: keys };
  }
  function saveRec(rec) {
    // isRedraw is this module's render state, not a record field —
    // the homepage's ss_draw_v1 shape never carries it.
    var keep = rec.isRedraw;
    delete rec.isRedraw;
    try { localStorage.setItem("ss_draw_v1", JSON.stringify(rec)); } catch (e) {}
    rec.isRedraw = keep;
  }

  function mintShortLinks(CORE, rec) {
    var settled = false;
    function settle(ok) {
      if (settled) return;
      settled = true;
      rec.mintSettled = true;
      if (!ok) renderShare(rec);
    }
    var mintedFired = false;
    function fireMinted(linkType, manage) {
      if (mintedFired) return;
      mintedFired = true;
      track("draw_links_minted", { tool: "secret-santa", people_count: rec.links.length, link_type: linkType, manage: manage, group_size_bucket: groupSizeBucket(rec.links.length) });
    }
    try {
      var jobs = rec.links.map(function (link) {
        var payload = CORE.parseToken(link.token);
        if (!payload) return Promise.resolve(null);
        if (rec.lang === "es") payload.l = "es";
        var t = rec.trk && rec.trk.keys ? rec.trk.d + rec.trk.keys[link.for] : null;
        return fetch(LINKS_API, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ p: payload, t: t, names: rec.names })
        }).then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            return data && typeof data.code === "string" ? { name: link.for, code: data.code } : null;
          })
          .catch(function () { return null; });
      });
      Promise.all(jobs).then(function (results) {
        var codes = Object.create(null);
        var allOk = results.length === rec.links.length;
        results.forEach(function (r) { if (r) codes[r.name] = r.code; else allOk = false; });
        if (!allOk || Object.keys(codes).length !== rec.links.length) { fireMinted("long-fallback", false); settle(false); return; }
        rec.sl = { codes: codes };
        saveRec(rec);
        renderShare(rec);
        var groupBody = {
          v: 1, g: rec.group, b: rec.budget, date: rec.date, pairs: rec.pairs,
          d: rec.trk.d,
          people: rec.links.map(function (link) {
            return { n: link.for, c: codes[link.for], k: rec.trk.keys[link.for] };
          })
        };
        if (rec.lang === "es") groupBody.lang = "es";
        return fetch(GROUPS_API, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(groupBody)
        }).then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            if (data && typeof data.code === "string") {
              rec.sl.m = data.code;
              saveRec(rec);
              renderShare(rec);
              fireMinted("short", true);
              settle(true);
            } else { fireMinted("long-fallback", false); settle(false); }
          })
          .catch(function () { fireMinted("long-fallback", false); settle(false); });
      }).catch(function () { settle(false); });
    } catch (e) { settle(false); }
  }

  function doDraw(CORE, BANK) {
    var people = gatherPeople();
    if (people.length < 3) { showErr(S.errFew); return; }
    var seen = Object.create(null);
    for (var i = 0; i < people.length; i++) {
      var key = people[i].name.toLowerCase();
      if (seen[key]) { showErr(S.errDupe); return; }
      seen[key] = true;
    }
    hideErr();
    track("tool_start", { tool: "secret-santa", entry: "draw", people_count: people.length, start_source: "direct", names_mode: "rows" });
    var isRedraw = !!lastRec;
    try {
      var prev = localStorage.getItem("ss_draw_v1");
      if (prev) isRedraw = true;
    } catch (e) {}
    var indexOf = Object.create(null);
    people.forEach(function (p, i) { indexOf[p.rowId] = i; });
    var apartIdx = [];
    pairs.forEach(function (pair) {
      if (indexOf[pair[0]] != null && indexOf[pair[1]] != null) apartIdx.push([indexOf[pair[0]], indexOf[pair[1]]]);
    });
    var seed = CORE.randomSeed();
    var match = CORE.drawGroup(people.length, apartIdx, seed);
    if (!match) {
      showErr(people.length <= 4 && apartIdx.length ? S.errDrawSmall : S.errDraw);
      return;
    }
    var rand = CORE.rng(CORE.randomSeed());
    var usedIds = Object.create(null);
    var bandLabel = BANDS.filter(function (b) { return b.id === band; })[0].label;
    var groupName = groupInput.value.trim();
    var tokens = people.map(function (giver, gi) {
      var receiver = people[match[gi]];
      var picks = CORE.pickGifts(BANK, band, receiver.interest, rand, usedIds);
      if (picks.length) usedIds[picks[0].id] = true;
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
    track("tool_complete", { tool: "secret-santa", entry: "draw", results_count: tokens.length, start_source: "direct", names_mode: "rows" });
    track("draw_created", { people_count: people.length, group_size_bucket: groupSizeBucket(people.length), restrictions: apartIdx.length > 0, start_source: "direct" });
    try { localStorage.setItem("ss_organizer_v1", String(Date.now())); } catch (e) {}
    var rec = {
      v: 1,
      group: groupName || "Secret Santa",
      customGroup: !!groupName,
      budget: bandLabel,
      date: todayISO(),
      names: people.map(function (p) { return p.name; }),
      pairs: apartIdx.length,
      wish: {},
      sent: [],
      trk: makeTrk(CORE, people.map(function (p) { return p.name; })),
      links: tokens.map(function (t) { return { for: t.giver, token: t.token }; }),
      isRedraw: isRedraw
    };
    if (ES) rec.lang = "es";
    lastRec = rec;
    saveRec(rec);
    form.hidden = true;
    share.hidden = false;
    renderShare(rec);
    mount.scrollIntoView({ block: "start" });
    mintShortLinks(CORE, rec);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  drawBtn.addEventListener("click", function () {
    if (window.SS_CORE && window.SS_BANK) { doDraw(window.SS_CORE, window.SS_BANK.ideas); return; }
    drawBtn.disabled = true;
    var old = drawBtn.textContent;
    drawBtn.textContent = S.drawing;
    var chain = Promise.resolve();
    if (!window.SS_BANK) chain = chain.then(function () { return loadScript("/bank.js"); });
    if (!window.SS_CORE) chain = chain.then(function () { return loadScript("/core.js"); });
    chain.then(function () {
      drawBtn.disabled = false;
      drawBtn.textContent = old;
      doDraw(window.SS_CORE, window.SS_BANK.ideas);
    }).catch(function () {
      drawBtn.disabled = false;
      drawBtn.textContent = old;
      showErr(S.errDraw);
    });
  });
})();
