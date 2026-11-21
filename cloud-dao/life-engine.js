// A conditional scenario model adapted from the author's trajectory research.
// Coefficients are explicit planning assumptions, not estimated life-outcome laws.
export const LIFE_VERSION='life-scenarios-v1';
export const DEFAULT_LIFE={goal:'academic',title:'完成一项拿得出手的成果',progress:25,currentHours:6,hours:12,budget:18,continuity:75,feedback:65,support:55,load:45,uncertainty:50,horizon:36,policy:'focus'};
export const GOALS={
 academic:{name:'学业与研究',unit:'形成可复核的研究成果',steps:['选定一个可验证的问题，列出资料与复现清单','每周留下可查看的实验记录、图表或初稿','每两周请同伴评阅一份具体成果，按反馈修订']},
 career:{name:'事业与成长',unit:'建立可展示的能力与成果',steps:['对照一个具体方向，盘点已有能力与缺口','每周完成一个可展示的小样、案例或工作成果','找可信的同行评阅成果，记录实际反馈再调整方向']},
 creative:{name:'创作与表达',unit:'完成并迭代一件作品',steps:['把大作品拆成能独立完成的小单元','给创作安排固定时段，每周完成一份可展示版本','向真实读者或同行收集反馈，保留有效部分再迭代']},
 life:{name:'生活与修习',unit:'形成可持续的日常节律',steps:['选择一个可观察、可记录的小目标','把行动放入已有日程，先连续实践四周','每周回看实际执行与感受，删减无法持续的安排']}
};
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
export function normalizeLife(input={}) {
 const p=Object.fromEntries(Object.keys(DEFAULT_LIFE).map(key=>[key,input[key]??DEFAULT_LIFE[key]]));
 for(const key of ['progress','continuity','feedback','support','load','uncertainty']){
  p[key]=Number(p[key]);if(!Number.isFinite(p[key])||p[key]<0||p[key]>100)throw Error('请将自评与行动程度填写在 0—100 之间。');
 }
 for(const key of ['currentHours','hours','budget']){
  p[key]=Number(p[key]);if(!Number.isFinite(p[key])||p[key]<0||p[key]>40)throw Error('每周时长支持 0—40 小时。');
 }
 if(p.budget<1)throw Error('请至少预留 1 小时可用时间。');
 p.horizon=Number(p.horizon);if(![12,36,60].includes(p.horizon))throw Error('请选择 1 年、3 年或 5 年。');
 if(!GOALS[p.goal]||!['maintain','focus','sprint'].includes(p.policy))throw Error('请选择目标与行动方式。');
 p.title=String(p.title||GOALS[p.goal].unit).trim().slice(0,60);
 return p;
}
function randomGenerator(seed=20261121){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return (seed+.5)/4294967296;};}
function normal(rng){return Math.sqrt(-2*Math.log(rng()))*Math.cos(Math.PI*2*rng());}
function student(rng){let sum=0;for(let i=0;i<5;i++)sum+=normal(rng)**2;return normal(rng)/Math.sqrt(Math.max(sum/5,.01));}
export function actionFor(p,policy=p.policy){
 if(policy==='maintain')return {hours:p.currentHours,continuity:50,feedback:40};
 if(policy==='sprint')return {hours:Math.min(40,p.hours*1.5),continuity:p.continuity,feedback:p.feedback*.7};
 return {hours:p.hours,continuity:p.continuity,feedback:p.feedback};
}
export function assumedMonthlyGain(p,policy=p.policy){
 const a=actionFor(p,policy),overload=Math.max(0,a.hours/p.budget-1);
 const production=(.18+.16*Math.min(a.hours,p.budget*1.15))*(.25+.75*a.continuity/100)*(.5+.5*a.feedback/100)*(.65+.35*p.support/100);
 const friction=.2+.45*p.load/100+overload*overload*1.8;
 return production-friction;
}
export function observationQuadrant(previous,current){
 const upHours=current.hours>=previous.hours,upProgress=current.progress>=previous.progress;
 if(upHours&&upProgress)return {code:1,title:'投入增加 · 进展增加',text:'保留已经产生可见成果的做法，继续观察能否稳定重复。'};
 if(upHours)return {code:2,title:'投入增加 · 进展放缓',text:'先检查方法、反馈和负荷，避免只靠延长时间。'};
 if(upProgress)return {code:3,title:'投入减少 · 进展增加',text:'找出高效环节，保留节省时间又能产出成果的做法。'};
 return {code:4,title:'投入减少 · 进展放缓',text:'先缩小任务、恢复可持续节律，再逐步增加投入。'};
}
export function estimateLifeState(p,observations=[]){
 let value=p.progress,variance=25,month=0,velocity=assumedMonthlyGain(p,'maintain');
 const sorted=[...observations].sort((a,b)=>a.month-b.month);
 for(const row of sorted){
  if(!Number.isInteger(row.month)||row.month<month||row.month>p.horizon||!Number.isFinite(row.progress)||row.progress<0||row.progress>100||!Number.isFinite(row.hours)||row.hours<0||row.hours>40)throw Error('跟进记录中的月份、进展或时长无效。');
  const previous=value,gap=row.month-month,predicted=clamp(value+velocity*gap);
  variance+=Math.max(gap,1)*(1+p.uncertainty/15);
  const residual=row.progress-predicted,measurement=9;
  const gain=variance/(variance+measurement);
  // A large mismatch increases uncertainty instead of being hidden by the fit.
  if(Math.abs(residual)>3*Math.sqrt(variance+measurement))variance+=residual*residual*.25;
  value=clamp(predicted+gain*residual);variance=Math.max(1,(1-gain)*variance);
  if(gap>0)velocity=.7*velocity+.3*(row.progress-previous)/gap;
  month=row.month;
 }
 return {value,variance,month,velocity};
}
const quantile=(values,q)=>{const index=(values.length-1)*q,low=Math.floor(index),fraction=index-low;return values[low]*(1-fraction)+values[Math.ceil(index)]*fraction;};
function clusterPaths(paths,start){
 const end=paths[0].length-1,mid=Math.round((start+end)/2);
 const sorted=[...paths].sort((a,b)=>a[end]-b[end]);
 let centers=[.15,.5,.85].map(q=>[sorted[Math.floor(q*(paths.length-1))][mid],sorted[Math.floor(q*(paths.length-1))][end]]);
 let groups=[];
 for(let iteration=0;iteration<10;iteration++){
  groups=[[],[],[]];
  for(const path of paths){let best=0,distance=Infinity;centers.forEach((c,i)=>{const d=.35*(path[mid]-c[0])**2+(path[end]-c[1])**2;if(d<distance){best=i;distance=d;}});groups[best].push(path);}
  centers=centers.map((c,i)=>groups[i].length?[groups[i].reduce((sum,p)=>sum+p[mid],0)/groups[i].length,groups[i].reduce((sum,p)=>sum+p[end],0)/groups[i].length]:c);
 }
 return groups.filter(group=>group.length).map(group=>({count:group.length,share:group.length/paths.length,
  values:Array.from({length:end+1},(_,m)=>quantile(group.map(p=>p[m]).sort((a,b)=>a-b),.5))})).sort((a,b)=>a.values[end]-b.values[end]);
}
export function simulateLife(input,observations=[],options={}){
 const p=normalizeLife(input),state=estimateLifeState(p,observations),rng=randomGenerator(options.seed??20261121);
 const count=options.count??720;if(!Number.isInteger(count)||count<100||count>2000)throw Error('模拟样本数无效。');
 const gain=assumedMonthlyGain(p),noise=.35+p.uncertainty/40,paths=[];
 const past=new Map(observations.map(row=>[row.month,row.progress]));
 for(let n=0;n<count;n++){
  const path=Array(p.horizon+1).fill(p.progress);let value=clamp(state.value+normal(rng)*Math.sqrt(state.variance)*.3);
  const drift=normal(rng)*noise*.07;
  for(let m=0;m<=state.month;m++)path[m]=past.get(m)??(p.progress+(state.value-p.progress)*m/Math.max(1,state.month));
  path[state.month]=state.value;
  for(let m=state.month+1;m<=p.horizon;m++){
   const diminishing=1-value/125;
   const persistence=.12*state.velocity;
   const shock=student(rng)*noise+(rng()<.035?student(rng)*noise*2.5:0);
   value=clamp(value+(gain+persistence+drift)*diminishing+shock);path[m]=value;
  }
  paths.push(path);
 }
 const series=Array.from({length:p.horizon+1},(_,m)=>{const values=paths.map(path=>path[m]).sort((a,b)=>a-b);return {month:m,low:quantile(values,.1),mid:quantile(values,.5),high:quantile(values,.9)};});
 const branches=clusterPaths(paths,state.month);
 branches.forEach((branch,i)=>{branch.name=branches.length===1?'当前条件下的分支':['进展偏缓','稳步积累','进展顺利'][Math.round(i*2/(branches.length-1))];branch.id='branch-'+i;});
 const dominant=branches.reduce((best,branch)=>branch.share>best.share?branch:best,branches[0]);
 return {version:LIFE_VERSION,profile:p,state,series,branches,dominant,count,gain,action:actionFor(p)};
}
export function lifeActions(p){
 const steps=[...GOALS[p.goal].steps];
 if(actionFor(p).hours>p.budget)steps.unshift(`计划已超过每周 ${p.budget} 小时的可用预算。先减项，或明确腾出时间，再执行。`);
 if(p.continuity<55)steps.unshift('先把任务缩小到可以每周重复，连续完成四周，再加量。');
 if(p.load>70)steps.unshift('当前负荷较高：先删减一项非核心安排，为目标留出稳定空间。');
 return steps.slice(0,4);
}
export function sanitizeLifeRecord(record){
 const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
 if(!record||record.version!==LIFE_VERSION||typeof record.id!=='string'||!/^[a-f0-9-]{36}$/.test(record.id)||!validDate(record.date))throw Error('计划标识或日期无效。');
 const profile=normalizeLife(record.profile),series=record.snapshot?.series;
 if(!Array.isArray(series)||series.length!==profile.horizon+1||!Array.isArray(record.observations)||record.observations.length>500)throw Error('计划曲线或跟进记录不完整。');
 const snapshot={version:LIFE_VERSION,series:series.map((point,index)=>{
  if(point.month!==index||![point.low,point.mid,point.high].every(Number.isFinite)||point.low<0||point.high>100||point.low>point.mid||point.mid>point.high)throw Error('计划曲线数据无效。');
  return {month:index,low:point.low,mid:point.mid,high:point.high};
 })};
 let previous={date:record.date,hours:profile.currentHours,progress:profile.progress};
 const observations=record.observations.map(row=>{
  if(!validDate(row.date)||row.date<previous.date||!Number.isFinite(row.hours)||row.hours<0||row.hours>40||!Number.isFinite(row.progress)||row.progress<0||row.progress>100)throw Error('反馈记录无效。');
  const month=(Number(row.date.slice(0,4))-Number(record.date.slice(0,4)))*12+Number(row.date.slice(5,7))-Number(record.date.slice(5,7));
  if(month<0||month>profile.horizon)throw Error('反馈日期超出计划范围。');
  const clean={date:row.date,month,hours:row.hours,progress:row.progress,quadrant:observationQuadrant(previous,row)};previous=clean;return clean;
 });
 return {version:LIFE_VERSION,id:record.id,title:profile.title,date:record.date,profile,snapshot,observations};
}
