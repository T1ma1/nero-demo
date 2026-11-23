/* ============================================================
   NERO — переключатель языка RU/EN (без сборки, vanilla JS).
   Перевод хранится прямо в разметке:
     data-en="..."            → меняет innerHTML элемента
     data-en-ph="..."         → меняет placeholder
     data-en-aria="..."       → меняет aria-label
     data-en-content="..."    → меняет content (для <meta>)
   Русский = исходное содержимое (запоминается в data-ru* при первом
   переключении). Выбор языка хранится в localStorage. Плашка .lang-switch
   сама переключает язык по клику (делегирование — работает и в шапке,
   и в мобильном меню).
   ============================================================ */
(function () {
  var KEY = "nero_lang";
  var RU_LABEL = "Перейти на русский";
  var EN_LABEL = "Switch to English";

  function swapHTML(el, en) {
    if (el.getAttribute("data-ru") === null) el.setAttribute("data-ru", el.innerHTML);
    el.innerHTML = en ? el.getAttribute("data-en") : el.getAttribute("data-ru");
    /* у заголовков .split-reveal main.js разбивает текст на слова для анимации —
       после подмены innerHTML восстанавливаем разбивку в новом языке */
    if (window.NERO_resplit && el.classList && el.classList.contains("split-reveal")) {
      window.NERO_resplit(el);
    }
  }
  function swapAttr(el, attr, dataEn, dataRu, en) {
    if (el.getAttribute(dataRu) === null) el.setAttribute(dataRu, el.getAttribute(attr) || "");
    el.setAttribute(attr, en ? el.getAttribute(dataEn) : el.getAttribute(dataRu));
  }

  function apply(lang) {
    var en = lang === "en";
    document.documentElement.setAttribute("lang", lang);

    var i, els;
    els = document.querySelectorAll("[data-en]");
    for (i = 0; i < els.length; i++) swapHTML(els[i], en);

    els = document.querySelectorAll("[data-en-ph]");
    for (i = 0; i < els.length; i++) swapAttr(els[i], "placeholder", "data-en-ph", "data-ru-ph", en);

    els = document.querySelectorAll("[data-en-aria]");
    for (i = 0; i < els.length; i++) swapAttr(els[i], "aria-label", "data-en-aria", "data-ru-aria", en);

    els = document.querySelectorAll("[data-en-content]");
    for (i = 0; i < els.length; i++) swapAttr(els[i], "content", "data-en-content", "data-ru-content", en);

    els = document.querySelectorAll("[data-en-alt]");
    for (i = 0; i < els.length; i++) swapAttr(els[i], "alt", "data-en-alt", "data-ru-alt", en);

    els = document.querySelectorAll("[data-en-title]");
    for (i = 0; i < els.length; i++) swapAttr(els[i], "title", "data-en-title", "data-ru-title", en);

    var sw = document.querySelectorAll(".lang-switch");
    for (i = 0; i < sw.length; i++) {
      var lbl = sw[i].querySelector(".lang-switch__label");
      if (lbl) lbl.textContent = en ? RU_LABEL : EN_LABEL;
      var code = sw[i].querySelector(".lang-switch__code");
      if (code) code.textContent = en ? "RU" : "EN";
      sw[i].setAttribute("aria-label", en ? RU_LABEL : EN_LABEL);
    }

    try { localStorage.setItem(KEY, lang); } catch (e) {}
  }

  function current() {
    try { return localStorage.getItem(KEY) === "en" ? "en" : "ru"; } catch (e) { return "ru"; }
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    var btn = t.closest ? t.closest(".lang-switch") : null;
    if (!btn) return;
    e.preventDefault();
    apply(current() === "en" ? "ru" : "en");
  });

  function boot() { apply(current()); }
  boot();
  /* повторно после DOMContentLoaded — ловим контент, добавленный поздно
     (например, cookie-баннер из cookie.js) для EN-пользователей */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);

  window.NERO_setLang = apply;
})();
