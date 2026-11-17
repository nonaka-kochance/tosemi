/**
 * 【一時的に使う】過去最高チェック（スマホ版）の Apps Script に、この関数をそのまま足して1回実行する。
 * ログに出た1行（{"SP_USER_…"}）をコピーして、内申点チェックのスクリプト プロパティ NS_IMPORT に貼る。
 * 使い終わったら、この関数は消す（パスワードを含む1行をログに出すため）。
 */
function exportLogins() {
  var all = PropertiesService.getScriptProperties().getProperties();
  var out = {};
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('SP_USER_') === 0 || k === 'SP_LOGIN_ID' || k === 'SP_LOGIN_PASS') out[k] = all[k];
  });
  Logger.log(JSON.stringify(out));
}
