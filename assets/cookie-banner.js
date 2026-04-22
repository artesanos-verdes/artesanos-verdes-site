/* ================================================================
   Cookie Consent Banner — Los Artesanos Verdes
   Uses Google Consent Mode v2. Defaults are set inline before this
   script loads (denied by default for EU compliance).
   ================================================================ */
(function () {
  var KEY = 'av_cookie_consent';
  var VERSION = '1';

  function readStored() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
    catch (e) { return null; }
  }
  function writeStored(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); }
    catch (e) { /* storage disabled — silently ignore */ }
  }

  function applyConsent(choice) {
    if (typeof window.gtag !== 'function') return;
    var granted = {
      ad_storage: choice.ads ? 'granted' : 'denied',
      analytics_storage: choice.analytics ? 'granted' : 'denied',
      ad_user_data: choice.ads ? 'granted' : 'denied',
      ad_personalization: choice.ads ? 'granted' : 'denied'
    };
    window.gtag('consent', 'update', granted);
  }

  function save(choice) {
    writeStored({ v: VERSION, analytics: !!choice.analytics, ads: !!choice.ads, ts: Date.now() });
    applyConsent(choice);
    close();
  }

  function renderBanner() {
    if (document.getElementById('av-cookie-banner')) return;
    var div = document.createElement('div');
    div.id = 'av-cookie-banner';
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-labelledby', 'av-cb-title');
    div.setAttribute('aria-describedby', 'av-cb-desc');
    div.innerHTML = [
      '<div class="av-cb-inner">',
      '  <div>',
      '    <h3 id="av-cb-title">Usamos cookies</h3>',
      '    <p id="av-cb-desc">Utilizamos cookies técnicas necesarias y, con tu consentimiento, cookies analíticas (Google Analytics) y publicitarias para mejorar nuestros servicios y medir la efectividad de nuestras campañas. Puedes aceptar, rechazar o configurar tus preferencias. Consulta nuestra <a href="/legal/politica-cookies/">política de cookies</a>.</p>',
      '  </div>',
      '  <div class="av-cb-buttons">',
      '    <button type="button" data-act="reject" class="av-cb-btn secondary">Rechazar todas</button>',
      '    <button type="button" data-act="configure" class="av-cb-btn secondary">Configurar</button>',
      '    <button type="button" data-act="accept" class="av-cb-btn primary">Aceptar todas</button>',
      '  </div>',
      '</div>'
    ].join('\n');
    document.body.appendChild(div);
    div.addEventListener('click', onClick);
  }

  function renderConfigure() {
    var stored = readStored() || { analytics: false, ads: false };
    var div = document.getElementById('av-cookie-banner');
    if (!div) return;
    div.querySelector('.av-cb-inner').innerHTML = [
      '<div>',
      '  <h3 id="av-cb-title">Configura tus preferencias</h3>',
      '  <p>Selecciona qué tipos de cookies aceptas. Las cookies técnicas son imprescindibles para el funcionamiento del sitio y no pueden desactivarse.</p>',
      '  <div class="av-cb-opts">',
      '    <label><input type="checkbox" checked disabled> <span>Cookies técnicas (necesarias, siempre activas)</span></label>',
      '    <label><input type="checkbox" id="av-cb-analytics"' + (stored.analytics ? ' checked' : '') + '> <span>Cookies analíticas (Google Analytics 4)</span></label>',
      '    <label><input type="checkbox" id="av-cb-ads"' + (stored.ads ? ' checked' : '') + '> <span>Cookies publicitarias (remarketing, pixels)</span></label>',
      '  </div>',
      '</div>',
      '<div class="av-cb-buttons">',
      '  <button type="button" data-act="save-custom" class="av-cb-btn primary">Guardar preferencias</button>',
      '</div>'
    ].join('\n');
  }

  function onClick(e) {
    var t = e.target;
    while (t && t !== document && !t.dataset.act) t = t.parentNode;
    if (!t || !t.dataset || !t.dataset.act) return;
    var act = t.dataset.act;
    if (act === 'accept') return save({ analytics: true, ads: true });
    if (act === 'reject') return save({ analytics: false, ads: false });
    if (act === 'configure') return renderConfigure();
    if (act === 'save-custom') {
      var a = document.getElementById('av-cb-analytics');
      var b = document.getElementById('av-cb-ads');
      return save({ analytics: !!(a && a.checked), ads: !!(b && b.checked) });
    }
  }

  function close() {
    var el = document.getElementById('av-cookie-banner');
    if (el) el.parentNode.removeChild(el);
  }

  function init() {
    var stored = readStored();
    if (!stored) {
      renderBanner();
    } else {
      // Re-apply stored consent on every page load so fresh-loaded gtag sees the right state.
      applyConsent(stored);
    }
  }

  // Expose a global reopener for the footer "Configurar cookies" link.
  window.avOpenCookieSettings = function () {
    close();
    renderBanner();
    renderConfigure();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
