/* Suivi d'audience commun à toutes les pages (accueil, services, hub, blog,
   pages légales, 404). Script classique chargé en defer, sans dépendance.
   Fournit :
   - window.avTrack(eventName, params) : envoi vers GA4 (gtag) et Meta (fbq) ;
   - window.avAttrib() : source de la visite, mémorisée pour la session ;
   - le suivi délégué des clics (téléphone, WhatsApp, e-mail, CTA) ;
   - scroll_depth, section_view et engaged_time (déplacés depuis site.js).
   Aucun élément de la page n'est supposé présent. */
(function () {
  'use strict';

  var PROD = location.hostname === 'artesanosverdes.com';

  // =====================================================
  // Type de page (paramètre page_type de chaque événement)
  // =====================================================
  var typeCache = null;
  function pageType() {
    if (typeCache) return typeCache;
    // Surcharge possible par la page : <html data-page-type="404">
    var force = document.documentElement.getAttribute('data-page-type');
    if (force) return (typeCache = force);
    var p = location.pathname.replace(/index\.html$/, '');
    if (/(^|\/)404(\.html)?$/.test(p) || /\b404\b/.test(document.title || '')) typeCache = '404';
    else if (p === '/') typeCache = 'home';
    else if (/^\/servicios\/?$/.test(p)) typeCache = 'servicios-hub';
    else if (/^\/servicios\/[^/]+\/?$/.test(p)) typeCache = 'servicio';
    else if (/^\/blog\/?$/.test(p)) typeCache = 'blog-index';
    else if (/^\/blog\/[^/]+\/?$/.test(p)) typeCache = 'blog-articulo';
    else if (/^\/legal\//.test(p)) typeCache = 'legal';
    else typeCache = '404';
    return typeCache;
  }

  // =====================================================
  // Envoi d'un événement (GA4 + Meta Pixel)
  // Les conversions Google Ads sont importées depuis GA4 (generate_lead,
  // contact_whatsapp, contact_phone) : pas d'appel 'conversion' dédié.
  // =====================================================
  var FB_EVENTS = {
    generate_lead: 'Lead',
    contact_phone: 'Contact',
    contact_email: 'Contact',
    contact_whatsapp: 'Contact',
    view_item: 'ViewContent'
  };

  function avTrack(eventName, params) {
    if (!eventName) return;
    var p = {};
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(function (k) { p[k] = params[k]; });
    }
    if (!p.page_type) p.page_type = pageType();

    if (!PROD && window.console && console.debug) console.debug('[avTrack]', eventName, p);

    try {
      if (typeof window.gtag === 'function') window.gtag('event', eventName, p);
    } catch (e) { /* le suivi ne doit jamais casser la page */ }

    try {
      if (typeof window.fbq === 'function') {
        var fb = FB_EVENTS[eventName];
        if (fb) window.fbq('track', fb, p);
        else window.fbq('trackCustom', eventName, p);
      }
    } catch (e) { /* idem */ }
  }

  // =====================================================
  // Attribution de la session (sessionStorage 'av_attrib')
  // Écrite à la première page vue de la session ; réécrite seulement si une
  // page arrive avec de nouveaux marqueurs de campagne (utm_*, gclid…).
  // =====================================================
  var CLE_ATTRIB = 'av_attrib';
  var attribMemoire = null;

  function hoteDe(url) {
    try { return url ? new URL(url).hostname.toLowerCase() : ''; } catch (e) { return ''; }
  }

  function calculerCanal(a, refHote) {
    var medium = (a.utm_medium || '').toLowerCase();
    var source = (a.utm_source || '').toLowerCase();
    if (a.gclid || a.gbraid || a.wbraid || /^(cpc|ppc|paid)$/.test(medium)) return 'cpc';
    if (source === 'gbp') return 'gbp';
    if (medium === 'social' ||
        /(^|\.)(facebook|instagram|linkedin|tiktok)\.[a-z.]+$/.test(refHote) ||
        refHote === 't.co' || refHote === 'x.com' || /\.x\.com$/.test(refHote)) return 'social';
    if (medium === 'email') return 'email';
    if (medium === 'organic' ||
        /(^|\.)(google|bing)\./.test(refHote) ||
        /(duckduckgo|ecosia|yahoo|yandex)\./.test(refHote)) return 'organic';
    if (refHote) return 'referral';
    return 'direct';
  }

  function calculerAttrib() {
    var q = null;
    try { q = new URLSearchParams(location.search); } catch (e) { /* très vieux navigateur */ }
    function param(k) {
      var v = q ? q.get(k) : null;
      return v ? String(v).slice(0, 150) : '';
    }
    var ref = document.referrer || '';
    var refHote = hoteDe(ref);
    // Le référent interne (même site) ne compte pas.
    if (refHote && refHote === location.hostname.toLowerCase()) { ref = ''; refHote = ''; }
    var a = {
      canal: '',
      utm_source: param('utm_source'),
      utm_medium: param('utm_medium'),
      utm_campaign: param('utm_campaign'),
      utm_term: param('utm_term'),
      utm_content: param('utm_content'),
      gclid: param('gclid'),
      gbraid: param('gbraid'),
      wbraid: param('wbraid'),
      referrer: ref.slice(0, 300),
      landing: (location.pathname + location.search).slice(0, 300),
      ts: new Date().toISOString()
    };
    a.canal = calculerCanal(a, refHote);
    return a;
  }

  function aMarqueursCampagne(a) {
    return !!(a.utm_source || a.utm_medium || a.utm_campaign || a.gclid || a.gbraid || a.wbraid);
  }

  function initAttrib() {
    var stockee = null;
    try { stockee = JSON.parse(sessionStorage.getItem(CLE_ATTRIB) || 'null'); } catch (e) { stockee = null; }
    var actuelle = calculerAttrib();
    if (!stockee || typeof stockee !== 'object' || !stockee.canal || aMarqueursCampagne(actuelle)) {
      attribMemoire = actuelle;
      try { sessionStorage.setItem(CLE_ATTRIB, JSON.stringify(actuelle)); } catch (e) { /* stockage indisponible */ }
    } else {
      attribMemoire = stockee;
    }
  }

  function avAttrib() {
    if (!attribMemoire) initAttrib();
    var copie = {};
    Object.keys(attribMemoire).forEach(function (k) { copie[k] = attribMemoire[k]; });
    return copie;
  }

  window.avTrack = avTrack;
  window.avAttrib = avAttrib;
  try { initAttrib(); } catch (e) { /* jamais bloquant */ }

  // =====================================================
  // Suivi délégué des clics : un seul écouteur sur document.
  // Un élément portant data-av-notrack est ignoré (ex. bouton WhatsApp du
  // panneau de remerciement, déjà compté par generate_lead).
  // =====================================================
  function emplacement(el) {
    var c = el.closest('[data-cta]');
    if (c && c.getAttribute('data-cta')) return c.getAttribute('data-cta');
    var z = el.closest('[data-zone]');
    if (z && z.getAttribute('data-zone')) return z.getAttribute('data-zone');
    var s = el.closest('section[id]');
    if (s && s.id) return s.id;
    return pageType();
  }

  function libelle(el) {
    var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!t) t = (el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
    return t.slice(0, 50);
  }

  document.addEventListener('click', function (e) {
    var cible = e.target;
    if (!cible || !cible.closest) cible = cible && cible.parentElement;
    if (!cible || !cible.closest) return;
    var el = cible.closest('a[href], [data-cta]');
    if (!el || el.closest('[data-av-notrack]')) return;

    var href = el.getAttribute('href') || '';
    var nom = null;
    var params = {};
    if (/^tel:/i.test(href)) { nom = 'contact_phone'; params.method = 'phone'; }
    else if (href.indexOf('wa.me') !== -1) { nom = 'contact_whatsapp'; params.method = 'whatsapp'; }
    else if (/^mailto:/i.test(href)) { nom = 'contact_email'; params.method = 'email'; }
    else if (el.hasAttribute('data-cta') || /#contacto$/.test(href)) { nom = 'cta_click'; }
    if (!nom) return;

    params.location = emplacement(el);
    params.cta_label = libelle(el);
    avTrack(nom, params);
  }, true);

  // =====================================================
  // Profondeur de défilement (25 %, 50 %, 75 %, 100 %)
  // =====================================================
  var paliersVus = {};
  function suivreDefilement() {
    var hauteur = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
    if (!hauteur) return;
    var pct = Math.round((window.scrollY + window.innerHeight) / hauteur * 100);
    [25, 50, 75, 100].forEach(function (palier) {
      if (pct >= palier && !paliersVus[palier]) {
        paliersVus[palier] = true;
        avTrack('scroll_depth', { percent_scrolled: palier });
      }
    });
    if (paliersVus[100]) window.removeEventListener('scroll', suivreDefilement);
  }
  window.addEventListener('scroll', suivreDefilement, { passive: true });

  // =====================================================
  // Sections réellement vues : la section traverse le milieu de l'écran.
  // (L'ancien seuil de 50 % de la section ne se déclenchait jamais pour les
  // sections plus hautes que deux écrans, ex. #contacto sur mobile.)
  // =====================================================
  if ('IntersectionObserver' in window) {
    var obsSections = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (en) {
        if (!en.isIntersecting) return;
        if (en.target.id) avTrack('section_view', { section_id: en.target.id });
        obsSections.unobserve(en.target);
      });
    }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });
    document.querySelectorAll('section[id]').forEach(function (s) { obsSections.observe(s); });
  }

  // =====================================================
  // Temps d'engagement (onglet visible) : 10 s, 30 s, 1 min, 2 min, 5 min
  // =====================================================
  var secondes = 0;
  var paliersTemps = [10, 30, 60, 120, 300];
  var prochain = 0;
  var minuterie = setInterval(function () {
    if (document.visibilityState !== 'visible') return;
    secondes++;
    if (secondes >= paliersTemps[prochain]) {
      avTrack('engaged_time', { seconds: paliersTemps[prochain] });
      prochain++;
      if (prochain >= paliersTemps.length) clearInterval(minuterie);
    }
  }, 1000);
})();
