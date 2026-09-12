const buttons=[...document.querySelectorAll('.course-lang')];
function setCourseLanguage(lang){
  document.documentElement.lang=lang==='en'?'en':'zh-CN';
  document.title=lang==='en'?'Intelligent Weapon Systems | Jiageng Liu':'智能武器系统 | 刘佳庚';
  document.querySelectorAll('[data-zh][data-en]').forEach(el=>{el.innerHTML=el.dataset[lang]});
  buttons.forEach(btn=>btn.classList.toggle('active',btn.dataset.lang===lang));
  localStorage.setItem('course-language',lang);
}
buttons.forEach(btn=>btn.addEventListener('click',()=>setCourseLanguage(btn.dataset.lang)));
setCourseLanguage(localStorage.getItem('course-language')||localStorage.getItem('site-language')||'zh');
