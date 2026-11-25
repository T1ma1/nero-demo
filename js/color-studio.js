/* ============================================================
   NERO — блок «Подбор цвета» (#colorstudio).
   Как визуализаторы производителей красок (Vitex AIRIS, Dulux):
   фото комнаты «коробкой» (видны задняя, левая и правая стены,
   потолок, пол) → выбираешь оттенок Monicolor NOVA → нажимаешь на
   стену, потолок, диван, пол… — красится именно то, куда нажал.
   Стены можно красить все сразу или каждую отдельно (акцентная стена).
   Палитра — window.NERO_PALETTE (js/monicolor-palette.js), формат
   [код, hex, семья]. Подписи кнопок в разметке переводит js/i18n.js
   (data-en); то немногое, что JS пишет сам, — двуязычное (LABELS).
   ============================================================ */
(function () {
  var root = document.getElementById("colorstudio");
  if (!root || !window.NERO_PALETTE) return;

  var PALETTE = window.NERO_PALETTE;
  var byCode = {};
  for (var i = 0; i < PALETTE.length; i++) byCode[PALETTE[i][0]] = PALETTE[i];
  // Отдельные цвета не из веера Monicolor (например, MP-0194) — подписываем просто кодом
  function paintName(c) { return /^MP-/.test(c) ? c : "Monicolor NOVA · " + c; }
  var DEFAULT_CODE = byCode["X037"] ? "X037" : PALETTE[0][0];

  function isEn() { return document.documentElement.getAttribute("lang") === "en"; }

  /* декоративные покрытия NERO (js/decor-data.js, собирает tools/catalog/build_decor.py):
     на поверхности хранится код «D:<фактура>», у краски — код оттенка веера */
  var DECOR = window.NERO_DECOR || null, DECOR_DIR = "assets/media/decor/", LOOK = {};
  if (DECOR) DECOR.products.forEach(function (pr) { pr.looks.forEach(function (l, i) { LOOK[l.id] = { look: l, prod: pr, n: i + 1 }; }); });
  function isDecor(c) { return typeof c === "string" && c.indexOf("D:") === 0; }
  function lookOf(c) { return isDecor(c) ? LOOK[c.slice(2)] || null : null; }
  /* обои Decando (js/wallpaper-data.js, собирает tools/wallpaper/build_wallpaper.py):
     на поверхности — код «W:<id>», текстура — цветная бесшовная плитка в метрах рулона */
  var WP = window.NERO_WALLPAPER || null, WP_DIR = "assets/media/wallpaper/", WPI = {};
  if (WP) WP.items.forEach(function (it) { WPI[it.id] = it; });
  function isWp(c) { return typeof c === "string" && c.indexOf("W:") === 0; }
  function wpOf(c) { return isWp(c) ? WPI[c.slice(2)] || null : null; }
  function wpName(it) { return it.pat ? it.name + (it.tone ? " · " + it.tone : "") : (it.brand ? it.brand + " " : "") + (it.coll ? it.coll + " " : "") + it.art; }
  function wpBrand(it) { return (it.brand || "") + (it.coll ? " " + it.coll : ""); }
  function isMural(it) { return !!(it && (it.group === "mural" || it.mural)); }
  function norm(s) { return String(s || "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim(); }
  /* весь ассортимент decando.ru — компактный индекс (assets/media/wallpaper/index.json), грузится при первом
     открытии «Каталога» или по ссылке ?wp=wp-<id>; строки → такие же объекты, как у дизайнов */
  var CAT = { items: null, loading: null, ix: null, brands: [], colors: [], groups: [] };
  function rowItem(r, ix) {
    var brand = r[1] >= 0 ? ix.brands[r[1]] : "", mural = r[17] === 1;
    return { id: "wp-" + r[0], art: r[3], brand: brand, coll: r[2], name: (brand + " " + r[2]).trim(), tone: r[3], group: ix.groups[r[8]].key,
      url: "https://decando.ru/product/" + r[4], roll: [r[5], r[6]], rap: r[7], match: "straight", ex: r[9], hex: r[10], lin: hexToLin(r[10]),
      tex: [r[11], r[12]], size: [r[13], r[14]], color: r[15] >= 0 ? ix.colors[r[15]] : "", colorIx: r[15], brandIx: r[1],
      type_ru: r[16] >= 0 ? ix.types[r[16]] : "", type_en: r[16] >= 0 ? ix.types_en[r[16]] : "", mural: mural, q: norm(brand + " " + r[2] + " " + r[3]) };
  }
  function loadCatalog() {
    if (CAT.loading) return CAT.loading;
    if (!(WP && WP.catalog && WP.catalog.index)) return Promise.reject(new Error("no catalog"));
    CAT.loading = fetch(WP.catalog.index).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (ix) {
      CAT.ix = ix; CAT.brands = ix.brands; CAT.colors = ix.colors; CAT.groups = ix.groups;
      CAT.items = ix.items.map(function (r) { var it = rowItem(r, ix); WPI[it.id] = it; return it; });
      return CAT.items;
    });
    CAT.loading.catch(function () { CAT.loading = null; });
    return CAT.loading;
  }
  /* миниатюра: векторный узор — SVG в реальном масштабе (cm — ширина кнопки в см), растр — файл */
  function wpThumbUrl(it) { return it.pat && window.NERO_PATTERNS ? window.NERO_PATTERNS.url(it.pat) : WP_DIR + it.id + "-t.jpg"; }
  function wpThumb(el, it, cm) {
    el.style.backgroundImage = "url(" + wpThumbUrl(it) + ")";
    if (!it.pat) { el.style.backgroundSize = "cover"; return; }
    el.style.backgroundColor = it.pat.c[0];
    if (isMural(it)) { el.style.backgroundSize = "cover"; el.style.backgroundPosition = "center"; el.style.backgroundRepeat = "no-repeat"; }
    else { el.style.backgroundSize = (it.pat.w / ((cm || 40) * 10) * 100).toFixed(2) + "% auto"; el.style.backgroundRepeat = "repeat"; el.style.backgroundPosition = "0 0"; }
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); }
  function known(c) { return !!(c && (byCode[c] || lookOf(c) || wpOf(c))); }
  function hexOf(c) { var L = lookOf(c), W = wpOf(c); return L ? L.look.hex : W ? W.hex : (byCode[c] ? byCode[c][1] : "#b4aa9e"); }
  function shortOf(c) { var L = lookOf(c), W = wpOf(c); return L ? L.prod.name + " " + L.n : W ? wpName(W) : c; }
  function fullOf(c) {
    var L = lookOf(c), W = wpOf(c);
    if (W) return (isEn() ? "Wallpaper " : "Обои ") + wpName(W);
    return L ? "NERO " + L.prod.name + " · " + (isEn() ? "texture " : "фактура ") + L.n : paintName(c);
  }
  /* миниатюра покрытия или обоев для кружков и плашек; у краски — null */
  function thumbOf(c) { return lookOf(c) ? DECOR_DIR + c.slice(2) + "-t.jpg" : wpOf(c) ? wpThumbUrl(wpOf(c)) : null; }
  function plural(n, a, b, c) { var n10 = n % 10, n100 = n % 100; return n10 === 1 && n100 !== 11 ? a : n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14) ? b : c; }
  function fmtNum(v) { var s = String(Math.round(v * 100) / 100); return isEn() ? s : s.replace(".", ","); }

  /* ---------- цветовая математика ---------- */
  function hexToRgb(hex) {
    var n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function srgbToLin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function hexToLin(hex) { var c = hexToRgb(hex); return [srgbToLin(c[0]), srgbToLin(c[1]), srgbToLin(c[2])]; }

  /* для запасного CSS-пути (без WebGL): HSL-сдвиг оттенка под свет */
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2, d = max - min;
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, s * 100, l * 100];
  }
  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    var hx = function (v) { return clamp(Math.round((v + m) * 255), 0, 255).toString(16).padStart(2, "0"); };
    return "#" + hx(r) + hx(g) + hx(b);
  }
  var LIGHT_CSS = {
    day:  { dh: 0,  sm: 1.04, sa: 2,  lm: 1.05, la: 3 },
    warm: { dh: -7, sm: 1.12, sa: 5,  lm: 0.94, la: -2 },
    cold: { dh: 7,  sm: 0.9,  sa: -3, lm: 1.04, la: 3 },
    none: { dh: -9, sm: 1.08, sa: 4,  lm: 0.76, la: -3 }
  };
  function litHex(hex, mode) {
    var c = hexToRgb(hex), hsl = rgbToHsl(c[0], c[1], c[2]), k = LIGHT_CSS[mode] || LIGHT_CSS.day;
    return hslToHex(hsl[0] + k.dh, hsl[1] * k.sm + k.sa, hsl[2] * k.lm + k.la);
  }
  var LIGHTFX = {
    day: null,
    warm: { bg: "#ff9d3d", op: ".16", mode: "soft-light" },
    cold: { bg: "#6fa8ff", op: ".13", mode: "soft-light" },
    none: { bg: "#150d06", op: ".45", mode: "multiply" }
  };

  /* ============================================================
     Комнаты и поверхности (assets/media/rooms):
       room-*.jpg        фото «коробкой», 2048×1360
       room-*-mask.png   R/G/B — задняя / левая / правая стена
       room-*-mask3.png  R — потолок (G — шторы у окна, сейчас не используется)
       room-*-mask2.png  R/G/B — предметы objects[0..2]
       room-*-light.png  R/G — крупный свет стен/потолка, B — близость к стенам
       room-*-light2.png R/G/B — крупный свет предметов (сглаживается сильнее, uFlatObj)
       room-*-shade.png  R/G/B — светотень укрывистых предметов без рисунка дерева (log2: v=(log2 r+3.5)/5)
     wall/ceil/ref — медиана исходного цвета поверхности на фото (линейный RGB),
     anchor — освещённость, при которой поверхность показывает РОВНО цвет образца:
     самый освещённый участок (95-й процентиль) = цвет из веера, остальное темнее, как в жизни;
     cast — оттенок света комнаты по белой банке NERO (четверть тёплого тона ложится и на краску),
     opaque: 1 — укрывистая краска по дереву (волокна прячутся, стыки остаются).
     geom — «коробка» в координатах фото шириной 1024: углы задней стены и наклоны стыков
     с потолком/полом (как GEOM в tools/room-masks/build_masks.py) — по ней фактура
     декоративного покрытия ложится на стены с перспективой.
     Числа печатают tools/room-masks/build_masks.py и build_objects.py —
     при замене фото перезапустить их и переписать числа ниже.
     ============================================================ */
  var ROOM_DIR = "assets/media/rooms/room-";
  var ROOMS = {
    living: { geom: { xL: 199.94, xR: 782.22, yT: 105.64, yB: 441.67, aCL: 42.8, aCR: 41.2, aFL: 26.8, aFR: 26.2 },
      wall: [0.4072, 0.2874, 0.1746], ceil: [0.4793, 0.3968, 0.3278], anchor: 1.219, anchorCeil: 1.021, cast: [1.0635, 0.9887, 0.9250],
      objects: [{ key: "sofa", ref: [0.1590, 0.0212, 0.0065], anchor: 1.153, tex: 0.55 },
                { key: "rug", ref: [0.3419, 0.1812, 0.0953], anchor: 1.201, tex: 0.86 },
                { key: "floor", ref: [0.4508, 0.3467, 0.2502], anchor: 1.274, tex: 0.98 }] },
    bedroom: { geom: { xL: 199.39, xR: 781.99, yT: 105.48, yB: 427.64, aCL: 42.8, aCR: 40.9, aFL: 27.3, aFR: 26.0 },
      wall: [0.4020, 0.2831, 0.1683], ceil: [0.4678, 0.3916, 0.3231], anchor: 1.255, anchorCeil: 1.032, cast: [1.0406, 0.9925, 0.9546],
      objects: [{ key: "headboard", ref: [0.2623, 0.1714, 0.1095], anchor: 1.233, tex: 0.83 },
                { key: "rug", ref: [0.2423, 0.1170, 0.0482], anchor: 1.225, tex: 0.77 },
                { key: "floor", ref: [0.4735, 0.2918, 0.1620], anchor: 1.3, tex: 0.95 }] },
    kitchen: { geom: { xL: 190.54, xR: 786.04, yT: 98.04, yB: 408.43, aCL: 41.9, aCR: 39.4, aFL: 34.2, aFR: 38.8 },
      wall: [0.4125, 0.2831, 0.1683], ceil: [0.4793, 0.3916, 0.3185], anchor: 1.218, anchorCeil: 1.017, cast: [1.0532, 0.9907, 0.9356],
      objects: [{ key: "fronts", ref: [0.0844, 0.0284, 0.0091], anchor: 1.233, opaque: 1 },
                { key: "island", ref: [0.3278, 0.1441, 0.0545], anchor: 1.233, opaque: 1 },
                { key: "floor", ref: [0.4125, 0.1620, 0.0742], anchor: 1.481, tex: 0.86 }] },
    kids: { geom: { xL: 199.23, xR: 782.15, yT: 105.66, yB: 425.31, aCL: 42.8, aCR: 41.1, aFL: 28.1, aFR: 26.4 },
      wall: [0.4287, 0.3095, 0.1981], ceil: [0.4969, 0.4287, 0.3763], anchor: 1.231, anchorCeil: 1.018, cast: [1.0507, 0.9910, 0.9395],
      objects: [{ key: "bed", ref: [0.3185, 0.1413, 0.0578], anchor: 1.264, opaque: 1 },
                { key: "rug", ref: [0.5210, 0.3763, 0.2705], anchor: 1.251 },
                { key: "floor", ref: [0.4072, 0.2423, 0.1356], anchor: 1.462, tex: 0.91 }] }
  };
  var WALLS = ["back", "left", "right"];
  var LABELS = {
    walls: ["Стены", "Walls"], back: ["Задняя стена", "Back wall"], left: ["Левая стена", "Left wall"], right: ["Правая стена", "Right wall"],
    ceil: ["Потолок", "Ceiling"], sofa: ["Диван", "Sofa"], rug: ["Ковёр", "Rug"], floor: ["Пол", "Floor"],
    bed: ["Кровать", "Bed"], headboard: ["Изголовье", "Headboard"], fronts: ["Фасады кухни", "Cabinet fronts"], island: ["Остров", "Island"]
  };
  var SHORT = { walls: ["Все", "All"], back: ["Задняя", "Back"], left: ["Левая", "Left"], right: ["Правая", "Right"] };
  var MSG_RU = { walls: "стены", back: "задняя стена", left: "левая стена", right: "правая стена", ceil: "потолок",
                 sofa: "диван", rug: "ковёр", floor: "пол", bed: "кровать", headboard: "изголовье",
                 fronts: "фасады кухни", island: "кухонный остров" };
  var ROOM_RU = { living: "Гостиная", bedroom: "Спальня", kitchen: "Кухня", kids: "Детская" };
  var LIGHT_RU = { day: "дневной свет", warm: "тёплый свет", cold: "холодный свет", none: "без окон, только искусственный свет" };
  function label(key) { var l = LABELS[key]; return l ? l[isEn() ? 1 : 0] : key; }
  /* порядок поверхностей = порядок в шейдере: 0–2 стены, 3 потолок, 4–6 предметы */
  function surfaceKeys(room) { return WALLS.concat(["ceil"], ROOMS[room].objects.map(function (o) { return o.key; })); }
  function isWall(k) { return k === "walls" || WALLS.indexOf(k) !== -1; }
  function targets(k) { return k === "walls" ? WALLS.slice() : [k]; }

  /* ---------- DOM ---------- */
  var scene = document.getElementById("cstudioScene");
  var chip = document.getElementById("cstudioChip");
  var codeEl = document.getElementById("cstudioCode");
  var famEl = document.getElementById("cstudioFam");
  var cta = document.getElementById("cstudioCta");
  var swatchesEl = document.getElementById("cstudioSwatches");
  var swatchesEmpty = document.getElementById("cstudioSwatchesEmpty");
  var searchInput = document.getElementById("cstudioSearch");
  var surfacesEl = document.getElementById("cstudioSurfaces");
  var wallsEl = document.getElementById("cstudioWalls");
  var undoBtn = document.getElementById("cstudioUndo");
  var resetBtn = document.getElementById("cstudioReset");
  var clearBtn = document.getElementById("cstudioClear");
  var hintEl = document.getElementById("cstudioHint");
  var hoverLbl = document.getElementById("cstudioHoverLbl");
  var compareBtn = document.getElementById("cstudioCompare");
  var famsEl = document.getElementById("cstudioFams");
  var nowEl = document.getElementById("cstudioNow");
  var moreEl = document.getElementById("cstudioMore");
  var zoomBtn = document.getElementById("cstudioZoom"), zoomLink = document.getElementById("cstudioZoomLink");
  var zoomBox = document.getElementById("cstudioZoomBox"), zoomImg = document.getElementById("cstudioZoomImg");
  var zoomCap = document.getElementById("cstudioZoomCap"), zoomClose = document.getElementById("cstudioZoomClose");
  var modeBtns = root.querySelectorAll(".cstudio__mode[data-mode]");
  var panePaint = document.getElementById("cstudioPanePaint"), paneDecor = document.getElementById("cstudioPaneDecor");
  var dcatsEl = document.getElementById("cstudioDcats"), dprodsEl = document.getElementById("cstudioDprods");
  var dlooksEl = document.getElementById("cstudioDlooks"), dlooksTitle = document.getElementById("cstudioDlooksTitle");
  var paneWp = document.getElementById("cstudioPaneWp"), wgroupsEl = document.getElementById("cstudioWgroups"), wlistEl = document.getElementById("cstudioWlist");
  var wcatEl = document.getElementById("cstudioWcat"), wsearch = document.getElementById("cstudioWsearch"), wbrandSel = document.getElementById("cstudioWbrand");
  var wcolorSel = document.getElementById("cstudioWcolor"), wexactCb = document.getElementById("cstudioWexact"), wpatsEl = document.getElementById("cstudioWpats");
  var wcountEl = document.getElementById("cstudioWcount"), wmoreBtn = document.getElementById("cstudioWmore");
  var roomBtns = root.querySelectorAll(".cstudio__pill[data-room]");
  var lightBtns = root.querySelectorAll(".cstudio__pill[data-light]");
  var famBtns = root.querySelectorAll(".cstudio__fam-btn");
  var roomViews = root.querySelectorAll(".cstudio__roomview");
  var lightfxEls = root.querySelectorAll(".cstudio__lightfx");

  /* ---------- состояние ----------
     paint[комната][поверхность] = код оттенка; нет ключа — исходный цвет с фото.
     code — выбранный в веере оттенок («кисть»); active — что красим:
     "walls" (все стены разом), одна стена, потолок или предмет. */
  function freshPaint() { return { back: DEFAULT_CODE, left: DEFAULT_CODE, right: DEFAULT_CODE }; }
  var state = {
    room: "living", light: "day", code: DEFAULT_CODE, active: "walls",
    mode: "paint", look: DECOR ? DECOR.products[0].looks[0].id : null,
    wp: WP && WP.items.length ? WP.items[0].id : null, wgroup: "all",
    wq: "", wbrand: "", wcolor: "", wpat: "all", wexact: false, wshow: 48,
    dcat: DECOR ? DECOR.products[0].cat : null, dprod: DECOR ? DECOR.products[0].key : null,
    family: (byCode[DEFAULT_CODE] || [, , "terracotta"])[2],
    paint: { living: freshPaint(), bedroom: freshPaint(), kitchen: freshPaint(), kids: freshPaint() }
  };
  var history = [];
  function brush() {
    if (state.mode === "decor" && state.look) return "D:" + state.look;
    if (state.mode === "wallpaper" && state.wp) return "W:" + state.wp;
    return state.code;
  }
  var touched = {};   // комнаты, где человек сам что-то красил, — только они уходят в сообщение

  /* один шаг истории может менять несколько поверхностей сразу (все стены) */
  function setPaint(keys, code) {
    var p = state.paint[state.room], changes = [];
    keys.forEach(function (k) {
      var prev = p[k] || null;
      if (prev !== (code || null)) changes.push({ key: k, prev: prev });
    });
    if (!changes.length) return;
    history.push({ room: state.room, changes: changes });
    if (history.length > 80) history.shift();
    keys.forEach(function (k) { if (code) p[k] = code; else delete p[k]; });
    touched[state.room] = true;
    render();
  }
  /* код активной поверхности (или общий код всех стен); "" — у стен разные цвета */
  function codeOf(active, room) {
    var p = state.paint[room || state.room];
    if (active !== "walls") return p[active] || null;
    var a = p.back || null, b = p.left || null, c = p.right || null;
    return (a === b && b === c) ? a : "";
  }

  /* ============================================================
     WebGL-движок перекраски.
     Окраска физическая, в линейном RGB:
       пиксель = цвет образца × освещённость пикселя,
       освещённость = фото / исходный цвет поверхности.
     Тени, фактура ткани/дерева/штукатурки, свет из окна остаются
     фотографическими; центр поверхности = ровно цвет из веера.
     Боковые стены освещены иначе, чем задняя, — поэтому один и тот же
     оттенок на них чуть светлее/темнее, как в жизни.
     Покрашенные стены подсвечивают пол, потолок и мебель отражённым
     светом. Свет комнаты — баланс белого всей сцены (лампа 2700K /
     LED / «без окон» — вечер: окно, шторы и солнечные пятна гаснут).
     Нет WebGL или фото нельзя прочитать (файл открыт двойным кликом) —
     запасной CSS-путь (paintCss): только стены и потолок.
     ============================================================ */
  var N = 7;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var LIGHT_GL = {
    day:  { wb: [1, 1, 1],           expo: 1,    night: 0 },
    warm: { wb: [1.10, 0.985, 0.80], expo: 0.96, night: 0 },
    cold: { wb: [0.93, 1.005, 1.14], expo: 1.02, night: 0 },
    none: { wb: [1.07, 0.985, 0.85], expo: 0.74, night: 1 }
  };

  var VS = "attribute vec2 aPos; varying vec2 vUv;" +
    "void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }";
  var FS = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "varying vec2 vUv;",
    /* сдвиг уровня детализации: фото 2048 px на экране обычно чуть меньше — без сдвига
       видеокарта подмешивает уменьшенную копию и картинка мылится; −0.85 держит резкость оригинала */
    "#define LODB -0.85",
    "uniform sampler2D uPhoto; uniform sampler2D uMask; uniform sampler2D uMask3; uniform sampler2D uMask2;",
    "uniform sampler2D uLight; uniform sampler2D uLight2; uniform sampler2D uShade;",
    "uniform vec3 uPaint[7]; uniform float uOn[7]; uniform vec3 uRef[7]; uniform float uAnchor[7]; uniform float uOpaque[7]; uniform float uTex[7];",
    "uniform vec3 uWB; uniform float uExpo; uniform float uNight;",
    "uniform float uFlat; uniform float uFlatObj; uniform float uChroma; uniform float uBounce;",
    "uniform vec3 uWallAvg; uniform float uWallOn; uniform vec3 uCast;",
    "uniform vec3 uSel1; uniform vec3 uSel3; uniform vec3 uSel2; uniform float uHi; uniform vec2 uTexel;",
    "vec3 toLin(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c)); }",
    "vec3 toSrgb(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(0.41666667)) - 0.055, step(vec3(0.0031308), c)); }",
    "float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }",
    /* мягкий предел по каждому каналу (как в фотокамере): до 0.92 (линейн., ≈ sRGB 246)
       значение не трогаем — все оттенки веера, кроме почти белых, выходят точными;
       выше канал плавно упирается в 1.0. Почти белые поэтому на 2–3 единицы темнее
       образца — зато белая стена/мебель сохраняет объём и тени, а не упирается в плоский 255 */
    "vec3 softclip(vec3 x){ const float k = 0.92;",
    "  return mix(x, k + (1.0 - k) * (1.0 - exp(-(x - k) / (1.0 - k))), step(vec3(k), x)); }",
    /* освещённость = фото / исходный цвет. Делим её на крупный свет (slow, смягчается
       степенью fl) и мелкую фактуру (fine). Укрывистая краска (opq = 1, дерево) прячет
       рисунок волокон (|log2| < ~0.35) и сглаживает тёмные прожилки, но оставляет стыки и щели.
       Доля цветной вариации (тёплое пятно лампы) — uChroma, у укрывистой краски её нет */
    "vec3 repaint(vec3 src, vec3 paint, vec3 ref, float yref, float slow, float fl, float anchor, float opq, float shade, float tex, float aa){",
    "  float r0 = max(luma(src) / yref, 1e-4);",
    /* укрывистая краска: светотень берём из заранее сглаженной карты (без волокон дерева) */
    "  float r = mix(r0, exp2(shade * 5.0 - 3.5), opq);",
    /* мелкая фактура: у тёмных тканей ослаблена (блеск ворса — не цвет); на кромке, где пиксель
       наполовину чужой, — только крупный свет: иначе соседняя светлая стена даёт светлую обводку */
    "  float g = log2(r / max(slow, 1e-3)) * tex;",
    "  g *= smoothstep(0.5, 0.97, aa);",
    "  float illum = pow(slow, fl) * exp2(g);",
    "  vec3 cv = src / ref * (luma(ref) / yref) / r0;",
    "  vec3 light = illum * uCast * mix(vec3(1.0), cv, uChroma * (1.0 - opq));",
    "  return softclip(paint * light / anchor);",
    "}",
    "float sel(vec2 uv){ return dot(texture2D(uMask, uv).rgb, uSel1) + texture2D(uMask3, uv).r * uSel3.x + dot(texture2D(uMask2, uv).rgb, uSel2); }",
    /* декоративное покрытие на стене — три слоя, как у руки мастера (tools/catalog/build_decor.py):
       крупный — облака и переходы тона генерируются заново по всей стене (без повтора), в гамме
       образца (палитра uPalT: 8 тонов от тёмного к светлому, строка = стена);
       средний — мазки и прожилки с образца, вразброс шестиугольными ячейками: у каждой свой сдвиг,
       у не-рельефных ещё и поворот (у рельефа поворот сбил бы направление света);
       мелкий — поры и зерно — приглушены ещё при подготовке: с расстояния комнаты их не видно.
       Координаты — метры на плоскости стены (перспектива uHom: фото → стена) */
    "#ifndef NO_DECOR",
    "uniform sampler2D uDec0; uniform sampler2D uDec1; uniform sampler2D uDec2; uniform sampler2D uPalT;",
    "uniform float uDecOn[3]; uniform vec2 uDecTile[3]; uniform vec4 uDecP[3]; uniform vec2 uDecS[3]; uniform mat3 uHom[3];",
    /* «поклейка» обоев: uHang — ход поклейки стены (−1 — нет), под новыми полосами — прошлое покрытие:
       краска/исходная стена (uPrvPaint, uPrvPaintOn) или фактура/обои (uPrv0..2, есть при ≥14 слотах текстур) */
    "uniform float uHang[3]; uniform float uWallW[3]; uniform vec3 uPrvPaint[3]; uniform float uPrvPaintOn[3];",
    "#ifndef NO_PREV",
    "uniform sampler2D uPrv0; uniform sampler2D uPrv1; uniform sampler2D uPrv2;",
    "uniform float uPrvOn[3]; uniform vec2 uPrvTile[3]; uniform vec4 uPrvP[3]; uniform vec2 uPrvS[3];",
    "#endif",
    "vec4 hash4(vec2 p){ return fract(sin(vec4(1.0 + dot(p, vec2(37.0, 17.0)), 2.0 + dot(p, vec2(11.0, 47.0)), 3.0 + dot(p, vec2(41.0, 29.0)), 4.0 + dot(p, vec2(23.0, 31.0)))) * 103.0); }",
    "float hash1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);",
    "  return mix(mix(hash1(i), hash1(i + vec2(1.0, 0.0)), f.x), mix(hash1(i + vec2(0.0, 1.0)), hash1(i + vec2(1.0, 1.0)), f.x), f.y) * 2.0 - 1.0; }",
    "float fbm3(vec2 p){ return 0.55 * vnoise(p) + 0.3 * vnoise(p * 2.03 + 17.1) + 0.15 * vnoise(p * 4.07 + 31.7); }",
    "vec2 planeM(mat3 H, vec2 img){ vec3 p = H * vec3(img, 1.0); float z = abs(p.z) < 1e-4 ? 1e-4 : p.z; return clamp(p.xy / z, vec2(-500.0), vec2(500.0)); }",
    /* q — координата на стене в «сторонах плитки» (одинаковая по x и y), asp переводит её в uv плитки:
       поворот делаем в метрах, иначе у вытянутой плитки (2:1, 4:1) повёрнутые мазки сплющиваются */
    "vec3 cellDet(sampler2D s, vec2 q, vec2 dx, vec2 dy, vec2 asp, vec2 v, float rot){",
    "  vec4 h = hash4(v); float a = step(0.5, rot) * step(rot, 1.5) * 6.2831853 * h.z; float ca = cos(a); float sa = sin(a);",
    "  float fx = rot > 1.5 ? sign(h.z - 0.5) : 1.0;",   /* 2 — только зеркально слева направо */
    "  mat2 R = mat2(ca * fx, sa * fx, -sa, ca);",
    "  return TEXGRAD(s, (R * q) * asp + h.xy, (R * dx) * asp, (R * dy) * asp).rgb * 2.0 - 1.0;",
    "}",
    /* k — резкость стыка ячеек (3 — мягкие облака шёлка, 6+ — рельеф: каждая захватка цельная);
       ячейки одинаковые по x и y (≈0.58 стороны плитки), границы изогнуты шумом — соты не проступают */
    "vec3 hexDet(sampler2D s, vec2 pm, vec2 tile, float rot, float range, float k){",
    "  float side = sqrt(tile.x * tile.y); vec2 q = pm / side; vec2 asp = vec2(side) / tile;",
    "  vec2 dx = DFDX(q); vec2 dy = DFDY(q);",
    "  vec2 st = (q + 0.16 * vec2(vnoise(q * 2.3 + 3.1), vnoise(q * 2.3 + 8.7))) * 1.7320508;",
    "  vec2 sk = vec2(st.x - 0.57735027 * st.y, 1.15470054 * st.y);",
    "  vec2 b = floor(sk); vec3 f = vec3(fract(sk), 0.0); f.z = 1.0 - f.x - f.y;",
    "  float sg = step(0.0, -f.z); float s2 = 2.0 * sg - 1.0;",
    "  vec3 w = vec3(-f.z * s2, sg - f.y * s2, sg - f.x * s2);",
    "  vec3 c1 = cellDet(s, q, dx, dy, asp, b + vec2(sg, sg), rot);",
    "  vec3 c2 = cellDet(s, q, dx, dy, asp, b + vec2(sg, 1.0 - sg), rot);",
    "  vec3 c3 = cellDet(s, q, dx, dy, asp, b + vec2(1.0 - sg, sg), rot);",
    "  w = pow(max(w, vec3(1e-4)), vec3(k)); w /= (w.x + w.y + w.z);",
    "  return (c1 * w.x + c2 * w.y + c3 * w.z) * range / sqrt(dot(w, w));",
    "}",
    "vec3 macroCol(vec2 pm, float sc, float seed, float row){",
    "  vec2 p = pm / sc + seed;",
    "  vec2 q = vec2(fbm3(p * 0.6 + 5.2), fbm3(p * 0.6 + 9.4));",
    "  float u = clamp(0.5 + 1.15 * fbm3(p + 1.1 * q), 0.0, 1.0);",
    "  return toLin(texture2D(uPalT, vec2((u * 7.0 + 0.5) / 8.0, row)).rgb);",
    "}",
    "vec3 decorAt(sampler2D s, mat3 H, vec2 img, vec2 tile, vec4 P, vec2 S, float sl, float row){",
    "  vec2 pm = planeM(H, img);",
    "  return macroCol(pm, P.x, P.w, row) * exp2(hexDet(s, pm, tile, P.y, P.z, S.y)) * pow(sl, S.x);",
    "}",
    /* обои: плитка в метрах, v — от потолка вниз; на левой стене u зеркально (P.z = −1: смотрим на неё
       изнутри комнаты). Стык полотен — тонкая тень каждые P.x м (ширина рулона) и едва заметная
       разница тона соседних полос, как у настоящей поклейки */
    "vec3 paperAt(sampler2D s, mat3 H, vec2 img, vec2 tile, vec4 P){",
    "  vec2 pm = planeM(H, img);",
    "  vec2 uv = vec2(pm.x * P.z, -pm.y) / tile;",
    "  vec3 c = toLin(TEXGRAD(s, uv, DFDX(uv), DFDY(uv)).rgb);",
    "  float d = abs(fract(pm.x / P.x + 0.5) - 0.5) * P.x;",
    "  float w = max((abs(DFDX(pm).x) + abs(DFDY(pm).x)) * 1.3, 0.0012);",
    "  float idx = floor(pm.x / P.x);",
    "  float tone = 1.0 + (fract(sin(idx * 12.9898) * 43758.5453) - 0.5) * 0.012;",
    "  return c * tone * (1.0 - P.y * (1.0 - smoothstep(0.0, w, d)));",
    "}",
    /* полосы появляются по очереди от угла, каждая — сверху вниз; следующая начинается, когда предыдущая
       ещё не дошла до пола (как клеят вдвоём) */
    "float hang(float prog, vec2 pm, float roll, float wallW){",
    "  float n = ceil(max(wallW, roll) / roll);",
    "  float p = prog * (n + 1.4) - floor(pm.x / roll);",
    "  float yn = clamp(pm.y / 2.7, 0.0, 1.0);",
    "  return smoothstep(yn - 0.025, yn + 0.025, p * 1.3 - 0.15);",
    "}",
    "#endif",
    "void main(){",
    "  vec3 src = toLin(texture2D(uPhoto, vUv, LODB).rgb);",
    "  vec3 m = texture2D(uMask, vUv, LODB).rgb;",
    "  vec3 m3 = texture2D(uMask3, vUv, LODB).rgb;",
    "  vec3 m2 = texture2D(uMask2, vUv, LODB).rgb;",
    "  vec3 lt = texture2D(uLight, vUv).rgb;",
    "  vec2 slow = exp2(lt.rg * 4.0 - 2.0);",
    "  vec3 slowO = exp2(texture2D(uLight2, vUv).rgb * 4.0 - 2.0);",
    "  vec3 sh = texture2D(uShade, vUv, LODB).rgb;",
    "  float yw = luma(uRef[0]);",
    /* маски — разбиение пикселя: фото + поверхности = 1 (на стыках нет просвета) */
    "  float a0 = m.r * uOn[0]; float a1 = m.g * uOn[1]; float a2 = m.b * uOn[2]; float a3 = m3.r * uOn[3];",
    "  float a4 = m2.r * uOn[4]; float a5 = m2.g * uOn[5]; float a6 = m2.b * uOn[6];",
    "  float k = max(a0 + a1 + a2 + a3 + a4 + a5 + a6, 1.0);",
    "  a0 /= k; a1 /= k; a2 /= k; a3 /= k; a4 /= k; a5 /= k; a6 /= k;",
    "  vec3 col = src * (1.0 - a0 - a1 - a2 - a3 - a4 - a5 - a6);",
    /* стена с декоративным покрытием: вместо цвета веера — фактура; мелкую фактуру старой стены
       с фото почти убираем (новое покрытие её закрывает), крупный свет и тени остаются */
    "  vec3 p0 = uPaint[0]; vec3 p1 = uPaint[1]; vec3 p2 = uPaint[2]; float d0 = 1.0; float d1 = 1.0; float d2 = 1.0;",
    "#ifndef NO_DECOR",
    "  vec2 img = vec2(vUv.x * 1024.0, (1.0 - vUv.y) * 680.0);",
    /* шёлк и перламутр отражают свет окна сильнее матовой стены: светлое — ярче, тень — глубже */
    "  if (uDecOn[0] > 1.5) { p0 = paperAt(uDec0, uHom[0], img, uDecTile[0], uDecP[0]); d0 = 0.22; }",
    "  else if (uDecOn[0] > 0.5) { p0 = decorAt(uDec0, uHom[0], img, uDecTile[0], uDecP[0], uDecS[0], slow.x, 1.0 / 12.0); d0 = 0.45; }",
    "  if (uDecOn[1] > 1.5) { p1 = paperAt(uDec1, uHom[1], img, uDecTile[1], uDecP[1]); d1 = 0.22; }",
    "  else if (uDecOn[1] > 0.5) { p1 = decorAt(uDec1, uHom[1], img, uDecTile[1], uDecP[1], uDecS[1], slow.x, 3.0 / 12.0); d1 = 0.45; }",
    "  if (uDecOn[2] > 1.5) { p2 = paperAt(uDec2, uHom[2], img, uDecTile[2], uDecP[2]); d2 = 0.22; }",
    "  else if (uDecOn[2] > 0.5) { p2 = decorAt(uDec2, uHom[2], img, uDecTile[2], uDecP[2], uDecS[2], slow.x, 5.0 / 12.0); d2 = 0.45; }",
    /* стена: текущее покрытие; во время поклейки обоев под полосами — прошлое (макрос WALLMIX в sources()) */
    "  WALLMIX(0, p0, d0, uHom[0], m.r, a0, uPrv0, 7.0 / 12.0)",
    "  WALLMIX(1, p1, d1, uHom[1], m.g, a1, uPrv1, 9.0 / 12.0)",
    "  WALLMIX(2, p2, d2, uHom[2], m.b, a2, uPrv2, 11.0 / 12.0)",
    "#else",
    "  col += repaint(src, p0, uRef[0], yw, slow.x, uFlat, uAnchor[0], 0.0, 0.5, d0, m.r) * a0;",
    "  col += repaint(src, p1, uRef[1], yw, slow.x, uFlat, uAnchor[1], 0.0, 0.5, d1, m.g) * a1;",
    "  col += repaint(src, p2, uRef[2], yw, slow.x, uFlat, uAnchor[2], 0.0, 0.5, d2, m.b) * a2;",
    "#endif",
    "  col += repaint(src, uPaint[3], uRef[3], luma(uRef[3]), slow.y, uFlat, uAnchor[3], 0.0, 0.5, 1.0, m3.r) * a3;",
    "  col += repaint(src, uPaint[4], uRef[4], luma(uRef[4]), slowO.r, uFlatObj, uAnchor[4], uOpaque[4], sh.r, uTex[4], m2.r) * a4;",
    "  col += repaint(src, uPaint[5], uRef[5], luma(uRef[5]), slowO.g, uFlatObj, uAnchor[5], uOpaque[5], sh.g, uTex[5], m2.g) * a5;",
    "  col += repaint(src, uPaint[6], uRef[6], luma(uRef[6]), slowO.b, uFlatObj, uAnchor[6], uOpaque[6], sh.b, uTex[6], m2.b) * a6;",
    /* отражённый свет от покрашенных стен на всё остальное рядом */
    "  vec3 wt = pow(clamp(uWallAvg / uRef[0], vec3(0.4), vec3(1.8)), vec3(0.35));",
    "  vec3 bounce = mix(vec3(1.0), wt, clamp(lt.b * uBounce * uWallOn, 0.0, 1.0));",
    "  col *= mix(bounce, vec3(1.0), a0 + a1 + a2);",
    /* «без окон» — вечер при лампах, дневного света нет. Окно со шторами (маска m3.g) гаснет
       ровно: по сглаженной яркости фото (мип-уровень ~4), а не по каждой нити — иначе ткань рвётся
       на полосы; стекло (самое светлое) темнее ткани. Солнечные полосы на полу (мелкий свет выше
       крупного) и перепад от окна по стенам и потолку уходят — лампы светят ровнее, чем солнце.
       Слот 6 — во всех комнатах пол */
    "  if (uNight > 0.001) {",
    "    float wl = luma(toLin(texture2D(uPhoto, vUv, 4.5).rgb));",
    "    float fw = mix(0.6, 0.24, smoothstep(0.25, 0.9, wl));",
    "    float gf = log2(max(luma(src) / luma(uRef[6]), 1e-4) / max(slowO.b, 1e-3));",
    "    float ff = exp2(-max(gf - 0.12, 0.0) * 0.9) * pow(min(1.0, 1.0 / slowO.b), 0.7);",
    "    float fwall = pow(min(1.0, 1.0 / slow.x), 0.6), fceil = pow(min(1.0, 1.0 / slow.y), 0.6);",
    "    float f = mix(1.0, fw, m3.g) * mix(1.0, ff, m2.b) * mix(1.0, fwall, min(m.r + m.g + m.b, 1.0)) * mix(1.0, fceil, m3.r);",
    "    col *= mix(1.0, f, uNight);",
    "  }",
    "  col *= uWB * uExpo;",
    "  vec2 d = (vUv - 0.5) * vec2(1.0, 1.3);",
    "  col *= 1.0 - uNight * 0.36 * smoothstep(0.18, 0.78, length(d));",
    "  vec3 outc = toSrgb(col);",
    /* подсветка поверхности под курсором / выбранной: лёгкое высветление + тонкий контур */
    "  if (uHi > 0.001) {",
    "    float h = sel(vUv);",
    "    float e = abs(sel(vUv + vec2(uTexel.x, 0.0)) - sel(vUv - vec2(uTexel.x, 0.0))) + abs(sel(vUv + vec2(0.0, uTexel.y)) - sel(vUv - vec2(0.0, uTexel.y)));",
    "    outc = mix(outc, min(outc * 1.08 + 0.05, 1.0), h * uHi * 0.55);",
    "    outc = mix(outc, vec3(1.0), clamp(e * 1.2, 0.0, 1.0) * uHi * 0.9);",
    "  }",
    "  gl_FragColor = vec4(outc, 1.0);",
    "}"
  ].join("\n");

  function createEngine(sceneEl, onFail) {
    var canvas = document.createElement("canvas");
    canvas.className = "cstudio__gl";
    canvas.setAttribute("aria-hidden", "true");
    var opts = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: "low-power" };
    var gl = null, isGL2 = false;
    try {
      gl = canvas.getContext("webgl2", opts); isGL2 = !!gl;
      if (!gl) gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
    } catch (e) { gl = null; }
    if (!gl) return null;
    function shader(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { if (window.console) console.warn("color-studio shader:", gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    /* фактуре под углом (боковые стены) нужны производные и textureGrad: WebGL2 — GLSL 3.00,
       WebGL1 — расширения; нет ни того ни другого — фактура без них (чуть мягче на стыках плиток).
       Слотов текстур меньше 10 — декоративные покрытия выключены (краски работают как обычно) */
    var decorOK = !!(window.NERO_DECOR || window.NERO_WALLPAPER) && gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) >= 11;
    var hasPrev = decorOK && gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) >= 14;   // прошлая фактура/обои под поклейкой
    /* в GLSL ES 1.0 нельзя выбрать сэмплер по индексу — стена разворачивается макросом */
    function wallMacro(prev) {
      return "#define WALLMIX(i, p, d, H, mk, a, ps, row) { " +
        "vec3 cc = repaint(src, p, uRef[i], yw, slow.x, uFlat, uAnchor[i], 0.0, 0.5, d, mk); " +
        "if (uHang[i] >= 0.0) { vec3 q = uPrvPaint[i]; float e = 1.0; " +
        (prev ? "if (uPrvOn[i] > 1.5) { q = paperAt(ps, H, img, uPrvTile[i], uPrvP[i]); e = 0.22; } " +
                "else if (uPrvOn[i] > 0.5) { q = decorAt(ps, H, img, uPrvTile[i], uPrvP[i], uPrvS[i], slow.x, row); e = 0.45; } " : "") +
        "vec3 b = mix(src, repaint(src, q, uRef[i], yw, slow.x, uFlat, uAnchor[i], 0.0, 0.5, e, mk), uPrvPaintOn[i]); " +
        "float h = hang(uHang[i], planeM(H, img), uDecP[i].x, uWallW[i]); " +
        "cc = mix(b, cc, h) * (1.0 - 0.9 * h * (1.0 - h)); } " +
        "col += cc * a; }\n";
    }
    var GRAD_NONE = "#define TEXGRAD(s,u,dx,dy) texture2D(s,u)\n#define DFDX(x) vec2(0.0)\n#define DFDY(x) vec2(0.0)\n";
    function sources() {
      var nod = (decorOK ? "" : "#define NO_DECOR\n") + (hasPrev ? "" : "#define NO_PREV\n") + wallMacro(hasPrev), out = [];
      if (isGL2) out.push(["#version 300 es\nin vec2 aPos; out vec2 vUv; void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }",
        "#version 300 es\n" + nod + "#define TEXGRAD(s,u,dx,dy) textureGrad(s,u,dx,dy)\n#define DFDX dFdx\n#define DFDY dFdy\n" +
        FS.replace("varying vec2 vUv;", "in vec2 vUv;\nout vec4 fragOut;").replace(/texture2D\(/g, "texture(").replace(/gl_FragColor/g, "fragOut")]);
      else if (gl.getExtension("OES_standard_derivatives") && gl.getExtension("EXT_shader_texture_lod"))
        out.push([VS, "#extension GL_OES_standard_derivatives : enable\n#extension GL_EXT_shader_texture_lod : enable\n" + nod +
          "#define TEXGRAD(s,u,dx,dy) texture2DGradEXT(s,u,dx,dy)\n#define DFDX dFdx\n#define DFDY dFdy\n" + FS]);
      out.push([VS, nod + GRAD_NONE + FS]);
      return out;
    }
    var vs = null, fs = null;
    sources().some(function (pair, i, all) {
      vs = shader(gl.VERTEX_SHADER, pair[0]); fs = vs && shader(gl.FRAGMENT_SHADER, pair[1]);
      if (vs && fs) canvas.setAttribute("data-shader", pair[1].indexOf("#version 300") === 0 ? "glsl300" : i < all.length - 1 ? "glsl100-grad" : "glsl100");
      return vs && fs;
    });
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "aPos");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ["uPhoto", "uMask", "uMask3", "uMask2", "uLight", "uLight2", "uShade", "uPaint", "uOn", "uRef", "uAnchor", "uOpaque", "uTex", "uWB", "uExpo", "uNight",
     "uFlat", "uFlatObj", "uChroma", "uBounce", "uWallAvg", "uWallOn", "uCast", "uSel1", "uSel3", "uSel2", "uHi", "uTexel",
     "uDec0", "uDec1", "uDec2", "uPalT", "uDecOn", "uDecTile", "uDecP", "uDecS", "uHom",
     "uHang", "uWallW", "uPrvPaint", "uPrvPaintOn", "uPrv0", "uPrv1", "uPrv2", "uPrvOn", "uPrvTile", "uPrvP", "uPrvS"]
      .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1i(U.uPhoto, 0); gl.uniform1i(U.uMask, 1); gl.uniform1i(U.uMask3, 2);
    gl.uniform1i(U.uMask2, 3); gl.uniform1i(U.uLight, 4); gl.uniform1i(U.uLight2, 5); gl.uniform1i(U.uShade, 6);
    gl.uniform1f(U.uFlat, 0.55); gl.uniform1f(U.uFlatObj, 0.3); gl.uniform1f(U.uChroma, 0.3); gl.uniform1f(U.uBounce, 0.35);
    if (decorOK) { gl.uniform1i(U.uDec0, 7); gl.uniform1i(U.uDec1, 8); gl.uniform1i(U.uDec2, 9); gl.uniform1i(U.uPalT, 10); }
    if (hasPrev) { gl.uniform1i(U.uPrv0, 11); gl.uniform1i(U.uPrv1, 12); gl.uniform1i(U.uPrv2, 13); }
    var aniso = gl.getExtension("EXT_texture_filter_anisotropic") || gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");

    sceneEl.appendChild(canvas);
    sceneEl.classList.add("gl-on");

    var dead = false;
    function fail() {
      if (dead) return; dead = true;
      sceneEl.classList.remove("gl-on", "is-gl");
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      onFail();
    }
    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); fail(); });

    function loadImage(src) {
      return new Promise(function (res, rej) {
        var img = new Image();
        img.decoding = "async";
        img.onload = function () { res(img); };
        img.onerror = rej;
        img.src = src;
      });
    }
    function makeTex(img, isMask, noMips) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, isMask ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);   // file:// → SecurityError → CSS-путь
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (isGL2 && !noMips) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      return t;
    }
    /* плитка фактуры: повтор, мипмапы (размер — степень двойки), анизотропия для стен под углом */
    function makeTileTex(img) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);   // это не цвет, а log2-деталь
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      return t;
    }
    var dummyTex = null;
    function dummy() {
      if (dummyTex) return dummyTex;
      dummyTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, dummyTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128]));
      return dummyTex;
    }
    var decTex = {};
    /* палитра крупного слоя: 8 тонов × (3 стены + 3 прошлых покрытия под поклейкой) — sRGB 8 бит, сглаживание между тонами фильтром */
    var palTex = null, palKey = "";
    function setPalette(ids) {
      var key = ids.join("|");
      if (key === palKey && palTex) return;
      palKey = key;
      var px = new Uint8Array(8 * 6 * 3);
      for (var w = 0; w < 6; w++) {
        var L = ids[w] && LOOK[ids[w]];
        for (var i = 0; i < 8; i++) for (var c = 0; c < 3; c++) {
          var v = L ? L.look.pal[i][c] : 0.2;
          v = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
          px[(w * 8 + i) * 3 + c] = Math.max(0, Math.min(255, Math.round(v * 255)));
        }
      }
      gl.activeTexture(gl.TEXTURE10);
      if (!palTex) {
        palTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, palTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      } else gl.bindTexture(gl.TEXTURE_2D, palTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 8, 6, 0, gl.RGB, gl.UNSIGNED_BYTE, px);
    }
    function loadDecor(id) {
      if (!decorOK || !id || decTex[id]) return;
      var d = decTex[id] = { ready: false }, wpi = isWp(id) ? WPI[id.slice(2)] : null;
      var src = wpi && wpi.pat && window.NERO_PATTERNS ? window.NERO_PATTERNS.canvas(wpi.pat, 1024)
              : loadImage(isWp(id) ? WP_DIR + id.slice(2) + ".jpg" : DECOR_DIR + id + ".jpg");
      src.then(function (img) {
        if (dead) return;
        d.t = makeTileTex(img); d.ready = true;
        draw();
      }, function () { delete decTex[id]; });
    }
    /* перспектива стен: фото (ширина 1024) → плоскость стены в метрах. Высота комнаты 2,7 м,
       фокус ≈ 70° по горизонтали; глубина боковых стен — из того, во сколько раз стена
       у края кадра выше, чем у задней стены */
    function homography(s, d) {
      var A = [], i, j, k;
      for (i = 0; i < 4; i++) {
        var x = s[i][0], y = s[i][1], u = d[i][0], v = d[i][1];
        A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]); A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
      }
      for (i = 0; i < 8; i++) {
        var piv = i;
        for (j = i + 1; j < 8; j++) if (Math.abs(A[j][i]) > Math.abs(A[piv][i])) piv = j;
        var tmp = A[i]; A[i] = A[piv]; A[piv] = tmp;
        for (j = 0; j < 8; j++) if (j !== i) { var f = A[j][i] / A[i][i]; for (k = i; k < 9; k++) A[j][k] -= f * A[i][k]; }
      }
      var h = []; for (i = 0; i < 8; i++) h.push(A[i][8] / A[i][i]);
      return [h[0], h[3], h[6], h[1], h[4], h[7], h[2], h[5], 1];   // по столбцам — для uniformMatrix3fv
    }
    function wallHoms(g) {
      var Hm = 2.7, f = 731, rad = Math.PI / 180, hb = g.yB - g.yT, Wm = Hm * (g.xR - g.xL) / hb, Zb = f * Hm / hb;
      var tCL = Math.tan(g.aCL * rad), tFL = Math.tan(g.aFL * rad), tCR = Math.tan(g.aCR * rad), tFR = Math.tan(g.aFR * rad);
      var back = homography([[g.xL, g.yT], [g.xR, g.yT], [g.xR, g.yB], [g.xL, g.yB]], [[0, 0], [Wm, 0], [Wm, Hm], [0, Hm]]);
      var t0 = g.yT - tCL * g.xL, b0 = g.yB + tFL * g.xL, D0 = Zb * (1 - hb / (b0 - t0));
      var left = homography([[g.xL, g.yT], [0, t0], [0, b0], [g.xL, g.yB]], [[0, 0], [D0, 0], [D0, Hm], [0, Hm]]);
      var t1 = g.yT - tCR * (1024 - g.xR), b1 = g.yB + tFR * (1024 - g.xR), D1 = Zb * (1 - hb / (b1 - t1));
      var right = homography([[g.xR, g.yT], [1024, t1], [1024, b1], [g.xR, g.yB]], [[0, 0], [D1, 0], [D1, Hm], [0, Hm]]);
      return new Float32Array(back.concat(left, right));
    }
    /* ширина задней, левой и правой стены, м — для расчёта рулонов обоев */
    function wallWidths(g) {
      var Hm = 2.7, f = 731, rad = Math.PI / 180, hb = g.yB - g.yT, Wm = Hm * (g.xR - g.xL) / hb, Zb = f * Hm / hb;
      var t0 = g.yT - Math.tan(g.aCL * rad) * g.xL, b0 = g.yB + Math.tan(g.aFL * rad) * g.xL;
      var t1 = g.yT - Math.tan(g.aCR * rad) * (1024 - g.xR), b1 = g.yB + Math.tan(g.aFR * rad) * (1024 - g.xR);
      return [Wm, Zb * (1 - hb / (b0 - t0)), Zb * (1 - hb / (b1 - t1))];
    }

    /* карта попаданий для тапа/наведения: маски, уменьшенные до 384 px, на CPU */
    function makeHitMap(m1, m3, m2) {
      var W = 384, H = Math.round(W * m1.naturalHeight / m1.naturalWidth);
      var c = document.createElement("canvas"); c.width = W; c.height = H;
      var ctx = c.getContext("2d", { willReadFrequently: true });
      var read = function (img) { ctx.clearRect(0, 0, W, H); ctx.drawImage(img, 0, 0, W, H); return ctx.getImageData(0, 0, W, H).data; };
      return { W: W, H: H, d1: read(m1), d3: read(m3), d2: read(m2) };
    }

    var rooms = {};
    function loadRoom(key) {
      if (rooms[key]) return rooms[key].safe;
      var r = rooms[key] = { ready: false };
      var names = [".jpg", "-mask.png", "-mask3.png", "-mask2.png", "-light.png", "-light2.png", "-shade.png"];
      r.p = Promise.all(names.map(function (n) { return loadImage(ROOM_DIR + key + n); }))
        .then(function (imgs) {
          if (dead) return;
          r.tex = [makeTex(imgs[0], false), makeTex(imgs[1], true), makeTex(imgs[2], true),
                   makeTex(imgs[3], true), makeTex(imgs[4], true, true), makeTex(imgs[5], true, true), makeTex(imgs[6], true)];
          r.hit = makeHitMap(imgs[1], imgs[2], imgs[3]);
          r.ready = true;
        });
      r.safe = r.p.catch(function () { fail(); });
      return r.safe;
    }

    var activeKey = null, active = false;
    var cur = null, from = null, to = null, t0 = 0, raf = 0;
    /* поклейка по стенам: { t0, dur, prev: { decor, paint, on } } — что было под новыми обоями */
    var hangs = [null, null, null], HANG_DUR = 1700;
    var hi = { sel: null, amt: 0, target: 0, pulseUntil: 0 };
    var DUR = reduceMotion ? 0 : 420;

    function lerp3(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
    function mixState(a, b, k) {
      var o = { paint: [], on: [], wb: lerp3(a.wb, b.wb, k), expo: a.expo + (b.expo - a.expo) * k, night: a.night + (b.night - a.night) * k,
                decor: (b.decor || [null, null, null]).slice() };   // фактура меняется сразу, проявление — через on
      for (var i = 0; i < N; i++) { o.paint.push(lerp3(a.paint[i], b.paint[i], k)); o.on.push(a.on[i] + (b.on[i] - a.on[i]) * k); }
      return o;
    }
    function clone(s) { return mixState(s, s, 0); }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 3);
      var w = Math.max(1, Math.min(2560, Math.round(rect.width * dpr)));
      var h = Math.max(1, Math.min(2560, Math.round(rect.height * dpr)));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    }

    function flat(arr) { var o = []; arr.forEach(function (v) { o.push(v[0], v[1], v[2]); }); return new Float32Array(o); }
    function draw() {
      var r = rooms[activeKey];
      if (dead || !r || !r.ready || !cur) return;
      var meta = ROOMS[activeKey];
      resize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      for (var t = 0; t < 7; t++) { gl.activeTexture(gl.TEXTURE0 + t); gl.bindTexture(gl.TEXTURE_2D, r.tex[t]); }
      var refs = [meta.wall, meta.wall, meta.wall, meta.ceil], anchors = [meta.anchor, meta.anchor, meta.anchor, meta.anchorCeil || meta.anchor];
      var opq = [0, 0, 0, 0], tex = [1, 1, 1, 1];
      meta.objects.forEach(function (o) { refs.push(o.ref); anchors.push(o.anchor); opq.push(o.opaque || 0); tex.push(o.tex || 1); });
      while (refs.length < N) { refs.push([0.2, 0.2, 0.2]); anchors.push(1); opq.push(0); tex.push(1); }
      gl.uniform3fv(U.uPaint, flat(cur.paint));
      gl.uniform1fv(U.uOn, new Float32Array(cur.on));
      gl.uniform3fv(U.uRef, flat(refs));
      gl.uniform1fv(U.uAnchor, new Float32Array(anchors));
      gl.uniform1fv(U.uOpaque, new Float32Array(opq));
      gl.uniform1fv(U.uTex, new Float32Array(tex));
      gl.uniform3fv(U.uCast, meta.cast || [1, 1, 1]);
      gl.uniform3fv(U.uWB, cur.wb);
      gl.uniform1f(U.uExpo, cur.expo);
      gl.uniform1f(U.uNight, cur.night);
      /* средний цвет стен (непокрашенная стена — исходный цвет) — для отражённого света */
      var avg = [0, 0, 0], on = 0;
      for (var w = 0; w < 3; w++) {
        var c = lerp3(meta.wall, cur.paint[w], cur.on[w]);
        avg[0] += c[0] / 3; avg[1] += c[1] / 3; avg[2] += c[2] / 3; on += cur.on[w] / 3;
      }
      gl.uniform3fv(U.uWallAvg, avg); gl.uniform1f(U.uWallOn, on);
      var s = hi.sel || [0, 0, 0, 0, 0, 0, 0];
      gl.uniform3fv(U.uSel1, [s[0], s[1], s[2]]); gl.uniform3fv(U.uSel3, [s[3], 0, 0]); gl.uniform3fv(U.uSel2, [s[4], s[5], s[6]]);
      gl.uniform1f(U.uHi, hi.sel ? hi.amt : 0);
      gl.uniform2f(U.uTexel, 1.4 / canvas.width, 1.4 / canvas.height);
      if (decorOK) {
        if (!meta._hom) meta._hom = wallHoms(meta.geom);
        var don = [0, 0, 0], tile = [], prm = [], shn = [], ids = [null, null, null], rng = (window.NERO_DECOR && window.NERO_DECOR.range) || 1.5;
        for (var dw = 0; dw < 3; dw++) {
          var did = cur.decor && cur.decor[dw], dt = did && decTex[did];
          gl.activeTexture(gl.TEXTURE7 + dw);
          if (dt && dt.ready && isWp(did)) {
            var Wp = WPI[did.slice(2)];
            gl.bindTexture(gl.TEXTURE_2D, dt.t); don[dw] = 2;
            tile.push(Wp.size[0], Wp.size[1]); prm.push(Math.min(Wp.roll[0], 1.06), isMural(Wp) ? 0.035 : 0.075, dw === 1 ? -1 : 1, 0); shn.push(0, 3);
          } else if (dt && dt.ready) {
            gl.bindTexture(gl.TEXTURE_2D, dt.t); don[dw] = 1; ids[dw] = did;
            var L = LOOK[did].look; tile.push(L.size[0], L.size[1]); prm.push(L.macro || 0.6, L.rot || 0, rng, 3.7 + dw * 13.17); shn.push(L.sheen || 0, L.blend || 3);
          } else { gl.bindTexture(gl.TEXTURE_2D, dummy()); tile.push(1, 1); prm.push(1, 0, rng, 0); shn.push(0, 3); }
        }
        var now = performance.now(), hg = [-1, -1, -1], pon = [0, 0, 0], ptile = [], pprm = [], pshn = [], ppaint = [], ppon = [0, 0, 0], pids = [null, null, null];
        for (var pw = 0; pw < 3; pw++) {
          var hs = hangs[pw];
          if (hs) {
            var cdt = cur.decor && cur.decor[pw] && decTex[cur.decor[pw]];
            if (!(cdt && cdt.ready)) hs.t0 = Math.max(hs.t0, now);          // новые обои ещё грузятся — ждём, старое покрытие на месте
            var hk = (now - hs.t0) / hs.dur;
            if (hk >= 1) { hangs[pw] = null; hs = null; } else hg[pw] = Math.max(0, hk);
          }
          var pdid = hs && hs.prev.decor, pdt = pdid && decTex[pdid], pready = !!(hasPrev && pdt && pdt.ready);
          if (hasPrev) { gl.activeTexture(gl.TEXTURE11 + pw); gl.bindTexture(gl.TEXTURE_2D, pready ? pdt.t : dummy()); }
          if (pready && isWp(pdid)) {
            var PW = WPI[pdid.slice(2)]; pon[pw] = 2;
            ptile.push(PW.size[0], PW.size[1]); pprm.push(Math.min(PW.roll[0], 1.06), isMural(PW) ? 0.035 : 0.075, pw === 1 ? -1 : 1, 0); pshn.push(0, 3);
          } else if (pready) {
            var PL = LOOK[pdid].look; pon[pw] = 1; pids[pw] = pdid;
            ptile.push(PL.size[0], PL.size[1]); pprm.push(PL.macro || 0.6, PL.rot || 0, rng, 3.7 + pw * 13.17); pshn.push(PL.sheen || 0, PL.blend || 3);
          } else { ptile.push(1, 1); pprm.push(1, 0, rng, 0); pshn.push(0, 3); }
          var ppc = hs ? hs.prev.paint : [0.2, 0.2, 0.2];
          ppaint.push(ppc[0], ppc[1], ppc[2]); ppon[pw] = hs ? hs.prev.on : 0;   // без слотов под прошлую фактуру — её средний цвет
        }
        setPalette(ids.concat(pids));
        gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, palTex);
        if (!meta._ww) meta._ww = wallWidths(meta.geom);
        gl.uniform1fv(U.uHang, new Float32Array(hg)); gl.uniform1fv(U.uWallW, new Float32Array(meta._ww));
        gl.uniform3fv(U.uPrvPaint, new Float32Array(ppaint)); gl.uniform1fv(U.uPrvPaintOn, new Float32Array(ppon));
        if (hasPrev) {
          gl.uniform1fv(U.uPrvOn, new Float32Array(pon)); gl.uniform2fv(U.uPrvTile, new Float32Array(ptile));
          gl.uniform4fv(U.uPrvP, new Float32Array(pprm)); gl.uniform2fv(U.uPrvS, new Float32Array(pshn));
        }
        gl.uniform1fv(U.uDecOn, new Float32Array(don)); gl.uniform2fv(U.uDecTile, new Float32Array(tile));
        gl.uniform4fv(U.uDecP, new Float32Array(prm)); gl.uniform2fv(U.uDecS, new Float32Array(shn)); gl.uniformMatrix3fv(U.uHom, false, meta._hom);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      sceneEl.classList.add("is-gl");
    }

    function tick(now) {
      var busy = false;
      if (from && to) {
        var k = DUR ? Math.min(1, (now - t0) / DUR) : 1;
        cur = mixState(from, to, 1 - Math.pow(1 - k, 3));
        if (k < 1) busy = true; else from = null;
      }
      for (var hw = 0; hw < 3; hw++) if (hangs[hw] && now < hangs[hw].t0 + hangs[hw].dur + 50) busy = true;
      var tgt = hi.target;
      if (hi.pulseUntil) { if (now < hi.pulseUntil) { tgt = 1; busy = true; } else hi.pulseUntil = 0; }
      if (Math.abs(hi.amt - tgt) > 0.004) { hi.amt = reduceMotion ? tgt : hi.amt + (tgt - hi.amt) * 0.18; busy = true; }
      else hi.amt = tgt;
      draw();
      raf = busy ? requestAnimationFrame(tick) : 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(tick); }
    function selVec(idxs) { var v = [0, 0, 0, 0, 0, 0, 0]; idxs.forEach(function (i) { if (i >= 0) v[i] = 1; }); return v; }
    function sameSel(a, b) { return a && b && a.join() === b.join(); }

    function showRoom(key) {
      activeKey = key;
      hangs = [null, null, null];
      hi.sel = null; hi.amt = 0; hi.target = 0; hi.pulseUntil = 0;
      if (!active) return;
      var r = rooms[key];
      if (r && r.ready) { draw(); return; }
      sceneEl.classList.remove("is-gl");
      loadRoom(key).then(function () { if (activeKey === key) draw(); });
    }

    if (window.ResizeObserver) new ResizeObserver(function () { draw(); }).observe(canvas);
    else window.addEventListener("resize", draw);

    return {
      setTarget: function (t, instant) {
        (t.decor || []).forEach(loadDecor);
        if (!cur || !active || instant) { cur = clone(t); to = t; from = null; hangs = [null, null, null]; draw(); return; }
        if (from) cur = clone(cur);
        for (var i = 0; i < N; i++) if (cur.on[i] < 0.001) cur.paint[i] = t.paint[i].slice();   // включаемая поверхность — сразу новым цветом, плавно проявляется
        from = clone(cur); to = t; t0 = performance.now();
        /* новые обои «клеятся» полосами, старое покрытие остаётся под ними; стены — одна за другой */
        var nh = 0;
        for (var w = 0; w < 3; w++) {
          if (!reduceMotion && isWp(t.decor[w]) && t.decor[w] !== cur.decor[w]) {
            hangs[w] = { t0: t0 + nh * 120, dur: HANG_DUR, prev: { decor: cur.decor[w], paint: cur.paint[w].slice(), on: cur.on[w] } }; nh++;
            from.paint[w] = t.paint[w].slice(); from.on[w] = t.on[w];
          } else if (hangs[w] && t.decor[w] !== cur.decor[w]) hangs[w] = null;   // сняли обои, пока клеили — обычный переход
        }
        kick();
      },
      showRoom: showRoom,
      /* какая поверхность под точкой (u,v ∈ 0..1): индекс 0..6 или -1 */
      hit: function (u, v) {
        var r = rooms[activeKey];
        if (!r || !r.ready) return -1;
        var x = clamp(Math.floor(u * r.hit.W), 0, r.hit.W - 1), y = clamp(Math.floor(v * r.hit.H), 0, r.hit.H - 1);
        var o = (y * r.hit.W + x) * 4, d1 = r.hit.d1, d3 = r.hit.d3, d2 = r.hit.d2;
        var vals = [d1[o], d1[o + 1], d1[o + 2], d3[o], d2[o], d2[o + 1], d2[o + 2]];
        var best = -1, bv = 110;
        for (var i = 0; i < N; i++) if (vals[i] > bv) { bv = vals[i]; best = i; }
        return best;
      },
      hover: function (idxs) {
        if (idxs && idxs.length) {
          var v = selVec(idxs);
          if (!sameSel(v, hi.sel)) { hi.amt = 0; hi.sel = v; }
          hi.target = 1;
        } else hi.target = 0;
        kick();
      },
      pulse: function (idxs) {
        if (!idxs || !idxs.length) return;
        var v = selVec(idxs);
        if (!sameSel(v, hi.sel)) hi.amt = 0;
        hi.sel = v; hi.target = 0; hi.pulseUntil = performance.now() + (reduceMotion ? 0 : 650);
        kick();
      },
      ready: function () { var r = rooms[activeKey]; return !!(active && r && r.ready); },
      decorOK: decorOK,
      preloadDecor: loadDecor,
      wallWidths: function (key) { return wallWidths(ROOMS[key].geom); },
      /* текстуры грузим, только когда блок подъезжает к экрану; остальные комнаты — следом */
      activate: function () {
        if (active || dead) return;
        active = true;
        loadRoom(activeKey).then(function () {
          draw();
          Object.keys(ROOMS).forEach(function (k) { if (k !== activeKey) loadRoom(k); });
        });
      }
    };
  }

  var engine = createEngine(scene, function () { engine = null; root.classList.add("cstudio--lite"); if (!isWall(state.active) && state.active !== "ceil") state.active = "walls"; render(true); });
  if (!engine) root.classList.add("cstudio--lite");
  if (engine) {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { io.disconnect(); if (engine) engine.activate(); }
      }, { rootMargin: "900px 0px" });
      io.observe(root);
    } else {
      engine.activate();
    }
  }
  function idxOf(key) { return surfaceKeys(state.room).indexOf(key); }
  function idxsOf(active) { return targets(active).map(idxOf); }

  /* ---------- запасной CSS-путь: стены и потолок наложением по clipPath ---------- */
  function paintCss() {
    var p = state.paint[state.room];
    var view = root.querySelector('.cstudio__roomview[data-room="' + state.room + '"]');
    if (!view) return;
    var wallCode = p.back || p.left || p.right;
    var w = view.querySelector(".cstudio__tint--wall"), c = view.querySelector(".cstudio__tint--ceil");
    if (w) { w.style.opacity = wallCode ? "1" : "0"; if (wallCode) w.style.backgroundColor = litHex(hexOf(wallCode), state.light); }
    if (c) { c.style.opacity = p.ceil ? "1" : "0"; if (p.ceil) c.style.backgroundColor = litHex(hexOf(p.ceil), state.light); }
    var fx = LIGHTFX[state.light];
    for (var j = 0; j < lightfxEls.length; j++) {
      var el = lightfxEls[j];
      if (fx) { el.style.backgroundColor = fx.bg; el.style.opacity = fx.op; el.style.mixBlendMode = fx.mode; }
      else el.style.opacity = "0";
    }
  }

  /* ---------- отрисовка состояния ---------- */
  function engineTarget() {
    var p = state.paint[state.room], keys = surfaceKeys(state.room), L = LIGHT_GL[state.light] || LIGHT_GL.day;
    var t = { paint: [], on: [], wb: L.wb.slice(), expo: L.expo, night: L.night, decor: [null, null, null] };
    for (var i = 0; i < N; i++) {
      var code = keys[i] && p[keys[i]], lk = lookOf(code), wp = wpOf(code);
      if (code && !known(code)) code = null;
      t.paint.push(lk ? lk.look.lin.slice() : wp ? wp.lin.slice() : code ? hexToLin(byCode[code][1]) : [0.2, 0.2, 0.2]);
      t.on.push(code ? 1 : 0);
      if (lk && i < 3) t.decor[i] = lk.look.id;
      if (wp && i < 3) t.decor[i] = "W:" + wp.id;
    }
    return t;
  }

  /* кружок цвета у кнопки: один цвет, штриховка «как на фото» или веер из нескольких цветов */
  function dotFor(codes) {
    var dot = document.createElement("span");
    dot.className = "cstudio__surf-dot";
    dot.setAttribute("aria-hidden", "true");
    var uniq = codes.filter(function (c, i) { return codes.indexOf(c) === i; });
    if (uniq.length === 1 && !uniq[0]) dot.classList.add("is-orig");
    else if (uniq.length === 1 && thumbOf(uniq[0])) dot.style.background = "url(" + thumbOf(uniq[0]) + ") center / cover";
    else if (uniq.length === 1) dot.style.backgroundColor = hexOf(uniq[0]);
    else {
      var col = function (c) { return c ? hexOf(c) : "#b4aa9e"; }, n = codes.length, stops = [];
      codes.forEach(function (c, i) { stops.push(col(c) + " " + (i * 360 / n) + "deg " + ((i + 1) * 360 / n) + "deg"); });
      dot.style.background = "conic-gradient(" + stops.join(",") + ")";
    }
    return dot;
  }

  function renderSurfaces() {
    if (!surfacesEl) return;
    var p = state.paint[state.room];
    var keys = engine ? ["walls", "ceil"].concat(ROOMS[state.room].objects.map(function (o) { return o.key; })) : ["walls", "ceil"];
    surfacesEl.innerHTML = "";
    keys.forEach(function (k) {
      var on = k === "walls" ? isWall(state.active) : k === state.active;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "cstudio__pill cstudio__surf" + (on ? " is-active" : "");
      b.setAttribute("data-surf", k);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      var codes = targets(k).map(function (t) { return p[t] || null; });
      b.appendChild(dotFor(codes));
      var t = document.createElement("span");
      t.textContent = label(k);
      b.appendChild(t);
      var code = codeOf(k);
      b.title = code ? label(k) + " — " + fullOf(code) : label(k);
      surfacesEl.appendChild(b);
    });
    /* стены: все разом или каждую по отдельности (акцентная стена) */
    if (wallsEl) {
      wallsEl.hidden = !isWall(state.active);
      wallsEl.innerHTML = "";
      ["walls"].concat(WALLS).forEach(function (k) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "cstudio__wallbtn" + (k === state.active ? " is-active" : "");
        b.setAttribute("data-surf", k);
        b.setAttribute("aria-pressed", k === state.active ? "true" : "false");
        if (k !== "walls") b.appendChild(dotFor([p[k] || null]));
        var t = document.createElement("span");
        t.textContent = SHORT[k][isEn() ? 1 : 0];
        b.appendChild(t);
        wallsEl.appendChild(b);
      });
    }
  }

  function familyName(fam) {
    var btn = root.querySelector('.cstudio__fam-btn[data-fam="' + fam + '"]');
    return btn ? btn.textContent.trim() : fam;
  }

  /* подпись ссылки «подробнее» меняется по типу покрытия; js/i18n.js хранит пару в data-ru/data-en —
     обновляем обе, иначе переключатель языка вернёт старую подпись */
  function moreText(ru, en) {
    moreEl.setAttribute("data-ru", ru); moreEl.setAttribute("data-en", en);
    moreEl.textContent = isEn() ? en : ru;
  }
  function renderReadout() {
    var code = codeOf(state.active);
    var entry = code && byCode[code], lk = lookOf(code), wp = wpOf(code);
    chip.style.background = "";
    chip.classList.remove("is-orig");
    if (moreEl) moreEl.hidden = !(lk || wp);
    var zl = zoomItem();
    if (zoomLink) zoomLink.hidden = !(lk || wp);
    if (zoomBtn) zoomBtn.hidden = !zl;
    if (wp) {
      chip.style.background = "url(" + wpThumbUrl(wp) + ") center / cover";
      codeEl.textContent = fullOf(code);
      famEl.textContent = label(state.active) + " · " + wpSpec(wp, targets(state.active));
      if (moreEl) { moreEl.hidden = !!wp.pat; moreEl.href = "catalog/oboi.html#" + wp.id; moreText("Об обоях →", "About the wallpaper →"); }
    } else if (lk) {
      chip.style.background = "url(" + DECOR_DIR + lk.look.id + "-t.jpg) center / cover";
      codeEl.textContent = fullOf(code);
      famEl.textContent = label(state.active) + " · " + (isEn() ? lk.prod.type_en : lk.prod.type_ru);
      if (moreEl) { moreEl.hidden = !!lk.prod.nopage; moreEl.href = "catalog/nero-" + lk.prod.key + ".html"; moreText("О покрытии →", "About the coating →"); }   // nopage — покрытие только в примерке, страницы в каталоге нет
    } else if (entry) {
      chip.style.backgroundColor = entry[1];
      codeEl.textContent = paintName(entry[0]);
      famEl.textContent = label(state.active) + " · " + familyName(entry[2]);
    } else if (code === "") {
      var p = state.paint[state.room];
      chip.style.background = dotFor(WALLS.map(function (k) { return p[k] || null; })).style.background;
      codeEl.textContent = isEn() ? "Different shades" : "Разные оттенки";
      famEl.textContent = isEn() ? "Walls · pick one to paint all three" : "Стены · выберите оттенок — покрасим все три";
    } else {
      chip.classList.add("is-orig");
      codeEl.textContent = isEn() ? "Original color" : "Исходный цвет";
      famEl.textContent = label(state.active) + (isEn() ? " · pick a shade to paint" : " · выберите оттенок, чтобы покрасить");
    }
    if (nowEl) {
      var pp = state.paint[state.room];
      nowEl.innerHTML = "";
      nowEl.appendChild(dotFor(targets(state.active).map(function (k) { return pp[k] || null; })));
      var nt = document.createElement("span");
      nt.textContent = label(state.active) + (code ? " · " + shortOf(code) : "");
      nowEl.appendChild(nt);
    }
    var anyPainted = targets(state.active).some(function (k) { return !!state.paint[state.room][k]; });
    if (clearBtn) clearBtn.hidden = !anyPainted;
    if (undoBtn) undoBtn.disabled = !history.length;
  }

  /* рулон, раппорт и сколько рулонов уйдёт на выбранные стены (высота 2,7 м + подгонка по раппорту + 10 см на подрезку) */
  function rollsFor(wp, keys) {
    if (!engine || !engine.wallWidths) return 0;
    var ws = engine.wallWidths(state.room), per = 0;
    keys.forEach(function (k) { var i = WALLS.indexOf(k); if (i >= 0) per += ws[i]; });
    if (!per) return 0;
    if (isMural(wp)) return Math.ceil(per * 2.7);
    var R = (wp.rap || 0) / 100, cut = 2.7 + 0.1;
    if (R > 0) cut = Math.ceil(cut / R - 1e-9) * R + (wp.match === "offset" ? R / 2 : 0);
    var perStrip = Math.max(1, Math.floor(wp.roll[1] / cut + 1e-9));
    return Math.ceil(Math.max(1, Math.ceil(per / wp.roll[0] - 1e-9)) / perStrip);
  }
  function wpSpec(wp, keys) {
    var en = isEn(), s = wpBrand(wp) ? wpBrand(wp) + " · " : "";
    if (isMural(wp)) s += en ? "cut to the wall size" : "по размеру стены";
    else {
      s += fmtNum(wp.roll[0]) + " × " + fmtNum(wp.roll[1]) + (en ? " m" : " м");
      if (wp.rap) s += " · " + (en ? "repeat " : "раппорт ") + fmtNum(wp.rap) + (en ? " cm" : " см");
    }
    var n = rollsFor(wp, keys);
    if (n) s += " · ≈ " + n + " " + (isMural(wp) ? (en ? "m²" : "м²") : en ? (n === 1 ? "roll" : "rolls") : plural(n, "рулон", "рулона", "рулонов"));
    if (!wp.pat && !wp.ex && !isMural(wp)) s += en ? " · scale approximate" : " · масштаб ориентировочный";
    return s;
  }

  function syncSwatchHighlight() {
    syncDecor();
    syncWp();
    var code = codeOf(state.active) || state.code;
    var bs = swatchesEl.querySelectorAll(".cstudio__swatch");
    for (var i = 0; i < bs.length; i++) {
      var on = bs[i].getAttribute("data-code") === code;
      bs[i].classList.toggle("is-active", on);
      bs[i].setAttribute("aria-pressed", on ? "true" : "false");
    }
  }

  /* сообщение в WhatsApp — всегда по-русски (менеджеры пишут на русском,
     как и остальные контактные ссылки сайта); все покрашенные поверхности по комнатам */
  function updateCta() {
    if (!cta) return;
    var order = [state.room].concat(Object.keys(ROOMS).filter(function (r) { return r !== state.room && touched[r]; }));
    var parts = [];
    order.forEach(function (room) {
      var p = state.paint[room], items = [];
      var all = codeOf("walls", room);
      var msg = function (c) {
        var L = lookOf(c), W = wpOf(c);
        if (W) return "обои " + wpName(W) + " (" + (wpBrand(W) ? wpBrand(W) + ", " : "") + (isMural(W) ? "панно по размеру стены" : W.roll[0].toFixed(2).replace(".", ",") + " × " + String(W.roll[1]).replace(".", ",") + " м") + ")";
        return L ? "декоративное покрытие NERO " + L.prod.name + " (фактура " + L.n + ")" : c;
      };
      if (all) items.push(MSG_RU.walls + " — " + msg(all));
      else WALLS.forEach(function (k) { if (p[k]) items.push(MSG_RU[k] + " — " + msg(p[k])); });
      ["ceil"].concat(ROOMS[room].objects.map(function (o) { return o.key; })).forEach(function (k) {
        if (p[k]) items.push(MSG_RU[k] + " — " + msg(p[k]));
      });
      if (items.length) parts.push(ROOM_RU[room] + ": " + items.join(", "));
    });
    var text = parts.length
      ? "Здравствуйте! Подбираю отделку на сайте NERO. " + parts.join(". ") + ". Освещение: " + LIGHT_RU[state.light] + ". Подскажите, пожалуйста, по этим вариантам."
      : "Здравствуйте! Хочу подобрать цвет Monicolor NOVA для интерьера — подскажите, пожалуйста.";
    cta.href = "https://wa.me/79654900687?text=" + encodeURIComponent(text);
  }

  function render(instant) {
    if (engine) engine.setTarget(engineTarget(), instant);
    else paintCss();
    scene.setAttribute("data-light", state.light);
    renderSurfaces();
    renderReadout();
    syncSwatchHighlight();
    updateCta();
  }

  function setActive(key, pulse) {
    state.active = key;
    renderSurfaces();
    renderReadout();
    syncSwatchHighlight();
    if (pulse && engine) engine.pulse(idxsOf(key));
  }

  /* ---------- переключатели: комната / свет ---------- */
  function setActivePill(list, attr, value) {
    for (var i = 0; i < list.length; i++) {
      var on = list[i].getAttribute(attr) === value;
      list[i].classList.toggle("is-active", on);
      list[i].setAttribute("aria-pressed", on ? "true" : "false");
    }
  }
  function selectRoom(key) {
    state.room = key;
    setActivePill(roomBtns, "data-room", key);
    for (var i = 0; i < roomViews.length; i++) roomViews[i].classList.toggle("is-active", roomViews[i].getAttribute("data-room") === key);
    state.active = "walls";   // в новой комнате начинаем со стен
    if (engine) engine.showRoom(key);
    hideHoverLbl();
    render(true);
  }
  function selectLight(mode) {
    state.light = mode;
    setActivePill(lightBtns, "data-light", mode);
    render();
  }
  roomBtns.forEach(function (b) { b.addEventListener("click", function () { selectRoom(b.getAttribute("data-room")); }); });
  lightBtns.forEach(function (b) { b.addEventListener("click", function () { selectLight(b.getAttribute("data-light")); }); });

  if (surfacesEl) surfacesEl.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".cstudio__surf") : null;
    if (!b) return;
    var k = b.getAttribute("data-surf");
    /* «Стены» при уже выбранной одной стене не сбрасывают выбор — переключение ниже */
    setActive(k === "walls" && isWall(state.active) ? state.active : k, true);
  });
  if (wallsEl) wallsEl.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".cstudio__wallbtn") : null;
    if (b) setActive(b.getAttribute("data-surf"), true);
  });
  if (undoBtn) undoBtn.addEventListener("click", function () {
    var h = history.pop();
    if (!h) return;
    h.changes.forEach(function (c) { if (c.prev) state.paint[h.room][c.key] = c.prev; else delete state.paint[h.room][c.key]; });
    if (h.room !== state.room) selectRoom(h.room);
    var keys = h.changes.map(function (c) { return c.key; });
    state.active = keys.length === 3 && keys.every(isWall) ? "walls" : keys[0];
    render();
    if (engine) engine.pulse(keys.map(idxOf));
  });
  if (resetBtn) resetBtn.addEventListener("click", function () {
    var p = state.paint[state.room], changes = Object.keys(p).map(function (k) { return { key: k, prev: p[k] }; });
    if (!changes.length) return;
    history.push({ room: state.room, changes: changes });
    state.paint[state.room] = {};
    render();
  });
  if (clearBtn) clearBtn.addEventListener("click", function () { setPaint(targets(state.active), null); });

  /* ---------- «образец вблизи»: фото образца из каталога на весь экран ----------
     на стене с расстояния комнаты поры и зерно почти не видны — а вблизи вот так */
  function zoomItem() {
    var p = state.paint[state.room], c = codeOf(state.active);
    var pick = function (x) { return lookOf(x) ? { L: lookOf(x) } : wpOf(x) ? { W: wpOf(x) } : null; };
    if (pick(c)) return pick(c);
    var keys = isWall(state.active) ? targets(state.active) : WALLS;
    for (var i = 0; i < keys.length; i++) if (pick(p[keys[i]])) return pick(p[keys[i]]);
    return null;
  }
  var zoomFocus = null;
  function openZoom() {
    var Z = zoomItem();
    if (!Z || !zoomBox) return;
    if (Z.W) {
      var W = Z.W, en = isEn();
      if (W.pat && window.NERO_PATTERNS) {
        zoomImg.removeAttribute("src");
        window.NERO_PATTERNS.canvas(W.pat, 1024).then(function (cv) { if (zoomItem() && zoomItem().W === W) zoomImg.src = cv.toDataURL("image/png"); });
        zoomCap.innerHTML = "<b>" + (en ? "Wallpaper " : "Обои ") + esc(wpName(W)) + "</b> " +
          (en ? "One repeat of the design, " + fmtNum(W.pat.w / 10) + " × " + fmtNum(W.pat.h / 10) + " cm" + (W.group === "mural" ? " — the mural is printed to the wall size." : "; strips are " + fmtNum(W.roll[0]) + " m wide.")
              : "Один раппорт рисунка, " + fmtNum(W.pat.w / 10) + " × " + fmtNum(W.pat.h / 10) + " см" + (W.group === "mural" ? " — фреска печатается по размеру стены." : "; полотна шириной " + fmtNum(W.roll[0]) + " м."));
      } else {
      zoomImg.src = WP_DIR + W.id + "-z.jpg";
      zoomImg.alt = (en ? "Wallpaper " : "Обои ") + wpName(W) + (en ? " — close-up" : " — образец вблизи");
      zoomCap.innerHTML = "<b>" + (en ? "Wallpaper " : "Обои ") + esc(wpName(W)) + "</b> " +
        (en ? "Supplier swatch: a fragment of the roll at full width (" + fmtNum(W.roll[0]) + " m)." + (W.rap ? " Pattern repeat " + fmtNum(W.rap) + " cm — that is how the design recurs down the wall." : "")
            : "Свотч поставщика — фрагмент полотна во всю ширину рулона (" + fmtNum(W.roll[0]) + " м)." + (W.rap ? " Раппорт " + fmtNum(W.rap) + " см — через столько рисунок повторяется по высоте." : ""));
      }
      zoomFocus = document.activeElement;
      zoomBox.hidden = false;
      requestAnimationFrame(function () { zoomBox.classList.add("is-open"); zoomClose.focus(); });
      return;
    }
    var L = Z.L;
    zoomImg.src = DECOR_DIR + L.look.id + "-z.jpg";
    zoomImg.alt = "NERO " + L.prod.name + (isEn() ? " — sample close-up" : " — образец вблизи");
    zoomCap.innerHTML = "<b>NERO " + L.prod.name + " · " + (isEn() ? "texture " : "фактура ") + L.n + "</b> " +
      (isEn() ? "Sample from the NERO catalog, close-up. From across the room the fine pores and grain are almost invisible — what you see is the overall pattern, as on the wall in the photo."
              : "Образец из каталога NERO крупным планом. С расстояния комнаты мелкие поры и зерно почти не видны — виден общий рисунок, как на стене на фото.");
    zoomFocus = document.activeElement;
    zoomBox.hidden = false;
    requestAnimationFrame(function () { zoomBox.classList.add("is-open"); zoomClose.focus(); });
  }
  function closeZoom() {
    if (!zoomBox || zoomBox.hidden) return;
    zoomBox.classList.remove("is-open");
    setTimeout(function () { zoomBox.hidden = true; zoomImg.removeAttribute("src"); }, 250);
    if (zoomFocus && zoomFocus.focus) zoomFocus.focus();
  }
  if (zoomBtn) zoomBtn.addEventListener("click", openZoom);
  if (zoomLink) zoomLink.addEventListener("click", openZoom);
  if (zoomClose) zoomClose.addEventListener("click", closeZoom);
  if (zoomBox) {
    zoomBox.addEventListener("click", function (e) { if (e.target === zoomBox) closeZoom(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeZoom(); });
  }

  /* ---------- «до/после»: пока кнопку держат (палец, мышь, пробел) — исходное фото ---------- */
  function holdOriginal(on) {
    scene.classList.toggle("is-orig", on);
    if (!compareBtn) return;
    compareBtn.classList.toggle("is-held", on);
    compareBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  if (compareBtn) {
    compareBtn.addEventListener("pointerdown", function (e) {
      if (e.button > 0) return;
      e.preventDefault();
      try { compareBtn.setPointerCapture(e.pointerId); } catch (err) { /* старый браузер */ }
      holdOriginal(true);
    });
    ["pointerup", "pointercancel", "lostpointercapture", "blur"].forEach(function (ev) {
      compareBtn.addEventListener(ev, function () { holdOriginal(false); });
    });
    compareBtn.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); holdOriginal(true); } });
    compareBtn.addEventListener("keyup", function (e) { if (e.key === " " || e.key === "Enter") holdOriginal(false); });
    compareBtn.addEventListener("contextmenu", function (e) { e.preventDefault(); });   // долгое нажатие на телефоне
  }

  /* ---------- тап/клик по фото: выбираем (и красим) то, куда нажали ---------- */
  function sceneUV(e) {
    var r = scene.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, e.clientX - r.left, e.clientY - r.top];
  }
  function hideHoverLbl() { if (hoverLbl) hoverLbl.classList.remove("is-on"); }
  /* тап мимо окрашиваемого (подушка, стол, штора) — короткая подпись в месте тапа, а не тишина */
  var flashT = 0, flashUntil = 0;
  function flashLbl(text, uv) {
    if (!hoverLbl) return;
    var w = scene.clientWidth;
    hoverLbl.textContent = text;
    var x = Math.round(Math.min(uv[2] + 12, w - hoverLbl.offsetWidth - 8));
    hoverLbl.style.transform = "translate(" + Math.max(8, x) + "px," + Math.round(uv[3] + 14) + "px)";
    hoverLbl.classList.add("is-on");
    clearTimeout(flashT);
    flashUntil = performance.now() + 1500;
    flashT = setTimeout(hideHoverLbl, 1500);
  }
  var lastHover = -1;
  scene.addEventListener("pointermove", function (e) {
    if (!engine || !engine.ready() || e.pointerType !== "mouse") return;
    if (e.target.closest && e.target.closest("button")) { if (lastHover !== -1) { engine.hover(null); lastHover = -1; } hideHoverLbl(); return; }
    var uv = sceneUV(e), idx = engine.hit(uv[0], uv[1]);
    scene.classList.toggle("is-paintable", idx >= 0);
    if (idx !== lastHover) { engine.hover(idx >= 0 ? [idx] : null); lastHover = idx; }
    if (hoverLbl) {
      if (idx >= 0) {
        hoverLbl.textContent = label(surfaceKeys(state.room)[idx]);
        hoverLbl.style.transform = "translate(" + Math.round(uv[2] + 14) + "px," + Math.round(uv[3] + 16) + "px)";
        hoverLbl.classList.add("is-on");
      } else if (performance.now() > flashUntil) hideHoverLbl();
    }
  });
  scene.addEventListener("pointerleave", function () {
    if (engine) engine.hover(null);
    lastHover = -1; hideHoverLbl(); scene.classList.remove("is-paintable");
  });
  scene.addEventListener("click", function (e) {
    if (!engine || !engine.ready()) return;
    if (e.target.closest && e.target.closest("button")) return;
    var uv = sceneUV(e), idx = engine.hit(uv[0], uv[1]);
    if (idx < 0) { flashLbl(isEn() ? "This item can’t be repainted" : "Этот предмет не перекрашивается", uv); return; }
    var key = surfaceKeys(state.room)[idx];
    /* тап выбирает поверхность (стену — по отдельности); ещё не крашеную — сразу красим
       текущим оттенком (видимый отклик), уже крашеную не трогаем: дальше её перекрашивает веер */
    state.active = key;
    var br = brush();
    if ((isDecor(br) || isWp(br)) && !isWall(key)) br = state.code;    // фактуры и обои — для стен; потолок и мебель — краской
    if (!state.paint[state.room][key]) setPaint([key], br);
    renderSurfaces(); renderReadout(); syncSwatchHighlight();
    engine.pulse([idx]);
    if (hintEl) hintEl.classList.add("is-done");
  });

  /* ---------- семьи + веер оттенков ---------- */
  function renderSwatches() {
    var q = (searchInput && searchInput.value || "").trim().toUpperCase();
    var list = q ? PALETTE.filter(function (e) { return e[0].indexOf(q) !== -1; })
                 : PALETTE.filter(function (e) { return e[2] === state.family; });
    swatchesEl.innerHTML = "";
    if (!list.length) { swatchesEmpty.hidden = false; return; }
    swatchesEmpty.hidden = true;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < list.length; i++) {
      var e = list[i], b = document.createElement("button");
      b.type = "button";
      b.className = "cstudio__swatch";
      b.style.backgroundColor = e[1];
      b.title = e[0];
      b.setAttribute("aria-label", e[0]);
      b.setAttribute("aria-pressed", "false");
      b.setAttribute("data-code", e[0]);
      var rgb = parseInt(e[1].slice(1), 16), lum = 0.299 * (rgb >> 16) + 0.587 * (rgb >> 8 & 255) + 0.114 * (rgb & 255);
      if (lum < 150) b.classList.add("is-dark");   // код веера на самом оттенке: светлый текст на тёмном
      var c = document.createElement("span"); c.className = "cstudio__swatch-code"; c.textContent = e[0];
      b.appendChild(c);
      frag.appendChild(b);
    }
    swatchesEl.appendChild(frag);
    syncSwatchHighlight();
  }
  function selectFamily(fam) {
    state.family = fam;
    for (var i = 0; i < famBtns.length; i++) famBtns[i].classList.toggle("is-active", famBtns[i].getAttribute("data-fam") === fam);
    if (searchInput) searchInput.value = "";
    renderSwatches();
  }
  famBtns.forEach(function (b) { b.addEventListener("click", function () { selectFamily(b.getAttribute("data-fam")); }); });
  /* ряд семейств шире колонки: правый край тает, пока там есть ещё кнопки */
  function famsEdge() { if (famsEl) famsEl.classList.toggle("is-more", famsEl.scrollLeft + famsEl.clientWidth < famsEl.scrollWidth - 4); }
  if (famsEl) {
    famsEl.addEventListener("scroll", famsEdge, { passive: true });
    window.addEventListener("resize", famsEdge);
  }

  /* ---------- декоративные покрытия: раздел → покрытие → фактура ---------- */
  function prodOf(key) { for (var i = 0; DECOR && i < DECOR.products.length; i++) if (DECOR.products[i].key === key) return DECOR.products[i]; return null; }
  function showroomLooks() {
    var out = [];
    DECOR.products.forEach(function (p) { p.looks.forEach(function (l, i) { if (/^nr_/.test(l.src || "")) out.push({ prod: p, look: l, n: i + 1 }); }); });
    return out;
  }
  function renderDecor() {
    if (!DECOR || !dcatsEl) return;
    var en = isEn();
    dcatsEl.innerHTML = "";
    DECOR.cats.forEach(function (c) {
      var n = DECOR.products.filter(function (p) { return p.cat === c.key; }).length;
      var b = document.createElement("button");
      b.type = "button"; b.className = "cstudio__fam-btn cstudio__dcat" + (c.key === state.dcat ? " is-active" : "");
      b.setAttribute("data-dcat", c.key); b.setAttribute("aria-pressed", c.key === state.dcat ? "true" : "false");
      b.textContent = (en ? c.en : c.ru) + " · " + n;
      dcatsEl.appendChild(b);
    });
    /* «Шоурум» — все фактуры, снятые с образцов в шоуруме (src «nr_…»), одним списком, без выбора покрытия */
    var show = showroomLooks();
    if (show.length) {
      var sb = document.createElement("button");
      sb.type = "button"; sb.className = "cstudio__fam-btn cstudio__dcat" + (state.dcat === "showroom" ? " is-active" : "");
      sb.setAttribute("data-dcat", "showroom"); sb.setAttribute("aria-pressed", state.dcat === "showroom" ? "true" : "false");
      sb.textContent = (en ? "Showroom · " : "Шоурум · ") + show.length;
      dcatsEl.appendChild(sb);
    }
    dprodsEl.innerHTML = "";
    dprodsEl.hidden = state.dcat === "showroom";
    DECOR.products.filter(function (p) { return p.cat === state.dcat; }).forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "cstudio__dprod" + (p.key === state.dprod ? " is-active" : "");
      b.setAttribute("data-dprod", p.key); b.setAttribute("aria-pressed", p.key === state.dprod ? "true" : "false");
      b.title = en ? p.card_en || p.card_ru : p.card_ru;
      var im = document.createElement("img");
      im.src = DECOR_DIR + p.looks[0].id + "-t.jpg"; im.alt = ""; im.loading = "lazy"; im.width = 56; im.height = 56;
      var nm = document.createElement("span"); nm.className = "cstudio__dprod-name"; nm.textContent = p.name; nm.setAttribute("translate", "no");
      var n = p.looks.length, n10 = n % 10, n100 = n % 100;
      var ty = document.createElement("span"); ty.className = "cstudio__dprod-type";
      ty.textContent = en ? n + (n === 1 ? " texture" : " textures")
        : n + (n10 === 1 && n100 !== 11 ? " фактура" : n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14) ? " фактуры" : " фактур");
      b.appendChild(im); b.appendChild(nm); b.appendChild(ty);
      dprodsEl.appendChild(b);
    });
    var pr = prodOf(state.dprod);
    dlooksEl.innerHTML = "";
    if (state.dcat === "showroom") {
      if (dlooksTitle) dlooksTitle.textContent = (en ? "Showroom samples · " : "Образцы из шоурума · ") + show.length;
      show.forEach(function (x) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "cstudio__swatch cstudio__look";
        b.style.backgroundImage = "url(" + DECOR_DIR + x.look.id + "-t.jpg)";
        b.setAttribute("data-look", x.look.id);
        b.setAttribute("aria-label", x.prod.name + (en ? ", texture " : ", фактура ") + x.n);
        b.title = x.prod.name + " · " + x.n;
        dlooksEl.appendChild(b);
      });
    } else if (pr) {
      if (dlooksTitle) dlooksTitle.textContent = (en ? "Textures · " : "Фактуры · ") + pr.name;
      pr.looks.forEach(function (l, i) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "cstudio__swatch cstudio__look";
        b.style.backgroundImage = "url(" + DECOR_DIR + l.id + "-t.jpg)";
        b.setAttribute("data-look", l.id);
        b.setAttribute("aria-label", pr.name + (en ? ", texture " : ", фактура ") + (i + 1));
        b.title = pr.name + " · " + (i + 1);
        dlooksEl.appendChild(b);
      });
    }
    syncDecor();
  }
  function syncDecor() {
    if (!dlooksEl) return;
    var c = codeOf(state.active), id = isDecor(c) ? c.slice(2) : null;
    var bs = dlooksEl.querySelectorAll(".cstudio__look");
    for (var i = 0; i < bs.length; i++) {
      var on = bs[i].getAttribute("data-look") === id;
      bs[i].classList.toggle("is-active", on); bs[i].setAttribute("aria-pressed", on ? "true" : "false");
    }
    var lk = id && LOOK[id];
    var ps = dprodsEl ? dprodsEl.querySelectorAll(".cstudio__dprod") : [];
    for (var j = 0; j < ps.length; j++) ps[j].classList.toggle("is-on-wall", !!lk && ps[j].getAttribute("data-dprod") === lk.prod.key);
  }
  /* фактура кладётся на стены: выбрана одна стена — на неё, иначе — на все три */
  function applyLook(id) {
    if (!LOOK[id]) return;
    state.look = id;
    if (!isWall(state.active)) {
      state.active = "walls";
      if (hintEl) hintEl.classList.add("is-done");
      if (hoverLbl) flashLbl(isEn() ? "Decorative coatings go on the walls" : "Декоративные покрытия — для стен", [0, 0, 16, 16]);
    }
    setPaint(targets(state.active), "D:" + id);
    syncSwatchHighlight();
    if (engine) engine.pulse(idxsOf(state.active));
  }
  /* ---------- обои Decando: группа рисунка → обои ---------- */
  function fmtN(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0"); }
  function catalogList() {
    var q = norm(state.wq);
    return CAT.items.filter(function (it) {
      if (state.wpat !== "all" && it.group !== state.wpat) return false;
      if (state.wbrand && it.brand !== state.wbrand) return false;
      if (state.wcolor && it.color !== state.wcolor) return false;
      if (state.wexact && !it.ex && !it.mural) return false;
      return !q || it.q.indexOf(q) !== -1;
    });
  }
  function fillSelect(sel, values, keep, allRu, allEn) {
    if (!sel || sel.options.length > 1) return;
    values.forEach(function (v) { var o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o); });
    sel.value = keep || "";
  }
  function renderWp() {
    if (!WP || !wgroupsEl) return;
    var en = isEn(), cat = state.wgroup === "catalog";
    wgroupsEl.innerHTML = "";
    var chips = [{ key: "all", ru: "Дизайны", en: "Designs", n: WP.items.length }].concat(WP.groups.map(function (g) {
      return { key: g.key, ru: g.ru, en: g.en, n: WP.items.filter(function (it) { return it.group === g.key; }).length };
    }));
    if (WP.catalog && WP.catalog.n) chips.push({ key: "catalog", ru: "Каталог decando.ru", en: "decando.ru catalog", n: WP.catalog.n });
    chips.forEach(function (g) {
      if (!g.n) return;
      var b = document.createElement("button");
      b.type = "button"; b.className = "cstudio__fam-btn cstudio__wgroup" + (g.key === state.wgroup ? " is-active" : "");
      b.setAttribute("data-wgroup", g.key); b.setAttribute("aria-pressed", g.key === state.wgroup ? "true" : "false");
      b.textContent = (en ? g.en : g.ru) + " · " + fmtN(g.n);
      wgroupsEl.appendChild(b);
    });
    if (wcatEl) wcatEl.hidden = !cat;
    var list;
    if (cat) {
      if (!CAT.items) {
        wlistEl.innerHTML = ""; if (wmoreBtn) wmoreBtn.hidden = true;
        if (wcountEl) wcountEl.textContent = en ? "Loading the catalog…" : "Загружаю каталог…";
        loadCatalog().then(function () { if (state.wgroup === "catalog") renderWp(); }, function () { if (wcountEl) wcountEl.textContent = en ? "The catalog is unavailable" : "Каталог сейчас недоступен"; });
        return;
      }
      fillSelect(wbrandSel, CAT.brands, state.wbrand); fillSelect(wcolorSel, CAT.colors, state.wcolor);
      if (wpatsEl && !wpatsEl.children.length) {
        [{ key: "all", ru: "Все рисунки", en: "All patterns" }].concat(CAT.groups).forEach(function (g) {
          var n = g.key === "all" ? CAT.items.length : CAT.items.filter(function (it) { return it.group === g.key; }).length;
          if (!n) return;
          var b = document.createElement("button");
          b.type = "button"; b.className = "cstudio__fam-btn cstudio__wpat"; b.setAttribute("data-wpat", g.key);
          b.textContent = (en ? g.en : g.ru) + " · " + fmtN(n);
          wpatsEl.appendChild(b);
        });
      }
      if (wpatsEl) Array.prototype.forEach.call(wpatsEl.children, function (b) { var on = b.getAttribute("data-wpat") === state.wpat; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
      list = catalogList();
      if (wcountEl) wcountEl.textContent = list.length ? (en ? "Found " : "Найдено ") + fmtN(list.length) : (en ? "Nothing found — try another brand or article" : "Ничего не найдено — попробуйте другой бренд или артикул");
    } else list = WP.items.filter(function (it) { return state.wgroup === "all" || it.group === state.wgroup; });
    wlistEl.innerHTML = "";
    var shown = cat ? list.slice(0, state.wshow) : list;
    shown.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "cstudio__swatch cstudio__wp" + (it.ex ? " is-exact" : "");
      if (it.pat) wpThumb(b, it, 40);
      else { var im = document.createElement("img"); im.src = WP_DIR + it.id + "-t.jpg"; im.alt = ""; im.loading = "lazy"; im.width = 112; im.height = 112; b.appendChild(im); }
      b.setAttribute("data-wp", it.id);
      b.setAttribute("aria-label", (en ? "Wallpaper " : "Обои ") + wpName(it));
      b.title = wpName(it) + (it.ex ? (en ? " · exact repeat" : " · точный раппорт") : "");
      wlistEl.appendChild(b);
    });
    if (wmoreBtn) { wmoreBtn.hidden = !(cat && list.length > shown.length); wmoreBtn.textContent = (en ? "Show more" : "Показать ещё") + " · " + fmtN(Math.min(48, list.length - shown.length)); }
    syncWp();
  }
  function catFilterChanged() { state.wshow = 48; renderWp(); }
  if (wsearch) wsearch.addEventListener("input", function () { state.wq = wsearch.value; catFilterChanged(); });
  if (wbrandSel) wbrandSel.addEventListener("change", function () { state.wbrand = wbrandSel.value; catFilterChanged(); });
  if (wcolorSel) wcolorSel.addEventListener("change", function () { state.wcolor = wcolorSel.value; catFilterChanged(); });
  if (wexactCb) wexactCb.addEventListener("change", function () { state.wexact = wexactCb.checked; catFilterChanged(); });
  if (wpatsEl) wpatsEl.addEventListener("click", function (e) { var b = e.target.closest ? e.target.closest("[data-wpat]") : null; if (b) { state.wpat = b.getAttribute("data-wpat"); catFilterChanged(); } });
  if (wmoreBtn) wmoreBtn.addEventListener("click", function () { state.wshow += 48; renderWp(); });
  function syncWp() {
    if (!wlistEl) return;
    var c = codeOf(state.active), id = isWp(c) ? c.slice(2) : null;
    var bs = wlistEl.querySelectorAll(".cstudio__wp");
    for (var i = 0; i < bs.length; i++) {
      var on = bs[i].getAttribute("data-wp") === id;
      bs[i].classList.toggle("is-active", on); bs[i].setAttribute("aria-pressed", on ? "true" : "false");
    }
  }
  /* обои — на стены: выбрана одна стена — на неё, иначе на все три */
  function applyWp(id) {
    if (!WPI[id]) return;
    state.wp = id;
    if (!isWall(state.active)) {
      state.active = "walls";
      if (hintEl) hintEl.classList.add("is-done");
      if (hoverLbl) flashLbl(isEn() ? "Wallpaper goes on the walls" : "Обои — для стен", [0, 0, 16, 16]);
    }
    setPaint(targets(state.active), "W:" + id);
    syncSwatchHighlight();
    if (engine) engine.pulse(idxsOf(state.active));
  }
  if (wgroupsEl) wgroupsEl.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-wgroup]") : null;
    if (!b) return;
    state.wgroup = b.getAttribute("data-wgroup"); state.wshow = 48;
    renderWp();
  });
  if (wlistEl) wlistEl.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-wp]") : null;
    if (b) applyWp(b.getAttribute("data-wp"));
  });

  function setMode(mode) {
    if (mode === "decor" && !(DECOR && engine && engine.decorOK)) mode = "paint";
    if (mode === "wallpaper" && !(WP && engine && engine.decorOK)) mode = "paint";
    state.mode = mode;
    for (var i = 0; i < modeBtns.length; i++) {
      var on = modeBtns[i].getAttribute("data-mode") === mode;
      modeBtns[i].classList.toggle("is-active", on); modeBtns[i].setAttribute("aria-selected", on ? "true" : "false");
    }
    if (panePaint) panePaint.hidden = mode !== "paint";
    if (paneDecor) paneDecor.hidden = mode !== "decor";
    if (paneWp) paneWp.hidden = mode !== "wallpaper";
    if (mode === "decor") {
      renderDecor();
      if (engine) prodOf(state.dprod).looks.forEach(function (l) { engine.preloadDecor(l.id); });
    } else if (mode === "wallpaper") {
      renderWp();
      if (engine && state.wp) engine.preloadDecor("W:" + state.wp);
    } else famsEdge();
  }
  modeBtns.forEach(function (b) { b.addEventListener("click", function () { if (!b.disabled) setMode(b.getAttribute("data-mode")); }); });
  if (dcatsEl) dcatsEl.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-dcat]") : null;
    if (!b) return;
    state.dcat = b.getAttribute("data-dcat");
    var first = DECOR.products.filter(function (p) { return p.cat === state.dcat; })[0];
    if (first) state.dprod = first.key;
    renderDecor();
  });
  if (dprodsEl) dprodsEl.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-dprod]") : null;
    if (!b) return;
    state.dprod = b.getAttribute("data-dprod");
    var pr = prodOf(state.dprod);
    renderDecor();
    if (engine) pr.looks.forEach(function (l) { engine.preloadDecor(l.id); });
    applyLook(pr.looks[0].id);   // выбор покрытия сразу показывает его первую фактуру на стене
  });
  if (dlooksEl) dlooksEl.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-look]") : null;
    if (b) applyLook(b.getAttribute("data-look"));
  });

  /* оттенок из веера красит выбранное (все стены / одну стену / предмет) и становится «кистью» для тапа */
  swatchesEl.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".cstudio__swatch") : null;
    if (!b) return;
    var code = b.getAttribute("data-code");
    if (!byCode[code]) return;
    state.code = code;
    setPaint(targets(state.active), code);
    syncSwatchHighlight();
    if (engine) engine.pulse(idxsOf(state.active));
  });
  if (searchInput) searchInput.addEventListener("input", function () { renderSwatches(); });

  /* язык переключает js/i18n.js без события — после клика по переключателю
     пересобираем то, что JS пишет сам (подписи поверхностей, readout) */
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest(".lang-switch")) setTimeout(function () { renderSurfaces(); renderReadout(); if (state.mode === "decor") renderDecor(); if (state.mode === "wallpaper") renderWp(); }, 0);
  });

  /* ---------- старт ---------- */
  selectFamily(state.family);
  famsEdge();
  /* счётчик на вкладке — сколько фактур можно примерить (как оттенков у красок и артикулов у обоев), а не число покрытий */
  (function () {
    var cnt = document.querySelector("#cstudioTabDecor b"), n = 0;
    if (!cnt || !DECOR) return;
    DECOR.products.forEach(function (p) { n += p.looks.length; });
    cnt.textContent = n;
  })();
  if (!(DECOR && engine && engine.decorOK)) modeBtns.forEach(function (b) { if (b.getAttribute("data-mode") === "decor") b.hidden = true; });
  if (!(WP && engine && engine.decorOK)) modeBtns.forEach(function (b) { if (b.getAttribute("data-mode") === "wallpaper") b.hidden = true; });
  else modeBtns.forEach(function (b) { var n = b.getAttribute("data-mode") === "wallpaper" && b.querySelector("b"); if (n) n.textContent = fmtN(WP.items.length + (WP.catalog ? WP.catalog.n : 0)); });
  /* ссылка «Примерить в интерьере» со страницы обоев в каталоге: index.html?wp=<id>#colorstudio */
  (function () {
    if (/[?&]try=wallpaper(&|#|$)/.test(location.search) && WP && engine && engine.decorOK) setMode("wallpaper");
    var m = /[?&]wp=([a-z0-9-]+)/.exec(location.search);
    if (!m || !(engine && engine.decorOK)) return;
    var go = function () {
      if (!WPI[m[1]]) return;
      if (!WPI[m[1]].pat) { state.wgroup = "catalog"; state.wq = WPI[m[1]].art; if (wsearch) wsearch.value = state.wq; }
      setMode("wallpaper");
      applyWp(m[1]);
      history.length = 0; touched = {};
      renderReadout(); updateCta();
    };
    if (WPI[m[1]]) go(); else loadCatalog().then(go, function () {});
  })();
  /* ссылка «Примерить в интерьере» со страницы покрытия в каталоге: index.html?try=<покрытие>#colorstudio */
  (function () {
    var m = /[?&]try=([a-z0-9-]+)/.exec(location.search), pr = m && prodOf(m[1]);
    if (!pr || !(engine && engine.decorOK)) return;
    state.dcat = pr.cat; state.dprod = pr.key;
    setMode("decor");
    applyLook(pr.looks[0].id);
    history.length = 0; touched = {};   // это пример, а не выбор человека: «отменить» и сообщение — пустые
    renderReadout(); updateCta();
  })();
  setActivePill(lightBtns, "data-light", state.light);
  selectRoom(state.room);
})();
