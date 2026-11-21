import {describeSubmissionMoment,civilStamp} from '../cloud-dao/submission-engine.js';
import {GAN,ZHI} from '../cloud-dao/yi-engine.js';
import {featureVector,trainSubmissionModel,DISCIPLINES} from '../cloud-dao/submission-learning.js';

class ValidationError extends Error {}
const validId=value=>typeof value==='string' && /^[a-f0-9-]{36}$/.test(value);
const datetime=value=>{
  if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new ValidationError('请填写有效日期与时间');
  return civilStamp(value.slice(0,10),value.slice(11));
};
export async function handleSubmissions(route,body,id,db,reply) {
  if(route==='/dao/submission-list') {
    const rows=await db.prepare('SELECT id,payload,status,consent,created,updated FROM dao_submissions WHERE profile=? ORDER BY created DESC LIMIT 100').bind(id).all();
    return reply({records:rows.results.map(row=>({...JSON.parse(row.payload),id:row.id,status:row.status,consent:!!row.consent,created:row.created,updated:row.updated}))});
  }
  if(route==='/dao/submission-model') {
    const rows=await db.prepare("SELECT profile,features,status,submitted_at,decided_at FROM dao_submissions WHERE consent=1 AND status IN ('accepted','rejected') AND submitted_at IS NOT NULL AND features IS NOT NULL ORDER BY submitted_at DESC LIMIT 2000").all();
    const data=rows.results.map(row=>({author:row.profile,features:JSON.parse(row.features),label:Number(row.status==='accepted'),submittedAt:row.submitted_at,decidedAt:row.decided_at}));
    return reply({model:trainSubmissionModel(data)});
  }
  if(route==='/dao/submission-delete') {
    if(!validId(body.recordId)) return reply({error:'记录标识无效'},400);
    await db.prepare('DELETE FROM dao_submissions WHERE id=? AND profile=?').bind(body.recordId,id).run();
    return reply({ok:true});
  }
  if(route!=='/dao/submission-save') return reply({error:'请求无效'},404);
  try {
    const record=body.record;
    if(!record || !validId(record.id)) throw new ValidationError('记录标识无效');
    const previous=await db.prepare('SELECT profile,payload FROM dao_submissions WHERE id=?').bind(record.id).first();
    if(previous && previous.profile!==id) return reply({error:'无法更新这份记录'},403);
    const original=previous?JSON.parse(previous.payload):null;
    const context=original?.context || record.context;
    const planned=original?.planned || record.planned;
    const plannedEnd=original?.plannedEnd || record.plannedEnd || planned;
    if(!context || !GAN.includes(context.natalDay) || !Array.isArray(context.branches) || context.branches.length!==4 || context.branches.some(value=>!ZHI.includes(value))) throw new ValidationError('排盘参照无效');
    const askedAt=civilStamp(context.askDate,context.askTime);
    const planAt=datetime(planned);
    const planEndAt=datetime(plannedEnd);
    if(plannedEnd.slice(0,10)!==planned.slice(0,10) || planEndAt<planAt) throw new ValidationError('计划时段无效');
    if(planAt<askedAt || planAt>askedAt+61*86400000) throw new ValidationError('计划时刻应在本次推算范围内');
    const nowCivil=new Date(Date.now()+8*3600000).toISOString().slice(0,16);
    const now=datetime(nowCivil);
    if(askedAt>now+60000) throw new ValidationError('问询时刻不能在未来');
    if(!['planned','pending','accepted','rejected','withdrawn'].includes(record.status)) throw new ValidationError('投稿状态无效');
    if(!DISCIPLINES.includes(record.discipline) || !['Q1','Q2','Q3','Q4','unknown'].includes(record.tier) || !['first','resubmission'].includes(record.stage)) throw new ValidationError('研究背景选项无效');
    let submittedAt=null,decidedAt=null,features=null;
    if(record.status!=='planned') {
      submittedAt=datetime(record.actual);
      if(submittedAt<askedAt || submittedAt>now) throw new ValidationError('实际投稿时刻应在问询之后，且不晚于当前时间');
      const facts=describeSubmissionMoment(context,record.actual.slice(0,10),record.actual.slice(11));
      features=JSON.stringify(featureVector(facts,record));
    }
    if(['accepted','rejected'].includes(record.status)) {
      decidedAt=datetime(record.decision);
      if(decidedAt<submittedAt || decidedAt>now) throw new ValidationError('决定时刻应在实际投稿之后，且不晚于当前时间');
    }
    const payload={context:{natalDay:context.natalDay,branches:context.branches,askDate:context.askDate,askTime:context.askTime},
      planned,plannedEnd,forecastMethod:original?.forecastMethod || (record.forecastMethod==='ekf-logistic-v1'?'ekf-logistic-v1':'traditional'),actual:record.status==='planned'?'':record.actual,decision:['accepted','rejected'].includes(record.status)?record.decision:'',discipline:record.discipline,tier:record.tier,stage:record.stage,
      alias:String(record.alias||'我的投稿').trim().slice(0,40),rule:'submission-slots-v1'};
    const stored=await db.prepare(`INSERT INTO dao_submissions VALUES (?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,status=excluded.status,consent=excluded.consent,
      submitted_at=excluded.submitted_at,decided_at=excluded.decided_at,features=excluded.features,updated=excluded.updated
      WHERE dao_submissions.profile=excluded.profile RETURNING id`).bind(record.id,id,JSON.stringify(payload),record.status,Number(record.consent===true),submittedAt,decidedAt,features,Date.now(),Date.now()).first();
    if(!stored) return reply({error:'无法更新这份记录'},403);
    return reply({ok:true,id:stored.id});
  } catch(error) { return reply({error:error instanceof ValidationError?error.message:'投稿记录暂未能保存，请稍后重试'},error instanceof ValidationError?400:503); }
}
