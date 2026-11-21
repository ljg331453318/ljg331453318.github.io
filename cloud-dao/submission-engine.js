import {Solar} from './vendor/lunar.js';
import {birthChart, parseCivil, plumCalendar, tenGod, stemElement, elementRelation} from './yi-engine.js';

const CLASHES = ['子午','丑未','寅申','卯酉','辰戌','巳亥'];
const COMBINATIONS = ['子丑','寅亥','卯戌','辰酉','巳申','午未'];
// These priorities define this site's experimental fusion, not a classical SCI rule.
const PLUM_PRIORITY = ['用生体','体用比和','体克用','体生用','用克体'];
const WRITING_GODS = new Set(['正印','偏印','食神','伤官']);
const DAY_MS = 86400000;
const SLOT_HOURS = [0,1,3,5,7,9,11,13,15,17,19,21,23];

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

export function describeSubmissionMoment(context, date, time, questionBody) {
  const civil = parseCivil(date,time);
  const lunar = Solar.fromYmdHms(civil.y,civil.m,civil.day,civil.h,civil.min,0).getLunar();
  const day = lunar.getDayInGanZhiExact2();
  const hourPillar = lunar.getTimeInGanZhi();
  const body = questionBody || plumCalendar(context.askDate,context.askTime).body.element;
  const clashes = [], combinations = [], timeClashes = [];
  context.branches.forEach((branch,index)=>{
    const label = `${['年','月','日','时'][index]}支${branch}`;
    if (pairMatches(CLASHES,day[1],branch)) clashes.push(label);
    if (pairMatches(COMBINATIONS,day[1],branch)) combinations.push(label);
    if (pairMatches(CLASHES,hourPillar[1],branch)) timeClashes.push(label);
  });
  const god = tenGod(context.natalDay,day[0]);
  const timeGod = tenGod(context.natalDay,hourPillar[0]);
  return {date,time,day,hourPillar,clashes,combinations,timeClashes,god,timeGod,
    weekday:new Intl.DateTimeFormat('zh-CN',{weekday:'long',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')),
    lunar:lunar.toString(),heavenlySpirit:lunar.getDayTianShen(),yellow:lunar.getDayTianShenType()==='黄道',
    timeHeavenlySpirit:lunar.getTimeTianShen(),timeYellow:lunar.getTimeTianShenType()==='黄道',
    writing:WRITING_GODS.has(god),timeWriting:WRITING_GODS.has(timeGod),element:stemElement(day[0]),
    plumRelation:elementRelation(body,stemElement(day[0])),timeRelation:elementRelation(body,stemElement(hourPillar[0]))};
}
function compareCandidates(a,b) {
  const order = value=>[Number(!value.yellow),value.clashes.length,Number(!value.timeYellow),value.timeClashes.length,
    PLUM_PRIORITY.indexOf(value.plumRelation),PLUM_PRIORITY.indexOf(value.timeRelation),Number(!value.writing),Number(!value.timeWriting),-value.combinations.length];
  const x=order(a),y=order(b);
  for (let i=0;i<x.length;i++) if(x[i]!==y[i]) return x[i]-y[i];
  return (a.date+a.time).localeCompare(b.date+b.time);
}
export function chooseDistinctDates(candidates) {
  const dates=new Set();
  return candidates.filter(candidate=>{if(dates.has(candidate.date)) return false; dates.add(candidate.date); return true;}).slice(0,3);
}
export function eligibleSlot(candidate) {
  return candidate.yellow && candidate.timeYellow && !candidate.clashes.length && !candidate.timeClashes.length;
}

export function selectSubmissionDates(birth, inquiry = beijingNow()) {
  const input = {
    birthDate: birth.birthDate,
    birthTime: birth.birthTime,
    askDate: inquiry.date,
    askTime: inquiry.time
  };
  const birthTime = civilStamp(input.birthDate,input.birthTime);
  const askedTime = civilStamp(input.askDate,input.askTime);
  if (birthTime > askedTime) throw new Error('出生时刻应早于问询时刻。');
  const start = civilStamp(input.askDate,'00:00');
  const supportedEnd = civilStamp('2099-12-31','00:00');
  const days = Math.min(60,Math.floor((supportedEnd-start)/DAY_MS)+1);
  input.startDate = input.askDate;
  input.endDate = shiftDate(input.askDate,days-1);

  const natal = birthChart({date:input.birthDate,time:input.birthTime});
  const plum = plumCalendar(input.askDate,input.askTime);
  const context = {natalDay:natal.day,branches:natal.pillars.map(pillar=>pillar[1]),askDate:input.askDate,askTime:input.askTime};
  const slots=[];
  for (let offset=0;offset<days;offset++) {
    const date=shiftDate(input.startDate,offset);
    for (const hour of SLOT_HOURS) {
      const endHour=hour===0?0:Math.min(23,hour+1);
      const endTime=String(endHour).padStart(2,'0')+':59';
      if(civilStamp(date,endTime)<askedTime) continue;
      let time=String(hour).padStart(2,'0')+':00';
      if(date===input.askDate && time<input.askTime) time=input.askTime;
      const facts=describeSubmissionMoment(context,date,time,plum.body.element);
      slots.push({...facts,endTime});
    }
  }
  slots.sort(compareCandidates);
  const ordered=[];const seen=new Set();
  for(const slot of slots) if(!seen.has(slot.date)){ordered.push(slot);seen.add(slot.date);}
  const preferred=chooseDistinctDates(slots.filter(eligibleSlot));
  return {input:{...input},context,natal,plum,candidates:[...ordered].sort((a,b)=>a.date.localeCompare(b.date)),ordered,slots,preferred};
}
