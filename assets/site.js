/* Los Artesanos Verdes — comportements des pages « site » (accueil, services,
   hub, 404). Script classique chargé en defer.
   Tout est défensif : aucun élément n'est supposé présent (#burger,
   #contactForm, #ctaBarMovil…). Le suivi d'audience commun (clics de contact,
   CTA, défilement, sections vues, temps passé) est dans tracking.js ; ici on
   n'envoie que les événements propres à ces pages, via window.avTrack. */
(function () {
  'use strict';

  var PROD = location.hostname === 'artesanosverdes.com';
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Envoi d'événement : fourni par tracking.js ; sans lui, rien ne se passe.
  function track(nom, params) {
    try {
      if (typeof window.avTrack === 'function') window.avTrack(nom, params || {});
    } catch (e) { /* le suivi ne doit jamais casser la page */ }
  }
  // console.log seulement hors production.
  function logDev() {
    if (!PROD && window.console) console.log.apply(console, arguments);
  }
  function $(id) { return document.getElementById(id); }
  function utilisable(el) {
    return !!el && !el.disabled && el.getClientRects().length > 0;
  }

  // =====================================================
  // Menu mobile : html.menu-open, voile .nav-overlay, Échap, clic sur un lien
  // =====================================================
  (function () {
    var burger = $('burger');
    var navLinks = $('navLinks');
    if (!burger || !navLinks) return;
    var racine = document.documentElement;

    var voile = document.querySelector('.nav-overlay');
    if (!voile) {
      voile = document.createElement('div');
      voile.className = 'nav-overlay';
      voile.setAttribute('aria-hidden', 'true');
      var nav = burger.closest('nav');
      if (nav && nav.parentNode) nav.parentNode.insertBefore(voile, nav.nextSibling);
      else document.body.appendChild(voile);
    }

    function estOuvert() { return navLinks.classList.contains('open'); }
    function regler(ouvert) {
      burger.classList.toggle('open', ouvert);
      navLinks.classList.toggle('open', ouvert);
      racine.classList.toggle('menu-open', ouvert);
      burger.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    }

    burger.addEventListener('click', function () { regler(!estOuvert()); });
    voile.addEventListener('click', function () { regler(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && estOuvert()) {
        regler(false);
        burger.focus();
      }
    });
    navLinks.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) regler(false);
    });
    // Passage en affichage bureau menu ouvert : on referme (sinon la page
    // resterait bloquée par html.menu-open).
    window.addEventListener('resize', function () {
      if (estOuvert() && burger.getClientRects().length === 0) regler(false);
    }, { passive: true });
  })();

  // =====================================================
  // Nav compacte au défilement (classe is-scrolled)
  // =====================================================
  (function () {
    var burger = $('burger');
    var nav = (burger && burger.closest('nav')) || document.querySelector('nav:not(.breadcrumb)');
    if (!nav) return;
    var etat = null;
    function maj() {
      var defile = (window.scrollY || window.pageYOffset || 0) > 50;
      if (defile !== etat) {
        etat = defile;
        nav.classList.toggle('is-scrolled', defile);
      }
    }
    window.addEventListener('scroll', maj, { passive: true });
    maj();
  })();

  // =====================================================
  // Apparition au défilement (.reveal → .in)
  // =====================================================
  (function () {
    var elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;
    if (!('IntersectionObserver' in window)) {
      elements.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    elements.forEach(function (el) { io.observe(el); });
    window.addEventListener('load', function () {
      document.querySelectorAll('.hero .reveal').forEach(function (el) { el.classList.add('in'); });
    });
  })();

  // =====================================================
  // Outils communs aux champs du formulaire
  // =====================================================
  var PROVINCIAS = ['Valladolid', 'León', 'Burgos', 'Palencia', 'Zamora', 'Salamanca', 'Segovia', 'Ávila', 'Madrid', 'Lugo', 'Ourense', 'Asturias', 'Cantabria'];
  // Valeur de repli quand l'option exacte n'existe pas dans ce formulaire.
  var ALIAS = { tipo: { piso: 'otro' } };

  function normaliser(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }
  function trouverOption(select, valeur) {
    var n = normaliser(valeur);
    if (!n) return null;
    for (var i = 0; i < select.options.length; i++) {
      var o = select.options[i];
      if (o.value && normaliser(o.value) === n) return o;
    }
    return null;
  }
  // Remplit un champ seulement avec une valeur connue (option existante ;
  // pour un ancien champ texte « provincia », une des provinces ou « Otra »).
  function remplirChamp(id, valeur) {
    var el = $(id);
    if (!el || el.disabled || valeur == null || valeur === '') return false;
    if (el.tagName === 'SELECT') {
      var opt = trouverOption(el, valeur);
      if (!opt && ALIAS[id] && ALIAS[id][valeur]) opt = trouverOption(el, ALIAS[id][valeur]);
      if (!opt) return false;
      el.value = opt.value;
    } else if (id === 'provincia') {
      var n = normaliser(valeur);
      var connue = PROVINCIAS.concat(['Otra']).filter(function (p) { return normaliser(p) === n; })[0];
      if (!connue) return false;
      el.value = connue;
    } else {
      return false;
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  // Premier champ requis vide de l'étape 1 (#calefaccion pour une pompe à
  // chaleur, puis #tipo), sinon #nombre. Pris dans l'ordre du formulaire :
  // sur les pages services, où #nombre vient avant, on ne saute pas de champ.
  function premierChampVide(proyecto) {
    var calef = $('calefaccion');
    var tipo = $('tipo');
    var nombre = $('nombre');
    var candidats = [];
    if ((proyecto === 'aerotermia' || proyecto === 'aire-aire') && utilisable(calef) && !calef.value) candidats.push(calef);
    if (utilisable(tipo) && !tipo.value) candidats.push(tipo);
    if (utilisable(nombre) && !nombre.value) candidats.push(nombre);
    candidats.sort(function (a, b) {
      return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
    });
    if (candidats.length) return candidats[0];
    return utilisable(nombre) ? nombre : null;
  }

  // Élément à amener à l'écran : le groupe du champ (avec son libellé), centré,
  // pour qu'il reste visible même quand le formulaire est plus haut que l'écran
  // (mobile) ; à défaut le haut de #contacto.
  function cibleDefilement(champ) {
    if (champ) return { el: champ.closest('.form-group') || champ, block: 'center' };
    var seccion = $('contacto');
    return seccion ? { el: seccion, block: 'start' } : null;
  }

  // Défilement immédiat malgré html { scroll-behavior: smooth }.
  function defilerSansAnimation(el, block) {
    var racine = document.documentElement;
    var avant = racine.style.scrollBehavior;
    racine.style.scrollBehavior = 'auto';
    el.scrollIntoView({ block: block });
    racine.style.scrollBehavior = avant;
  }

  // Focus posé par le script (chips, URL, quiz) : signalé pour ne pas compter
  // un form_start / form_step2 que le visiteur n'a pas fait.
  function focaliser(champ) {
    window.__avFocusAuto = true;
    try { champ.focus({ preventScroll: true }); } catch (e) { /* sans importance */ }
    window.__avFocusAuto = false;
  }

  function allerAuFormulaire(champ) {
    var cible = cibleDefilement(champ);
    if (cible) cible.el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: cible.block });
    if (champ) {
      // Délai : laisse le défilement démarrer et évite l'ouverture brutale du
      // clavier sur mobile.
      setTimeout(function () { focaliser(champ); }, reduceMotion ? 0 : 650);
    }
  }

  // =====================================================
  // Formulaire de contact (#contactForm)
  // =====================================================
  // Le document 'leads' garde EXACTEMENT les mêmes clés qu'avant : les règles
  // Firestore de production ne sont pas connues et peuvent refuser tout champ
  // nouveau (le lead serait alors perdu). Ne passer à true qu'après avoir
  // vérifié dans la console Firebase que les règles acceptent 'atribucion'.
  const GUARDAR_ATRIBUCION_EN_LEAD = false;

  var TEL_AFFICHE = '+34 632 18 05 09';
  var WA_BASE = 'https://wa.me/34632180509';
  var AYUDA_FOTOS = {
    desvan: 'Por ejemplo: la trampilla de acceso, el interior del desván y la fachada.',
    'cubierta-inclinada': 'Por ejemplo: la buhardilla por dentro y el tejado por fuera.',
    aerotermia: 'Por ejemplo: tu caldera actual, un radiador y la fachada.',
    'aire-aire': 'Por ejemplo: tu caldera o sistema actual y las estancias a climatizar.'
  };
  var AYUDA_FOTOS_DEFECTO = 'Por ejemplo: la fachada y la zona que quieres mejorar.';

  // Registre des panneaux .form-ok / .form-error et du toast : vouvoiement
  // (« usted ») quand le <form> porte data-tratamiento="usted" (page
  // comunidades, brochure au vouvoiement) ; tutoiement partout ailleurs, avec
  // les textes d'origine inchangés. Pas de délai « 1 hora » au vouvoiement :
  // la page comunidades annonce « Respuesta en 24 h » au paso 1 (décision
  // « 1 hora / 24 h » en attente).
  var TEXTES = {
    tu: {
      recibida: 'Hemos recibido tu solicitud',
      contacto: function (tel) { return 'Te contactaremos en menos de 1 hora al ' + tel + '.'; },
      fotosBoton: 'Adelanta tu estudio: envíanos unas fotos por WhatsApp',
      fotosMensaje: function (prenom, ref) {
        return (prenom ? 'Hola, soy ' + prenom + '.' : 'Hola.') +
          ' Acabo de pedir el estudio' + (ref ? ' (ref. ' + ref + ')' : '') + '. Os envío unas fotos de mi vivienda.';
      },
      ayuda: AYUDA_FOTOS,
      ayudaDefecto: AYUDA_FOTOS_DEFECTO,
      error: 'No hemos podido enviar tu solicitud. Puedes enviárnosla por otra vía:',
      errorToast: 'No hemos podido enviar tu solicitud. Llámanos al '
    },
    usted: {
      recibida: 'Hemos recibido su solicitud',
      contacto: function (tel) { return 'Le contactaremos muy pronto al ' + tel + '.'; },
      fotosBoton: 'Adelante su estudio: envíenos unas fotos por WhatsApp',
      fotosMensaje: function (prenom, ref) {
        return (prenom ? 'Hola, soy ' + prenom + '.' : 'Hola.') +
          ' Acabo de pedir el estudio del edificio' + (ref ? ' (ref. ' + ref + ')' : '') + '. Les envío unas fotos de la buhardilla.';
      },
      ayuda: {
        desvan: 'Por ejemplo: la trampilla de acceso y el interior de la buhardilla.',
        'cubierta-inclinada': 'Por ejemplo: la buhardilla por dentro y el tejado por fuera.',
        aerotermia: 'Por ejemplo: su caldera actual, un radiador y la fachada.',
        'aire-aire': 'Por ejemplo: su caldera o sistema actual y las estancias a climatizar.'
      },
      ayudaDefecto: 'Por ejemplo: la trampilla de acceso y el interior de la buhardilla.',
      error: 'No hemos podido enviar su solicitud. Puede enviárnosla por otra vía:',
      errorToast: 'No hemos podido enviar su solicitud. Llámenos al '
    }
  };
  function textes(form) {
    return (form && form.getAttribute && form.getAttribute('data-tratamiento') === 'usted') ? TEXTES.usted : TEXTES.tu;
  }

  function creer(tag, classe, texte) {
    var el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texte != null) el.textContent = texte;
    return el;
  }

  // Toast conservé en secours (si un panneau ne peut pas être inséré).
  function showToast(title, msg, isError) {
    var toast = $('toast');
    if (!toast) return;
    var toastTitle = $('toastTitle');
    var toastMsg = $('toastMsg');
    if (toastTitle) toastTitle.textContent = title;
    if (toastMsg) toastMsg.textContent = msg;
    toast.classList.toggle('error', !!isError);
    var iconSvg = toast.querySelector('.toast-icon svg');
    if (iconSvg) {
      // Icônes statiques uniquement (aucune donnée saisie).
      iconSvg.innerHTML = isError
        ? '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'
        : '<polyline points="20 6 9 17 4 12"></polyline>';
    }
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 6500);
  }

  // Récapitulatif texte de la demande (corps du mailto, comme avant ; repris
  // pour WhatsApp).
  function recapitulatif(leadData) {
    return `Nombre: ${leadData.nombre}\n` +
      `Teléfono: ${leadData.telefono}\n` +
      `Email: ${leadData.email}\n` +
      `Provincia: ${leadData.provincia}\n` +
      `Tipo de vivienda: ${leadData.tipo}\n` +
      `Año de construcción: ${leadData.ano}\n` +
      `Calefacción actual: ${leadData.calefaccion || '(no indicada)'}\n` +
      `Proyecto de interés: ${leadData.proyecto || '(no indicado)'}\n\n` +
      `Mensaje:\n${leadData.mensaje || '(sin mensaje)'}`;
  }

  function retirerErreur(form) {
    var ancien = form.querySelector('.form-error');
    if (ancien && ancien.parentNode) ancien.parentNode.removeChild(ancien);
  }

  // Échec de l'enregistrement : pas de redirection, les données restent dans
  // le formulaire et on propose d'autres moyens d'envoi.
  function afficherErreur(form, leadData) {
    var subject = encodeURIComponent(`Estudio de elegibilidad CAE — ${leadData.nombre}`);
    var body = encodeURIComponent(recapitulatif(leadData));
    var leadWa = {};
    Object.keys(leadData).forEach(function (k) { leadWa[k] = leadData[k]; });
    leadWa.mensaje = (leadData.mensaje || '').slice(0, 500);
    var texteWa = 'Hola, me interesa un estudio de elegibilidad CAE.\n\n' + recapitulatif(leadWa);

    var panneau = creer('div', 'form-error');
    panneau.setAttribute('role', 'alert');
    panneau.appendChild(creer('p', 'form-error-txt', textes(form).error));
    var actions = creer('div', 'form-error-acciones');

    var wa = creer('a', 'btn btn-primary', 'Enviar por WhatsApp');
    wa.href = WA_BASE + '?text=' + encodeURIComponent(texteWa);
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.setAttribute('data-cta', 'form-error-whatsapp');

    var tel = creer('a', 'btn btn-ghost', 'Llamar al ' + TEL_AFFICHE);
    tel.href = 'tel:+34632180509';
    tel.setAttribute('data-cta', 'form-error-llamar');

    var mail = creer('a', 'btn btn-ghost', 'Enviar por email');
    mail.href = `mailto:contacto@artesanosverdes.com?subject=${subject}&body=${body}`;
    mail.setAttribute('data-cta', 'form-error-email');

    actions.appendChild(wa);
    actions.appendChild(tel);
    actions.appendChild(mail);
    panneau.appendChild(actions);

    var bouton = form.querySelector('button[type="submit"]');
    if (bouton && bouton.parentNode) bouton.parentNode.insertBefore(panneau, bouton.nextSibling);
    else form.appendChild(panneau);
    try {
      panneau.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    } catch (e) { /* sans importance */ }
  }

  // Succès : le formulaire est masqué et remplacé par un panneau qui reçoit le
  // focus. Toute donnée saisie passe par textContent.
  function afficherSucces(form, leadData, leadId) {
    var prenom = (leadData.nombre || '').split(' ')[0];
    var ref = String(leadId || '').slice(0, 6).toUpperCase();
    var t = textes(form);

    var panneau = creer('div', 'form-ok');
    panneau.setAttribute('role', 'status');
    panneau.tabIndex = -1;
    panneau.appendChild(creer('h3', 'form-ok-title', prenom ? '¡Gracias, ' + prenom + '!' : '¡Gracias!'));
    panneau.appendChild(creer('p', 'form-ok-ref', t.recibida + (ref ? ' (ref. ' + ref + ')' : '') + '.'));
    panneau.appendChild(creer('p', 'form-ok-tel', t.contacto(leadData.telefono)));

    var texteWa = t.fotosMensaje(prenom, ref);
    var wa = creer('a', 'btn btn-primary form-ok-wa', t.fotosBoton);
    wa.href = WA_BASE + '?text=' + encodeURIComponent(texteWa);
    wa.target = '_blank';
    wa.rel = 'noopener';
    // Ce clic suit une conversion déjà comptée (generate_lead) : on ne le
    // compte pas une seconde fois en contact_whatsapp.
    wa.setAttribute('data-av-notrack', '');
    wa.addEventListener('click', function () {
      track('photos_whatsapp_click', { proyecto: leadData.proyecto || '', location: 'form-ok' });
    });
    panneau.appendChild(wa);
    panneau.appendChild(creer('p', 'form-ok-ayuda', t.ayuda[leadData.proyecto] || t.ayudaDefecto));

    var parent = form.parentNode;
    if (!parent) {
      showToast('¡Gracias' + (prenom ? ' ' + prenom : '') + '!', t.recibida + '. ' + t.contacto(leadData.telefono));
      return;
    }
    form.hidden = true;
    form.style.display = 'none';
    parent.insertBefore(panneau, form.nextSibling);
    try { panneau.focus(); } catch (e) { /* sans importance */ }
  }

  async function handleSubmit(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    var form = (e && e.target && e.target.closest) ? e.target.closest('form') : $('contactForm');
    if (!form) return;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn && submitBtn.disabled) return; // envoi déjà en cours
    retirerErreur(form);
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
    if (GUARDAR_ATRIBUCION_EN_LEAD && typeof window.avAttrib === 'function') {
      leadData.atribucion = window.avAttrib();
    }

    // UI loading state
    if (submitBtn) {
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
    }
    const finChargement = () => {
      if (submitBtn) {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    };

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

    let leadId;
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
      leadId = await saveToFirestore();
    } catch (err) {
      console.error('[lead save error]', err);
      track('lead_save_error', {
        form_location: 'contact_form',
        proyecto: leadData.proyecto,
        error: String((err && err.message) || err).slice(0, 100)
      });
      finChargement();
      try {
        afficherErreur(form, leadData);
      } catch (panErr) {
        showToast('Error al enviar', textes(form).errorToast + TEL_AFFICHE + '.', true);
      }
      return;
    }

    logDev('[lead saved]', leadId);

    // Conversion GA4 / Google Ads : uniquement une fois le lead enregistré.
    var attrib = (typeof window.avAttrib === 'function') ? window.avAttrib() : null;
    track('generate_lead', {
      form_location: 'contact_form',
      provincia: leadData.provincia,
      tipo_vivienda: leadData.tipo,
      ano_construccion: leadData.ano,
      calefaccion: leadData.calefaccion,
      proyecto: leadData.proyecto,
      canal: (attrib && attrib.canal) || '',
      value: 1,
      currency: 'EUR'
    });

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
      logDev('[emails queued for', leadData.email || 'lead', ']');
    } catch (emErr) {
      console.warn('[email] trigger failed:', emErr);
    }
    // ========================================

    finChargement();
    try {
      afficherSucces(form, leadData, leadId);
      form.reset();
    } catch (uiErr) {
      var tx = textes(form);
      showToast(
        '¡Gracias ' + (leadData.nombre.split(' ')[0] || '') + '!',
        tx.recibida + '. ' + tx.contacto(leadData.telefono)
      );
    }
  }

  // Contrat conservé : appelée par l'attribut onsubmit="handleSubmit(event)".
  window.handleSubmit = handleSubmit;

  (function () {
    var form = $('contactForm');
    if (!form) return;

    // --- Événements de parcours du formulaire ---
    var demarre = false;
    var etape2 = false;
    form.addEventListener('focusin', function (e) {
      if (window.__avFocusAuto) return; // focus posé par le script
      if (!demarre) {
        demarre = true;
        track('form_start', { form_location: 'contact_form' });
      }
      var id = e.target && e.target.id;
      if (!etape2 && (id === 'nombre' || id === 'telefono' || id === 'email')) {
        etape2 = true;
        track('form_step2', { form_location: 'contact_form' });
      }
    });
    // 'invalid' ne remonte pas : écoute en phase de capture.
    form.addEventListener('invalid', function (e) {
      var champ = e.target;
      track('form_invalid', { form_location: 'contact_form', field: (champ && (champ.name || champ.id)) || '' });
    }, true);

    // --- Avertissement d'éligibilité (pompe à chaleur + chauffage électrique) ---
    var proyecto = $('proyecto');
    var calef = $('calefaccion');
    if (!proyecto || !calef) return;

    var aviso = $('avisoElegibilidad');
    if (!aviso) {
      // Repli si le balisage n'a pas encore le paragraphe prévu (§4.7).
      aviso = creer('p', 'form-aviso');
      aviso.id = 'avisoElegibilidad';
      aviso.setAttribute('role', 'status');
      aviso.setAttribute('aria-live', 'polite');
      aviso.hidden = true;
      var groupe = calef.closest('.form-row') || calef.closest('.form-group') || calef;
      groupe.parentNode.insertBefore(aviso, groupe.nextSibling);
    }

    function majAviso() {
      var p = proyecto.value;
      var concerne = (p === 'aerotermia' || p === 'aire-aire') && calef.value === 'electrica';
      if (!concerne) {
        aviso.hidden = true;
        aviso.textContent = '';
        return;
      }
      if (!aviso.hidden && aviso.firstChild) return; // déjà affiché
      aviso.textContent = '';
      aviso.appendChild(document.createTextNode('Con calefacción eléctrica, la aerotermia y la bomba de calor aire-aire no entran en el sistema CAE. Sí podemos estudiar el aislamiento de tu desván o de tu cubierta. '));
      var btn = creer('button', 'form-aviso-btn', 'Estudiar el aislamiento del desván');
      btn.type = 'button';
      btn.addEventListener('click', function () {
        remplirChamp('proyecto', 'desvan');
        // Sur les pages services, #proyecto est en haut du formulaire : le
        // défilement natif du focus le plaçait sous la nav fixe. On centre son
        // groupe (libellé compris), puis focus sans nouveau défilement.
        try {
          defilerSansAnimation(proyecto.closest('.form-group') || proyecto, 'center');
          focaliser(proyecto);
        } catch (err) { /* sans importance */ }
      });
      aviso.appendChild(btn);
      aviso.hidden = false;
    }
    proyecto.addEventListener('change', majAviso);
    calef.addEventListener('change', majAviso);
    majAviso();
  })();

  // =====================================================
  // Préremplissage par l'URL : ?proyecto= ?provincia= ?tipo= ?calefaccion=
  // =====================================================
  (function () {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    var applique = false;
    ['proyecto', 'tipo', 'calefaccion', 'provincia'].forEach(function (cle) {
      var v = q.get(cle);
      if (v && remplirChamp(cle, v.slice(0, 60))) applique = true;
    });
    if (location.hash !== '#contacto' || !$('contacto')) return;
    // Arrivée sur #contacto avec des valeurs reprises (quiz d'une autre page,
    // CTA du blog) : on amène à l'écran le premier champ à remplir.
    // Après 'load' : le navigateur fait lui-même défiler vers l'ancre (et
    // remet le focus sur la page) une fois le document chargé.
    function appliquer() {
      var actif = document.activeElement;
      if (actif && actif !== document.body && actif !== document.documentElement) return; // le visiteur a déjà agi
      var p = $('proyecto');
      var champ = applique ? premierChampVide(p ? p.value : '') : null;
      var cible = cibleDefilement(champ);
      defilerSansAnimation(cible.el, cible.block);
      if (champ) focaliser(champ);
    }
    if (document.readyState === 'complete') setTimeout(appliquer, 0);
    else window.addEventListener('load', function () { setTimeout(appliquer, 0); });
  })();

  // =====================================================
  // Chips du hero et boutons [data-quiz-open]
  // =====================================================
  (function () {
    var elements = document.querySelectorAll('.hero-chip[data-proyecto], [data-quiz-open]');
    elements.forEach(function (el) {
      el.addEventListener('click', function (e) {
        var proyecto = el.getAttribute('data-proyecto') || '';
        var ouvreQuiz = el.hasAttribute('data-quiz-open') || proyecto === 'no-se';
        if (ouvreQuiz && typeof window.avQuizOpen === 'function') {
          e.preventDefault();
          window.avQuizOpen(el.getAttribute('data-cta') || (proyecto ? 'hero-chip' : 'boton-quiz'));
          return;
        }
        // Sans quiz : un lien garde sa navigation normale.
        if (!proyecto && el.tagName === 'A' && el.getAttribute('href')) return;
        if (proyecto) {
          remplirChamp('proyecto', proyecto);
          track('quickstart_click', { proyecto: proyecto });
        }
        var p = $('proyecto');
        allerAuFormulaire(premierChampVide(p ? p.value : proyecto));
      });
    });
  })();

  // =====================================================
  // « ¿Trabajamos en tu zona? » (#zonas)
  // =====================================================
  (function () {
    var zonas = $('zonas');
    if (!zonas) return;
    var chips = zonas.querySelectorAll('.zona-chip');
    var resultat = $('zonasResultado');
    var texte = resultat ? resultat.querySelector('.zonas-resultado-txt') : null;
    var active = '';

    zonas.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('a, button') : null;
      if (!t || !zonas.contains(t)) return;

      if (t.classList.contains('zona-chip')) {
        active = t.getAttribute('data-provincia') || (t.textContent || '').trim();
        chips.forEach(function (c) { c.setAttribute('aria-pressed', c === t ? 'true' : 'false'); });
        if (resultat) {
          if (texte) texte.textContent = 'Sí, trabajamos en ' + active + '.';
          resultat.hidden = false;
        }
        remplirChamp('provincia', active);
        track('zona_click', { provincia: active });
        return;
      }

      var propre = t.getAttribute('data-provincia');
      var provincia = propre || (resultat && resultat.contains(t) ? active : '');
      if (!provincia) return;
      remplirChamp('provincia', provincia);
      if (propre) track('zona_click', { provincia: propre });
    });
  })();

  // =====================================================
  // Chiffres animés (.av-trust-number)
  // =====================================================
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

    if (reduceMotion) {
      numbers.forEach(function (el) { el.textContent = finalValue(el); });
      return;
    }

    if (!('IntersectionObserver' in window)) {
      // Fallback for very old browsers: show final values immediately.
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

    var io = new IntersectionObserver(function (entries, obs) {
      if (entries[0].isIntersecting) {
        numbers.forEach(animate);
        obs.unobserve(section); // one-shot
      }
    }, { threshold: 0.3 });
    io.observe(section);
  })();

  // =====================================================
  // Barre d'action mobile : masquée tant que le formulaire est à l'écran
  // =====================================================
  (function () {
    var barre = $('ctaBarMovil');
    var seccion = $('contacto');
    if (!barre || !seccion || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (entrees) {
      barre.classList.toggle('oculta', entrees[0].isIntersecting);
    }, { rootMargin: '0px 0px -15% 0px' }).observe(seccion);
  })();
})();
