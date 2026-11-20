"use strict";
/* Santa's Helper (Nov 20, 2026): ONE helper for the whole site,
   replacing the two floating Ask pills (the homepage ssc chat pill
   and the askp gift pill on the landers and gift pages).

   Entry: a persistent gift-character button, bottom-right, with a
   once-per-session speech bubble. The old pills vanished in normal
   use (a scroll-past-the-tool gate, a yield guard whose target set
   included every heading and paragraph, scroll/focus hiding, and
   outright absence from most pages); this entry is on every page
   and yields ONLY to interactive targets in the draw, results and
   sample areas plus primary CTAs — never to static text, never on
   scroll or focus alone.

   Panel: Q&A rides the site's existing /api/chat knowledge base
   (the exact request shape the ssc chat used; no second knowledge
   store), with action chips. On the English draw surfaces the
   "Organize a draw" chip runs a guided setup that is a SKIN over
   variant-draw.js: collected values land in the form through the
   module's own prefill bridge (window.__SS_VDRAW_APPLY__), and
   Draw clicks the form's own Draw button, so records, results,
   share kit, manage page and telemetry are the engine's own. */
(function () {
  if (window.__SS_HELPER__) return;
  window.__SS_HELPER__ = true;
  /* Stylesheet bootstrap: pages carry the <link>, but if one was
     missed the entry still gets its styles from here. */
  if (!document.querySelector('link[href*="helper.css"]')) {
    var hl = document.createElement("link");
    hl.rel = "stylesheet";
    hl.href = "/helper.css";
    document.head.appendChild(hl);
  }

  /* ---------- strings (EN v1; dynamic chat strings resolve through
     the language packs exactly like the old ssc widget did, so ES/PT
     pages chat in their language; new helper chrome strings are
     structured here for the follow-up pack pass) ---------- */
  var S = {
    entryLabel: "Ask Santa's helper",
    bubble: "Questions? Ask me!",
    title: "Santa's Helper",
    consent: "Gift draw helper · I only act when you tap or ask",
    intro: "Hi, I'm Santa's Helper. I can set up your draw step by step, answer questions about how Secret Santa works here, or open your link if you have a code. Questions go to the site's AI. Draws and names are never sent to the AI.",
    chipOrganize: "Organize a draw",
    chipCode: "I have a code",
    chipHow: "How does it work?",
    chipData: "My data?",
    chipGifts: "Gift ideas for one person",
    howQ: "How does Secret Santa work on this site?",
    dataQ: "What happens to my data? What do you store?",
    send: "Send",
    askPh: "Ask a question…",
    codePrompt: "Paste your full link here, or type just the code from it. Links and codes are 8 letters or numbers after the /s/, /g/ or /e/ in the link.",
    codePh: "Paste your link or code",
    codeBad: "That does not look like one of our links or codes. Codes are 8 letters or numbers. Your full link always works pasted here.",
    codeWhich: "Got it. Which kind of code is it?",
    codeMine: "My match link",
    codeOrganizer: "My organizer page",
    codeGroup: "Our group page",
    back: "Back",
    skip: "Skip",
    groupPrompt: "Let's set up your draw. First: does your group have a name? Totally optional, it just labels the links.",
    groupPh: "e.g. Office party 2026",
    groupSkipAnswer: "No group name",
    namesPrompt: "Who is in? Type or paste the names, one on each line or separated by commas. You need at least 3 people, up to 100.",
    namesPh: "Paste the names here, one on each line",
    continueBtn: "Continue",
    errFew: "Add at least 3 names to draw.",
    errDupe: "Two people share a name. Add a last initial to each, so every private link works.",
    errFull: "That would make 101 people, and 100 is the most for one draw. Pick your name from the list instead.",
    budgetPrompt: "What should people spend on gifts?",
    bandOther: "Other amount",
    budgetFreePh: "20€, $30, up to you",
    pairsPrompt: "Anyone who should not draw each other? Partners or roommates, usually. Tap two names to keep them apart. Tap a pair again to remove it.",
    pairsNone: "No pairs needed",
    pairsDone: "Done with pairs",
    orgPrompt: "Are you in the draw too?",
    orgYes: "Yes, I'm in",
    orgNo: "No, I'm just organizing",
    orgNamePrompt: "What name are you under in the list? Tap it, or type a different one.",
    orgNamePh: "Your name in the draw",
    orgInLine: "You can be in the draw too: nobody in it sees the matches, not even you.",
    confirmHead: "Here's your draw:",
    drawBtn: "Draw the names",
    useForm: "Use the form instead",
    startAgain: "Start again",
    storageNote: "The draw is picked in your browser. To make the private links work, the names and matches are stored on our server, in a form we can read."
  };
  var BANDS = [
    { id: "u25", label: "Under $25" },
    { id: "m2550", label: "$25-$50" },
    { id: "m50100", label: "$50-$100" },
    { id: "m100", label: "$100+" }
  ];
  var MAX_PEOPLE = 100;

  /* The faced gift character, from the site's og-card art (the
     box only, so the face reads at avatar size). */
  var AVA = '<svg viewBox="40 12 140 144" width="100%" height="100%" aria-hidden="true" focusable="false">'
    + '<rect x="52" y="78" width="116" height="72" rx="10" fill="#c1272d"/>'
    + '<rect x="101" y="78" width="18" height="72" fill="#fdf9f0"/>'
    + '<rect x="46" y="64" width="128" height="18" rx="8" fill="#9c1f24"/>'
    + '<rect x="101" y="64" width="18" height="18" fill="#f3ead3"/>'
    + '<path d="M58 66 Q70 18 122 22 Q168 26 160 56 Q128 42 96 50 Q64 56 58 66Z" fill="#c1272d"/>'
    + '<rect x="50" y="52" width="122" height="17" rx="8" fill="#fdf9f0"/>'
    + '<circle cx="164" cy="66" r="11" fill="#fdf9f0"/>'
    + '<circle cx="88" cy="112" r="5.5" fill="#fdf9f0"/>'
    + '<circle cx="132" cy="112" r="5.5" fill="#fdf9f0"/>'
    + '<path d="M96 130 Q110 139 124 130" stroke="#fdf9f0" stroke-width="5" fill="none" stroke-linecap="round"/>'
    + '</svg>';

  function ct(key, fallback) {
    try {
      var pack = window.__SS_LANG === "es" ? window.SS_ES : window.__SS_LANG === "pt" ? window.SS_PT : null;
      var v = pack && pack["ask_entry_points." + key];
      return typeof v === "string" && v ? v : fallback;
    } catch (e) { return fallback; }
  }
  function lang() { return (window.__SS_LANG === "es" || window.__SS_LANG === "pt") ? window.__SS_LANG : "en"; }
  function track(name, props) {
    try {
      if (typeof fleetTrack === "function") { fleetTrack(name, props); return; }
      if (window.FA && typeof window.FA.track === "function") window.FA.track(name, props);
    } catch (e) {}
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- page facts ---------- */
  var mount = document.querySelector("[data-vdraw]");
  function canSetup() {
    return lang() === "en" && !!mount && typeof window.__SS_VDRAW_APPLY__ === "function";
  }
  function pageKind() {
    var p = location.pathname || "/";
    if (mount) return "draw";
    if (/gift-ideas|gifts-under/.test(p)) return "gift";
    if (/privacy|terms/.test(p)) return "legal";
    return "faq";
  }

  /* ---------- entry + bubble ---------- */
  var SEEN_KEY = "ss_helper_v1";
  function seenFlag() { try { return sessionStorage.getItem(SEEN_KEY); } catch (e) { return "x"; } }
  function setSeen(v) { try { sessionStorage.setItem(SEEN_KEY, v); } catch (e) {} }

  var btn = el("button", "shp-btn");
  btn.type = "button";
  btn.id = "shpBtn";
  btn.setAttribute("aria-label", S.entryLabel);
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", "shpPanel");
  btn.style.cssText = "position:fixed;right:16px;bottom:16px;width:60px;height:60px;border-radius:50%;z-index:60;padding:5px";
  btn.innerHTML = AVA;
  document.body.appendChild(btn);

  var bubble = el("div", "shp-bubble", S.bubble);
  bubble.id = "shpBubble";
  bubble.hidden = true;
  var bubbleX = el("button", "shp-bubble-x", "×");
  bubbleX.type = "button";
  bubbleX.setAttribute("aria-label", "Dismiss");
  bubble.appendChild(bubbleX);
  document.body.appendChild(bubble);
  bubbleX.addEventListener("click", function (e) {
    e.stopPropagation();
    bubble.hidden = true;
    setSeen("dismissed");
  });
  bubble.addEventListener("click", function () { openPanel(); });

  /* Yield: hide the entry ONLY while it intersects an interactive
     target in the draw / results / sample areas or a primary CTA.
     Static text never hides it (that was the old guard's bug). */
  var YIELD_SEL = "#tool a[href], #tool button, #tool input, #tool select, #tool textarea, #tool summary,"
    + " a.cta, button.cta, #sampleOpen, #peekBtn, #ownDrawCover, #recipientAskGo, .reveal button, .reveal a[href]";
  function intersects(a, b) {
    return a.left < b.right + 6 && a.right > b.left - 6 && a.top < b.bottom + 6 && a.bottom > b.top - 6;
  }
  function blockedBy(rect) {
    var nodes = document.querySelectorAll(YIELD_SEL);
    for (var i = 0; i < nodes.length; i++) {
      var r = nodes[i].getBoundingClientRect();
      if (!r.width && !r.height) continue;
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      if (intersects(rect, r)) return true;
    }
    return false;
  }
  var yieldQueued = false;
  function paintYield() {
    yieldQueued = false;
    if (!wrap.hidden) return;
    var br = btn.getBoundingClientRect();
    btn.classList.toggle("shp-yield", blockedBy(br));
    if (!bubble.hidden) bubble.classList.toggle("shp-yield", blockedBy(bubble.getBoundingClientRect()));
  }
  function queueYield() {
    if (yieldQueued) return;
    yieldQueued = true;
    if (window.requestAnimationFrame) requestAnimationFrame(paintYield);
    else paintYield();
  }
  window.addEventListener("scroll", queueYield, { passive: true });
  window.addEventListener("resize", queueYield);

  var bubbleTried = false;
  function tryBubble() {
    if (bubbleTried || seenFlag() || !wrap.hidden) return;
    bubbleTried = true;
    bubble.hidden = false;
    bubble.classList.remove("shp-yield");
    if (blockedBy(bubble.getBoundingClientRect()) || blockedBy(btn.getBoundingClientRect())) {
      bubble.hidden = true;
      bubbleTried = false; /* may still show once, later this session, when clear */
      return;
    }
    setSeen("shown");
    paintYield();
  }
  setTimeout(tryBubble, 700);
  window.addEventListener("scroll", function () { setTimeout(tryBubble, 400); }, { passive: true, once: true });

  /* ---------- panel ---------- */
  var wrap = el("div", "shp-wrap");
  wrap.id = "shpWrap";
  wrap.hidden = true;
  var backdrop = el("div", "shp-backdrop");
  wrap.appendChild(backdrop);
  var sheet = el("section", "shp-sheet");
  sheet.id = "shpPanel";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-labelledby", "shpTitle");
  var head = el("div", "shp-head");
  var ava = el("div", "shp-ava");
  ava.innerHTML = AVA;
  head.appendChild(ava);
  var headText = el("div", "shp-headtext");
  var title = el("p", "shp-title", S.title);
  title.id = "shpTitle";
  headText.appendChild(title);
  headText.appendChild(el("p", "shp-consent", S.consent));
  head.appendChild(headText);
  var closeBtn = el("button", "shp-close", "×");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close");
  head.appendChild(closeBtn);
  sheet.appendChild(head);
  var thread = el("div", "shp-thread");
  sheet.appendChild(thread);
  var busy = el("p", "shp-busy");
  busy.setAttribute("aria-live", "polite");
  sheet.appendChild(busy);
  var editor = el("div", "shp-ed");
  sheet.appendChild(editor);
  wrap.appendChild(sheet);
  document.body.appendChild(wrap);

  var facts = null;
  var greeted = false;
  function add(text, who, cls) {
    var d = el("div", "shp-bub" + (cls ? " " + cls : ""));
    if (who) {
      var w = el("p", "shp-who", who);
      d.appendChild(w);
    }
    d.appendChild(document.createTextNode(text));
    thread.appendChild(d);
    d.scrollIntoView({ block: "nearest" });
  }
  function helperSay(text) { add(text, "SANTA'S HELPER", ""); }
  function userSay(text) { add(text, ct("chat_who_you", "YOU"), "shp-me"); }

  function openPanel() {
    wrap.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    btn.classList.add("shp-hidden");
    bubble.hidden = true;
    setSeen("opened");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    track("chat_opened", { tool: "secret-santa", page_kind: pageKind() });
    if (!greeted) {
      greeted = true;
      helperSay(S.intro);
    }
    showHome();
    closeBtn.focus();
  }
  function closePanel() {
    wrap.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    btn.classList.remove("shp-hidden");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    btn.focus();
    paintYield();
  }
  btn.addEventListener("click", openPanel);
  closeBtn.addEventListener("click", closePanel);
  backdrop.addEventListener("click", closePanel);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !wrap.hidden) closePanel();
  });

  /* ---------- editor builders ---------- */
  function chip(label, fn, cls) {
    var b = el("button", "shp-chip" + (cls ? " " + cls : ""), label);
    b.type = "button";
    b.addEventListener("click", function () { fn(b); });
    return b;
  }
  function chipRow(buttons) {
    var row = el("div", "shp-chips");
    buttons.forEach(function (b) { row.appendChild(b); });
    return row;
  }
  function textForm(placeholder, onSubmit, submitLabel) {
    var form = el("form", "shp-row");
    var input = el("input");
    input.type = "text";
    input.placeholder = placeholder;
    input.setAttribute("autocomplete", "off");
    input.setAttribute("aria-label", placeholder);
    var send = el("button", "shp-send", submitLabel || S.send);
    send.type = "submit";
    form.appendChild(input);
    form.appendChild(send);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = input.value;
      input.value = "";
      onSubmit(v);
    });
    return { form: form, input: input };
  }
  function setupLinks() {
    var row = el("div", "shp-links");
    var f = el("button", "shp-textbtn", S.useForm);
    f.type = "button";
    f.addEventListener("click", exitToForm);
    var r = el("button", "shp-textbtn", S.startAgain);
    r.type = "button";
    r.addEventListener("click", function () { setup = null; showHome(); });
    row.appendChild(f);
    row.appendChild(r);
    return row;
  }
  function setEditor(nodes) {
    editor.innerHTML = "";
    nodes.forEach(function (n) { editor.appendChild(n); });
  }

  /* ---------- home / Q&A ---------- */
  function showHome() {
    var buttons = [];
    buttons.push(chip(S.chipOrganize, onOrganize));
    buttons.push(chip(S.chipCode, startCode));
    buttons.push(chip(S.chipHow, function () { sendQA(S.howQ); }));
    buttons.push(chip(S.chipData, function () { sendQA(S.dataQ); }));
    if (typeof window.SS_ASKP_OPEN === "function") {
      buttons.push(chip(S.chipGifts, function () {
        closePanel();
        window.SS_ASKP_OPEN();
      }));
    }
    var tf = textForm(S.askPh, function (v) { sendQA(v); });
    setEditor([chipRow(buttons), tf.form]);
  }
  function onOrganize() {
    if (canSetup()) { startSetup(); return; }
    if (mount) { /* ES/PT draw surface: the on-page form is the setup */
      closePanel();
      mount.scrollIntoView({ behavior: "smooth" });
      var g = mount.querySelector(".vd-input");
      if (g) g.focus({ preventScroll: true });
      return;
    }
    location.href = "/#tool";
  }
  function scrollToTool() {
    if (mount) {
      mount.scrollIntoView({ behavior: "smooth" });
      var g = mount.querySelector(".vd-input");
      if (g) g.focus({ preventScroll: true });
    } else {
      location.href = "/#tool";
    }
  }
  function act(action) {
    if (action === "setup") {
      if (canSetup()) { startSetup(); return; }
      closePanel();
      scrollToTool();
    }
    if (action === "gifts" && typeof window.SS_ASKP_OPEN === "function") {
      closePanel();
      window.SS_ASKP_OPEN();
    }
  }
  function sendQA(text) {
    var msg = (text || "").trim();
    if (!msg) return;
    userSay(msg);
    track("ask_asked", { surface: "chat" });
    busy.textContent = ct("chat_thinking", "Thinking…");
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, facts: facts || undefined, lang: lang() })
    }).then(function (r) { return r.json(); })
      .then(function (j) {
        busy.textContent = "";
        if (j.facts) facts = j.facts;
        helperSay(j.reply || ct("chat_no_reply", "(no reply)"));
        track("ask_answered", { surface: "chat" });
        if (j.action) act(j.action);
      })
      .catch(function () {
        busy.textContent = "";
        track("ask_fallback", { surface: "chat", missing: "chat-error" });
        helperSay(ct("chat_error", "Something went wrong. Try again, or use the draw form right on this page."));
      });
  }

  /* ---------- I have a code ---------- */
  function startCode() {
    helperSay(S.codePrompt);
    var tf = textForm(S.codePh, function (v) { handleCode(v); });
    var back = chip(S.back, showHome);
    setEditor([tf.form, chipRow([back])]);
    tf.input.focus();
  }
  function handleCode(raw) {
    var text = (raw || "").trim();
    userSay(text);
    var urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch) { location.href = urlMatch[0]; return; }
    var frag = text.match(/#p=([A-Za-z0-9+/=%_-]+)/);
    if (frag) { location.href = "/?via=share#p=" + frag[1]; return; }
    var pathMatch = text.match(/\/(s|g|e)\/([A-Za-z0-9]{8})/);
    if (pathMatch) { location.href = "/" + pathMatch[1] + "/" + pathMatch[2]; return; }
    if (/^[A-Za-z0-9]{8}$/.test(text)) {
      helperSay(S.codeWhich);
      var mk = function (kind, label) {
        return chip(label, function () { location.href = "/" + kind + "/" + text; });
      };
      setEditor([chipRow([mk("s", S.codeMine), mk("g", S.codeOrganizer), mk("e", S.codeGroup), chip(S.back, showHome)])]);
      return;
    }
    helperSay(S.codeBad);
    var tf = textForm(S.codePh, function (v) { handleCode(v); });
    setEditor([tf.form, chipRow([chip(S.back, showHome)])]);
    tf.input.focus();
  }

  /* ---------- guided setup (skin over variant-draw.js) ---------- */
  var setup = null;
  function startSetup() {
    setup = { group: "", names: [], band: null, bf: "", pairs: [], orgIn: null, orgName: "" };
    stepGroup();
  }
  function stepGroup() {
    track("chat_step", { step: "group" });
    helperSay(S.groupPrompt);
    var tf = textForm(S.groupPh, function (v) {
      setup.group = (v || "").trim().slice(0, 60);
      userSay(setup.group || S.groupSkipAnswer);
      stepNames();
    });
    var skip = chip(S.skip, function () {
      setup.group = "";
      userSay(S.groupSkipAnswer);
      stepNames();
    });
    setEditor([tf.form, chipRow([skip]), setupLinks()]);
    tf.input.focus();
  }
  function parseNames(text) {
    var seen = {}, seenLow = {}, out = [], dupe = false, capped = 0;
    String(text == null ? "" : text).split(/[\n,;]+/).forEach(function (raw) {
      var v = Array.from(String(raw).trim()).slice(0, 40).join("").trim();
      if (!v) return;
      if (seen[v]) return;
      if (seenLow[v.toLowerCase()]) { dupe = true; return; }
      seen[v] = true;
      seenLow[v.toLowerCase()] = true;
      if (out.length >= MAX_PEOPLE) { capped++; return; }
      out.push(v);
    });
    return { names: out, dupe: dupe, capped: capped };
  }
  function stepNames() {
    track("chat_step", { step: "names" });
    helperSay(S.namesPrompt);
    var area = el("textarea", "shp-area");
    area.rows = 6;
    area.placeholder = S.namesPh;
    area.setAttribute("aria-label", S.namesPrompt);
    if (setup.names.length) area.value = setup.names.join("\n");
    var cont = el("button", "shp-send", S.continueBtn);
    cont.type = "button";
    var errLine = el("p", "shp-err");
    errLine.hidden = true;
    cont.addEventListener("click", function () {
      var res = parseNames(area.value);
      if (res.dupe) { errLine.textContent = S.errDupe; errLine.hidden = false; return; }
      if (res.names.length < 3) { errLine.textContent = S.errFew; errLine.hidden = false; return; }
      setup.names = res.names;
      setup.pairs = [];
      var label = res.names.join(", ");
      if (label.length > 160) label = label.slice(0, 157) + "…";
      userSay(label + " (" + res.names.length + (res.capped ? ", " + res.capped + " did not fit" : "") + ")");
      stepBudget();
    });
    var row = el("div", "shp-row");
    row.appendChild(cont);
    setEditor([area, row, errLine, setupLinks()]);
    area.focus();
  }
  function stepBudget() {
    track("chat_step", { step: "budget" });
    helperSay(S.budgetPrompt);
    var buttons = BANDS.map(function (b) {
      return chip(b.label, function () {
        setup.band = b.id;
        setup.bf = "";
        userSay(b.label);
        stepPairs();
      });
    });
    buttons.push(chip(S.bandOther, function () {
      track("chat_step", { step: "budget_free" });
      var tf = textForm(S.budgetFreePh, function (v) {
        var t = (v || "").trim().slice(0, 30);
        if (!t) return;
        setup.bf = t;
        if (!setup.band) setup.band = "m2550";
        userSay(t);
        stepPairs();
      });
      setEditor([tf.form, setupLinks()]);
      tf.input.focus();
    }));
    setEditor([chipRow(buttons), setupLinks()]);
  }
  function stepPairs() {
    track("chat_step", { step: "pairs" });
    helperSay(S.pairsPrompt);
    var pending = null;
    var namesRow = el("div", "shp-chips");
    var pairsBox = el("div", "shp-chips");
    var done = chip(S.pairsNone, function () {
      userSay(setup.pairs.length
        ? setup.pairs.map(function (pr) { return setup.names[pr[0]] + " & " + setup.names[pr[1]] + " stay apart"; }).join("; ")
        : S.pairsNone);
      stepOrg();
    }, "shp-on");
    function paintPairs() {
      pairsBox.innerHTML = "";
      setup.pairs.forEach(function (pr, idx) {
        var c = chip(setup.names[pr[0]] + " & " + setup.names[pr[1]] + " stay apart ×", function () {
          setup.pairs.splice(idx, 1);
          paintPairs();
        }, "shp-on");
        pairsBox.appendChild(c);
      });
      done.textContent = setup.pairs.length ? S.pairsDone : S.pairsNone;
    }
    setup.names.forEach(function (nm, i) {
      var c = chip(nm, function (btnEl) {
        if (pending === null) {
          pending = i;
          btnEl.classList.add("shp-on");
          return;
        }
        if (pending === i) {
          pending = null;
          btnEl.classList.remove("shp-on");
          return;
        }
        var a = Math.min(pending, i), b = Math.max(pending, i);
        var dup = setup.pairs.some(function (pr) { return pr[0] === a && pr[1] === b; });
        if (!dup) setup.pairs.push([a, b]);
        pending = null;
        namesRow.querySelectorAll(".shp-chip").forEach(function (x) { x.classList.remove("shp-on"); });
        paintPairs();
      });
      namesRow.appendChild(c);
    });
    paintPairs();
    setEditor([namesRow, pairsBox, chipRow([done]), setupLinks()]);
  }
  function stepOrg() {
    track("chat_step", { step: "organizer" });
    helperSay(S.orgPrompt + " " + S.orgInLine);
    var yes = chip(S.orgYes, function () {
      setup.orgIn = true;
      track("chat_step", { step: "organizer_name" });
      helperSay(S.orgNamePrompt);
      var buttons = setup.names.map(function (nm) {
        return chip(nm, function () {
          setup.orgName = nm;
          userSay(nm);
          stepConfirm();
        });
      });
      var tf = textForm(S.orgNamePh, function (v) {
        var t = Array.from((v || "").trim()).slice(0, 40).join("").trim();
        if (!t) return;
        var low = t.toLowerCase();
        var existing = setup.names.filter(function (n) { return n.toLowerCase() === low; })[0];
        if (existing) {
          setup.orgName = existing;
        } else if (setup.names.length >= MAX_PEOPLE) {
          helperSay(S.errFull);
          return;
        } else {
          setup.names.push(t);
          setup.orgName = t;
        }
        userSay(setup.orgName);
        stepConfirm();
      });
      setEditor([chipRow(buttons), tf.form, setupLinks()]);
    });
    var no = chip(S.orgNo, function () {
      setup.orgIn = false;
      userSay(S.orgNo);
      stepConfirm();
    });
    setEditor([chipRow([yes, no]), setupLinks()]);
  }
  function bandLabel() {
    if (setup.bf) return setup.bf;
    var b = BANDS.filter(function (x) { return x.id === setup.band; })[0];
    return b ? b.label : "$25-$50";
  }
  function stepConfirm() {
    track("chat_step", { step: "confirm" });
    var lines = [S.confirmHead];
    lines.push("Group: " + (setup.group || "no group name"));
    lines.push("Names: " + setup.names.length + " people");
    lines.push("Budget: " + bandLabel());
    lines.push("Keep apart: " + (setup.pairs.length
      ? setup.pairs.map(function (pr) { return setup.names[pr[0]] + " & " + setup.names[pr[1]]; }).join("; ")
      : "none"));
    lines.push(setup.orgIn ? "You: in the draw, as " + setup.orgName : "You: organizing only");
    helperSay(lines.join("\n"));
    var note = el("p", "shp-note", S.storageNote);
    var draw = chip(S.drawBtn, function () { drawFromChat(); }, "shp-berry");
    setEditor([note, chipRow([draw]), setupLinks()]);
  }
  function applyToForm() {
    if (!setup || typeof window.__SS_VDRAW_APPLY__ !== "function") return false;
    var p = {};
    if (setup.group) { p.group = setup.group; p.groupForce = true; }
    if (setup.names.length) p.names = setup.names.slice();
    if (setup.bf) { p.bf = setup.bf; p.band = setup.band || "m2550"; }
    else if (setup.band) p.band = setup.band;
    if (setup.pairs.length && setup.names.length) {
      p.pairs = setup.pairs.map(function (pr) { return [pr[0], pr[1]]; });
    }
    window.__SS_VDRAW_APPLY__(p);
    return true;
  }
  function exitToForm() {
    applyToForm();
    track("chat_exited_to_form", { tool: "secret-santa" });
    setup = null;
    closePanel();
    if (mount) {
      mount.scrollIntoView({ block: "start" });
      var g = mount.querySelector(".vd-input");
      if (g) g.focus({ preventScroll: true });
    }
  }
  function drawFromChat() {
    if (!applyToForm()) return;
    track("chat_draw_completed", { tool: "secret-santa", people_count: setup ? setup.names.length : 0 });
    setup = null;
    closePanel();
    var btnDraw = mount ? mount.querySelector(".vd-draw") : null;
    if (btnDraw) btnDraw.click();
    if (mount) mount.scrollIntoView({ block: "start" });
  }

  paintYield();
})();
