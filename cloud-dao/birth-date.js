export function parsePastedBirthDate(value){
 const text=String(value).trim();
 const match=/^(\d{4})(?:[-/.年]?(\d{1,2})[-/.月]?(\d{1,2})日?)$/.exec(text);
 if(!match)return null;
 const [year,month,day]=match.slice(1).map(Number),date=new Date(Date.UTC(year,month-1,day));
 if(year<1900||year>2099||month<1||month>12||day<1||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
 return {year:String(year),month:String(month).padStart(2,'0'),day:String(day).padStart(2,'0')};
}
export function renderBirthDate({name,value='',id='birth-date',required=true}){
 const parsed=parsePastedBirthDate(value)||{year:'',month:'',day:''};
 const attr=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 return `<span class="birth-date-parts" role="group" aria-label="出生年月日，年份可直接输入">${[['year','出生年份','年','1990',4,'[0-9]{4}'],['month','出生月份','月','05',2,'(0?[1-9]|1[0-2])'],['day','出生日','日','15',2,'(0?[1-9]|[12][0-9]|3[01])']].map(([part,label,unit,placeholder,length,pattern])=>`<span><input id="${attr(id)}-${part}" data-birth-part="${part}" type="text" inputmode="numeric" autocomplete="bday-${part}" aria-label="${label}" placeholder="${placeholder}" maxlength="${length}" pattern="${pattern}" value="${parsed[part]}" ${required?'required':''}><small>${unit}</small></span>`).join('')}<input type="hidden" name="${attr(name)}" value="${parsed.year?parsed.year+'-'+parsed.month+'-'+parsed.day:''}" data-birth-iso></span><small class="birth-date-help">年份直接输入，也可粘贴 1990-05-15 或 19900515</small>`;
}
function update(group){
 const values=Object.fromEntries([...group.querySelectorAll('[data-birth-part]')].map(input=>[input.dataset.birthPart,input.value.trim()]));
 group.querySelector('[data-birth-iso]').value=values.year&&values.month&&values.day?`${values.year}-${values.month.padStart(2,'0')}-${values.day.padStart(2,'0')}`:'';
}
if(typeof document!=='undefined'){
 document.addEventListener('submit',event=>event.target.querySelectorAll('.birth-date-parts').forEach(update),true);
 for(const type of ['input','change'])document.addEventListener(type,event=>{if(event.target.matches('[data-birth-part]'))update(event.target.closest('.birth-date-parts'));},true);
 document.addEventListener('paste',event=>{
  if(!event.target.matches('[data-birth-part]'))return;
  const parsed=parsePastedBirthDate(event.clipboardData?.getData('text')||'');if(!parsed)return;
  event.preventDefault();const group=event.target.closest('.birth-date-parts');
  group.querySelectorAll('[data-birth-part]').forEach(input=>input.value=parsed[input.dataset.birthPart]);update(group);
  event.target.dispatchEvent(new Event('input',{bubbles:true}));
 });
}
