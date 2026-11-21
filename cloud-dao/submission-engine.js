import {Solar} from './vendor/lunar.js';
import {birthChart, parseCivil, plumCalendar, tenGod, stemElement, elementRelation} from './yi-engine.js';

const CLASHES = ['子午','丑未','寅申','卯酉','辰戌','巳亥'];
const COMBINATIONS = ['子丑','寅亥','卯戌','辰酉','巳申','午未'];
// These priorities define this site's experimental fusion, not a classical SCI rule.
const PLUM_PRIORITY = ['用生体','体用比和','体克用','体生用','用克体'];
const WRITING_GODS = new Set(['正印','偏印','食神','伤官']);
const DAY_MS = 86400000;

export function civilStamp(date, time = '12:00') {
  const value = parseCivil(date, time);
  return Date.UTC(value.y,value.m-1,value.day,value.h,value.min);
}

export function shiftDate(date, days) {
  return new Date(civilStamp(date,'00:00') + days * DAY_MS).toISOString().slice(0,10);
}

export function beijingNow() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone:'Asia/Shanghai', year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hourCycle:'h23'
  }).formatToParts(new Date()).map(part => [part.type,part.value]));
  return {date:`${parts.year}-${parts.month}-${parts.day}`, time:`${parts.hour}:${parts.minute}`};
}

function pairMatches(pairs, a, b) {
  return pairs.some(pair => pair === a+b || pair === b+a);
}

function compareCandidates(a, b) {
  const aOrder = [a.yellow ? 0 : 1, a.clashes.length, PLUM_PRIORITY.indexOf(a.plumRelation), a.writing ? 0 : 1, -a.combinations.length];
  const bOrder = [b.yellow ? 0 : 1, b.clashes.length, PLUM_PRIORITY.indexOf(b.plumRelation), b.writing ? 0 : 1, -b.combinations.length];
  for (let index = 0; index < aOrder.length; index++) {
    if (aOrder[index] !== bOrder[index]) return aOrder[index] - bOrder[index];
  }
  return a.date.localeCompare(b.date);
}

export function selectSubmissionDates(input) {
  const birthTime = civilStamp(input.birthDate,input.birthTime);
  const askedTime = civilStamp(input.askDate,input.askTime);
  const start = civilStamp(input.startDate,input.submitTime);
  const end = civilStamp(input.endDate,input.submitTime);
  if (birthTime > askedTime) throw new Error('出生时刻应早于问询时刻。');
  if (start < askedTime) throw new Error('候选投稿时刻应从问询之后开始，请调整起始日期或预计投稿时间。');
  if (end < start) throw new Error('结束日期应不早于起始日期。');
  const days = Math.round((end-start)/DAY_MS) + 1;
  if (days > 60) throw new Error('每次请选择最多 60 天，便于逐日比较。');

  const natal = birthChart({date:input.birthDate,time:input.birthTime});
  const plum = plumCalendar(input.askDate,input.askTime);
  const pillarNames = ['年','月','日','时'];
  const candidates = [];
  for (let offset = 0; offset < days; offset++) {
    const date = shiftDate(input.startDate,offset);
    const civil = parseCivil(date,input.submitTime);
    const lunar = Solar.fromYmdHms(civil.y,civil.m,civil.day,civil.h,civil.min,0).getLunar();
    const day = lunar.getDayInGanZhiExact2();
    const clashes = [], combinations = [];
    natal.pillars.forEach((pillar,index) => {
      const label = `${pillarNames[index]}支${pillar[1]}`;
      if (pairMatches(CLASHES,day[1],pillar[1])) clashes.push(label);
      if (pairMatches(COMBINATIONS,day[1],pillar[1])) combinations.push(label);
    });
    const god = tenGod(natal.day,day[0]);
    candidates.push({
      date, time:input.submitTime, day, weekday:new Intl.DateTimeFormat('zh-CN',{weekday:'long',timeZone:'UTC'}).format(new Date(start + offset*DAY_MS)),
      lunar:lunar.toString(), heavenlySpirit:lunar.getDayTianShen(), yellow:lunar.getDayTianShenType() === '黄道',
      clashes, combinations, god, writing:WRITING_GODS.has(god),
      element:stemElement(day[0]), plumRelation:elementRelation(plum.body.element,stemElement(day[0]))
    });
  }
  const ordered = [...candidates].sort(compareCandidates);
  const preferred = ordered.filter(candidate => candidate.yellow && candidate.clashes.length === 0).slice(0,3);
  return {input:{...input}, natal, plum, candidates, ordered, preferred};
}
