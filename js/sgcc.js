(function () {
  'use strict';
  document.querySelectorAll('[data-trace]').forEach(host => {
    const steps=[...host.querySelectorAll('li')].map(li=>li.textContent.trim());
    if(!steps.length)return;
    const controls=document.createElement('div');controls.className='exam-controls';
    const view=document.createElement('div');view.className='trace-view';view.setAttribute('aria-live','polite');view.setAttribute('aria-atomic','true');
    const counter=document.createElement('span');let position=0;
    function button(text,action) {const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',action);controls.append(b);return b;}
    const prev=button('← 上一步',()=>{position--;render();});
    const next=button('下一步 →',()=>{position++;render();});
    button('重置',()=>{position=0;render();});controls.append(counter);
    host.querySelector('ol').hidden=true;host.append(controls,view);
    function render() {prev.disabled=position===0;next.disabled=position===steps.length-1;counter.textContent=`步骤 ${position+1} / ${steps.length}`;view.textContent=steps[position];}
    render();
  });
  const quiz=document.querySelector('[data-quiz]');
  if(quiz) {
    const questions=[...quiz.querySelectorAll('[data-question]')],score=quiz.querySelector('[data-score]');
    function updateScore() {const attempted=questions.filter(q=>q.dataset.checked==='true');const correct=attempted.filter(q=>q.dataset.correct==='true');score.textContent=`已检查 ${attempted.length} / ${questions.length} 题，答对 ${correct.length} 题。可修改答案后再次检查。`;}
    questions.forEach(q=> {
      const feedback=q.querySelector('.exam-feedback');
      q.querySelector('[data-check]').addEventListener('click',()=> {
        const chosen=q.querySelector('input:checked');
        if(!chosen){feedback.textContent='请先选择一个选项。';return;}
        const correct=chosen.value===q.dataset.answer;q.dataset.checked='true';q.dataset.correct=String(correct);
        feedback.textContent=correct?'回答正确。':'回答有误，请看解析后重新判断。';q.querySelector('details').open=true;updateScore();
      });
      q.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{delete q.dataset.checked;delete q.dataset.correct;feedback.textContent='';q.querySelector('details').open=false;updateScore();}));
    });
    quiz.querySelector('[data-reset-quiz]').addEventListener('click',()=>{quiz.querySelectorAll('input').forEach(i=>{i.checked=false;});questions.forEach(q=>{delete q.dataset.checked;delete q.dataset.correct;q.querySelector('.exam-feedback').textContent='';q.querySelector('details').open=false;});updateScore();});
    updateScore();
  }
  const queue=document.querySelector('[data-ring-queue]');
  if(queue) {
    const capacity=5,items=Array(capacity).fill(null);let front=0,rear=0;
    const view=queue.querySelector('[data-queue-view]'),message=queue.querySelector('[data-queue-message]'),input=queue.querySelector('input');
    function render() {view.textContent=items.map((v,i)=>`槽 ${i}: ${v===null?'·':v}${i===front?' ← front':''}${i===rear?' ← rear':''}`).join('\n')+`\n元素数：(rear-front+5)%5 = ${(rear-front+capacity)%capacity}\n空：front == rear；满：(rear+1)%5 == front`;}
    queue.querySelector('[data-enqueue]').addEventListener('click',()=> {
      if(!/^-?\d{1,3}$/.test(input.value)){message.textContent='请输入 -999 至 999 的整数。';return;}
      if((rear+1)%capacity===front){message.textContent='队满：保留一个空槽，只能容纳 4 个元素。';return;}
      items[rear]=Number(input.value);rear=(rear+1)%capacity;message.textContent='入队完成：写入 rear 原位置，再将 rear 向前移动一格。';render();
    });
    queue.querySelector('[data-dequeue]').addEventListener('click',()=>{if(front===rear){message.textContent='队空，无法出队。';return;}const value=items[front];items[front]=null;front=(front+1)%capacity;message.textContent=`出队 ${value}，front 向前移动一格。`;render();});
    queue.querySelector('[data-reset-queue]').addEventListener('click',()=>{items.fill(null);front=rear=0;message.textContent='已重置为空队列。';render();});render();
  }
})();
