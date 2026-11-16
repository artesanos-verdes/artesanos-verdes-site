/* Los Artesanos Verdes — Buscador de zona climática (CTE DB-HE, anejo B)
   Página : /blog/zona-climatica-buscador-cte/
   - JavaScript sin dependencias. No hace ninguna petición de red y no guarda nada:
     ni cookies, ni almacenamiento local, ni envío de lo que se escribe.
   - Datos : «Tabla a-Anejo B. Zonas climáticas» del Documento Básico HE, versión de 2019
     (Real Decreto 732/2019, BOE-A-2019-18528; la vigente, https://www.codigotecnico.org/pdf/Documentos/HE/DBHE.pdf).
     52 filas (50 provincias, Ceuta y Melilla), cotejadas tramo a tramo con la extracción
     del PDF oficial (16-11-2026).
   - Método : la zona sale directamente de la provincia y de la altitud del emplazamiento.
     No se usa la altitud de referencia de la capital de provincia (dato de versiones
     anteriores del DB-HE).
   - Formato : id → [nombre, trabajamos allí (1/0), [[altitud máxima del tramo en m
     (null = sin límite superior), zona], …]]. Cada tramo llega «hasta» su cota, incluida,
     y el siguiente empieza 1 m por encima (≤ 50 m, 51–100 m…), como en la tabla oficial.
*/
(function () {
  'use strict';

  var DATA = {
    "a-coruna": ["A Coruña", 0, [[200, "C1"], [null, "D1"]]],
    "albacete": ["Albacete", 0, [[450, "C3"], [950, "D3"], [null, "E1"]]],
    "alicante-alacant": ["Alicante/Alacant", 0, [[250, "B4"], [700, "C3"], [null, "D3"]]],
    "almeria": ["Almería", 0, [[100, "A4"], [250, "B4"], [400, "B3"], [800, "C3"], [null, "D3"]]],
    "araba-alava": ["Araba/Álava", 0, [[600, "D1"], [null, "E1"]]],
    "asturias": ["Asturias", 1, [[50, "C1"], [550, "D1"], [null, "E1"]]],
    "avila": ["Ávila", 1, [[550, "D2"], [850, "D1"], [null, "E1"]]],
    "badajoz": ["Badajoz", 0, [[400, "C4"], [450, "C3"], [null, "D3"]]],
    "barcelona": ["Barcelona", 0, [[250, "C2"], [450, "D2"], [750, "D1"], [null, "E1"]]],
    "bizkaia": ["Bizkaia", 0, [[250, "C1"], [null, "D1"]]],
    "burgos": ["Burgos", 1, [[600, "D1"], [null, "E1"]]],
    "caceres": ["Cáceres", 0, [[600, "C4"], [1050, "D3"], [null, "E1"]]],
    "cadiz": ["Cádiz", 0, [[150, "A3"], [450, "B3"], [600, "C3"], [850, "C2"], [null, "D2"]]],
    "cantabria": ["Cantabria", 1, [[150, "C1"], [650, "D1"], [null, "E1"]]],
    "castellon-castello": ["Castellón/Castelló", 0, [[100, "B3"], [500, "C3"], [600, "D3"], [1000, "D2"], [null, "E1"]]],
    "ceuta": ["Ceuta", 0, [[null, "B3"]]],
    "ciudad-real": ["Ciudad Real", 0, [[450, "C4"], [500, "C3"], [null, "D3"]]],
    "cordoba": ["Córdoba", 0, [[150, "B4"], [550, "C4"], [null, "D3"]]],
    "cuenca": ["Cuenca", 0, [[800, "D3"], [1050, "D2"], [null, "E1"]]],
    "gipuzkoa": ["Gipuzkoa", 0, [[400, "D1"], [null, "E1"]]],
    "girona": ["Girona", 0, [[100, "C2"], [600, "D2"], [null, "E1"]]],
    "granada": ["Granada", 0, [[50, "A4"], [350, "B4"], [600, "C4"], [800, "C3"], [1300, "D3"], [null, "E1"]]],
    "guadalajara": ["Guadalajara", 0, [[950, "D3"], [1000, "D2"], [null, "E1"]]],
    "huelva": ["Huelva", 0, [[50, "A4"], [150, "B4"], [350, "B3"], [800, "C3"], [null, "D3"]]],
    "huesca": ["Huesca", 0, [[200, "C3"], [400, "D3"], [700, "D2"], [null, "E1"]]],
    "illes-balears": ["Illes Balears", 0, [[250, "B3"], [null, "C3"]]],
    "jaen": ["Jaén", 0, [[350, "B4"], [750, "C4"], [1250, "D3"], [null, "E1"]]],
    "la-rioja": ["La Rioja", 0, [[200, "C2"], [700, "D2"], [null, "E1"]]],
    "las-palmas": ["Las Palmas", 0, [[350, "α3"], [750, "A2"], [1000, "B2"], [null, "C2"]]],
    "leon": ["León", 1, [[null, "E1"]]],
    "lleida": ["Lleida", 0, [[100, "C3"], [600, "D3"], [null, "E1"]]],
    "lugo": ["Lugo", 1, [[500, "D1"], [null, "E1"]]],
    "madrid": ["Madrid", 1, [[500, "C3"], [950, "D3"], [1000, "D2"], [null, "E1"]]],
    "malaga": ["Málaga", 0, [[100, "A3"], [300, "B3"], [700, "C3"], [null, "D3"]]],
    "melilla": ["Melilla", 0, [[null, "A3"]]],
    "murcia": ["Murcia", 0, [[100, "B3"], [550, "C3"], [null, "D3"]]],
    "navarra": ["Navarra", 0, [[100, "C2"], [350, "D2"], [600, "D1"], [null, "E1"]]],
    "ourense": ["Ourense", 1, [[150, "C3"], [300, "C2"], [800, "D2"], [null, "E1"]]],
    "palencia": ["Palencia", 1, [[800, "D1"], [null, "E1"]]],
    "pontevedra": ["Pontevedra", 0, [[350, "C1"], [null, "D1"]]],
    "salamanca": ["Salamanca", 1, [[850, "D2"], [null, "E1"]]],
    "santa-cruz-de-tenerife": ["Santa Cruz de Tenerife", 0, [[350, "α3"], [750, "A2"], [1000, "B2"], [null, "C2"]]],
    "segovia": ["Segovia", 1, [[1050, "D2"], [null, "E1"]]],
    "sevilla": ["Sevilla", 0, [[200, "B4"], [null, "C4"]]],
    "soria": ["Soria", 0, [[750, "D2"], [800, "D1"], [null, "E1"]]],
    "tarragona": ["Tarragona", 0, [[100, "B3"], [500, "C3"], [null, "D3"]]],
    "teruel": ["Teruel", 0, [[450, "C3"], [500, "C2"], [1000, "D2"], [null, "E1"]]],
    "toledo": ["Toledo", 0, [[500, "C4"], [null, "D3"]]],
    "valencia-valencia": ["Valencia/València", 0, [[50, "B3"], [500, "C3"], [950, "D2"], [null, "E1"]]],
    "valladolid": ["Valladolid", 1, [[800, "D2"], [null, "E1"]]],
    "zamora": ["Zamora", 1, [[800, "D2"], [null, "E1"]]],
    "zaragoza": ["Zaragoza", 0, [[200, "C3"], [650, "D3"], [null, "E1"]]]
  };

  var MSG_DISCLAIMER = 'Resultado orientativo según la tabla a-Anejo B del CTE DB-HE (versión de 2019). Para un trámite oficial, la zona la fija el técnico que firma el proyecto o el certificado.';
  var MSG_RES022 = 'Tu zona está entre las que admite la ficha RES022 del sistema CAE (aislamiento de desván no habitable, zonas C, D y E). El resto de requisitos se comprueba en el estudio técnico gratuito.';
  var CTA_URL = '/servicios/aislamiento-desvan/#contacto';
  var ALT_MIN = 0;
  var ALT_MAX = 3800;
  var NEAR = 50; // aviso si la altitud está a menos de 50 m de un cambio de tramo

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function strong(text) { return el('strong', null, text); }

  /* Altitud escrita por la persona : «735», «735 m», «1.050», «1,050», «735,5» → número.
     Un punto o una coma seguidos de tres cifras («1.050», «1,050») son separador de miles :
     una altitud de 1,05 m no tiene sentido. Con una o dos cifras («735,5») es decimal. */
  function parseAltitude(raw) {
    var s = String(raw || '').trim().toLowerCase()
      .replace(/\s+/g, '')
      .replace(/(metros|metro|m)\.?$/, '');
    if (!s) return { empty: true };
    if (/^[1-9]\d?[.,]\d{3}$/.test(s)) s = s.replace(/[.,]/, '');   // 1.050 / 1,050 → 1050
    s = s.replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(s)) return { invalid: true };
    return { value: Math.round(parseFloat(s)) };
  }

  function segMin(segs, i) { return i === 0 ? null : segs[i - 1][0] + 1; }

  function rangeText(segs, i) {
    var min = segMin(segs, i), max = segs[i][0];
    if (min === null && max === null) return 'cualquier altitud';
    if (min === null) return 'hasta ' + max + '\u00a0m';
    if (max === null) return 'desde ' + min + '\u00a0m';
    return 'de ' + min + ' a ' + max + '\u00a0m';
  }

  function findSeg(segs, h) {
    for (var i = 0; i < segs.length; i++) {
      if (segs[i][0] === null || h <= segs[i][0]) return i;
    }
    return segs.length - 1;
  }

  function badgeClass(letter) {
    return 'zc-badge zc-badge--' + (letter === 'α' ? 'alfa' : letter.toLowerCase());
  }

  function init() {
    var form = document.getElementById('zc-form');
    if (!form) return;
    var sel = document.getElementById('zc-provincia');
    var alt = document.getElementById('zc-altitud');
    var errProv = document.getElementById('zc-err-provincia');
    var errAlt = document.getElementById('zc-err-altitud');
    var out = document.getElementById('zc-resultado');

    function setError(field, box, msg) {
      box.textContent = msg || '';
      if (msg) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = sel.value;
      var parsed = parseAltitude(alt.value);
      var firstInvalid = null;

      if (!id || !DATA[id]) {
        setError(sel, errProv, 'Elige tu provincia.');
        firstInvalid = sel;
      } else {
        setError(sel, errProv, '');
      }

      if (parsed.empty) {
        setError(alt, errAlt, 'Escribe la altitud en metros, por ejemplo 735.');
        firstInvalid = firstInvalid || alt;
      } else if (parsed.invalid) {
        setError(alt, errAlt, 'Escribe solo la cifra en metros, por ejemplo 735.');
        firstInvalid = firstInvalid || alt;
      } else if (parsed.value < ALT_MIN || parsed.value > ALT_MAX) {
        setError(alt, errAlt, 'Escribe una altitud entre ' + ALT_MIN + ' y ' + ALT_MAX + ' metros.');
        firstInvalid = firstInvalid || alt;
      } else {
        setError(alt, errAlt, '');
      }

      if (firstInvalid) {
        out.textContent = '';
        firstInvalid.focus();
        return;
      }
      render(DATA[id], parsed.value);
    });

    function render(p, h) {
      var name = p[0], covered = p[1] === 1, segs = p[2];
      var i = findSeg(segs, h);
      var zone = segs[i][1];
      var letter = zone.charAt(0);
      var summer = zone.slice(1);

      out.textContent = '';

      // Cabecera : zona + desglose invierno / verano.
      // La zona va fuera del rótulo en mayúsculas : «α3» no debe convertirse en «Α3».
      out.appendChild(el('p', 'zc-result-label', 'Tu zona climática orientativa'));
      var head = el('div', 'zc-result-head');
      head.appendChild(el('span', badgeClass(letter), zone));
      var split = el('p', 'zc-result-split');
      split.appendChild(document.createTextNode('Invierno '));
      split.appendChild(strong(letter));
      split.appendChild(document.createTextNode(' (de α a E) · Verano '));
      split.appendChild(strong(summer));
      split.appendChild(document.createTextNode(' (de 1 a 4)'));
      head.appendChild(split);
      out.appendChild(head);

      // Tramo aplicado
      var detail = el('p', 'zc-result-detail');
      if (segs.length === 1) {
        detail.appendChild(document.createTextNode('En ' + name + ', la tabla del anejo B asigna la zona '));
        detail.appendChild(strong(zone));
        detail.appendChild(document.createTextNode(' a cualquier altitud.'));
      } else {
        detail.appendChild(document.createTextNode(name + ', a ' + h + ' m: tramo '));
        detail.appendChild(strong(rangeText(segs, i)));
        detail.appendChild(document.createTextNode(' de la tabla del anejo B.'));
      }
      out.appendChild(detail);

      // Aviso si está cerca de un cambio de tramo
      var near = [];
      if (segs[i][0] !== null && segs[i][0] - h < NEAR) {
        near.push('a partir de ' + (segs[i][0] + 1) + ' m la zona pasa a ser ' + segs[i + 1][1]);
      }
      if (i > 0 && h - segMin(segs, i) < NEAR) {
        near.push('por debajo de ' + segMin(segs, i) + ' m es ' + segs[i - 1][1]);
      }
      if (near.length) {
        out.appendChild(el('p', 'zc-warn', 'Estás cerca de un cambio de zona: ' + near.join(' y ') +
          '. La tabla se aplica con la altitud del emplazamiento, así que conviene confirmar la cota exacta de tu casa.'));
      }

      // Escala completa de la provincia
      if (segs.length > 1) {
        var parts = [];
        for (var k = 0; k < segs.length; k++) parts.push(segs[k][1] + ' ' + rangeText(segs, k));
        out.appendChild(el('p', 'zc-result-scale', 'Zonas de ' + name + ' según la altitud: ' + parts.join(' · ') + '.'));
      }

      out.appendChild(el('p', 'zc-disclaimer', MSG_DISCLAIMER));

      // Mensaje sobre el sistema CAE
      var inCDE = letter === 'C' || letter === 'D' || letter === 'E';
      var box = el('div', 'zc-cae' + (inCDE && covered ? '' : ' zc-cae--neutral'));
      if (inCDE && covered) {
        box.appendChild(el('p', null, MSG_RES022));
        var a = el('a', 'av-cta-button', 'Solicitar el estudio gratuito →');
        a.href = CTA_URL;
        box.appendChild(a);
      } else if (inCDE) {
        box.appendChild(el('p', null, 'Tu zona está entre las que contempla la ficha RES022 del sistema CAE (zonas C, D y E). ' +
          'Pero nosotros solo trabajamos en 13 provincias del norte y del centro de España, y ' + name +
          ' no está entre ellas. Para aislar tu desván con el sistema CAE, consulta a una empresa instaladora de tu zona.'));
      } else {
        box.appendChild(el('p', null, 'La ficha RES022 del sistema CAE (aislamiento de desván) solo se aplica en las zonas climáticas C, D y E. ' +
          'En tu zona, el aislamiento del desván no entra en el sistema CAE por esta vía. Aislar puede seguir teniendo sentido, pero no con esta ficha.'));
      }
      out.appendChild(box);

      out.focus();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
