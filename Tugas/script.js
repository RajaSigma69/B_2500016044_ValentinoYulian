(() => {
  'use strict';

  /* ------------------------------------------------------------------
     DOM handles
     ------------------------------------------------------------------ */
  const $ = id => document.getElementById(id);
  const disp = $('disp'), expr = $('expr'), msg = $('msg'), keys = $('keys');
  const opKeys = [...keys.querySelectorAll('[data-op]')];

  /* ------------------------------------------------------------------
     Calculator state
       cur     what is on the display, kept as a string while typing
       acc     left-hand number of a pending operation
       op      pending operator: + - * /
       fresh   true = the next digit starts a new number
       justEq  true = the display shows a result from "="
       lastOp / lastVal  remembered so pressing "=" again repeats it
     ------------------------------------------------------------------ */
  let cur = '0', acc = null, op = null, fresh = false, err = false, justEq = false;
  let lastOp = null, lastVal = null, line = '';

  const MAX_DIGITS = 12;
  const SYM = { '+': '+', '-': '-', '*': '×', '/': '÷' };
  const CHEER = ['Sugoi! ✦', 'Yatta! ✦', 'Kawaii! ✦', 'Subarashii! ✦', 'Nice one, senpai!'];
  const pick = a => a[Math.floor(Math.random() * a.length)];

  /* ------------------------------------------------------------------
     Audio: chiptune SFX + background music (Web Audio).
     Tuned to D major, ~99 BPM: every beep is a
     D-major-pentatonic note, so the SFX blend with the music.
     ------------------------------------------------------------------ */
  const BOOT = 'Ganbatte! Let\u2019s count together!';
  const AUD = { ctx: null, master: null, sfx: true, bgm: false, unlocked: false };
  const PENT = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99, 880, 987.77];

  function ac() {
    if (!AUD.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      const c = AUD.ctx = new C(), comp = c.createDynamicsCompressor();
      AUD.master = c.createGain(); AUD.master.gain.value = .9;
      AUD.master.connect(comp); comp.connect(c.destination);
    }
    if (AUD.ctx.state === 'suspended') AUD.ctx.resume();
    return AUD.ctx;
  }
  const now = () => AUD.ctx.currentTime;

  function tone(f, t, dur, o = {}) {
    const c = AUD.ctx, osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(o.vol || .2, t + .005);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    osc.connect(g); g.connect(AUD.master); osc.start(t); osc.stop(t + dur + .02);
  }
  function noise(t, dur, vol, hp, dest) {
    const c = AUD.ctx, n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || AUD.master); s.start(t);
  }

  /* one sound per kind of key */
  const SFX = {
    digit(d) { const t = now(), f = PENT[d]; tone(f, t, .09, { vol: .2 }); tone(f * 2, t + .035, .07, { type: 'triangle', vol: .1 }); },
    op()   { const t = now(); tone(587.33, t, .06, { vol: .18 }); tone(880, t + .06, .1, { vol: .18 }); },
    eq()   { const t = now(); [587.33, 739.99, 880, 1174.66].forEach((f, i) => tone(f, t + i * .075, .14, { vol: .2 }));
             tone(2349.3, t + .3, .25, { type: 'triangle', vol: .12 }); },
    clr()  { const t = now(); tone(1174.66, t, .3, { type: 'sawtooth', vol: .14, to: 196 }); noise(t, .2, .12, 4000); },
    del()  { tone(293.66, now(), .08, { vol: .18, to: 146.83 }); },
    dot()  { tone(1318.5, now(), .04, { vol: .14 }); },
    sign() { const t = now(); tone(440, t, .05, { vol: .16 }); tone(659.25, t + .05, .07, { vol: .16 }); },
    nope() { tone(196, now(), .12, { vol: .16, to: 130 }); },
    err()  { const t = now(); tone(220, t, .18, { type: 'sawtooth', vol: .2, to: 110 }); tone(165, t + .16, .3, { type: 'sawtooth', vol: .2, to: 60 }); }
  };
  function sfx(name, arg) { if (AUD.sfx && ac()) SFX[name](arg); }

  /* browsers only allow sound after a tap/keypress: unlock on the first one */
  ['click', 'keydown'].forEach(ev => addEventListener(ev, () => {
    if (AUD.unlocked) return;
    AUD.unlocked = true; ac();
  }, { capture: true }));

  /* ------------------------------------------------------------------
     Background music: an original instrumental loop (no vocals), played
     live by the synth. D major, 99 BPM, 8 bars: arpeggio + melody + bass + light drums.
     ------------------------------------------------------------------ */
  const BGM_STEP = 60 / 99 / 2;                         // one eighth note
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);     // MIDI note -> Hz
  const CH = [[62,66,69,74], [57,61,64,69], [59,62,66,71], [55,59,62,67]];   // D, A, Bm, G
  const ROOT = [38, 45, 47, 43];
  const PROG = [0, 1, 2, 3, 0, 1, 3, 1];                // chord per bar
  const ARP = [0, 1, 2, 3, 2, 1, 2, 1];
  const MEL = [                                         // melody, 8 eighths per bar, 0 = rest
    [78,0,81,78,76,0,74,0], [76,0,78,76,73,0,76,0], [78,0,83,81,78,0,74,0], [76,0,79,76,74,0,71,0],
    [74,78,81,0,86,0,81,0], [73,76,81,0,76,0,73,0], [71,74,79,0,74,0,71,0], [76,0,73,0,69,0,73,76]
  ];
  let bgmOut = null, bgmTimer = null, bgmNext = 0, bgmI = 0, bgmNoise = null;

  function bt(f, t, dur, type, vol) {
    const c = AUD.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(bgmOut); o.start(t); o.stop(t + dur + .02);
  }
  function kick(t) {
    const c = AUD.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + .12);
    g.gain.setValueAtTime(.6, t); g.gain.exponentialRampToValueAtTime(.0001, t + .15);
    o.connect(g); g.connect(bgmOut); o.start(t); o.stop(t + .17);
  }
  function hit(t, hp, vol, dur) {
    const c = AUD.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = bgmNoise; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bgmOut); s.start(t); s.stop(t + dur + .02);
  }
  function bgmStep(i, t) {
    const bar = Math.floor(i / 8) % 8, s = i % 8, q = BGM_STEP, p = PROG[bar];
    bt(hz(CH[p][ARP[s]]), t, q * .9, 'triangle', .22);                 // arpeggio
    if (MEL[bar][s]) bt(hz(MEL[bar][s]), t, q * 1.6, 'square', .1);    // melody
    if (s % 4 === 0) { bt(hz(ROOT[p]), t, q * 3.6, 'triangle', .5); kick(t); }   // bass + kick on beats 1 and 3
    if (s === 2 || s === 6) hit(t, 1800, .2, .12);                     // snare on beats 2 and 4
    if (s % 2) hit(t, 7000, .08, .04);                                 // hi-hat on the off-beats
  }
  function bgmOn() {
    const c = ac();
    if (!c) { AUD.bgm = false; paintTools(); return; }
    if (bgmTimer) return;
    bgmOut = c.createGain(); bgmOut.gain.setValueAtTime(.0001, c.currentTime);
    bgmOut.gain.linearRampToValueAtTime(.35, c.currentTime + .8); bgmOut.connect(AUD.master);
    bgmNoise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = bgmNoise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    bgmI = 0; bgmNext = c.currentTime + .1;
    const pump = () => { while (bgmNext < c.currentTime + .4) { bgmStep(bgmI++, bgmNext); bgmNext += BGM_STEP; } };
    pump(); bgmTimer = setInterval(pump, 100);
  }
  function bgmOff() {
    if (!bgmTimer) return;
    clearInterval(bgmTimer); bgmTimer = null;
    const out = bgmOut, c = AUD.ctx;
    out.gain.cancelScheduledValues(c.currentTime);
    out.gain.setValueAtTime(out.gain.value, c.currentTime);
    out.gain.linearRampToValueAtTime(.0001, c.currentTime + .3);
    setTimeout(() => out.disconnect(), 400);
  }

  /* ------------------------------------------------------------------
     Math engine
     toPrecision(12) trims binary floating-point noise, so 0.1 + 0.2
     shows 0.3 and 1 / 3 shows 0.333333333333. Division by zero and
     overflow throw, and the UI turns them into friendly error states.
     ------------------------------------------------------------------ */
  function calc(a, o, b) {
    let r;
    switch (o) {
      case '+': r = a + b; break;
      case '-': r = a - b; break;
      case '*': r = a * b; break;
      case '/':
        if (b === 0) throw new Error('div0');
        r = a / b; break;
    }
    if (!Number.isFinite(r)) throw new Error('big');
    return Number(r.toPrecision(12));
  }

  /* number -> display string (12 significant digits, exponent when huge or tiny) */
  function fmt(n) {
    if (n === 0) return '0';                       // also turns -0 into 0
    const a = Math.abs(n);
    if (a >= 1e12 || a < 1e-9) {
      return n.toExponential(6).replace(/\.?0+e/, 'e').replace('e+', 'e');
    }
    return String(Number(n.toPrecision(12)));
  }

  /* ------------------------------------------------------------------
     Pixel mascot: sprites are drawn from text maps onto a 16x13 canvas
     o outline  f face  p pink  e eye  w shine  m mouth  b tear
     ------------------------------------------------------------------ */
  const cv = $('mascot'), ctx = cv.getContext('2d');
  const PAL = { o:'#3b2160', f:'#fff1f8', p:'#ff8fb8', e:'#3b2160', w:'#ffffff', m:'#d94b7a', b:'#7fd4ff' };
  const T = '.' + 'o'.repeat(14) + '.', F = 'o' + 'f'.repeat(14) + 'o';
  const BASE = [
    '..oo........oo..',
    '.oppo......oppo.',
    T, F, F, F,
    'offeeffffffeeffo',
    'offweffffffweffo',
    'offeeffffffeeffo',
    'opppffffffffpppo',
    'offffffmmffffffo',
    F, T
  ];
  /* each mood only overrides the rows that change (eyes + mouth) */
  const MOODS = {
    idle:  {},
    happy: { 7:'ofeffeffffeffefo', 8:F, 10:'offfffmmmmfffffo', 11:'offffffmmffffffo' },
    wow:   { 10:'offffffmmffffffo', 11:'offffffmmffffffo' },
    sad:   { 7:'offeeffffffeeffo', 9:'oppbffffffffbppo', 10:'offffffmmffffffo', 11:'offfffmffmfffffo' }
  };
  function paint(mood) {
    ctx.clearRect(0, 0, 16, 13);
    BASE.forEach((row, y) => {
      const r = (MOODS[mood][y] || row).padEnd(16, '.').slice(0, 16);
      [...r].forEach((c, x) => {
        if (PAL[c]) { ctx.fillStyle = PAL[c]; ctx.fillRect(x, y, 1, 1); }
      });
    });
  }

  /* mascot says something; a temporary mood falls back to idle after `hold` ms */
  let moodTimer;
  function say(text, mood = 'idle', hold = 0) {
    msg.textContent = text;
    paint(mood);
    clearTimeout(moodTimer);
    if (hold) moodTimer = setTimeout(() => paint('idle'), hold);
  }

  /* ------------------------------------------------------------------
     Rendering. fit() shrinks the font until the text fits its box.
     ------------------------------------------------------------------ */
  function fit(el, sizes) {
    for (const s of sizes) {
      el.style.fontSize = s + 'px';
      if (el.scrollWidth <= el.clientWidth) break;
    }
  }
  function render() {
    disp.textContent = err ? 'ERROR' : cur;
    expr.textContent = line;
    fit(disp, [24, 20, 16, 12, 10, 8]);
    fit(expr, [10, 8]);
    opKeys.forEach(k => k.classList.toggle('on', op !== null && fresh && k.dataset.op === op));
  }

  /* ------------------------------------------------------------------
     Actions
     ------------------------------------------------------------------ */
  function clearAll(silent) {
    cur = '0'; acc = null; op = null; fresh = false; err = false;
    justEq = false; lastOp = null; lastVal = null; line = '';
    if (!silent) say('✦ Clear! ✦ Ganbatte!', 'happy', 1800);
    render();
  }

  function fail(code) {
    clearAll(true);
    err = true;
    sfx('err');
    say(code === 'div0' ? 'Gomen ne! Can\u2019t divide by zero!' : 'Eep! That\u2019s too big for me~', 'sad');
    render();
  }

  /* a new number is starting: drop the old result's context if needed */
  function beginEntry() {
    if (err) { clearAll(true); say('Ganbatte! Try again~'); }
    if (fresh) {
      if (justEq) { acc = null; op = null; line = ''; justEq = false; }
      cur = '0'; fresh = false;
    }
  }

  function digit(d) {
    beginEntry();
    const neg = cur[0] === '-' ? '-' : '';
    const body = neg ? cur.slice(1) : cur;
    if (body === '0') cur = neg + d;
    else if (body.replace('.', '').length < MAX_DIGITS) cur += d;
    else { sfx('nope'); say('Gomen! Only ' + MAX_DIGITS + ' digits~', 'wow', 1500); }
    render();
  }

  function dot() {
    beginEntry();
    if (!cur.includes('.')) cur += '.';
    render();
  }

  function sign() {
    if (err) return;
    if (fresh && op !== null) { cur = '-0'; fresh = false; }     // typing a negative 2nd number
    else if (cur !== '0') cur = cur[0] === '-' ? cur.slice(1) : '-' + cur;
    render();
  }

  function back() {
    if (err || fresh) return;
    cur = cur.slice(0, -1);
    if (cur === '' || cur === '-' || cur === '-0') cur = '0';
    render();
  }

  function setOp(o) {
    if (err) return;
    if (op !== null && fresh) {                    // operator pressed twice: just swap it
      op = o; line = fmt(acc) + ' ' + SYM[o]; render(); return;
    }
    const v = parseFloat(cur);
    try {
      if (op !== null) { acc = calc(acc, op, v); cur = fmt(acc); }   // chain: 2 + 3 * ...
      else acc = v;
    } catch (e) { return fail(e.message); }
    op = o; fresh = true; justEq = false;
    line = fmt(acc) + ' ' + SYM[o];
    say('Hai! Next number~');
    render();
  }

  function equals() {
    if (err) return;
    let a, b, o;
    if (op !== null) { a = acc; b = parseFloat(cur); o = op; }                      // normal
    else if (justEq && lastOp !== null) { a = parseFloat(cur); b = lastVal; o = lastOp; } // repeat "="
    else { sfx('dot'); return; }
    try {
      const r = calc(a, o, b);
      line = fmt(a) + ' ' + SYM[o] + ' ' + fmt(b) + ' =';
      lastOp = o; lastVal = b;
      acc = r; cur = fmt(r); op = null; fresh = true; justEq = true;
      sfx('eq');
      say(pick(CHEER), 'happy', 2400);
      render();
    } catch (e) { fail(e.message); }
  }

  /* ------------------------------------------------------------------
     Input: one click handler for every key, plus keyboard shortcuts
     that simply click the matching on-screen key.
     ------------------------------------------------------------------ */
  keys.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const { d, op: o, a } = b.dataset;
    if (d !== undefined) { sfx('digit', d); digit(d); }
    else if (o) { sfx('op'); setOp(o); }
    else if (a === 'eq') equals();                 // equals() plays its own fanfare / error buzz
    else if (a === 'clr') { sfx('clr'); clearAll(false); }
    else if (a === 'del') { sfx('del'); back(); }
    else if (a === 'dot') { sfx('dot'); dot(); }
    else if (a === 'sign') { sfx('sign'); sign(); }
  });

  const KEYMAP = {
    '.': '[data-a=dot]', ',': '[data-a=dot]', 'Enter': '[data-a=eq]', '=': '[data-a=eq]',
    'Backspace': '[data-a=del]', 'Escape': '[data-a=clr]', 'Delete': '[data-a=clr]',
    'c': '[data-a=clr]', 'C': '[data-a=clr]', 'x': '[data-op="*"]', 'X': '[data-op="*"]'
  };
  addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    let sel = KEYMAP[e.key];
    if (!sel && /^[0-9]$/.test(e.key)) sel = '[data-d="' + e.key + '"]';
    if (!sel && /^[+\-*\/]$/.test(e.key)) sel = '[data-op="' + e.key + '"]';
    const b = sel && keys.querySelector(sel);
    if (!b) return;
    e.preventDefault();                            // also stops Enter re-clicking a focused key
    b.classList.add('press');
    setTimeout(() => b.classList.remove('press'), 120);
    b.click();
  });

  /* ------------------------------------------------------------------
     Day / night toggle (no storage: it resets on reload)
     ------------------------------------------------------------------ */
  const root = document.documentElement, themeBtn = $('theme');
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : mq.matches;
  function paintTheme() {
    themeBtn.textContent = isDark() ? 'DAY' : 'NIGHT';
    themeBtn.setAttribute('aria-label', isDark() ? 'Switch to day mode' : 'Switch to night mode');
  }
  themeBtn.addEventListener('click', () => { sfx('dot'); root.dataset.theme = isDark() ? 'light' : 'dark'; paintTheme(); });
  if (mq.addEventListener) mq.addEventListener('change', paintTheme);

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  const sfxBtn = $('sfxBtn'), bgmBtn = $('bgmBtn');
  function paintTools() {
    [[sfxBtn, 'SFX', AUD.sfx], [bgmBtn, 'MUSIC', AUD.bgm]].forEach(([b, n, on]) => {
      b.textContent = n + (on ? ' ON' : ' OFF'); b.setAttribute('aria-pressed', String(on));
    });
  }
  sfxBtn.addEventListener('click', () => { AUD.sfx = !AUD.sfx; paintTools(); sfx('dot'); });
  bgmBtn.addEventListener('click', () => {
    AUD.bgm = !AUD.bgm; paintTools(); sfx('dot');
    if (AUD.bgm) bgmOn(); else bgmOff();
  });

  paintTheme(); paintTools();
  say(BOOT);
  render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);  // re-fit once the pixel font loads
  addEventListener('resize', render);
})();
