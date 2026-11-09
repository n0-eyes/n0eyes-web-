/* n0eyes — alttaki form: tanıtım sunumu ve broşür e-postayla gider.
   Uç nokta: müşteri portalı (portal.n0eyes.com), mailler info@n0eyes.com'dan çıkar. */
(() => {
  const UC = 'https://portal.n0eyes.com/gorusme/sunum-site';   // boşsa form mailto'ya düşer
  const GORUSME = 'https://portal.n0eyes.com/gorusme';
  const f = document.querySelector('#demoForm'); if (!f) return;
  const dugme = f.querySelector('button[type="submit"]');
  const T = {
    tr: { gonderiliyor: 'Gönderiliyor…', ok: 'Sunumunuz e-postanıza gönderildi',
          okAlt: 'Tanıtım sunumu ve broşür <b>{e}</b> adresine yola çıktı. Birkaç dakika içinde gelmezse istenmeyen klasörüne bakın.',
          gorusme: 'Görüşme planla →', yeni: 'Başka bir adrese gönder',
          hata: 'Gönderilemedi — lütfen tekrar deneyin ya da info@n0eyes.com adresine yazın.',
          sinir: 'Bu adrese kısa süre önce gönderdik. Gelen kutunuzu ve istenmeyen klasörünü kontrol edin.',
          eksik: 'Lütfen ad, firma ve e-posta alanlarını doldurup onay kutusunu işaretleyin.',
          epostaHata: 'E-posta adresini kontrol edin — bu adrese ulaşamıyoruz.' },
    en: { gonderiliyor: 'Sending…', ok: 'Your presentation is on its way',
          okAlt: 'Our presentation and brochure have been sent to <b>{e}</b>. If they don’t arrive within a few minutes, check your spam folder.',
          gorusme: 'Book a meeting →', yeni: 'Send to another address',
          hata: 'Could not send — please try again or write to info@n0eyes.com.',
          sinir: 'We sent it to this address a moment ago. Please check your inbox and spam folder.',
          eksik: 'Please fill in your name, company and e-mail and tick the consent box.',
          epostaHata: 'Please check the e-mail address — we can’t reach it.' },
  };
  const dil = () => (document.documentElement.lang === 'en' ? 'en' : 'tr');
  const t = (k) => T[dil()][k];

  // bal küpü: botlar doldurur, insan görmez
  const tuzak = document.createElement('input');
  Object.assign(tuzak, { type: 'text', name: 'sirket', tabIndex: -1, autocomplete: 'off' });
  tuzak.setAttribute('aria-hidden', 'true');
  tuzak.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
  f.appendChild(tuzak);

  const kac = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const basarili = (eposta) => {
    const kutu = document.createElement('div');
    kutu.className = 'form__ok';
    kutu.innerHTML = `<div class="form__okIcon">✓</div><b>${t('ok')}</b><span>${t('okAlt').replace('{e}', kac(eposta))}</span>
      <a class="btn btn--sm" href="${GORUSME}">${t('gorusme')}</a>
      <button type="button" class="form__again">${t('yeni')}</button>`;
    dugme.textContent = eski; dugme.disabled = false;
    f.replaceWith(kutu);
    kutu.querySelector('.form__again').addEventListener('click', () => { kutu.replaceWith(f); f.reset(); kur(); });
  };

  let gonderiliyor = false, eski = '';
  const gonder = async (e) => {
    e.preventDefault();
    if (gonderiliyor) return;
    if (!UC) { location.href = `mailto:info@n0eyes.com?subject=${encodeURIComponent('Demo talebi')}&body=${encodeURIComponent([...new FormData(f)].map(([k, v]) => `${k}: ${v}`).join('\n'))}`; return; }
    gonderiliyor = true;
    eski = dugme.textContent; dugme.textContent = t('gonderiliyor'); dugme.disabled = true;
    const veri = new FormData(f);
    veri.append('dil', dil()); veri.append('kaynak', location.pathname + location.search);
    try {
      // basit istek (no preflight) için URLSearchParams
      const r = await fetch(UC, { method: 'POST', body: new URLSearchParams([...veri]) });
      const j = await r.json().catch(() => ({ ok: r.ok }));
      if (!j.ok) throw new Error(j.hata || 'hata');
      basarili(veri.get('eposta'));
    } catch (err) {
      dugme.textContent = eski; dugme.disabled = false; gonderiliyor = false;
      let uyari = f.querySelector('.form__err');
      if (!uyari) { uyari = document.createElement('p'); uyari.className = 'form__err form__full'; f.appendChild(uyari); }
      const k = err && err.message;
      uyari.textContent = k === 'eposta_alani' ? t('epostaHata') : k === 'sinir' ? t('sinir') : k === 'eksik' ? t('eksik') : t('hata');
    }
  };
  const kur = () => { f.removeEventListener('submit', gonder); f.addEventListener('submit', gonder); gonderiliyor = false; };
  kur();
})();
