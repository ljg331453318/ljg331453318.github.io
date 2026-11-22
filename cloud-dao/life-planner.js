import {renderLuckTimeline,attachLuckTimeline} from './culture-kit.js?v=20261122-culture-r2';
import {renderBirthDate} from './birth-date.js?v=20261121-birth';
import {DEFAULT_LIFE,GOALS,LIFE_VERSION,normalizeLife,simulateLife,lifeActions,observationQuadrant,sanitizeLifeRecord} from './life-engine.js?v=20261121-pathways-r4';
import {birthChart,parseCivil,GAN,ZHI} from './yi-engine.js';
import {beijingNow,civilStamp} from './submission-engine.js?v=20261121-learning';

const STORE='cloud-dao-life-plans-v1';
const colors=['#c9998d','#a8d4b4','#ecd08b'];
const round=n=>Math.round(n);
const monthIndex=date=>Number(date.slice(0,4))*12+Number(date.slice(5,7))-1;
export function createLifePlanner({root,esc,toast,show,onChart}){
 let profile={...DEFAULT_LIFE},chart=null,birth={date:'',time:'',gender:'',unknown:false};
 let records=[],active=null,result=null,baseline=null,month=12,playing=false,timer=0,queued=0;
 try{const stored=JSON.parse(localStorage.getItem(STORE)||'[]');if(Array.isArray(stored))records=stored.flatMap(row=>{try{return [sanitizeLifeRecord(row)];}catch{return [];}});if(records.length){active=records.at(-1);profile=normalizeLife(active.profile);}}catch{}
 function range(label,key,min=0,max=100,step=5,unit=' / 100'){
  return `<label class="life-range" for="life-${key}"><span>${label}<output for="life-${key}">${profile[key]}${unit}</output></span><input id="life-${key}" name="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${profile[key]}"></label>`;
 }
 function effectiveRows(){
  if(!active||JSON.stringify(active.profile)!==JSON.stringify(profile))return [];
  const monthly=new Map();active.observations.forEach(row=>monthly.set(row.month,row));return [...monthly.values()].sort((a,b)=>a.month-b.month);
 }
 function hasCompleteBirth(){
  if(!chart||chart.manual||chart.unknown||!chart.date||!chart.time||chart.columns?.length!==4||!chart.columns.every(Boolean))return false;
  try{parseCivil(chart.date,chart.time);const now=beijingNow();return civilStamp(chart.date,chart.time)<=civilStamp(now.date,now.time);}catch{return false;}
 }
 function compute(){if(!hasCompleteBirth()){result=baseline=null;return;}result=simulateLife(profile,effectiveRows());baseline=simulateLife({...profile,policy:'maintain'},effectiveRows());month=Math.min(month,profile.horizon);}
 function birthContent(){
  if(!chart)return '<p class="life-muted">请先填写完整出生年月日时，完成排盘后再查看人生轨迹。</p>';
  const nowYear=Number(beijingNow().date.slice(0,4)),end=nowYear+Math.ceil(profile.horizon/12);
  return `<div class="life-pillars">${chart.columns.map((column,i)=>`<div><small>${['年柱','月柱','日柱','时柱'][i]}</small><strong>${column?.pillar||'未知'}</strong><span>${column?.god||'待补时辰'}</span></div>`).join('')}</div>
   <p class="life-muted">日主${chart.day}${chart.element} · 月令本气${chart.monthBase.gan}，${chart.pattern}为研习入口。排盘用于传统参照，数值轨迹由现实条件和行动设定生成。</p>
   <div class="life-year-axis">${Array.from({length:end-nowYear+1},(_,i)=>{const y=nowYear+i,luck=chart.luck?.cycles.find(c=>y>=c.start&&y<=c.end);return `<div><strong>${y}</strong><span>${GAN[(y-4)%10]}${ZHI[(y-4)%12]}流年</span><small>${luck?luck.pillar+'大运':'未排大运'}</small></div>`;}).join('')}</div>`;
 }
 function birthForm(){
  return `<form id="life-birth-form" class="life-birth-form"><label class="life-birth-date">公历出生日期${renderBirthDate({name:'date',value:birth.date,id:'life-birth'})}</label><label>出生时间 · 北京时间<input name="time" type="time" value="${esc(birth.time)}" required></label><label>传统排运性别（可不填）<select name="gender"><option value="">可不填</option><option value="1" ${birth.gender==='1'?'selected':''}>男</option><option value="0" ${birth.gender==='0'?'selected':''}>女</option></select></label><button type="submit" class="panel-button">排盘并生成人生轨迹</button></form>`;
 }
 function openBirthGate(){
  clearInterval(timer);clearTimeout(queued);playing=false;result=baseline=null;
  show(`<section class="life-birth-gate"><span class="study-eyebrow">人生轨迹 · 从你的出生时刻开始</span><h3>先排你的四柱，<br>再看人生轨迹。</h3><p>填写出生年月日时，完成排盘后，再查看岁运参照、轨迹区间与行动比较。</p><div class="life-flow" aria-label="查看人生轨迹的步骤"><span class="active">① 出生信息</span><span>② 四柱排盘</span><span>③ 轨迹与行动</span></div>${birthForm()}<p class="life-small">年份直接输入，无需翻日历。出生时间为必填项；不确定时请先核实，不会自动猜测时柱。</p><p class="life-small">出生信息仅在当前页面计算，不上传公共庭院，也不随计划备份保存。${records.length?'已保存的行动计划会保留；本次仍需先填写出生信息。':''}</p><p id="life-status" class="life-feedback" role="status"></p></section>`);
 }
 function open(existingChart){
  clearInterval(timer);clearTimeout(queued);playing=false;
  if(arguments.length){
   chart=existingChart||null;
   if(!chart)birth={date:'',time:'',gender:'',unknown:false};
   else if(chart.manual)birth={date:'',time:'',gender:'',unknown:false};
   else birth={date:chart.date,time:chart.unknown?'':chart.time,gender:birth.gender,unknown:false};
  }
  if(!hasCompleteBirth()){openBirthGate();return;}
  compute();
  show(`<section class="life-hero"><div><span class="study-eyebrow">人生轨迹 · 可行性推演</span><h3>未来有分叉，<br>选择可以被看见。</h3><p>把目标、现状与行动放进同一张图。拖一拖，看看不同走法怎样展开。</p></div><div class="life-hero-art" aria-hidden="true"><i></i><i></i><i></i><span>此刻</span></div></section>
   <section class="life-birth-summary"><div><span>本次出生排盘 · ${esc(chart.date)} ${esc(chart.time)} · 北京时间</span><strong>${chart.pillars.join('　')}</strong><small>排盘与岁运作为传统参照；下方数值情景由现实条件和行动设定生成。</small></div><button type="button" class="panel-button outline" data-life-edit-birth>修改出生信息</button><details class="life-detail"><summary>查看四柱与岁运参照</summary><div id="life-birth-result">${birthContent()}</div><p class="life-small">岁运年表为概览，交运边界须以排盘的准确交运时刻为准。</p></details></section>
   ${renderLuckTimeline()}<div class="life-layout"><details class="life-control-card" ${innerWidth>=700?'open':''}><summary>调整现状与行动<small>拖动滑块，观察轨迹变化</small></summary><form id="life-controls"><label class="life-field">我想看哪个方向<select name="goal">${Object.entries(GOALS).map(([id,g])=>`<option value="${id}" ${profile.goal===id?'selected':''}>${g.name}</option>`).join('')}</select></label>
   <label class="life-field">把目标写具体一点<input name="title" maxlength="60" value="${esc(profile.title)}" placeholder="例如：完成论文初稿，或做出一份作品"></label>
   <div class="life-control-title">现在站在哪里</div>${range('起点目标推进程度','progress')}${range('目前每周投入','currentHours',0,40,1,' 小时')}${range('可支配时间上限','budget',1,40,1,' 小时')}${range('现实支持与资源','support')}${range('当前任务负荷','load')}
   <div class="life-control-title">试着换一种走法</div>${range('计划每周投入','hours',0,40,1,' 小时')}${range('能够持续执行的程度','continuity')}${range('获得有效反馈的程度','feedback')}${range('外部环境波动','uncertainty')}
   <label class="life-field">向前看多久<select name="horizon">${[[12,'1 年'],[36,'3 年'],[60,'5 年']].map(([v,t])=>`<option value="${v}" ${profile.horizon===v?'selected':''}>${t}</option>`).join('')}</select></label><input type="hidden" name="policy" value="${profile.policy}"><button type="button" class="panel-button life-controls-done" data-life-controls-done>收起条件，查看变化</button></form></details>
   <section class="life-stage"><div class="life-stage-heading"><div><span class="study-eyebrow">目标推进指数 · 0—100 自评尺度</span><h3 id="life-goal-title">${esc(profile.title)}</h3></div><span class="life-live-dot">随条件变化</span></div>
   <div class="life-policy" aria-label="比较行动方式">${[['maintain','延续现状'],['focus','聚焦行动'],['sprint','加速冲刺']].map(([id,t])=>`<button type="button" data-life-policy="${id}" aria-pressed="${profile.policy===id}" class="${profile.policy===id?'active':''}">${t}</button>`).join('')}</div>
   <div id="life-plot" class="life-plot"></div><div class="life-time-control"><button type="button" class="life-play" data-life-play aria-label="播放轨迹变化">▶</button><label for="life-month">走到第 <output id="life-month-value">${month}</output> 个月<input id="life-month" type="range" min="0" max="${profile.horizon}" step="1" value="${month}"></label></div>
   <p class="life-small" id="life-calendar-context"></p><div id="life-readout"></div><p class="life-caption">阴影为当前假设下模拟路径的 10%—90% 分位带。分支占比是模拟样本比例，不是现实人生事件的概率。</p>
   <div id="life-branches" class="life-branches"></div><section class="life-next"><span class="study-eyebrow">把可能性，落到下一步</span><h3>从这周开始，怎么走？</h3><div id="life-actions"></div></section></section></div>

   <section class="life-journal"><div><span class="study-eyebrow">现实反馈 · 逐月回看</span><h3>留住最初的推演，再看实际走到了哪里。</h3><p>保存计划后，补记真实投入和进展。原始曲线保留，后续曲线随记录更新。</p></div><div class="life-journal-actions"><button type="button" class="panel-button" data-life-save>保存本次计划到本机</button><button type="button" class="panel-button outline" data-life-export>下载计划备份</button><label class="life-import">导入备份<input type="file" id="life-import" accept="application/json,.json"></label></div><div id="life-record-content"></div></section>
   <details class="life-detail"><summary>研究思路与图表怎么读</summary><p>本栏借鉴压缩动力学研究中的多步轨迹、重尾扰动、候选路径与新观察修正，以及“投入变化 × 进展变化”的四象限反馈。它是面向个人规划的条件情景演示，没有把股票模型的参数或回测成绩当成人生预测证据。</p><p>现实输入为目标进度、时间预算、持续性、反馈、资源和负荷。行动影响假设下的推进速度，环境波动影响路径分散程度。保持随机样本一致，改变滑块时比较的是条件变化，而非重新抽签。原始计划保留，后续自评记录用于修正当前状态。</p><p>八字、大运和流年沿用跃渊资料与本机历法计算，作为传统文化参照，不给数值轨迹添加未经验证的吉凶权重。图中区间不是经过人生数据验证的置信区间，模拟分支占比也不表示升职、录用、收入或其他现实结果的成功率。</p></details>
   <p class="life-small">曲线是可以随行动和反馈修正的情景，不是命定结果。人生目标、记录与备份只在你主动保存时写入当前浏览器。</p><p id="life-status" class="life-feedback" role="status"></p>`);
  attachLuckTimeline(root,chart);renderDynamic();renderRecords();
 }
 function svg(){
  const mobile=innerWidth<700,W=mobile?520:920,H=360,pad={l:45,r:20,t:28,b:38},x=m=>pad.l+m/profile.horizon*(W-pad.l-pad.r),y=v=>H-pad.b-v/100*(H-pad.t-pad.b);
  const path=values=>values.map((v,m)=>(m?'L':'M')+x(m).toFixed(2)+','+y(v).toFixed(2)).join(' ');
  const band=result.series.map((v,m)=>(m?'L':'M')+x(m)+','+y(v.high)).join(' ')+[...result.series].reverse().map(v=>'L'+x(v.month)+','+y(v.low)).join(' ')+'Z';
  const saved=active?.profile.goal===profile.goal&&active?.profile.title===profile.title?active.snapshot.series:null;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="人生条件情景图：${result.branches.length}条候选分支，阴影为模拟区间，可拖动下方月份查看"><defs><linearGradient id="life-band-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#a4cfa5" stop-opacity=".24"/><stop offset="1" stop-color="#a4cfa5" stop-opacity=".04"/></linearGradient></defs>
   ${[0,25,50,75,100].map(v=>`<line x1="${pad.l}" y1="${y(v)}" x2="${W-pad.r}" y2="${y(v)}" stroke="#95ad8c" stroke-opacity=".18"/><text x="${pad.l-10}" y="${y(v)+5}" text-anchor="end">${v}</text>`).join('')}
   ${[0,profile.horizon/3,profile.horizon*2/3,profile.horizon].map(m=>`<text x="${x(m)}" y="${H-10}" text-anchor="middle">${m===0?(active?'起点':'此刻'):m+'个月'}</text>`).join('')}
   <path d="${band}" fill="url(#life-band-fill)"/>
   <path d="${path(baseline.series.map(v=>v.mid))}" fill="none" stroke="#9eaa9b" stroke-dasharray="5 6" stroke-width="2"/>
   ${saved&&active.profile.horizon===profile.horizon?`<path d="${path(saved.map(v=>v.mid))}" fill="none" stroke="#a6bfe1" stroke-dasharray="3 7" stroke-width="2"/>`:''}
   ${result.branches.map((b,i)=>`<path class="life-path" d="${path(b.values)}" fill="none" stroke="${colors[i]}" stroke-width="3" stroke-linejoin="round" pathLength="1"/>`).join('')}
   <line x1="${x(month)}" y1="${pad.t}" x2="${x(month)}" y2="${H-pad.b}" stroke="#ead39c" stroke-dasharray="3 5" opacity=".7"/>
   ${result.branches.map((b,i)=>`<circle cx="${x(month)}" cy="${y(b.values[month])}" r="5" fill="${colors[i]}" stroke="#153a31" stroke-width="2"/>`).join('')}
   ${effectiveRows().map(row=>`<circle cx="${x(row.month)}" cy="${y(row.progress)}" r="5" fill="#ebf0df" stroke="#345444" stroke-width="2"><title>实际自评 ${row.progress}，每周 ${row.hours} 小时</title></circle>`).join('')}
   </svg><div class="life-legend"><span><i style="background:#a8d4b4"></i>条件情景区间</span><span><i class="dashed"></i>延续现状参照</span>${saved?'<span><i style="background:#a6bfe1"></i>最初保存的曲线</span>':''}</div>`;
 }
 function renderDynamic(animate=true){
  const plot=root.querySelector('#life-plot');if(!plot)return;
  plot.classList.toggle('still',!animate);plot.innerHTML=svg();
  const point=result.series[month],base=baseline.series[month];
  root.querySelector('#life-readout').innerHTML=`<div class="life-readout"><div><small>第 ${month} 个月 · 当前情景区间</small><strong>${round(point.low)}<em>—</em>${round(point.high)}</strong><span>目标推进指数 / 100</span></div><div><small>当前条件中位线</small><strong>${round(point.mid)}</strong><span>延续现状参照 ${round(base.mid)}</span></div><div><small>模拟中较集中的分支</small><b>${result.dominant.name}</b><span>随行动与现实反馈变化</span></div></div>`;
  root.querySelector('#life-branches').innerHTML=result.branches.map((b,i)=>`<article style="--branch-color:${colors[i]}"><span>${b.name}</span><strong>${(b.share*100).toFixed(1)}<small>%</small></strong><p>模拟分支占比</p><div class="life-share"><i style="width:${b.share*100}%"></i></div><small>第 ${month} 个月约 ${round(b.values[month])} / 100</small></article>`).join('');
  root.querySelector('#life-actions').innerHTML=`<p>当前选择：每周投入 <strong>${result.action.hours} 小时</strong>，可用上限 ${profile.budget} 小时。先把目标拆成能检验的小成果。</p><ol>${lifeActions(profile).map(text=>`<li>${esc(text)}</li>`).join('')}</ol>`;
  root.querySelector('#life-goal-title').textContent=profile.title;
  const origin=active?.date||beijingNow().date,index=monthIndex(origin)+month,year=Math.floor(index/12),calendarMonth=index%12+1;
  const age=Math.max(0,Math.floor((index-monthIndex(chart.date))/12));
  root.querySelector('#life-calendar-context').textContent=`${year}年${calendarMonth}月 · 约${age}岁 · 出生排盘参照 ${chart.day}${chart.element}日主`;
  root.querySelector('#life-month').max=profile.horizon;root.querySelector('#life-month').value=month;root.querySelector('#life-month-value').textContent=month;
  root.querySelectorAll('[data-life-policy]').forEach(button=>{const selected=button.dataset.lifePolicy===profile.policy;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});
 }
 function renderRecords(){
  const host=root.querySelector('#life-record-content');if(!host)return;
  host.innerHTML=`${records.length?`<label class="life-field">我的本机计划<select id="life-record-select"><option value="">选择已保存的计划</option>${records.map(r=>`<option value="${r.id}" ${active?.id===r.id?'selected':''}>${esc(r.title)} · ${esc(r.date)}</option>`).join('')}</select></label>`:''}
   ${active?`<p class="life-small">原始推演已保存于 ${esc(active.date)}。${JSON.stringify(active.profile)!==JSON.stringify(profile)?'条件已改变；再次保存会建立新计划，原计划保留。':'补记现实反馈不会覆盖原始曲线。'}</p><form id="life-observation-form" class="life-observation-form"><label>记录日期<input type="date" name="date" min="${active.date}" max="${beijingNow().date}" value="${beijingNow().date}" required></label><label>实际每周投入（小时）<input type="number" name="hours" min="0" max="40" step=".5" value="${profile.currentHours}" required></label><label>实际目标推进程度<input type="number" name="progress" min="0" max="100" value="${round(result.state.value)}" required></label><button type="submit" class="panel-button outline">记录这次反馈</button></form>${active.observations.length?`<div class="life-observation-list">${active.observations.slice(-6).reverse().map(row=>`<article><strong>${esc(row.date)} · 推进 ${row.progress} / 100</strong><p>每周 ${row.hours} 小时 · ${row.quadrant.title}</p><small>${row.quadrant.text}</small></article>`).join('')}</div>`:''}`:'<p class="life-muted">还没有保存本次计划。先调整条件，再保存你愿意跟进的一种走法。</p>'}`;
 }
 function feedback(text,error=false){const element=root.querySelector('#life-status');if(element){element.textContent=text;element.classList.toggle('error',error);element.scrollIntoView({block:'nearest'});}else toast(text);}
 function persist(){localStorage.setItem(STORE,JSON.stringify(records));}
 function readControls(){const form=root.querySelector('#life-controls');if(!form)return;profile=normalizeLife(Object.fromEntries(new FormData(form)));}
 root.addEventListener('input',event=>{
  if(event.target.closest('#life-controls')){
   try{readControls();root.querySelectorAll('#life-controls output').forEach(output=>{const key=output.getAttribute('for').replace('life-','');output.textContent=profile[key]+(['hours','currentHours','budget'].includes(key)?' 小时':' / 100');});clearTimeout(queued);queued=setTimeout(()=>{compute();renderDynamic();renderRecords();},90);}catch(error){feedback(error.message,true);}
  }
  if(event.target.id==='life-month'){month=Number(event.target.value);renderDynamic(false);}
 });
 root.addEventListener('change',async event=>{
  if(event.target.closest('#life-birth-form')&&event.target.name==='unknown'){const time=root.querySelector('#life-birth-form [name=time]');time.disabled=event.target.checked;time.required=!event.target.checked;}
  if(event.target.id==='life-record-select'&&event.target.value){active=records.find(r=>r.id===event.target.value);profile=normalizeLife(active.profile);open();}
  if(event.target.id==='life-import'&&event.target.files[0]){
   try{const file=event.target.files[0];if(file.size>500000)throw Error('备份文件过大。');const data=JSON.parse(await file.text());if(data.version!==LIFE_VERSION||!Array.isArray(data.records)||data.records.length>50)throw Error('请选择本栏下载的计划备份。');
    const clean=data.records.map(sanitizeLifeRecord);
    if(clean.some(row=>row.date>beijingNow().date||row.observations.some(o=>o.date>beijingNow().date)))throw Error('备份不能包含未来的真实反馈。');
    for(const row of clean)if(!records.some(r=>r.id===row.id))records.push(row);persist();renderRecords();feedback('备份已导入本机。');
   }catch(error){feedback('未导入：'+error.message,true);}
  }
 });
 root.addEventListener('submit',event=>{
  if(!['life-controls','life-birth-form','life-observation-form'].includes(event.target.id))return;event.preventDefault();
  try{
   if(event.target.id==='life-controls'){readControls();compute();renderDynamic();return;}
   const values=Object.fromEntries(new FormData(event.target));
   if(event.target.id==='life-birth-form'){
    birth={date:values.date,time:values.time||'',gender:values.gender,unknown:values.unknown==='on'};
    if(birth.date>beijingNow().date)throw Error('出生日期不能晚于今天。');const next=birthChart(birth);chart=next;if(!hasCompleteBirth())throw Error('请填写有效且不晚于当前时刻的出生年月日时。');onChart?.(chart,birth);open(chart);root.querySelector('.life-birth-summary').scrollIntoView({block:'start',behavior:'smooth'});
   }else{
    if(!active||JSON.stringify(active.profile)!==JSON.stringify(profile))throw Error('请先保存当前条件，建立新的跟进计划。');
    if(values.date<active.date||values.date>beijingNow().date)throw Error('请记录计划建立之后、且不晚于今天的实际情况。');
    const row={date:values.date,month:monthIndex(values.date)-monthIndex(active.date),hours:Number(values.hours),progress:Number(values.progress)};
    if(row.month>profile.horizon||!Number.isFinite(row.hours)||row.hours<0||row.hours>40||!Number.isFinite(row.progress)||row.progress<0||row.progress>100)throw Error('请检查记录月份、投入时长与推进程度。');
    const previous=active.observations.at(-1)||{hours:profile.currentHours,progress:profile.progress};
    if(active.observations.length&&values.date<previous.date)throw Error('请按时间先后补记，避免打乱已有反馈。');
    row.quadrant=observationQuadrant(previous,row);active.observations.push(row);persist();compute();renderDynamic();renderRecords();feedback('已记录，原始推演保留，后续情景已按本次反馈修正。');
   }
  }catch(error){feedback(error.message,true);}
 });
 root.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;const data=button.dataset;
  if('lifeEditBirth' in data){chart=null;onChart?.(null,birth);openBirthGate();return;}
  if('lifeControlsDone' in data){root.querySelector('details.life-control-card').open=false;root.querySelector('#life-plot').scrollIntoView({block:'start',behavior:'smooth'});}
  if(data.lifePolicy){profile.policy=data.lifePolicy;root.querySelector('#life-controls [name=policy]').value=profile.policy;compute();renderDynamic();renderRecords();}
  if('lifePlay' in data){
   playing=!playing;button.textContent=playing?'Ⅱ':'▶';button.setAttribute('aria-label',playing?'暂停轨迹变化':'播放轨迹变化');clearInterval(timer);
   if(playing){if(month>=profile.horizon)month=0;timer=setInterval(()=>{if(!root.querySelector('#life-plot')){clearInterval(timer);playing=false;return;}month=Math.min(profile.horizon,month+1);renderDynamic(false);if(month>=profile.horizon){clearInterval(timer);playing=false;button.textContent='▶';button.setAttribute('aria-label','播放轨迹变化');}},160);}
  }
  if('lifeSave' in data){
   try{readControls();compute();if(!active)active=[...records].reverse().find(r=>r.date===beijingNow().date&&JSON.stringify(r.profile)===JSON.stringify(profile))||null;if(!active||JSON.stringify(active.profile)!==JSON.stringify(profile)){active={version:LIFE_VERSION,id:crypto.randomUUID(),title:profile.title,date:beijingNow().date,profile:structuredClone(profile),snapshot:{version:LIFE_VERSION,series:structuredClone(result.series)},observations:[]};records.push(active);}persist();renderDynamic();renderRecords();feedback('计划已保存到本机，出生信息未写入存档。');}catch(error){feedback('暂未保存：'+error.message,true);}
  }
  if('lifeExport' in data){
   if(!records.length){feedback('请先保存一份计划。',true);return;}const url=URL.createObjectURL(new Blob([JSON.stringify({version:LIFE_VERSION,records},null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='云道-人生轨迹备份.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
 });
 let wasMobile=innerWidth<700;
 window.addEventListener('resize',()=>{const mobile=innerWidth<700;if(mobile!==wasMobile){wasMobile=mobile;const controls=root.querySelector('details.life-control-card');if(controls)controls.open=!mobile;}if(root.querySelector('#life-plot'))renderDynamic(false);});
 return {open};
}
