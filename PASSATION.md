# Passation — travail de la session locale « refonte lot 1 » (14 → 30/10/2026), jamais publié

Ce travail a été fait en parallèle de la session « amélioration site artesanos verdes ». Il n'est PAS sur `main`.
Il est archivé sur la branche **`archive/refonte-lot-1`** (partie de `main` du 27/10, commit 5dfa893 — donc AVANT vos lots 2, 3, 4, les 49 articles et la page `/servicios/comunidades-de-propietarios/`).

**Ne fusionnez pas la branche entière** : elle a divergé de `main`. Récupérez les éléments utiles un par un :
`git fetch origin && git checkout origin/archive/refonte-lot-1 -- <chemin>` puis adaptez au `main` actuel (liens, gabarit, ?v= de cache), ou lisez le diff : `git diff origin/main origin/archive/refonte-lot-1 -- <chemin>`.

⚠️ **Test du formulaire** : en local, le formulaire écrit dans le Firestore de PRODUCTION et déclenche les e-mails. Ne jamais l'envoyer pour tester ; simuler `window.__firestore` (le script de test utilisé ici bloquait Firebase/Google et remplaçait `addDoc` par un faux).

---

## 1. À récupérer en priorité (bugs réels, vérifiés)
1. **Bug mobile** : sur mobile, la page s'élargissait à **694 px au lieu de 390** → barre CTA et bouton WhatsApp hors écran. Cause : `backdrop-filter` sur `<nav>` + panneau `.nav-links` en `position:fixed; transform`. Correctif dans `assets/site.css` : `html,body{overflow-x:clip}` et flou déplacé sur `nav::before`. **Vérifier d'abord si c'est toujours le cas sur `main`** (mesurer `innerWidth` en 390×844 mobile).
2. **Carte d'offre Desván recouverte** par la section suivante (légende ENAC masquée) : ordre/spécificité `.offer-card--static` vs `.offer-card` dans `site.css`.
3. **Contenu invisible sans JavaScript** : `.reveal{opacity:0}` sans condition → `.js .reveal` + script `document.documentElement.classList.add('js')` en tête de `<head>` + `prefers-reduced-motion`.
4. **Bouton CTA des articles illisible** (vert sur vert) : spécificité `.av-content a` vs `.av-cta-button` dans `blog.css` ; tableaux du blog qui débordent sur mobile (`.av-table-scroll`).
5. **Conversion Google Ads faussée** : `generate_lead` était envoyé AVANT l'enregistrement Firestore → déplacé après le succès (`assets/site.js`). **Le schéma du document `leads` n'a pas changé** (mêmes clés).
6. **Détection « visiteur Ads »** activée par `utm_source=google` seul (un lien de fiche Google masquait la nav) → seulement gclid/gbraid/wbraid ou `utm_medium` cpc/ppc/paid.

## 2. Améliorations prêtes (fichiers sur la branche d'archive)
- `assets/tracking.js` : suivi commun à toutes les pages (clics tél./WhatsApp/mail/CTA avec emplacement `data-cta`, attribution de la visite en sessionStorage `av_attrib`), garde GA désactivée hors `artesanosverdes.com`.
- `assets/site.js` : panneau de confirmation après envoi (référence + « envíenos fotos por WhatsApp »), panneau d'échec sans redirection mailto, avertissement « calefacción eléctrica » pour aerotermia/aire-aire, `#provincia` en liste des 13 provinces, préremplissage par URL `?proyecto=&provincia=`, vouvoiement si `<form data-tratamiento="usted">`.
- `assets/quiz.js` + `assets/quiz.css` : test d'orientation « ¿Qué solución encaja con tu casa? » (aucun montant, résultat « orientativo »).
- Barre d'action mobile 3 boutons (Llamar · WhatsApp · Estudio gratuito) sur toutes les pages.
- `404.html` de marque (GitHub Pages l'affiche automatiquement) et hub `/servicios/index.html`.
- Brochure Comunidades alignée en PDF : `assets/comunidades/propuesta-comunidades-artesanos-verdes.pdf` (source : `assets/comunidades/propuesta/index.html`) — formule validée, sans « sin coste » ni ACERMI, page « Materiales que instalamos », ejemplo real. Validée par Jonathan pour le téléchargement : à lier depuis `/servicios/comunidades-de-propietarios/`.
- Articles (vérifiés sur BOE/MITECO/CTE ; **contrôler les doublons avec vos 49 articles avant de reprendre**) : `blog/zona-climatica-buscador-cte/` (outil interactif + `blog/assets/zona-climatica-buscador-cte.{js,css,svg}`), `blog/aerotermia-con-radiadores/`, `blog/aislamiento-insuflado-problemas/`, `blog/quien-es-quien-sistema-cae/`, `blog/aislar-cubierta-edificio-viviendas/`, `blog/guia-administradores-fincas-aislamiento-cubierta/`.
- `blog/deduccion-irpf-eficiencia-energetica-2026/` : rédigé, **non publié — à faire valider par l'asesor fiscal** (échéance des déductions 20/40 % au 31/12/2026).

## 3. Corrections de conformité déjà faites ici (à vérifier/reporter sur `main`)
- Infographies `blog/assets/metodo-infografia.svg` et `cae-vs-sin-cae-infografia.svg` : montants retirés (« Tú pagas 1 € », « 3 149 € », « +600-1 200 €/año », « Hasta 30% », « 500+ viviendas ») ; `blog/assets/antes-despues.jpg` recadré sans le bandeau « AHORROS HASTA UN 30% ».
- `que-es-el-cae` : « No tributa » retiré (prudence fiscale, renvoi à l'asesor) ; GreenFlex ne « vérifie » pas l'économie (c'est une entité accréditée par ENAC).
- Référence BOE du **RD 36/2023 = BOE-A-2023-2027** (BOE-A-2023-1866 pointe vers un autre texte).
- León capitale = zone **E1** (pas D1) ; Soria hors des 13 provinces.
- « hasta el 100 % » remplacé par la formule validée.
- Formule feu TETRIS complète partout où ses specs apparaissent.
- Politiques cookies/confidentialité : mode de consentement **avancé documenté** (pings sans cookies, `av_cookie_consent` 12 mois, `av_attrib`, Google Fonts) ; choix expirant après 365 jours. Textes à faire valider par le conseil RGPD.

## 4. Décisions de Jonathan (à respecter)
- 28/10 : témoignages (« Opiniones reales ») et mur de logos des obligados **gardés tels quels** ; carte d'offre Desván : **« Gran parte »** au lieu du « 100 % » géant ; cookies : mode avancé **documenté**.
- 28/10 (comunidades) : **jamais « sin coste » / « coste cero » / « ningún pago »** sur le site → formule validée : « La financiación privada del sistema CAE puede cubrir gran parte de la inversión; en determinados casos, la actuación puede quedar cubierta al 100 %. » + « Importe sujeto a estudio técnico previo y a la normativa CAE vigente (RD 36/2023). Primas sujetas a verificación del ahorro por una entidad acreditada por ENAC. » ; pas d'ACERMI ; « ejemplo real » (−93 %, −29 %, −27 %, F → E, vivienda de 204 m²) publiable avec son avertissement complet ; brochure PDF alignée à proposer en téléchargement.
- Isolants du desván (source : CRM, `documentos.html`) : **Isolene 4 (ISOVER)** soufflé 220 mm R 4,75 (300 mm R 6,50) λ 0,046 ; **Supafil Loft 045 (Knauf Insulation)** soufflé 225 mm R 5,00 λ 0,045 ; **Volcalis EASY** rouleau kraft 280 mm R 7,00 λ 0,040. Pas de réaction au feu affichée de façon sélective (le CRM ne l'écrit pour aucun).

## 5. Règles de rédaction (procédure Consumo/MITECO INF0011/26)
Le CAE est une **financiación privada** : jamais « subvención/ayuda pública » pour le CAE (sauf pour dire qu'il n'en est pas une), jamais « gratis » (sauf « estudio gratuito »), aucun montant de prime, pas de « 1 € », pas de % d'économie généralisé ; ENAC accrédite les vérificateurs ; fichas espagnoles RES022 / RES010 / RES060, jamais de références françaises ; seul délégataire nommable : GreenFlex ; aire-aire sans eau chaude sanitaire ; chauffage électrique exclu pour les pompes à chaleur ; ne jamais inventer d'avis, de chiffre, de délai ou de garantie.
