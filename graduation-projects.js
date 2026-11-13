const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const topicId = Number(new URLSearchParams(location.search).get('id'));
fetch('grad-topics.json').then(response => {if(!response.ok) throw Error('选题资料读取失败'); return response.json()}).then(topics => {
  const list = document.querySelector('#topic-list');
  if (list) {
    list.innerHTML = topics.map(topic => `<a class="topic-card" href="graduation-topic.html?id=${topic.id}"><span class="topic-number">${String(topic.id).padStart(2,'0')}</span><h3>${escapeHtml(topic.title)}</h3><p>${escapeHtml(topic.sections['设计范围'])}</p><span class="card-arrow">查看设计要求 →</span></a>`).join('');
    fetch('grad-references.json').then(response => response.json()).then(references => {document.querySelector('#reference-list').innerHTML=references.map(value => `<p>${escapeHtml(value).replace(/https:\/\/[^\s]+/g, url => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`)}</p>`).join('')});
  }
  const detail = document.querySelector('#topic-detail');
  if (!detail) return;
  const topic = topics.find(item => item.id === topicId);
  if (!topic) { detail.innerHTML = '<p>未找到该题目。<a href="graduation-projects.html">返回目录</a></p>'; return; }
  document.title = topic.title + ' | 刘佳庚';
  const sections = topic.sections;
  const tasks = [1,2,3].map(index => `<li><span>${index}</span><p>${escapeHtml(sections['设计任务'+index])}</p></li>`).join('');
  detail.innerHTML = `<div class="breadcrumb"><a href="graduation-projects.html">十个选题</a><span> / ${String(topic.id).padStart(2,'0')}</span></div><div class="eyebrow">本科毕业设计 · 题目 ${String(topic.id).padStart(2,'0')}</div><h1>${escapeHtml(topic.title)}</h1><p class="lead">${escapeHtml(sections['研究依据与适用性'])}</p><div class="detail-actions"><a class="action" href="graduation-demo.html?id=${topic.id}">打开交互演示 →</a><a class="quiet" href="graduation-projects.html">返回选题目录</a></div><div class="detail-grid"><div><section class="content-block"><h2>设计范围</h2><p>${escapeHtml(sections['设计范围'])}</p></section><section class="content-block"><h2>设计任务</h2><ol class="task-list">${tasks}</ol></section><section class="content-block"><h2>验证与评价</h2><p>${escapeHtml(sections['验证与评价'])}</p></section></div><aside><section class="side-block"><h2>最终成果</h2><p>${escapeHtml(sections['最终成果'])}</p></section><section class="side-block"><h2>学生条件</h2><p>${escapeHtml(sections['学生条件'])}</p></section></aside></div>`;
}).catch(error => {const target=document.querySelector('#topic-list') || document.querySelector('#topic-detail'); if(target) target.textContent=error.message});
