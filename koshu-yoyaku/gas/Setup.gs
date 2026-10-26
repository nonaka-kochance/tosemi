/**
 * 次の講習用に「定員」シートを作り直す（講習ごとに1回だけ実行）
 *
 * 使い方：下の COURSE を次の講習に合わせて書き換え、関数 makeCapacitySheet を実行する。
 * 実行すると「定員」シートの中身が全部作り直されます（受付開始後は実行しないこと）。
 * 細かい定員の調整は、作ったあとで「定員」シートの数字を直接書き換えてください。
 */
const COURSE = {
  // 会場（予約ページの教室ボタン）。Code.gs の BOOTH_SHEETS と同じ順番にする
  rooms: ['大学受験専門館（大分駅）', '大学受験専門館（わさだタウン）', '明野パッション教室'],

  // ターム：名前と期間（年-月-日）
  terms: [
    {name: '第１ターム', from: '2027-03-04', to: '2027-03-10', weekdayPeriods: [4, 5, 6, 7, 8, 9]},
    {name: '第２ターム', from: '2027-03-11', to: '2027-03-17'},
    {name: '第３ターム', from: '2027-03-18', to: '2027-03-24'}
  ],

  // 時限：[番号, 開始, 終了]
  periods: [
    [1, '13:20', '14:10'], [2, '14:15', '14:55'], [3, '15:05', '16:00'],
    [4, '16:15', '17:05'], [5, '17:10', '18:00'], [6, '18:05', '18:55'],
    [7, '19:10', '20:00'], [8, '20:05', '20:55'], [9, '21:00', '21:50']
  ],

  weekdayPeriods: [1, 2, 3, 4, 5, 6, 7, 8, 9],   // 平日に開講する時限（ターム側で上書き可）
  saturdayPeriods: [1, 2, 3, 4, 5, 6, 7, 8, 9],  // 土曜に開講する時限
  closedWeekdays: ['日'],                         // 毎週休みの曜日
  closedDays: [],                                 // 休みの日（例：'3/21'）
  closedSlots: [],                                // 休みのコマ（例：'3/12-1'＝3/12の1時限）

  // 定員（全教室共通の初期値）。t＝ターム番号(0始まり)、md＝'3/4'、w＝曜日、no＝時限
  // 例：第１タームは土曜8・平日4、第２・第３タームは1〜4時限8・5時限以降4、3/20は全時限4
  capacity: (t, md, w, no) => md === '3/20' ? 4 : t === 0 ? (w === '土' ? 8 : 4) : (no <= 4 ? 8 : 4)
};

function makeCapacitySheet() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_CAP) || ss.insertSheet(SHEET_CAP);
  const head = ['枠ID', 'ターム', '日付', '曜日', '時限', '時間'].concat(COURSE.rooms);
  const rows = [head];

  COURSE.terms.forEach((t, ti) => {
    for (let d = new Date(t.from + 'T12:00:00+09:00'); d <= new Date(t.to + 'T12:00:00+09:00'); d = new Date(d.getTime() + 864e5)) {
      const md = Utilities.formatDate(d, TZ, 'M/d');
      const w = '日月火水木金土'[Number(Utilities.formatDate(d, TZ, 'u')) % 7];
      if (COURSE.closedWeekdays.indexOf(w) >= 0 || COURSE.closedDays.indexOf(md) >= 0) continue;
      const open = w === '土' ? COURSE.saturdayPeriods : (t.weekdayPeriods || COURSE.weekdayPeriods);
      COURSE.periods.forEach(([no, s, e]) => {
        const id = md + '-' + no;
        if (open.indexOf(no) < 0 || COURSE.closedSlots.indexOf(id) >= 0) return;
        const cap = COURSE.capacity(ti, md, w, no);
        rows.push([id, t.name, md, w, no + '時限', s + '-' + e].concat(COURSE.rooms.map(() => cap)));
      });
    }
  });

  sh.clear();
  sh.getRange(1, 1, rows.length, 6).setNumberFormat('@');   // 「3/4」が日付に変わらないよう文字列に
  sh.getRange(1, 1, rows.length, head.length).setValues(rows);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
  updateBoothSheets();   // ブース表も新しい日程で作り直す
  SpreadsheetApp.getUi().alert(`「定員」シートを作りました（${rows.length - 1}枠）。定員の数字を確認・調整してください。`);
}
