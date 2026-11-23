/* Cookie-уведомление NERO.
   Показывается один раз: после согласия запоминаем выбор в localStorage.
   Ссылка «Файлы cookie» в подвале (.footer__cookie) вызывает баннер снова.
   Подключается на всех страницах сайта (корень и /catalog/). */
(function () {
  "use strict";
  var KEY = "nero_cookie_consent";

  // ссылка на политику: со страниц каталога нужен переход на уровень выше
  var inSub = /\/catalog\//.test(location.pathname);
  var policy = (inSub ? "../" : "") + "privacy.html#cookie";

  var bar = null;

  function dismiss(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}   // "1" = принято, "0" = отклонено
    if (!bar) return;
    bar.classList.remove("is-show");
    var b = bar; bar = null;
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 650);
  }
  function accept() { dismiss("1"); }
  function decline() { dismiss("0"); }

  function build(delay) {
    if (bar) { bar.classList.add("is-show"); return; }   // уже на экране — просто показать
    bar = document.createElement("div");
    bar.className = "cookie";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-live", "polite");
    bar.setAttribute("aria-label", "Уведомление об использовании файлов cookie");
    bar.setAttribute("data-en-aria", "Cookie notice");
    bar.innerHTML =
      '<p class="cookie__text" data-en=\'We use cookies so the site and the embedded map work correctly. ' +
      'By continuing to browse, you agree to this. Learn more in the ' +
      '<a href="' + policy + '">Privacy&nbsp;Policy</a>.\'>' +
      'Мы&nbsp;используем файлы cookie для корректной работы сайта и&nbsp;встроенной карты. ' +
      'Продолжая пользоваться сайтом, вы&nbsp;соглашаетесь с&nbsp;этим. Подробнее&nbsp;— в&nbsp;' +
      '<a href="' + policy + '">Политике&nbsp;конфиденциальности</a>.</p>' +
      '<div class="cookie__actions">' +
      '<button type="button" class="cookie__btn cookie__btn--ghost cookie__decline" data-en="Decline">Отклонить</button>' +
      '<button type="button" class="cookie__btn cookie__accept" data-en="Accept">Принять</button>' +
      '</div>';
    document.body.appendChild(bar);
    bar.querySelector(".cookie__accept").addEventListener("click", accept);
    bar.querySelector(".cookie__decline").addEventListener("click", decline);

    // перевести только что добавленный баннер на текущий язык
    if (window.NERO_setLang) {
      var lang = "ru";
      try { if (localStorage.getItem("nero_lang") === "en") lang = "en"; } catch (e) {}
      window.NERO_setLang(lang);
    }

    setTimeout(function () {
      requestAnimationFrame(function () { if (bar) bar.classList.add("is-show"); });
    }, delay || 0);
  }

  // публичный вызов: показать баннер снова (из ссылки «Файлы cookie» в подвале)
  window.NERO_showCookie = function (e) {
    if (e && e.preventDefault) e.preventDefault();
    try { localStorage.removeItem(KEY); } catch (e2) {}
    build(0);
  };

  // делегированный клик по ссылке «Файлы cookie» в подвале
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest(".footer__cookie") : null;
    if (t) window.NERO_showCookie(e);
  });

  // авто-показ при первом заходе
  function autoinit() {
    var chosen = false;
    try { chosen = !!localStorage.getItem(KEY); } catch (e) {}   // принято ИЛИ отклонено — не показываем снова
    if (!chosen) build(700);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoinit);
  else autoinit();
})();
