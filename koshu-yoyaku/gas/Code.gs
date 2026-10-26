/**
 * 高校準備講座 時間枠予約（Webアプリ）
 * 教室・日程・時限・定員はすべて「定員」シートから読み込みます。
 * 申込は「申込」シートに1人1行で保存し、教室ごとのブース表シートも自動で作り直します。
 *
 * ・氏名／メール／電話番号のうち2つ以上が同じ申込は「同じ人」とみなし、
 *   以前の申込を消して今回の内容に置き換えます（空いた枠は他の人が申し込めます）。
 * ・各枠は開始時刻の24時間前で受付終了（選択不可）になります。
 *   締切を過ぎた枠は「受講確定」として、日程変更のときも自動で引き継ぎます。
 */

const SHEET_CAP = '定員';
const SHEET_APP = '申込';
const BOOTH_SHEETS = ['O専門館', 'W専門館', '明野P'];  // 定員シートの教室列の順
const PICK_PER_TERM = 2;          // 1タームで選ぶ枠の数
const CLOSE_HOURS = 24;           // 何時間前で締め切るか
const FEW_LEFT = {4: 1, 8: 2};    // 定員ごとの「残りわずか（△）」の基準
const TZ = 'Asia/Tokyo';
const HOME_HEADER = 'お通いの教室';

function doGet() {
  const t = HtmlService.createTemplateFromFile('index');
  t.rooms = readMaster_().rooms;
  return t.evaluate()
    .setTitle('高校準備講座 時間枠お申し込み')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('予約管理')
    .addItem('ブース表を更新', 'updateBoothSheets')
    .addToUi();
}

// 「定員」シートの数字を変えたら、ブース表もすぐ作り直す
function onEdit(e) {
  if (e && e.range && e.range.getSheet().getName() === SHEET_CAP) updateBoothSheets();
}

/* ---------- 定員シートの読み込み ---------- */

function readMaster_() {
  const v = SpreadsheetApp.getActive().getSheetByName(SHEET_CAP).getDataRange().getDisplayValues();
  // 教室名はG列から右へ、空欄の列の手前まで（メモ欄などは空欄の列をはさめば読み込まない）
  const rooms = [];
  for (let c = 6; c < v[0].length && String(v[0][c]).trim(); c++) rooms.push(String(v[0][c]).trim());
  const terms = [], termIdx = {}, periods = [], slots = {};
  const now = Date.now();

  v.slice(1).forEach(r => {
    const [id, term, d, w, pStr, time] = r.map(x => String(x).trim());
    if (!id || !term || !d) return;
    const no = parseInt(pStr, 10);
    const [s, e] = time.split('-').map(x => x.trim());
    if (!periods[no - 1]) periods[no - 1] = {no: no, s: s, e: e};

    if (!(term in termIdx)) { termIdx[term] = terms.length; terms.push({name: term, days: []}); }
    const tObj = terms[termIdx[term]];
    if (!tObj.days.some(x => x.d === d)) tObj.days.push({d: d, w: w});

    const start = slotStart_(d, w, s);
    slots[id] = {
      term: termIdx[term], d: d, no: no,
      caps: rooms.map((_, i) => Number(r[6 + i]) || 0),
      closed: !start || start.getTime() - now < CLOSE_HOURS * 3600 * 1000,
      label: `${d}(${w}) ${no}時限 ${s}-${e}`
    };
  });

  // 欠番の時限があっても periods[no-1] で引けるように埋める
  for (let i = 0; i < periods.length; i++) if (!periods[i]) periods[i] = {no: i + 1, s: '', e: ''};
  // タームの全枠が締切済みなら、そのタームは受付終了
  terms.forEach((t, i) => {
    t.closed = Object.keys(slots).filter(id => slots[id].term === i).every(id => slots[id].closed);
  });
  return {rooms: rooms, terms: terms, periods: periods, slots: slots};
}

// 「3/4」「木」「16:15」→ 日本時間の開始日時。曜日が合う年（今年か来年）を選ぶ
function slotStart_(d, w, hm) {
  const [m, day] = d.split('/').map(Number);
  const [hh, mi] = (hm || '0:0').split(':').map(Number);
  const y0 = Number(Utilities.formatDate(new Date(), TZ, 'yyyy'));
  const pad = n => ('0' + n).slice(-2);
  for (const y of [y0, y0 + 1]) {
    const dt = new Date(`${y}-${pad(m)}-${pad(day)}T${pad(hh)}:${pad(mi)}:00+09:00`);
    const wd = '日月火水木金土'[new Date(dt.getTime() + 9 * 3600 * 1000).getUTCDay()];
    if (wd === w) return dt;
  }
  return null;
}

/* ---------- 申込シート ---------- */

function normName_(s) { return String(s || '').replace(/[\s　]/g, ''); }
function normMail_(s) { return String(s || '').trim().toLowerCase(); }
// 全角数字は半角にし、ハイフンやスペースなど数字以外を除く（先頭の0は残る）
function normTel_(s) {
  return String(s || '').replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/\D/g, '');
}
function splitIds_(s) { return String(s || '').split(',').map(x => x.trim()).filter(String); }

function readApps_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_APP);
  const v = sh.getDataRange().getDisplayValues();
  const h = v[0];
  // 「お通いの教室」列がなければ右端に追加
  if (h.indexOf(HOME_HEADER) < 0) { sh.getRange(1, h.length + 1).setValue(HOME_HEADER); h.push(HOME_HEADER); v.slice(1).forEach(r => r.push('')); }
  return {
    sh: sh, rows: v.slice(1), width: h.length, home: h.indexOf(HOME_HEADER),
    room: h.indexOf('教室'), name: h.indexOf('生徒氏名'), school: h.indexOf('中学校'),
    mail: h.indexOf('メール'), tel: h.indexOf('電話番号'), ids: h.indexOf('枠ID一覧')
  };
}

// 氏名・メール・電話番号のうち2つ以上が一致する申込の行番号（0始まり）
function findSameUser_(apps, who) {
  const me = [normName_(who.student), normMail_(who.email), normTel_(who.tel)];
  const res = [];
  apps.rows.forEach((r, i) => {
    const it = [normName_(r[apps.name]), normMail_(r[apps.mail]), normTel_(r[apps.tel])];
    if (me.filter((x, k) => x && x === it[k]).length >= 2) res.push(i);
  });
  return res;
}

// 教室ごとの使用数（skip に入っている行は数えない）
function usedCount_(apps, roomName, skip) {
  const used = {};
  apps.rows.forEach((r, i) => {
    if (r[apps.room] !== roomName || skip.indexOf(i) >= 0) return;
    splitIds_(r[apps.ids]).forEach(id => used[id] = (used[id] || 0) + 1);
  });
  return used;
}

// 同じ人の以前の申込（いちばん新しい行）
function prevOf_(apps, m, same, roomName) {
  if (!same.length) return null;
  const r = apps.rows[same[same.length - 1]];
  if (r[apps.room] !== roomName) return {otherRoom: r[apps.room]};
  const ids = splitIds_(r[apps.ids]).filter(id => m.slots[id]);
  return {
    picks: m.terms.map((_, t) => ids.filter(id => m.slots[id].term === t)),
    locked: ids.filter(id => m.slots[id].closed)   // 締切を過ぎた枠＝受講確定
  };
}

/* ---------- 画面から呼ばれる関数 ---------- */

function getSlots(roomIdx, who) {
  const m = readMaster_(), roomName = m.rooms[roomIdx];
  const apps = readApps_(), same = findSameUser_(apps, who || {});
  const used = usedCount_(apps, roomName, same);   // 自分の以前の申込は空きに戻して数える
  const slots = {};
  Object.keys(m.slots).forEach(id => {
    const s = m.slots[id], max = s.caps[roomIdx];
    slots[id] = {max: max, left: s.closed ? 0 : Math.max(0, max - (used[id] || 0)), closed: s.closed};
  });
  return {
    pick: PICK_PER_TERM, few: FEW_LEFT, periods: m.periods, slots: slots,
    terms: m.terms.map(t => ({name: t.name, days: t.days, closed: t.closed})),
    prev: prevOf_(apps, m, same, roomName)
  };
}

function submit(f) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const m = readMaster_(), roomName = m.rooms[f.classroom];
    const name = normName_(f.student), mail = String(f.email || '').trim(), tel = normTel_(f.tel);
    if (!roomName) return {ok: false, msg: '教室を選び直してください。'};
    const home = String(f.home || '').trim();
    if (!name || !home || !String(f.school || '').trim() || !mail) return {ok: false, msg: '必須の項目を入力してください。'};

    const apps = readApps_(), same = findSameUser_(apps, f);
    const prev = prevOf_(apps, m, same, roomName);
    const locked = (prev && prev.locked) || [];

    const picks = [];
    for (let t = 0; t < m.terms.length; t++) {
      const lk = locked.filter(id => m.slots[id].term === t);
      if (m.terms[t].closed) { picks.push(lk); continue; }     // 受付終了のタームは受講確定分をそのまま
      const p = (f.picks && f.picks[t]) || [];
      if (p.length !== PICK_PER_TERM || new Set(p).size !== p.length)
        return {ok: false, msg: `${m.terms[t].name}は${PICK_PER_TERM}つ選んでください。`};
      if (lk.some(id => p.indexOf(id) < 0))
        return {ok: false, msg: '受講確定（締切後）の枠は変更できません。画面を開き直してください。'};
      for (const id of p) {
        if (lk.indexOf(id) >= 0) continue;
        const s = m.slots[id];
        if (!s || s.term !== t || s.caps[f.classroom] <= 0) return {ok: false, msg: '選べない時間枠が含まれています。選び直してください。'};
        if (s.closed) return {ok: false, msg: `${s.label} は受付を終了しました（${CLOSE_HOURS}時間前で締切）。別の時間枠を選んでください。`};
      }
      picks.push(p);
    }

    // 同じ人の以前の申込は数えずに空きを確認
    const used = usedCount_(apps, roomName, same);
    const full = picks.flat().filter(id => locked.indexOf(id) < 0 && (used[id] || 0) >= m.slots[id].caps[f.classroom]);
    if (full.length) return {ok: false, msg: '満席になった時間枠があります。選び直してください。\n' + full.map(id => m.slots[id].label).join('\n')};

    // 変更の申込で電話番号が空欄なら、前回の番号を引き継ぐ
    const tel2 = tel || (same.length ? normTel_(apps.rows[same[same.length - 1]][apps.tel]) : '');
    // 以前の申込を削除（下の行から）して、新しい行を追加
    same.slice().reverse().forEach(i => apps.sh.deleteRow(i + 2));
    const labels = [];
    picks.forEach(p => { for (let k = 0; k < PICK_PER_TERM; k++) labels.push(p[k] ? m.slots[p[k]].label : ''); });
    const row = [Utilities.formatDate(new Date(), TZ, 'yyyy/MM/dd HH:mm:ss'), roomName, name,
      String(f.school).trim(), mail, tel2].concat(labels, [picks.flat().join(',')]);
    while (row.length < apps.width) row.push('');
    row[apps.home] = home;
    const r = apps.sh.getLastRow() + 1;
    apps.sh.getRange(r, 1, 1, row.length).setNumberFormat('@').setValues([row]);
    SpreadsheetApp.flush();

    try { updateBoothSheets(); } catch (e) { console.error(e); }   // ブース表の失敗で申込は止めない
    sendMail_(mail, name, roomName, m, picks, same.length > 0);
    return {ok: true, replaced: same.length > 0};
  } finally {
    lock.releaseLock();
  }
}

function sendMail_(to, name, roomName, m, picks, replaced) {
  const lines = m.terms.map((t, i) => `■${t.name}\n` + (picks[i].length ? picks[i].map(id => '　' + m.slots[id].label + (m.slots[id].closed ? '（受講確定）' : '')).join('\n') : '　（受付終了）'));
  const body =
`${name} 様

東セミ 高校準備講座へのお申し込み${replaced ? '（日程の変更）' : ''}を受け付けました。
${replaced ? '以前のお申し込み内容は取り消し、下記の内容に変更しました。\n' : ''}
【教室】${roomName}

【受講日程】
${lines.join('\n')}

※日程を変更したい場合は、同じお名前・メールアドレス・電話番号で
　もう一度お申し込みください。前回のお申し込みは自動で取り消され、
　新しい内容に置き換わります。
※各時間枠は、開始時刻の${CLOSE_HOURS}時間前まで選択・変更できます。

東セミ 高校部`;
  MailApp.sendEmail({to: to, subject: `【東セミ】高校準備講座 お申し込み${replaced ? '変更' : ''}受付（${roomName}）`, body: body});
}

/* ---------- 教室ごとのブース表 ---------- */

const C_TERM = '#1a3f8f', C_DATE = '#eaf1fb', C_PERIOD = '#d9d9d9', C_NONE = '#efefef', C_OVER = '#f4cccc';
// 席は4つごとに色を変える（1〜4：黄、5〜8：緑、9〜12：青、13〜16：紫）。[空席の色, 申込済みの色]
const SEAT_COLORS = [['#ffff66', '#fffde0'], ['#b7e1a1', '#eef8e8'], ['#a4c2f4', '#e8f0fd'], ['#d5b8f0', '#f4ecfb']];

// ブース表用の短い教室名：「Passion」→「P」、「東セミ〇〇」→「〇〇S」、「教室」は省く
// （例：わさだPassion+教室 → わさだP+、東セミかず家教室 → かず家S）
const SHORT_ROOM_FIXED = {'東セミ滝尾教室': '滝尾SP', '別府鶴見丘Passion教室': '鶴見丘P'};   // 決まりに当てはまらない教室はここで個別に指定
function shortRoom_(s) {
  if (/^(なし|無し|ナシ|一般|一般生)$/.test(String(s).trim())) return '一般生';
  if (SHORT_ROOM_FIXED[String(s).trim()]) return SHORT_ROOM_FIXED[String(s).trim()];
  let r = String(s).replace(/Passion/gi, 'P').replace(/教室/g, '').trim();
  if (/^東セミ./.test(r)) r = r.replace(/^東セミ/, '') + 'S';
  return r;
}

function updateBoothSheets() {
  const m = readMaster_(), apps = readApps_(), ss = SpreadsheetApp.getActive();
  m.rooms.forEach((roomName, ri) => {
    const title = BOOTH_SHEETS[ri];
    if (!title) return;
    // 枠IDごとの申込者（受付順）
    const seat = {};
    apps.rows.forEach(r => {
      if (r[apps.room] !== roomName) return;
      const who = r[apps.name] + (r[apps.home] ? '　' + shortRoom_(r[apps.home]) : '');
      splitIds_(r[apps.ids]).forEach(id => (seat[id] = seat[id] || []).push(who));
    });
    writeBooth_(ss.getSheetByName(title) || ss.insertSheet(title), m, ri, seat);
  });
}

function writeBooth_(sh, m, ri, seat) {
  const width = 1 + Math.max.apply(null, m.terms.map(t => t.days.length));
  const vals = [], bg = [], fc = [], fw = [], fs = [];
  const add = (row, b, c, w, s) => {
    while (row.length < width) row.push('');
    vals.push(row); bg.push(row.map((_, k) => Array.isArray(b) ? b[k] : b));
    fc.push(row.map(() => c)); fw.push(row.map(() => w)); fs.push(row.map(() => s));
  };

  m.terms.forEach(t => {
    add([t.name + '　ブース表'], C_TERM, '#ffffff', 'bold', 14);
    add(['時限'].concat(t.days.map(x => { const [mo, d] = x.d.split('/'); return `${mo}月${d}日(${x.w})`; })), C_DATE, '#1155cc', 'bold', 13);
    m.periods.forEach(p => {
      const caps = t.days.map(x => { const s = m.slots[x.d + '-' + p.no]; return s ? s.caps[ri] : 0; });
      // 定員を減らして申込者が定員を超えた場合も、名前が隠れないように行を足す
      const max = Math.max.apply(null, caps.concat(t.days.map(x => (seat[x.d + '-' + p.no] || []).length)));
      if (max <= 0) return;
      add([`${p.no}時限\n${p.s}〜${p.e}`].concat(t.days.map((x, k) => caps[k] > 0 ? `${p.no}時限 ${p.s}〜${p.e}` : '授業なし')),
        C_PERIOD, '#000000', 'bold', 11);
      for (let k = 0; k < max; k++) {
        const sc = SEAT_COLORS[Math.floor(k / 4) % SEAT_COLORS.length];
        const row = [String(k + 1)], b = [sc[0]];
        t.days.forEach((x, j) => {
          const names = seat[x.d + '-' + p.no] || [];
          if (k >= caps[j]) { row.push(names[k] || ''); b.push(names[k] ? C_OVER : C_NONE); }
          else { row.push(names[k] || ''); b.push(names[k] ? sc[1] : sc[0]); }
        });
        add(row, b, '#000000', 'normal', 11);
      }
    });
    add([''], '#ffffff', '#000000', 'normal', 11);
  });

  sh.clear();
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart();
  if (sh.getMaxRows() < vals.length) sh.insertRowsAfter(sh.getMaxRows(), vals.length - sh.getMaxRows());
  if (sh.getMaxColumns() < width) sh.insertColumnsAfter(sh.getMaxColumns(), width - sh.getMaxColumns());
  const rg = sh.getRange(1, 1, vals.length, width);
  rg.setNumberFormat('@').setValues(vals).setBackgrounds(bg).setFontColors(fc).setFontWeights(fw).setFontSizes(fs)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true)
    .setBorder(true, true, true, true, true, true, '#9e9e9e', SpreadsheetApp.BorderStyle.SOLID);
  sh.setColumnWidth(1, 90);
  sh.setColumnWidths(2, width - 1, 180);
  // ターム見出しは結合せずに左寄せ・はみ出し表示（左の列を固定するため結合は使わない）
  vals.forEach((r, i) => {
    if (bg[i][0] === C_TERM) sh.getRange(i + 1, 1, 1, width).setHorizontalAlignment('left').setWrap(false)
      .setBorder(true, true, true, true, false, true, '#9e9e9e', SpreadsheetApp.BorderStyle.SOLID);
  });
  sh.setFrozenColumns(1);
}
