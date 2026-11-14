/* n0eyes — site etkileşimleri (bağımlılık yok) */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  I18N.apply(I18N.initial());
  document.querySelectorAll('.lang').forEach(b => b.addEventListener('click', () => I18N.apply(I18N.lang === 'tr' ? 'en' : 'tr')));
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- NAV ---------- */
  const nav = $('#nav');
  const onScrollNav = () => nav.classList.toggle('is-scrolled', scrollY > 40);
  addEventListener('scroll', onScrollNav, { passive: true }); onScrollNav();
  const burger = $('#burger');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('is-open'); document.body.style.overflow = '';
  }));
  // logo: sayfayı yeniden yüklemeden başa dön, adres çubuğunda # kalmasın
  $('#brandHome').addEventListener('click', (e) => {
    e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', location.pathname + location.search);
  });

  /* ---------- INTRO: kare dizisi canvas'ta; kaydırdıkça akar; bitince site "bir anda" açılır ---------- */
  const intro = $('#intro'), spacer = $('#introSpacer'), loader = $('#introLoader');
  const canvas = $('#introCanvas'), ctx = canvas.getContext('2d', { alpha: false });
  const caption = $('#introCaption'), captionText = $('span', caption), bar = $('#introBar');
  const N = +canvas.dataset.frames;
  // veri tasarrufu / yavas ag (Save-Data, 2g/3g): 2x kare yok, karelerin yarisi (cizim en yakin kareyi kullanir)
  const yavas = (() => { const c = navigator.connection; return !!(c && (c.saveData || /(^|-)2g$|^3g$/.test(c.effectiveType || ''))); })();
  const atla = (i, n) => yavas && i % 2 === 1 && i !== n - 1;
  const retina = !yavas && (innerWidth * Math.min(devicePixelRatio || 1, 2)) > 1500;      // geniş/retina ekranda yüksek çözünürlük
  const SRC = (retina && canvas.dataset.src2x) || canvas.dataset.src;
  const frames = new Array(N).fill(null);
  let loaded = 0, drawn = -1, opened = false, lastCap = -1, target = 0, current = 0;
  const qs = new URLSearchParams(location.search);
  const hp = qs.get('hp');

  // --- yükleme: ilk 30 kare öncelikli, sonra kalan; 6 paralel istek ---
  const src = (i) => SRC.replace('{i}', String(i + 1).padStart(4, '0'));
  const loadFrame = (i) => new Promise((res) => {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => { frames[i] = im; loaded++; res(); };
    im.onerror = () => res();
    im.src = src(i);
  });
  const queue = [...Array(N).keys()].filter(i => !atla(i, N));
  // öncelik: 0..29 sırayla, sonra kalanlar her 4'te bir (kaba önizleme), sonra hepsi
  const order = [...queue.slice(0, 30), ...queue.slice(30).filter(i => i % 4 === 0), ...queue.slice(30).filter(i => i % 4 !== 0)];
  let cursor = 0;
  const worker = async () => { while (cursor < order.length) { const i = order[cursor++]; if (!frames[i]) await loadFrame(i); onLoadProgress(); } };
  const onLoadProgress = () => {
    loader.style.setProperty('--p', (loaded / queue.length).toFixed(3));
    if (!intro.classList.contains('is-ready') && (loaded >= 30 || loaded === queue.length)) { intro.classList.add('is-ready'); draw(0, true); }
  };
  for (let k = 0; k < 6; k++) worker();

  // --- çizim: cover-fit, dpr'a göre; kare yoksa en yakın yüklü önceki kare ---
  const dpr = Math.min(devicePixelRatio || 1, 2);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const resize = () => { canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr); drawn = -1; draw(current, true); };
  addEventListener('resize', resize, { passive: true });
  const nearest = (i) => { for (let k = i; k >= 0; k--) if (frames[k]) return k; for (let k = i; k < N; k++) if (frames[k]) return k; return -1; };
  const draw = (p, force) => {
    let i = nearest(Math.round(p * (N - 1)));
    if (i < 0 || (i === drawn && !force)) return;
    const im = frames[i], cw = canvas.width, ch = canvas.height;
    // yatayda cover; dikey ekranda (telefon) kareyi fazla kırpma: genişliğe sığdır, en az ekranın %58'i kadar yüksek
    const portrait = ch > cw;
    const s = portrait ? Math.max(cw / im.naturalWidth, (0.58 * ch) / im.naturalHeight) : Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    if (portrait) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch); }
    ctx.drawImage(im, (cw - w) / 2, portrait ? ch * 0.44 - h / 2 : (ch - h) / 2, w, h);
    drawn = i;
  };
  resize();

  // kaydırdıkça değişen alt yazılar (ilerleme eşiği, metin)
  const CAP_T = [0.00, 0.10, 0.24, 0.52, 0.88]; // metinler I18N.t('captions')
  addEventListener('langchange', () => { lastCap = -1; });

  const introProgress = () => {
    if (hp !== null) return +hp;
    const total = spacer.offsetHeight - innerHeight;
    return clamp(scrollY / total, 0, 1);
  };

  const applyIntro = (p) => {
    draw(p);
    bar.style.width = (p * 100).toFixed(2) + '%';
    intro.classList.toggle('is-scrolled', p > 0.03);
    let ci = 0; CAP_T.forEach((t0, i) => { if (p >= t0) ci = i; });
    if (ci !== lastCap) {
      lastCap = ci; caption.classList.remove('is-on');
      setTimeout(() => { captionText.textContent = I18N.t('captions')[ci]; caption.classList.add('is-on'); }, 160);
    }
  };

  const openSite = () => {
    if (opened) return; opened = true;
    intro.classList.add('is-flash');
    setTimeout(() => {
      document.body.classList.add('is-open');   // spacer gizlenir, nav belirir
      scrollTo({ top: 0, behavior: 'instant' });
      intro.classList.add('is-out');
      setTimeout(() => intro.classList.add('is-gone'), 500);
    }, 140);
  };

  // yumuşatma: hedefe uzaklığa göre hızlanan lerp (küçük farkta tam yapışır, büyük sıçramada akar)
  const introLoop = () => {
    if (opened) return;
    target = introProgress();
    const d = target - current;
    current += d * (reduced || hp !== null ? 1 : clamp(0.28 + Math.abs(d) * 2, 0.28, 0.6));
    if (Math.abs(d) < 0.0008) current = target;
    applyIntro(current);
    if (hp === null && target >= 0.985) openSite();
    requestAnimationFrame(introLoop);
  };

  $('#introSkip').addEventListener('click', openSite);
  addEventListener('keydown', (e) => { if (!opened && (e.key === 'Escape' || e.key === 'Enter')) openSite(); });
  if (qs.has('flat') || qs.has('site')) {
    opened = true; document.body.classList.add('is-open'); intro.classList.add('is-gone');
    if (qs.get('sy')) addEventListener('load', () => scrollTo(0, +qs.get('sy'))); // debug: ?sy=1200 -> o konuma kaydır
  } else {
    requestAnimationFrame(introLoop);
  }

  // HUD saati (hero) — sabah mesaisi saatinden akar
  const hudClock = $('#hudClock');
  let hudSec = 9 * 3600 + 23 * 60 + 12;
  const fmt = (s) => [s / 3600 | 0, (s / 60 | 0) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':');
  setInterval(() => { hudSec = (hudSec + 1) % 86400; hudClock.textContent = fmt(hudSec); }, 1000);


  /* ---------- TANIMA: VD-3 kare dizisi, kaydırdıkça sağa akar ---------- */
  (() => {
    const bolum = $('#tanima'); if (!bolum) return;
    const cv = $('#recoCanvas', bolum), cx = cv.getContext('2d', { alpha: false });
    const sticky = $('.reco__sticky', bolum), loader = $('#recoLoader', bolum);
    const capT = $('#recoTitle', bolum), capS = $('#recoText', bolum), track = $('#recoTrack', bolum);
    const lead = $('.reco__head .lead', bolum);
    const N = +cv.dataset.frames;
    const retina2 = !yavas && (innerWidth * Math.min(devicePixelRatio || 1, 2)) > 1500;
    const SRC = (retina2 && cv.dataset.src2x) || cv.dataset.src;
    const kare = new Array(N).fill(null);
    let yuklendi = 0, cizilen = -1, sonGrup = -1, sonAktif = -1, hedef = 0, simdi = 0, basladi = false;

    // etiket şeridi (video sırası) ve grup anlatımı — metinler I18N.t('reco')
    const ETIKET = () => I18N.t('recoLabels');
    const GRUP = () => I18N.t('recoGroups');   // [esik, baslik, metin]
    ETIKET().forEach((e) => { const i = document.createElement('i'); i.textContent = e; track.appendChild(i); });
    const noktalar = [...track.children];

    const yol = (i) => SRC.replace('{i}', String(i + 1).padStart(4, '0'));
    const yukleKare = (i) => new Promise((res) => {
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { kare[i] = im; yuklendi++; ilerleme(); res(); };
      im.onerror = () => res();
      im.src = yol(i);
    });
    const ilerleme = () => {
      loader.style.setProperty('--p', (yuklendi / sira.length).toFixed(3));
      if (!bolum.classList.contains('is-ready') && yuklendi >= Math.min(20, N)) { bolum.classList.add('is-ready'); cizilen = -1; ciz(sonP, true); }
    };
    const sira = [...Array(N).keys()].filter((i) => !atla(i, N));
    const oncelik = [...sira.filter((i) => i % 3 === 0), ...sira.filter((i) => i % 3 !== 0)];
    let imlec = 0;
    const isci = async () => { while (imlec < oncelik.length) { const i = oncelik[imlec++]; if (!kare[i]) await yukleKare(i); } };
    const yuklemeyeBasla = () => { if (basladi) return; basladi = true; for (let k = 0; k < 5; k++) isci(); };

    const dpr = Math.min(devicePixelRatio || 1, 2);
    cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
    const olcekle = () => { const r = cv.getBoundingClientRect(); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); cizilen = -1; ciz(simdi, true); };
    addEventListener('resize', olcekle, { passive: true });
    const istendi = new Set();
    let sonP = 0;                                  // en son istenen ilerleme
    // geç gelen ESKİ kare ekrana basılmasın: yüklenince yalnızca hâlâ istenen kare ise çizilir
    const acil = (i) => { if (i >= 0 && i < N && !kare[i] && !istendi.has(i)) { istendi.add(i); yukleKare(i).then(() => { if (Math.round(sonP * (N - 1)) === i) { cizilen = -1; ciz(sonP, true); } }); } };
    const enYakin = (i) => { for (let k = i; k >= 0; k--) if (kare[k]) return k; for (let k = i; k < N; k++) if (kare[k]) return k; return -1; };
    const ciz = (p, zorla) => {
      sonP = p;
      const tam = Math.round(p * (N - 1));
      acil(tam);                                  // hızlı kaydırmada istenen kare öne alınır
      const i = enYakin(tam);
      if (i < 0 || (i === cizilen && !zorla)) return;
      const im = kare[i], cw = cv.width, ch = cv.height;
      const s = Math.min(cw / im.naturalWidth, ch / im.naturalHeight);   // tam sığdır: nesneler ve etiketleri kırpılmasın
      const w = im.naturalWidth * s, h = im.naturalHeight * s;
      ctxTemizle(cw, ch); cx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
      cizilen = i;
    };
    const ctxTemizle = (w, h) => { cx.fillStyle = '#000'; cx.fillRect(0, 0, w, h); };

    const uygula = (p) => {
      ciz(p);
      // giriş metni videodaki etiketleri kapatmasın: kaydırınca çekilir
      if (lead) { const o = 1 - clamp(p / 0.1, 0, 1); lead.style.opacity = o; lead.style.transform = `translateY(${(1 - o) * -8}px)`; }
      const g = GRUP(); let gi = 0; g.forEach((x, i) => { if (p >= x[0]) gi = i; });
      if (gi !== sonGrup) { sonGrup = gi; capT.textContent = g[gi][1]; capS.textContent = g[gi][2]; }
      // şerit: video sırasına göre görülenler işaretlenir
      const n = noktalar.length, aktif = Math.min(n - 1, Math.floor(p * n));
      noktalar.forEach((el, i) => { el.classList.toggle('is-on', i === aktif); el.classList.toggle('is-seen', i < aktif); });
      if (aktif !== sonAktif) {   // dar ekranda şerit tek satır: aktif etiketi ortala
        sonAktif = aktif; const el = noktalar[aktif];
        if (el && track.scrollWidth > track.clientWidth + 4) track.scrollTo({ left: el.offsetLeft - track.clientWidth / 2 + el.offsetWidth / 2, behavior: 'smooth' });
      }
    };

    const rp = new URLSearchParams(location.search).get('rp'); // debug: ?rp=0.5 -> bölümü o ilerlemede sabitle
    const oran = () => {
      if (rp !== null) return +rp;
      const r = bolum.getBoundingClientRect();
      const toplam = bolum.offsetHeight - sticky.offsetHeight;
      return clamp(-r.top / Math.max(1, toplam), 0, 1);
    };
    let calisiyor = false;
    const dongu = () => {
      hedef = oran();
      const d = hedef - simdi;
      simdi += d * (reduced || rp !== null ? 1 : clamp(0.3 + Math.abs(d) * 2, 0.3, 0.6));
      if (Math.abs(d) < 0.0008) simdi = hedef;
      uygula(simdi);
      if (calisiyor) requestAnimationFrame(dongu);
    };
    // görünüme yaklaşınca yükle + döngüyü yalnız görünürken çalıştır (pil/CPU)
    if (rp !== null) {                            // debug: sabit ilerlemede her karede yeniden çiz
      yuklemeyeBasla(); calisiyor = true; olcekle();
      const zorla = () => { cizilen = -1; uygula(+rp); requestAnimationFrame(zorla); };
      requestAnimationFrame(zorla);
    }
    new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) yuklemeyeBasla(); }), { rootMargin: '200% 0px' }).observe(bolum);
    new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { if (!calisiyor) { calisiyor = true; olcekle(); requestAnimationFrame(dongu); } }
      else calisiyor = false;
    }), { threshold: 0 }).observe(bolum);
    addEventListener('langchange', () => {
      sonGrup = -1;
      const yeni = ETIKET(); noktalar.forEach((el, i) => { el.textContent = yeni[i] ?? el.textContent; });
      uygula(simdi);
    });
  })();

  /* ---------- REVEAL ---------- */
  const io = new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal, .feature, #pipeline, #map').forEach(el => io.observe(el));

  /* ---------- SAYAÇLAR ---------- */
  const sufOf = (el) => (I18N.lang === 'en' && el.dataset.suffixEn !== undefined ? el.dataset.suffixEn : el.dataset.suffix) || '';
  addEventListener('langchange', () => $$('[data-count]').forEach(el => { if (el.dataset.done) el.textContent = (el.dataset.onek || '') + bicim(+el.dataset.count, +(el.dataset.dec || 0)) + (el.dataset.onek ? '' : sufOf(el)); }));
  const bicim = (v, dec) => { const x = dec ? v.toFixed(dec) : String(Math.round(v)); return I18N.lang === 'tr' ? x.replace('.', ',') : x; };
  const countUp = (el) => {
    const end = +el.dataset.count, suf = sufOf(el), dec = +(el.dataset.dec || 0), on = el.dataset.onek || '', dur = 1400, t0 = performance.now();
    const step = (t) => {
      const k = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = on + bicim(end * e, dec) + (on ? '' : suf);
      if (k < 1) requestAnimationFrame(step); else el.dataset.done = '1';
    };
    requestAnimationFrame(step);
  };
  const cio = new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); }
  }), { threshold: 0.6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  // tesis haritası: kamera sayacı bağlantı animasyonuyla artar
  const map = $('#map'), mapCount = $('#mapCamCount');
  const mio = new IntersectionObserver((es) => es.forEach(e => {
    if (!e.isIntersecting) return;
    const n = $$('.cam', map).filter(c => c.getClientRects().length).length; let i = 0;
    const tick = () => { i++; mapCount.textContent = i; if (i < n) setTimeout(tick, 200); };
    setTimeout(tick, 300); mio.unobserve(map);
  }), { threshold: 0.3 });
  mio.observe(map);

  /* ---------- CANLI ANALİZ: video + eş zamanlı olay akışı ---------- */
  const live = $('.live'), lv = $('#liveVideo'), feed = $('#feed'), playBtn = $('#livePlay');
  const liveClock = $('#liveClock'), kKisi = $('#kpiKisi'), kHar = $('#kpiHareketsiz');
  const LIVE_START = 9 * 3600 + 23 * 60 + 30; // klip 09:23:30'da başlar (panel_veri: 33792 + 30 sn)
  // klibe göre saniye: gerçek pilot olaylarından (out/panel_veri.json, rapor_veri.json)
  // metinler I18N.t('events')[i] = [başlık, açıklama]
  const EVENTS = [
    { t: 0.5,  tip: 'info', kisi: 4, har: 3 },
    { t: 4,    tip: 'info', kisi: 5, har: 3 },
    { t: 10,   tip: 'warn', kisi: 5, har: 4 },
    { t: 16,   tip: 'info', kisi: 4, har: 1 },
    { t: 21,   tip: 'warn', kisi: 4, har: 2 },
    { t: 26,   tip: 'info', kisi: 3, har: 1 },
  ];
  addEventListener('langchange', () => { feed.innerHTML = ''; fired.clear(); }); // olaylar yeni dilde yeniden akar
  let fired = new Set();
  const resetFeed = () => { feed.innerHTML = ''; fired.clear(); };
  const pushEvent = (ev, t, i) => {
    const [b, sTxt] = I18N.t('events')[i];
    const li = document.createElement('li');
    li.className = 'feed__item' + (ev.tip === 'warn' ? ' feed__item--warn' : '');
    li.innerHTML = `<span class="feed__t">${fmt(LIVE_START + Math.floor(t))}</span><div><b>${b}</b><span>${sTxt}</span></div>`;
    feed.prepend(li);
    while (feed.children.length > 4) feed.lastElementChild.remove();
    kKisi.textContent = ev.kisi; kHar.textContent = ev.har;
  };
  lv.addEventListener('timeupdate', () => {
    const t = lv.currentTime;
    liveClock.textContent = fmt(LIVE_START + Math.floor(t));
    if (t < 0.3 && fired.size) resetFeed(); // döngü başa sardı
    EVENTS.forEach((ev, i) => { if (t >= ev.t && !fired.has(i)) { fired.add(i); pushEvent(ev, ev.t, i); } });
  });
  const playLive = () => lv.play().then(() => { live.classList.add('is-playing'); resetFeed(); }).catch(() => {});
  playBtn.addEventListener('click', playLive);
  lv.addEventListener('click', () => { if (lv.paused) playLive(); });
  // görünür olunca otomatik başlat (sessiz video => tarayıcı izin verir)
  const lio = new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting) playLive(); else { lv.pause(); live.classList.remove('is-playing'); }
  }), { threshold: 0.4 });
  lio.observe(live);

  /* ---------- DEBUG: ?flat=1 -> intro atlanır, her şey açık (tam sayfa ekran görüntüsü) ---------- */
  if (new URLSearchParams(location.search).has('flat')) {
    $$('.reveal, .feature, #pipeline, #map').forEach(el => el.classList.add('is-in'));
    $$('[data-count]').forEach(el => { el.textContent = (el.dataset.onek || '') + bicim(+el.dataset.count, +(el.dataset.dec || 0)) + (el.dataset.onek ? '' : sufOf(el)); el.dataset.done = '1'; });
    mapCount.textContent = $$('.cam', map).filter(c => c.getClientRects().length).length;
    $('.hero').style.minHeight = '900px'; // tam sayfa ekran görüntüsünde 100vh şişmesin
    const only = new URLSearchParams(location.search).get('only'); // &only=dunya -> yalnız o bölüm
    if (only) $$('main > *, .marquee').forEach(el => { if (el.id !== only) el.style.display = 'none'; });
  }

})();
