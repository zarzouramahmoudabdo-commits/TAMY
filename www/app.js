(() => {
'use strict';

const D = window.TAMY_DATA;
const VERSION = typeof TAMY_VERSION !== 'undefined' ? TAMY_VERSION : '0';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const SEC = {
  seerah:   { title: 'السيرة النبوية',  icon: '🕌' },
  prophets: { title: 'قصص الأنبياء',    icon: '📖' }
};

let settings = Object.assign({ theme: 'auto', font: 21, rate: 1, pitch: 1, voice: '', autoNext: true, readExtras: true }, load('tamy_settings', {}));
let favs = load('tamy_favs', []);
let progress = load('tamy_progress', {});
let last = load('tamy_last', null);
const saveSettings = () => store('tamy_settings', settings);

function applySettings() {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.style.setProperty('--fs', settings.font + 'px');
}
applySettings();

function toast(msg, ms = 2400) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, ms);
}

const credit = () => `<div class="credit">تم عمل التطبيق بواسطة <b>Mahmoud A Zarzoura</b></div>`;
const norm = s => String(s).replace(/[ً-ٰٟـ]/g, '').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase();
const findItem = (kind, id) => (D[kind] || []).find(x => x.id === id);
const keyOf = (kind, id) => kind + ':' + id;
const isFav = k => favs.includes(k);

function splitSentences(text) {
  const out = [];
  (String(text).match(/[^.!؟?؛\n]+[.!؟?؛]*/g) || []).forEach(raw => {
    const s = raw.trim();
    if (!s) return;
    if (s.length <= 200) { out.push(s); return; }
    let buf = '';
    (s.match(/[^،,:]+[،,:]?/g) || [s]).forEach(part => {
      if ((buf + part).length > 180 && buf) { out.push(buf.trim()); buf = ''; }
      buf += part;
    });
    if (buf.trim()) out.push(buf.trim());
  });
  return out;
}
const sentSpans = (text, extra) => String(text).split(/\n\s*\n/).map(p =>
  '<p>' + splitSentences(p).map(s => `<span class="s"${extra ? ' data-extra="1"' : ''}>${esc(s)} </span>`).join('') + '</p>').join('');

/* ───── القارئ الصوتي ───── */
const synth = window.speechSynthesis;
const Reader = {
  els: [], idx: 0, playing: false, token: 0, ctx: null, sleepT: null, wake: null,
  voices() { return synth ? synth.getVoices() : []; },
  arVoices() { return this.voices().filter(v => /^ar/i.test(v.lang)); },
  pickVoice() {
    const all = this.voices();
    if (settings.voice) { const v = all.find(x => x.voiceURI === settings.voice); if (v) return v; }
    const ar = this.arVoices();
    return ar.find(v => /ar-SA/i.test(v.lang)) || ar.find(v => /ar-EG/i.test(v.lang)) || ar[0] || null;
  },
  list() { return this.els.filter(e => settings.readExtras || !e.dataset.extra); },
  mount(els, ctx) { this.stop(); this.els = els; this.ctx = ctx; this.idx = 0; this.ui(); },
  speak(i) {
    if (!synth) { toast('المتصفح لا يدعم القراءة الصوتية'); return; }
    const list = this.list();
    if (i >= list.length) return this.finish();
    if (i < 0) i = 0;
    this.idx = i;
    const el = list[i];
    $$('.s.cur').forEach(x => x.classList.remove('cur'));
    el.classList.add('cur');
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const my = ++this.token;
    const u = new SpeechSynthesisUtterance(el.textContent.trim());
    const v = this.pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'ar-SA';
    u.rate = settings.rate; u.pitch = settings.pitch;
    u.onend = () => { if (my === this.token && this.playing) this.speak(i + 1); };
    u.onerror = e => {
      if (my !== this.token || !this.playing) return;
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      if (e.error === 'not-allowed') { this.playing = false; this.ui(); return; }
      this.speak(i + 1);
    };
    synth.cancel();
    setTimeout(() => { if (my === this.token) synth.speak(u); }, 40);
    this.saveProgress(i, list.length);
    this.ui();
  },
  saveProgress(i, total, done) {
    if (!this.ctx) return;
    const k = keyOf(this.ctx.kind, this.ctx.id);
    progress[k] = { idx: i, total, done: !!done };
    store('tamy_progress', progress);
    last = { kind: this.ctx.kind, id: this.ctx.id, idx: i };
    store('tamy_last', last);
  },
  play() {
    this.playing = true;
    this.lockScreen(true);
    this.speak(this.idx);
    this.mediaSession();
  },
  pause() { this.playing = false; this.token++; if (synth) synth.cancel(); this.lockScreen(false); this.ui(); },
  stop() {
    this.playing = false; this.token++;
    if (synth) synth.cancel();
    clearTimeout(this.sleepT); this.lockScreen(false);
  },
  toggle() { this.playing ? this.pause() : this.play(); },
  next() { const n = Math.min(this.idx + 1, this.list().length - 1); this.playing ? this.speak(n) : this.moveTo(n); },
  prev() { const n = Math.max(this.idx - 1, 0); this.playing ? this.speak(n) : this.moveTo(n); },
  moveTo(n) {
    this.idx = n;
    $$('.s.cur').forEach(x => x.classList.remove('cur'));
    const el = this.list()[n]; if (el) { el.classList.add('cur'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    this.ui();
  },
  playFrom(el) {
    const i = this.list().indexOf(el);
    if (i < 0) return;
    this.idx = i; this.play();
  },
  restartSoon() { clearTimeout(this._rs); this._rs = setTimeout(() => { if (this.playing) this.speak(this.idx); }, 300); },
  finish() {
    this.playing = false; this.token++; this.lockScreen(false);
    $$('.s.cur').forEach(x => x.classList.remove('cur'));
    if (this.ctx) this.saveProgress(0, this.list().length, true);
    this.ui();
    const nx = this.ctx && this.ctx.nextRoute;
    if (settings.autoNext && nx) {
      toast('جاري الانتقال للقصة التالية…');
      sessionStorage.setItem('tamy_autoplay', '1');
      setTimeout(() => { location.hash = nx; }, 900);
    } else toast('انتهت القراءة ✓');
  },
  speakOnce(text) {
    if (!synth) return toast('المتصفح لا يدعم القراءة الصوتية');
    this.stop();
    const u = new SpeechSynthesisUtterance(text);
    const v = this.pickVoice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'ar-SA';
    u.rate = settings.rate; u.pitch = settings.pitch;
    synth.speak(u);
  },
  setSleep(min) {
    clearTimeout(this.sleepT);
    if (min > 0) {
      this.sleepT = setTimeout(() => { this.pause(); toast('انتهى مؤقت النوم 😴'); }, min * 60000);
      toast('سيتوقف القارئ بعد ' + min + ' دقيقة');
    }
  },
  async lockScreen(on) {
    try {
      if (on && navigator.wakeLock && !this.wake) this.wake = await navigator.wakeLock.request('screen');
      else if (!on && this.wake) { await this.wake.release(); this.wake = null; }
    } catch { this.wake = null; }
  },
  mediaSession() {
    if (!('mediaSession' in navigator) || !this.ctx) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: this.ctx.title, artist: 'TAMY', artwork: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
      navigator.mediaSession.setActionHandler('play', () => this.play());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
    } catch {}
  },
  ui() {
    const m = $('#plMain'); if (!m) return;
    m.textContent = this.playing ? '⏸' : '▶';
    const total = this.list().length;
    $('#plCount').textContent = `الجملة ${Math.min(this.idx + 1, total)} من ${total}`;
  }
};

function fillVoices() {
  const sel = $('#plVoice'); if (!sel) return;
  const ar = Reader.arVoices();
  const list = ar.length ? ar : Reader.voices();
  sel.innerHTML = `<option value="">تلقائي (أفضل صوت عربي)</option>` +
    list.map(v => `<option value="${esc(v.voiceURI)}" ${settings.voice === v.voiceURI ? 'selected' : ''}>${esc(v.name)} — ${esc(v.lang)}</option>`).join('');
  const w = $('#plWarn');
  if (w) w.hidden = ar.length > 0;
}
if (synth) synth.addEventListener('voiceschanged', fillVoices);

function playerHTML() {
  const chips = [0.75, 1, 1.25, 1.5, 2].map(r => `<button data-act="rate" data-r="${r}" class="${Math.abs(settings.rate - r) < 0.01 ? 'on' : ''}">${r}×</button>`).join('');
  return `
  <div class="pl">
    <div class="pl-row" dir="ltr">
      <button class="pl-btn" data-act="pl-prev" aria-label="السابق">⏮</button>
      <button class="pl-btn main" id="plMain" data-act="pl-toggle" aria-label="تشغيل">▶</button>
      <button class="pl-btn" data-act="pl-next" aria-label="التالي">⏭</button>
      <div class="pl-info" dir="rtl"><b id="plTitle"></b><span id="plCount"></span></div>
      <button class="pl-btn" data-act="pl-more" aria-label="خيارات">⚙️</button>
    </div>
    <div class="pl-speed">
      <label>السرعة <b id="rateLbl">${settings.rate.toFixed(2)}×</b></label>
      <input type="range" id="rate" min="0.5" max="2" step="0.05" value="${settings.rate}">
    </div>
    <div class="speed-chips" id="rateChips">${chips}</div>
    <div class="pl-more" id="plMore">
      <div class="warn" id="plWarn" hidden>لم يتم العثور على صوت عربي في جهازك. ثبّت صوتًا عربيًا من إعدادات الجهاز ← اللغة ← تحويل النص إلى كلام (Google).</div>
      <label>الصوت</label>
      <select id="plVoice"></select>
      <div class="pl-speed"><label>الطبقة <b id="pitchLbl">${settings.pitch.toFixed(2)}</b></label>
        <input type="range" id="pitch" min="0.7" max="1.4" step="0.05" value="${settings.pitch}"></div>
      <div class="opt"><span>الانتقال التلقائي للقصة التالية</span><label class="sw"><input type="checkbox" id="optNext" ${settings.autoNext ? 'checked' : ''}><span></span></label></div>
      <div class="opt"><span>قراءة العبر والأدعية</span><label class="sw"><input type="checkbox" id="optExtra" ${settings.readExtras ? 'checked' : ''}><span></span></label></div>
      <div class="opt"><span>مؤقت النوم</span>
        <select id="plSleep" style="width:auto;margin:0"><option value="0">بدون</option><option value="10">10 دقائق</option><option value="20">20 دقيقة</option><option value="30">30 دقيقة</option><option value="60">ساعة</option></select></div>
    </div>
  </div>`;
}

function showPlayer(item) {
  const p = $('#player');
  p.innerHTML = playerHTML(); p.hidden = false;
  document.body.classList.add('has-player');
  $('#plTitle').textContent = item.title;
  fillVoices(); Reader.ui();

  $('#rate').addEventListener('input', e => {
    settings.rate = parseFloat(e.target.value); $('#rateLbl').textContent = settings.rate.toFixed(2) + '×';
    $$('#rateChips button').forEach(b => b.classList.toggle('on', Math.abs(parseFloat(b.dataset.r) - settings.rate) < 0.01));
    saveSettings(); Reader.restartSoon();
  });
  $('#pitch').addEventListener('input', e => {
    settings.pitch = parseFloat(e.target.value); $('#pitchLbl').textContent = settings.pitch.toFixed(2);
    saveSettings(); Reader.restartSoon();
  });
  $('#plVoice').addEventListener('change', e => { settings.voice = e.target.value; saveSettings(); Reader.restartSoon(); });
  $('#optNext').addEventListener('change', e => { settings.autoNext = e.target.checked; saveSettings(); });
  $('#optExtra').addEventListener('change', e => { settings.readExtras = e.target.checked; saveSettings(); Reader.ui(); });
  $('#plSleep').addEventListener('change', e => Reader.setSleep(parseInt(e.target.value, 10)));
}
function hidePlayer() { const p = $('#player'); p.hidden = true; p.innerHTML = ''; document.body.classList.remove('has-player'); }

function allDuas() {
  const out = [];
  (D.duas || []).forEach((d, i) => out.push({ key: 'd:g:' + i, text: d.text, ref: d.ref, from: 'أدعية عامة' }));
  ['seerah', 'prophets'].forEach(kind => (D[kind] || []).forEach(it =>
    (it.duas || []).forEach((d, i) => out.push({ key: `d:${kind}:${it.id}:${i}`, text: d.text, ref: d.ref, from: it.short || it.title }))));
  return out;
}

/* ───── الصفحات ───── */
const views = {
  home() {
    const lastItem = last && findItem(last.kind, last.id);
    const cont = lastItem ? `
      <a class="cont" href="#/item/${last.kind}/${last.id}/r">
        <span style="font-size:26px">📚</span>
        <div><b>متابعة القراءة</b><small>${esc(lastItem.title)}</small></div>
        <span class="go">تابع</span>
      </a>` : '';
    const cnt = k => (D[k] || []).length;
    return `
    <section class="hero">
      <img src="icons/icon-192.png" alt="TAMY">
      <h1>TAMY</h1>
      <p>السيرة النبوية • قصص الأنبياء • الفوائد والعبر</p>
    </section>
    <form class="search" data-form="search">
      <input name="q" placeholder="ابحث في السيرة والقصص والأدعية…" autocomplete="off">
      <button aria-label="بحث">🔍</button>
    </form>
    ${cont}
    <div class="sec-cards">
      <a class="sec-card" href="#/seerah"><div class="big">🕌</div><div><h3>السيرة النبوية</h3><p>من المولد والنشأة إلى نزول الوحي، والدعوة في مكة، والهجرة، والغزوات، وفتح مكة، وحجة الوداع والوفاة</p></div><span class="arr">›</span></a>
      <a class="sec-card" href="#/prophets"><div class="big">📖</div><div><h3>قصص الأنبياء</h3><p>${cnt('prophets')} نبيًّا مذكورًا في القرآن، مرتبة في أبواب مستقلة مع الآيات المرتبطة بكل قصة</p></div><span class="arr">›</span></a>
      <a class="sec-card gold" href="#/lessons"><div class="big">💡</div><div><h3>الفوائد والعبر</h3><p>الدروس المستفادة والأدعية الواردة في القرآن والسنة ومراجع كل قصة</p></div><span class="arr">›</span></a>
      <a class="sec-card" href="#/settings"><div class="big" style="background:linear-gradient(135deg,#5a6b63,#34423b)">⚙️</div><div><h3>الإعدادات والتحديث</h3><p>المظهر، حجم الخط، وتحديث التطبيق</p></div><span class="arr">›</span></a>
    </div>
    ${credit()}`;
  },

  list(kind) {
    const s = SEC[kind];
    const items = D[kind] || [];
    const grid = kind === 'prophets';
    const html = items.map((it, i) => {
      const k = keyOf(kind, it.id), pr = progress[k], done = pr && pr.done;
      const pct = pr && !done && pr.total ? Math.round(pr.idx / pr.total * 100) : 0;
      const heart = isFav(k) ? '<span class="heart">♥</span>' : '';
      const searchText = norm(it.title + ' ' + (it.short || ''));
      if (grid) return `<a class="item ${done ? 'done' : ''}" href="#/item/${kind}/${it.id}" data-s="${esc(searchText)}">${heart}<div class="no">${done ? '✓' : i + 1}</div><h3>${esc(it.short)}</h3>${pct ? `<div class="prog"><i style="width:${pct}%"></i></div>` : ''}</a>`;
      return `<a class="item ${done ? 'done' : ''}" href="#/item/${kind}/${it.id}" data-s="${esc(searchText)}"><div class="no">${done ? '✓' : i + 1}</div><div style="flex:1;min-width:0"><h3>${it.icon || ''} ${esc(it.title)}</h3><p>${esc(it.period || '')}</p>${pct ? `<div class="prog" style="margin-top:6px"><i style="width:${pct}%"></i></div>` : ''}</div>${heart}</a>`;
    }).join('');
    return `
    <h2 class="page-title">${s.icon} ${s.title}</h2>
    <input class="filter" data-filter placeholder="ابحث في ${s.title}…" style="margin-bottom:12px">
    <div class="${grid ? 'grid2' : 'list'}" id="listBox">${html}</div>
    ${credit()}`;
  },

  item(kind, id) {
    const it = findItem(kind, id);
    if (!it) return `<div class="empty">العنصر غير موجود</div>${credit()}`;
    const items = D[kind], i = items.indexOf(it);
    const k = keyOf(kind, id);
    const prev = items[i - 1], next = items[i + 1];
    const verses = (it.verses || []).length ? `<div class="chips">${it.verses.map(v => `<span class="chip">📌 ${esc(v)}</span>`).join('')}</div>` : '';
    const lessons = (it.lessons || []).length ? `<section class="box"><h2>💡 الدروس والعبر</h2><ul>${it.lessons.map(l => `<li><span class="s" data-extra="1">${esc(l)} </span></li>`).join('')}</ul></section>` : '';
    const duas = (it.duas || []).length ? `<section class="box"><h2>🤲 الدعاء</h2>${it.duas.map(d => `<div class="dua"><span class="s" data-extra="1">${esc(d.text)} </span></div><div class="ref">${esc(d.ref || '')}</div>`).join('')}</section>` : '';
    const srcs = (it.sources || []).length ? `<ul>${it.sources.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : `<div class="empty">لم تُضَف مصادر لهذه القصة بعد.</div>`;
    return `
    <article>
      <div class="story-head">
        <div class="badge">${it.icon || '📖'}</div>
        <h1><span class="s">${esc(it.title)}. </span></h1>
        ${it.period ? `<p class="sub">${esc(it.period)}</p>` : ''}
        <div class="story-tools">
          <button class="chipbtn" data-act="font" data-d="-1">A−</button>
          <button class="chipbtn" data-act="font" data-d="1">A+</button>
          <button class="chipbtn ${isFav(k) ? 'on' : ''}" data-act="fav" data-key="${k}">${isFav(k) ? '♥ في المفضلة' : '♡ أضف للمفضلة'}</button>
        </div>
      </div>
      ${verses}
      <div class="body">${sentSpans(it.text)}</div>
      ${lessons}${duas}
      <section class="box"><h2>📚 المراجع</h2>${srcs}</section>
      <div class="pn">
        ${next ? `<a href="#/item/${kind}/${next.id}">‹ ${esc(next.short || next.title)}</a>` : ''}
        ${prev ? `<a href="#/item/${kind}/${prev.id}">${esc(prev.short || prev.title)} ›</a>` : ''}
      </div>
    </article>
    ${credit()}`;
  },

  lessons(tab) {
    tab = tab || 'lessons';
    const tabs = `<div class="tabs"><a href="#/lessons/lessons" class="${tab === 'lessons' ? 'on' : ''}">💡 الدروس</a><a href="#/lessons/duas" class="${tab === 'duas' ? 'on' : ''}">🤲 الأدعية</a><a href="#/lessons/refs" class="${tab === 'refs' ? 'on' : ''}">📚 المراجع</a></div>`;
    let body = '';
    if (tab === 'lessons') {
      ['seerah', 'prophets'].forEach(kind => {
        (D[kind] || []).filter(it => (it.lessons || []).length).forEach(it => {
          body += `<div class="group-t">${it.icon || ''} <a href="#/item/${kind}/${it.id}">${esc(it.title)}</a></div><section class="box" style="margin:0"><ul>${it.lessons.map(l => `<li>${esc(l)}</li>`).join('')}</ul></section>`;
        });
      });
    } else if (tab === 'duas') {
      body = allDuas().map(d => `
        <div class="dua-card">
          <div class="dua">${esc(d.text)}</div>
          <div class="ref">${esc(d.ref || '')} • ${esc(d.from)}</div>
          <div class="row">
            <button class="chipbtn" data-act="speak" data-text="${esc(d.text)}">🔊 استمع</button>
            <button class="chipbtn" data-act="copy" data-text="${esc(d.text)}">📋 نسخ</button>
            <button class="chipbtn ${isFav(d.key) ? 'on' : ''}" data-act="fav" data-key="${esc(d.key)}">${isFav(d.key) ? '♥' : '♡'}</button>
          </div>
        </div>`).join('');
    } else {
      const gen = (D.sources || []);
      if (gen.length) body += `<div class="group-t">مراجع عامة</div><section class="box" style="margin:0"><ul>${gen.map(s => `<li>${esc(s)}</li>`).join('')}</ul></section>`;
      let any = gen.length > 0;
      ['seerah', 'prophets'].forEach(kind => (D[kind] || []).filter(it => (it.sources || []).length).forEach(it => {
        any = true;
        body += `<div class="group-t"><a href="#/item/${kind}/${it.id}">${esc(it.title)}</a></div><section class="box" style="margin:0"><ul>${it.sources.map(s => `<li>${esc(s)}</li>`).join('')}</ul></section>`;
      }));
      if (!any) body = `<div class="empty">لم تُضَف مراجع بعد.<br>أضفها في الملف <b>www/data.js</b> داخل الحقل <b>sources</b> لكل قصة.</div>`;
    }
    return `<h2 class="page-title">💡 الفوائد والعبر</h2>${tabs}${body}${credit()}`;
  },

  favs() {
    const rows = [];
    favs.forEach(k => {
      const [a, b] = k.split(':');
      if (a === 'd') return;
      const it = findItem(a, b);
      if (it) rows.push(`<a class="item" href="#/item/${a}/${b}"><div class="no">${it.icon || '📖'}</div><div><h3>${esc(it.title)}</h3><p>${SEC[a].title}</p></div><span class="heart">♥</span></a>`);
    });
    const duas = allDuas().filter(d => isFav(d.key)).map(d => `<div class="dua-card"><div class="dua">${esc(d.text)}</div><div class="ref">${esc(d.ref || '')}</div><div class="row"><button class="chipbtn" data-act="speak" data-text="${esc(d.text)}">🔊 استمع</button><button class="chipbtn on" data-act="fav" data-key="${esc(d.key)}">♥</button></div></div>`).join('');
    const empty = !rows.length && !duas;
    return `<h2 class="page-title">♥ المفضلة</h2>
      ${empty ? `<div class="empty">لا توجد عناصر في المفضلة بعد.<br>اضغط ♡ داخل أي قصة أو دعاء لحفظه هنا.</div>` : ''}
      ${rows.length ? `<div class="list">${rows.join('')}</div>` : ''}
      ${duas ? `<div class="group-t">الأدعية المحفوظة</div>${duas}` : ''}
      ${credit()}`;
  },

  search(q) {
    q = decodeURIComponent(q || '');
    const nq = norm(q.trim());
    let res = '';
    if (nq.length >= 2) {
      const hits = [];
      ['seerah', 'prophets'].forEach(kind => (D[kind] || []).forEach(it => {
        const hay = norm([it.title, it.short, it.text, ...(it.lessons || []), ...(it.verses || [])].join(' '));
        if (hay.includes(nq)) {
          const pos = norm(it.text).indexOf(nq);
          const snip = pos >= 0 ? '…' + it.text.slice(Math.max(0, pos - 30), pos + 70) + '…' : (it.lessons || [])[0] || '';
          hits.push(`<a class="item" href="#/item/${kind}/${it.id}"><div class="no">${it.icon || '📖'}</div><div><h3>${esc(it.title)}</h3><p>${esc(snip)}</p></div></a>`);
        }
      }));
      const dh = allDuas().filter(d => norm(d.text + ' ' + d.ref).includes(nq)).map(d => `<div class="dua-card"><div class="dua">${esc(d.text)}</div><div class="ref">${esc(d.ref)}</div></div>`);
      res = hits.length || dh.length ? `<div class="list">${hits.join('')}</div>${dh.length ? `<div class="group-t">أدعية</div>${dh.join('')}` : ''}` : `<div class="empty">لا نتائج لـ «${esc(q)}»</div>`;
    } else res = `<div class="empty">اكتب كلمتين على الأقل للبحث.</div>`;
    return `<h2 class="page-title">🔍 البحث</h2>
      <form class="search" data-form="search"><input name="q" value="${esc(q)}" placeholder="ابحث…" autocomplete="off" autofocus><button>🔍</button></form>${res}${credit()}`;
  },

  settings() {
    const seg = (name, opts, cur) => `<div class="seg">${opts.map(([v, l]) => `<button data-act="set" data-name="${name}" data-v="${v}" class="${cur === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    return `<h2 class="page-title">⚙️ الإعدادات</h2>
    <div class="set">
      <div class="r"><span>المظهر</span>${seg('theme', [['auto', 'تلقائي'], ['light', 'فاتح'], ['dark', 'داكن']], settings.theme)}</div>
      <div class="r"><span>حجم خط القراءة<small>${settings.font}px</small></span>
        <div class="seg"><button data-act="font" data-d="-1">A−</button><button data-act="font" data-d="1">A+</button></div></div>
    </div>
    <div class="set">
      <div class="r"><span>إصدار التطبيق<small id="verTxt">${esc(VERSION)}</small></span><button class="btn" data-act="update">🔄 تحقق من التحديث</button></div>
      <div class="r" id="installRow" hidden><span>تثبيت التطبيق على الشاشة الرئيسية</span><button class="btn" data-act="install">تثبيت</button></div>
      <div class="r"><span>مشاركة التطبيق</span><button class="btn alt" data-act="share-app">📤 مشاركة</button></div>
    </div>
    <div class="set">
      <div class="r"><span>مسح بيانات القراءة<small>المفضلة وسجل المتابعة</small></span><button class="btn danger" data-act="clear">مسح</button></div>
    </div>
    ${credit()}`;
  }
};

/* ───── التوجيه ───── */
const TOP = ['', '#/', '#/seerah', '#/prophets', '#/lessons', '#/favs'];
function route() {
  const h = location.hash || '#/';
  const parts = h.replace(/^#\/?/, '').split('/');
  const [p0, p1, p2, p3] = parts;
  const app = $('#app');
  const prevCtx = Reader.ctx;

  let html = '', nav = 'home', isItem = false;
  if (!p0) html = views.home();
  else if (p0 === 'seerah' || p0 === 'prophets') { html = views.list(p0); nav = p0; }
  else if (p0 === 'item') { html = views.item(p1, p2); nav = p1; isItem = true; }
  else if (p0 === 'lessons') { html = views.lessons(p1); nav = 'lessons'; }
  else if (p0 === 'favs') { html = views.favs(); nav = 'favs'; }
  else if (p0 === 'search') { html = views.search(p1); nav = 'home'; }
  else if (p0 === 'settings') { html = views.settings(); nav = 'home'; }
  else html = views.home();

  if (!isItem || !prevCtx || prevCtx.kind !== p1 || prevCtx.id !== p2) Reader.stop();
  app.innerHTML = html;
  window.scrollTo(0, 0);
  $$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.n === nav));
  $('#btnBack').hidden = TOP.includes(h);

  if (isItem) setupItem(p1, p2, p3 === 'r'); else hidePlayer();
  if (p0 === 'settings') checkInstallRow();
}

function setupItem(kind, id, resume) {
  const it = findItem(kind, id);
  if (!it) return hidePlayer();
  const items = D[kind], i = items.indexOf(it), nx = items[i + 1];
  Reader.mount($$('#app .s'), { kind, id, title: it.title, nextRoute: nx ? `#/item/${kind}/${nx.id}` : null });
  showPlayer(it);
  const pr = progress[keyOf(kind, id)];
  if (resume && pr && !pr.done && pr.idx > 0) {
    Reader.idx = Math.min(pr.idx, Reader.list().length - 1);
    setTimeout(() => Reader.moveTo(Reader.idx), 250);
    toast('تابع من حيث توقفت');
  }
  if (sessionStorage.getItem('tamy_autoplay') === '1') {
    sessionStorage.removeItem('tamy_autoplay');
    setTimeout(() => Reader.play(), 700);
  }
}

/* ───── الأحداث ───── */
document.addEventListener('click', e => {
  const sEl = e.target.closest('.s');
  if (sEl && $('#app').contains(sEl) && Reader.ctx) { Reader.playFrom(sEl); return; }
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  switch (act) {
    case 'back': history.length > 1 ? history.back() : (location.hash = '#/'); break;
    case 'go': location.hash = el.dataset.to; break;
    case 'update': checkUpdate(true); break;
    case 'apply-update': applyUpdate(); break;
    case 'pl-toggle': Reader.toggle(); break;
    case 'pl-next': Reader.next(); break;
    case 'pl-prev': Reader.prev(); break;
    case 'pl-more': $('#plMore').classList.toggle('open'); fillVoices(); break;
    case 'rate': {
      settings.rate = parseFloat(el.dataset.r); saveSettings();
      $('#rate').value = settings.rate; $('#rateLbl').textContent = settings.rate.toFixed(2) + '×';
      $$('#rateChips button').forEach(b => b.classList.toggle('on', b === el));
      Reader.restartSoon(); break;
    }
    case 'font': {
      settings.font = Math.max(16, Math.min(34, settings.font + parseInt(el.dataset.d, 10)));
      saveSettings(); applySettings();
      const sm = $('.set small'); if (sm && sm.textContent.endsWith('px')) sm.textContent = settings.font + 'px';
      break;
    }
    case 'fav': {
      const k = el.dataset.key;
      favs = isFav(k) ? favs.filter(x => x !== k) : [...favs, k];
      store('tamy_favs', favs);
      if (location.hash.startsWith('#/favs')) route();
      else if (k.startsWith('d:')) { el.classList.toggle('on', isFav(k)); el.textContent = isFav(k) ? '♥' : '♡'; }
      else { el.classList.toggle('on', isFav(k)); el.textContent = isFav(k) ? '♥ في المفضلة' : '♡ أضف للمفضلة'; }
      toast(isFav(k) ? 'تمت الإضافة للمفضلة ♥' : 'أُزيل من المفضلة');
      break;
    }
    case 'speak': Reader.speakOnce(el.dataset.text); break;
    case 'copy': navigator.clipboard?.writeText(el.dataset.text).then(() => toast('تم النسخ ✓')).catch(() => toast('تعذر النسخ')); break;
    case 'set': settings[el.dataset.name] = el.dataset.v; saveSettings(); applySettings(); route(); break;
    case 'share-app': {
      const data = { title: 'TAMY', text: 'تطبيق TAMY — السيرة النبوية وقصص الأنبياء', url: location.origin + location.pathname };
      navigator.share ? navigator.share(data).catch(() => {}) : navigator.clipboard?.writeText(data.url).then(() => toast('تم نسخ الرابط ✓'));
      break;
    }
    case 'install': if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; checkInstallRow(); } break;
    case 'clear':
      if (confirm('سيتم مسح المفضلة وسجل المتابعة. متأكد؟')) {
        favs = []; progress = {}; last = null;
        ['tamy_favs', 'tamy_progress', 'tamy_last'].forEach(k => localStorage.removeItem(k));
        toast('تم المسح'); route();
      }
      break;
  }
});

document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form="search"]');
  if (!f) return;
  e.preventDefault();
  location.hash = '#/search/' + encodeURIComponent(f.q.value.trim());
});
document.addEventListener('input', e => {
  if (!e.target.matches('[data-filter]')) return;
  const q = norm(e.target.value.trim());
  $$('#listBox .item').forEach(a => a.style.display = !q || a.dataset.s.includes(q) ? '' : 'none');
});

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; checkInstallRow(); });
function checkInstallRow() { const r = $('#installRow'); if (r) r.hidden = !deferredPrompt; }

/* ───── التحديث ───── */
async function checkUpdate(manual) {
  const btns = $$('[data-act="update"]');
  if (manual) btns.forEach(b => b.classList.add('spin'));
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    const j = await r.json();
    if (j.version && j.version !== VERSION) {
      $('#upd').hidden = false;
      $('#upd').dataset.ver = j.version;
      if (manual) toast('يوجد تحديث جديد' + (j.notes ? ': ' + j.notes : ''), 4000);
      return true;
    }
    if (manual) toast('أنت تستخدم أحدث إصدار ✓');
  } catch {
    if (manual) toast('تعذر التحقق — تأكد من اتصال الإنترنت');
  } finally {
    if (manual) setTimeout(() => btns.forEach(b => b.classList.remove('spin')), 500);
  }
  return false;
}
async function applyUpdate() {
  toast('جاري التحديث…', 5000);
  Reader.stop();
  try { const reg = await navigator.serviceWorker?.getRegistration(); await reg?.update(); } catch {}
  try { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); } catch {}
  location.reload();
}

window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
setTimeout(() => checkUpdate(false), 2500);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate(false); });
setInterval(() => checkUpdate(false), 30 * 60 * 1000);
})();
