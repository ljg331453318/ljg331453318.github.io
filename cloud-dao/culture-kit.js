import {TRIGRAMS,hexagram,branchRelations,tenGod} from './yi-engine.js';
import {Solar} from './vendor/lunar.js';

// 云道原创学习提示，卦序与卦象沿用现有历法模块；非卜易居释义转载。
const hints=`主动有度|承载与配合|初创的阻力|带着问题求学|等待与准备|分歧先求澄清|协作需要纪律|选择可靠伙伴|积累小成果|谨慎履行约定|沟通使上下相通|闭塞时保留余地|求同也容差异|资源充足更需节制|谦逊与自省|热情配合准备|跟随前先辨方向|整顿积存的问题|接近时保持分寸|观察再作判断|处理阻隔|形式服务于内容|减损时守住根本|重新开始|诚实面对意外|储备能力|留意给予与摄取|承担与承载相称|困境中逐步求通|看清依附的条件|感应与相互尊重|持续需要方法|退让也有边界|力量需要约束|逐步向前|不利时保护内在|共同生活的秩序|差异中的合作|遇阻先找支持|松开紧张与束缚|减去多余负担|增益落实到行动|决断之前说明理由|相遇时辨明边界|聚集也需共同目标|稳步积累而上|受限时保留表达|维护共享的资源|改变需有依据|更新承载的方法|惊动之后安顿自己|停止与安定|循序渐进|关系中辨清位置|丰盛之时保持清醒|陌生环境中的分寸|温和而持续地进入|交流带来理解|疏通隔阂|约束须合乎尺度|以诚意建立信任|小事上多加谨慎|完成后仍需维护|未完成中保留可能`.split('|');
export const HEXAGRAMS=TRIGRAMS.flatMap(u=>TRIGRAMS.map(l=>hexagram([...l.lines,...u.lines]))).sort((a,b)=>a.number-b.number).map(h=>({...h,hint:hints[h.number-1]}));
export function miniHex(h){return `<span class="atlas-lines" aria-hidden="true">${[...h.lines].reverse().map(v=>`<i class="${v?'solid':'broken'}"></i>`).join('')}</span>`;}
export const LOT_THEMES=[{id:'cloud',name:'云栖心签',about:'山水之间，留一段心语。'},{id:'lvzu',name:'吕祖修心',about:'以修心、立志为题的云道原创签。'},{id:'laojun',name:'老君观心',about:'以知足、柔和、少私为题的云道原创签。'}];
const lots=[
 ['lvzu','定志','志','山路多回转，\n一灯照此行。','先确定自己珍重的方向，再安排眼前的一步。','把本周最重要的一件事写下来，并为它留出半小时。','你愿意坚持的理由是什么？'],
 ['lvzu','日课','课','不待千重雪，\n先扫一阶尘。','修习可以从每天能重复的小事开始。','给一件小事设定固定时间，连做三天再回看。','哪一个小习惯，今天就能开始？'],
 ['lvzu','照心','镜','水静能明影，\n心平可辨途。','把事实与猜测分开，给判断留一点空间。','把困扰写成两列：已经知道的事实、尚需核实的想法。','你现在最需要核实的是什么？'],
 ['lvzu','求教','问','独行逢岔路，\n问道亦前行。','求助不妨碍自主，好的问题能缩短摸索。','带着一个具体问题，请一位可靠的人给出反馈。','谁能为你提供具体而诚恳的建议？'],
 ['lvzu','守约','诚','言轻如一叶，\n落处亦留痕。','少许诺一点，把已有约定做好。','检查一项未完成的约定，确定下一步和可兑现的时间。','哪一句承诺需要你重新照料？'],
 ['lvzu','知止','止','行至松阴下，\n歇来路更明。','停下来检查方向，也是行动的一部分。','暂停一项低效投入，看看它是否仍服务于目标。','有什么事，可以先停一下再决定？'],
 ['laojun','若水','水','清流循石隙，\n不争亦到湾。','试着改变方法，不必把每一件事做成对抗。','把一次争执改写为具体需求，提出一个可以商量的办法。','你能换一种更柔和的表达吗？'],
 ['laojun','知足','足','小窗容日色，\n一盏亦生温。','看见已有的支持，再决定是否需要更多。','记下三件已经够用的事，取消一项不必要的消耗。','你现在拥有哪些被忽略的支持？'],
 ['laojun','留白','空','杯空方可注，\n庭静始闻风。','为注意力腾出空位，让重要的事有处安放。','清理一小块空间，或留出一段不安排任务的时间。','什么可以从今天的安排中减去？'],
 ['laojun','微始','始','远岫藏云外，\n阶前已有途。','把遥远的目标拆成可以检查的第一步。','用十五分钟完成一个最小版本，再决定下一步。','哪个开始足够小，小到你愿意马上做？'],
 ['laojun','少私','宽','同坐松阴里，\n清风不问谁。','为关系保留平等，也为自己保留边界。','做一件不求回报的小事，同时明确自己能够承担的限度。','怎样照顾别人，也照顾好自己？'],
 ['laojun','归静','静','暮色归山径，\n灯前理旧笺。','回顾一天的经历，分清能够改变与需要接受的部分。','写下今天的一件收获，以及明天的一项具体调整。','此刻，你愿意放下哪一件暂时无解的事？']
];
export const CULTURE_LOTS=lots.map(([theme,title,character,verse,reflection,action,prompt],i)=>({id:'culture-'+theme+'-'+i,theme,number:lots.slice(0,i+1).filter(x=>x[0]===theme).length,title,character,verse,reflection,action,prompt}));
export function yearContext(chart,year){
 const lunar=Solar.fromYmdHms(year,7,1,12,0,0).getLunar(),pillar=lunar.getEightChar().getYear();
 const start=chart.luck?Solar.fromYmdHms(...chart.luck.start.match(/\d+/g).map(Number)):null;
 const intervals=chart.luck?.cycles.map((c,i)=>({...c,from:start.nextYear(i*10).toYmdHms(),until:start.nextYear((i+1)*10).toYmdHms()}))||[];
 const begin=`${year}-01-01 00:00:00`,end=`${year+1}-01-01 00:00:00`;
 return {year,pillar,god:tenGod(chart.day,pillar[0]),intervals:intervals.filter(c=>c.from<end&&c.until>begin)};
}
export function renderLuckTimeline(){return '<section class="culture-timeline study-card" aria-label="岁运互动时间轴"></section>';}
export function attachLuckTimeline(root,chart){
 const host=root.querySelector('.culture-timeline');if(!host||!chart||chart.manual)return;
 const now=Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Shanghai'}).format(new Date())),birthYear=Number(chart.date.slice(0,4));
 let year=Math.min(2099,Math.max(birthYear,now));
 function draw(){
  const context=yearContext(chart,year),cycle=chart.luck?.cycles.find(c=>year>=c.start&&year<=c.end),first=cycle?cycle.start:Math.floor(year/10)*10;
  const years=Array.from({length:10},(_,i)=>first+i).filter(y=>y>=birthYear&&y<=2099);
  const flow=context.pillar[1];
  const matches=chart.pillars.flatMap((p,i)=>{if(!p)return [];return branchRelations([p,context.pillar]).map(r=>`${['年','月','日','时'][i]}柱与流年：${r.replace('年'+p[1],'本命'+p[1]).replace('月'+flow,'流年'+flow)}`);});
  host.innerHTML=`<span class="study-eyebrow">岁运 · 可点击的时间轴</span><h3>沿着年份，看看干支怎样变化。</h3><p>以立春划分干支流年；岁运是传统参照，可与你的现实计划并排阅读。</p>${chart.luck?`<div class="luck-cycle-strip" aria-label="选择大运阶段">${chart.luck.cycles.map(c=>`<button type="button" data-luck-year="${Math.max(birthYear,c.start)}" ${c.start>2099?'disabled':''} aria-pressed="${year>=c.start&&year<=c.end}"><strong>${c.pillar}</strong><span>${c.start}—${c.end}</span></button>`).join('')}</div>`:'<p>未选择传统排运性别，本次只显示流年。可在修改出生信息时补选，再查看大运。</p>'}<div class="luck-year-strip" aria-label="选择流年">${years.map(y=>`<button type="button" data-luck-year="${y}" aria-pressed="${y===year}">${y}</button>`).join('')}</div><form class="luck-jump"><label>直接查看年份<input type="number" name="year" min="${birthYear}" max="2099" value="${year}" required></label><button class="panel-button outline" type="submit">查看这一年</button></form><div class="luck-detail" aria-live="polite"><h4>${year} · ${context.pillar}流年 · 约${year-birthYear}岁</h4><p>${context.pillar[0]}对${chart.day}日主为${context.god}。此处“${year}流年”指该年立春至下一年立春；周岁以生日为准。</p>${context.intervals.length?context.intervals.map(c=>`<p><strong>${c.pillar}大运</strong>：${c.from} 至 ${c.until}（北京时间，结束时刻不含）。${context.intervals.length>1?'本公历年内含交运，须按具体时刻区分。':''}</p>`).join(''):'<p>本年未进入已排大运区间，或本次未计算大运。</p>'}<details><summary>本命与流年地支关系</summary>${matches.length?`<ul>${matches.map(r=>`<li>${r}</li>`).join('')}</ul>`:'<p>未匹配当前列示的两支关系。</p>'}<p>这里只列符号关系，不把冲合自动解释为具体事件。十神、岁运不代表目标达成率。</p></details><p>回看这一年：哪些支持可以争取？哪些安排可以调整？在下方行动计划中记录可以验证的一步。</p></div>`;
 }
 host.addEventListener('click',e=>{const b=e.target.closest('[data-luck-year]');if(!b)return;const next=Number(b.dataset.luckYear);if(next<birthYear||next>2099)return;year=next;draw();});
 host.addEventListener('submit',e=>{if(!e.target.matches('.luck-jump'))return;e.preventDefault();const n=Number(new FormData(e.target).get('year'));if(Number.isInteger(n)&&n>=birthYear&&n<=2099){year=n;draw();}});draw();
}
