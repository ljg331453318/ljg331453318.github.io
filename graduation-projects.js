const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const linkify = value => escapeHtml(value).replace(/https:\/\/[^\s]+/g, url => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`);

function citedNumbers(text) {
  const numbers = new Set();
  for (const match of text.matchAll(/\[(\d+)(?:\s*[-–]\s*(\d+))?\]/g)) {
    const start = Number(match[1]);
    const end = Number(match[2] || match[1]);
    for (let n = start; n <= end; n++) numbers.add(n);
  }
  return numbers;
}

function renderHub(topics, references) {
  const list = document.querySelector('#topic-list');
  list.innerHTML = topics.map(topic => `<a class="topic-card" href="graduation-topic.html?id=${topic.id}&v=20261113-motion"><span class="topic-number">${String(topic.id).padStart(2,'0')}</span><h3>${escapeHtml(topic.title)}</h3><p>${escapeHtml(topic.sections['设计范围'])}</p><span class="card-arrow">查看设计要求 →</span></a>`).join('');
  document.querySelector('#reference-list').innerHTML = references.map(value => `<p>${linkify(value)}</p>`).join('');
}

function renderDetail(topics, references) {
  const target = document.querySelector('#topic-detail');
  const id = Number(new URLSearchParams(location.search).get('id'));
  const topic = topics.find(item => item.id === id);
  if (!topic) { target.innerHTML = '<p>未找到该题目。<a href="graduation-projects.html?v=20261113-motion">返回目录</a></p>'; return; }
  const sections = topic.sections;
  document.title = topic.title + ' | 本科毕业设计';
  const number = String(id).padStart(2, '0');
  const tasks = [1,2,3].map(index => `<li><span>${index}</span><p>${escapeHtml(sections['设计任务'+index])}</p></li>`).join('');
  const cited = citedNumbers(sections['研究依据与适用性']);
  const relevant = references.filter(value => cited.has(Number(value.match(/^\[(\d+)\]/)?.[1])));
  target.innerHTML = `
    <div class="breadcrumb"><a href="graduation-projects.html?v=20261113-motion">十个选题</a><span> / ${number}</span></div>
    <div class="eyebrow">本科毕业设计 · 题目 ${number}</div>
    <h1>${escapeHtml(topic.title)}</h1>
    <p class="lead">${escapeHtml(sections['研究依据与适用性'])}</p>
    <div class="detail-actions"><a class="action" href="graduation-demos/${number}.html?v=20261113-motion">查看动态界面演示 →</a><a class="quiet" href="graduation-projects.html?v=20261113-motion">返回选题目录</a></div>
    <div class="detail-grid"><div>
      <section class="content-block"><h2>设计范围</h2><p>${escapeHtml(sections['设计范围'])}</p></section>
      <section class="content-block"><h2>设计任务</h2><ol class="task-list">${tasks}</ol></section>
      <section class="content-block"><h2>验证与评价</h2><p>${escapeHtml(sections['验证与评价'])}</p></section>
    </div><aside>
      <section class="side-block"><h2>最终成果</h2><p>${escapeHtml(sections['最终成果'])}</p></section>
      <section class="side-block"><h2>学生条件</h2><p>${escapeHtml(sections['学生条件'])}</p></section>
    </aside></div>
    <section class="references detail-references"><h2>参考文献与技术资料</h2>${relevant.map(value => `<p>${linkify(value)}</p>`).join('')}</section>`;
}

Promise.all([
  fetch('grad-topics.json').then(response => { if (!response.ok) throw Error('选题资料读取失败'); return response.json(); }),
  fetch('grad-references.json').then(response => { if (!response.ok) throw Error('参考文献读取失败'); return response.json(); })
]).then(([topics, references]) => {
  if (document.querySelector('#topic-list')) renderHub(topics, references);
  if (document.querySelector('#topic-detail')) renderDetail(topics, references);
}).catch(error => {
  const target = document.querySelector('#topic-list') || document.querySelector('#topic-detail');
  if (target) target.textContent = error.message;
});
