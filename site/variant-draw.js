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
   in Spanish (SPEC-SS-AMIGO-01). Portuguese pages (data-lang="pt")
   do the same in PT-BR with lang:"pt" (SPEC-SS-AMIGO-PT-01).
   Free-text budget parity (SPEC-SS-BUDGETFREE-01, Task M, Nov 13,
   2026): the homepage's "Other amount" chip + text field ride this
   form too, in each page's language — the typed text (cleaned with
   the same hygiene as app.js, capped at 30 chars) rides the draw
   as `bf` on the token, the on-device record and the group record,
   picks fall back to the middle band, and every display below
   prefers `bf` over the band label, verbatim. */
(function () {
  var mount = document.querySelector("[data-vdraw]");
  if (!mount) return;
  var DL = mount.getAttribute("data-lang");
  var LANG = DL === "es" ? "es" : DL === "pt" ? "pt" : "en";
  var ES = LANG === "es";
  var PT = LANG === "pt";

  var BANDS = [
    { id: "u25", label: "Under $25" },
    { id: "m2550", label: "$25-$50" },
    { id: "m50100", label: "$50-$100" },
    { id: "m100", label: "$100+" }
  ];
  var INTERESTS = PT ? [
    ["", "Do que ela gosta (opcional)"], ["surprise", "Me surpreenda"],
    ["cooking", "Cozinha"], ["tech", "Tecnologia"], ["outdoors", "Ar livre"],
    ["games", "Jogos"], ["fitness", "Exercícios"], ["travel", "Viagens"],
    ["cozy", "Coisas aconchegantes"], ["books", "Livros"], ["science", "Ciência"],
    ["music", "Música"], ["gardening", "Jardinagem"]
  ] : ES ? [
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
  var S = PT ? {
    heading: "Faça o sorteio aqui",
    sub: "Escreva os nomes, sorteie em segredo e envie a cada pessoa o link privado dela.",
    groupLabel: "Nome do grupo (opcional)",
    groupPh: "Ex.: Escritório 2026",
    budgetLabel: "Valor do presente",
    budgetFree: "Outro valor",
    budgetFreeLabel: "Seu valor, nas suas palavras",
    budgetFreePh: "20€, R$ 50, o que você quiser",
    whoLabel: "Quem vai participar? (de 3 a 30 pessoas)",
    namePh: "Nome",
    addPerson: "+ Adicionar uma pessoa",
    pairsSummary: "Pares que não devem sair juntos (opcional)",
    pairsHelp: "Só se duas pessoas não devem se presentear, como casais ou colegas de quarto.",
    pairAdd: "Adicionar",
    pairSep: " e ",
    pairSuffix: " não saem juntos",
    drawBtn: "Sortear os nomes",
    drawing: "Sorteando…",
    note: "O sorteio é feito no seu navegador. Nosso servidor guarda cada nome e sua combinação para os links curtos, de um jeito que a gente consegue ler. Seus links também ficam guardados neste aparelho.",
    errFew: "Adicione pelo menos 3 nomes para sortear.",
    errDupe: "Duas pessoas têm o mesmo nome. Adicione uma inicial do sobrenome a cada uma, para que cada link privado funcione.",
    errDrawSmall: "Nenhum sorteio justo cumpre estas regras. Grupos pequenos são frágeis: cada pessoa só pode tirar alguns nomes e os pares bloqueiam demais. Remova um par ou adicione uma pessoa e sorteie de novo.",
    errDraw: "Nenhum sorteio justo cumpre estas regras. Remova um par ou dois e sorteie de novo.",
    doneH: "Seu sorteio está pronto",
    doneSub: "Nenhuma tela aqui mostra quem tirou quem.",
    redrawNote: "Sorteio novo, links novos: os anteriores continuam funcionando, então envie estes novos.",
    linkReady: "Link privado pronto",
    preparing: "Preparando seu link privado…",
    copied: "Copiado",
    copyFor: function (n) { return "Copiar o link de " + n; },
    shareFor: function (n) { return "Compartilhar o link de " + n; },
    kitHead: "Seu sorteio está pronto. Envie a cada pessoa o link privado dela.",
    kitExplainer: "Um link para uma pessoa. Quem abrir vê a combinação dela. Envie só para ela.",
    confirmCopied: function (n) { return "Link de " + n + " copiado — envie só para " + n + "."; },
    confirmShared: function (n) { return "Link de " + n + " compartilhado — envie só para " + n + "."; },
    confirmWhatsapp: function (n) { return "WhatsApp aberto com o link de " + n + " — envie só para " + n + "."; },
    confirmSms: function (n) { return "SMS aberto com o link de " + n + " — envie só para " + n + "."; },
    groupShare: "Compartilhar o anúncio para o grupo",
    groupConfirmCopied: "Mensagem do grupo copiada.",
    groupConfirmShared: "Mensagem do grupo compartilhada.",
    personMsg: function (g, b, url, name) { return g ? "Você está no amigo secreto de " + g + ", valor " + b + ". Aqui está seu link privado, " + name + ": " + url + " Ele mostra só a sua combinação. Guarde só para você: quem tiver o link pode abrir." : "Você está em um sorteio de amigo secreto, valor " + b + ". Aqui está seu link privado, " + name + ": " + url + " Ele mostra só a sua combinação. Guarde só para você: quem tiver o link pode abrir."; },
    groupMsg: "Copiar o anúncio para o grupo",
    manageLabel: "Seu link de organizador: salve para ver quem já abriu o dele e reenviar links",
    manageCopy: "Copiar link de organizador",
    manageOpen: "Abrir a página de administração",
    again: "Começar de novo",
    draftSaved: "Rascunho salvo neste aparelho",
    draftClear: "Começar do zero",
    groupMsgHead: function (g, b) { return g ? "O sorteio de amigo secreto de " + g + " já foi feito, valor " + b + "." : "Nosso sorteio de amigo secreto já foi feito, valor " + b + "."; },
    groupMsgTail: " Vou enviar a cada um seu próprio link privado: a sua combinação está só no seu. Guarde só para você e não repasse."
  } : ES ? {
    heading: "Haz el sorteo aquí",
    sub: "Escribe los nombres, sortea en secreto y envía a cada persona su enlace privado.",
    groupLabel: "Nombre del grupo (opcional)",
    groupPh: "Ej.: Oficina 2026",
    budgetLabel: "Presupuesto del regalo",
    budgetFree: "Otro monto",
    budgetFreeLabel: "Tu presupuesto, en tus palabras",
    budgetFreePh: "20€, $30, lo que quieras",
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
    note: "El sorteo se hace en tu navegador. Nuestro servidor guarda cada nombre y su asignación para los enlaces cortos, de una forma que podemos leer. Tus enlaces también quedan guardados en este dispositivo.",
    errFew: "Agrega al menos 3 nombres para sortear.",
    errDupe: "Dos personas comparten el mismo nombre. Agrega una inicial a cada una para que cada enlace privado funcione.",
    errDrawSmall: "Ningún sorteo justo cumple estas reglas. Los grupos pequeños son frágiles: cada persona solo puede sacar algunos nombres y las parejas bloquean demasiados. Quita una pareja o agrega una persona y sortea de nuevo.",
    errDraw: "Ningún sorteo justo cumple estas reglas. Quita una pareja o dos y sortea de nuevo.",
    doneH: "Tu sorteo está listo",
    doneSub: "Ninguna pantalla aquí muestra quién salió con quién.",
    redrawNote: "Sorteo nuevo, enlaces nuevos: los anteriores siguen funcionando, así que envía estos nuevos.",
    linkReady: "Enlace privado listo",
    preparing: "Preparando tu enlace privado…",
    copied: "Copiado",
    copyFor: function (n) { return "Copiar el enlace de " + n; },
    shareFor: function (n) { return "Compartir el enlace de " + n; },
    kitHead: "Tu sorteo está listo. Envía a cada persona su enlace privado de asignación.",
    kitExplainer: "Un enlace para una persona. Quien lo abra ve su asignación. Envíalo solo a esa persona.",
    confirmCopied: function (n) { return "Enlace de " + n + " copiado — envíalo solo a " + n + "."; },
    confirmShared: function (n) { return "Enlace de " + n + " compartido — envíalo solo a " + n + "."; },
    confirmWhatsapp: function (n) { return "WhatsApp abierto con el enlace de " + n + " — envíalo solo a " + n + "."; },
    confirmSms: function (n) { return "SMS abierto con el enlace de " + n + " — envíalo solo a " + n + "."; },
    groupShare: "Compartir el anuncio para el grupo",
    groupConfirmCopied: "Mensaje del grupo copiado.",
    groupConfirmShared: "Mensaje del grupo compartido.",
    personMsg: function (g, b, url, name) { return g ? "Estás en el amigo secreto de " + g + ", presupuesto " + b + ". Aquí tienes tu enlace privado, " + name + ": " + url + " Solo muestra tu asignación. Guárdalo para ti: quien tenga el enlace puede abrirlo." : "Estás en un sorteo de amigo secreto, presupuesto " + b + ". Aquí tienes tu enlace privado, " + name + ": " + url + " Solo muestra tu asignación. Guárdalo para ti: quien tenga el enlace puede abrirlo."; },
    groupMsg: "Copiar el anuncio para el grupo",
    manageLabel: "Tu enlace de organizador: guárdalo para ver quién abrió el suyo y reenviar enlaces",
    manageCopy: "Copiar enlace de organizador",
    manageOpen: "Abrir la página de gestión",
    again: "Empezar de nuevo",
    draftSaved: "Borrador guardado en este dispositivo",
    draftClear: "Empezar de cero",
    groupMsgHead: function (g, b) { return g ? "El sorteo de amigo secreto de " + g + " ya está hecho, presupuesto " + b + "." : "Nuestro sorteo de amigo secreto ya está hecho, presupuesto " + b + "."; },
    groupMsgTail: " Le enviaré a cada uno su propio enlace privado: tu asignación está solo en el tuyo. Guárdalo para ti y no lo reenvíes."
  } : {
    heading: "Start your draw here",
    sub: "Add the names, draw in secret, send each person their private link.",
    groupLabel: "Group name (optional)",
    groupPh: "e.g. Office party 2026",
    budgetLabel: "Gift budget",
    budgetFree: "Other amount",
    budgetFreeLabel: "Your budget, in your words",
    budgetFreePh: "20€, $30, up to you",
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
    note: "The draw runs in your browser. Names and matches are stored on our server for the short links, in a form we can read. Your links stay saved on this device.",
    errFew: "Add at least 3 names to draw.",
    errDupe: "Two people share a name. Add a last initial to each, so every private link works.",
    errDrawSmall: "No fair draw fits these rules. Small groups are fragile: each person has only a few names they could draw, and the keep-apart pairs block too many of them. Remove a keep-apart pair, or add a person, then draw again.",
    errDraw: "No fair draw fits these rules. Remove a keep-apart pair or two, then draw again.",
    doneH: "Your draw is done",
    doneSub: "No screen here shows who got whom.",
    redrawNote: "New draw, new links — the old ones still work, so resend these new ones.",
    linkReady: "Private link ready",
    preparing: "Preparing your private link…",
    copied: "Copied",
    copyFor: function (n) { return "Copy " + n + "\u2019s link"; },
    shareFor: function (n) { return "Share " + n + "\u2019s link"; },
    kitHead: "Your draw is ready. Send each person their private match link.",
    kitExplainer: "One link for one person. Whoever opens it sees their match. Send it only to them.",
    confirmCopied: function (n) { return "Copied " + n + "\u2019s link — send it only to " + n + "."; },
    confirmShared: function (n) { return "Shared " + n + "\u2019s link — send it only to " + n + "."; },
    confirmWhatsapp: function (n) { return "WhatsApp opened with " + n + "\u2019s link — send it only to " + n + "."; },
    confirmSms: function (n) { return "SMS opened with " + n + "\u2019s link — send it only to " + n + "."; },
    groupShare: "Share the group announcement",
    groupConfirmCopied: "Copied the group message.",
    groupConfirmShared: "Shared the group message.",
    personMsg: function (g, b, url, name) { return g ? "You're in " + g + "'s Secret Santa, budget " + b + ". Here's your private link, " + name + ": " + url + " It shows only your match. Keep it to yourself \u2014 anyone with the link can open it." : "You're in a Secret Santa draw, budget " + b + ". Here's your private link, " + name + ": " + url + " It shows only your match. Keep it to yourself \u2014 anyone with the link can open it."; },
    groupMsg: "Copy the group announcement",
    manageLabel: "Your organizer link — bookmark it to watch who has opened theirs and to resend links",
    manageCopy: "Copy organizer link",
    manageOpen: "Open the manage page",
    again: "Start over",
    draftSaved: "Draft saved on this device",
    draftClear: "Start fresh",
    groupMsgHead: function (g, b) { return g ? g + "'s Secret Santa draw is done, budget " + b + "." : "Our Secret Santa draw is done, budget " + b + "."; },
    groupMsgTail: " I'll send each of you your own private link \u2014 your match is only in yours. Keep it to yourself and don't forward it."
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
  /* Release A (P0-1/P0-2/P0-4/P0-5, Nov 10, 2026): parity with
     site/app.js — one opaque 32-hex draw ID per draw (fresh crypto
     seed via trkHex in doDraw, record-level di beside payload p,
     never inside p); link_copied restored through one copy funnel;
     draw_started/setup_completed funnel middle; first-touch stamp
     from the existing fleet_ft2 store on draw_created only. */
  var currentDrawId = null;
  function validDrawId(v) { return typeof v === "string" && /^[a-f0-9]{32}$/.test(v) ? v : null; }
  function drawIdProps() { return currentDrawId ? { draw_id: currentDrawId } : {}; }
  function mergeProps(base, extra) {
    var out = {};
    Object.keys(base || {}).forEach(function (k) { out[k] = base[k]; });
    Object.keys(extra || {}).forEach(function (k) { out[k] = extra[k]; });
    return out;
  }
  /* Release B (P1-1/P1-2): the share kit's funnel — one
     share_intent per tap with kind = native|whatsapp|sms|clipboard
     (channel mirrors kind), plus link_copied for clipboard only.
     Enums + draw_id only; the link rides the DOM href / clipboard
     text, never an event property. */
  function trackShareVia(kind) {
    track("share_intent", mergeProps({ tool: "secret-santa", channel: kind, kind: kind }, drawIdProps()));
    if (kind === "clipboard") track("link_copied", mergeProps({ tool: "secret-santa", kind: "clipboard" }, drawIdProps()));
  }
  function waHref(msg) { return "https://wa.me/?text=" + encodeURIComponent(msg); }
  // SPEC-SS-RESULTSKIT-01: smsHref removed with the SMS deep link (S3).
  function trackShareCopy(kind) {
    track("share_intent", mergeProps({ tool: "secret-santa", channel: "clipboard", kind: kind }, drawIdProps()));
    track("link_copied", mergeProps({ tool: "secret-santa", kind: kind }, drawIdProps()));
  }
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
    if (!out.entry_landing) out.entry_landing = (location.pathname || "/").slice(0, 100);
    return out;
  }
  var drawStartedFired = false;
  var setupCompletedFired = false;
  var namesAddedRows = Object.create(null);
  function checkSetupState(rowId) {
    if (!drawStartedFired) {
      drawStartedFired = true;
      track("draw_started", { tool: "secret-santa", entry: "draw" });
    }
    if (rowId != null && !namesAddedRows[rowId]) {
      namesAddedRows[rowId] = true;
      // C7 shape: method rows, no count_bucket.
      track("names_added", { tool: "secret-santa", method: "rows" });
    }
    if (!setupCompletedFired) {
      var seen = Object.create(null), n = 0;
      gatherPeople().forEach(function (pp) {
        var k = pp.name.toLowerCase();
        if (k && !seen[k]) { seen[k] = true; n++; }
      });
      if (n >= 3) {
        setupCompletedFired = true;
        track("setup_completed", { tool: "secret-santa", people_count: n });
      }
    }
  }
  function todayISO() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function copyText(text, btn, doneLabel) {
    function done() {
      if (!btn) return;
      var old = btn.textContent;
      btn.textContent = doneLabel || S.copied;
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

  /* Share-kit transparency (Nov 10, 2026): named confirmation
     flashed on the tapped control, then restored. UI only. */
  function flashLabel(ctl, text) {
    if (ctl.getAttribute("data-kit-orig") == null) ctl.setAttribute("data-kit-orig", ctl.textContent);
    ctl.textContent = text;
    if (ctl._kitTimer) clearTimeout(ctl._kitTimer);
    ctl._kitTimer = setTimeout(function () { ctl.textContent = ctl.getAttribute("data-kit-orig"); }, 1800);
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
  groupInput.addEventListener("input", function () {
    if (groupInput.value.trim()) checkSetupState(null);
  });

  form.appendChild(el("span", "vd-label", S.budgetLabel));
  var chips = el("div", "vd-chips");
  chips.setAttribute("role", "group");
  var band = "m2550";
  var bandFree = false;
  var chipBtns = BANDS.map(function (b) {
    // SPEC-SS-COLDQA-04: display-only localization — the stored band
    // label stays the English canonical string (records, tokens and the
    // worker all key off it); only the chip's visible words translate.
    // The other three bands are bare ranges, identical in both languages.
    var btn = el("button", "vd-chip", ((ES || PT) && b.id === "u25") ? "Menos de $25" : b.label);
    btn.type = "button";
    btn.setAttribute("aria-pressed", b.id === band ? "true" : "false");
    btn.addEventListener("click", function () {
      bandFree = false;
      paintBudgetFree();
      band = b.id;
      chipBtns.forEach(function (c, i) { c.setAttribute("aria-pressed", BANDS[i].id === band ? "true" : "false"); });
      saveDraft();
    });
    chips.appendChild(btn);
    return btn;
  });
  form.appendChild(chips);

  /* Free-text budget (SPEC-SS-BUDGETFREE-01 parity, Task M): a
     fifth chip in its own row, exactly like the homepage — tapping
     it reveals the text field and the bands stop applying (picks
     fall back to the middle band); tapping any band chip turns
     free text back off. */
  var freeChips = el("div", "vd-chips vd-chips-free");
  var freeChip = el("button", "vd-chip", S.budgetFree);
  freeChip.type = "button";
  freeChip.setAttribute("aria-pressed", "false");
  freeChips.appendChild(freeChip);
  form.appendChild(freeChips);
  var freeWrap = el("div", "vd-freewrap");
  freeWrap.hidden = true;
  var freeLabel = el("label", "vd-label", S.budgetFreeLabel);
  freeLabel.htmlFor = "vd-budgetfree-" + (mount.id || "tool");
  var freeInput = el("input", "vd-input");
  freeInput.type = "text";
  freeInput.id = freeLabel.htmlFor;
  freeInput.maxLength = 30;
  freeInput.setAttribute("autocomplete", "off");
  freeInput.placeholder = S.budgetFreePh;
  freeWrap.appendChild(freeLabel);
  freeWrap.appendChild(freeInput);
  form.appendChild(freeWrap);
  function paintBudgetFree() {
    freeChip.setAttribute("aria-pressed", bandFree ? "true" : "false");
    freeWrap.hidden = !bandFree;
  }
  freeChip.addEventListener("click", function () {
    bandFree = true;
    band = "m2550";
    chipBtns.forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
    paintBudgetFree();
    freeInput.focus();
    saveDraft();
  });
  /* The same cleaning app.js applies (SPEC-SS-BUDGETFREE-01):
     strip invisibles via SS_CORE, drop control chars and the
     replacement char, collapse whitespace, cap at the field's
     own 30 characters. Written as a code-point filter so the
     class boundaries stay exact. */
  var BUDGET_FREE_MAX = 30;
  function cleanBudgetFree(CORE, s) {
    var v = CORE.stripInvisible(String(s == null ? "" : s));
    v = Array.from(v).filter(function (ch) {
      var cp = ch.codePointAt(0);
      return !(cp < 0x20 || (cp >= 0x7f && cp <= 0x9f) || cp === 0xfffd);
    }).join("");
    v = v.replace(/\s+/g, " ").trim();
    return Array.from(v).slice(0, BUDGET_FREE_MAX).join("").trim();
  }
  function currentBudgetFree(CORE) {
    if (!bandFree) return "";
    return cleanBudgetFree(CORE, freeInput.value);
  }

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
    // SPEC-SS-ENTRY-01 (Nov 11, 2026): no interest picker on the row.
    // The interest rides as a hidden input with the class gatherPeople
    // has always read, defaulting to "surprise" silently (SS_CORE
    // pickGifts treats "surprise" exactly like the old blank default).
    var sel = el("input", "vd-interest");
    sel.type = "hidden";
    sel.value = "surprise";
    var rm = el("button", "vd-remove", "×");
    rm.type = "button";
    rm.setAttribute("aria-label", "Remove");
    rm.addEventListener("click", function () {
      row.parentNode.removeChild(row);
      prunePairs();
      refreshPairSelects();
      saveDraft();
    });
    name.addEventListener("input", refreshPairSelects);
    name.addEventListener("input", function () {
      if (name.value.trim()) checkSetupState(row.dataset.rowId);
    });
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
        saveDraft();
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
    saveDraft();
  });

  var drawBtn = el("button", "vd-draw", S.drawBtn);
  drawBtn.type = "button";
  form.appendChild(drawBtn);
  form.appendChild(el("p", "vd-note", S.note));

  for (var i = 0; i < 4; i++) addRow();

  /* SPEC-SS-DRAFT-01 (Nov 18, 2026): the in-progress draft persists
     on this device only. The returning-visitor audit found the one
     true dead end in this flow: names, budget and keep-apart pairs
     lived in page memory, so an interrupted organizer came back to
     an empty form. Now the form mirrors itself into localStorage
     (ss_draft_v1) on every change — typing via the form's bubbling
     input events, taps via saveDraft() calls in the chip / pair /
     row handlers and at the end of the prefill bridge — and the
     restore below (through that same bridge) puts it back on
     return. Nothing new leaves the device: the draft is names,
     budget and pairs only, written nowhere until a draw exists,
     exactly the posture of the ss_draw_v1 record it sits beside.
     Completing a draw clears it (the saved-draw kit is the
     post-draw mechanism); the bar under the form names the state
     and carries the start-fresh clear. Names store deduplicated,
     the same cleaning the prefill bridge applies, and pairs store
     as index pairs into that list — a pair whose ends collapse to
     one name drops instead of pointing at a different person. */
  var DRAFT_KEY = "ss_draft_v1";
  var draftBar = el("div", "vd-draftbar");
  draftBar.hidden = true;
  draftBar.appendChild(el("span", null, S.draftSaved));
  var draftClearBtn = el("button", "vd-draftclear", S.draftClear);
  draftClearBtn.type = "button";
  draftBar.appendChild(draftClearBtn);
  form.appendChild(draftBar);
  var draftActive = false;
  function paintDraftBar() { draftBar.hidden = !draftActive; }
  function draftSnapshot() {
    var people = gatherPeople();
    var names = [], firstIdx = Object.create(null);
    people.forEach(function (p) {
      if (firstIdx[p.name] == null) { firstIdx[p.name] = names.length; names.push(p.name); }
    });
    var idxOfRow = Object.create(null);
    people.forEach(function (p) { idxOfRow[p.rowId] = firstIdx[p.name]; });
    var prs = [];
    pairs.forEach(function (pr) {
      var a = idxOfRow[pr[0]], b = idxOfRow[pr[1]];
      if (a == null || b == null || a === b) return;
      var dup = prs.some(function (x) { return (x[0] === a && x[1] === b) || (x[0] === b && x[1] === a); });
      if (!dup) prs.push([a, b]);
    });
    return {
      group: groupInput.value.trim(),
      band: band,
      free: bandFree,
      bf: bandFree ? freeInput.value : "",
      names: names,
      pairs: prs
    };
  }
  function draftHasContent(d) {
    return !!(d.group || d.names.length || d.pairs.length || d.free || d.band !== "m2550");
  }
  function saveDraft() {
    try {
      var d = draftSnapshot();
      if (!draftHasContent(d)) {
        localStorage.removeItem(DRAFT_KEY);
        draftActive = false;
      } else {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          v: 1, group: d.group, band: d.band, free: d.free ? 1 : 0,
          bf: d.bf, names: d.names, pairs: d.pairs
        }));
        draftActive = true;
      }
    } catch (e) {}
    paintDraftBar();
  }
  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    draftActive = false;
    paintDraftBar();
  }
  function clearForm() {
    groupInput.value = "";
    bandFree = false;
    band = "m2550";
    chipBtns.forEach(function (c, i) { c.setAttribute("aria-pressed", BANDS[i].id === band ? "true" : "false"); });
    paintBudgetFree();
    freeInput.value = "";
    while (peopleBox.children.length) peopleBox.removeChild(peopleBox.children[0]);
    pairs = [];
    for (var i = 0; i < 4; i++) addRow();
    renderPairChips();
    details.open = false;
    hideErr();
    clearDraft();
  }
  draftClearBtn.addEventListener("click", clearForm);
  form.addEventListener("input", saveDraft);

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
        interest: rows[i].querySelector(".vd-interest").value || "surprise"
      });
    }
    return out;
  }

  function longUrl(rec, link) {
    var base = BASE + "/?via=share#p=" + link.token;
    var ref = "";
    if (rec.trk && rec.trk.keys && rec.trk.keys[link.for]) ref = "&t=" + rec.trk.d + rec.trk.keys[link.for];
    if (rec.lang === "es" || rec.lang === "pt") ref += "&l=" + rec.lang;
    return base + ref;
  }
  function urlFor(rec, link) {
    if (rec.sl && rec.sl.codes && rec.sl.codes[link.for]) return BASE + "/s/" + rec.sl.codes[link.for];
    return longUrl(rec, link);
  }

  function renderShare(rec) {
    share.innerHTML = "";
    share.appendChild(el("h3", "vd-h3", S.kitHead));
    share.appendChild(el("p", "vd-explainer", S.kitExplainer));
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
      var url = urlFor(rec, link);
      var msg = S.personMsg(rec.customGroup ? rec.group : "", rec.bf || rec.budget, url, link.for);
      var acts = el("div", "vd-actions");
      var btn = el("button", "vd-copy", S.copyFor(link.for));
      btn.type = "button";
      btn.setAttribute("aria-label", S.copyFor(link.for));
      btn.addEventListener("click", function () {
        trackShareVia("clipboard");
        copyText(msg, btn, S.confirmCopied(link.for));
      });
      // SPEC-SS-RESULTSKIT-01 (S3): exactly 2 controls per person —
      // share-capable: [Share | Copy]; no-share: [Copy | WhatsApp].
      // The SMS deep link is cut, same as the homepage kit.
      if (navigator.share) {
        var sh = el("button", "vd-sharebtn", S.shareFor(link.for));
        sh.type = "button";
        sh.addEventListener("click", function () {
          // Success-only: kind=native fires on resolve, never on cancel.
          // The named confirmation rides the same resolve-only path.
          navigator.share({ title: document.title, text: msg })
            .then(function () { trackShareVia("native"); flashLabel(sh, S.confirmShared(link.for)); })
            .catch(function () {});
        });
        acts.appendChild(sh);
        acts.appendChild(btn);
      } else {
        acts.appendChild(btn);
        var wa = el("a", "vd-alink", "WhatsApp");
        wa.href = waHref(msg);
        wa.target = "_blank";
        wa.rel = "noopener";
        wa.setAttribute("aria-label", "WhatsApp: " + link.for);
        wa.addEventListener("click", function () { trackShareVia("whatsapp"); flashLabel(wa, S.confirmWhatsapp(link.for)); });
        acts.appendChild(wa);
      }
      row.appendChild(who);
      row.appendChild(acts);
      box.appendChild(row);
    });
    share.appendChild(box);

    // SPEC-SS-LABEL-01 (Nov 18, 2026): no group-note line here any
    // more. The buttons say what they carry now — "Share/Copy
    // {name}'s link" per person vs "Share/Copy the group
    // announcement" — so the old "group message has no match
    // links" explainer is unnecessary and is gone.
    // SPEC-SS-RESULTSKIT-01 (S4): ONE group button, ONE group text —
    // the button shares when a native sheet exists, copies otherwise,
    // and both paths carry the same group message (no link in it).
    var groupText = S.groupMsgHead(rec.customGroup ? rec.group : "", rec.bf || rec.budget) + S.groupMsgTail;
    if (navigator.share) {
      var gBtn = el("button", "vd-msg", S.groupShare);
      gBtn.type = "button";
      gBtn.addEventListener("click", function () {
        navigator.share({ title: document.title, text: groupText })
          .then(function () { trackShareVia("native"); flashLabel(gBtn, S.groupConfirmShared); })
          .catch(function () {});
      });
      share.appendChild(gBtn);
    } else {
      var msgBtn = el("button", "vd-msg", S.groupMsg);
      msgBtn.type = "button";
      msgBtn.addEventListener("click", function () {
        trackShareCopy("message");
        copyText(groupText, msgBtn, S.groupConfirmCopied);
      });
      share.appendChild(msgBtn);
    }

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
        trackShareCopy("manage-link");
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
      track("draw_links_minted", mergeProps({ tool: "secret-santa", people_count: rec.links.length, link_type: linkType, manage: manage, group_size_bucket: groupSizeBucket(rec.links.length) }, validDrawId(rec.did) ? { draw_id: rec.did } : {}));
    }
    try {
      var jobs = rec.links.map(function (link) {
        var payload = CORE.parseToken(link.token);
        if (!payload) return Promise.resolve(null);
        if (rec.lang === "es" || rec.lang === "pt") payload.l = rec.lang;
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
        // SPEC-SS-BUDGETFREE-01 parity (Task M): the group record
        // carries the free-text budget beside the fallback band,
        // so the manage page shows the organizer's own words.
        if (rec.bf) groupBody.bf = rec.bf;
        if (rec.lang === "es" || rec.lang === "pt") groupBody.lang = rec.lang;
        if (validDrawId(rec.did)) groupBody.di = rec.did;
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
    currentDrawId = trkHex(CORE, 32);
    var rand = CORE.rng(CORE.randomSeed());
    var usedIds = Object.create(null);
    var bandLabel = BANDS.filter(function (b) { return b.id === band; })[0].label;
    // Free-text budget (Task M): the typed text (cleaned, capped)
    // or "" when a band was tapped. `band` is already the middle
    // band in free mode (the free chip sets it), so bandLabel is
    // the fallback band the picks and the token's `b` carry; `bf`
    // below is what everyone reads.
    var budgetFree = currentBudgetFree(CORE);
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
      // Optional key, present only when the organizer typed a
      // free-text budget; without it the token is byte-identical
      // in shape to every token before this change.
      if (budgetFree) payload.bf = budgetFree;
      return { giver: giver.name, token: CORE.makeToken(payload) };
    });
    track("tool_complete", mergeProps({ tool: "secret-santa", entry: "draw", results_count: tokens.length, start_source: "direct", names_mode: "rows" }, drawIdProps()));
    track("draw_created", mergeProps(mergeProps({ people_count: people.length, group_size_bucket: groupSizeBucket(people.length), restrictions: apartIdx.length > 0, start_source: "direct" }, drawIdProps()), firstTouchProps()));
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
      isRedraw: isRedraw,
      did: currentDrawId
    };
    // The record keeps the fallback band in `budget` (every
    // existing reader keeps working) and the typed text in `bf`,
    // present only for a free-text draw.
    if (budgetFree) rec.bf = budgetFree;
    if (ES) rec.lang = "es";
    if (PT) rec.lang = "pt";
    lastRec = rec;
    saveRec(rec);
    // SPEC-SS-DRAFT-01: the draft's job is done — the saved-draw
    // kit (ss_draw_v1, just written) is the post-draw mechanism.
    clearDraft();
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

  /* SPEC-SS-CONVERGE-01 (Nov 18, 2026): prefill bridge. The homepage
     (index.html) runs this module as its organizer form now; its
     long-standing prefill paths (a saved draw run back, a reveal
     hand-back roster, a connector setup link, the sample draft)
     hand their values over through this one door instead of writing
     into a form of their own. Purely additive: pages that never set
     a prefill see no change. Fields apply only when present, and a
     group name never overwrites a field that already holds text
     unless groupForce is set. Keep-apart pairs arrive as index
     pairs into the names array; when any land, the pairs disclosure
     opens so set exclusions are never invisible. */
  var prefillNote = el("p", "vd-prefillnote");
  prefillNote.hidden = true;
  card.insertBefore(prefillNote, form);
  function applyPrefill(p) {
    if (!p || typeof p !== "object") return 0;
    if (typeof p.note === "string" && p.note) {
      prefillNote.textContent = p.note;
      prefillNote.hidden = false;
    }
    if (typeof p.group === "string" && p.group && (p.groupForce || !groupInput.value)) {
      groupInput.value = Array.from(p.group).slice(0, 60).join("");
      groupInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (typeof p.bf === "string" && p.bf) {
      bandFree = true;
      var fb = BANDS.filter(function (b) { return b.id === p.band; })[0];
      band = fb ? fb.id : band; // a band applied just before stays the fallback
      chipBtns.forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
      paintBudgetFree();
      freeInput.value = Array.from(p.bf).slice(0, BUDGET_FREE_MAX).join("");
    } else if (typeof p.band === "string" && p.band) {
      var bi = -1;
      BANDS.forEach(function (b, i) { if (b.id === p.band) bi = i; });
      if (bi >= 0) {
        bandFree = false;
        paintBudgetFree();
        band = p.band;
        chipBtns.forEach(function (c, i) { c.setAttribute("aria-pressed", BANDS[i].id === band ? "true" : "false"); });
      }
    }
    var applied = 0;
    if (Array.isArray(p.names) && p.names.length) {
      // SPEC-SS-DRAFT-01: a landing roster replaces the form's
      // roster whole — keep-apart pairs belong to a roster, so a
      // prefill never inherits pairs from whatever the form held
      // before (a restored draft, a half-edited list). The pairs
      // this same prefill carries land on the emptied slate below.
      pairs = [];
      renderPairChips();
      var clean = [];
      p.names.forEach(function (n) {
        var v = String(n == null ? "" : n).trim();
        if (v && clean.indexOf(v) === -1) clean.push(v);
      });
      clean = clean.slice(0, MAX_PEOPLE);
      while (peopleBox.children.length < clean.length) addRow();
      var filled = [];
      for (var i = 0; i < peopleBox.children.length; i++) {
        var inp = peopleBox.children[i].querySelector(".vd-name");
        if (!inp) continue;
        inp.value = i < clean.length ? clean[i] : "";
        if (i < clean.length) filled.push(inp);
      }
      filled.forEach(function (inp2) { inp2.dispatchEvent(new Event("input", { bubbles: true })); });
      applied = clean.length;
      if (Array.isArray(p.pairs) && p.pairs.length && applied) {
        var landed = 0;
        p.pairs.forEach(function (pr) {
          if (!Array.isArray(pr)) return;
          var ra = peopleBox.children[pr[0]], rb = peopleBox.children[pr[1]];
          if (!ra || !rb || ra === rb) return;
          var ida = ra.dataset.rowId, idb = rb.dataset.rowId;
          var dup = pairs.some(function (x) {
            return (String(x[0]) === ida && String(x[1]) === idb) || (String(x[0]) === idb && String(x[1]) === ida);
          });
          if (!dup) { pairs.push([ida, idb]); landed++; }
        });
        if (landed) { renderPairChips(); details.open = true; }
      }
    }
    // SPEC-SS-DRAFT-01: whatever the bridge leaves in the form is
    // the draft now — the store mirrors the visible form.
    saveDraft();
    return applied;
  }
  /* SPEC-SS-DRAFT-01: restore the on-device draft through the same
     bridge, before any queued prefill applies — an explicit arrival
     (a setup link, a hand-back roster) always wins over the passive
     draft, and the bridge's closing save keeps the store mirrored
     to whatever the form ends up showing. A stored draft that no
     longer holds anything once it lands is cleared, not kept. */
  function restoreDraft() {
    var raw = null;
    try { raw = localStorage.getItem(DRAFT_KEY); } catch (e) {}
    if (!raw) return;
    var d = null;
    try { d = JSON.parse(raw); } catch (e) {}
    if (!d || d.v !== 1 || !Array.isArray(d.names)) { clearDraft(); return; }
    var p = { groupForce: true };
    if (typeof d.group === "string" && d.group) p.group = d.group;
    if (BANDS.some(function (b) { return b.id === d.band; })) p.band = d.band;
    if (Array.isArray(d.pairs) && d.pairs.length) p.pairs = d.pairs;
    p.names = d.names;
    applyPrefill(p);
    if (d.free) {
      // Free-text mode is the one state the bridge cannot express
      // with an empty text; land it directly, then re-mirror.
      bandFree = true;
      if (BANDS.some(function (b) { return b.id === d.band; })) band = d.band;
      chipBtns.forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
      paintBudgetFree();
      freeInput.value = typeof d.bf === "string" ? Array.from(d.bf).slice(0, BUDGET_FREE_MAX).join("") : "";
      saveDraft();
    }
    if (!draftHasContent(draftSnapshot())) clearDraft();
  }
  restoreDraft();
  window.__SS_VDRAW_APPLY__ = applyPrefill;
  if (window.__SS_VDRAW_PREFILL__) {
    var queuedPrefill = window.__SS_VDRAW_PREFILL__;
    window.__SS_VDRAW_PREFILL__ = null;
    applyPrefill(queuedPrefill);
  }
})();
