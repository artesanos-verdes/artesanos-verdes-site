/* Quiz d'orientation (Lot 1, §6) : « ¿Qué solución encaja con tu vivienda? ».
   Script classique chargé en defer, sans dépendance. Construit lui-même son
   <dialog class="avq"> à la première ouverture. Aucune donnée personnelle
   n'est demandée et rien n'est stocké : les réponses vivent en mémoire le
   temps du dialogue.
   API : window.avQuizOpen(origen). Tout élément [data-quiz-open] l'ouvre
   aussi (site.js s'en charge sur les pages qui le chargent ; sinon, l'écouteur
   délégué ci-dessous prend le relais). */
(function () {
  'use strict';
  if (typeof window.avQuizOpen === 'function') return;

  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function track(nom, params) {
    try {
      if (typeof window.avTrack === 'function') window.avTrack(nom, params || {});
    } catch (e) { /* le suivi ne doit jamais casser la page */ }
  }

  // =====================================================
  // Contenu
  // =====================================================
  var PROVINCIAS = ['Valladolid', 'León', 'Burgos', 'Palencia', 'Zamora', 'Salamanca', 'Segovia', 'Ávila', 'Madrid', 'Lugo', 'Ourense', 'Asturias', 'Cantabria'];

  var SERVICIOS = {
    desvan: { nombre: 'Aislamiento de desván', url: '/servicios/aislamiento-desvan/' },
    'cubierta-inclinada': { nombre: 'Aislamiento de cubierta inclinada', url: '/servicios/aislamiento-cubierta-inclinada/' },
    aerotermia: { nombre: 'Aerotermia (bomba de calor)', url: '/servicios/aerotermia/' },
    'aire-aire': { nombre: 'Bomba de calor aire-aire', url: '/servicios/aire-aire/' }
  };

  // Chaque option : [valeur, libellé, précision facultative]
  var PASOS = {
    tipo: {
      titulo: '¿Qué tipo de edificio es?',
      opciones: [
        ['unifamiliar', 'Casa unifamiliar'],
        ['piso', 'Piso'],
        ['comunidad', 'Comunidad de propietarios'],
        ['terciario', 'Local o edificio terciario']
      ]
    },
    mejora: {
      titulo: '¿Qué te gustaría mejorar?',
      opciones: [
        ['aislamiento', 'Pasar menos frío o calor bajo el tejado'],
        ['bomba', 'Cambiar mi caldera de gas o gasóleo'],
        ['nose', 'No lo sé']
      ]
    },
    espacio: {
      titulo: '¿Cómo es el espacio bajo tu tejado?',
      opciones: [
        ['desvan', 'Desván no habitable', 'vacío o trastero'],
        ['cubierta-inclinada', 'Buhardilla habitable', 'dormitorio, estudio…'],
        ['nose', 'No lo sé']
      ]
    },
    calefaccion: {
      titulo: '¿Con qué calientas hoy tu vivienda?',
      opciones: [
        ['gas', 'Gas', 'natural o propano'],
        ['gasoleo', 'Gasóleo'],
        ['electrica', 'Eléctrica'],
        ['otra', 'Otra', 'leña, pellets…']
      ]
    },
    agua: {
      titulo: '¿Tienes radiadores o suelo radiante de agua?',
      opciones: [
        ['si', 'Sí'],
        ['no', 'No'],
        ['nose', 'No lo sé']
      ]
    },
    provincia: {
      titulo: '¿En qué provincia está?',
      compacto: true,
      opciones: PROVINCIAS.map(function (p) { return [p, p]; }).concat([['Otra', 'Otra provincia']])
    }
  };

  var TXT_LEGAL = 'Resultado orientativo y no vinculante. La elegibilidad se confirma en el estudio técnico gratuito, según la normativa CAE vigente (RD 36/2023).';
  var TXT_OTRA_PROVINCIA = 'Por ahora trabajamos en 13 provincias del norte y centro de España (' +
    PROVINCIAS.slice(0, -1).join(', ') + ' y ' + PROVINCIAS[PROVINCIAS.length - 1] +
    '). Déjanos tus datos igualmente y te diremos si podemos ayudarte.';

  // =====================================================
  // Parcours
  // =====================================================
  function suivant(paso, r) {
    switch (paso) {
      case 'tipo': return 'mejora';
      case 'mejora': return r.mejora === 'aislamiento' ? 'espacio' : 'calefaccion';
      case 'espacio': return 'provincia';
      case 'calefaccion': return (r.calefaccion === 'gas' || r.calefaccion === 'gasoleo') ? 'agua' : 'provincia';
      case 'agua': return 'provincia';
      default: return 'resultado';
    }
  }

  // Nombre d'écrans de questions du parcours (5 au plus, 4 si plus court).
  // Sert seulement à remplir la barre de progression : le texte affiche
  // « Pregunta n », sans total (un total qui passait de 5 à 4 en cours de
  // route — « Paso 2 de 5 » puis « Paso 3 de 4 » — déroutait).
  function totalPasos(r) {
    if (r.mejora === 'aislamiento') return 4;
    if (r.calefaccion === 'electrica' || r.calefaccion === 'otra') return 4;
    return 5;
  }

  // Règles d'orientation (cahier des charges §0 et §6). Jamais de montant.
  // resultado ∈ encaja | estudiar | electrica | otra-calefaccion | fuera-zona
  function calculer(r) {
    var res = { resultado: 'estudiar', proyecto: 'no-se', servicio: null, piso: false };
    if (r.mejora === 'aislamiento') {
      if (r.espacio === 'desvan' || r.espacio === 'cubierta-inclinada') res.proyecto = r.espacio;
      // Aislamiento : casa unifamiliar, comunidad de propietarios o edificio
      // terciario « con cubierta propia » (§0, página desván). Un piso no
      // tiene cubierta propia : se estudia con un técnico, en comunidad de
      // propietarios (verif. conformite-02).
      if (r.tipo === 'piso') res.piso = true;
      else if (res.proyecto !== 'no-se') res.resultado = 'encaja';
    } else if (r.calefaccion === 'electrica') {
      res.resultado = 'electrica';
    } else if (r.calefaccion === 'otra') {
      // §0 : bomba de calor solo si sustituye gas o gasóleo (leña, pellets… no).
      res.resultado = 'otra-calefaccion';
    } else if (r.calefaccion === 'gas' || r.calefaccion === 'gasoleo') {
      res.proyecto = r.agua === 'no' ? 'aire-aire' : 'aerotermia';
      // Bombas de calor : casa o piso confirmados ; comunidad / terciario
      // y « No lo sé » se estudian con un técnico.
      if (r.agua !== 'nose' && (r.tipo === 'unifamiliar' || r.tipo === 'piso')) res.resultado = 'encaja';
    }
    // Fuera de las 13 provincias : este resultado prevalece sobre todos los demás.
    if (r.provincia === 'Otra') res.resultado = 'fuera-zona';
    if (res.resultado === 'encaja') res.servicio = SERVICIOS[res.proyecto];
    return res;
  }

  var TITULOS = {
    electrica: 'Con calefacción eléctrica, la bomba de calor no entra en el sistema CAE.',
    'otra-calefaccion': 'La bomba de calor solo entra en el sistema CAE si sustituye una calefacción de gas o gasóleo.',
    'fuera-zona': 'Por ahora, tu provincia está fuera de nuestra zona de trabajo',
    estudiar: 'Hay que estudiarlo con un técnico'
  };
  var TXT_AISLAMIENTO = 'Sí podemos estudiar el aislamiento de tu desván o de tu cubierta.';
  var TXT_AISLAMIENTO_EDIFICIO = 'Sí podemos estudiar el aislamiento de la cubierta del edificio.';
  var TXT_PISO = 'En un piso, el aislamiento de la cubierta se plantea en comunidad de propietarios: un técnico lo estudia con la comunidad.';
  // Piso + bomba de calor no elegible (calefacción eléctrica u otra) : on ne
  // propose pas « tu desván o tu cubierta » à un piso (verif. lot 1-B).
  var TXT_PISO_AISLAMIENTO = 'El aislamiento de la cubierta hay que estudiarlo con un técnico, en comunidad de propietarios: en un piso, se plantea para todo el edificio.';
  var COMUNIDADES = { texto: 'Ver nuestra propuesta para comunidades', url: '/comunidades-de-propietarios/' };

  // =====================================================
  // Dialogue
  // =====================================================
  var dlg = null;
  var ui = {};
  var respuestas = {};
  var historial = [];
  var pasoActual = null;
  var declencheur = null;
  var natif = false;
  var rendreFocus = true;

  function creer(tag, classe, texte) {
    var el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texte != null) el.textContent = texte;
    return el;
  }

  function construire() {
    dlg = creer('dialog', 'avq');
    dlg.id = 'avq';
    dlg.setAttribute('aria-labelledby', 'avq-titulo');
    natif = typeof dlg.showModal === 'function';
    if (!natif) {
      dlg.classList.add('avq--repli');
      dlg.setAttribute('role', 'dialog');
      dlg.setAttribute('aria-modal', 'true');
    }

    var inner = creer('div', 'avq-inner');

    var head = creer('div', 'avq-head');
    ui.atras = creer('button', 'avq-atras', 'Atrás');
    ui.atras.type = 'button';
    ui.cerrar = creer('button', 'avq-cerrar');
    ui.cerrar.type = 'button';
    ui.cerrar.setAttribute('aria-label', 'Cerrar');
    ui.cerrar.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    head.appendChild(ui.atras);
    head.appendChild(ui.cerrar);

    ui.kicker = creer('p', 'avq-kicker', '¿Qué solución encaja con tu vivienda?');
    ui.kicker.id = 'avq-titulo';

    var prog = creer('div', 'avq-progreso');
    prog.setAttribute('role', 'progressbar');
    prog.setAttribute('aria-label', 'Progreso del test');
    prog.setAttribute('aria-valuemin', '0');
    prog.setAttribute('aria-valuemax', '100');
    ui.barra = creer('span', 'avq-progreso-barra');
    prog.appendChild(ui.barra);
    ui.progreso = prog;
    ui.paso = creer('p', 'avq-paso');

    ui.pregunta = creer('h2', 'avq-pregunta');
    ui.pregunta.id = 'avq-pregunta';
    ui.pregunta.tabIndex = -1;

    ui.cuerpo = creer('div', 'avq-cuerpo');

    inner.appendChild(head);
    inner.appendChild(ui.kicker);
    inner.appendChild(prog);
    inner.appendChild(ui.paso);
    inner.appendChild(ui.pregunta);
    inner.appendChild(ui.cuerpo);
    dlg.appendChild(inner);
    document.body.appendChild(dlg);

    ui.atras.addEventListener('click', retour);
    ui.cerrar.addEventListener('click', function () { fermer(); });
    // Clic sur le fond (hors du contenu) : fermeture.
    dlg.addEventListener('click', function (e) { if (e.target === dlg) fermer(); });
    // Échap : événement natif 'cancel' ; en repli, clavier.
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); fermer(); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); fermer(); return; }
      if (e.key === 'Tab') pieger(e);
    });
  }

  // Focus piégé dans le dialogue (Tab / Maj+Tab bouclent).
  function pieger(e) {
    var focusables = Array.prototype.filter.call(
      dlg.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])'),
      function (el) { return !el.disabled && !el.hidden && el.getClientRects().length > 0; }
    );
    if (!focusables.length) return;
    var premier = focusables[0];
    var dernier = focusables[focusables.length - 1];
    var actif = document.activeElement;
    if (e.shiftKey && (actif === premier || !dlg.contains(actif) || actif === ui.pregunta)) {
      e.preventDefault();
      dernier.focus();
    } else if (!e.shiftKey && actif === dernier) {
      e.preventDefault();
      premier.focus();
    }
  }

  function majProgression(numero, total) {
    var pct = Math.round(((numero - 1) / total) * 100);
    var libelle = numero > total ? 'Resultado' : 'Pregunta ' + numero;
    ui.barra.style.width = Math.max(pct, 4) + '%';
    ui.progreso.setAttribute('aria-valuenow', String(pct));
    ui.progreso.setAttribute('aria-valuetext', libelle);
    ui.paso.textContent = libelle;
  }

  function vider(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  // Texte avec « aire-aire » insécable (<span class="nowrap">, site.css).
  function texteInsecable(el, txt) {
    String(txt).split('aire-aire').forEach(function (morceau, i) {
      if (i) el.appendChild(creer('span', 'nowrap', 'aire-aire'));
      if (morceau) el.appendChild(document.createTextNode(morceau));
    });
    return el;
  }

  function afficherPas(paso) {
    pasoActual = paso;
    var def = PASOS[paso];
    var numero = historial.length + 1;
    majProgression(numero, Math.max(totalPasos(respuestas), numero));
    ui.atras.hidden = historial.length === 0;
    ui.pregunta.textContent = def.titulo;
    vider(ui.cuerpo);

    var grille = creer('div', 'avq-opciones' + (def.compacto ? ' avq-opciones--compacto' : ''));
    def.opciones.forEach(function (op) {
      var b = creer('button', 'avq-opcion');
      b.type = 'button';
      b.setAttribute('data-valor', op[0]);
      b.setAttribute('aria-pressed', respuestas[paso] === op[0] ? 'true' : 'false');
      b.appendChild(creer('span', 'avq-opcion-txt', op[1]));
      if (op[2]) b.appendChild(creer('span', 'avq-opcion-sub', op[2]));
      b.addEventListener('click', function () { repondre(paso, op[0]); });
      grille.appendChild(b);
    });
    ui.cuerpo.appendChild(grille);
    animer();
    track('quiz_step', { step: paso });
    ui.pregunta.focus();
  }

  function repondre(paso, valeur) {
    respuestas[paso] = valeur;
    // Une réponse modifiée invalide les réponses des questions qui en dépendaient.
    if (paso === 'mejora') { delete respuestas.espacio; delete respuestas.calefaccion; delete respuestas.agua; }
    if (paso === 'calefaccion') delete respuestas.agua;
    historial.push(paso);
    var prochain = suivant(paso, respuestas);
    if (prochain === 'resultado') afficherResultat();
    else afficherPas(prochain);
  }

  function retour() {
    if (!historial.length) return;
    var precedent = historial.pop();
    afficherPas(precedent);
  }

  function afficherResultat() {
    pasoActual = 'resultado';
    var res = calculer(respuestas);
    majProgression(historial.length + 1, historial.length);
    ui.barra.style.width = '100%';
    ui.progreso.setAttribute('aria-valuenow', '100');
    ui.atras.hidden = false;
    vider(ui.cuerpo);

    if (res.resultado === 'encaja') {
      ui.pregunta.textContent = 'Tu vivienda podría encajar con: ';
      ui.pregunta.appendChild(texteInsecable(creer('em'), res.servicio.nombre));
    } else {
      ui.pregunta.textContent = TITULOS[res.resultado] || TITULOS.estudiar;
    }

    var bloc = creer('div', 'avq-resultado');
    var tipo = respuestas.tipo;
    // Un piso dont le résultat parle de l'aislamiento de la cubierta « en
    // comunidad de propietarios » (TXT_PISO ou TXT_PISO_AISLAMIENTO).
    var pisoEnComunidad = false;
    if (res.resultado === 'electrica' || res.resultado === 'otra-calefaccion') {
      var txtAislamiento = TXT_AISLAMIENTO;
      if (tipo === 'piso') { txtAislamiento = TXT_PISO_AISLAMIENTO; pisoEnComunidad = true; }
      else if (tipo === 'comunidad' || tipo === 'terciario') txtAislamiento = TXT_AISLAMIENTO_EDIFICIO;
      bloc.appendChild(creer('p', 'avq-resultado-txt', txtAislamiento));
    }
    if (res.resultado === 'estudiar' && res.piso) {
      bloc.appendChild(creer('p', 'avq-resultado-txt', TXT_PISO));
      pisoEnComunidad = true;
    }
    if (res.servicio && location.pathname.indexOf(res.servicio.url) !== 0) {
      var lien = creer('a', 'avq-enlace', 'Ver el servicio');
      lien.href = res.servicio.url;
      lien.setAttribute('data-cta', 'quiz-servicio');
      bloc.appendChild(lien);
    }
    // Comunidad de propietarios (y piso, cuando el texto del resultado remite
    // al aislamiento de la cubierta en comunidad) : enlace a la página
    // dedicada, salvo si ya estamos en ella. Piso + bomba de calor « No lo
    // sé » : sin enlace, la página trata de la cubierta (verif. lot 1-C).
    if ((tipo === 'comunidad' || pisoEnComunidad) &&
        location.pathname.indexOf(COMUNIDADES.url) !== 0) {
      var lienCom = creer('a', 'avq-enlace', COMUNIDADES.texto);
      lienCom.href = COMUNIDADES.url;
      lienCom.setAttribute('data-cta', 'quiz-comunidades');
      bloc.appendChild(lienCom);
    }
    if (res.resultado === 'fuera-zona') bloc.appendChild(creer('p', 'avq-zona', TXT_OTRA_PROVINCIA));
    bloc.appendChild(creer('p', 'avq-legal', TXT_LEGAL));

    var cta = creer('button', 'avq-cta', res.resultado === 'fuera-zona' ? 'Dejar mis datos' : 'Pedir mi estudio gratuito');
    cta.type = 'button';
    cta.setAttribute('data-cta', 'quiz-resultado');
    cta.addEventListener('click', function () { pedirEstudio(res); });
    bloc.appendChild(cta);
    ui.cuerpo.appendChild(bloc);
    animer();

    track('quiz_result', { resultado: res.resultado, proyecto: res.proyecto });
    ui.pregunta.focus();
  }

  function animer() {
    if (reduceMotion) return;
    ui.cuerpo.classList.remove('avq-entra');
    void ui.cuerpo.offsetWidth; // relance l'animation CSS
    ui.cuerpo.classList.add('avq-entra');
  }

  // =====================================================
  // Fin du parcours : préremplissage du formulaire ou redirection
  // =====================================================
  function valeurs(res) {
    return {
      proyecto: res.proyecto,
      tipo: respuestas.tipo || '',
      calefaccion: respuestas.calefaccion || '',
      provincia: respuestas.provincia || ''
    };
  }

  function normaliser(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }

  // Ne remplit qu'avec une valeur d'option existante (piso → otro si l'option
  // « Piso » n'existe pas dans ce formulaire).
  function remplir(id, valeur) {
    var el = document.getElementById(id);
    if (!el || el.disabled || !valeur) return;
    if (el.tagName === 'SELECT') {
      var essais = [valeur];
      if (id === 'tipo' && valeur === 'piso') essais.push('otro');
      for (var k = 0; k < essais.length; k++) {
        var n = normaliser(essais[k]);
        for (var i = 0; i < el.options.length; i++) {
          if (el.options[i].value && normaliser(el.options[i].value) === n) {
            el.value = el.options[i].value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
        }
      }
    } else if (id === 'provincia') {
      el.value = valeur;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function pedirEstudio(res) {
    var v = valeurs(res);
    var form = document.getElementById('contactForm');
    if (!form) {
      var q = new URLSearchParams();
      ['proyecto', 'tipo', 'calefaccion', 'provincia'].forEach(function (k) { if (v[k]) q.set(k, v[k]); });
      location.href = '/?' + q.toString() + '#contacto';
      return;
    }
    rendreFocus = false;
    fermer();
    ['proyecto', 'tipo', 'calefaccion', 'provincia'].forEach(function (k) { remplir(k, v[k]); });
    // On amène #nombre (avec son libellé) au centre de l'écran, puis le focus.
    var nombre = document.getElementById('nombre');
    var visible = nombre && !nombre.disabled && nombre.getClientRects().length > 0;
    var cible = visible ? (nombre.closest('.form-group') || nombre) : (document.getElementById('contacto') || form);
    cible.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: visible ? 'center' : 'start' });
    if (visible) {
      setTimeout(function () {
        // Signal pour site.js : focus posé par le script, pas un form_start.
        window.__avFocusAuto = true;
        try { nombre.focus({ preventScroll: true }); } catch (e) { /* sans importance */ }
        window.__avFocusAuto = false;
      }, reduceMotion ? 0 : 650);
    }
  }

  // =====================================================
  // Ouverture / fermeture
  // =====================================================
  function ouvrir(origen) {
    try {
      if (!dlg) construire();
      if (dlg.open) return;
      declencheur = document.activeElement;
      rendreFocus = true;
      respuestas = {};
      historial = [];
      document.documentElement.classList.add('avq-abierto');
      if (natif) dlg.showModal();
      else dlg.setAttribute('open', '');
      track('quiz_start', { origen: String(origen || 'desconocido').slice(0, 50) });
      afficherPas('tipo');
    } catch (e) {
      // En cas de problème, on n'empêche pas d'atteindre le formulaire.
      if (window.console) console.warn('[quiz]', e);
      var seccion = document.getElementById('contacto');
      if (seccion) seccion.scrollIntoView();
      else location.href = '/#contacto';
    }
  }

  function fermer() {
    if (!dlg) return;
    if (natif) { if (dlg.open) dlg.close(); }
    else dlg.removeAttribute('open');
    document.documentElement.classList.remove('avq-abierto');
    if (rendreFocus && declencheur && typeof declencheur.focus === 'function' && document.contains(declencheur)) {
      try { declencheur.focus({ preventScroll: true }); } catch (e) { declencheur.focus(); }
    }
    declencheur = null;
  }

  window.avQuizOpen = ouvrir;

  // Relais pour les pages sans site.js : tout [data-quiz-open] ouvre le quiz.
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented) return; // déjà traité (site.js)
    var t = e.target && e.target.closest ? e.target.closest('[data-quiz-open]') : null;
    if (!t) return;
    e.preventDefault();
    ouvrir(t.getAttribute('data-cta') || 'boton-quiz');
  });
})();
