/* Los Artesanos Verdes — blog (index, articles, pages légales)
   - Barre de progression de lecture (articles)
   - Sommaire fixe auto-généré (desktop large), masqué près du pied de page (audit #30)
   - Apparition au défilement (cartes, titres, citations)
   - Filtres par catégorie sur /blog/ (puces <button aria-pressed>, synchro #cat-…)
   - Indice de défilement des tableaux (.av-table-scroll)

   Défensif : chaque module est isolé (try/catch) et tolère l'absence de
   n'importe quel élément. Aucun suivi analytics ici : tracking.js s'en
   charge (clics tel:, wa.me, mailto:, [data-cta]).
*/
(function () {
  'use strict';

  var hasIO = 'IntersectionObserver' in window;

  function init() {
    run(initProgressBar);
    run(initTOC);
    run(initFilters);
    run(initTableScroll);
    run(initReveal);
  }

  function run(fn) {
    try { fn(); } catch (e) {
      if (window.console && location.hostname !== 'artesanosverdes.com') {
        console.warn('[blog.js] ' + (fn.name || 'module') + ':', e);
      }
    }
  }

  /* -------------------------------------------------- */
  /* Reading progress bar (article pages only)          */
  /* -------------------------------------------------- */
  function initProgressBar() {
    var article = document.querySelector('.av-content');
    if (!article || !document.body) return;

    var bar = document.createElement('div');
    bar.className = 'av-reading-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var ticking = false;
    function update() {
      ticking = false;
      var rect = article.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var pct = total > 0 ? Math.max(0, Math.min(100, (-rect.top / total) * 100)) : 0;
      bar.style.width = pct + '%';
    }
    function onScroll() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  /* -------------------------------------------------- */
  /* Auto-generated sticky TOC (article pages only)     */
  /* -------------------------------------------------- */
  function initTOC() {
    var content = document.querySelector('.av-content');
    if (!content || !document.body) return;

    // Sections de l'article seulement : pas le titre du CTA final ni « Sigue leyendo ».
    var headings = Array.prototype.filter.call(content.querySelectorAll('h2'), function (h) {
      return !h.closest('.av-cta-final, .av-related, .av-article-footer');
    });
    if (headings.length < 3) return; // not worth a TOC for very short articles

    // Ensure every heading has an id
    headings.forEach(function (h, i) {
      if (!h.id) {
        var slug = (h.textContent || '')
          .toLowerCase()
          .normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        if (!slug || document.getElementById(slug)) slug = 'seccion-' + (i + 1);
        h.id = slug;
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
      a.setAttribute('data-target', h.id);
      li.appendChild(a);
      ol.appendChild(li);
    });
    toc.appendChild(ol);
    document.body.appendChild(toc);

    // Show TOC once user scrolls past the article header
    var revealAfter = 320;
    function checkReveal() {
      toc.classList.toggle('is-visible', window.scrollY > revealAfter);
    }
    checkReveal();
    window.addEventListener('scroll', checkReveal, { passive: true });

    if (!hasIO) return;

    // Audit #30 : masquer le sommaire dès que le pied de page (ou le bloc
    // « Sigue leyendo ») entre dans la fenêtre, pour qu'il ne le recouvre pas.
    var stoppers = document.querySelectorAll('.av-footer, .av-related');
    if (stoppers.length) {
      var visibleStoppers = 0;
      var seen = [];
      var footerIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var idx = seen.indexOf(e.target);
          if (e.isIntersecting && idx === -1) { seen.push(e.target); }
          if (!e.isIntersecting && idx !== -1) { seen.splice(idx, 1); }
        });
        visibleStoppers = seen.length;
        toc.classList.toggle('is-near-footer', visibleStoppers > 0);
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
      Array.prototype.forEach.call(stoppers, function (el) { footerIO.observe(el); });
    }

    // Highlight current section via IntersectionObserver
    var links = toc.querySelectorAll('a');
    var byId = {};
    Array.prototype.forEach.call(links, function (a) { byId[a.getAttribute('data-target')] = a; });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var link = byId[e.target.id];
        if (!link || !e.isIntersecting) return;
        Array.prototype.forEach.call(links, function (l) {
          l.classList.remove('is-active');
          l.removeAttribute('aria-current');
        });
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-90px 0px -70% 0px', threshold: 0 });

    headings.forEach(function (h) { io.observe(h); });
  }

  /* -------------------------------------------------- */
  /* Category filters on /blog/ (§10.7)                 */
  /* <div class="av-blog-filters"> > button.av-filter-chip[data-filter]  */
  /* cards: a.av-article-card[data-cat]; hash: #cat-<slug>               */
  /* -------------------------------------------------- */
  function initFilters() {
    var bar = document.querySelector('.av-blog-filters');
    var grid = document.querySelector('.av-articles-grid');
    if (!bar || !grid) return;

    var chips = bar.querySelectorAll('.av-filter-chip[data-filter]');
    var cards = grid.querySelectorAll('.av-article-card[data-cat]');
    if (!chips.length || !cards.length) return;

    var status = document.querySelector('.av-filter-status');
    var ALL = 'todas';

    // Compteurs calculés à partir des cartes (restent justes si on en ajoute).
    var counts = {};
    counts[ALL] = cards.length;
    Array.prototype.forEach.call(cards, function (c) {
      var cat = c.getAttribute('data-cat');
      counts[cat] = (counts[cat] || 0) + 1;
    });

    var labels = {};
    Array.prototype.forEach.call(chips, function (chip) {
      var f = chip.getAttribute('data-filter');
      var labelEl = chip.querySelector('.av-filter-label');
      labels[f] = (labelEl ? labelEl.textContent : chip.textContent).trim();
      var countEl = chip.querySelector('.av-filter-count');
      if (countEl) countEl.textContent = String(counts[f] || 0);
      chip.addEventListener('click', function () {
        apply(f, true);
      });
    });

    function known(f) { return f === ALL || Object.prototype.hasOwnProperty.call(counts, f) && hasChip(f); }
    function hasChip(f) {
      return Array.prototype.some.call(chips, function (c) { return c.getAttribute('data-filter') === f; });
    }

    function fromHash() {
      var h = (location.hash || '').replace(/^#/, '');
      if (h.indexOf('cat-') !== 0) return ALL;
      var f = '';
      try { f = decodeURIComponent(h.slice(4)); } catch (e) { f = h.slice(4); }
      return known(f) ? f : ALL;
    }

    var current = null;

    function apply(filter, fromUser) {
      if (!known(filter)) filter = ALL;
      current = filter;

      Array.prototype.forEach.call(chips, function (chip) {
        chip.setAttribute('aria-pressed', chip.getAttribute('data-filter') === filter ? 'true' : 'false');
      });

      var shown = 0;
      Array.prototype.forEach.call(cards, function (card) {
        var match = filter === ALL || card.getAttribute('data-cat') === filter;
        card.hidden = !match;
        if (match) shown++;
      });

      if (status) {
        status.textContent = filter === ALL
          ? ''
          : shown + (shown === 1 ? ' guía' : ' guías') + ' en «' + labels[filter] + '»';
      }

      if (fromUser) {
        // Synchronise l'URL sans ajouter d'entrée d'historique ni faire défiler.
        var url = location.pathname + location.search + (filter === ALL ? '' : '#cat-' + filter);
        try { history.replaceState(history.state, '', url); } catch (e) {
          if (filter !== ALL) location.hash = 'cat-' + filter;
        }
      }
    }

    apply(fromHash(), false);

    window.addEventListener('hashchange', function () {
      var f = fromHash();
      if (f !== current) apply(f, false);
    });
  }

  /* -------------------------------------------------- */
  /* Table scroll hint (§10.10)                         */
  /* -------------------------------------------------- */
  function initTableScroll() {
    var boxes = document.querySelectorAll('.av-table-scroll');
    if (!boxes.length) return;

    function update(box) {
      var overflowing = box.scrollWidth - box.clientWidth > 2;
      box.classList.toggle('is-overflowing', overflowing);
      box.classList.toggle('is-end', !overflowing || box.scrollLeft + box.clientWidth >= box.scrollWidth - 2);
    }

    Array.prototype.forEach.call(boxes, function (box) {
      update(box);
      box.addEventListener('scroll', function () { update(box); }, { passive: true });
    });

    var t = null;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () { Array.prototype.forEach.call(boxes, update); }, 150);
    });
  }

  /* -------------------------------------------------- */
  /* Reveal-on-scroll                                   */
  /* -------------------------------------------------- */
  function initReveal() {
    var selector = '.av-article-card, .av-content h2, .av-content figure, .av-content blockquote, .av-content .av-pullquote, .av-content .av-ornament, .av-cta-final, .av-case';
    var targets = document.querySelectorAll(selector);
    if (!targets.length) return;

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!hasIO || reduce) return; // contenu visible tel quel

    Array.prototype.forEach.call(targets, function (el) { el.classList.add('av-reveal'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  }

  // Lancement en dernier : toutes les variables du module sont initialisées
  // (avec defer, readyState vaut déjà « interactive » à l'exécution).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
