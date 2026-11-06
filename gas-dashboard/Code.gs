/**
 * 通知表・定期テスト分析ダッシュボード（社内共有用 Webアプリ）
 *
 * データ元：Googleスプレッドシート「通知表」「定期テスト」の 中1・中2・中3 シート。
 * このスクリプトを「自分として実行」でデプロイすると、閲覧する社員は
 * スプレッドシートへのアクセス権がなくても、ダッシュボードだけ見られます。
 */

var SOURCES = {
  g1: { id: '1l35XL4-sgy0nQQExQ3FwqAC-SWsZ1JN_PJC8IAEUFWQ', range: '中1!A1:CL400' },
  g2: { id: '1l35XL4-sgy0nQQExQ3FwqAC-SWsZ1JN_PJC8IAEUFWQ', range: '中2!A1:CE400' },
  g3: { id: '1l35XL4-sgy0nQQExQ3FwqAC-SWsZ1JN_PJC8IAEUFWQ', range: '中3!A1:CH400' },
  t1: { id: '17DDsuCOSeC4cCDrASf7F9TSpp8xvCJZe4iWCVr-5_8s', range: '中1!A1:BC400' },
  t2: { id: '17DDsuCOSeC4cCDrASf7F9TSpp8xvCJZe4iWCVr-5_8s', range: '中2!A1:CC400' },
  t3: { id: '17DDsuCOSeC4cCDrASf7F9TSpp8xvCJZe4iWCVr-5_8s', range: '中3!A1:CH400' }
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('通知表・定期テスト分析')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * 合言葉の確認。スクリプトプロパティ ACCESS_CODE を設定した場合のみ有効
 * （未設定なら合言葉なし）。生徒の成績を含むため、設定をおすすめします。
 */
function needsCode() {
  return !!PropertiesService.getScriptProperties().getProperty('ACCESS_CODE');
}

/** 6つの表の生データ（表示されている文字列）を返す。画面側で集計します。 */
function getRaw(code) {
  var want = PropertiesService.getScriptProperties().getProperty('ACCESS_CODE');
  if (want && String(code || '') !== want) throw new Error('合言葉が違います');
  var books = {};
  var out = {};
  Object.keys(SOURCES).forEach(function (k) {
    var s = SOURCES[k];
    if (!books[s.id]) books[s.id] = SpreadsheetApp.openById(s.id);
    var rng = books[s.id].getRange(s.range);
    out[k] = rng.getDisplayValues();
  });
  return out;
}

/** エディタから実行して、権限の承認とデータ読み込みを確認するための関数。 */
function selfTest() {
  var raw = getRaw();
  Object.keys(raw).forEach(function (k) {
    Logger.log(k + ': ' + raw[k].length + '行 × ' + (raw[k][0] || []).length + '列');
  });
}
