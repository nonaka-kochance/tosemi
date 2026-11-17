/**
 * 内申点チェック（大分・260点満点）スマホ用の Webアプリ
 *
 * データ元：Googleスプレッドシート「内申点チェック（自動更新）」のタブ「中3」「中2」（同じ列の形）。
 *   1行目：時期（中1\n学年末、中2\n学年末、中3\n1学期、中3\n2学期 など）
 *   2行目：見出し（ICC生徒ID・名前・教室名・（中学校）・国語・社会・数学・理科・英語・５科合計・体育・音楽・美術・家庭科・９科合計）
 *   3行目から生徒。列は見出しの名前で探すので、時期のまとまりが増えても動きます（見出しの名前は変えないでください）。
 * 画面を開くたびに最新の値を読み込むので、スプレッドシートを更新すれば自動で反映されます。
 * 計算（①②③と合計、入力漏れ・仮の判定）は Index.html の中にあります。
 *
 * 「自分として実行」でデプロイすると、閲覧する社員はスプレッドシートの権限がなくても見られます。
 */

var SPREADSHEET_ID = '11_taqonCOus6xlzNfq-DS61OBkH59kDDEQQA5W4PcOo';
// 学年ごとのタブ（タブ名を変えたら、ここも変える）
var GRADE_SHEETS = { 中3: '中3', 中2: '中2' };

// 大分の生徒だけを使う。中学校の列は「市町村名＋学校名」（例：大分王子、別府明豊）なので、
// 先頭が大分県の市町村名の生徒を大分とする。宮崎・福岡を作るときはここを変える
var PREF_CITIES = ['大分', '別府', '中津', '日田', '佐伯', '臼杵', '津久見', '竹田', '豊後高田', '杵築', '宇佐', '豊後大野', '由布', '国東', '姫島', '日出', '九重', '玖珠'];
// 宮崎県の市町村で、大分県の市町村名と先頭が同じになるものはない（念のため、ここに書いたものは大分から外す）
var NOT_PREF = [];

// 中高一貫校（公立高校入試の内申点の対象外として外す）。過去最高チェックと同じ一覧（中学校の列と完全に一致したら外す）
var IKKAN = ['大分豊府', '大分岩田', '大分向陽', '大分大分', '宮崎日本大学', '宮崎宮崎学園', '宮崎宮崎西附属', '宮崎宮崎第一', '別府明豊', '宮崎日向学院',
  '大分豊府中', '大分岩田中', '大分向陽中', '大分中', '宮崎日本大学中', '宮崎学園中', '宮崎西高附属中', '宮崎第一中', '明豊中', '日向学院中'];

// 使う時期（1行目の文字。改行と空白は無視して比べる）。タブにない時期は、すべて未入力として扱う
var TERMS = { t1: '中1学年末', t21: '中2 1学期', t22: '中2 2学期', t2: '中2学年末', t31: '中3 1学期', t32: '中3 2学期' };
var SUBJECTS = ['国語', '社会', '数学', '理科', '英語', '体育', '音楽', '美術', '家庭科'];

// 東セミのGoogleアカウント（このドメインのメールアドレス）でログインしているブラウザからだけ使える。
// デプロイの「アクセスできるユーザー」を「東セミ内の全員」にしたうえで、コードでも二重に確かめている。
var ALLOWED_DOMAIN = 'tosemi.in';

function isStaff_() {
  var email = '';
  try { email = String(Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (e) {}
  return email.slice(-(ALLOWED_DOMAIN.length + 1)) === '@' + ALLOWED_DOMAIN;
}

function doGet() {
  if (!isStaff_()) {
    return HtmlService.createHtmlOutput('<p style="font:16px sans-serif;padding:24px;line-height:1.8">東セミのアカウント（@' + ALLOWED_DOMAIN + '）でGoogleにログインしたブラウザからだけ開けます。<br>東セミのアカウントでログインし直してから、もう一度開いてください。</p>')
      .setTitle('内申点チェック')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('内申点チェック')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

var norm_ = function (s) { return String(s == null ? '' : s).replace(/[\s　]/g, ''); };

/** 教室名の書き方をそろえる（＋と+、空白、Passion→P、Spirits→S）。過去最高チェックと同じ。 */
function shortRoom_(s) {
  return String(s || '').replace(/＋/g, '+').replace(/\s/g, '').replace(/Passion(\+?)$/, 'P$1').replace(/Spirits$/, 'S');
}

/** 評定として使える値（1〜5）だけを数にする。空白・#N/A・-1 などは null（未入力）。 */
function grade_(v) {
  var t = String(v == null ? '' : v).trim();
  if (!/^[1-5]$/.test(t)) return null;
  return Number(t);
}

function isExcluded_(school) {
  return IKKAN.indexOf(norm_(school)) >= 0;
}

/** 中学校の列から、大分県の生徒か。市町村名は長いものから比べる（豊後高田と豊後大野など）。 */
function cityOf_(school) {
  var s = norm_(school);
  var list = PREF_CITIES.slice().sort(function (a, b) { return b.length - a.length; });
  for (var i = 0; i < list.length; i++) if (s.indexOf(list[i]) === 0) return list[i];
  return '';
}

/**
 * 学年ごとのタブを読み、大分の生徒（中高一貫校を除く）について、計算に必要な値だけを返す。
 * 返す形：{ students: [{ grade, id, name, room, school, t1:[9], t21, t22, t2, t31, t32 }], excluded: 一貫校の人数, other: 大分以外の学校名の先頭2文字, noSheet: [タブがない学年] }
 * 評定の並びは SUBJECTS の順（国・社・数・理・英・体・音・美・家）。未入力は null。
 */
function getStudents_() {
  var book = SpreadsheetApp.openById(SPREADSHEET_ID);
  var res = { students: [], excluded: 0, other: [], noSheet: [] };
  Object.keys(GRADE_SHEETS).forEach(function (grade) {
    var name = GRADE_SHEETS[grade];
    var sheet = name ? book.getSheetByName(name) : null;
    if (!sheet) { res.noSheet.push(grade); return; }
    readSheet_(sheet, grade, res);
  });
  return res;
}

function readSheet_(sheet, grade, res) {
  var v = sheet.getDataRange().getDisplayValues();
  if (v.length < 2) return;
  var tab = sheet.getName();
  var top = v[0], head = v[1].map(norm_);
  var col = function (name) {
    var i = head.indexOf(name);
    if (i < 0) throw new Error('タブ「' + tab + '」に見出し「' + name + '」が見つかりません');
    return i;
  };
  var cId = col('ICC生徒ID'), cName = col('名前'), cRoom = col('教室名');
  var cSchool = cRoom + 1; // 中学校の列（見出しが空のため、教室名の右隣）
  // 時期ごとに、9教科の列番号を探す（その時期がタブになければ null）
  var cols = {};
  Object.keys(TERMS).forEach(function (k) {
    var want = norm_(TERMS[k]);
    if (!top.some(function (x) { return norm_(x) === want; })) { cols[k] = null; return; }
    cols[k] = SUBJECTS.map(function (s) {
      for (var c = 0; c < head.length; c++) if (norm_(top[c]) === want && head[c] === s) return c;
      throw new Error('タブ「' + tab + '」の「' + TERMS[k] + '」に「' + s + '」の列が見つかりません');
    });
  });
  for (var r = 2; r < v.length; r++) {
    var row = v[r];
    var id = String(row[cId] || '').trim(), nm = String(row[cName] || '').trim();
    if (!id && !nm) continue;
    if (id.charAt(0) === '#' && !nm) continue;
    var school = String(row[cSchool] || '').trim();
    if (!cityOf_(school) || NOT_PREF.indexOf(norm_(school)) >= 0) { res.other.push(norm_(school).slice(0, 2)); continue; }
    if (isExcluded_(school)) { res.excluded++; continue; }
    var s = { grade: grade, id: id, name: nm, room: shortRoom_(row[cRoom]), school: school };
    Object.keys(cols).forEach(function (k) {
      s[k] = cols[k] ? cols[k].map(function (c) { return grade_(row[c]); }) : SUBJECTS.map(function () { return null; });
    });
    res.students.push(s);
  }
}

/**
 * ログイン。IDとパスワードは、このファイルには書かない（過去最高チェックのスマホ版と同じ形）。
 * 「プロジェクトの設定」→「スクリプト プロパティ」に、1人1つ追加する。
 *   プロパティ：SP_USER_ のあとにID（例：SP_USER_xxxx@tosemi.in）
 *   値　　　　：パスワード,教室（例：1234,かず家P）。教室が複数なら「、」で区切る。全部見てよい人は「全教室」。
 */
function spAccounts_() {
  var all = PropertiesService.getScriptProperties().getProperties();
  var list = [];
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('SP_USER_') !== 0) return;
    var id = k.slice(8).trim(), val = String(all[k] || ''), c = val.indexOf(',');
    if (c < 0) c = val.indexOf('，');
    if (!id || c < 0) return;
    var pw = val.slice(0, c).trim();
    var rooms = val.slice(c + 1).split(/[、,，\/]/).map(function (x) { return x.trim(); }).filter(String);
    if (pw && rooms.length) list.push({ id: id, pass: pw, rooms: rooms });
  });
  return list;
}

/** ログインの教室（例：滝尾SP）が、生徒の教室（例：滝尾P）に当たるか。SP は S と P の両方。 */
function roomMatch_(want, room) {
  var w = shortRoom_(want), r = shortRoom_(room);
  if (w === r) return true;
  if (/SP$/.test(w)) { var b = w.slice(0, -2); return r === b + 'S' || r === b + 'P' || r === b + 'P+'; }
  if (/P$/.test(w) && r === w + '+') return true; // ◯◯P は ◯◯P+ も見られる
  return false;
}

function samePass_(input, want) {
  var a = String(input || ''), b = String(want || '');
  if (a === b) return true;
  var num = /^[0-9]+$/;
  return num.test(a) && num.test(b) && a.replace(/^0+/, '') === b.replace(/^0+/, '');
}

/** IDとパスワードが合っているときだけ、その人が見てよい教室の生徒を返す。 */
function getNaishinSP(id, pass) {
  if (!isStaff_()) throw new Error('東セミのアカウントでGoogleにログインしたブラウザから開いてください');
  var accounts = spAccounts_();
  if (!accounts.length) throw new Error('IDとパスワードが未設定です。教務課に連絡してください');
  var key = String(id || '').trim().toLowerCase();
  // 5回続けて間違えると、そのIDは10分間ログインできない
  var cache = CacheService.getScriptCache();
  var ck = 'nsfail_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, key));
  var fails = Number(cache.get(ck) || 0);
  if (fails >= 5) throw new Error('まちがいが続いたため、しばらくログインできません。10分ほどたってからお試しください');
  var hit = null;
  accounts.forEach(function (a) { if (!hit && a.id.toLowerCase() === key && samePass_(pass, a.pass)) hit = a; });
  if (!hit) {
    cache.put(ck, String(fails + 1), 600);
    Utilities.sleep(1500);
    throw new Error('IDかパスワードが違います');
  }
  cache.remove(ck);
  var data = getStudents_();
  delete data.other;
  var all = hit.rooms.indexOf('全教室') >= 0;
  if (!all) {
    data.students = data.students.filter(function (s) {
      return hit.rooms.some(function (w) { return roomMatch_(w, s.room); });
    });
  }
  data.info = { all: all, rooms: all ? [] : hit.rooms.map(shortRoom_), at: Utilities.formatDate(new Date(), 'Asia/Tokyo', 'M/d H:mm') };
  return data;
}

/** エディタから実行して、権限の承認とデータ読み込みを確認するための関数（生徒名は出さない）。 */
function selfTest() {
  Logger.log('今のアカウントは東セミのアカウントと判定：' + isStaff_());
  Logger.log('ログインの登録：' + spAccounts_().length + '件');
  var d = getStudents_();
  Logger.log('大分の生徒：' + d.students.length + '人（中高一貫校で外した生徒：' + d.excluded + '人）');
  if (d.noSheet.length) Logger.log('タブが未設定の学年：' + d.noSheet.join('、'));
  var rooms = {};
  d.students.forEach(function (s) { var k = s.grade + ' ' + s.room; rooms[k] = (rooms[k] || 0) + 1; });
  Logger.log('教室ごとの人数：' + JSON.stringify(rooms));
  var other = {};
  d.other.forEach(function (x) { other[x || '（中学校が空）'] = (other[x || '（中学校が空）'] || 0) + 1; });
  Logger.log('大分以外として外した生徒（中学校の先頭2文字ごとの人数）：' + JSON.stringify(other));
}
