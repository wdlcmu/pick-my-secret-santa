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
   store), with action chips. On the draw surfaces (EN/ES/PT) the
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

  /* ---------- strings (EN defaults; every field re-resolves through
     the language packs in applyStrings() below — on the homepage the
     packs load before this script, on the ES/PT landers the pack is
     bootstrapped by this script and the chrome repaints on load) --- */
  var S = {
    entryLabel: "Ask Santa's helper",
    bubble: "Questions? Ask me!",
    title: "Santa's Helper",
    consent: "Gift draw helper · I only act when you tap or ask",
    intro: "Hi, I'm Santa's Helper. I can set up your draw step by step, answer questions about how Secret Santa works here, or open your link if someone sent you one. Questions go to the site's AI. Draws and names are never sent to the AI.",
    chipOrganize: "Organize a draw",
    chipCode: "I have a link",
    chipHow: "How does it work?",
    chipData: "My data?",
    chipGifts: "Gift ideas for one person",
    howQ: "How does Secret Santa work on this site?",
    dataQ: "What happens to my data? What do you store?",
    send: "Send",
    askPh: "Ask a question…",
    codePrompt: "Paste your full link here. If someone read it out to you, type just the last part of the link, the 8 letters or numbers after /s/, /g/ or /e/.",
    codePh: "Paste your link",
    codeBad: "That does not look like one of our links. The last part of a link is 8 letters or numbers. Your full link always works pasted here.",
    codeWhich: "Got it. Which kind of link is it?",
    codeMine: "My match link",
    codeOrganizer: "My organizer page",
    codeGroup: "Our group page",
    back: "Back",
    skip: "Skip",
    groupPrompt: "Let's set up your draw. First: does your group have a name? Totally optional, it just labels the links.",
    groupPh: "e.g. Office party 2026",
    groupSkipAnswer: "No group name",
    namesPrompt: "Who is in? Type or paste the names, one on each line or separated by commas. You need at least 3 people, up to 200.",
    namesPh: "Paste the names here, one on each line",
    continueBtn: "Continue",
    errFew: "Add at least 3 names to draw.",
    errDupe: "Two people share a name. Add a last initial to each, so every private link works.",
    errFull: "That would make 201 people, and 200 is the most for one draw. Pick your name from the list instead.",
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
    confirmGroup: "Group: {group}",
    noGroupName: "no group name",
    confirmNames: "Names: {n} people",
    confirmBudget: "Budget: {budget}",
    confirmPairs: "Keep apart: {pairs}",
    none: "none",
    confirmYouIn: "You: in the draw, as {name}",
    confirmYouOut: "You: organizing only",
    pairSep: " & ",
    pairSuffix: " stay apart",
    namesCapped: "{n} did not fit | {n} did not fit",
    dismiss: "Dismiss",
    close: "Close",
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
  var MAX_PEOPLE = 200;

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

  /* Language: the homepage sets window.__SS_LANG (packs preloaded);
     the ES/PT landers set neither that nor load the packs, so fall
     back to the draw mount's data-lang, then the html lang. */
  var LANG = (function () {
    if (window.__SS_LANG === "es" || window.__SS_LANG === "pt") return window.__SS_LANG;
    var m = document.querySelector("[data-vdraw]");
    var dl = m && m.getAttribute("data-lang");
    if (dl === "es" || dl === "pt") return dl;
    var hl = (document.documentElement.getAttribute("lang") || "").toLowerCase().split("-")[0];
    if (hl === "es" || hl === "pt") return hl;
    return "en";
  })();
  function lang() { return LANG; }
  function ct(key, fallback) {
    try {
      var pack = LANG === "es" ? window.SS_ES : LANG === "pt" ? window.SS_PT : null;
      var v = pack && pack["ask_entry_points." + key];
      return typeof v === "string" && v ? v : fallback;
    } catch (e) { return fallback; }
  }
  /* Pack pins: bumped in the same commit as the pack pins in the
     pages, so the bootstrap below never pulls a stale cached pack. */
  var PACK_PIN = { es: "rk53", pt: "rk54" };
  /* Pack bootstrap: on the ES/PT landers nothing loads the pack, so
     inject it here (mirrors the helper.css bootstrap above); when it
     lands, re-resolve the strings and repaint the chrome. */
  if (LANG !== "en" && !(LANG === "es" ? window.SS_ES : window.SS_PT)) {
    var ps = document.createElement("script");
    ps.src = "/i18n-" + LANG + ".js?v=" + PACK_PIN[LANG];
    ps.onload = function () { applyStrings(); };
    document.head.appendChild(ps);
  }
  /* Resolve every S field (and the u25 band label) through the packs,
     then repaint the chrome elements that were built from S. Called
     once at init (bottom of this script) and again on pack load. */
  function applyStrings() {
    S.entryLabel = ct("helper_entry_label", S.entryLabel);
    S.bubble = ct("helper_bubble", S.bubble);
    S.title = ct("helper_title", S.title);
    S.consent = ct("helper_consent", S.consent);
    S.intro = ct("helper_intro", S.intro);
    S.chipOrganize = ct("helper_chip_organize", S.chipOrganize);
    S.chipCode = ct("helper_chip_code", S.chipCode);
    S.chipHow = ct("helper_chip_how", S.chipHow);
    S.chipData = ct("helper_chip_data", S.chipData);
    S.chipGifts = ct("helper_chip_gifts", S.chipGifts);
    S.howQ = ct("helper_how_q", S.howQ);
    S.dataQ = ct("helper_data_q", S.dataQ);
    S.send = ct("send", S.send);
    S.askPh = ct("chat_placeholder", S.askPh);
    S.codePrompt = ct("helper_code_prompt", S.codePrompt);
    S.codePh = ct("helper_code_ph", S.codePh);
    S.codeBad = ct("helper_code_bad", S.codeBad);
    S.codeWhich = ct("helper_code_which", S.codeWhich);
    S.codeMine = ct("helper_code_mine", S.codeMine);
    S.codeOrganizer = ct("helper_code_organizer", S.codeOrganizer);
    S.codeGroup = ct("helper_code_group", S.codeGroup);
    S.back = ct("helper_back", S.back);
    S.skip = ct("helper_skip", S.skip);
    S.groupPrompt = ct("helper_group_prompt", S.groupPrompt);
    S.groupPh = ct("helper_group_ph", S.groupPh);
    S.groupSkipAnswer = ct("helper_group_skip_answer", S.groupSkipAnswer);
    S.namesPrompt = ct("helper_names_prompt", S.namesPrompt);
    S.namesPh = ct("helper_names_ph", S.namesPh);
    S.continueBtn = ct("helper_continue", S.continueBtn);
    S.errFew = ct("helper_err_few", S.errFew);
    S.errDupe = ct("helper_err_dupe", S.errDupe);
    S.errFull = ct("helper_err_full", S.errFull);
    S.budgetPrompt = ct("helper_budget_prompt", S.budgetPrompt);
    S.bandOther = ct("helper_band_other", S.bandOther);
    S.budgetFreePh = ct("helper_budget_free_ph", S.budgetFreePh);
    S.pairsPrompt = ct("helper_pairs_prompt", S.pairsPrompt);
    S.pairsNone = ct("helper_pairs_none", S.pairsNone);
    S.pairsDone = ct("helper_pairs_done", S.pairsDone);
    S.orgPrompt = ct("helper_org_prompt", S.orgPrompt);
    S.orgYes = ct("helper_org_yes", S.orgYes);
    S.orgNo = ct("helper_org_no", S.orgNo);
    S.orgNamePrompt = ct("helper_org_name_prompt", S.orgNamePrompt);
    S.orgNamePh = ct("helper_org_name_ph", S.orgNamePh);
    S.orgInLine = ct("helper_org_in_line", S.orgInLine);
    S.confirmHead = ct("helper_confirm_head", S.confirmHead);
    S.confirmGroup = ct("helper_confirm_group", S.confirmGroup);
    S.noGroupName = ct("helper_no_group_name", S.noGroupName);
    S.confirmNames = ct("helper_confirm_names", S.confirmNames);
    S.confirmBudget = ct("helper_confirm_budget", S.confirmBudget);
    S.confirmPairs = ct("helper_confirm_pairs", S.confirmPairs);
    S.none = ct("helper_none", S.none);
    S.confirmYouIn = ct("helper_confirm_you_in", S.confirmYouIn);
    S.confirmYouOut = ct("helper_confirm_you_out", S.confirmYouOut);
    S.pairSep = ct("helper_pair_sep", S.pairSep);
    S.pairSuffix = ct("helper_pair_suffix", S.pairSuffix);
    S.namesCapped = ct("helper_names_capped", S.namesCapped);
    S.dismiss = ct("helper_dismiss", S.dismiss);
    S.close = ct("helper_close", S.close);
    S.drawBtn = ct("helper_draw_btn", S.drawBtn);
    S.useForm = ct("helper_use_form", S.useForm);
    S.startAgain = ct("helper_start_again", S.startAgain);
    S.storageNote = ct("helper_storage_note", S.storageNote);
    BANDS[0].label = ct("helper_band_u25", BANDS[0].label);
    btn.setAttribute("aria-label", S.entryLabel);
    if (bubbleText) bubbleText.textContent = S.bubble;
    bubbleX.setAttribute("aria-label", S.dismiss);
    titleEl.textContent = S.title;
    consentEl.textContent = S.consent;
    closeBtn.setAttribute("aria-label", S.close);
  }
  /* Pack plural convention: "one | many", picked by n, {n} filled. */
  function plural(tpl, n) {
    var parts = String(tpl).split(" | ");
    var s = parts.length > 1 ? (n === 1 ? parts[0] : parts[1]) : parts[0];
    return s.replace(/\{n\}/g, String(n));
  }
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
    return !!mount && typeof window.__SS_VDRAW_APPLY__ === "function";
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
  var bubbleText = bubble.firstChild;
  var bubbleX = el("button", "shp-bubble-x", "×");
  bubbleX.type = "button";
  bubbleX.setAttribute("aria-label", S.dismiss);
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
     Static text never hides it (that was the old guard's bug).
     Nov 21, 2026 (full-flow sim, Opportunity 9): two narrow
     additions. (1) #interestBlock joins the button's list — the
     reveal's interests disclosure is a decision point, not
     background text, and the button used to park on its sentence.
     (2) The speech bubble is a 210px text card, not a 60px
     button: it now also yields to the blocks it was photographed
     covering (share cards, link rows, the handback card, the
     interests block), so it never sits on page text. The button
     keeps the interactive-only rule above. */
  var YIELD_SEL = "#tool a[href], #tool button, #tool input, #tool select, #tool textarea, #tool summary,"
    + " a.cta, button.cta, #sampleOpen, #peekBtn, #ownDrawCover, #recipientAskGo, .reveal button, .reveal a[href], #interestBlock";
  var BUBBLE_YIELD_SEL = YIELD_SEL + ", .vd-link, .sharecard, .samplecard, #ownDrawAfterGifts"
    /* Nov 22, 2026 (mobile audit D1): the gift card joins the
       bubble's yield set. Its text is static (the yield list's
       interactive-only rule never covered it), and the audit
       photographed the auto-expanded bubble sitting on the first
       card's "What to look for" line on a first reveal. The
       bubble now hides whenever it would overlap the card, and
       can still appear once the card is scrolled clear; the
       round button keeps the interactive-only rule. */
    + ", .giftcard";
  function intersects(a, b) {
    return a.left < b.right + 6 && a.right > b.left - 6 && a.top < b.bottom + 6 && a.bottom > b.top - 6;
  }
  function blockedBySel(rect, sel) {
    var nodes = document.querySelectorAll(sel);
    for (var i = 0; i < nodes.length; i++) {
      var r = nodes[i].getBoundingClientRect();
      if (!r.width && !r.height) continue;
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      if (intersects(rect, r)) return true;
    }
    return false;
  }
  function blockedBy(rect) { return blockedBySel(rect, YIELD_SEL); }
  function bubbleBlockedBy(rect) { return blockedBySel(rect, BUBBLE_YIELD_SEL); }
  var yieldQueued = false;
  function paintYield() {
    yieldQueued = false;
    if (!wrap.hidden) return;
    var br = btn.getBoundingClientRect();
    btn.classList.toggle("shp-yield", blockedBy(br));
    if (!bubble.hidden) bubble.classList.toggle("shp-yield", bubbleBlockedBy(bubble.getBoundingClientRect()));
  }
  function queueYield() {
    if (yieldQueued) return;
    yieldQueued = true;
    if (window.requestAnimationFrame) requestAnimationFrame(paintYield);
    else paintYield();
  }
  window.addEventListener("scroll", queueYield, { passive: true });
  window.addEventListener("resize", queueYield);
  /* Nov 22, 2026 (mobile audit D1, second half): the yield
     repaint must also run when the page re-renders without
     scrolling. The audit's exact sequence — bubble auto-shows
     on the reveal cover, the recipient unwraps, the gift card
     renders underneath the still-shown bubble at scroll 0 —
     never fires scroll or resize, so a yield set that only
     repaints on scroll left the bubble sitting on the card.
     View switches flip the hidden attribute and rebuild nodes;
     taps precede most renders. Both now queue a repaint
     (rAF-coalesced through queueYield, so a busy page costs
     one cheap pass per frame at most). */
  if (window.MutationObserver) {
    new MutationObserver(queueYield).observe(document.body, {
      childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"],
    });
  }
  document.addEventListener("click", queueYield, true);

  var bubbleTried = false;
  function tryBubble() {
    if (bubbleTried || seenFlag() || !wrap.hidden) return;
    bubbleTried = true;
    bubble.hidden = false;
    bubble.classList.remove("shp-yield");
    if (bubbleBlockedBy(bubble.getBoundingClientRect()) || blockedBy(btn.getBoundingClientRect())) {
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
  var titleEl = el("p", "shp-title", S.title);
  titleEl.id = "shpTitle";
  headText.appendChild(titleEl);
  var consentEl = el("p", "shp-consent", S.consent);
  headText.appendChild(consentEl);
  head.appendChild(headText);
  var closeBtn = el("button", "shp-close", "×");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", S.close);
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
  function helperSay(text) { add(text, S.title.toUpperCase(), ""); }
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
    if (mount) { /* draw surface without the prefill bridge: the on-page form is the setup */
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
      userSay(label + " (" + res.names.length + (res.capped ? ", " + plural(S.namesCapped, res.capped) : "") + ")");
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
        ? setup.pairs.map(function (pr) { return setup.names[pr[0]] + S.pairSep + setup.names[pr[1]] + S.pairSuffix; }).join("; ")
        : S.pairsNone);
      stepOrg();
    }, "shp-on");
    function paintPairs() {
      pairsBox.innerHTML = "";
      setup.pairs.forEach(function (pr, idx) {
        var c = chip(setup.names[pr[0]] + S.pairSep + setup.names[pr[1]] + S.pairSuffix + " ×", function () {
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
    lines.push(S.confirmGroup.replace("{group}", setup.group || S.noGroupName));
    lines.push(S.confirmNames.replace("{n}", String(setup.names.length)));
    lines.push(S.confirmBudget.replace("{budget}", bandLabel()));
    lines.push(S.confirmPairs.replace("{pairs}", setup.pairs.length
      ? setup.pairs.map(function (pr) { return setup.names[pr[0]] + S.pairSep + setup.names[pr[1]]; }).join("; ")
      : S.none));
    lines.push(setup.orgIn ? S.confirmYouIn.replace("{name}", setup.orgName) : S.confirmYouOut);
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

  applyStrings();
  paintYield();
})();

/* ---------- UI click coverage (SPEC-SS-UICLICK-01, Nov 20, 2026) ----------
   PostHog runs with autocapture OFF on this site, so an element without
   an explicit event is completely dark. The semantic events (draw flow,
   share kit, manage, reveal, chat, ask, slips) are the record for
   everything they cover; this module is the net under the rest. ONE
   generic event, ui_click, for clicks no semantic event claims — never
   per-element event names.

   No double-firing: fleetTrack and FA.track are wrapped to stamp the
   moment (performance clock) of the last semantic event. A click whose
   own handling produced a semantic event at or after the click's own
   timestamp never also fires ui_click. Share buttons whose semantic
   event intentionally waits for the share sheet to resolve are NOT in
   scope here (they are semantically covered controls, excluded by the
   allowlist below), so no delayed decision is needed.

   Scope: on content/legal pages every button, link and summary tap
   fires unless claimed. On the draw/app surfaces (homepage shell, the
   17 variant landers, reveal/manage/group views) only an allowlist of
   inventoried uncovered controls fires — the kit, manage and draw
   controls there are semantically covered and mostly generic classes,
   so a blanket net would double-fire them. Helper chrome, the Ask
   panel chrome and the slips overlay are in scope on every surface
   (their covered members are claimed by the stamp rule). Any element
   may opt in anywhere with data-ui="slug".

   Privacy: properties are identifiers only — surface kind, an element
   slug (data-ui, else id, else a class, else an href KIND for links),
   and a zone (nearest ancestor id). The element's TEXT is never read:
   several buttons carry a person's name ("Share Maya's link"). Clicks
   on form fields never fire. /s//g//e/ hrefs collapse to their kind
   letter, so no link token can ride along; the loader's own scrubber
   cuts the page URL to its bare path as for every other event.

   Volume: each (surface, zone, element) fires at most once per page
   load. The question this answers is "which controls do people use at
   all"; the semantic events already carry the frequencies that
   matter. That cap keeps the added volume a small fraction of the
   shared project's monthly quota at crest traffic. */
(function () {
  if (window.__SS_UICLICK__) return;
  window.__SS_UICLICK__ = true;

  var lastEvPerf = -1;
  var origFT = null, origFA = null;
  function wrap() {
    try {
      if (typeof window.fleetTrack === "function" && !window.fleetTrack.__ssUiWrap) {
        origFT = window.fleetTrack;
        var wft = function (name, props) { lastEvPerf = performance.now(); return origFT(name, props); };
        wft.__ssUiWrap = true;
        window.fleetTrack = wft;
      }
    } catch (e) {}
    try {
      if (window.FA && typeof window.FA.track === "function" && !window.FA.track.__ssUiWrap) {
        origFA = window.FA.track;
        var wfa = function (name, props) { lastEvPerf = performance.now(); return origFA(name, props); };
        wfa.__ssUiWrap = true;
        window.FA.track = wfa;
      }
    } catch (e) {}
  }
  wrap();

  function uiTrack(props) {
    try {
      if (origFT) { origFT("ui_click", props); return; }
      if (typeof window.fleetTrack === "function") { window.fleetTrack("ui_click", props); return; }
      if (origFA) { origFA("ui_click", props); return; }
      if (window.FA && typeof window.FA.track === "function") window.FA.track("ui_click", props);
    } catch (e) {}
  }

  function surface() {
    var p = location.pathname || "/";
    if (document.querySelector("[data-vdraw]")) return "draw";
    if (p === "/" || /^\/(s|g|e)\//.test(p)) return "app";
    if (/privacy|terms/.test(p)) return "legal";
    return "page";
  }

  /* Draw/app-surface allowlist: the inventoried uncovered controls
     (INVENTORY, santa-full-telemetry-2026-11-20). Covered controls are
     deliberately absent; any that ever land here are still claimed by
     the stamp rule when their event fires synchronously. */
  var FLOW_OK = [
    "[data-ui]", "summary",
    "#budgetChips button", "#budgetFreeChip", ".vd-chip",
    "#toStep2", "#back1", "#toStep3", "#back2", "#startOver",
    "#presetCouples", "#presetLastYear", "#presetKids", "#clearRestrict",
    "#exclNone", "#exclSet", "#restrictMain button", "#modePanel button",
    ".pairx", "#bulkToggle", "#bulkClose",
    "#clearDrawBtn", "#savedKitToggle", "#upgradeShortBtn",
    "#cdx-main", ".wai-copy",
    "#revealPasteBtn", "#pasteLinkBtn", "#revealError button", ".recipientmore",
    ".vd-remove", ".vd-add", ".vd-pastebtn", ".vd-pastecancel",
    ".vd-pairchip", ".vd-pairadd",
    ".altbtn", ".pact-tertiary"
  ];

  function slugFor(elm) {
    var dui = elm.getAttribute("data-ui");
    if (dui) return dui.slice(0, 40);
    if (elm.id) return elm.id.slice(0, 40);
    var cls = (elm.getAttribute("class") || "").split(/\s+/);
    var first = "";
    for (var i = 0; i < cls.length; i++) {
      var c = cls[i];
      if (!c) continue;
      if (!first) first = c;
      if (!/^(active|open|on|hidden|selected|alt|primary|secondary|chip|altbtn)$/.test(c)) return c.slice(0, 40);
    }
    if (elm.tagName === "A") {
      var h = elm.getAttribute("href") || "";
      if (/^https?:/.test(h)) {
        try { return ("ext-" + new URL(h).hostname.replace(/^www\./, "").split(".")[0]).slice(0, 40); } catch (e) {}
      }
      if (h.charAt(0) === "/") {
        var seg = h.split(/[?#]/)[0].split("/").filter(Boolean);
        if (seg[0] === "s" || seg[0] === "g" || seg[0] === "e") return "link-" + seg[0];
        return ("link-" + (seg.join("-") || "home")).slice(0, 40);
      }
      if (h.charAt(0) === "#") return ("anchor-" + h.slice(1)).slice(0, 40);
    }
    if (first) return first.slice(0, 40);
    return elm.tagName.toLowerCase();
  }

  function zoneFor(elm) {
    var n = elm.parentElement;
    while (n && n !== document.body) {
      if (n.id) return n.id.slice(0, 40);
      n = n.parentElement;
    }
    return "";
  }

  function chromeZone(elm) {
    if (elm.closest(".shp-wrap, .shp-bubble")) return "helper";
    if (elm.closest(".slips-root")) return "slips";
    if (elm.id === "askpPill" || elm.id === "askpClose" || elm.closest("#askpWrap")) return "askp";
    return null;
  }

  var fired = {};
  /* The snapshot is taken in the CAPTURE phase, before the element's
     own handlers run: several controls re-render their container on
     click (the helper's chips replace the sheet's content, detaching
     the clicked node before a bubble-phase listener could read its
     ancestors), and a few handlers stop propagation outright (the
     helper bubble's dismiss). Capture at document level precedes both.
     The fire decision itself is deferred past the dispatch, so a
     semantic event stamped by the element's own handlers — at or
     after the click's timestamp — still claims the click. */
  function snapshot(elm) {
    wrap();
    var surf = surface();
    var zone = chromeZone(elm);
    var ok = false;
    if (zone) ok = true;
    else if (elm.getAttribute("data-ui")) ok = true;
    else if (surf === "page" || surf === "legal") ok = true;
    else if (elm.tagName === "A" && /^https?:/.test(elm.getAttribute("href") || "")) ok = true;
    else {
      for (var i = 0; i < FLOW_OK.length; i++) {
        if (elm.matches(FLOW_OK[i])) { ok = true; break; }
      }
    }
    if (!ok) return null;
    return { surf: surf, slug: slugFor(elm), zn: zone || zoneFor(elm) };
  }

  function settle(snap, evTs, via) {
    if (!snap) return;
    var key = snap.surf + "|" + snap.zn + "|" + snap.slug + "|" + via;
    if (fired[key]) return;
    setTimeout(function () {
      if (lastEvPerf >= evTs - 1) return;
      if (fired[key]) return;
      fired[key] = 1;
      var props = { tool: "secret-santa", surface: snap.surf, el: snap.slug };
      if (snap.zn) props.zone = snap.zn;
      if (via !== "click") props.via = via;
      uiTrack(props);
    }, 0);
  }

  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var elm = t.closest("button, a, summary, [data-ui]");
    if (!elm) return;
    if (elm.closest("input, textarea")) return;
    settle(snapshot(elm), ev.timeStamp || 0, "click");
  }, true);

  /* Selects: the Ask panel's band picker and the variant form's
     keep-apart pair selects are choices, not clicks. Same net. */
  document.addEventListener("change", function (ev) {
    var elm = ev.target;
    if (!elm || elm.tagName !== "SELECT") return;
    if (elm.id !== "askpBand" && !elm.classList.contains("vd-select") && !elm.getAttribute("data-ui")) return;
    settle(snapshot(elm), ev.timeStamp || 0, "change");
  }, true);
})();
