  // =====================================================
  // Mobile menu
  // =====================================================
  const burger = document.getElementById('burger');
  const navLinks = document.getElementById('navLinks');
  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    burger.classList.remove('open');
    navLinks.classList.remove('open');
  }));

  // =====================================================
  // Scroll reveal
  // =====================================================
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  window.addEventListener('load', () => {
    document.querySelectorAll('.hero .reveal').forEach(el => el.classList.add('in'));
  });

  // =====================================================
  // EVENT TRACKING HELPERS
  // Works with Google Analytics 4 (gtag) and Meta Pixel (fbq)
  // =====================================================
  function track(eventName, params = {}) {
    // Log for debugging (remove in prod if you want)
    console.log('[track]', eventName, params);

    // Google Analytics 4
    if (typeof gtag === 'function') {
      gtag('event', eventName, params);
    }

    // Meta Pixel
    if (typeof fbq === 'function') {
      const fbEventMap = {
        'generate_lead': 'Lead',
        'contact_phone': 'Contact',
        'contact_email': 'Contact',
        'contact_whatsapp': 'Contact',
        'view_item': 'ViewContent'
      };
      const fbEvent = fbEventMap[eventName];
      if (fbEvent) fbq('track', fbEvent, params);
      else fbq('trackCustom', eventName, params);
    }

    // Google Ads conversions are imported from GA4 (generate_lead,
    // contact_whatsapp, contact_phone), so no dedicated gtag('event','conversion',...)
    // call is needed here — the gtag('event', eventName, ...) above flows to both
    // GA4 and Google Ads via the AW-3024885050 config in <head>.
  }

  // =====================================================
  // Track CONTACT CLICKS (phone, email, WhatsApp)
  // =====================================================
  document.querySelectorAll('a[href^="tel:"]').forEach(a => {
    a.addEventListener('click', () => {
      track('contact_phone', { method: 'phone', location: a.closest('section, nav, .topbar')?.id || 'unknown' });
    });
  });

  document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
    a.addEventListener('click', () => {
      track('contact_email', { method: 'email' });
    });
  });

  document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
    a.addEventListener('click', () => {
      track('contact_whatsapp', { method: 'whatsapp' });
    });
  });

  // =====================================================
  // Track CTA CLICKS (all internal navigation buttons to #contacto)
  // =====================================================
  document.querySelectorAll('a[href="#contacto"]').forEach(a => {
    a.addEventListener('click', () => {
      track('cta_click', {
        cta_label: a.textContent.trim().substring(0, 50),
        cta_location: a.closest('section, nav')?.id || 'unknown'
      });
    });
  });

  // =====================================================
  // Track SCROLL DEPTH (25%, 50%, 75%, 100%)
  // =====================================================
  const scrollTracked = new Set();
  window.addEventListener('scroll', () => {
    const scrollPct = Math.round((window.scrollY + window.innerHeight) / document.body.scrollHeight * 100);
    [25, 50, 75, 100].forEach(threshold => {
      if (scrollPct >= threshold && !scrollTracked.has(threshold)) {
        scrollTracked.add(threshold);
        track('scroll_depth', { percent_scrolled: threshold });
      }
    });
  }, { passive: true });

  // =====================================================
  // Track SECTION VIEWS (when user actually sees a section)
  // =====================================================
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id;
        if (id) track('section_view', { section_id: id });
        sectionObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('section[id]').forEach(s => sectionObserver.observe(s));

  // =====================================================
  // LEAD FORM SUBMISSION
  // - Saves lead to Firestore
  // - Tracks as "generate_lead" (GA4 conversion event)
  // - Shows success toast
  // - Fallback to mailto if Firebase fails
  // =====================================================

  function showToast(title, msg, isError = false) {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMsg = document.getElementById('toastMsg');
    toastTitle.textContent = title;
    toastMsg.textContent = msg;
    toast.classList.toggle('error', isError);
    // Update icon for error
    const iconSvg = toast.querySelector('.toast-icon svg');
    if (isError) {
      iconSvg.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
    } else {
      iconSvg.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
    }
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 6500);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const d = new FormData(form);

    const leadData = {
      nombre: d.get('nombre')?.trim() || '',
      telefono: d.get('telefono')?.trim() || '',
      email: d.get('email')?.trim() || '',
      provincia: d.get('provincia')?.trim() || '',
      tipo: d.get('tipo') || '',
      ano: d.get('ano') || '',
      calefaccion: d.get('calefaccion') || '',
      mensaje: d.get('mensaje')?.trim() || '',
      proyecto: d.get('proyecto') || '',
      // Preuve de consentement RGPD : sans horodatage ni version de la
      // politique, la case cochee n'est opposable a personne.
      consentPrivacy: d.get('consent_privacy') === 'on',
      consentAt: new Date().toISOString(),
      consentPolicy: '/legal/politica-privacidad/',
      source: 'website_form',
      url: window.location.href,
      userAgent: navigator.userAgent.substring(0, 200),
      language: navigator.language || 'es-ES'
    };

    // UI loading state
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    // Track GA4 conversion
    track('generate_lead', {
      form_location: 'contact_form',
      provincia: leadData.provincia,
      tipo_vivienda: leadData.tipo,
      ano_construccion: leadData.ano,
      calefaccion: leadData.calefaccion,
      proyecto: leadData.proyecto,
      value: 1,
      currency: 'EUR'
    });

    // Save to Firestore
    const saveToFirestore = async () => {
      if (!window.__firestore) throw new Error('Firebase not loaded');
      const { db, collection, addDoc, serverTimestamp } = window.__firestore;
      const docRef = await addDoc(collection(db, 'leads'), {
        ...leadData,
        timestamp: serverTimestamp(),
        status: 'new'
      });
      return docRef.id;
    };

    try {
      // Wait up to 10s for Firebase to be ready
      if (!window.__firestore) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Firebase load timeout')), 10000);
          window.addEventListener('firebase-ready', () => {
            clearTimeout(timeout);
            resolve();
          }, { once: true });
        });
      }

      const leadId = await saveToFirestore();
      console.log('[lead saved]', leadId);
    // ========================================
    // Déclencher les emails automatiques (Resend)
    // ========================================
    try {
      const { db: _emDb, collection: _emCol, addDoc: _emAdd } = window.__firestore;

      // Les gabarits d'e-mail recevaient les valeurs brutes des <select>
      // ("unifamiliar", "gasoleo"...) et les affichaient telles quelles au
      // client. On envoie desormais des libelles lisibles. Une valeur absente
      // devient une chaine vide : le gabarit peut alors masquer la ligne
      // entiere avec {{#if}} au lieu d'afficher un tiret orphelin.
      const LIBELLES = {
        tipo: {
          unifamiliar: 'Vivienda unifamiliar',
          piso: 'Piso',
          comunidad: 'Comunidad de propietarios',
          terciario: 'Edificio terciario',
          otro: 'Otro tipo'
        },
        proyecto: {
          desvan: 'Aislamiento de desván',
          'cubierta-inclinada': 'Aislamiento de cubierta inclinada',
          aerotermia: 'Aerotermia (bomba de calor)',
          'aire-aire': 'Bomba de calor aire-aire',
          'no-se': 'Por definir'
        },
        calefaccion: {
          gas: 'Gas (natural o propano)',
          gasoleo: 'Gasóleo',
          electrica: 'Eléctrica',
          otra: 'Otra'
        },
        ano: {
          'antes-2000': 'Antes de 2006',
          'despues-2000': 'Después de 2006',
          'no-se': 'No lo sé'
        }
      };
      const libelle = (champ, valeur) => valeur ? (LIBELLES[champ][valeur] || valeur) : '';

      const emailData = {
        nombre: (leadData.nombre || 'Cliente').split(' ')[0],
        telefono: leadData.telefono || '—',
        telefonoClean: (leadData.telefono || '').replace(/[^0-9]/g, ''),
        email: leadData.email || '',
        provincia: leadData.provincia || '',
        tipo: libelle('tipo', leadData.tipo),
        ano: libelle('ano', leadData.ano),
        calefaccion: libelle('calefaccion', leadData.calefaccion),
        proyecto: libelle('proyecto', leadData.proyecto),
        mensaje: leadData.mensaje || '',
        source: leadData.source || 'website_form',
        timestamp: new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid' }),
        // Indicateurs booleens : permettent au gabarit Handlebars de
        // personnaliser la reponse selon le service demande, sans avoir a
        // maintenir un document distinct par service.
        esDesvan: leadData.proyecto === 'desvan',
        esCubierta: leadData.proyecto === 'cubierta-inclinada',
        esAerotermia: leadData.proyecto === 'aerotermia',
        esAireAire: leadData.proyecto === 'aire-aire',
        esSinDefinir: !leadData.proyecto || leadData.proyecto === 'no-se',
        // Cas non eligible : chauffage electrique sur une demande de pompe a
        // chaleur. Les DEUX pompes sont concernees — aerotermia et aire-aire
        // exigent identiquement un chauffage fossile au depart.
        // Le gabarit doit alors temperer les attentes plutot que promettre.
        noElegible: (leadData.proyecto === 'aerotermia' || leadData.proyecto === 'aire-aire')
          && leadData.calefaccion === 'electrica'
      };
      if (leadData.email) {
        _emAdd(_emCol(_emDb, 'mail'), {
          to: leadData.email,
          template: { name: 'lead_confirmation', data: emailData }
        }).catch(err => console.warn('[email] confirmation failed:', err));
      }
      _emAdd(_emCol(_emDb, 'mail'), {
        to: 'contacto@artesanosverdes.com',
        replyTo: leadData.email || 'contacto@artesanosverdes.com',
        template: { name: 'lead_notification', data: emailData }
      }).catch(err => console.warn('[email] notification failed:', err));
      console.log('[emails queued for', leadData.email || 'lead', ']');
    } catch (emErr) {
      console.warn('[email] trigger failed:', emErr);
    }
    // ========================================


      showToast(
        '¡Gracias ' + (leadData.nombre.split(' ')[0] || '') + '!',
        'Hemos recibido tu solicitud. Te contactaremos en menos de 1 hora al ' + leadData.telefono + '.'
      );

      form.reset();
    } catch (err) {
      console.error('[lead save error]', err);

      // Fallback: open mailto prefilled
      const body = encodeURIComponent(
        `Nombre: ${leadData.nombre}\n` +
        `Teléfono: ${leadData.telefono}\n` +
        `Email: ${leadData.email}\n` +
        `Provincia: ${leadData.provincia}\n` +
        `Tipo de vivienda: ${leadData.tipo}\n` +
        `Año de construcción: ${leadData.ano}\n` +
        `Calefacción actual: ${leadData.calefaccion || '(no indicada)'}\n` +
        `Proyecto de interés: ${leadData.proyecto || '(no indicado)'}\n\n` +
        `Mensaje:\n${leadData.mensaje || '(sin mensaje)'}`
      );
      const subject = encodeURIComponent(`Estudio de elegibilidad CAE — ${leadData.nombre}`);

      showToast(
        'Error al enviar',
        'Abriendo tu aplicación de correo como alternativa...',
        true
      );

      setTimeout(() => {
        window.location.href = `mailto:contacto@artesanosverdes.com?subject=${subject}&body=${body}`;
      }, 1500);
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  }

  // =====================================================
  // Nav shadow on scroll
  // =====================================================
  const nav = document.querySelector('nav');
  window.addEventListener('scroll', () => {
    nav.style.boxShadow = window.scrollY > 50 ? '0 4px 30px rgba(26, 46, 31, 0.05)' : 'none';
  }, { passive: true });

  // =====================================================
  // TIME ON PAGE (engagement metric)
  // =====================================================
  let timeOnPage = 0;
  const timeIntervals = [10, 30, 60, 120, 300]; // seconds
  let nextInterval = 0;
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    timeOnPage++;
    if (nextInterval < timeIntervals.length && timeOnPage >= timeIntervals[nextInterval]) {
      track('engaged_time', { seconds: timeIntervals[nextInterval] });
      nextInterval++;
    }
  }, 1000);


(function () {
  var section = document.querySelector('.av-trust-numbers');
  if (!section) return;
  var numbers = section.querySelectorAll('.av-trust-number[data-count-to]');
  if (!numbers.length) return;

  function formatEs(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function finalValue(el) {
    return formatEs(parseInt(el.dataset.countTo, 10)) + (el.dataset.countSuffix || '');
  }

  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    numbers.forEach(function (el) { el.textContent = finalValue(el); });
    return;
  }

  // Reset to "0" before the observer fires so users see the count-up start,
  // not a flash of the final value when the section scrolls into view.
  numbers.forEach(function (el) { el.textContent = '0'; });

  function animate(el) {
    var target = parseInt(el.dataset.countTo, 10);
    var suffix = el.dataset.countSuffix || '';
    var duration = 1500;
    var start = null;
    function tick(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
      if (t < 1) {
        el.textContent = formatEs(eased * target);
        requestAnimationFrame(tick);
      } else {
        // "+" suffix only appears once the count reaches its final value.
        el.textContent = formatEs(target) + suffix;
      }
    }
    requestAnimationFrame(tick);
  }

  if (!('IntersectionObserver' in window)) {
    // Fallback for very old browsers: show final values immediately.
    numbers.forEach(function (el) { el.textContent = finalValue(el); });
    return;
  }

  var io = new IntersectionObserver(function (entries, obs) {
    if (entries[0].isIntersecting) {
      numbers.forEach(animate);
      obs.unobserve(section); // one-shot
    }
  }, { threshold: 0.3 });
  io.observe(section);
})();
