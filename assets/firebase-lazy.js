/* Chargement différé du SDK Firebase (~280 Ko) : le SDK ne sert qu'à l'envoi
   du formulaire, on ne le télécharge donc que lorsque le visiteur s'en
   approche (ou interagit avec lui), au lieu de bloquer la première visite.
   Contrat conservé : window.__firestore + événement 'firebase-ready', que
   handleSubmit (site.js) attend déjà jusqu'à 10 s. */
(function () {
  var promesse = null;

  function loadFirebase() {
    if (promesse) return promesse;
    promesse = Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js')
    ]).then(function (mods) {
      var appMod = mods[0], fsMod = mods[1];
      var app = appMod.initializeApp({
        apiKey: 'AIzaSyAgYXJhKGUVOr_esrI0kbs4_1IKePJAUHg',
        authDomain: 'artesanos-verdes-site.firebaseapp.com',
        projectId: 'artesanos-verdes-site',
        storageBucket: 'artesanos-verdes-site.firebasestorage.app',
        messagingSenderId: '113919847755',
        appId: '1:113919847755:web:c2b7c47669066ef17e4cce',
        measurementId: 'G-1B5SEEEMJP'
      });
      window.__firestore = {
        db: fsMod.getFirestore(app),
        collection: fsMod.collection,
        addDoc: fsMod.addDoc,
        serverTimestamp: fsMod.serverTimestamp
      };
      window.dispatchEvent(new Event('firebase-ready'));
    }).catch(function (err) {
      promesse = null; // autoriser une nouvelle tentative au prochain déclencheur
      console.error('[firebase-lazy]', err);
    });
    return promesse;
  }

  var form = document.getElementById('contactForm');
  var seccion = document.getElementById('contacto');
  if (!form && !seccion) return;

  // 1. le visiteur approche du formulaire (800px d'avance)
  if (seccion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entradas) {
      if (entradas[0].isIntersecting) { loadFirebase(); io.disconnect(); }
    }, { rootMargin: '800px 0px' });
    io.observe(seccion);
  } else {
    loadFirebase(); // très vieux navigateurs : comportement d'origine
  }

  if (form) {
    // 2. première interaction avec le formulaire
    form.addEventListener('focusin', loadFirebase, { once: true });
    // 3. filet de sécurité : l'envoi lui-même (handleSubmit attend jusqu'à 10 s)
    form.addEventListener('submit', loadFirebase, true);
  }
})();
