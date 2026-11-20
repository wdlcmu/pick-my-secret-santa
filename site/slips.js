"use strict";
/* SPEC-SS-SLIPS-01 (Nov 20, 2026): printable fold-over slips.
   One shared renderer for both entry points the spec allows:
   the results screen (the drawing browser already holds the
   pairings in memory) and the manage page reprint (pairings
   arrive only after the non-participant declaration gate, in
   app.js). This module renders what the caller hands it; it
   fetches nothing, stores nothing, and is never invoked on a
   recipient surface (/s/, /e/), so no print affordance exists
   there.

   The sheet: one horizontal band per person. Upper panel is
   the outside (the person's name, group, budget — group-public
   facts only); lower panel is the inside (their match and
   their private link), printed rotated 180 degrees so that
   when the lower panel folds up behind the upper panel on the
   dotted line, the inside text reads upright as the slip is
   unfolded. All structure is borders and type: the design
   never depends on printed background fills.

   Honesty rules carried from the spec: the preview warns,
   before anything renders for the printer, that the sheet
   shows every match at once; a keep-it-folded line closes
   every printed page of the sheet; nothing here claims a
   slip can be revoked, tracked, or kept secret from the
   organizer who prints it. Telemetry is counts + draw_id
   only, fired through the host's own tracker (cfg.onEvent). */
(function () {
  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function fitClass(name) {
    var n = Array.from(String(name || "")).length;
    return n <= 12 ? "fit1" : n <= 18 ? "fit2" : n <= 26 ? "fit3" : "fit4";
  }

  function open(cfg) {
    var S = cfg.strings;
    var people = cfg.people || [];
    var root = make("div", "slips-root");
    root.id = "ss-slips-root";
    var panel = make("div", "slips-panel");

    /* Screen-only chrome: instructions, the spoilage warning,
       duplicate-name notes, and the two actions. None of this
       prints (the .slips-screenonly block is display:none in
       the print rules). */
    var chrome = make("div", "slips-screenonly");
    chrome.appendChild(make("p", "slips-instructions", S.instructions));
    chrome.appendChild(make("p", "slips-warning", S.warning));
    var seen = {}, dupDone = {};
    people.forEach(function (p) {
      var nm = String(p.name);
      if (seen[nm] && !dupDone[nm]) {
        dupDone[nm] = true;
        chrome.appendChild(make("p", "slips-dupnote", S.dupNote(nm)));
      }
      seen[nm] = true;
    });
    var actions = make("div", "slips-actions");
    var printBtn = make("button", "slips-printbtn", S.printLabel);
    printBtn.type = "button";
    var backBtn = make("button", "slips-backbtn", S.backLabel);
    backBtn.type = "button";
    actions.appendChild(printBtn);
    actions.appendChild(backBtn);
    chrome.appendChild(actions);
    panel.appendChild(chrome);

    /* The sheet itself: the only part that prints. It is
       built in page-sized chunks of four slips. Page 1's
       chunk carries the header strip; EVERY chunk ends with
       the warning line, so the line is on every printed page
       by construction (in the flow at the foot of the page's
       slips, not in a positioned overlay a print pipeline
       could drop or repeat wrongly). */
    var sheet = make("div", "slips-sheet");
    for (var start = 0; start < people.length; start += 4) {
      var chunk = make("div", "slips-page");
      if (start === 0) {
        var head = make("div", "slips-phead");
        head.appendChild(make("p", "slips-phead-line", S.headLine));
        head.appendChild(make("p", "slips-phead-warn", S.warning));
        chunk.appendChild(head);
      }
      people.slice(start, start + 4).forEach(function (p) {
        var slip = make("div", "slip");
        var out = make("div", "slip-out");
        out.appendChild(make("p", "slip-kicker", cfg.kicker));
        out.appendChild(make("p", "slip-name " + fitClass(p.name), String(p.name)));
        if (cfg.budgetText) out.appendChild(make("p", "slip-budget", cfg.budgetText));
        out.appendChild(make("p", "slip-outnote", S.outsideNote));
        slip.appendChild(out);
        var fold = make("div", "slip-fold");
        fold.appendChild(make("span", "slip-fold-label", S.foldLabel));
        slip.appendChild(fold);
        var inn = make("div", "slip-in");
        var rot = make("div", "slip-in-rot");
        rot.appendChild(make("p", "slip-lead", S.insideLead(String(p.name))));
        rot.appendChild(make("p", "slip-match " + fitClass(p.match), String(p.match)));
        var gift = make("p", "slip-gift");
        gift.appendChild(document.createTextNode(S.giftLine(String(p.match)) + " "));
        gift.appendChild(make("span", "slip-url", String(p.urlText)));
        rot.appendChild(gift);
        rot.appendChild(make("p", "slip-keep", S.keepLine));
        inn.appendChild(rot);
        slip.appendChild(inn);
        chunk.appendChild(slip);
      });
      chunk.appendChild(make("p", "slips-pfoot", S.footLine));
      sheet.appendChild(chunk);
    }
    panel.appendChild(sheet);
    root.appendChild(panel);
    document.body.appendChild(root);
    document.body.classList.add("ss-slips-open");

    function fire(name, extra) {
      if (typeof cfg.onEvent !== "function") return;
      var props = {};
      if (cfg.props) for (var k in cfg.props) props[k] = cfg.props[k];
      if (extra) for (var k2 in extra) props[k2] = extra[k2];
      try { cfg.onEvent(name, props); } catch (e) {}
    }
    fire("slips_opened_preview", null);

    var printFired = false;
    function onAfterPrint() {
      /* afterprint is the completion proxy the spec names: an
         invoked-then-cancelled dialog cannot be told apart
         from a completed print in every browser, so the tap
         fires stage:"tap" and this fires stage:"afterprint";
         reads count distinct draws, not raw firings. */
      if (!printFired) { printFired = true; fire("slips_print_invoked", { stage: "afterprint" }); }
      close();
    }
    function close() {
      window.removeEventListener("afterprint", onAfterPrint);
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("ss-slips-open");
      if (root.parentNode) root.parentNode.removeChild(root);
      if (typeof cfg.onClose === "function") { try { cfg.onClose(); } catch (e) {} }
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    window.addEventListener("afterprint", onAfterPrint);
    printBtn.addEventListener("click", function () {
      fire("slips_print_invoked", { stage: "tap" });
      window.print();
    });
    backBtn.addEventListener("click", close);
    if (printBtn.focus) printBtn.focus();
    return { close: close };
  }

  window.SS_SLIPS = { open: open };
})();
