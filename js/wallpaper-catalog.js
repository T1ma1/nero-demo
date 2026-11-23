/* ============================================================
   NERO — каталог обоев (catalog/oboi.html): весь ассортимент decando.ru.
   Индекс assets/media/wallpaper/index.json (собирает tools/wallpaper/build_wallpaper.py),
   карточки рисуются здесь: поиск, бренд, цвет, группа рисунка, «точный раппорт», постранично.
   Клик по картинке — лайтбокс со свотчем (разметка общая с каталогом NERO, js/catalog-nero.js).
   ============================================================ */
(function () {
  var grid = document.getElementById("wpGrid"); if (!grid) return;
  var q = document.getElementById("wpSearch"), brandSel = document.getElementById("wpBrand"), colorSel = document.getElementById("wpColor");
  var exactCb = document.getElementById("wpExact"), countEl = document.getElementById("wpCount"), empty = document.getElementById("wpEmpty"), more = document.getElementById("wpMore");
  var chips = Array.prototype.slice.call(document.querySelectorAll(".wp-filter"));
  var DIR = "../assets/media/wallpaper/", PAGE = 48;
  var st = { q: "", brand: "", color: "", group: "all", exact: false, show: PAGE }, items = null, ix = null;
  function isEn() { return document.documentElement.getAttribute("lang") === "en"; }
  function norm(s) { return String(s || "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); }
  function fmt(v) { var s = String(Math.round(v * 100) / 100); return isEn() ? s : s.replace(".", ","); }
  function fmtN(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

  function load() {
    countEl.textContent = isEn() ? "Loading the catalog…" : "Загружаю каталог…";
    return fetch(DIR + "index.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (data) {
      ix = data;
      items = data.items.map(function (r) {
        var brand = r[1] >= 0 ? data.brands[r[1]] : "";
        return { id: "wp-" + r[0], brand: brand, coll: r[2], art: r[3], slug: r[4], w: r[5], l: r[6], rap: r[7], group: data.groups[r[8]].key, ex: r[9],
          color: r[15] >= 0 ? data.colors[r[15]] : "", type: r[16] >= 0 ? (isEn() ? data.types_en[r[16]] : data.types[r[16]]) : "", mural: r[17] === 1,
          q: norm(brand + " " + r[2] + " " + r[3]) };
      });
      data.colors.forEach(function (c) { var o = document.createElement("option"); o.value = c; o.textContent = c; colorSel.appendChild(o); });
      var h = /^#wp-\d+$/.test(location.hash) ? location.hash.slice(1) : "";
      if (h) { var hit = items.filter(function (it) { return it.id === h; })[0]; if (hit) { st.q = hit.art; q.value = st.q; } }
      render(h);
    }, function () { countEl.textContent = isEn() ? "The catalog is unavailable" : "Каталог сейчас недоступен"; });
  }
  function filtered() {
    var s = norm(st.q);
    return items.filter(function (it) {
      if (st.group !== "all" && it.group !== st.group) return false;
      if (st.brand && it.brand !== st.brand) return false;
      if (st.color && it.color !== st.color) return false;
      if (st.exact && !it.ex && !it.mural) return false;
      return !s || it.q.indexOf(s) !== -1;
    });
  }
  function card(it) {
    var en = isEn(), name = (it.brand + " " + it.coll).trim();
    var spec = it.mural ? (en ? "mural, cut to the wall" : "панно, по размеру стены") : fmt(it.w) + " × " + fmt(it.l) + (en ? " m" : " м") + (it.rap ? " · " + (en ? "repeat " : "раппорт ") + fmt(it.rap) + (en ? " cm" : " см") : "");
    return '<article class="wp-card fade in" id="' + it.id + '" data-group="' + it.group + '">' +
      '<button type="button" class="wp-card__media" data-wpzoom="' + it.id + '" aria-label="' + esc((en ? "Close-up: " : "Образец крупно: ") + name + " " + it.art) + '">' +
      '<img src="' + DIR + it.id + '-m.jpg" alt="" loading="lazy" width="360" height="360" />' +
      (it.ex ? '<span class="wp-card__badge">' + (en ? "exact repeat" : "точный раппорт") + "</span>" : "") + "</button>" +
      '<div class="wp-card__body"><span class="wp-card__type">' + esc(it.type) + '</span>' +
      '<h3 class="wp-card__name" translate="no">' + esc(name) + ' <span class="wp-card__art">' + esc(it.art) + "</span></h3>" +
      '<p class="wp-card__spec">' + esc(spec) + "</p>" +
      '<div class="wp-card__acts"><a class="wp-card__try" href="../index.html?wp=' + it.id + '#colorstudio">' + (en ? "Try in a room" : "Примерить в интерьере") + "</a>" +
      '<a class="wp-card__ext" href="https://decando.ru/product/' + esc(it.slug) + '" target="_blank" rel="noopener noreferrer">' + (en ? "On decando.ru" : "На decando.ru") + "</a></div></div></article>";
  }
  function render(focusId) {
    if (!items) return;
    var list = filtered(), shown = list.slice(0, st.show);
    grid.innerHTML = shown.map(card).join("");
    empty.hidden = list.length > 0;
    countEl.textContent = list.length ? (isEn() ? "Found " : "Найдено ") + fmtN(list.length) : "";
    more.hidden = list.length <= shown.length;
    more.textContent = (isEn() ? "Show more" : "Показать ещё") + " · " + fmtN(Math.min(PAGE, list.length - shown.length));
    if (focusId) { var el = document.getElementById(focusId); if (el) { el.classList.add("is-target"); setTimeout(function () { el.scrollIntoView({ block: "center" }); }, 60); } }
  }
  chips.forEach(function (b) { b.addEventListener("click", function () {
    st.group = b.getAttribute("data-group"); st.show = PAGE;
    chips.forEach(function (c) { var on = c === b; c.classList.toggle("is-on", on); c.setAttribute("aria-pressed", on ? "true" : "false"); });
    render();
  }); });
  q.addEventListener("input", function () { st.q = q.value; st.show = PAGE; render(); });
  brandSel.addEventListener("change", function () { st.brand = brandSel.value; st.show = PAGE; render(); });
  colorSel.addEventListener("change", function () { st.color = colorSel.value; st.show = PAGE; render(); });
  exactCb.addEventListener("change", function () { st.exact = exactCb.checked; st.show = PAGE; render(); });
  more.addEventListener("click", function () { st.show += PAGE; render(); });
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest(".lang-switch")) setTimeout(function () { if (items) { items.forEach(function (it, i) { var r = ix.items[i]; it.type = r[16] >= 0 ? (isEn() ? ix.types_en[r[16]] : ix.types[r[16]]) : ""; }); render(); } }, 0);
  });

  /* лайтбокс: та же разметка, что у каталога NERO; закрытие (крестик, фон, Esc) — в js/catalog-nero.js */
  var lb = document.getElementById("lightbox"), lbc = document.getElementById("lightboxContent"), lbClose = document.getElementById("lightboxClose"), cap = document.getElementById("lightboxCap");
  grid.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-wpzoom]") : null;
    if (!b || !lb) return;
    var id = b.getAttribute("data-wpzoom"), it = items.filter(function (x) { return x.id === id; })[0];
    lbc.innerHTML = '<img src="' + DIR + id + '-z.jpg" alt="' + esc((it.brand + " " + it.coll + " " + it.art).trim()) + '" />';
    if (cap) cap.textContent = (it.brand + " " + it.coll + " " + it.art).trim() + (it.mural ? "" : " · " + fmt(it.w) + (isEn() ? " m wide" : " м шириной"));
    lb.classList.add("is-open"); lb.setAttribute("aria-hidden", "false");
    requestAnimationFrame(function () { lbClose.focus(); });
  });
  load();
})();
