/* Los Artesanos Verdes — blog magazine enhancements
   - Reading progress bar (top of viewport)
   - Auto-generated sticky TOC (right side, desktop only)
   - Reveal-on-scroll (subtle fade-in for cards, headings, quotes)
*/
(function () {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    initProgressBar();
    initTOC();
    initReveal();
  }

  /* -------------------------------------------------- */
  /* Reading progress bar                               */
  /* -------------------------------------------------- */
  function initProgressBar() {
    var bar = document.createElement('div');
    bar.className = 'av-reading-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var article = document.querySelector('.av-content');

    function update() {
      if (!article) { bar.style.width = '0%'; return; }
      var rect = article.getBoundingClientRect();
      var vh = window.innerHeight;
      var scrolled = -rect.top;
      var total = rect.height - vh;
      var pct = total > 0 ? Math.max(0, Math.min(100, (scrolled / total) * 100)) : 0;
      bar.style.width = pct + '%';
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  /* -------------------------------------------------- */
  /* Auto-generated sticky TOC (article pages only)     */
  /* -------------------------------------------------- */
  function initTOC() {
    var content = document.querySelector('.av-content');
    if (!content) return;
    var headings = content.querySelectorAll('h2');
    if (headings.length < 3) return; // not worth a TOC for very short articles

    // Ensure every heading has an id
    headings.forEach(function (h, i) {
      if (!h.id) {
        var slug = (h.textContent || '')
          .toLowerCase()
          .normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        h.id = slug || ('seccion-' + i);
      }
    });

    // Build TOC DOM
    var toc = document.createElement('nav');
    toc.className = 'av-toc';
    toc.setAttribute('aria-label', 'Tabla de contenidos');

    var label = document.createElement('div');
    label.className = 'av-toc-label';
    label.textContent = 'En este artículo';
    toc.appendChild(label);

    var ol = document.createElement('ol');
    headings.forEach(function (h) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      a.dataset.target = h.id;
      li.appendChild(a);
      ol.appendChild(li);
    });
    toc.appendChild(ol);
    document.body.appendChild(toc);

    // Show TOC once user scrolls past the article header
    var revealAfter = 320;
    function checkReveal() {
      if (window.scrollY > revealAfter) {
        toc.classList.add('is-visible');
      } else {
        toc.classList.remove('is-visible');
      }
    }
    checkReveal();
    window.addEventListener('scroll', checkReveal, { passive: true });

    // Highlight current section via IntersectionObserver
    if (!('IntersectionObserver' in window)) return;
    var links = toc.querySelectorAll('a');
    var byId = {};
    links.forEach(function (a) { byId[a.dataset.target] = a; });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var link = byId[e.target.id];
        if (!link) return;
        if (e.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('is-active'); });
          link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-90px 0px -70% 0px', threshold: 0 });

    headings.forEach(function (h) { io.observe(h); });
  }

  /* -------------------------------------------------- */
  /* Reveal-on-scroll                                   */
  /* -------------------------------------------------- */
  function initReveal() {
    var selector = '.av-article-card, .av-content h2, .av-content figure, .av-content blockquote, .av-content .av-pullquote, .av-content .av-ornament, .av-cta-final, .av-case';
    var targets = document.querySelectorAll(selector);
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    targets.forEach(function (el) { el.classList.add('av-reveal'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    targets.forEach(function (el) { io.observe(el); });
  }
})();
