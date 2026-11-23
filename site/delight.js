"use strict";
/* Delight pass (Nov 23, 2026): the opt-in animation layer for the
   three entry pages (/, /draw-names-online, /secret-santa-generator)
   and the ES/PT landers that share their hero/form components.
   Pages opt in by loading this script in <head>; every other page
   on the site is untouched. It does three things, all presentation:
   1. Hero snow — a small canvas snowfall confined to the hero,
      paused whenever the hero is off-screen or the tab is hidden.
   2. Scroll fade-up — section cards fade and rise once as they
      enter the viewport. The hidden state exists only behind the
      .js class this script puts on <html>, so a no-JS visitor
      (or a failed load) never faces hidden content.
   3. Press feedback — the draw form's chips and buttons that had
      no :active state get a subtle press. (.vd-draw and the page
      CTAs already had one; they are not repeated here.)
   It also sets window.__SS_DELIGHT__, the flag variant-draw.js
   checks before running the draw ceremony. Under
   prefers-reduced-motion this script sets the flag and stops:
   no snow, no fades, no press motion, and the ceremony checks
   the same media query itself — the pages behave as they did
   before this file existed. No layout shift anywhere: the snow
   canvas is absolutely positioned inside the hero, the fades
   animate opacity/transform only, and nothing here touches the
   draw path, the form, or any copy. */
(function () {
  window.__SS_DELIGHT__ = true;
  var RM = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  document.documentElement.classList.add("js");
  if (RM) return;

  var CSS = [
    "html.js .ss-fade{opacity:0;transform:translateY(14px)}",
    "html.js .ss-fade.ss-in{opacity:1;transform:none;transition:opacity .55s ease,transform .55s ease}",
    ".ss-snowhost{position:relative;overflow:hidden}",
    ".ss-snow{position:absolute;inset:0;pointer-events:none;z-index:3}",
    ".vd-ceremony{display:flex;align-items:center;justify-content:center;gap:8px;margin:0 0 12px;padding:10px 14px;background:var(--soft,#f3efe2);border:2px dashed var(--line,#e5ddc8);border-radius:12px;font-size:15px;font-weight:700;color:var(--pine-dark,#14532d);text-align:center}",
    ".vd-ceremony b{color:var(--berry,#c1272d)}",
    ".vd-chip:active,.vd-remove:active,.vd-add:active,.vd-pairadd:active,.vd-pairchip:active,.vd-draftclear:active,.vd-copy:active,.vd-sharebtn:active,.vd-msg:active{transform:scale(.96)}",
    ".vd-chip,.vd-remove,.vd-add,.vd-pairadd,.vd-pairchip,.vd-draftclear,.vd-copy,.vd-sharebtn,.vd-msg{transition:transform .08s ease}",
    "@media (prefers-reduced-motion: reduce){html.js .ss-fade{opacity:1!important;transform:none!important}}"
  ].join("\n");
  var style = document.createElement("style");
  style.id = "ssDelightCss";
  style.textContent = CSS;
  document.head.appendChild(style);

  function fadeUp() {
    var els = document.querySelectorAll("section.block");
    if (!els.length || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("ss-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -4% 0px" });
    for (var i = 0; i < els.length; i++) { els[i].classList.add("ss-fade"); io.observe(els[i]); }
  }

  function snow() {
    var hero = document.querySelector(".hero");
    if (!hero || !hero.getBoundingClientRect) return;
    hero.classList.add("ss-snowhost");
    var cv = document.createElement("canvas");
    cv.className = "ss-snow";
    cv.setAttribute("aria-hidden", "true");
    hero.appendChild(cv);
    var ctx = cv.getContext("2d");
    if (!ctx) return;
    var W = 0, H = 0, flakes = [], raf = null, running = false, inView = false;
    function size() {
      var r = hero.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.min(90, Math.max(24, Math.round(W * H / 14000)));
      flakes = [];
      for (var i = 0; i < n; i++) {
        flakes.push({
          x: Math.random() * W, y: Math.random() * H,
          r: 0.8 + Math.random() * 1.9,
          s: 0.35 + Math.random() * 0.85,
          p: Math.random() * Math.PI * 2,
          a: 0.35 + Math.random() * 0.5,
          blue: i % 2 === 0
        });
      }
    }
    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.y += f.s;
        f.p += 0.008;
        f.x += Math.sin(f.p) * 0.35;
        if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
        if (f.x > W + 4) f.x = -4; else if (f.x < -4) f.x = W + 4;
        ctx.globalAlpha = f.a;
        ctx.fillStyle = f.blue ? "#bcd6e8" : "#ffffff";
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }
    size();
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          inView = e.isIntersecting;
          if (inView && !document.hidden) start(); else stop();
        });
      }, { threshold: 0.02 }).observe(hero);
    } else { inView = true; start(); }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else if (inView) start();
    });
    var rzT = null;
    window.addEventListener("resize", function () {
      clearTimeout(rzT);
      rzT = setTimeout(size, 200);
    });
  }

  function init() { fadeUp(); snow(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
