const API = ['localhost','127.0.0.1'].includes(location.hostname)
  ? 'http://127.0.0.1:8787/dao/'
  : 'https://ljg-homepage-counter.liu331453318.workers.dev/dao/';
const KEYS = ['cloud-dao-v1', 'cloud-dao-play-v1', 'cloud-dao-study-v1'];
const CORE_FIELDS = ['xp','minutes','sessions','favorites','bookmarks','read','incenseDays'];
let identity, database, revision = 0, cloudReady = false, busy = false, changed = false;
let localRevision = 0, localDirty = false;
let values = {}, saveTimer, status = '正在恢复进度';
const listeners = new Set();

function report(message) {
  status = message;
  for (const listener of listeners) listener(message);
}
function readCore(value) {
  try { const data = JSON.parse(value || '{}'); return data && typeof data === 'object' && !Array.isArray(data) ? data : {}; } catch { return {}; }
}
function localRead(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function remember() {
  try {
    localStorage.setItem('cloud-dao-identity', JSON.stringify(identity));
    localStorage.setItem('cloud-dao-sync', JSON.stringify({revision:localRevision,dirty:localDirty}));
    for (const key of KEYS) if (values[key]) localStorage.setItem(key, values[key]);
  } catch { report('浏览器存储受限，请保存修习凭证'); }
  if (database) {
    const transaction = database.transaction('vault', 'readwrite');
    transaction.objectStore('vault').put({identity, values, revision:localRevision, dirty:localDirty}, 'current');
    return new Promise(resolve => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => { report('本机备份未能写入，请保存修习凭证'); resolve(false); };
      transaction.onabort = () => resolve(false);
    });
  }
}
async function call(route, body = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(API + route, {
      method:'POST', headers:{'Content-Type':'application/json', Authorization:'Bearer ' + identity.token},
      body:JSON.stringify({id:identity.id, ...body}), signal:controller.signal
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '服务暂不可用');
    return result;
  } finally { clearTimeout(timeout); }
}
export function submissionService(route, body = {}) {
  if (!['list','save','model','delete'].includes(route)) throw new Error('投稿请求无效');
  return call('submission-'+route, body);
}
function snapshot() {
  const progress = {};
  for (const key of KEYS) {
    if (!values[key]) continue;
    let value;
    try { value = JSON.parse(values[key]); } catch { continue; }
    if (key === KEYS[0] && !Number.isFinite(value?.xp)) continue;
    progress[key] = key === KEYS[0] ? Object.fromEntries(CORE_FIELDS.filter(k => k in value).map(k => [k,value[k]])) : value;
  }
  return progress;
}
function applyProgress(progress) {
  for (const key of KEYS) {
    if (!(key in progress)) continue;
    const value = key === KEYS[0] ? {...readCore(values[key]), ...progress[key]} : progress[key];
    values[key] = JSON.stringify(value);
  }
}
export async function prepareProgress() {
  let backup;
  try {
    database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('cloud-dao-vault', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('vault');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('备份库被占用'));
    });
    backup = await new Promise(resolve => {
      const request = database.transaction('vault').objectStore('vault').get('current');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  } catch {}
  try { identity = JSON.parse(localRead('cloud-dao-identity') || 'null'); } catch {}
  const validIdentity = value => [value?.id, value?.token].every(v => typeof v === 'string' && /^[a-f0-9-]{36}$/.test(v));
  if (!validIdentity(identity)) identity = backup?.identity;
  if (!validIdentity(identity)) identity = {id:crypto.randomUUID(), token:crypto.randomUUID()};
  values = {...backup?.values};
  let metadata; try { metadata = JSON.parse(localRead('cloud-dao-sync') || 'null'); } catch {}
  localRevision = metadata?.revision ?? backup?.revision ?? 0;
  localDirty = metadata?.dirty ?? backup?.dirty ?? false;
  for (const key of KEYS) {
    const local = localRead(key);
    if (local) {
      const backupXp = key === KEYS[0] ? readCore(values[key]).xp || 0 : 0;
      const localXp = key === KEYS[0] ? readCore(local).xp || 0 : 0;
      if (localXp >= backupXp) values[key] = local;
    }
  }
  remember();
  try {
    const remote = await call('load');
    revision = remote.revision;
    const localXp = readCore(values[KEYS[0]]).xp || 0;
    const remoteXp = remote.progress[KEYS[0]]?.xp || 0;
    if (remote.revision && remoteXp >= localXp && (!localDirty || remote.revision > localRevision)) applyProgress(remote.progress);
    localRevision = revision;
    cloudReady = true;
    remember();
    report('进度已恢复 · 云端已连接');
    changed = true;
    await flush();
  } catch { report('已读取本机进度 · 云端暂未连接'); }
}
async function flush() {
  if (!cloudReady || busy || !changed) return;
  busy = true;
  changed = false;
  try {
    const result = await call('save', {revision, progress:snapshot()});
    revision = result.revision;
    localRevision = revision; localDirty = changed; remember();
    report('进度已保存到云端');
  } catch (error) {
    changed = true;
    if (error.message.includes('另一页面')) cloudReady = false;
    report(error.message.includes('另一页面') ? error.message : '本机已保存 · 云端同步失败，稍后重试');
  } finally {
    busy = false;
    if (changed && cloudReady) saveTimer = setTimeout(flush, 10000);
  }
}
export const progressStorage = {
  getItem(key) { return values[key] || null; },
  setItem(key, value) {
    if (key === KEYS[0] && values[key]) {
      const previous = readCore(values[key]), next = readCore(value);
      next.xp = Math.max(previous.xp || 0, next.xp || 0);
      value = JSON.stringify(next);
    }
    values[key] = value;
    localDirty = true;
    remember();
    changed = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 700);
  },
  removeItem(key) { values[key] = '[]'; localDirty = true; remember(); changed = true; flush(); }
};

export function createCommunity({world, panel, esc, toast}) {
  const session = crypto.randomUUID();
  const root = document.querySelector('#panel-content');
  let joined = false, inFlight = false, peers = [], messages = [], lastSuccess=0;
  let name = localRead('cloud-dao-nickname') || '云游道友'+identity.id.slice(0,4).toUpperCase();
  world.setSelfName(name);
  const entry = document.createElement('button');
  entry.className = 'community-entry';
  entry.innerHTML = '道友同游<small>点击进入公共庭院</small>';
  document.body.append(entry);
  const base = () => ({session, name});
  function updateChat() {
    const log = root.querySelector('#community-messages');
    if (!log) return;
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 70;
    log.innerHTML = messages.length ? messages.map(m => `<p><strong>${esc(m.name)}</strong><span>${esc(m.text)}</span></p>`).join('') : '<p>庭中尚无留言，向道友打声招呼吧。</p>';
    if (nearBottom) log.scrollTop = log.scrollHeight;
    const list = root.querySelector('#community-peers');
    list.textContent = peers.length ? peers.map(p => p.name + (p.self ? '（我）' : '') + (p.area==='retreat'?' · 洞天中':' · 庭院中')).join('、') : '正在与公共庭院连接…';
  }
  async function heartbeat() {
    if (!joined && document.body.classList.contains('entered')) joined = true;
    if (!joined || inFlight || document.hidden) return;
    inFlight = true;
    try {
      const position = world.presence();
      const result = await call('presence', {...base(), ...position});
      lastSuccess=Date.now();
      peers = result.peers;
      messages = result.messages;
      world.setPeers(peers.filter(p => !p.self));
      entry.innerHTML = `道友同游<small>庭院 · ${peers.filter(peer=>peer.area==='temple').length} 人在线</small>`;
      updateChat();
    } catch {
      if(Date.now()-lastSuccess>18000)world.setPeers([]);
      entry.innerHTML = '道友同游<small>连接中断 · 正在重连</small>';
    } finally { inFlight = false; }
  }
  function open() {
    panel(`<div class="panel-overline">云栖山 · 公共庭院</div><h2>与道友，相逢山中。</h2><p>庭院中的道友会以人物现身，头顶显示道号。回到庭院，就能看见彼此漫步。私人洞天中的道友返回庭院后才会出现。</p><button class="panel-button" id="return-public-courtyard">回庭院同游</button><p id="cloud-status" class="panel-note">${esc(status)}</p><label for="companion-name">我的道号</label><input id="companion-name" maxlength="20" value="${esc(name)}"><button class="panel-button outline" id="save-companion-name">更新道号</button><p id="community-peers"></p><div id="community-messages" class="community-messages" aria-label="公共聊天记录"></div><form id="community-chat"><label for="community-text">向在线道友说句话</label><input id="community-text" maxlength="200" required placeholder="道友，今日可安好？"><button class="panel-button" type="submit">发送到公共庭院</button><p role="status" id="community-feedback"></p></form><details><summary>保存与恢复我的修习进度</summary><p>积分、行囊与课程进度自动保存。下载修习凭证后，可在其他浏览器恢复同一份进度。凭证请自己保管。</p><button class="panel-button outline" id="export-dao-pass">下载修习凭证</button><label for="import-dao-pass">选择已保存的修习凭证</label><input type="file" id="import-dao-pass" accept="application/json,.json"><p>本机心语和出生资料由当前浏览器保管。公共聊天对进入庭院的道友可见，保存最近一天的消息。</p></details>`);
    updateChat();
  }
  listeners.add(message => {
    const element = root.querySelector('#cloud-status');
    if (element) element.textContent = message;
  });
  entry.addEventListener('click', () => { joined = true; world.go('wander'); heartbeat(); open(); });
  document.querySelector('#enter').addEventListener('click', () => { joined = true; heartbeat(); });
  document.addEventListener('click', () => {
    if (!joined && document.body.classList.contains('entered')) { joined = true; heartbeat(); }
  });
  root.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if(button?.id==='return-public-courtyard'){
      document.querySelector('#panel').close();world.go('wander');joined=true;heartbeat();
    }
    if (button?.id === 'save-companion-name') {
      name = root.querySelector('#companion-name').value.trim().slice(0,20) || '云游道友';
      world.setSelfName(name);
      try { localStorage.setItem('cloud-dao-nickname', name); } catch {}
      await heartbeat(); toast('道号已更新');
    }
    if (button?.id === 'export-dao-pass') {
      const url = URL.createObjectURL(new Blob([JSON.stringify({type:'cloud-dao-pass', identity})], {type:'application/json'}));
      const link = document.createElement('a'); link.href = url; link.download = '云道-修习凭证.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  root.addEventListener('submit', async event => {
    if (event.target.id !== 'community-chat') return;
    event.preventDefault();
    const input = root.querySelector('#community-text'), feedback = root.querySelector('#community-feedback');
    const button = event.target.querySelector('button'); button.disabled = true;
    try { await call('message', {...base(), text:input.value}); input.value = ''; feedback.textContent = '已发送'; await heartbeat(); }
    catch (error) { feedback.textContent = error.message; }
    finally { button.disabled = false; }
  });
  root.addEventListener('change', async event => {
    if (event.target.id !== 'import-dao-pass' || !event.target.files[0]) return;
    try {
      const file = event.target.files[0];
      if (file.size > 2048) throw new Error('凭证格式错误');
      const pass = JSON.parse(await file.text());
      if (pass.type !== 'cloud-dao-pass' || ![pass.identity?.id, pass.identity?.token].every(v => typeof v === 'string' && /^[a-f0-9-]{36}$/.test(v))) throw new Error('凭证格式错误');
      if (busy) throw new Error('进度正在同步，请稍后再导入');
      clearTimeout(saveTimer);
      const wasReady = cloudReady; cloudReady = false;
      const previous = identity; identity = pass.identity;
      let remote;
      try { remote = await call('load'); } catch (error) { identity = previous; cloudReady = wasReady; throw error; }
      if (!remote.revision || !Object.keys(remote.progress).length) { identity = previous; cloudReady = wasReady; throw new Error('此凭证尚无云端存档'); }
      for (const key of KEYS.slice(1)) {
        if (!(key in remote.progress)) { delete values[key]; try { localStorage.removeItem(key); } catch {} }
      }
      applyProgress(remote.progress); localRevision = remote.revision; localDirty = false; await remember(); location.reload();
    } catch (error) { toast(error.message); }
  });
  setInterval(heartbeat, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) heartbeat(); });
  window.addEventListener('pagehide', () => {
    if (!joined) return;
    fetch(API + 'leave', {method:'POST',keepalive:true,headers:{'Content-Type':'application/json',Authorization:'Bearer '+identity.token},body:JSON.stringify({id:identity.id,...base()})}).catch(() => {});
  });
}
