/**
 * 定期テスト 過去最高チェック（スマホ版専用の Webアプリ）
 *
 * データ元：Googleスプレッドシート「定期テスト 過去最高チェック（自動更新）」の
 *           中3定期テスト・中2定期テスト・中1定期テスト・クラス・個別 の5つのタブと、生徒の名簿タブ（登録漏れチェック用）。
 * 受講科目は「クラス」「個別」タブ（ICCの授業記録）で、授業がある科目から判断します（2026-11-10 変更）。
 * 画面を開くたびに最新の値を読み込むので、スプレッドシートを更新すれば自動で反映されます。
 * 「自分として実行」でデプロイすると、閲覧する社員はスプレッドシートの権限がなくても見られます。
 * 判定ルール（基準点・除外する中高一貫校・Passion+生の扱いなど）は IndexSP.html の中にあります（PC版の Index から取り出したもの）。
 */

var SPREADSHEET_ID = '1GzDY43CMXQY-KdOf-tppeULUp_E1gLa54YNdzNIDaoE';

// 行数の上限なし（列だけ指定）。末尾の空行は読み込み時に取り除きます。
var SOURCES = {
  g3_tests: '中3定期テスト!A1:KN',
  g2_tests: '中2定期テスト!A1:CF',
  g1_tests: '中1定期テスト!A1:CF',
  class_lessons: 'クラス!A1:M',
  kobetsu_lessons: '個別!A1:K',
  roster: '生徒の名簿!A1:T'
};

// なくても動くタブ（登録漏れチェック用・試行）。タブを消したら、画面の「成績表への登録漏れ」が空になるだけ
var OPTIONAL_SOURCES = ['roster'];

// 「クラス」「個別」タブは、受講科目の判断に使う4つの列だけを画面に渡す（生徒名などは渡さない）
var LESSON_COLUMNS = ['校舎', '生徒ID', '学年', '科目'];
var LESSON_SOURCES = ['class_lessons', 'kobetsu_lessons'];

// 東セミのGoogleアカウント（このドメインのメールアドレス）でログインしているブラウザからだけ使える。
// デプロイの「アクセスできるユーザー」を「東セミ内の全員」にしたうえで、コードでも二重に確かめている。
var ALLOWED_DOMAIN = 'tosemi.in';

/** 開いている人が東セミのアカウントか。メールアドレスが分からない（社外・未ログイン）ときは不可。 */
function isStaff_() {
  var email = '';
  try { email = String(Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (e) {}
  return email.slice(-(ALLOWED_DOMAIN.length + 1)) === '@' + ALLOWED_DOMAIN;
}

// このApps Scriptはスマホ版専用。URLに ?sp=1 があってもなくても、必ずスマホ用の画面（IndexSP・ログイン画面）を表示します。
function doGet() {
  if (!isStaff_()) {
    return HtmlService.createHtmlOutput('<p style="font:16px sans-serif;padding:24px;line-height:1.8">東セミのアカウント（@' + ALLOWED_DOMAIN + '）でGoogleにログインしたブラウザからだけ開けます。<br>東セミのアカウントでログインし直してから、もう一度開いてください。</p>')
      .setTitle('過去最高チェック')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  return HtmlService.createHtmlOutputFromFile('IndexSP')
    .setTitle('過去最高チェック')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** 末尾の空行を取り除く。 */
function trimRows_(values) {
  var last = values.length;
  while (last > 0 && values[last - 1].join('') === '') last--;
  return values.slice(0, last);
}

/** 見出し（1行目）の名前で列を探し、指定の列だけを残す。 */
function pickColumns_(values, tab, names) {
  var head = (values[0] || []).map(function (h) { return String(h).trim(); });
  var idx = names.map(function (n) {
    var i = head.indexOf(n);
    if (i < 0) throw new Error('タブ「' + tab + '」に見出し「' + n + '」が見つかりません');
    return i;
  });
  return values.map(function (r) { return idx.map(function (i) { return r[i]; }); });
}

/**
 * タブの値（表示されている文字列）を返す。集計は画面側で行います。
 * 名前の最後に _ を付けて、画面から直接は呼べないようにしている（ログインを通った getRawSP からだけ使う）。
 */
function getRaw_() {
  var book = SpreadsheetApp.openById(SPREADSHEET_ID);
  var out = {};
  Object.keys(SOURCES).forEach(function (k) {
    var parts = SOURCES[k].split('!');
    var sheet = book.getSheetByName(parts[0]);
    if (!sheet && OPTIONAL_SOURCES.indexOf(k) >= 0) { out[k] = []; return; }
    if (!sheet) throw new Error('タブ「' + parts[0] + '」が見つかりません');
    var values = trimRows_(sheet.getRange(parts[1]).getDisplayValues());
    if (LESSON_SOURCES.indexOf(k) >= 0) values = pickColumns_(values, parts[0], LESSON_COLUMNS);
    out[k] = values;
  });
  return out;
}

/**
 * スマホ用の画面（IndexSP）のログイン。IDとパスワードは、このファイルには書かない。
 * 「プロジェクトの設定」→「スクリプト プロパティ」に、1人1つ追加する。
 *   プロパティ：SP_USER_ のあとにID（例：SP_USER_xxxx@tosemi.in）
 *   値　　　　：パスワード,教室（例：1234,かず家S）。教室が複数なら「、」で区切る。全部見てよい人は「全教室」。
 * 追加・変更・削除は、プロパティを書き換えるだけですぐに反映される（新バージョンは不要）。
 * 以前の SP_LOGIN_ID・SP_LOGIN_PASS も、全教室を見られるログインとして引き続き使える。
 */
function spAccounts_() {
  var all = PropertiesService.getScriptProperties().getProperties();
  var list = [];
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('SP_USER_') !== 0) return;
    var id = k.slice(8).trim(), v = String(all[k] || ''), c = v.indexOf(',');
    if (c < 0) c = v.indexOf('，');
    if (!id || c < 0) return;
    var pw = v.slice(0, c).trim();
    var rooms = v.slice(c + 1).split(/[、,，\/]/).map(function (x) { return x.trim(); }).filter(String);
    if (pw && rooms.length) list.push({ id: id, pass: pw, rooms: rooms });
  });
  if (all.SP_LOGIN_ID && all.SP_LOGIN_PASS) list.push({ id: String(all.SP_LOGIN_ID).trim(), pass: String(all.SP_LOGIN_PASS), rooms: ['全教室'] });
  return list;
}

/** 教室名の書き方をそろえる（＋と+、空白、Passion→P、Spirits→S）。画面（Index）の shortRoom と同じ。 */
function shortRoom_(s) {
  return String(s || '').replace(/＋/g, '+').replace(/\s/g, '').replace(/Passion(\+?)$/, 'P$1').replace(/Spirits$/, 'S');
}

/**
 * 見てよい教室の生徒だけを残す（ほかの教室の生徒は、スマホに送らない）。
 * 判定は「その学年でどのテストが行われたか」を使うので、ほかの教室の生徒を外しても結果が変わらないよう、
 * テストごとに点数が1つでもあるかだけを伝える「集計用」の1行を足す（中学校を中高一貫校にして、判定の対象外にしている）。
 */
function filterForRooms_(raw, rooms) {
  var want = {};
  rooms.forEach(function (r) {
    var s = shortRoom_(r);
    want[s] = true;
    if (/SP$/.test(s)) { want[s.slice(0, -2) + 'S'] = true; want[s.slice(0, -2) + 'P'] = true; } // 滝尾SP なら 滝尾S と 滝尾P の両方
  });
  var ids = {};
  var isScore = function (c) { var t = String(c == null ? '' : c).trim(); return t !== '' && isFinite(Number(t)); };
  ['g3_tests', 'g2_tests', 'g1_tests'].forEach(function (k) {
    var v = raw[k] || [], head = v[1] || [];
    var keep = v.slice(0, 2);
    var dummy = head.map(function () { return ''; });
    dummy[1] = STUB_NAME; dummy[3] = '大分豊府';
    var blocks = [];
    for (var c = 4; c < head.length; c++) {
      if (head[c] !== '順位') continue;
      var cols = [];
      for (var q = c + 1; q < c + 7 && q < head.length; q++) {
        if ('国社数理英'.indexOf(String(head[q] || '').trim().charAt(0)) >= 0 && String(head[q] || '').trim() !== '') cols.push(q);
      }
      if (cols.length) blocks.push(cols);
    }
    for (var r = 2; r < v.length; r++) {
      var row = v[r] || [];
      if (!String(row[1] || '').trim()) continue;
      blocks.forEach(function (cols) {
        if (dummy[cols[0]] === '' && cols.some(function (q) { return isScore(row[q]); })) dummy[cols[0]] = '0';
      });
      var sid = String(row[0] || '').trim();
      if (want[shortRoom_(row[2])]) { keep.push(row); ids[sid] = true; }
      // ほかの教室の生徒は、生徒IDだけを残す（名前・教室・学校・点数は送らない）。「成績表への登録漏れ」で
      // 「どこかの教室で登録済みか」を調べるために必要。中学校を中高一貫校にして、判定の対象外にしている
      else if (sid) keep.push([sid, STUB_NAME, '', '大分豊府']);
    }
    keep.push(dummy);
    raw[k] = keep;
  });
  // 「クラス」「個別」は、残した生徒の行だけ（列は 校舎・生徒ID・学年・科目）
  LESSON_SOURCES.forEach(function (k) {
    var v = raw[k] || [];
    raw[k] = v.filter(function (row, i) { return i === 0 || ids[String(row[1] || '').trim()] === true; });
  });
  raw.roster = filterRoster_(raw.roster || [], rooms);
  return raw;
}

// 「生徒の名簿」タブの校舎名のうち、PassionとSpiritsの区別がないもの（画面 Index の ROSTER_ROOM と同じにしておく）
var ROSTER_ROOM = { '滝尾教室': '滝尾SP', '明野Spirits': '明野アクロスSP', 'わさだDesaki': 'わさだDesakiSP' };
var STUB_NAME = '（集計用）';

/** 名簿の校舎名を、画面に出す形（滝尾SP、かず家S など）にする。 */
function rosterRoom_(s) {
  var x = String(s || '').trim();
  return shortRoom_(ROSTER_ROOM[x] || x);
}

/**
 * 名簿の校舎（例：滝尾SP、かず家S、○○）が、見てよい教室（例：滝尾S）に当たるか。
 * SP は S と P の両方、種別なしはその校舎のどの教室にも当たる。画面（IndexSP）の roomHit と同じ。
 */
function roomHit_(shown, room) {
  var cut = function (x) {
    var m = String(x || '').match(/^(.*?)(SP|P\+|P|S|教室)?$/);
    return [m[1], m[2] === '教室' ? '' : (m[2] || '')];
  };
  var a = cut(shown), b = cut(shortRoom_(room));
  if (a[0] !== b[0]) return false;
  if (!a[1] || !b[1] || a[1] === b[1]) return true;
  return (a[1] === 'SP' && (b[1] === 'S' || b[1] === 'P')) || (b[1] === 'SP' && (a[1] === 'S' || a[1] === 'P'));
}

/**
 * 「生徒の名簿」タブ：見てよい教室の生徒はそのまま、ほかの教室の生徒は生徒IDだけを残す
 * （「名簿にいない生徒」で「名簿のどこかにいるか」を調べるために、IDだけは必要）。
 */
function filterRoster_(v, rooms) {
  var hi = -1;
  for (var r = 0; r < v.length && hi < 0; r++) {
    if ((v[r] || []).some(function (c) { return String(c).trim() === '生徒ID'; })) hi = r;
  }
  if (hi < 0) return [];
  var head = v[hi].map(function (h) { return String(h).trim(); });
  var starts = [];
  head.forEach(function (h, i) { if (h === '生徒ID') starts.push(i); });
  var out = v.slice(0, hi + 1).map(function (row) { return row.slice(); });
  for (var q = hi + 1; q < v.length; q++) {
    var row = (v[q] || []).slice();
    starts.forEach(function (s, bi) {
      var end = bi + 1 < starts.length ? starts[bi + 1] : head.length;
      var cRoom = head.indexOf('校舎', s);
      var shown = cRoom >= 0 && cRoom < end ? rosterRoom_(row[cRoom]) : '';
      var mine = rooms.some(function (x) { return roomHit_(shown, x); });
      if (!mine) for (var c = s + 1; c < end; c++) row[c] = '';
    });
    out.push(row);
  }
  return out;
}

/** パスワードの照合。数字だけのパスワードは、先頭の0があってもなくても合うようにする（例：0012 と 12）。 */
function samePass_(input, want) {
  var a = String(input || ''), b = String(want || '');
  if (a === b) return true;
  var num = /^[0-9]+$/;
  return num.test(a) && num.test(b) && a.replace(/^0+/, '') === b.replace(/^0+/, '');
}

/**
 * ログインの記録。スプレッドシート「過去最高チェック（スマホ版）ログイン記録」に1回1行で書く（パスワードは書かない）。
 * 列：日時／結果／入力したID／開いたGoogleアカウント／見られる教室
 * 表がなければ、最初のログインのときに、このApps Scriptを動かすアカウント（nonaka@tosemi.in）のドライブに自動で作る。
 * 作った表のIDはスクリプトプロパティ SP_LOG_SHEET_ID に入る。記録をやめるときは SP_LOG_OFF に 1 を入れる。
 * 記録に失敗しても、ログインそのものは止めない。
 */
function logLogin_(result, id, rooms) {
  try {
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty('SP_LOG_OFF')) return;
    var email = '';
    try { email = Session.getActiveUser().getEmail() || ''; } catch (e) {}
    var lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try {
      var sid = props.getProperty('SP_LOG_SHEET_ID'), book = null;
      if (sid) { try { book = SpreadsheetApp.openById(sid); } catch (e) { book = null; } }
      if (!book) {
        book = SpreadsheetApp.create('過去最高チェック（スマホ版）ログイン記録');
        book.getSheets()[0].appendRow(['日時', '結果', '入力したID', '開いたGoogleアカウント', '見られる教室']);
        book.getSheets()[0].setFrozenRows(1);
        props.setProperty('SP_LOG_SHEET_ID', book.getId());
      }
      var sh = book.getSheets()[0];
      // 先頭が = + - @ の文字は、式として動かないように ' を付けて文字として書く
      var safe = function (s) { s = String(s == null ? '' : s).slice(0, 200); return /^[=+\-@]/.test(s) ? "'" + s : s; };
      sh.appendRow([new Date(), result, safe(id), safe(email), safe((rooms || []).join('、'))]);
    } finally {
      lock.releaseLock();
    }
  } catch (e) {
    console.error('ログイン記録に失敗: ' + e);
  }
}

/** IDとパスワードが合っているときだけ、その人が見てよい教室のデータを返す。 */
function getRawSP(id, pass) {
  if (!isStaff_()) {
    logLogin_('拒否（東セミ以外のアカウント）', id);
    throw new Error('東セミのアカウントでGoogleにログインしたブラウザから開いてください');
  }
  var accounts = spAccounts_();
  if (!accounts.length) throw new Error('スマホ用のIDとパスワードが未設定です。教務課に連絡してください');
  var key = String(id || '').trim().toLowerCase();
  // 5回続けて間違えると、そのIDは10分間ログインできない（パスワードの総当たりを防ぐ）
  var cache = CacheService.getScriptCache();
  var ck = 'spfail_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, key));
  var fails = Number(cache.get(ck) || 0);
  if (fails >= 5) {
    logLogin_('拒否（ロック中）', id);
    throw new Error('まちがいが続いたため、しばらくログインできません。10分ほどたってからお試しください');
  }
  var hit = null;
  accounts.forEach(function (a) {
    if (!hit && a.id.toLowerCase() === key && samePass_(pass, a.pass)) hit = a;
  });
  if (!hit) {
    cache.put(ck, String(fails + 1), 600);
    logLogin_(fails + 1 >= 5 ? '失敗（5回目・10分ロック）' : '失敗（' + (fails + 1) + '回目）', id);
    Utilities.sleep(1500);
    throw new Error('IDかパスワードが違います');
  }
  cache.remove(ck);
  logLogin_('成功', id, hit.rooms);
  var raw = getRaw_();
  var all = hit.rooms.indexOf('全教室') >= 0;
  if (!all) filterForRooms_(raw, hit.rooms);
  raw._sp = { all: all, rooms: all ? [] : hit.rooms.map(shortRoom_) };
  return raw;
}

/** エディタから実行して、権限の承認とデータ読み込みを確認するための関数。 */
function selfTest() {
  Logger.log('今のアカウントは東セミのアカウントと判定：' + isStaff_());
  Logger.log('スマホ用のログイン：' + spAccounts_().length + '件');
  logLogin_('テスト（selfTest）', '');
  Logger.log('ログイン記録の表：https://docs.google.com/spreadsheets/d/' + PropertiesService.getScriptProperties().getProperty('SP_LOG_SHEET_ID'));
  var raw = getRaw_();
  Object.keys(raw).forEach(function (k) {
    Logger.log(k + ': ' + raw[k].length + '行 × ' + (raw[k][0] || []).length + '列');
  });
}
