import {selectSubmissionDates,eligibleSlot,chooseDistinctDates} from './submission-engine.js?v=20261121-learning';
import {featureVector,predict} from './submission-learning.js?v=20261121-learning';
import {createSubmissionRecords,backgroundFields} from './submission-records.js?v=20261121-clean-ui';

const PRINCIPLE = '以作者的出生年月日时排盘为个人参照，取点击测算当刻的北京时间起梅花易数卦，从问询当日起向后推算，结合八字与黄历给出 SCI 论文投稿的候选日期与时辰。';
const GUIDANCE = '择时仅作传统文化体验与投稿安排参考，论文录用仍取决于稿件质量、期刊要求和评审。';

export function createSubmissionPicker({panel, esc, beforeOpen}) {
  const root = document.querySelector('#panel-content');
  const dialog = document.querySelector('#panel');
  let fields = {birthDate:'', birthTime:'',discipline:'other',tier:'unknown',stage:'first'};
  let result = null;
  const history = createSubmissionRecords({root,esc,getResult:()=>result,getBackground:()=>({discipline:fields.discipline,tier:fields.tier,stage:fields.stage})});
  function calculate() {
    result=selectSubmissionDates(fields);
    const model=history.getModel();
    result.learningApplied=false;
    if(model?.ready) {
      const pool=result.slots.filter(eligibleSlot).map((candidate,index)=>({candidate,index,score:predict(model,featureVector(candidate,fields))}));
      pool.sort((a,b)=>b.score-a.score || a.index-b.index);
      result.preferred=chooseDistinctDates(pool.map(item=>item.candidate));
      result.learningApplied=pool.length>0;
    }
  }

  function field(label, name, type, limits = '') {
    return `<label for="submission-${name}">${label}<input id="submission-${name}" name="${name}" type="${type}" value="${esc(fields[name])}" ${limits} required>
</label>`;
  }
  function capture() {
    const form = root.querySelector('#submission-form');
    if (form) fields = Object.fromEntries(new FormData(form));
  }
  function hexagram(figure, label, moving = 0) {
    return `<figure class="submission-hex">
<figcaption>${label}<strong>${figure.name}</strong>
</figcaption>
<div role="img" aria-label="${figure.name}，自下而上${figure.lines.map((line,index) => `${index+1}爻${line?'阳':'阴'}${moving===index+1?'动':''}`).join('、')}">${[...figure.lines].map((value,index) => ({value,index})).reverse().map(({value,index}) => `<div class="submission-line ${value?'solid':'broken'} ${moving===index+1?'moving':''}" aria-hidden="true">
<i>
</i>
<i>
</i>
</div>`).join('')}</div>
</figure>`;
  }
  function candidateCard(candidate, index) {
    return `<article class="submission-date-card">
<p class="submission-kicker">${index===0?'本次优选':'备选日期'}</p>
<div class="submission-date">${candidate.date}<small>${candidate.weekday}</small>
</div>
<p class="submission-time">${candidate.time}–${candidate.endTime}<small>北京时间 UTC+8 · ${candidate.hourPillar}时</small></p>
<h4>${candidate.day}日 · ${candidate.heavenlySpirit}黄道<br>${candidate.timeHeavenlySpirit}黄道时</h4>
<ul>
<li>候选日支、时支与四柱地支均未见六冲</li>
<li>候选日干为${candidate.element}，对问卦之体为「${candidate.plumRelation}」</li>
<li>时干对问卦之体为「${candidate.timeRelation}」，对日主为${candidate.timeGod}</li>
<li>日干相对作者日主为${candidate.god}${candidate.writing?'，纳入文书与表达的专题参考':''}</li>
<li>${candidate.combinations.length?`日支与${candidate.combinations.join('、')}见六合形态`:'四柱与候选日支未见六合形态'}</li>
</ul>
<button class="panel-button outline" type="button" data-save-submission="${index}" ${result.demo?'disabled':''}>${result.demo?'教学示例不可保存':'保存投稿计划'}</button>
</article>`;
  }
  function results() {
    if (!result) return '';
    const {natal,plum,preferred,ordered,input} = result;
    return `<section class="submission-result" id="submission-result" aria-label="SCI 投稿择日结果">
<div class="submission-result-title">
<div>
<p class="submission-kicker">起卦时刻 ${esc(input.askDate)} ${esc(input.askTime)} · 北京时间</p>
<h3>${preferred.length?'从当前问询时刻推算的吉日吉时':'本次未推得优先日期'}</h3>
</div>
<button class="panel-button outline" type="button" data-submission-download>下载本次结果</button>
</div>
<p>${preferred.length?'本次以点击测算的时刻起卦，融合作者八字向后推算。时段为传统时辰窗口，不代表该时段内某分钟更容易录用。':'自动推算的后续日期中，尚无同时满足「日、时均为黄道」及「日、时支与四柱未见六冲」的时段，可查看下方推算依据。'}</p>
<div class="submission-date-grid">${preferred.map(candidateCard).join('')}</div>
<section class="submission-evidence">
<h3>作者四柱</h3>
<p>${esc(input.birthDate)} ${esc(input.birthTime)} · 北京时间 UTC+8</p>
<div class="submission-pillars">${natal.columns.map((column,index) => `<div>
<span>${['年柱','月柱','日柱','时柱'][index]}</span>
<strong>${column.pillar}</strong>
<small>${column.god}</small>
<small>${column.hidden.map(hidden => `${hidden.gan}${hidden.god}`).join(' · ')}</small>
</div>`).join('')}</div>
<p>日主${natal.day}${natal.element}，月支${natal.columns[1].zhi}。调候原表为${natal.tiaohou.join('、')}，列作研习参考，未据此自动选定喜用神。</p>
</section>
<section class="submission-evidence">
<h3>问询时刻的梅花卦</h3>
<p>${esc(input.askDate)} ${esc(input.askTime)} · ${plum.lunar}</p>
<p>${plum.yearBranch}年取${plum.year}，月${plum.month}，日${plum.day}，合计${plum.upperSum}。加${plum.hourBranch}时${plum.hour}得${plum.lowerSum}。上卦序数${plum.base.upper.n}，下卦序数${plum.base.lower.n}，第${plum.moving}爻动。</p>
<div class="submission-hex-grid">${hexagram(plum.base,'本卦',plum.moving)}${hexagram(plum.mutual,'互卦')}${hexagram(plum.change,'变卦')}</div>
<p>体为${plum.body.name}${plum.body.element}，用为${plum.use.name}${plum.use.element}，本卦${plum.relation}，变卦${plum.changedRelation}。本栏用候选日干五行与此体卦比较，因此问询时刻会参与候选排序。</p>
</section>
<details class="submission-details">
<summary>查看自动推算的 ${ordered.length} 天及依据</summary>
<div class="submission-table-wrap">
<table>
<caption>自 ${input.startDate} 起自动向后推算至 ${input.endDate}，按融合规则排列</caption>
<thead>
<tr>
<th>日期</th>
<th>干支与黄历</th>
<th>作者参照</th>
<th>问时参照</th>
</tr>
</thead>
<tbody>${ordered.map(candidate => `<tr>
<td>${candidate.date}<br>${candidate.time}–${candidate.endTime}</td>
<td>${candidate.day}<br>${candidate.heavenlySpirit}${candidate.yellow?'黄道':'黑道'}<br>${candidate.hourPillar}时 · ${candidate.timeHeavenlySpirit}${candidate.timeYellow?'黄道':'黑道'}</td>
<td>${candidate.clashes.length?`冲${candidate.clashes.join('、')}`:'未见六冲'}<br>${candidate.god}<br>${candidate.timeClashes.length?'时冲'+candidate.timeClashes.join('、'):'时支未见六冲'}${candidate.combinations.length?`<br>合${candidate.combinations.join('、')}`:''}</td>
<td>日干${candidate.element}<br>${candidate.plumRelation}<br>时干${candidate.timeRelation}</td>
</tr>`).join('')}</tbody>
</table>
</div>
</details>
</section>`;
  }
  function open() {
    panel(`<div class="submission-shell">
<header class="submission-heading">
<p class="submission-kicker">SCI 论文 · 投稿择日</p>
<h2>为一份心血，择时启程。</h2>
<p>填写出生信息，点击测算即以当前问询时刻起卦，向后推算投稿日期与时辰；保存计划后，可持续跟进结果。</p>
</header>
<aside class="submission-tip">
<strong>择日小提示</strong>
<p>${PRINCIPLE}</p>
<small>${GUIDANCE}</small>
</aside>
<p class="submission-clock">出生时刻按北京时间 UTC+8 填写。起卦时刻由系统在点击测算时自动记录。</p>
<form id="submission-form">
<div class="submission-form-grid">
<fieldset>
<legend>作者出生时刻</legend>
<div class="submission-fields">${field('公历出生日期','birthDate','date','min="1900-01-01" max="2099-12-31"')}${field('出生时间','birthTime','time')}</div>
<p>输入你本人的出生日期与时刻。</p>
</fieldset>
<aside class="submission-inquiry">
<strong>以此刻问询，推算投稿吉日</strong>
<p>${result?`本次起卦 ${esc(result.input.askDate)} ${esc(result.input.askTime)}（北京时间）`:'点击下方按钮时，系统自动记录当前北京时间并起卦。'}</p>
<p>系统从问询当日起自动向后推算，给出三个候选日的时辰窗口。</p>
</aside>
</div>
<div class="submission-fields submission-background">${backgroundFields(fields,esc)}</div>
<p class="submission-error" id="submission-error" role="alert" hidden>
</p>
<div class="submission-actions">
<button class="panel-button" type="submit">以当前时刻起卦，推算吉日吉时</button>
<button class="panel-button outline" type="button" data-submission-demo>试用教学示例</button>
<button class="submission-text-button" type="button" data-submission-clear>清空出生信息与结果</button>
</div>
</form>
<details class="submission-details">
<summary>时间口径与本栏融合规则</summary>
<p>出生与起卦均按北京时间 UTC+8 的民用时刻。每次点击测算都会重新记录问询当刻。系统自问询当日起自动推算 60 个自然日，超出历法支持范围时截断至 2099 年底。逐日逐时辰计算，排除问询之前的窗口。当日已开始的时辰截取问询当刻之后的部分，因此窗口起点可能显示当前分钟；这不表示具备分钟级预测精度。子时按民用日期拆为 23:00–23:59 与 00:00–00:59。年、月按节气，日柱零点换日，未校正真太阳时和历史夏令时。问卦按农历年支、月、日与时支取数，闰月沿用月序。上下卦分别除八取余，余 0 作 8；动爻总数除六取余，余 0 作 6。同一时辰内的问询会得到同一时间卦。</p>
<p>本栏是本站自定的融合体验。依次比较日黄道、日支六冲、时黄道、时支六冲，再按日干及时干与问卦之体的关系排序，依次为用生体、比和、体克用、体生用、用克体。再参考日干十神中的印星与食伤，以及日支六合形态，同条件按日期先后排列。</p>
<p>仅在「日、时均黄道且均未见六冲」的候选中选取三个不同日期，各给一个时辰窗口。黄道采用日、时十二天神的分类。下方可查看 60 天的传统择时明细。「印星与食伤」用于文书、表达的本站专题取象。此融合次序为本站约定，未将现代 SCI 投稿列作古籍中的黄历宜忌事项。</p>
<p>历法沿用本网站的 lunar-javascript，八字和调候沿用已导入的跃渊资料。梅花时间卦可对照《梅花易数》卷一。<a href="https://github.com/6tail/lunar-javascript" target="_blank" rel="noopener noreferrer">历法来源</a> · <a href="https://zh.wikisource.org/zh-hans/梅花易數/卷一" target="_blank" rel="noopener noreferrer">梅花起卦原文</a>
</p>
</details>${results()}<div id="submission-records"></div><p class="submission-privacy">原始出生年月日时只在本页内存计算。仅主动保存计划时才上传页面说明中的派生参照与计划；主动勾选同意才用于历史学习。下载文件包含个人出生信息，请自行保管。</p>
</div>`);
    dialog.classList.add('submission-panel');
    history.render();
  }
  const entry = document.querySelector('#submission-entry');
  entry.addEventListener('click',() => { beforeOpen?.(); open(); history.load(); });
  entry.disabled = false;
  entry.removeAttribute('aria-busy');
  function invalidateResult() {
    result = null;
    const previous = root.querySelector('#submission-result');
    if (previous) previous.hidden = true;
  }
  root.addEventListener('input', event => {
    if (event.target.closest('#submission-form')) invalidateResult();
  });
  root.addEventListener('submit', event => {
    if (event.target.id !== 'submission-form') return;
    event.preventDefault();
    capture();
    try {
      calculate();
      open();
      root.querySelector('#submission-result').scrollIntoView({block:'start',behavior:'smooth'});
    } catch (error) {
      const feedback = root.querySelector('#submission-error');
      feedback.hidden = false;
      feedback.textContent = error.message;
    }
  });
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if ('saveSubmission' in button.dataset) history.start(Number(button.dataset.saveSubmission));
    if ('submissionDemo' in button.dataset) {
      fields = {...fields,birthDate:'1990-05-15',birthTime:'10:00'};
      calculate();
      result.demo=true;
      open();
    }
    if ('submissionClear' in button.dataset) {
      capture(); fields.birthDate = ''; fields.birthTime = ''; result = null; open();
    }
    if ('submissionDownload' in button.dataset && result) {
      const {input,natal,plum,preferred,ordered} = result;
      const text = ['云道 · SCI 投稿择日',PRINCIPLE,GUIDANCE,
        `出生 ${input.birthDate} ${input.birthTime}；四柱 ${natal.pillars.join(' ')}`,
        `问询 ${input.askDate} ${input.askTime}；本卦 ${plum.base.name}，互卦 ${plum.mutual.name}，变卦 ${plum.change.name}，${plum.moving}爻动`,
        `体 ${plum.body.name}${plum.body.element}；用 ${plum.use.name}${plum.use.element}`,
        `优先候选 ${preferred.map(candidate => candidate.date+' '+candidate.time+'–'+candidate.endTime).join('、') || '无'}`,
        '推荐为传统时辰窗口，不表示具备分钟级预测精度。',
        ...ordered.map(candidate => `${candidate.date} ${candidate.time}–${candidate.endTime} ${candidate.hourPillar}时 ${candidate.day} ${candidate.heavenlySpirit}${candidate.yellow?'黄道':'黑道'}；${candidate.clashes.length?'冲'+candidate.clashes.join('、'):'未见六冲'}；${candidate.god}；${candidate.plumRelation}`),
        '系统在点击测算时自动取问询时刻起卦，自当日起向后推算60个自然日。时间按北京时间 UTC+8，零点换日，未校真太阳时；调候仅作参考，未自动确定喜用神。'
      ].join('\n\n');
      const url = URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/plain;charset=utf-8'}));
      const link = document.createElement('a'); link.href = url; link.download = 'SCI投稿择日参考.txt'; link.click();
      setTimeout(() => URL.revokeObjectURL(url),1000);
    }
  });
}
