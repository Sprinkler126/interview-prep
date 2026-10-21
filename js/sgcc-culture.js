(function () {
  'use strict';
  const maps=[...document.querySelectorAll('.culture-map')],points=[...document.querySelectorAll('.culture-point')];
  const search=document.getElementById('culture-search'),status=document.getElementById('culture-results');
  const recall=document.getElementById('culture-recall');let recalling=false;
  function filter() {
    const value=search.value.trim().toLowerCase();let visible=0;
    points.forEach(point=> {
      point.hidden=!!value&&!point.textContent.toLowerCase().includes(value);
      if(!point.hidden)visible++;
    });
    maps.forEach(map=>{map.hidden=![...map.querySelectorAll('.culture-point')].some(p=>!p.hidden);if(value&&!map.hidden)map.open=true;});
    status.textContent=`显示 ${visible} / ${points.length} 个去重知识点${value?'；已展开匹配分支':''}。`;
  }
  search.addEventListener('input',filter);
  document.getElementById('culture-clear').addEventListener('click',()=>{search.value='';filter();search.focus();});
  document.getElementById('culture-expand').addEventListener('click',()=>maps.forEach(map=>{if(!map.hidden)map.open=true;}));
  document.getElementById('culture-collapse').addEventListener('click',()=>maps.forEach(map=>{map.open=false;}));
  points.forEach(point=> {
    const content=point.querySelector('.point-content'),button=document.createElement('button');
    button.type='button';button.className='revealer';button.textContent='显示本知识点';button.hidden=true;
    button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',content.id);
    button.addEventListener('click',()=>{content.hidden=!content.hidden;button.textContent=content.hidden?'显示本知识点':'收起本知识点';button.setAttribute('aria-expanded',String(!content.hidden));});
    point.querySelector('h3').after(button);
  });
  recall.addEventListener('click',()=> {
    recalling=!recalling;recall.setAttribute('aria-pressed',String(recalling));recall.textContent=recalling?'退出背诵模式':'背诵模式：隐藏答案';
    points.forEach(point=>{const content=point.querySelector('.point-content'),button=point.querySelector('.revealer');content.hidden=recalling;button.hidden=!recalling;button.textContent='显示本知识点';button.setAttribute('aria-expanded',String(!recalling));});
  });
  function revealHash() {const target=document.getElementById(location.hash.slice(1));if(!target)return;const map=target.closest('.culture-map');if(map){if(map.hidden||target.hidden){search.value='';filter();}map.open=true;requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));}}
  window.addEventListener('hashchange',revealHash);filter();revealHash();
  document.querySelectorAll('.culture-quiz').forEach(quiz=> {
    const feedback=quiz.querySelector('.quiz-feedback'),details=quiz.querySelector('details');
    quiz.querySelector('button').addEventListener('click',()=>{const chosen=quiz.querySelector('input:checked');if(!chosen){feedback.textContent='请先选择一个选项。';return;}feedback.textContent=chosen.value===quiz.dataset.answer?'回答正确。':'回答有误，请核对对应导图。';details.open=true;});
    quiz.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{feedback.textContent='';details.open=false;}));
  });
})();
