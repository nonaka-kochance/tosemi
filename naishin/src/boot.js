/* ===== 起動：開くたびにIDとパスワードを確認 → 自分の教室のデータだけ取得 → 描画 ===== */
(() => {
  const banner = document.getElementById('banner');
  const gate = document.getElementById('gate');
  const app = document.getElementById('app');
  const idIn = document.getElementById('gate-id'), pwIn = document.getElementById('gate-input'), okBtn = document.getElementById('gate-ok');
  const msg = document.getElementById('gate-msg');
  const say = (t, err) => { banner.hidden = !t; banner.textContent = t || ''; banner.className = err ? 'err' : ''; };
  const call = (name, ...args) => new Promise((ok, ng) => {
    if (!(window.google && google.script && google.script.run)) return ng(new Error('Apps Script 上で開いてください'));
    google.script.run.withSuccessHandler(ok).withFailureHandler((e) => ng(new Error(e && e.message ? e.message : String(e))))[name](...args);
  });
  const ask = (m) => { app.hidden = true; gate.hidden = false; say(''); msg.textContent = m || ''; okBtn.disabled = false; okBtn.textContent = 'ログイン'; };
  let last = Date.now();
  const login = async () => {
    const id = idIn.value.trim(), pw = pwIn.value;
    if (!id || !pw) { msg.textContent = 'IDとパスワードを入力してください'; return; }
    okBtn.disabled = true; okBtn.textContent = '確認しています…'; msg.textContent = '';
    try {
      // IDとパスワードは端末に保存しない（開くたびに入力）
      const data = await call('getNaishinSP', id, pw);
      pwIn.value = '';
      last = Date.now();
      gate.hidden = true; app.hidden = false;
      say('');
      window.nsStart(data);
      window.scrollTo(0, 0);
    } catch (e) {
      pwIn.value = '';
      ask(String(e.message || e).replace(/^Error:\s*/, ''));
    }
  };
  okBtn.onclick = login;
  pwIn.onkeydown = (e) => { if (e.key === 'Enter') login(); };
  idIn.onkeydown = (e) => { if (e.key === 'Enter') pwIn.focus(); };
  const logout = (m) => { window.nsStop(); idIn.value = ''; pwIn.value = ''; ask(m || ''); window.scrollTo(0, 0); };
  document.getElementById('logout').onclick = () => logout('');
  // 10分間まったく操作がなければ、自動でログアウトする（スマホがスリープしていた時間も数える）
  const IDLE_MS = 10 * 60 * 1000;
  const touch = () => { last = Date.now(); };
  const check = () => { if (!app.hidden && Date.now() - last >= IDLE_MS) logout('10分間操作がなかったため、ログアウトしました'); };
  ['pointerdown', 'touchstart', 'keydown', 'input', 'scroll', 'click'].forEach((ev) => window.addEventListener(ev, touch, { passive: true, capture: true }));
  setInterval(check, 15000);
  document.addEventListener('visibilitychange', check);
  window.addEventListener('pageshow', check);
  window.addEventListener('focus', check);
  ask('');
})();
