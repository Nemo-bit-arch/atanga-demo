/* =====================================================================
   Atanga · logique de la page : l'ardoise, le carnet à souche, les terrasses.
   Le moteur scroll-craft pilote le défilement ; ce fichier ne le touche pas.
   ===================================================================== */
(function () {
  'use strict';

  // À RENSEIGNER par le restaurant : numéro WhatsApp de commande, format international sans « + »
  // (exemple : 241XXXXXXXX). Vide : WhatsApp s'ouvre et laisse choisir le destinataire.
  var WHATSAPP = '';
  var ZONE = 'Africa/Libreville';
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  // Un total s'écrit toujours en francs ; seule une ligne à zéro devient « offert » (fcfa, ci-dessous).
  var montant = function (n) { return n.toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' FCFA'; };
  var fcfa = function (n) { return n === 0 ? 'offert' : n.toLocaleString('fr-FR').replace(/ | /g, ' ') + ' FCFA'; };

  /* ------------------------------------------------------------------
     L'heure de Libreville
     ------------------------------------------------------------------ */
  function maintenant() {
    var p = new Intl.DateTimeFormat('fr-FR', { timeZone: ZONE, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
    var jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    return { jour: jours.indexOf(o.weekday), nomJour: o.weekday, date: o.day + ' ' + o.month, h: +o.hour, m: +o.minute };
  }
  var heureTexte = function (h, m) { return h + ' h' + (m ? ' ' + String(m).padStart(2, '0') : ''); };
  function horloges() {
    var t = maintenant();
    $$('[data-horloge]').forEach(function (el) { el.textContent = t.nomJour + ' ' + t.date + ' · ' + heureTexte(t.h, t.m); });
    terrasses(t);
  }

  /* ------------------------------------------------------------------
     Les terrasses : ouvertes en ce moment ?
     Horaires d'exemple (à confirmer, voir textes.md). Minutes depuis minuit.
     ------------------------------------------------------------------ */
  var HORAIRES = {
    bord: { jours: [0, 2, 3, 4, 5, 6], plages: [[18 * 60, 24 * 60 + 30]] },
    angondje: { jours: [0, 1, 2, 3, 4, 5, 6], plages: [[12 * 60, 15 * 60], [18 * 60 + 30, 23 * 60]] }
  };
  var NOMS_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  function etatTerrasse(def, t) {
    var mn = t.h * 60 + t.m;
    // ouverte maintenant ? (y compris une plage de la veille qui déborde après minuit)
    for (var d = 0; d <= 1; d++) {
      var jour = (t.jour - d + 7) % 7;
      if (def.jours.indexOf(jour) < 0) continue;
      for (var i = 0; i < def.plages.length; i++) {
        var a = def.plages[i][0] - d * 1440, b = def.plages[i][1] - d * 1440;
        if (mn >= a && mn < b) { var f = def.plages[i][1] % 1440; return { ouvert: true, txt: 'Ouvert · ferme à ' + heureTexte(Math.floor(f / 60), f % 60) }; }
      }
    }
    // prochaine ouverture sur sept jours
    for (var k = 0; k < 8; k++) {
      var j = (t.jour + k) % 7;
      if (def.jours.indexOf(j) < 0) continue;
      for (var q = 0; q < def.plages.length; q++) {
        var deb = def.plages[q][0];
        if (k === 0 && deb <= mn) continue;
        var quand = k === 0 ? '' : (k === 1 ? 'demain ' : NOMS_JOURS[j] + ' ');
        return { ouvert: false, txt: 'Fermé · ouvre ' + quand + 'à ' + heureTexte(Math.floor(deb / 60), deb % 60) };
      }
    }
    return { ouvert: false, txt: 'Fermé' };
  }
  function terrasses(t) {
    var ouvertes = 0;
    Object.keys(HORAIRES).forEach(function (cle) {
      var li = $('[data-terrasse="' + cle + '"]'); if (!li) return;
      var e = etatTerrasse(HORAIRES[cle], t), el = $('[data-etat]', li);
      if (e.ouvert) ouvertes++;
      el.textContent = e.txt; el.classList.toggle('ouvert', e.ouvert); el.classList.toggle('ferme', !e.ouvert);
    });
    var d = $('[data-direct]');
    if (d) d.innerHTML = 'Il est <strong>' + heureTexte(t.h, t.m) + '</strong> à Libreville. ' +
      (ouvertes === 0 ? 'Nos terrasses sont fermées pour l’instant ; le fût voyageur reste à votre disposition.'
        : (ouvertes === 1 ? '<strong>Une terrasse</strong> vous accueille en ce moment.' : '<strong>Deux terrasses</strong> vous accueillent en ce moment.'));
  }

  /* ------------------------------------------------------------------
     L'ardoise : onglets (planches) et photo polaroid
     ------------------------------------------------------------------ */
  var planches = $$('.planche');
  function choisirPlanche(btn, focus) {
    planches.forEach(function (b) {
      var on = b === btn;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      document.getElementById(b.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) btn.focus();
    var premier = $('#' + btn.getAttribute('aria-controls') + ' .plat');
    if (premier) montrerPhoto(premier);
  }
  planches.forEach(function (b, i) {
    b.addEventListener('click', function () { choisirPlanche(b); });
    b.addEventListener('keydown', function (e) {
      var n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (e.key === 'Home') { e.preventDefault(); choisirPlanche(planches[0], true); }
      if (e.key === 'End') { e.preventDefault(); choisirPlanche(planches[planches.length - 1], true); }
      if (n) { e.preventDefault(); choisirPlanche(planches[(i + n + planches.length) % planches.length], true); }
    });
  });

  var polaroid = $('[data-polaroid-img]'), photoActuelle = polaroid ? polaroid.getAttribute('src') : '';
  function montrerPhoto(plat) {
    $$('.plat.survol').forEach(function (p) { p.classList.remove('survol'); });
    plat.classList.add('survol');
    var src = plat.getAttribute('data-photo');
    if (!polaroid || !src || src === photoActuelle) return;
    photoActuelle = src;
    if (reduit) { polaroid.src = src; return; }
    polaroid.classList.add('change');
    var img = new Image(); img.onload = img.onerror = function () { polaroid.src = src; polaroid.classList.remove('change'); };
    img.src = src;
  }
  $$('.plat').forEach(function (p) {
    p.addEventListener('mouseenter', function () { montrerPhoto(p); });
    p.addEventListener('focusin', function () { montrerPhoto(p); });
  });

  /* ------------------------------------------------------------------
     Le carnet : la commande
     ------------------------------------------------------------------ */
  var commande = []; // { id, nom, prix, qte }
  try { commande = JSON.parse(sessionStorage.getItem('atanga-carnet') || '[]') || []; } catch (e) { commande = []; }
  // On ne reprend du stockage que des lignes qui correspondent à un plat de l'ardoise.
  commande = (Array.isArray(commande) ? commande : []).map(function (l) {
    var p = l && document.querySelector('.plat[data-plat="' + String(l.id).replace(/[^a-z]/g, '') + '"]');
    return p ? { id: p.getAttribute('data-plat'), nom: p.querySelector('.plat__nom').childNodes[0].textContent.trim(), prix: +p.getAttribute('data-prix'), qte: Math.max(1, Math.min(20, parseInt(l.qte, 10) || 1)) } : null;
  }).filter(Boolean);
  var sauver = function () { try { sessionStorage.setItem('atanga-carnet', JSON.stringify(commande)); } catch (e) { /* stockage indisponible : la commande vit en mémoire */ } };

  function ligneHTML(l, nouvelle, avecRayer) {
    var li = document.createElement('li');
    li.className = 'ligne' + (nouvelle && !reduit ? ' ecrit' : '');
    li.innerHTML = '<span class="ligne__qte">' + l.qte + '×</span><span class="ligne__nom"></span>' +
      (avecRayer ? '<button class="rayer" type="button"></button>' : '<span></span>');
    $('.ligne__nom', li).textContent = l.nom;
    if (avecRayer) {
      var r = $('.rayer', li);
      r.setAttribute('aria-label', 'Rayer une portion : ' + l.nom);
      r.addEventListener('click', function () { retirer(l.id); });
    }
    return li;
  }
  function rendre(nouvelId) {
    var total = commande.reduce(function (s, l) { return s + l.prix * l.qte; }, 0);
    var nb = commande.reduce(function (s, l) { return s + l.qte; }, 0);
    var listes = [[$('[data-lignes]'), true], [$('[data-lignes-addition]'), true], [$('[data-lignes-carbone]'), false]];
    listes.forEach(function (x) {
      if (!x[0]) return; x[0].innerHTML = '';
      commande.forEach(function (l) { x[0].appendChild(ligneHTML(l, l.id === nouvelId, x[1])); });
    });
    $('[data-vide]').hidden = commande.length > 0;
    $('[data-vide-addition]').hidden = commande.length > 0;
    $('[data-total-zone]').hidden = commande.length === 0;
    $('[data-total]').textContent = montant(total);
    $('[data-total-addition]').textContent = montant(total);
    $('[data-resume]').textContent = nb === 0 ? 'vierge' : nb + (nb > 1 ? ' plats · ' : ' plat · ') + montant(total);
    $$('.plat').forEach(function (p) {
      var b = $('.pique', p), dr = $('.pique__drapeau', p), dans = commande.some(function (l) { return l.id === p.getAttribute('data-plat'); });
      b.setAttribute('aria-pressed', dans ? 'true' : 'false'); dr.textContent = dans ? 'Noté' : 'Je le prends';
    });
    sauver();
  }
  function ajouter(plat) {
    var id = plat.getAttribute('data-plat'), l = commande.find(function (x) { return x.id === id; });
    if (l) l.qte++; else commande.push({ id: id, nom: $('.plat__nom', plat).childNodes[0].textContent.trim(), prix: +plat.getAttribute('data-prix'), qte: 1 });
    rendre(id);
  }
  function retirer(id) {
    var l = commande.find(function (x) { return x.id === id; }); if (!l) return;
    l.qte--; if (l.qte <= 0) commande = commande.filter(function (x) { return x.id !== id; });
    rendre();
  }
  $$('.plat').forEach(function (p) {
    $('.pique', p).addEventListener('click', function () { ajouter(p); montrerPhoto(p); });
  });

  /* L'onglet du carnet sur téléphone */
  var onglet = $('.carnet__onglet'), carnet = $('#carnet');
  if (onglet) onglet.addEventListener('click', function () {
    var ouvert = carnet.classList.toggle('ouvert'); onglet.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
  });
  $$('.carnet__chapitres a, [data-vers-addition]').forEach(function (a) {
    a.addEventListener('click', function () { if (carnet.classList.contains('ouvert')) { carnet.classList.remove('ouvert'); onglet.setAttribute('aria-expanded', 'false'); } });
  });

  /* ------------------------------------------------------------------
     Les chapitres se cochent au crayon, au fil de la soirée
     ------------------------------------------------------------------ */
  var liens = {}; $$('[data-chap]').forEach(function (a) { liens[a.getAttribute('data-chap')] = a; });
  var vus = {};
  function suivreChapitres() {
    // Le chapitre en cours est celui qui passe au milieu de l'écran ; ceux qui le précèdent sont lus.
    // On ne coche rien d'après la seule position des sections : le moteur allonge les actes après
    // le chargement, et une section encore courte paraîtrait déjà dépassée.
    var milieu = innerHeight * 0.45, actuel = null, sections = $$('[data-chapitre]'), rang = -1;
    sections.forEach(function (s, i) {
      var r = s.getBoundingClientRect();
      if (r.top <= milieu && r.bottom > milieu) { actuel = s.getAttribute('data-chapitre'); rang = i; }
    });
    sections.forEach(function (s, i) { if (i <= rang) vus[s.getAttribute('data-chapitre')] = true; });
    Object.keys(liens).forEach(function (k) {
      liens[k].classList.toggle('coche', !!vus[k]);
      liens[k].classList.toggle('actuel', k === actuel);
      if (k === actuel) liens[k].setAttribute('aria-current', 'location'); else liens[k].removeAttribute('aria-current');
    });
    var add = $('#addition').getBoundingClientRect();
    document.body.classList.toggle('addition-visible', add.top < innerHeight * 0.6);
  }
  var attente = false;
  addEventListener('scroll', function () { if (!attente) { attente = true; requestAnimationFrame(function () { attente = false; suivreChapitres(); }); } }, { passive: true });
  addEventListener('resize', suivreChapitres);

  /* ------------------------------------------------------------------
     L'envoi : la feuille se détache, le double reste (geste signature)
     ------------------------------------------------------------------ */
  var bloc = $('.bloc'), note = $('[data-note]');
  function messageCommande() {
    var lignes = commande.map(function (l) { return l.qte + ' × ' + l.nom + (l.prix ? ' (' + fcfa(l.prix * l.qte) + ')' : ''); });
    var total = commande.reduce(function (s, l) { return s + l.prix * l.qte; }, 0);
    return 'Bonjour Atanga, je souhaiterais commander pour ce soir :\n' + lignes.join('\n') +
      '\nTotal indiqué : ' + montant(total) + '.\nMerci de me confirmer l’heure de retrait.';
  }
  var urlWhatsApp = function (texte) { return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(texte); };
  $('[data-envoyer]').addEventListener('click', function () {
    if (!commande.length) {
      note.textContent = 'Choisissez d’abord vos plats sur l’ardoise.';
      return;
    }
    var url = urlWhatsApp(messageCommande());
    bloc.classList.add('envoye');
    note.textContent = 'La feuille est partie en cuisine. Le double reste avec vous.';
    window.open(url, '_blank', 'noopener');
  });
  $$('[data-reserver]').forEach(function (a) {
    a.setAttribute('href', urlWhatsApp('Bonjour Atanga, je souhaiterais réserver une table (' + a.getAttribute('data-reserver') + ') pour ce soir. Combien de couverts pouvez-vous m’accueillir, et à quelle heure ?'));
    a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener');
  });

  var borne = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ------------------------------------------------------------------
     La rangée qui se balaie de gauche à droite. Le doigt et le pavé tactile utilisent le
     défilement natif (aimanté sur chaque élément) ; ce code ajoute le glisser à la souris, les
     flèches du clavier, et annonce l'avancée (0 à 1) à l'objet qui la montre.
     ------------------------------------------------------------------ */
  function rangee(rail, quandAvance) {
    var elements = Array.prototype.slice.call(rail.children);
    var doux = reduit ? 'auto' : 'smooth';
    function max() { return Math.max(0, rail.scrollWidth - rail.clientWidth); }
    function positions() {
      var marge = parseFloat(getComputedStyle(rail).scrollPaddingLeft) || 0, m = max();
      return elements.map(function (el) { return borne(el.offsetLeft - marge, 0, m); });
    }
    function poser(x) { rail.scrollTo({ left: x, behavior: doux }); }
    function vers(el) { poser(borne(el.offsetLeft - (parseFloat(getComputedStyle(rail).scrollPaddingLeft) || 0), 0, max())); }
    function aller(sens) {
      var p = positions(), x = rail.scrollLeft, i;
      if (sens > 0) { for (i = 0; i < p.length; i++) if (p[i] > x + 4) return poser(p[i]); return poser(max()); }
      for (i = p.length - 1; i >= 0; i--) if (p[i] < x - 4) return poser(p[i]);
      poser(0);
    }

    var prevu = false;
    function suivre() {
      prevu = false;
      var m = max(), avance = m > 1 ? borne(rail.scrollLeft / m, 0, 1) : 0;
      rail.classList.toggle('au-debut', avance < 0.01);
      rail.classList.toggle('au-bout', avance > 0.99);
      if (quandAvance) quandAvance(avance);
    }
    rail.addEventListener('scroll', function () { if (!prevu) { prevu = true; requestAnimationFrame(suivre); } }, { passive: true });
    window.addEventListener('resize', suivre);

    // La souris : on attrape la rangée et on la fait glisser ; au relâcher, elle se pose sur
    // l'élément suivant dans le sens du geste.
    var prise = null, jeton = 0;
    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      prise = { x: e.clientX, depart: rail.scrollLeft, bouge: false };
    });
    window.addEventListener('pointermove', function (e) {
      if (!prise) return;
      var dx = e.clientX - prise.x;
      if (!prise.bouge && Math.abs(dx) > 6) { prise.bouge = true; jeton++; rail.classList.add('tire'); }
      if (prise.bouge) rail.scrollLeft = prise.depart - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!prise) return;
      var geste = prise; prise = null;
      if (!geste.bouge) return;
      // Le clic qui suit un glisser ne doit pas retourner le sous-verre resté sous la souris.
      var bloque = function (ev) { ev.preventDefault(); ev.stopPropagation(); };
      rail.addEventListener('click', bloque, true);
      setTimeout(function () { rail.removeEventListener('click', bloque, true); }, 0);
      var p = positions(), x = rail.scrollLeft, sens = x - geste.depart, cible = p[0], i;
      if (sens > 30) { cible = max(); for (i = 0; i < p.length; i++) if (p[i] >= x - 2) { cible = p[i]; break; } }
      else if (sens < -30) { cible = 0; for (i = p.length - 1; i >= 0; i--) if (p[i] <= x + 2) { cible = p[i]; break; } }
      else p.forEach(function (v) { if (Math.abs(v - x) < Math.abs(cible - x)) cible = v; });
      // L'aimant reste coupé jusqu'à l'arrivée, sinon il ferait sauter la rangée en cours de route.
      // Le jeton empêche une fin en retard de rallumer l'aimant pendant le glisser suivant.
      var mien = jeton;
      var finir = function () {
        rail.removeEventListener('scrollend', finir);
        if (mien === jeton) rail.classList.remove('tire');
      };
      rail.addEventListener('scrollend', finir);
      setTimeout(finir, 700);
      poser(cible);
    });
    rail.addEventListener('dragstart', function (e) { e.preventDefault(); });

    // Le clavier : la rangée a le focus, les flèches avancent d'un élément.
    rail.addEventListener('keydown', function (e) {
      if (e.target !== rail) return;
      var k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); aller(k); }
      else if (e.key === 'Home') { e.preventDefault(); poser(0); }
      else if (e.key === 'End') { e.preventDefault(); poser(max()); }
    });

    suivre();
    return { aller: aller, vers: vers };
  }

  /* La ficelle de raphia : chaque nœud mène à son portrait ; un nœud se serre quand au moins
     60 % de son portrait est visible (au bureau, plusieurs à la fois). */
  var railMains = $('[data-rangee]'), ficelle = $('[data-ficelle]');
  if (railMains && ficelle) {
    var noeuds = $$('[data-noeud]', ficelle), portraits = $$('.main-item', railMains);
    var mains = rangee(railMains, function () {
      var droite = parseFloat(getComputedStyle(railMains).scrollPaddingRight) || 0;
      var x = railMains.scrollLeft, w = railMains.clientWidth - droite;
      portraits.forEach(function (c, i) {
        var g = c.offsetLeft - x, d = g + c.offsetWidth;
        var vu = Math.max(0, Math.min(d, w) - Math.max(g, 0));
        if (noeuds[i]) noeuds[i].classList.toggle('serre', vu >= c.offsetWidth * 0.6);
      });
    });
    noeuds.forEach(function (n, i) { n.addEventListener('click', function () { mains.vers(portraits[i]); }); });
  }

  rendre();
  horloges();
  setInterval(horloges, 30000);
  suivreChapitres();
})();
