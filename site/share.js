"use strict";
/* SPEC-SS-SHAREKIT-01 (Nov 20, 2026): the /share page's behavior.
   Every payload below is copied verbatim from the staged kit
   (builds/santa-share-kit-2026-11-20/texts.md); qa diffs the
   composed results against that file. Everything shared points
   at the homepage only (Billy's link rule, Nov 19, 2026).
   Where a network takes the link as its own parameter (X,
   Telegram, Facebook quote), the trailing URL is stripped from
   the text parameter so the link travels exactly once; where
   the text is the whole payload (WhatsApp, SMS, email,
   Messenger copy), the kit text rides verbatim, link included.
   Telemetry fires on completed actions only, never on render.
   REWORK (Nov 20, 2026, Billy's dogfood): the grid is the six
   audience channels (WhatsApp, Messenger, Text, Email, Facebook,
   Copy link) with real brand glyphs; X, Telegram and LinkedIn
   sit in a quiet More-ways row, LinkedIn keeping its copyable
   words block as its own payload. Reddit and Pinterest left the
   page (Reddit's text is Billy's maker post, not organizer
   words; Pinterest is our own pin program), and with them the
   image tabs and the share_image_downloaded event. The native
   share payload strips the trailing URL from its text, since
   the url rides as its own field and target apps would
   otherwise print the link twice. */
(function () {
  var HOME = "https://pickmysecretsanta.com/";
  var TEXTS = {
    whatsapp: {
      en: "Running our Secret Santa this year? I drew the names with Pick My Secret Santa. One person runs the whole draw in about 2 minutes, with no accounts and no emails from anyone. Everyone gets a private link that shows only their match, and you can see who has opened theirs. Free, no sign-up, no ads: https://pickmysecretsanta.com/",
      es: "¿Te toca organizar el amigo secreto este año? Hice el sorteo con Pick My Secret Santa. Una sola persona hace todo el sorteo en unos 2 minutos, sin cuentas y sin correos de nadie. Cada persona recibe un enlace privado que muestra solo su asignación, y puedes ver quién lo ha abierto ya. Gratis, sin registro y sin anuncios: https://pickmysecretsanta.com/"
    },
    facebook: {
      en: "If you are the one who ends up organizing Secret Santa every year, this is the tool. Pick My Secret Santa draws the names for you: one organizer runs the whole draw in about 2 minutes, no accounts, no emails from anyone, no ads. Every person gets a private link showing only their match, you can see who has opened theirs, and you can be in the draw yourself without seeing anyone's match. Free: https://pickmysecretsanta.com/",
      es: "Si eres la persona que termina organizando el amigo secreto cada año, esta es tu herramienta. Pick My Secret Santa hace el sorteo por ti: una sola persona organiza todo en unos 2 minutos, sin cuentas, sin correos de nadie y sin anuncios. Cada persona recibe un enlace privado que muestra solo su asignación, puedes ver quién lo ha abierto, y puedes participar en el sorteo sin ver la asignación de nadie. Gratis: https://pickmysecretsanta.com/"
    },
    messenger: "Secret Santa draw, sorted. I ran ours on Pick My Secret Santa: about 2 minutes, no accounts or emails, and everyone got a private link with only their match. Free and no ads: https://pickmysecretsanta.com/",
    x: "Drawing Secret Santa names? One organizer can run the whole draw in about 2 minutes. No accounts, no emails, no ads. Everyone gets a private link showing only their match, and you can be in it too. Free: https://pickmysecretsanta.com/",
    linkedin: "Sharing a tool our team used for its Secret Santa draw: Pick My Secret Santa. One organizer runs the whole draw in about two minutes, with no accounts and no emails for anyone to deal with. Each person receives a private link showing only their match, and the organizer can see who has opened theirs. Free, and no ads: https://pickmysecretsanta.com/",
    telegram: {
      en: "Secret Santa, handled: Pick My Secret Santa draws the names with no accounts and no emails from anyone. One organizer, about 2 minutes, and every person gets a private link that shows only their match. You can see who has opened theirs, and be in the draw without seeing any matches. Free, no ads: https://pickmysecretsanta.com/",
      es: "Amigo secreto, resuelto: Pick My Secret Santa hace el sorteo sin cuentas y sin correos de nadie. Una sola persona lo organiza en unos 2 minutos, y cada participante recibe un enlace privado que muestra solo su asignación. Puedes ver quién lo ha abierto y participar sin ver ninguna asignación. Gratis y sin anuncios: https://pickmysecretsanta.com/"
    },
    emailSubject: "The easiest way to draw Secret Santa names",
    emailBody: "Hi all,\n\nPassing along the tool I used for our Secret Santa draw this year: Pick My Secret Santa.\n\nOne organizer runs the whole draw in about two minutes. There are no accounts to create and no emails from anyone. Every person gets a private link that shows only their own match, the organizer can see who has opened theirs, and the organizer can be in the draw without seeing anyone's match. It is free, with no ads.\n\nhttps://pickmysecretsanta.com/\n\nWorth bookmarking for next year's draw.",
    sms: "Secret Santa draw, sorted: I ran ours with Pick My Secret Santa. About 2 minutes, no accounts or emails, everyone gets a private link with only their match, and it is free: https://pickmysecretsanta.com/",
    oneLiner: "The easiest way to draw Secret Santa names. One organizer runs the whole draw in about 2 minutes, no accounts, no emails, no ads. Everyone gets a private link showing only their match. Free: https://pickmysecretsanta.com/"
  };
  function track(name, props) {
    try {
      if (typeof fleetTrack === "function") fleetTrack(name, props || {});
    } catch (e) {}
  }
  function stripUrl(t) { return t.replace(/\s*https:\/\/pickmysecretsanta\.com\/\s*$/, ""); }
  function enc(s) { return encodeURIComponent(s); }

  /* Entry source: the two shipped entry points mark themselves
     (?src=footer from the homepage footer, ?src=manage from the
     kit's all-handed-off line); anything else is direct. */
  var src = "direct";
  try {
    var q = new URLSearchParams(location.search).get("src");
    if (q === "footer" || q === "manage" || q === "handback") src = q;
  } catch (e) {}
  track("share_page_opened", { tool: "secret-santa", entry_source: src });

  /* Toast */
  var toast = document.getElementById("shareToast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 3200);
  }

  /* Copy with the same fallback ladder the site uses elsewhere. */
  function copyText(text, done) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (done) done(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { if (done) done(true); }, fallback);
    } else fallback();
  }

  /* Language for the three networks whose kit texts exist in
     Spanish (WhatsApp, Facebook, Telegram). Default: the site's
     stored language preference; the toggle overrides for this
     page only and does not write the preference. */
  var lang = "en";
  try { if (localStorage.getItem("ss_lang_v1") === "es") lang = "es"; } catch (e) {}

  var waA = document.getElementById("netWhatsapp");
  var fbA = document.getElementById("netFacebook");
  var tgA = document.getElementById("netTelegram");
  function paintLangLinks() {
    if (waA) waA.href = "https://wa.me/?text=" + enc(TEXTS.whatsapp[lang]);
    if (fbA) fbA.href = "https://www.facebook.com/sharer/sharer.php?u=" + enc(HOME) + "&quote=" + enc(stripUrl(TEXTS.facebook[lang]));
    if (tgA) tgA.href = "https://t.me/share/url?url=" + enc(HOME) + "&text=" + enc(stripUrl(TEXTS.telegram[lang]));
    var enB = document.getElementById("langEn"), esB = document.getElementById("langEs");
    if (enB) enB.setAttribute("aria-pressed", lang === "en" ? "true" : "false");
    if (esB) esB.setAttribute("aria-pressed", lang === "es" ? "true" : "false");
  }
  var langEn = document.getElementById("langEn"), langEs = document.getElementById("langEs");
  if (langEn) langEn.addEventListener("click", function () { lang = "en"; paintLangLinks(); });
  if (langEs) langEs.addEventListener("click", function () { lang = "es"; paintLangLinks(); });

  /* Static network hrefs */
  function setHref(id, href) { var a = document.getElementById(id); if (a) a.href = href; }
  setHref("netX", "https://twitter.com/intent/tweet?text=" + enc(stripUrl(TEXTS.x)) + "&url=" + enc(HOME));
  setHref("netLinkedin", "https://www.linkedin.com/sharing/share-offsite/?url=" + enc(HOME));
  setHref("netEmail", "mailto:?subject=" + enc(TEXTS.emailSubject) + "&body=" + enc(TEXTS.emailBody));
  setHref("netSms", "sms:?&body=" + enc(TEXTS.sms));
  paintLangLinks();

  /* Network click telemetry (completed action = the tap that
     opens the composer; copy-based flows fire on copy success). */
  [["netWhatsapp", "whatsapp"], ["netFacebook", "facebook"], ["netX", "x"],
   ["netLinkedin", "linkedin"],
   ["netTelegram", "telegram"], ["netEmail", "email"], ["netSms", "sms"]]
    .forEach(function (pair) {
      var a = document.getElementById(pair[0]);
      if (a) a.addEventListener("click", function () {
        track("share_network_clicked", { tool: "secret-santa", network: pair[1] });
      });
    });

  /* Messenger: no web share intent exists without a Facebook
     app id, so the button does exactly what its caption says:
     copy the kit text, then open Messenger, confirmed by toast. */
  var msgr = document.getElementById("netMessenger");
  if (msgr) msgr.addEventListener("click", function () {
    copyText(TEXTS.messenger, function (ok) {
      if (ok) {
        track("share_network_clicked", { tool: "secret-santa", network: "messenger" });
        showToast("Text copied, paste it in Messenger");
      } else {
        showToast("Copy failed: long-press the words below to copy them");
      }
      window.open("https://www.messenger.com/", "_blank", "noopener");
    });
  });

  /* Copy action: ONE payload (the one-liner, link included),
     on the grid's Copy link cell — the page's single general
     copy path. The no-share-sheet primary button below performs
     the same copy by design (the documented fallback pattern). */
  function doCopyLink() {
    copyText(TEXTS.oneLiner, function (ok) {
      if (ok) {
        track("share_link_copied", { tool: "secret-santa" });
        showToast("Copied");
      } else showToast("Copy failed: select the words and copy them");
    });
  }
  var copyBtn = document.getElementById("netCopy");
  if (copyBtn) copyBtn.addEventListener("click", doCopyLink);

  /* Copyable block: LinkedIn's words, LinkedIn's own payload,
     sitting directly under the LinkedIn row in More ways. */
  function wireBlockCopy(id, payload, network) {
    var b = document.getElementById(id);
    if (!b) return;
    b.addEventListener("click", function () {
      copyText(payload, function (ok) {
        if (ok) {
          track("share_network_clicked", { tool: "secret-santa", network: network });
          showToast("Copied");
        } else showToast("Copy failed: select the words and copy them");
      });
    });
  }
  wireBlockCopy("copyLinkedin", TEXTS.linkedin, "linkedin");

  /* Native share: the page's one filled button. Where the share
     sheet does not exist (most desktop), it is a Copy button
     from first render, decided by capability, never by a
     failed tap. Completion fires on resolve only. */
  var nativeBtn = document.getElementById("nativeShare");
  if (nativeBtn) {
    if (navigator.share) {
      nativeBtn.addEventListener("click", function () {
        track("share_native_clicked", { tool: "secret-santa" });
        navigator.share({ title: "Pick My Secret Santa", text: stripUrl(TEXTS.whatsapp.en), url: HOME })
          .then(function () { track("share_native_completed", { tool: "secret-santa" }); })
          .catch(function () {});
      });
    } else {
      nativeBtn.textContent = "Copy the link";
      nativeBtn.addEventListener("click", doCopyLink);
    }
  }

})();
