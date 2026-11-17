/* 試し版：Apps Script の代わりに、架空の生徒データを返す（本物の生徒データは入っていません） */
(() => {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const g = (base) => Math.max(1, Math.min(5, Math.round(base + (rnd() - 0.5) * 1.6)));
  const term = (base) => Array.from({ length: 9 }, () => g(base));
  const none = () => Array(9).fill(null);
  const rooms = ['見本教室A', '見本教室B', '見本教室C'];
  const wishes = ['上野丘', '舞鶴', '豊府', '大分西', '雄城台', '鶴崎', '大分南', '大商', '情科', '大工', '鶴工', '鶴見丘', '翔青', '東明', '高専', ''];
  const fam = ['青木', '石田', '上村', '江口', '岡本', '加藤', '木村', '工藤', '小林', '佐藤', '清水', '田中', '中村', '橋本', '藤井', '松尾', '森', '山口', '吉田', '渡辺'];
  const giv = ['あおい', 'はると', 'ゆい', 'そうた', 'めい', 'れん', 'ひなた', 'ゆうと', 'さくら', 'こはる'];
  const students = [];
  for (let i = 0; i < 60; i++) {
    const base = 2.4 + rnd() * 2.6;
    const s = { pref: '大分', grade: '中3', id: 'm3' + i, name: pick(fam) + ' ' + pick(giv), room: rooms[i % 3], school: pick(['大分見本中', '別府見本中']),
      wish1: pick(wishes), wish2: pick(wishes), t1: term(base), t21: term(base), t22: term(base), t2: term(base), t31: term(base), t32: none() };
    if (i % 6 === 0) s.t32 = term(base);            // 確定
    if (i % 15 === 1) s.t31 = none();               // 中3が入力漏れ
    if (i % 20 === 2) s.t1 = none();                // 中1・中2が入力漏れ
    students.push(s);
  }
  for (let i = 0; i < 40; i++) {
    const base = 2.4 + rnd() * 2.6;
    const s = { pref: '大分', grade: '中2', id: 'm2' + i, name: pick(fam) + ' ' + pick(giv), room: rooms[i % 3], school: '大分見本中',
      wish1: pick(wishes), wish2: pick(wishes), t1: term(base), t21: term(base), t22: i % 3 ? term(base) : none(), t2: none(), t31: none(), t32: none() };
    if (i % 12 === 5) s.t1 = none();                // 中1学年末が入力漏れ
    students.push(s);
  }
  // 宮崎（学科付きの志望校も入れて、学科を外して探せるか見る）
  const mrooms = ['見本教室M', '見本教室N'];
  for (let i = 0; i < 40; i++) {
    const base = 2.4 + rnd() * 2.6;
    const g3 = i < 25;
    const s = { pref: '宮崎', grade: g3 ? '中3' : '中2', id: 'mz' + i, name: pick(fam) + ' ' + pick(giv), room: mrooms[i % 2], school: '宮崎見本中',
      wish1: pick(['宮崎西　普通', '宮崎大宮 文情', '宮崎南 フロ', '宮崎北', '宮崎工業 電情', '宮崎農業', '宮崎商業 商業M', '']), wish2: pick(['宮崎南', '妻', '宮崎商業', '']), t1: term(base), t21: term(base), t22: term(base), t2: g3 ? term(base) : none(), t31: g3 ? term(base) : none(), t32: g3 && i % 5 === 0 ? term(base) : none() };
    if (i % 9 === 4) s.t1 = none();
    students.push(s);
  }
  // 福岡（中3だけ。中3 2学期だけで45点満点）
  for (let i = 0; i < 20; i++) {
    const base = 2.4 + rnd() * 2.6;
    const s = { pref: '福岡', grade: '中3', id: 'fk' + i, name: pick(fam) + ' ' + pick(giv), room: '見本教室F', school: '福津見本中',
      wish1: pick(['宗像', '福岡', '修猷館', '春日', '']), wish2: pick(['香椎', '新宮', '']), t1: term(base), t21: term(base), t22: term(base), t2: term(base), t31: i % 7 === 3 ? none() : term(base), t32: i % 4 === 0 ? term(base) : none() };
    students.push(s);
  }
  const data = {
    students, noSheet: [],
    schools: {
      福岡: [['修猷館', 42], ['福岡', 42], ['筑紫丘', 40], ['城南', 38], ['春日', 38], ['筑紫', 36], ['宗像', 36], ['香住丘', 36], ['新宮', 34], ['香椎', 31], ['須恵', 24]].map(([name, score]) => ({ name, score })),
      宮崎: [['宮崎大宮', 119], ['宮崎西', 114], ['妻', 104], ['佐土原', 99], ['宮崎南', 102], ['宮崎商業', 98], ['宮崎北', 102], ['宮崎北 サイエンス', 108], ['宮崎南 フロンティア', 111], ['宮崎工業', 90], ['宮崎農業', 86], ['宮崎大宮 文科情報', 129], ['宮崎西 理数', 131]].map(([name, score]) => ({ name, score })), 大分: [['上野丘', 240], ['舞鶴', 230], ['豊府', 220], ['大分西', 215], ['雄城台', 200], ['鶴崎', 200], ['大分南', 170], ['大分商業', 180], ['情報科学', 170], ['大分工業', 160], ['鶴崎工業', 160], ['別府鶴見丘', 195], ['別府翔青', 170], ['臼杵', 170], ['大分東', 130]].map(([name, score]) => ({ name, score })) },
    alias: { 福岡: {}, 宮崎: { 大宮: '宮崎大宮', 西: '宮崎西', 北: '宮崎北' }, 大分: { 大工: '大分工業', 大商: '大分商業', 情科: '情報科学', 鶴工: '鶴崎工業', 鶴見丘: '別府鶴見丘', 翔青: '別府翔青', 東: '大分東' } },
    info: { all: true, rooms: [], at: '試し版' },
  };
  const run = (ok) => ({ withSuccessHandler: (f) => run(f), withFailureHandler: () => run(ok), getNaishinSP: () => setTimeout(() => ok(JSON.parse(JSON.stringify(data))), 200) });
  window.google = { script: { run: run(() => {}) } };
})();
