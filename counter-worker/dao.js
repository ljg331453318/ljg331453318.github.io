const origins = new Set(['https://ljg331453318.github.io', 'http://127.0.0.1:4175', 'http://localhost:4175']);
const validId = value => typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value);
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export async function handleDao(request, env) {
  const origin = request.headers.get('Origin') || '';
  const headers = {'Content-Type':'application/json', 'Cache-Control':'no-store', 'Vary':'Origin',
    'Access-Control-Allow-Methods':'POST, OPTIONS', 'Access-Control-Allow-Headers':'Content-Type, Authorization'};
  if (origins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  const reply = (data, status = 200) => new Response(JSON.stringify(data), {status, headers});
  if (!origins.has(origin)) return reply({error:'来源未获允许'}, 403);
  if (request.method === 'OPTIONS') return new Response(null, {status:204, headers});
  if (request.method !== 'POST') return reply({error:'请求方法错误'}, 405);
  if (Number(request.headers.get('Content-Length')) > 150000) return reply({error:'资料过大'}, 413);
  try {
    const raw = await request.text();
    if (raw.length > 150000) return reply({error:'资料过大'}, 413);
    const body = JSON.parse(raw);
    const id = body.id;
    const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
    if (!validId(id) || !validId(token)) return reply({error:'修习凭证无效'}, 401);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const secret = [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2,'0')).join('');
    const now = Date.now();
    await env.DB.prepare('INSERT OR IGNORE INTO dao_profiles(id, secret, updated) VALUES (?, ?, ?)').bind(id, secret, now).run();
    const profile = await env.DB.prepare('SELECT * FROM dao_profiles WHERE id=?').bind(id).first();
    if (profile.secret !== secret) return reply({error:'修习凭证不匹配'}, 401);
    const route = new URL(request.url).pathname;
    if (route === '/dao/load') return reply({progress:JSON.parse(profile.progress), revision:profile.revision});
    if (route === '/dao/save') {
      const progress = body.progress;
      if (!progress || typeof progress !== 'object' || Array.isArray(progress)) return reply({error:'存档格式错误'},400);
      const allowed = new Set(['cloud-dao-v1','cloud-dao-play-v1','cloud-dao-study-v1']);
      if (Object.keys(progress).some(k => !allowed.has(k))) return reply({error:'存档字段错误'},400);
      const core = progress['cloud-dao-v1'];
      if (core && (typeof core !== 'object' || Array.isArray(core) || 'posts' in core || !Number.isFinite(core.xp) || core.xp < 0)) return reply({error:'进度格式错误'},400);
      const updated = await env.DB.prepare('UPDATE dao_profiles SET progress=?,revision=revision+1,updated=? WHERE id=? AND revision=? RETURNING revision')
        .bind(JSON.stringify(progress),now,id,body.revision).first();
      if (!updated) return reply({error:'另一页面已更新进度，请刷新后继续'},409);
      return reply({revision:updated.revision});
    }
    const room = 'public';
    const name = clean(body.name,20) || '云游道友';
    if (route === '/dao/leave') {
      await env.DB.prepare('DELETE FROM dao_presence WHERE session=? AND profile=?').bind(body.session,id).run();
      return reply({ok:true});
    }
    if (route === '/dao/message') {
      const text = clean(body.text,200);
      if (!text) return reply({error:'请写下消息'},400);
      const accepted = await env.DB.prepare('UPDATE dao_profiles SET last_chat=? WHERE id=? AND last_chat<? RETURNING id').bind(now,id,now-2000).first();
      if (!accepted) return reply({error:'请稍等两秒再发送'},429);
      await env.DB.prepare('INSERT INTO dao_messages VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),id,room,name,text,now).run();
      return reply({ok:true});
    }
    if (route !== '/dao/presence' || !validId(body.session)) return reply({error:'请求无效'},400);
    const x = Number(body.x), z = Number(body.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return reply({error:'位置无效'},400);
    const area = body.area === 'temple' ? 'temple' : 'retreat';
    await env.DB.prepare('INSERT INTO dao_presence VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(session) DO UPDATE SET room=excluded.room,name=excluded.name,x=excluded.x,z=excluded.z,area=excluded.area,updated=excluded.updated WHERE profile=excluded.profile')
      .bind(body.session,id,room,name,Math.max(-15,Math.min(80,x)),Math.max(-12,Math.min(14,z)),area,now).run();
    const peers = await env.DB.prepare(`SELECT session,name,x,z,area,(profile=?) AS self FROM (
      SELECT *, ROW_NUMBER() OVER(PARTITION BY profile ORDER BY updated DESC,session DESC) AS row_index
      FROM dao_presence WHERE room=? AND updated>?
    ) WHERE row_index=1 ORDER BY updated DESC LIMIT 60`).bind(id,room,now-18000).all();
    const messages = await env.DB.prepare('SELECT id,name,text,created FROM dao_messages WHERE room=? AND created>? ORDER BY created DESC LIMIT 30').bind(room,now-86400000).all();
    // Bound transient room history without touching persistent progress.
    await env.DB.batch([
      env.DB.prepare('DELETE FROM dao_presence WHERE updated<?').bind(now-60000),
      env.DB.prepare('DELETE FROM dao_messages WHERE created<?').bind(now-86400000)
    ]);
    return reply({peers:peers.results,messages:messages.results.reverse()});
  } catch {
    return reply({error:'同游服务暂不可用，请稍后重试'},503);
  }
}
