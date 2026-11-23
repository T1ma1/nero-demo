/* ============================================================
   NERO — страницы собственного каталога (nero.html, разделы, nero-*.html).
   Шапка, меню, появление карточек, галерея продукта с лайтбоксом
   (стрелки, клавиатура, свайп) и поиск по названиям на витрине.
   ============================================================ */
(function () {
  var header = document.getElementById("header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 40); };
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- меню ---------- */
  var burger = document.getElementById("burger");
  function closeMenu() { document.body.classList.remove("menu-open"); if (burger) burger.setAttribute("aria-expanded", "false"); }
  if (burger) burger.addEventListener("click", function () {
    var open = document.body.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.querySelectorAll(".nav__link").forEach(function (a) { a.addEventListener("click", closeMenu); });

  /* ---------- появление карточек ---------- */
  var fades = document.querySelectorAll(".fade");
  var rm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (rm || !("IntersectionObserver" in window)) fades.forEach(function (e) { e.classList.add("in"); });
  else {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -4% 0px" });
    fades.forEach(function (e) { io.observe(e); });
  }

  /* ---------- галерея продукта ---------- */
  var main = document.getElementById("pxMain");
  var thumbs = Array.prototype.slice.call(document.querySelectorAll(".px-thumb"));
  var shots = [];   // все кадры страницы по порядку: главная галерея + фактуры техник
  document.querySelectorAll("[data-shot]").forEach(function (el) {
    var src = el.getAttribute("data-shot");
    if (shots.some(function (s) { return s.src === src; })) return;
    shots.push({ src: src, alt: el.getAttribute("data-alt") || "" });
  });
  function shotIndex(src) { for (var i = 0; i < shots.length; i++) if (shots[i].src === src) return i; return 0; }

  if (main && thumbs.length) {
    var mainImg = main.querySelector("img");
    thumbs.forEach(function (t) {
      t.addEventListener("click", function () {
        thumbs.forEach(function (x) { x.classList.remove("is-active"); x.setAttribute("aria-pressed", "false"); });
        t.classList.add("is-active"); t.setAttribute("aria-pressed", "true");
        if (!mainImg) return;
        var src = t.getAttribute("data-shot"), view = t.getAttribute("data-view");
        mainImg.style.opacity = "0";
        var pre = new Image();
        pre.onload = pre.onerror = function () {
          mainImg.src = view; mainImg.alt = t.getAttribute("data-alt") || "";
          main.setAttribute("data-shot", src);
          mainImg.style.opacity = "1";
        };
        pre.src = view;
      });
    });
  }

  /* ---------- лайтбокс ---------- */
  var lb = document.getElementById("lightbox");
  if (lb) {
    var lbc = document.getElementById("lightboxContent");
    var lbClose = document.getElementById("lightboxClose");
    var prev = document.getElementById("lightboxPrev"), next = document.getElementById("lightboxNext");
    var cap = document.getElementById("lightboxCap");
    var cur = 0, lastFocus = null;
    function show(i) {
      if (!shots.length) return;
      cur = (i + shots.length) % shots.length;
      lbc.innerHTML = "";
      var im = document.createElement("img");
      im.src = shots[cur].src; im.alt = shots[cur].alt;
      lbc.appendChild(im);
      if (cap) cap.textContent = shots.length > 1 ? (cur + 1) + " / " + shots.length : "";
      if (prev) prev.hidden = shots.length < 2;
      if (next) next.hidden = shots.length < 2;
    }
    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      lb.classList.add("is-open"); lb.setAttribute("aria-hidden", "false");
      requestAnimationFrame(function () { lbClose.focus(); });
    }
    function close() {
      lb.classList.remove("is-open"); lb.setAttribute("aria-hidden", "true");
      setTimeout(function () { lbc.innerHTML = ""; }, 400);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    document.addEventListener("click", function (e) {
      var el = e.target.closest ? e.target.closest("[data-zoom]") : null;
      if (!el) return;
      var src = el.getAttribute("data-shot");
      if (src) { e.preventDefault(); open(shotIndex(src)); }
    });
    document.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("[data-zoom][role=button]")) {
        e.preventDefault(); open(shotIndex(e.target.getAttribute("data-shot")));
      }
    });
    lbClose.addEventListener("click", close);
    if (prev) prev.addEventListener("click", function () { show(cur - 1); });
    if (next) next.addEventListener("click", function () { show(cur + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target === lbc) close(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) { if (e.key === "Escape") closeMenu(); return; }
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(cur - 1);
      else if (e.key === "ArrowRight") show(cur + 1);
      else if (e.key === "Tab") {
        var f = lb.querySelectorAll("button:not([hidden])");
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    /* свайп на телефоне */
    var sx = null, sy = 0;
    lb.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) show(cur + (dx < 0 ? 1 : -1));
      sx = null;
    });
  } else {
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  }

  /* ---------- поиск по продуктам на витрине ---------- */
  var q = document.getElementById("nxSearch");
  if (q) {
    var chips = Array.prototype.slice.call(document.querySelectorAll(".nx-chip"));
    var empty = document.getElementById("nxEmpty");
    var norm = function (s) { return (s || "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim(); };
    q.addEventListener("input", function () {
      var v = norm(q.value), shown = 0;
      chips.forEach(function (c) {
        var ok = !v || norm(c.getAttribute("data-q")).indexOf(v) !== -1;
        c.hidden = !ok; if (ok) shown++;
      });
      if (empty) empty.hidden = shown > 0;
    });
  }
})();
