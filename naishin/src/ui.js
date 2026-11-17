/* ===== 内申点チェック（大分・宮崎）の計算と画面 ===== */
(() => {
  const SUBJ = ['国', '社', '数', '理', '英', '体', '音', '美', '家'];
  // 県ごとの計算。a＝①②（中1学年末・中2学年末）、b＝③（中3 2学期）。[5教科の倍率, 実技4教科の倍率]
  const RULES = {
    大分: { a: [1, 2], b: [2, 4], step: 20 },
    宮崎: { a: [1, 1], b: [1, 1], step: 10 },
  };
  const rule = (p) => RULES[p] || RULES.大分;
  const fullOf = (w) => 25 * w[0] + 20 * w[1];
  const FA = (p) => fullOf(rule(p).a), FB = (p) => fullOf(rule(p).b);
  const MAXOF = (p) => FA(p) * 2 + FB(p);
  const how = (w) => (w[0] === w[1] ? '9教科の合計' + (w[0] > 1 ? '×' + w[0] : '') : '5教科の合計' + (w[0] > 1 ? '×' + w[0] : '') + '＋実技4教科の合計' + (w[1] > 1 ? '×' + w[1] : ''));
  const howShort = (w) => (w[0] === w[1] ? '9教科' + (w[0] > 1 ? '×' + w[0] : '') : '5教科' + (w[0] > 1 ? '×' + w[0] : '') + '＋実技' + (w[1] > 1 ? '×' + w[1] : ''));
  const $ = (id) => document.getElementById(id);
  const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const save = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const load = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };

  /* ---------- 計算 ---------- */
  const full = (a) => !!a && a.length === 9 && a.every((x) => x != null);
  const any = (a) => !!a && a.some((x) => x != null);
  const s5 = (a) => a.slice(0, 5).reduce((p, x) => p + x, 0);
  const s4 = (a) => a.slice(5).reduce((p, x) => p + x, 0);
  const pW = (a, w) => (full(a) ? s5(a) * w[0] + s4(a) * w[1] : null);
  // ①② 中1学年末・中2学年末（大分：5教科＋実技×2＝65点、宮崎：9教科＝45点）
  const pA = (a, p) => pW(a, rule(p).a);
  // ③ 中3 2学期（大分：5教科×2＋実技×4＝130点、宮崎：9教科＝45点）
  const pB = (a, p) => pW(a, rule(p).b);
  // 新しい方を優先して、教科ごとに埋める（例：中3 2学期がない教科は中3 1学期）
  const merge = (newer, older) => newer.map((x, i) => (x != null ? x : older[i]));

  /**
   * 生徒1人の計算。返す値：
   *  cat：分類（kakutei 確定／kari 仮／more3 中3が入力漏れ／more12 中1・中2が入力漏れ／mikomi 中2の見込み／more1 中1学年末が入力漏れ）
   *  p1,p2,p3：①②③（出せないときは null）、total：合計（出せないときは null）、max：③が満点のときの合計
   *  base2,base3：シミュレーションの最初の値（9教科）、sim2,sim3：②③を仮入力できるか、src2,src3：何の評定を使ったか
   */
  const calc = (s) => {
    const P = s.pref;
    const r = { p1: pA(s.t1, P), p2: null, p3: null, total: null, max: null, sim2: false, sim3: false, src2: '', src3: '', miss: [] };
    if (s.grade === '中3') {
      r.p2 = pA(s.t2, P);
      if (r.p1 == null) r.miss.push('中1学年末');
      if (r.p2 == null) r.miss.push('中2学年末');
      if (r.miss.length) { r.cat = 'more12'; return r; }
      if (full(s.t32)) { r.p3 = pB(s.t32, P); r.cat = 'kakutei'; r.src3 = '中3 2学期'; }
      else {
        const m = merge(s.t32, s.t31);
        r.sim3 = true;
        if (full(m)) { r.p3 = pB(m, P); r.cat = 'kari'; r.src3 = any(s.t32) ? '中3 2学期（ない教科は1学期）' : '中3 1学期'; r.base3 = m; }
        else { r.cat = 'more3'; r.base3 = m.map((x, i) => (x != null ? x : s.t2[i])); r.src3 = '中3の通知表がないので、中2学年末の評定を入れています'; }
      }
      r.max = r.p1 + r.p2 + FB(P);
      if (r.p3 != null) r.total = r.p1 + r.p2 + r.p3;
      return r;
    }
    // 中2：中1学年末がなければ入力漏れ。あれば、今の評定のまま行ったときの見込みと、②③の仮入力
    if (r.p1 == null) { r.miss.push('中1学年末'); r.cat = 'more1'; return r; }
    r.cat = 'mikomi';
    let now = null, src = '';
    if (full(s.t2)) { now = s.t2; src = '中2学年末'; r.p2fix = true; }
    else if (any(s.t22) || any(s.t21)) { now = merge(merge(s.t2, s.t22), s.t21); src = any(s.t22) ? '中2 2学期' : '中2 1学期'; }
    if (!full(now)) { now = merge(now || s.t1.map(() => null), s.t1); src = src ? src + '（ない教科は中1学年末）' : '中1学年末'; r.noNow = !any(s.t21) && !any(s.t22) && !any(s.t2); }
    r.base2 = now; r.base3 = now; r.sim2 = !r.p2fix; r.sim3 = true;
    r.src2 = r.p2fix ? '中2学年末' : src + 'のまま';
    r.src3 = src + 'のまま';
    r.p2 = pA(now, P); r.p3 = pB(now, P);
    r.total = r.p1 + r.p2 + r.p3;
    r.max = r.p1 + (r.p2fix ? r.p2 : FA(P)) + FB(P);
    return r;
  };

  /* ---------- 画面 ---------- */
  const CATS = {
    中3: [
      { k: 'kakutei', label: '確定', title: '内申点が確定した生徒', cls: 'ok' },
      { k: 'kari', label: '仮（中3 1学期）', title: '仮の生徒', note: '中3 2学期がまだなので、中3 1学期の評定を③として計算しています。カードを押すと③を試せます。', cls: 'plain' },
      { k: 'more3', label: '中3が入力漏れ', title: '中3が入力漏れの生徒', note: '①②はあるのに、中3の通知表が入っていません。カードを押すと③を入れて試せます。', cls: 'warn' },
      { k: 'more12', label: '中1・中2が入力漏れ', title: '中1・中2が入力漏れの生徒', note: '中1学年末か中2学年末が入っていないため、合計を出していません。', cls: 'warn' },
    ],
    中2: [
      { k: 'mikomi', label: '今のままの見込み', title: '今のまま行ったときの見込み', note: '今の中2の評定のまま中2学年末と中3 2学期を迎えたときの合計です。カードを押すと②③を入れて試せます。', cls: 'plain' },
      { k: 'more1', label: '中1が入力漏れ', title: '中1学年末が入力漏れの生徒', note: '中1学年末が入っていないため、合計を出していません。', cls: 'warn' },
    ],
  };
  const ALL = { k: 'every', title: '全員' };
  const st = { data: [], pref: '大分', prefs: [], grade: '中3', room: '全教室', rooms: [], all: false, list: null, band: null, q: '', limit: 30, sort: 'high', open: null, sim: {}, goal: {}, schoolsBy: {}, aliasBy: {}, roomsAll: [], noSheet: [] };
  const GROUP = { わさだDesakiP: 'わさだDesakiSP', わさだDesakiS: 'わさだDesakiSP', 滝尾P: '滝尾SP', 滝尾S: '滝尾SP', 明野アクロスP: '明野アクロスSP', 明野アクロスS: '明野アクロスSP' };
  const grp = (r) => GROUP[r] || r;
  const uniq = (a) => [...new Set(a)].sort((x, y) => x.localeCompare(y, 'ja'));
  const catOf = (k) => (k === 'every' ? ALL : [...CATS.中3, ...CATS.中2].find((c) => c.k === k));

  const base = () => st.data.filter((x) => x.s.pref === st.pref && x.s.grade === st.grade && (st.room === '全教室' || grp(x.s.room) === st.room));
  // シミュレーションを入れた生徒は、その合計で並べる
  const shown = (x) => { const m = st.sim[x.s.id + x.s.grade]; return m ? simTotal(x, m) : x.c.total; };
  const rowsOf = () => {
    let rows = base();
    if (st.list !== 'every') rows = rows.filter((x) => (st.band ? st.band.cats.includes(x.c.cat) && x.c.total != null && x.c.total >= st.band.lo && x.c.total <= st.band.hi : x.c.cat === st.list));
    const val = (x) => x.c.total ?? -1;
    const byName = (a, b) => String(a.s.name).localeCompare(String(b.s.name), 'ja');
    if (st.sort === 'wish') {
      // 志望校別：第一志望校の基準点が高い学校から。基準点がない学校はそのあと（名前順）、志望校なしは最後。学校の中は内申点が高い順
      const rank = (x) => { const k = wishKey(x.s); return k.score != null ? [0, -k.score, k.name] : k.name ? [1, 0, k.name] : [2, 0, '']; };
      return rows.sort((a, b) => { const ra = rank(a), rb = rank(b); return ra[0] - rb[0] || ra[1] - rb[1] || ra[2].localeCompare(rb[2], 'ja') || val(b) - val(a) || byName(a, b); });
    }
    return rows.sort((a, b) => (st.sort === 'low' ? val(a) - val(b) : val(b) - val(a)) || byName(a, b));
  };

  const simTotal = (x, m) => {
    const p2 = x.c.sim2 ? pA(m.v2, x.s.pref) : x.c.p2;
    const p3 = pB(m.v3, x.s.pref);
    return p2 == null || p3 == null ? null : x.c.p1 + p2 + p3;
  };

  const chip = (c) => {
    const t = { kakutei: ['ok', '確定'], kari: ['kari', '仮'], more3: ['warn', '中3入力漏れ'], more12: ['warn', '入力漏れ'], mikomi: ['kari', '見込み'], more1: ['warn', '入力漏れ'] }[c.cat];
    return mk('span', 'stu-st ' + t[0], t[1]);
  };
  const scoreLine = (x) => {
    const c = x.c, box = mk('div', 'score');
    if (c.total == null && !(c.cat === 'more3')) {
      box.append(mk('p', 'miss', c.miss.join('・') + ' が入っていません'));
      return box;
    }
    const big = mk('p', 'total');
    big.append(mk('b', '', c.total == null ? '－' : String(c.total)), mk('small', '', ' / ' + MAXOF(x.s.pref)));
    box.append(big);
    if (c.cat !== 'kakutei' && c.max != null) box.append(mk('p', 'max', '最大 ' + c.max));
    return box;
  };
  const parts = (x) => {
    const c = x.c, g = mk('div', 'parts');
    const cell = (label, v, full, note) => { const d = mk('div', 'pt' + (v == null ? ' none' : '') + (note ? ' kari' : '')); d.append(mk('i', '', label), mk('b', '', v == null ? '－' : String(v)), mk('small', '', '/' + full)); return d; };
    const kari2 = x.s.grade === '中2' && !c.p2fix;
    const kari3 = c.cat !== 'kakutei';
    const P = x.s.pref;
    g.append(cell('①中1末', c.p1, FA(P)), cell('②中2末', c.p2, FA(P), kari2), cell('③中3', c.p3, FB(P), kari3 && c.p3 != null));
    return g;
  };
  const card = (x) => {
    const c = mk('article', 'stu tapcard');
    const h = mk('div', 'stu-h');
    h.append(mk('span', 'stu-g', x.s.grade), mk('span', 'stu-n', x.s.name));
    if (st.room === '全教室' || /SP$/.test(st.room)) h.append(mk('span', 'stu-r', x.s.room));
    h.append(chip(x.c));
    c.append(h);
    const row = mk('div', 'stu-m');
    row.append(scoreLine(x), parts(x));
    c.append(row);
    const g0 = defGoal(x.s), wl = wishText(x.s);
    if (wl) {
      const p = mk('p', 'wish', wl);
      const t0 = x.c.total;
      if (g0.target && t0 != null) { const d = Number(g0.target) - t0; p.append(mk('b', d <= 0 ? 'ok' : 'ng', d <= 0 ? '　届いている（+' + -d + '）' : '　あと ' + d + '点')); }
      c.append(p);
    }
    const m = st.sim[x.s.id + x.s.grade];
    if (m) { const t = simTotal(x, m); c.append(mk('p', 'simmark', '試した合計 ' + (t == null ? '－' : t) + (m.target ? '　' + (m.school || '目標') + ' ' + m.target : ''))); }
    c.onclick = () => openDetail(x);
    return c;
  };

  const num = (id, n) => { const e = $(id); if (e) e.replaceChildren(document.createTextNode(String(n)), mk('small', '', '人')); };
  const drawHome = () => {
    const rows = base();
    const box = $('cats'); box.replaceChildren();
    CATS[st.grade].forEach((c) => {
      const b = mk('button', 'tap ' + c.cls); b.type = 'button';
      const n = rows.filter((x) => x.c.cat === c.k).length;
      b.append(mk('i', '', c.label), mk('b', '', ''));
      b.lastChild.replaceChildren(document.createTextNode(String(n)), mk('small', '', '人'));
      b.onclick = () => openList(c.k);
      box.append(b);
    });
    $('every-btn').textContent = '全員を見る（' + rows.length + '人）';
    // 点数の分布
    const cats = st.grade === '中3' ? ['kakutei', 'kari'] : ['mikomi'];
    $('dist-sub').textContent = st.grade === '中3' ? '確定と仮' : '今のままの見込み';
    const scored = rows.filter((x) => cats.includes(x.c.cat) && x.c.total != null);
    const bands = [];
    // 点数の帯（大分は20点ごと、宮崎は10点ごと）。いちばん上は満点まで（例：241〜260）
    const MAX = MAXOF(st.pref), step = rule(st.pref).step;
    for (let hi = MAX; hi > 0; hi -= step) bands.push({ lo: Math.max(hi - step + 1, 0), hi, cats });
    const used = bands.map((b) => ({ ...b, n: scored.filter((x) => x.c.total >= b.lo && x.c.total <= b.hi).length }));
    let first = used.findIndex((b) => b.n), last = used.length - 1 - [...used].reverse().findIndex((b) => b.n);
    const dist = $('dist'); dist.replaceChildren();
    if (first < 0) dist.append(mk('div', 'empty', '該当する生徒はいません'));
    else {
      const top = Math.max(...used.map((b) => b.n));
      used.slice(first, last + 1).forEach((b) => {
        const r = mk('button', 'band'); r.type = 'button';
        const bar = mk('span', 'bbar'); const fill = mk('span', ''); fill.style.width = (b.n / top) * 100 + '%'; bar.append(fill);
        r.append(mk('span', 'blab', b.lo + '〜' + b.hi), bar, mk('b', '', b.n + '人'));
        r.disabled = !b.n;
        r.onclick = () => openList(null, b);
        dist.append(r);
      });
    }
    const avg = scored.length ? Math.round(scored.reduce((p, x) => p + x.c.total, 0) / scored.length) : null;
    $('avg').textContent = avg == null ? '' : '平均 ' + avg + '点';
    $('room-name').textContent = st.room === '全教室' ? (st.all ? '全教室' : st.rooms.join('・')) : st.room;
    document.querySelectorAll('#grades button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.g === st.grade)));
    document.querySelectorAll('#prefs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.p === st.pref)));
    const R = rule(st.pref);
    $('pref-tag').textContent = st.pref;
    $('pref-txt').textContent = MAXOF(st.pref) + '点満点（中1学年末＋中2学年末＋中3 2学期）';
    $('help-calc').replaceChildren(...[['① 中1学年末', R.a], ['② 中2学年末', R.a], ['③ 中3 2学期', R.b]].map(([n, w]) => { const li = mk('li'); li.append(mk('b', '', n), document.createTextNode('（' + fullOf(w) + '点）：' + how(w))); return li; }));
    $('help-title').textContent = '計算のしかた（' + st.pref + '・' + MAXOF(st.pref) + '点満点）';
    $('help-max').textContent = '③が満点（' + FB(st.pref) + '点）だったときの合計です。';
    const nos = st.noSheet.includes(st.grade);
    $('nosheet').hidden = !nos;
  };

  const drawList = () => {
    const L = st.band ? { title: st.band.lo + '〜' + st.band.hi + '点の生徒', note: st.grade === '中3' ? '確定と仮の生徒です。' : '今のまま行ったときの見込みです。' } : catOf(st.list);
    const q = st.q.replace(/[\s　]/g, '');
    const rows = rowsOf().filter((x) => !q || String(x.s.name).replace(/[\s　]/g, '').includes(q));
    $('list-title').textContent = L.title;
    $('list-count').textContent = rows.length + '人';
    $('list-note').textContent = st.grade + '　' + (L.note || '');
    $('sort').value = st.sort;
    const box = $('cards'); box.replaceChildren();
    if (!rows.length) box.append(mk('div', 'empty', '該当する生徒はいません'));
    let prev = null;
    rows.slice(0, st.limit).forEach((x) => {
      if (st.sort === 'wish') {
        const k = wishKey(x.s), label = k.name ? k.name + (k.score != null ? '（基準点 ' + k.score + '）' : '（基準点なし）') : '第一志望校なし';
        if (label !== prev) { const n = rows.filter((y) => { const kk = wishKey(y.s); return kk.name === k.name; }).length; box.append(mk('h3', 'grp', label + '　' + n + '人')); prev = label; }
      }
      box.append(card(x));
    });
    if (rows.length > st.limit) {
      const b = mk('button', 'more ghost', 'さらに表示（残り ' + (rows.length - st.limit) + '人）');
      b.type = 'button'; b.onclick = () => { st.limit += 30; drawList(); };
      box.append(b);
    }
  };

  /* ---------- 生徒1人の画面（評定とシミュレーション） ---------- */
  const TERMROWS = [['t1', '中1学年末'], ['t21', '中2 1学期'], ['t22', '中2 2学期'], ['t2', '中2学年末'], ['t31', '中3 1学期'], ['t32', '中3 2学期']];
  const gradeTable = (s) => {
    const t = mk('table', 'gt');
    const hr = mk('tr'); hr.append(mk('th', '', '')); SUBJ.forEach((x) => hr.append(mk('th', '', x))); t.append(hr);
    TERMROWS.forEach(([k, label]) => {
      if (s.grade === '中2' && (k === 't31' || k === 't32')) return;
      const r = mk('tr'); r.append(mk('th', '', label));
      s[k].forEach((v) => r.append(mk('td', v == null ? 'none' : '', v == null ? '－' : String(v))));
      t.append(r);
    });
    return t;
  };
  // 9教科の評定を 1〜5 のボタンで入れる
  const picker = (vals, onChange) => {
    const box = mk('div', 'pick');
    SUBJ.forEach((sj, i) => {
      const row = mk('div', 'pk' + (i === 5 ? ' gap' : ''));
      row.append(mk('span', 'pk-s', sj));
      const seg = mk('div', 'seg');
      for (let v = 1; v <= 5; v++) {
        const b = mk('button', '', String(v)); b.type = 'button';
        b.setAttribute('aria-pressed', String(vals[i] === v));
        b.onclick = () => { vals[i] = v; seg.querySelectorAll('button').forEach((y, j) => y.setAttribute('aria-pressed', String(j + 1 === v))); onChange(); };
        seg.append(b);
      }
      row.append(seg);
      box.append(row);
    });
    return box;
  };
  const schools = () => st.schoolsBy[st.pref] || [];
  // 志望校の書き方（略し方も）から、「基準」タブの高校を探す
  const findSchool = (w) => {
    w = String(w || '').trim(); if (!w) return null;
    const name = (st.aliasBy[st.pref] || {})[w] || w;
    return schools().find((x) => x.name === name) || null;
  };
  // 最初に入れておく目標：第一志望校（基準点がなければ第二志望校）
  const defGoal = (s) => {
    const hit = findSchool(s.wish1) || findSchool(s.wish2);
    return hit ? { school: hit.name, target: String(hit.score) } : { school: '', target: '' };
  };
  // 志望校別に並べるときのまとまり（第一志望校）
  const wishKey = (s) => {
    const h = findSchool(s.wish1);
    return h ? { name: h.name, score: h.score } : { name: String(s.wish1 || '').trim(), score: null };
  };
  const wishText = (s) => {
    const one = (w) => { const h = findSchool(w); return h ? h.name + ' ' + h.score : w; };
    const a = [s.wish1 && '①' + one(s.wish1), s.wish2 && '②' + one(s.wish2)].filter(Boolean);
    return a.length ? '志望 ' + a.join('　') : '';
  };
  // 目標点：「基準」タブの高校を選ぶか、点数を入れる
  const goalBox = (m, onChange) => {
    const box = mk('div', 'tgt');
    let selRef = null;
    if (schools().length) {
      const lab = mk('label', 'tgt-l', '志望校を選ぶ');
      const sel = mk('select', 'tgt-sel');
      [['', '（選ばない）'], ...schools().map((x) => [x.name, x.name + '　' + x.score + '点'])].forEach(([v, tx]) => { const o = mk('option', '', tx); o.value = v; sel.append(o); });
      sel.value = m.school || '';
      sel.onchange = () => {
        const hit = schools().find((x) => x.name === sel.value);
        m.school = hit ? hit.name : '';
        if (hit) { m.target = String(hit.score); tin.value = m.target; }
        onChange();
      };
      lab.append(sel); box.append(lab);
      selRef = sel;
    }
    const lab2 = mk('label', 'tgt-l', '目標点' + (schools().length ? '（自分で入れることもできます）' : ''));
    const tin = mk('input'); tin.type = 'number'; tin.inputMode = 'numeric'; tin.min = '0'; tin.max = String(MAXOF(st.pref)); tin.placeholder = '例：200'; tin.value = m.target || '';
    tin.oninput = () => {
      m.target = tin.value.trim();
      const hit = schools().find((x) => x.name === m.school);
      if (hit && String(hit.score) !== m.target) { m.school = ''; if (selRef) selRef.value = ''; }
      onChange();
    };
    lab2.append(tin); box.append(lab2);
    return box;
  };
  const goalLine = (m, total) => {
    const d = Number(m.target) - total;
    const who = m.school ? m.school + '（' + m.target + '点）' : '目標（' + m.target + '点）';
    return mk('p', 'goal ' + (d <= 0 ? 'ok' : 'ng'), d <= 0 ? '🎉 ' + who + 'に届いています（' + -d + '点の余裕）' : who + 'まで あと ' + d + '点');
  };
  const drawDetail = () => {
    const x = st.open, s = x.s, c = x.c;
    const body = $('d-body'); body.replaceChildren();
    const head = mk('section', 'card');
    const h = mk('div', 'stu-h');
    h.append(mk('span', 'stu-g', s.grade), mk('span', 'stu-n', s.name), chip(c));
    head.append(h, mk('p', 'stu-sub', [s.room, s.school].filter(Boolean).join('　')));
    if (wishText(s)) head.append(mk('p', 'stu-sub', wishText(s) + ([s.wish1, s.wish2].some((w) => w && !findSchool(w)) ? '（基準点がない学校は選べません）' : '')));
    const row = mk('div', 'stu-m'); row.append(scoreLine(x), parts(x)); head.append(row);
    if (c.cat === 'kari') head.append(mk('p', 'stu-sub', '③（色つき）は ' + c.src3 + ' の評定で計算した仮の点です。'));
    if (s.grade === '中2' && c.cat === 'mikomi') head.append(mk('p', 'stu-sub', '②③（色つき）は ' + c.src3 + 'で計算した見込みです。'));
    body.append(head);
    const gt = mk('section', 'card'); gt.append(mk('h2', '', '通知表の評定')); const sc = mk('div', 'gt-wrap'); sc.append(gradeTable(s)); gt.append(sc);
    if (!c.sim3) {
      // 確定の生徒：志望校の基準点と比べるだけ
      if (c.total != null) {
        const key = s.id + s.grade;
        const m = st.goal[key] || (st.goal[key] = defGoal(s));
        const card = mk('section', 'card sim');
        card.append(mk('h2', '', '志望校と比べる'));
        const res = mk('div', 'simres');
        const upd = () => { res.replaceChildren(); const tv = Number(m.target); res.append(m.target !== '' && isFinite(tv) ? goalLine(m, c.total) : mk('p', 'mini', '志望校を選ぶか、目標点を入れてください。')); };
        card.append(goalBox(m, upd), res);
        body.append(card);
        upd();
      }
      body.append(gt);
      return;
    }
    // シミュレーション
    const key = s.id + s.grade;
    const m = st.sim[key] || { v2: (c.base2 || []).slice(), v3: c.base3.slice(), ...(st.goal[key] || defGoal(s)) };
    const sim = mk('section', 'card sim');
    sim.append(mk('h2', '', 'シミュレーション'));
    sim.append(mk('p', 'mini', s.grade === '中3' ? '③中3 2学期の評定を入れると、合計が変わります。最初は ' + c.src3.replace(/のまま$/, '') + ' の評定です。' : '②中2学年末と③中3 2学期の評定を入れると、合計が変わります。最初は今の評定（' + c.src3.replace(/のまま$/, '') + '）です。'));
    const res = mk('div', 'simres');
    const tgt = goalBox(m, () => upd());
    const upd = (init) => {
      if (init !== true) st.sim[key] = m; // 開いただけでは「試した」にしない
      const t = simTotal(x, m);
      const p2 = c.sim2 ? pA(m.v2, s.pref) : c.p2, p3 = pB(m.v3, s.pref);
      res.replaceChildren();
      const big = mk('p', 'total'); big.append(mk('i', '', '試した合計'), mk('b', '', t == null ? '－' : String(t)), mk('small', '', ' / ' + MAXOF(s.pref))); res.append(big);
      res.append(mk('p', 'mini', '① ' + c.p1 + ' ＋ ② ' + (p2 ?? '－') + ' ＋ ③ ' + (p3 ?? '－')));
      const tv = Number(m.target);
      if (m.target !== '' && isFinite(tv) && t != null) {
        res.append(goalLine(m, t));
        // ③だけでどこまで必要か（中3）、②③で必要か（中2）
        const rest = tv - c.p1 - (c.sim2 ? 0 : c.p2);
        const room = c.sim2 ? FA(s.pref) + FB(s.pref) : FB(s.pref);
        res.append(mk('p', 'mini', (c.sim2 ? '②③' : '③') + 'で必要な点：' + Math.max(rest, 0) + ' / ' + room + (rest > room ? '（満点でも届きません）' : '')));
      }
    };
    sim.append(res, tgt);
    if (c.sim2) { sim.append(mk('h3', '', '② 中2学年末（' + howShort(rule(s.pref).a) + '）')); sim.append(picker(m.v2, upd)); }
    sim.append(mk('h3', '', '③ 中3 2学期（' + howShort(rule(s.pref).b) + '）'));
    sim.append(picker(m.v3, upd));
    const reset = mk('button', 'more ghost', '最初の評定に戻す'); reset.type = 'button';
    reset.onclick = () => { delete st.sim[key]; drawDetail(); };
    sim.append(reset);
    body.append(sim, gt);
    upd(true);
  };

  const show = () => {
    $('home').hidden = !!(st.list || st.band || st.open);
    $('list').hidden = !(st.list || st.band) || !!st.open;
    $('detail').hidden = !st.open;
    if (st.open) drawDetail(); else if (st.list || st.band) drawList(); else drawHome();
  };
  let listY = 0;
  const openList = (key, band) => { st.list = key; st.band = band || null; st.q = ''; st.limit = 30; $('q').value = ''; show(); window.scrollTo(0, 0); };
  const openDetail = (x) => { listY = window.scrollY; st.open = x; show(); window.scrollTo(0, 0); };
  $('every-btn').onclick = () => openList('every');
  $('back').onclick = () => { st.list = null; st.band = null; show(); window.scrollTo(0, 0); };
  $('d-back').onclick = () => { st.open = null; show(); window.scrollTo(0, (st.list || st.band) ? listY : 0); };
  $('q').addEventListener('input', (e) => { st.q = e.target.value.trim(); st.limit = 30; drawList(); });
  $('sort').addEventListener('change', (e) => { st.sort = e.target.value; save('ns-sort', st.sort); st.limit = 30; drawList(); });
  { const s0 = load('ns-sort'); if (['high', 'low', 'wish'].includes(s0)) st.sort = s0; }
  document.querySelectorAll('#grades button').forEach((b) => b.addEventListener('click', () => { st.grade = b.dataset.g; save('ns-grade', st.grade); show(); }));
  $('room-sel').addEventListener('change', (e) => { st.room = e.target.value; show(); });
  document.querySelectorAll('#prefs button').forEach((b) => b.addEventListener('click', () => { st.pref = b.dataset.p; save('ns-pref', st.pref); setRooms(); show(); }));
  // 教室の選び方（その県の生徒がいる教室だけ）
  const setRooms = () => {
    const here = uniq(st.data.filter((x) => x.s.pref === st.pref).map((x) => grp(x.s.room)));
    st.rooms = st.all ? here : st.roomsAll.filter((r) => here.includes(r) || !st.data.some((x) => grp(x.s.room) === r));
    const many = st.all || st.rooms.length > 1;
    st.room = many ? '全教室' : (st.rooms[0] || '全教室');
    const sel = $('room-sel'); sel.replaceChildren(); sel.hidden = !many;
    if (many) [['全教室', st.all ? '全教室' : '担当の教室すべて'], ...st.rooms.map((r) => [r, r])].forEach(([v, t]) => { const o = mk('option', '', t); o.value = v; sel.append(o); });
  };
  $('help-btn').onclick = () => { $('help').hidden = false; };
  $('help-close').onclick = () => { $('help').hidden = true; };
  $('help').addEventListener('click', (e) => { if (e.target === $('help')) $('help').hidden = true; });

  // ログイン後に呼ぶ。data = { students, info: { rooms, all, at }, noSheet }
  window.nsStart = (data) => {
    const info = data.info || {};
    st.all = !!info.all;
    st.noSheet = data.noSheet || [];
    st.data = (data.students || []).map((s) => ({ s, c: calc(s) }));
    st.sim = {}; st.goal = {};
    st.schoolsBy = data.schools || {};
    st.aliasBy = data.alias || {};
    // 県：生徒がいる県だけ。2つあれば切り替えボタンを出す
    st.prefs = Object.keys(RULES).filter((p) => st.data.some((x) => x.s.pref === p));
    const p0 = load('ns-pref');
    st.pref = st.prefs.includes(p0) ? p0 : (st.prefs[0] || '大分');
    $('prefs').hidden = st.prefs.length < 2;
    st.roomsAll = uniq((info.rooms || []).map(grp));
    setRooms();
    const g = load('ns-grade'); st.grade = ['中3', '中2'].includes(g) ? g : '中3';
    st.list = null; st.band = null; st.open = null; $('help').hidden = true;
    $('read-at').textContent = info.at ? info.at + ' に読み込み' : '';
    show();
  };
  window.nsStop = () => { st.data = []; st.sim = {}; st.goal = {}; st.list = null; st.band = null; st.open = null; $('cards').replaceChildren(); $('d-body').replaceChildren(); };
  window.nsCalc = calc; // 確認用
})();
