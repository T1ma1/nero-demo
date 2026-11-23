/* ============================================================
   NERO — интерактив и анимации
   Lenis (плавный скролл) + GSAP/ScrollTrigger
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches || ("ontouchstart" in window);

  /* На телефоне адресная строка при прокрутке то прячется, то появляется — и каждый раз
     это событие resize. Пересчёты запускаем, только если изменилась ШИРИНА: иначе тяжёлый
     пересчёт раскладки случался прямо во время прокрутки и она дёргалась. */
  let lastW = window.innerWidth;
  const resizeJobs = [];
  const onResize = (fn) => resizeJobs.push(fn);
  window.addEventListener("resize", () => {
    if (coarse && window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    for (let i = 0; i < resizeJobs.length; i++) resizeJobs[i]();
  });
  const noGsap = typeof gsap === "undefined" || typeof ScrollTrigger === "undefined";

  /* Защита: если библиотеки анимаций не загрузились (нет интернета / CDN недоступен)
     или включён режим пониженной анимации — снимаем класс .js, чтобы весь
     контент стал видимым и не остался скрытым под reveal-анимации. */
  if (noGsap || reduceMotion) {
    document.documentElement.classList.remove("js");
  }

  /* ---------- ПРЕЛОАДЕР: «отрисовка» логотипа буква за буквой ---------- */
  const preloader = document.getElementById("preloader");
  const logoSvg = preloader.querySelector(".preloader__logo");
  const logoPath = logoSvg.querySelector("path");
  const line = preloader.querySelector(".preloader__line");

  /* ссылка с якорем (nerodecor.ru/#colorstudio): браузер прыгает к разделу сразу, а потом
     прелоадер и анимации меняют высоту страницы выше — и раздел уезжает. Доводим ещё раз,
     когда раскладка устоялась (если человек сам ещё не начал листать) */
  let userMoved = false;
  ["wheel", "touchstart", "keydown", "mousedown"].forEach((ev) => window.addEventListener(ev, () => { userMoved = true; }, { once: true, passive: true }));
  function jumpToHash() {
    if (userMoved || location.hash.length < 2) return;
    let target = null;
    try { target = document.querySelector(location.hash); } catch (e) { return; }
    if (!target) return;
    const off = target.classList.contains("section") ? 0 : -110;
    if (window.lenis) window.lenis.scrollTo(target, { offset: off, immediate: true, force: true });
    else window.scrollTo(0, Math.round(target.getBoundingClientRect().top + window.scrollY + off));
  }
  window.addEventListener("load", () => setTimeout(jumpToHash, 350));

  function startSite() {
    if (document.body.classList.contains("is-ready")) return;
    document.body.classList.add("is-ready");
    initHero();
    /* Тяжёлую инициализацию (разметка слов, ScrollTrigger'ы, лента) запускаем
       ПОСЛЕ прорисовки лого и в отдельном кадре — чтобы она не конкурировала
       с анимацией прелоадера за главный поток и не давала рывков. */
    requestAnimationFrame(() => { initScrollAnimations(); initMarquee(); requestAnimationFrame(jumpToHash); });
  }

  if (reduceMotion || typeof gsap === "undefined") {
    preloader.style.display = "none";
    startSite();
  } else {
    /* Составной путь логотипа (N-E-R-O = 9 несвязанных подконтуров) рисуем НЕ одним
       общим штрихом — иначе «перо» прыгает между буквами и кажется, будто анимация
       идёт паузами. Вместо этого разбиваем путь на подконтуры и прочерчиваем каждый
       отдельной обводкой с ПОСТОЯННОЙ скоростью пера, слева направо.
       Заливку же делаем по ИСХОДНОМУ цельному пути — чтобы внутренние контуры
       («дырки» в R и O) рендерились правильно по fill-rule. */
    const segments = logoPath.getAttribute("d").split(/(?=M)/).map((s) => s.trim()).filter(Boolean);
    const NS = "http://www.w3.org/2000/svg";
    const strokes = segments.map((seg) => {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", seg);
      p.style.fill = "none";                 // обводка без заливки — иначе дырки букв «зальются»
      logoSvg.appendChild(p);
      return p;
    });
    strokes.sort((a, b) => a.getBBox().x - b.getBBox().x);   // порядок прорисовки: слева направо

    gsap.set(logoPath, { fillOpacity: 0, strokeOpacity: 0 }); // исходный путь проявим заливкой в конце

    const SPEED = 560;       // единиц длины контура в секунду (постоянная скорость пера)
    const STAGGER = 0.085;   // лёгкое наложение прорисовки соседних букв
    const tl = gsap.timeline();

    let at = 0, drawEnd = 0;
    strokes.forEach((p) => {
      const len = p.getTotalLength();
      const dur = Math.max(0.32, len / SPEED);
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, strokeOpacity: 1 });
      tl.to(p, { strokeDashoffset: 0, duration: dur, ease: "power1.out" }, at);   // ease без «застывания» на старте
      drawEnd = Math.max(drawEnd, at + dur);
      at += STAGGER;
    });

    tl.to(logoPath, { fillOpacity: 1, duration: 0.5, ease: "power2.out" }, drawEnd - 0.12)  // проявляем заливку
      .to(strokes, { strokeOpacity: 0, duration: 0.4, ease: "power1.out" }, "<")            // гасим обводку
      .fromTo(line, { width: 0 }, { width: 90, duration: 0.6, ease: "power2.inOut" }, "-=0.45")
      .to(preloader, { opacity: 0, duration: 0.7, ease: "power2.inOut", delay: 0.2,
        onStart: startSite,
        onComplete: () => { preloader.classList.add("is-done"); preloader.style.display = "none"; }
      });
  }

  /* Предохранитель: если интро по любой причине не доиграет (ошибка анимации,
     сбой CDN), всё равно раскрываем сайт и убираем прелоадер — страница не зависнет. */
  setTimeout(function () {
    if (!document.body.classList.contains("is-ready")) startSite();
    if (preloader && preloader.style.display !== "none") {
      preloader.style.opacity = "0";
      setTimeout(function () { preloader.style.display = "none"; }, 400);
    }
  }, 4500);

  /* ---------- ПЛАВНЫЙ СКРОЛЛ (Lenis) ---------- */
  let lenis = null;
  if (typeof Lenis !== "undefined" && !reduceMotion && !coarse) {
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    window.lenis = lenis;   // глобальная ссылка (отладка/программный скролл)
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

    if (typeof ScrollTrigger !== "undefined") {
      lenis.on("scroll", ScrollTrigger.update);
    }
  }

  /* плавный переход по якорям */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id === "#" || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      /* для формы и не-секционных целей оставляем отступ под шапку */
      const off = target.classList.contains("section") ? 0 : -110;
      if (lenis) lenis.scrollTo(target, { offset: off, duration: 1.3 });
      else {
        /* без Lenis (телефон) ведём к НАЧАЛУ раздела с тем же отступом под шапку —
           scrollIntoView по центру утаскивал бы в середину длинной секции */
        const y = target.getBoundingClientRect().top + window.scrollY + off;
        window.scrollTo({ top: Math.round(y), behavior: "smooth" });
      }
    });
  });

  /* ---------- ХЕДЕР: фон при скролле + ПРОГРЕСС-БАР ---------- */
  const header = document.getElementById("header");
  const progress = document.getElementById("scrollProgress");
  /* Высоту документа меряем на загрузке и при смене размеров, а не в каждом событии
     прокрутки: чтение scrollHeight форсирует пересчёт раскладки и сбивает кадр. */
  let maxScroll = 1, scrollQueued = false, wasScrolled = null;
  const measureDoc = () => {
    const d = document.documentElement;
    maxScroll = Math.max(1, d.scrollHeight - d.clientHeight);
  };
  const paintScroll = () => {
    scrollQueued = false;
    const y = window.scrollY, on = y > 40;
    if (on !== wasScrolled) { header.classList.toggle("is-scrolled", on); wasScrolled = on; }
    if (progress) progress.style.setProperty("--sp", Math.min(1, y / maxScroll).toFixed(4));
  };
  const onScroll = () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(paintScroll); } };
  measureDoc(); paintScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("load", measureDoc);
  onResize(() => { measureDoc(); paintScroll(); });

  /* ---------- БУРГЕР-МЕНЮ ---------- */
  const burger = document.getElementById("burger");
  function closeMenu() {
    document.body.classList.remove("menu-open");
    burger.setAttribute("aria-expanded", "false");
  }
  burger.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  });
  /* закрытие меню по Esc */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) closeMenu();
  });

  /* ---------- HERO-анимация (запускается после прелоадера) ---------- */
  let heroReady = false;   // параллакс «NERO» включаем только ПОСЛЕ интро (иначе спор с GSAP за transform)
  function initHero() {
    if (reduceMotion || typeof gsap === "undefined") return;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".hero__title .line > span", { yPercent: 110, duration: 1.1, stagger: 0.12 }, 0)
      .fromTo(".hero__eyebrow", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8 }, 0.3)
      .fromTo(".hero__sub", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9 }, 0.6)
      .fromTo(".hero__actions", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9 }, 0.75)
      .fromTo(".hero__scroll", { opacity: 0 }, { opacity: 1, duration: 0.8 }, 1)
      .fromTo(".hero__ghost", { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 1.6, ease: "power2.out" }, 0.2)
      .fromTo(".hero__sidebar", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1 }, 0.9)
      .fromTo(".hero__corner", { opacity: 0 }, { opacity: 1, duration: 0.7, stagger: 0.08 }, 0.8);

    /* по завершении интро отдаём управление transform призрака параллаксу */
    tl.eventCallback("onComplete", () => {
      gsap.set(".hero__ghost", { clearProps: "transform" });
      heroReady = true;
    });

    /* лёгкий параллакс фона hero */
    if (typeof ScrollTrigger !== "undefined") {
      gsap.to(".hero__bg", {
        yPercent: 18, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
      });
    }
  }

  /* ---------- РЕВИЛЫ ПРИ СКРОЛЛЕ ---------- */
  /* Вызывается из startSite() — ПОСЛЕ прорисовки лого, чтобы разметка слов и
     регистрация ScrollTrigger'ов не тормозили анимацию прелоадера. */
  function initScrollAnimations() {
    if (reduceMotion || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);
    /* высота окна на телефоне «дышит» вместе с адресной строкой — без этого
       ScrollTrigger пересчитывал бы все триггеры прямо во время прокрутки */
    ScrollTrigger.config({ ignoreMobileResize: true });

    /* простое появление снизу */
    gsap.utils.toArray(".reveal-up").forEach((el) => {
      gsap.fromTo(el,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%" } }
      );
    });

    /* заголовки секций — КИНЕТИЧЕСКАЯ ТИПОГРАФИКА: пословное появление из-под маски
       (приём из Jitter / Typeface Animator) + прочерченная линия (SVGator-стиль) */
    const splitWords = (el) => {
      const out = [];
      Array.from(el.childNodes).forEach((node) => {
        if (node.nodeType === 3) {
          /* Схлопываем обычные пробелы/переносы строк из вёрстки и убираем по краям,
             иначе отступы HTML превращаются в лишний пробел перед первым словом
             (первая строка заголовка «съезжает» вправо). Неразрывные пробелы ( )
             НЕ трогаем — они держат слова вместе (напр. «NERO DECOR»). */
          const txt = node.textContent.replace(/[\t\n\r\f ]+/g, " ").replace(/^ | $/g, "");
          if (!txt) return;
          txt.split(/( +)/).forEach((part) => {
            if (part === "") return;
            if (/^ +$/.test(part)) { out.push(document.createTextNode(" ")); return; }
            const w = document.createElement("span"); w.className = "word";
            const inner = document.createElement("span"); inner.textContent = part;
            w.appendChild(inner); out.push(w);
          });
        } else if (node.nodeName === "BR") {
          out.push(document.createElement("br"));
        } else { out.push(node); }
      });
      el.innerHTML = ""; out.forEach((n) => el.appendChild(n));
    };

    gsap.utils.toArray(".split-reveal").forEach((el) => {
      splitWords(el);
      el.style.opacity = 1;
      gsap.from(el.querySelectorAll(".word > span"), {
        yPercent: 115, duration: 0.9, ease: "power3.out", stagger: 0.05,
        scrollTrigger: { trigger: el, start: "top 85%" }
      });
      /* линия-акцент «прочерчивается» под шапкой секции */
      const head = el.closest(".section__head");
      if (head && !head.querySelector(".head-rule")) {
        const rule = document.createElement("span");
        rule.className = "head-rule";
        head.appendChild(rule);
        gsap.fromTo(rule, { scaleX: 0 },
          { scaleX: 1, duration: 1.1, ease: "power3.inOut",
            scrollTrigger: { trigger: el, start: "top 85%" } });
      }
    });

    /* После смены языка i18n переписывает innerHTML заголовков (data-en) и
       стирает разбивку на слова. Этот хук пере-разбивает элемент в новом
       языке и сразу показывает слова (анимация-вход уже отыграла на загрузке). */
    window.NERO_resplit = function (el) {
      if (!el || !el.classList || !el.classList.contains("split-reveal")) return;
      splitWords(el);
      el.style.opacity = 1;
      gsap.set(el.querySelectorAll(".word > span"), { yPercent: 0, clearProps: "transform" });
    };

    /* факты «О нас» — каскад */
    gsap.from(".about__facts .fact", {
      opacity: 0, y: 34, duration: 0.9, stagger: 0.1, ease: "power3.out",
      scrollTrigger: { trigger: ".about__facts", start: "top 82%" }
    });

    /* карточки каталога — каскад; после завершения чистим transform,
       иначе остаточный inline-transform от GSAP перебьёт CSS-наклон карточек */
    gsap.from(".cat-card", {
      opacity: 0, y: 50, duration: 1, stagger: 0.12, ease: "power3.out",
      scrollTrigger: { trigger: ".catalog__grid", start: "top 80%" },
      onComplete: () => gsap.set(".cat-card", { clearProps: "transform" })
    });

    /* контакты — строки появляются каскадом */
    gsap.from(".contacts__info .info-row", {
      opacity: 0, y: 26, duration: 0.8, stagger: 0.1, ease: "power3.out",
      scrollTrigger: { trigger: ".contacts__info", start: "top 84%" }
    });

    /* карта — мягкое появление снизу */
    gsap.from(".contacts__map", {
      opacity: 0, y: 50, duration: 1.1, ease: "power3.out",
      scrollTrigger: { trigger: ".contacts__map", start: "top 88%" }
    });

    /* счётчики */
    gsap.utils.toArray(".count").forEach((el) => {
      const to = parseInt(el.dataset.to, 10);
      el.textContent = "0";          // старт с нуля только когда анимация включена;
                                     // без анимации в HTML остаётся реальное число (100, 5)
      const obj = { v: 0 };
      ScrollTrigger.create({
        trigger: el, start: "top 90%", once: true,
        onEnter: () => gsap.to(obj, {
          v: to, duration: 1.6, ease: "power2.out",
          onUpdate: () => { el.textContent = Math.round(obj.v); }
        })
      });
    });
  }

  /* ---------- ЛЕНТА РЕЗУЛЬТАТОВ ---------- */
  const rCards = Array.from(document.querySelectorAll(".r-card"));

  /* видео в карточке — играем при наведении (их две копии из-за дубля ленты) */
  document.querySelectorAll(".r-card video").forEach((v) => {
    const card = v.closest(".r-card");
    card.addEventListener("mouseenter", () => { v.play().catch(() => {}); });
    card.addEventListener("mouseleave", () => { v.pause(); v.currentTime = 0; });
  });

  /* ---------- ЕДИНЫЙ ПЛАВНЫЙ ЦИКЛ ЛЕНТЫ ----------
     Позиция ленты и масштаб карточек считаются в ОДНОМ кадре из одного источника —
     поэтому нет рассинхрона «компоновщик vs JS» и движение без рывков. */
  const track = document.querySelector(".results__track");
  const marquee = document.querySelector(".results__marquee");

  /* состояние паузы (наведение / лайтбокс / вне экрана) */
  let hoverPause = false, lightboxPause = false, inView = true;
  /* пауза ленты — ТОЛЬКО когда курсор на самой карточке (а не на пустом месте ленты).
     Срабатывает и когда карточка «подъезжает» под неподвижный курсор — лента замирает
     на карточке; ушёл с карточки (в зазор или за ленту) — поехала дальше. */
  rCards.forEach((card) => {
    card.addEventListener("mouseenter", () => { hoverPause = true; });
    card.addEventListener("mouseleave", () => { hoverPause = false; });
  });
  if (marquee) {
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((e) => {
        inView = e[0].isIntersecting;
        if (inView && window.NERO_marqueeWake) window.NERO_marqueeWake();
      }, { rootMargin: "200px" }).observe(marquee);
    }
  }

  function initMarquee() {
    if (!(track && rCards.length && !reduceMotion)) return;
    const MAX = 1.08, MIN = 0.84;        // масштаб центральной / боковых
    const ANGLE = 32, DEPTH = 50;        // поворот / глубина боковых (coverflow)
    let pos = 0, half = 0, last = 0;
    let cardW = 0, stride = 0, baseLeft = 0, SPEED = 85;   // SPEED задаётся в measure (мобилка медленнее)

    /* Геометрию читаем РЕДКО (старт + resize), а НЕ каждый кадр.
       Раньше в каждом кадре дёргался getBoundingClientRect по всем карточкам —
       это форсировало пересчёт layout 60 раз/с и давало рывки/«провисания» на телефоне. */
    const measure = () => {
      cardW = rCards[0].offsetWidth;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      stride = cardW + gap;                       // шаг одной карточки (ширины одинаковы)
      half = (rCards.length / 2) * stride;        // ширина одного набора — точный сдвиг для бесшовной петли
      baseLeft = marquee.getBoundingClientRect().left;
      pos = -half;
      SPEED = (window.innerWidth <= 600) ? 50 : 85;   // на телефоне — спокойнее
    };
    measure();
    onResize(measure);

    /* Карточки далеко за краем экрана держим в одном «боковом» состоянии и больше не трогаем:
       на телефоне в кадре видно от силы полторы карточки, а пересчёт всех двадцати четырёх
       каждый кадр как раз и давал провисания. */
    const SIDE = "perspective(1000px) translate3d(0,0," + (-DEPTH) + "px) rotateY(0deg) scale(" + MIN + ")";
    const parked = new Array(rCards.length).fill(false);
    let rafId = 0;

    const loop = (now) => {
      if (!inView) { rafId = 0; last = 0; return; }   /* вне экрана цикл не крутим вовсе */
      if (!last) last = now;
      const dt = Math.min((now - last) / 1000, 0.05); // ограничиваем скачок dt (вкладка была неактивна)
      last = now;

      if (!hoverPause && !lightboxPause && half > 0) {
        pos += SPEED * dt;
        if (pos >= 0) pos -= half;          // бесшовная петля (2 одинаковых набора)
      }
      track.style.transform = "translate3d(" + pos.toFixed(2) + "px,0,0)";

      /* coverflow: положение каждой карточки считаем МАТЕМАТИЧЕСКИ из pos — без чтения layout */
      {
        const vpC = window.innerWidth / 2;
        const halfW = cardW / 2;
        const reach = window.innerWidth + stride;      /* дальше этого карточку всё равно не видно */
        for (let i = 0; i < rCards.length; i++) {
          const centerX = baseLeft + pos + i * stride + halfW;
          if (Math.abs(centerX - vpC) > reach) {       /* за кадром — ставим боковое состояние один раз */
            if (!parked[i]) {
              const c = rCards[i];
              c.style.transform = SIDE; c.style.opacity = "0.34"; c.style.zIndex = "0";
              parked[i] = true;
            }
            continue;
          }
          parked[i] = false;
          /* знаковое расстояние центра карточки от центра экрана: -1 (слева) .. 0 (центр) .. 1 (справа) */
          let sd = (centerX - vpC) / vpC;
          if (sd > 1) sd = 1; else if (sd < -1) sd = -1;
          const ad = Math.abs(sd);
          const t = Math.pow(1 - ad, 1.4);              // близость к центру (1 в центре)
          const scale = MIN + (MAX - MIN) * t;
          const rotY = -sd * ANGLE;                     // боковые повёрнуты лицом к центру (coverflow)
          const tz = -ad * DEPTH;                       // боковые уходят вглубь — чистое перекрытие центром
          /* perspective() — в самом transform карточки (а не на контейнере),
             иначе ломается hit-test и клик по карточке не открывает лайтбокс */
          rCards[i].style.transform =
            "perspective(1000px) translate3d(0,0," + tz.toFixed(1) + "px) rotateY(" + rotY.toFixed(2) + "deg) scale(" + scale.toFixed(3) + ")";
          rCards[i].style.opacity = (0.34 + 0.66 * t).toFixed(3);
          rCards[i].style.zIndex = (t * 100) | 0;
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    /* лента снова в кадре — запускаем цикл заново */
    window.NERO_marqueeWake = () => { if (inView && !rafId) rafId = requestAnimationFrame(loop); };
  }

  /* ---------- ЛАЙТБОКС (просмотр на весь экран) ---------- */
  const lightbox = document.getElementById("lightbox");
  const lbContent = document.getElementById("lightboxContent");
  const lbClose = document.getElementById("lightboxClose");
  let lbLastFocused = null;                  // куда вернуть фокус после закрытия

  function openLightbox(card) {
    const img = card.querySelector("img");
    const vid = card.querySelector("video");
    lbContent.innerHTML = "";
    if (vid) {
      const v = document.createElement("video");
      v.src = vid.currentSrc || vid.src || vid.getAttribute("src");
      v.controls = true; v.autoplay = true; v.loop = true; v.playsInline = true; v.muted = true;
      lbContent.appendChild(v);
    } else if (img) {
      const im = document.createElement("img");
      im.alt = img.alt || "";
      im.decoding = "async";
      /* Окно открываем на уже загруженном мелком кадре из карточки — это мгновенно.
         Оригинал подставляем следом, когда он раскодирован в фоне: иначе распаковка
         снимка 3840×2560 занимала главный поток и открытие дёргалось. */
      const small = img.currentSrc || img.src;
      const full = img.dataset.full || small;
      im.src = small;
      lbContent.appendChild(im);
      if (full !== small) {
        const hi = new Image();
        hi.decoding = "async";
        hi.src = full;
        const swap = () => { if (im.isConnected) im.src = full; };
        if (hi.decode) hi.decode().then(swap).catch(() => {});
        else hi.onload = swap;
      }
    }
    lbLastFocused = document.activeElement;   // запоминаем активный элемент
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    lightboxPause = true;                    // лента стоит
    if (lenis) lenis.stop();
    /* фокус переносим в следующем кадре — иначе элемент ещё считается невидимым и focus() игнорируется */
    /* двойной rAF: ждём, пока модалка реально станет видимой и фокусируемой */
    if (lbClose) requestAnimationFrame(() => requestAnimationFrame(() => lbClose.focus()));
  }
  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxPause = false;
    if (lenis) lenis.start();
    setTimeout(() => { lbContent.innerHTML = ""; }, 400);   // остановить видео после анимации
    /* возвращаем фокус туда, откуда открыли лайтбокс */
    if (lbLastFocused && typeof lbLastFocused.focus === "function") lbLastFocused.focus();
    lbLastFocused = null;
  }

  /* ловушка фокуса: пока лайтбокс открыт, Tab не уходит за его пределы */
  if (lightbox) {
    lightbox.addEventListener("keydown", (e) => {
      if (e.key !== "Tab" || !lightbox.classList.contains("is-open")) return;
      const focusable = lightbox.querySelectorAll('button, a[href], video[controls], [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) { e.preventDefault(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* Открытие по клику: карточку под курсором определяем ГЕОМЕТРИЧЕСКИ (самую переднюю),
     а не через нативный hit-test — лента движется и карточки повёрнуты в 3D (rotateY),
     из-за чего обычный клик по элементу бывает неточным/промахивается. */
  const marqueeEl = marquee || document.querySelector(".results__marquee");
  if (marqueeEl) {
    marqueeEl.addEventListener("click", (e) => {
      let hit = null, hz = -Infinity;
      for (let i = 0; i < rCards.length; i++) {
        const r = rCards[i].getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          const z = parseInt(rCards[i].style.zIndex || "0", 10) || 0;
          if (z >= hz) { hz = z; hit = rCards[i]; }   // самая «передняя» под точкой
        }
      }
      if (hit) openLightbox(hit);
    });
  }
  /* открытие с клавиатуры — только для интерактивных карточек (набор 1, role="button") */
  rCards.forEach((card) => {
    if (card.getAttribute("role") === "button") {
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(card); }
      });
    }
  });
  if (lbClose) lbClose.addEventListener("click", closeLightbox);
  if (lightbox) lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && lightbox.classList.contains("is-open")) closeLightbox(); });

  /* ---------- 3D-НАКЛОН КАРТОЧЕК КАТАЛОГА (coverflow-вайб) ----------
     Карточка слегка поворачивается за курсором; только устройства с точным
     указателем (десктоп) и при разрешённой анимации. */
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (finePointer && !reduceMotion) {
    /* Геометрию карточек берём из LAYOUT (offsetLeft/offsetWidth) в координатах
       документа — она НЕ зависит от 3D-поворота, поэтому наклон не «дребезжит»
       (getBoundingClientRect менялся бы вместе с transform и сбивал расчёт). */
    const grid = document.querySelector(".catalog__grid");
    if (grid) {
      const cards = Array.from(grid.querySelectorAll(".cat-card"));
      let bases = [];
      const measure = () => {
        bases = cards.map((c) => {
          let x = 0, y = 0, el = c;
          while (el) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
          return { card: c, x: x, y: y, w: c.offsetWidth, h: c.offsetHeight };
        });
      };
      measure();
      window.addEventListener("resize", measure);
      window.addEventListener("load", measure);

      let current = null, leaveTimer = 0;
      const reset = (card) => {
        card.style.setProperty("--ry", "0deg");
        card.style.setProperty("--rx", "0deg");
        clearTimeout(leaveTimer);
        leaveTimer = setTimeout(() => card.classList.remove("is-tilting"), 280);
      };
      grid.addEventListener("pointermove", (e) => {
        const X = e.pageX, Y = e.pageY;          // координаты документа (с учётом скролла)
        let b = null;
        for (let i = 0; i < bases.length; i++) {
          const r = bases[i];
          if (X >= r.x && X <= r.x + r.w && Y >= r.y && Y <= r.y + r.h) { b = r; break; }
        }
        if (b && b.card !== current) {           // вошли в новую карточку
          if (current) reset(current);
          current = b.card; clearTimeout(leaveTimer);
          current.classList.add("is-tilting");
        }
        const cb = b || bases.find((r) => r.card === current);   // в зазоре держим текущую
        if (current && cb) {
          const px = (X - cb.x) / cb.w - 0.5;    // -0.5 .. 0.5
          const py = (Y - cb.y) / cb.h - 0.5;
          current.style.setProperty("--ry", (px * 9).toFixed(2) + "deg");    // лево/право
          current.style.setProperty("--rx", (-py * 7).toFixed(2) + "deg");   // верх/низ
        }
      });
      grid.addEventListener("pointerleave", () => { if (current) reset(current); current = null; });
    }

    /* ---------- ПАРАЛЛАКС «NERO» В HERO ---------- */
    const ghost = document.querySelector(".hero__ghost");
    const heroEl = document.querySelector(".hero");
    if (ghost && heroEl) {
      let tx = 0, ty = 0, cx = 0, cy = 0;   // цель / текущее (сглаживание)
      heroEl.addEventListener("pointermove", (e) => {
        const r = heroEl.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - 0.5;
        ty = (e.clientY - r.top) / r.height - 0.5;
      });
      heroEl.addEventListener("pointerleave", () => { tx = 0; ty = 0; });
      const ploop = () => {
        cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;   // плавный «догоняющий» лёрп
        if (heroReady) ghost.style.transform =
          "translate3d(" + (cx * 32).toFixed(1) + "px," + (cy * 24).toFixed(1) + "px,0)";
        requestAnimationFrame(ploop);
      };
      requestAnimationFrame(ploop);
    }
  }

  /* ---------- ФОРМА ЗАЯВКИ → WHATSAPP ---------- */
  /* Номер WhatsApp студии (только цифры, с кодом страны, без + и пробелов).
     Чтобы сменить — поменяйте значение ниже. */
  const WHATSAPP_NUMBER = "79654900687";

  const form = document.getElementById("leadForm");
  const note = document.getElementById("formNote");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const phone = form.phone.value.trim();
      const digits = phone.replace(/\D/g, "");

      const en = document.documentElement.getAttribute("lang") === "en";

      if (name.length < 2) { showNote("Пожалуйста, укажите имя", "Please enter your name", false); form.name.focus(); return; }
      if (digits.length < 10) { showNote("Проверьте номер телефона", "Please check the phone number", false); form.phone.focus(); return; }
      if (!form.consent.checked) {
        showNote("Подтвердите согласие на обработку персональных данных", "Please confirm consent to processing of personal data", false);
        const c = form.querySelector(".form__consent");
        if (c) c.classList.add("is-error");
        return;
      }

      /* собираем готовое сообщение и открываем WhatsApp */
      const text = en
        ? ("Hello! I'm from the NERO website — I'd like to request a consultation.\nName: " + name + "\nPhone: " + phone)
        : ("Здравствуйте! Я с сайта NERO — хочу оставить заявку на консультацию.\nИмя: " + name + "\nТелефон: " + phone);
      const url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(text);
      const waWin = window.open(url, "_blank");
      if (!waWin) {
        /* popup заблокирован (iOS Safari, встроенные браузеры, блокировщики):
           НЕ показываем ложный успех и НЕ сбрасываем форму — даём рабочую ссылку. */
        note.innerHTML = en
          ? 'Tap to open WhatsApp: <a href="' + url + '" target="_blank" rel="noopener">open the chat</a>'
          : 'Нажмите, чтобы открыть WhatsApp: <a href="' + url + '" target="_blank" rel="noopener">открыть чат</a>';
        note.classList.remove("is-ok"); note.classList.add("is-err", "is-show");
        return;
      }
      waWin.opener = null;   // не отдаём открытой вкладке доступ к window.opener

      showNote("Открываем WhatsApp — нажмите «Отправить» в чате.", "Opening WhatsApp — tap ‘Send’ in the chat.", true);
      form.reset();
    });
    /* снимаем подсветку ошибки, как только пользователь ставит галочку */
    if (form.consent) {
      form.consent.addEventListener("change", () => {
        if (form.consent.checked) {
          const c = form.querySelector(".form__consent");
          if (c) c.classList.remove("is-error");
        }
      });
    }
  }
  function showNote(ru, en, ok) {
    /* двуязычно: запоминаем оба варианта в data-атрибутах, чтобы i18n
       перевёл сообщение, если пользователь сменит язык после показа */
    note.setAttribute("data-ru", ru);
    note.setAttribute("data-en", en);
    note.textContent = document.documentElement.getAttribute("lang") === "en" ? en : ru;
    note.classList.toggle("is-ok", ok);     // цвет задаётся классами в CSS (--terra / --err)
    note.classList.toggle("is-err", !ok);
    note.classList.add("is-show");
  }

  /* ---------- ПРЕИМУЩЕСТВА: pinned scroll-сторителлинг (A3) ----------
     На десктопе секция «прилипает» (CSS sticky), а пункты сменяются по мере
     прокрутки. На мобайле / при reduced-motion класс .adv--pinned не ставится —
     показывается обычный читаемый список .adv-steps. */
  (function initAdvPin() {
    const sec = document.getElementById("advantages");
    if (!sec) return;
    const scrollEl = sec.querySelector(".adv-scroll");
    const steps = Array.from(sec.querySelectorAll(".adv-step"));
    const panel = sec.querySelector(".adv-panel");
    const numEl = document.getElementById("advNum");
    const titleEl = document.getElementById("advTitle");
    const textEl = document.getElementById("advText");
    const barEl = document.getElementById("advBar");
    if (!scrollEl || !steps.length || !panel) return;
    const N = steps.length;
    let cur = -1, swapT = 0;

    function setActive(i) {
      if (i === cur) return;
      cur = i;
      const s = steps[i];
      steps.forEach((x, k) => x.classList.toggle("on", k === i));
      clearTimeout(swapT);
      panel.classList.add("is-swapping");
      const apply = () => {
        numEl.textContent = s.querySelector(".adv-step__n").textContent;
        titleEl.innerHTML = s.querySelector(".adv-step__t").innerHTML;
        textEl.innerHTML = s.querySelector(".adv-step__d").innerHTML;
        panel.classList.remove("is-swapping");
      };
      /* меняем контент, когда он уже почти невидим (≈конец укороченного затухания),
         а не на середине — иначе подмена видна и кажется резкой */
      if (reduceMotion) apply(); else swapT = setTimeout(apply, 160);
    }
    setActive(0);

    /* pin включаем на любом экране с разрешённой анимацией и достаточной ВЫСОТОЙ
       (на низких/ландшафтных вьюпортах контент не влезает в pinned-сцену — там
       показываем обычный список с появлением пунктов) */
    const mq = window.matchMedia("(min-height: 560px)");
    let ticking = false, scrollH = scrollEl.offsetHeight;   /* высота сцены — из кэша, замеряем при setup/resize */
    function update() {
      if (!sec.classList.contains("adv--pinned")) return;
      const total = scrollH - window.innerHeight;
      const scrolled = Math.min(Math.max(-scrollEl.getBoundingClientRect().top, 0), Math.max(total, 1));
      const p = total > 0 ? scrolled / total : 0;
      if (barEl) barEl.style.transform = "scaleX(" + p.toFixed(4) + ")";
      setActive(Math.min(N - 1, Math.floor(p * N)));
    }
    function setup() {
      sec.classList.toggle("adv--pinned", mq.matches && !reduceMotion);
      scrollH = scrollEl.offsetHeight;
      if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();   // пересчитать триггеры под новую высоту
      update();
    }
    window.addEventListener("scroll", () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    }, { passive: true });
    onResize(setup);
    if (mq.addEventListener) mq.addEventListener("change", setup);
    setup();

    /* Появление пунктов при прокрутке — оживляет мобильную/фолбэк-раскладку.
       Скрытое состояние (.reveal) навешиваем ТОЛЬКО здесь, перед наблюдением —
       поэтому если до сюда не дошли (ошибка/старый кэш), пункты видны по умолчанию.
       На десктопе пункты sr-only, эффект там не виден — работает pinned-сцена. */
    if (!reduceMotion && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((ents) => {
        ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      steps.forEach((s) => { s.classList.add("reveal"); io.observe(s); });
      /* страховка: если по какой-то причине наблюдатель не сработал — показать всё */
      setTimeout(() => steps.forEach((s) => s.classList.add("in")), 2500);
    }

    /* ---------- КНОПКА «ПРОПУСТИТЬ»: выход из блока к следующему разделу ----------
       чтобы при повторном просмотре сайта не «зацикливаться» в шагах преимуществ */
    const skipBtn = document.getElementById("advSkip");
    if (skipBtn) skipBtn.addEventListener("click", () => {
      const nx = sec.nextElementSibling;
      const ny = nx ? (nx.getBoundingClientRect().top + window.scrollY)
                    : (scrollEl.getBoundingClientRect().top + window.scrollY + scrollEl.offsetHeight);
      if (window.lenis) window.lenis.scrollTo(ny, { duration: 0.8 });
      else window.scrollTo({ top: Math.round(ny), behavior: "smooth" });
    });

    /* ---------- ШАГОВЫЙ СКРОЛЛ НА ТАЧЕ: один свайп = один пункт ----------
       Пока секция «прилипла», свайп пролистывает РОВНО на один пункт (вне
       зависимости от силы), доводя до него через lenis.scrollTo. На границах
       (после 06 вниз / до 01 вверх) управление отдаётся обычной прокрутке.
       Десктоп (мышь) не трогаем — там осталась плавная прокрутка. */
    const isTouch = ("ontouchstart" in window) || window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) {
      const geom = () => {
        const total = Math.max(scrollH - window.innerHeight, 1);
        const top0 = scrollEl.getBoundingClientRect().top + window.scrollY;
        return { total: total, top0: top0 };
      };
      const anchorY = (i) => { const g = geom(); return g.top0 + ((i + 0.5) / N) * g.total; };
      const isPinned = () => {
        const r = scrollEl.getBoundingClientRect();
        return r.top <= 1 && r.bottom >= window.innerHeight - 1;
      };
      let cooldown = false, ty0 = 0, wasPinned = false, lastY = window.scrollY, dragPinned = false;
      const lockStep = (target, instant) => {
        cooldown = true;
        setTimeout(() => { cooldown = false; }, 430);
        /* нативный скролл: на тач-устройствах Lenis следует за нативным и не перебивает */
        window.scrollTo({ top: Math.round(target), behavior: instant ? "auto" : "smooth" });
      };
      /* Вход в зону «прилипания». Раньше здесь был мгновенный прыжок на крайний пункт —
         он гасил инерцию, но выглядел как рывок. Теперь ждём, пока прокрутка замрёт,
         и мягко доводим до ближайшего пункта: движение остаётся непрерывным. */
      let settleT = 0;
      window.addEventListener("scroll", () => {
        lastY = window.scrollY;
        const pinnedNow = isPinned();
        wasPinned = pinnedNow;
        if (!pinnedNow || cooldown || dragPinned) return;
        clearTimeout(settleT);
        settleT = setTimeout(() => {
          if (!isPinned() || cooldown || dragPinned) return;
          const g = geom();
          const p = Math.min(Math.max((window.scrollY - g.top0) / g.total, 0), 1);
          const i = Math.min(N - 1, Math.max(0, Math.round(p * N - 0.5)));
          const target = anchorY(i);
          if (Math.abs(target - window.scrollY) > 8) lockStep(target);
        }, 150);
      }, { passive: true });

      /* Пока секция «прилипла», страница под пальцем не едет — чтобы жест не выглядел
         зависанием, панель слегка тянется за пальцем и отпускает обратно при отрыве. */
      const panelEl = panel || sec;
      sec.addEventListener("touchstart", (e) => {
        ty0 = e.touches[0].clientY;
        dragPinned = isPinned();                      /* геометрию читаем один раз за жест */
        if (dragPinned) panelEl.style.transition = "none";
      }, { passive: true });
      sec.addEventListener("touchmove", (e) => {
        if (!dragPinned) return;
        e.preventDefault();
        const dy = e.touches[0].clientY - ty0;
        panelEl.style.transform = "translate3d(0," + (Math.max(-22, Math.min(22, dy * 0.18))).toFixed(1) + "px,0)";
      }, { passive: false });
      let relT = 0;
      const release = () => {                          /* панель возвращается на место плавно, а не скачком */
        dragPinned = false;
        panelEl.style.transition = "transform .3s cubic-bezier(.22,1,.36,1)";
        panelEl.style.transform = "";
        clearTimeout(relT);
        relT = setTimeout(() => { panelEl.style.transition = ""; }, 320);
      };
      sec.addEventListener("touchcancel", release, { passive: true });
      sec.addEventListener("touchend", (e) => {
        const wasDrag = dragPinned;
        release();
        if (!wasDrag || cooldown) return;
        const dy = e.changedTouches[0].clientY - ty0;
        if (Math.abs(dy) < 24) return;             // слишком короткий жест — не свайп
        const dir = dy < 0 ? 1 : -1;               // палец вверх → следующий пункт
        const next = cur + dir;
        const g = geom();
        if (next >= 0 && next < N) {
          lockStep(anchorY(next));
        } else if (next >= N) {
          /* после 06 — сразу к следующему разделу, без «мёртвого» докрута хвоста пина */
          const nx = sec.nextElementSibling;
          lockStep(nx ? (nx.getBoundingClientRect().top + window.scrollY) : (g.top0 + g.total + 4));
        } else {
          /* до 01 — выходим вверх за пределы пина (к предыдущему разделу) */
          lockStep(g.top0 - window.innerHeight + 4);
        }
      }, { passive: true });
    }
  })();

  /* ---------- ОТЗЫВЫ: колода карточек (B2) ----------
     Верхнюю карточку можно перетащить/смахнуть или листать кнопкой «Следующий».
     При reduced-motion оставляем обычную читаемую сетку (без .is-deck). */
  (function initReviewDeck() {
    const deck = document.getElementById("reviewDeck");
    if (!deck || reduceMotion) return;
    const stack = deck.querySelector(".review-deck__stack");
    const cards = stack ? Array.from(stack.querySelectorAll(".deck-card")) : [];
    if (cards.length < 2) return;
    deck.classList.add("is-deck");

    const dotsWrap = document.getElementById("deckDots");
    cards.forEach((_, i) => { const d = document.createElement("span"); if (!i) d.className = "on"; dotsWrap.appendChild(d); });
    const dots = Array.from(dotsWrap.querySelectorAll("span"));
    let order = cards.map((_, i) => i);

    function layout() {
      order.forEach((ci, pos) => {
        const c = cards[ci];
        if (c.classList.contains("flying")) return;   // улетающую не трогаем — у неё своя анимация
        c.style.zIndex = String(20 - pos);
        c.style.opacity = pos > 2 ? "0" : "1";
        c.style.pointerEvents = pos === 0 ? "auto" : "none";
        c.setAttribute("aria-hidden", pos === 0 ? "false" : "true");
        if (!c.classList.contains("dragging"))
          c.style.transform = "translateY(" + (pos * 16) + "px) scale(" + (1 - pos * 0.045).toFixed(3) + ") rotate(" + (pos ? (pos % 2 ? 1.5 : -1.5) : 0) + "deg)";
      });
      dots.forEach((d, k) => d.classList.toggle("on", k === order[0]));
    }
    function cycle(dir) {
      const s = dir < 0 ? -1 : 1;                     // сторона ухода
      const flying = cards[order[0]];
      flying.classList.remove("dragging");
      flying.classList.add("flying");                 // layout() её пропускает
      flying.style.zIndex = "60";
      /* деликатный свайп: мягко, с лёгким наклоном уезжает вбок и плавно тает */
      flying.style.transition = "transform .66s cubic-bezier(0.34, 0, 0.2, 1), opacity .55s ease";
      flying.style.transform = "translateX(" + (s * 680) + "px) rotate(" + (s * 10) + "deg)";
      flying.style.opacity = "0";
      /* новый отзыв выходит вперёд СРАЗУ и с обычной скоростью (перестановка стопки) */
      order.push(order.shift());
      layout();
      setTimeout(() => {
        flying.classList.remove("flying");
        flying.style.transition = "";                 // вернуть обычный переход стопки
        flying.style.zIndex = "";
        layout();                                     // поставить в конец стопки (невидимой)
      }, 680);
    }
    /* Перетаскивание верхней карточки. Слушатели move/up — на window, чтобы
       отпускание срабатывало ВСЕГДА (даже если курсор ушёл с карточки) — иначе
       при неполном/вертикальном перетягивании карточка «залипала». */
    let drag = null, sx = 0, sy = 0, dx = 0, dy = 0;
    const onMove = (e) => {
      if (!drag) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      /* по горизонтали следуем полностью (это свайп), по вертикали — мягко (заякорено) */
      drag.style.transform = "translate(" + dx.toFixed(0) + "px," + (dy * 0.32).toFixed(0) + "px) rotate(" + (dx * 0.045).toFixed(2) + "deg)";
    };
    const onUp = () => {
      if (!drag) return;
      const card = drag; drag = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (Math.abs(dx) > 110) cycle(dx > 0 ? 1 : -1);   // достаточно вбок → уходит
      else { card.classList.remove("dragging"); layout(); }   // иначе — чистый снап обратно
      dx = dy = 0;
    };
    cards.forEach((c) => {
      c.addEventListener("pointerdown", (e) => {
        if (drag || cards[order[0]] !== c) return;
        drag = c; sx = e.clientX; sy = e.clientY; dx = dy = 0;
        c.classList.add("dragging");
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
      });
    });
    const nextBtn = document.getElementById("deckNext");
    if (nextBtn) nextBtn.addEventListener("click", () => cycle(-1));
    dots.forEach((d, k) => d.addEventListener("click", () => {
      let guard = 0; while (order[0] !== k && guard++ < 12) order.push(order.shift());
      layout();
    }));
    layout();
  })();

  /* ---------- КАРТА: «заморожена», оживает по клику ---------- */
  (() => {
    const map = document.querySelector(".contacts__map");
    if (!map) return;
    const shield = map.querySelector(".contacts__map-shield");
    if (!shield) return;
    shield.addEventListener("click", () => map.classList.add("is-active"));
    /* десктоп: курсор ушёл с карты → снова «замораживаем»,
       чтобы дальнейший скролл страницы не перехватывался картой */
    if (window.matchMedia("(hover: hover)").matches) {
      map.addEventListener("mouseleave", () => map.classList.remove("is-active"));
    }
  })();

});
