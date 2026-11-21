import {submissionService} from './community.js?v=20261121-learning';

export const BACKGROUND = {
  discipline:[['other','其他 / 暂不指定'],['engineering','工程与技术'],['science','自然科学'],['medicine','医学与生命科学'],['social','社会科学']],
  tier:[['unknown','暂不指定'],['Q1','Q1'],['Q2','Q2'],['Q3','Q3'],['Q4','Q4']],
  stage:[['first','首次投稿'],['resubmission','改投其他期刊']]
};
const STATUS={planned:'已保存计划',pending:'已投，等待结果',accepted:'已录用',rejected:'已拒稿',withdrawn:'已撤稿'};
export function backgroundFields(values,esc) {
  return [['discipline','研究领域'],['tier','目标期刊 JCR 分区'],['stage','投稿阶段']].map(([name,label])=>
    `<label>${label}<select name="${name}">${BACKGROUND[name].map(([value,text])=>`<option value="${value}" ${values[name]===value?'selected':''}>${text}</option>`).join('')}</select></label>`).join('');
}

export function createSubmissionRecords({root,esc,getResult,getBackground}) {
  let records=[],model=null,editor=null,loading=false,error='',notice='';
  function form() {
    if(!editor) return '';
    return `<form id="submission-record-form" class="submission-record-editor">
      <h3>保存计划与跟进结果</h3>
      <p>原始问询：${esc(editor.context.askDate)} ${esc(editor.context.askTime)}。计划：${esc(editor.planned.replace('T',' '))}${editor.plannedEnd?'–'+esc(editor.plannedEnd.slice(11)):''}（北京时间）。保存后保留原始计划，实际投稿可另行记录。</p>
      <div class="submission-fields"><label>记录别名（请勿填写论文题目）<input name="alias" maxlength="40" value="${esc(editor.alias)}" placeholder="例如：我的第一篇投稿"></label>
      <label>当前状态<select name="status">${Object.entries(STATUS).map(([value,label])=>`<option value="${value}" ${editor.status===value?'selected':''}>${label}</option>`).join('')}</select></label></div>
      <div class="submission-fields">${backgroundFields(editor,esc)}</div>
      <div class="submission-fields"><label data-actual-label>实际投稿时间（北京时间）<input name="actual" type="datetime-local" value="${esc(editor.actual||'')}"></label>
      <label data-decision-label>最终决定时间（北京时间）<input name="decision" type="datetime-local" value="${esc(editor.decision||'')}"></label></div>
      <label class="submission-consent"><input name="consent" type="checkbox" ${editor.consent?'checked':''}><span>自愿将此记录用于本站历史学习。保存的派生四柱参照、问询与计划时刻、实际投稿时刻、领域、分区、阶段和结果用于统计；记录不向其他用户展示。可随时取消同意或删除。</span></label>
      <p class="submission-privacy">不会上传原始出生年月日时、论文题目或姓名。派生参照（日主、四柱地支）也属于个人信息，请自行决定是否保存。仅已录用 / 已拒稿且勾选同意的记录参与学习。</p>
      <div class="submission-actions"><button type="submit" class="panel-button">保存这条记录</button><button type="button" class="panel-button outline" data-record-cancel>取消</button></div>
    </form>`;
  }
  function render(preserve=true) {
    const active=root.querySelector('#submission-record-form');
    if(preserve && editor && active) editor={...editor,...Object.fromEntries(new FormData(active)),consent:active.elements.consent.checked};
    const host=root.querySelector('#submission-records');
    if(!host) return;
    host.innerHTML=`<section class="submission-evidence"><h3>我的投稿记录</h3><p>免登录，沿用你的修习凭证保存。换设备时可在庭院存档处恢复凭证。记录仅本人可见，保留最近 100 条供查看。</p>
      <p role="status">${esc(notice || (loading?'正在读取记录…':''))}</p>
      ${error?`<p class="submission-error" role="alert">${esc(error)}</p>`:''}
      ${form()}
      ${records.length?`<div class="submission-history">${records.map(record=>`<article><div><strong>${esc(record.alias||'我的投稿')}</strong><p>${esc(record.planned.replace('T',' '))}${record.plannedEnd?'–'+esc(record.plannedEnd.slice(11)):''} · ${STATUS[record.status]}<br>${record.actual?`实际投稿 ${esc(record.actual.replace('T',' '))}<br>`:''}${record.decision?`决定 ${esc(record.decision.replace('T',' '))}<br>`:''}${record.consent?'已同意历史学习':'未同意历史学习'}</p></div><div class="submission-actions"><button class="panel-button outline" type="button" data-record-edit="${record.id}">更新结果</button><button class="submission-text-button" type="button" data-record-delete="${record.id}">删除记录</button></div></article>`).join('')}</div>`:!loading&&!error?'<p>还没有保存计划。测算后，在日期卡片上选择「保存投稿计划」。</p>':''}
      <button type="button" class="submission-text-button" data-record-refresh>刷新记录</button></section>`;
    conditionalFields();
  }
  function conditionalFields() {
    const form=root.querySelector('#submission-record-form');if(!form)return;
    const status=form.elements.status.value;
    for(const [name,show] of [['actual',status!=='planned'],['decision',['accepted','rejected'].includes(status)]]) {
      form.elements[name].disabled=!show;form.elements[name].required=show;
      form.elements[name].closest('label').hidden=!show;
    }
  }
  async function load() {
    if(loading)return;loading=true;error='';render();
    const [history,learning]=await Promise.allSettled([submissionService('list'),submissionService('model')]);
    if(history.status==='fulfilled') records=history.value.records;
    else error='云端记录读取失败，请稍后重试。'+history.reason.message;
    model=learning.status==='fulfilled'?learning.value.model:null;
    loading=false;render();
  }
  function start(index) {
    const result=getResult(),candidate=result?.preferred[index];if(!candidate || result.demo)return;
    editor={id:crypto.randomUUID(),context:structuredClone(result.context),planned:candidate.date+'T'+candidate.time,plannedEnd:candidate.date+'T'+candidate.endTime,
      forecastMethod:result.learningApplied?'ekf-logistic-v1':'traditional',
      status:'planned',actual:'',decision:'',alias:'',consent:false,...getBackground()};
    notice='';error='';render(false);root.querySelector('#submission-record-form').scrollIntoView({behavior:'smooth',block:'start'});
  }
  root.addEventListener('change',event=>{if(event.target.closest('#submission-record-form') && event.target.name==='status')conditionalFields();});
  root.addEventListener('submit',async event=>{
    if(event.target.id!=='submission-record-form')return;event.preventDefault();
    const form=event.target,button=form.querySelector('[type=submit]');
    if(button.disabled)return;
    editor={...editor,...Object.fromEntries(new FormData(form)),consent:form.elements.consent.checked};
    button.disabled=true;button.textContent='正在保存…';
    try {await submissionService('save',{record:editor});editor=null;notice='记录已保存。请在实际投稿后补记时间，收到最终决定后更新结果。';await load();}
    catch(failure){error='保存失败：'+failure.message;render();}
  });
  root.addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button)return;
    if('recordCancel' in button.dataset){editor=null;error='';render();}
    if('recordRefresh' in button.dataset)await load();
    if('recordEdit' in button.dataset){editor=structuredClone(records.find(record=>record.id===button.dataset.recordEdit));error='';notice='';render(false);root.querySelector('#submission-record-form').scrollIntoView({behavior:'smooth',block:'start'});}
    if('recordDelete' in button.dataset){
      button.disabled=true;
      try{await submissionService('delete',{recordId:button.dataset.recordDelete});if(editor?.id===button.dataset.recordDelete)editor=null;notice='记录已删除，后续学习不再使用。';await load();}
      catch(failure){error='删除失败：'+failure.message;render();}
    }
  });
  return {render,load,start,getModel:()=>model};
}
