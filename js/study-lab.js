(function () {
  'use strict';
  function el(tag, className, text) {
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  }
  document.querySelectorAll('.study-question').forEach((host,index)=> {
    const list=host.querySelector('ol'),answer=host.querySelector('details');
    const correct=Number(host.dataset.answer);
    if(!list||!answer||list.children.length!==4||!Number.isInteger(correct)||correct<0||correct>3) {
      host.append(el('p','study-failure','练习无法加载：缺少四个选项或有效答案。'));return;
    }
    const options=el('fieldset','study-options'),legend=el('legend','','请选择一个选项');options.append(legend);
    [...list.children].forEach((item,i)=> {
      const label=el('label','study-option'),input=el('input');input.type='radio';input.name=`study-question-${index}`;input.value=String(i);
      const text=item.textContent.trim();
      label.append(input,el('span','',/^[A-D][.、．：:]/.test(text)?text:`${String.fromCharCode(65+i)}. ${text}`));options.append(label);
    });
    const controls=el('div','study-controls'),check=el('button','','检查答案'),reset=el('button','','重做本题'),feedback=el('p','study-feedback');
    feedback.setAttribute('role','status');check.type=reset.type='button';controls.append(check,reset);
    list.hidden=true;host.insertBefore(options,answer);host.insertBefore(controls,answer);host.insertBefore(feedback,answer);
    function clear() {feedback.textContent='';answer.open=false;}
    options.addEventListener('change',clear);
    check.addEventListener('click',()=> {
      const selected=options.querySelector('input:checked');
      if(!selected){feedback.textContent='请先选择一个选项。';return;}
      feedback.textContent=Number(selected.value)===correct?'回答正确，请核对推导。':'回答有误，请查看解析后再试。';answer.open=true;
    });
    reset.addEventListener('click',()=>{options.querySelectorAll('input').forEach(input=>{input.checked=false;});clear();});
  });
  document.querySelectorAll('.study-animation').forEach((host,index)=> {
    let data;
    try {
      const source=host.querySelector('.study-animation-data');
      if(!source)throw new Error('缺少动画数据');
      data=JSON.parse(source.textContent);
      if(!Array.isArray(data.nodes)||data.nodes.length<2||data.nodes.length>5||data.nodes.some(n=>typeof n!=='string'))throw new Error('节点数据不正确');
      if(!Array.isArray(data.frames)||data.frames.length<2)throw new Error('动画步骤不足');
      for(const f of data.frames) {
        if(!Number.isInteger(f.active)||f.active<0||f.active>=data.nodes.length||typeof f.title!=='string'||typeof f.detail!=='string'||!Array.isArray(f.state)||f.state.length!==data.nodes.length||f.state.some(s=>typeof s!=='string'))throw new Error('动画状态不完整');
      }
    } catch(error) {
      host.append(el('p','study-failure',`动画无法加载：${error.message}`));
      return;
    }
    let position=0,timer=null;
    const controls=el('div','study-controls'),stage=el('div','study-stage');
    stage.style.setProperty('--study-nodes',data.nodes.length);
    const nodes=data.nodes.map(name=> {
      const node=el('div','study-node'),state=el('span');
      node.append(el('strong','',name),state);stage.append(node);return {node,state};
    });
    const caption=el('div','study-caption'),title=el('strong'),detail=el('p');
    caption.setAttribute('aria-live','polite');caption.setAttribute('aria-atomic','true');caption.append(title,detail);
    function button(text,action) {const b=el('button','',text);b.type='button';b.addEventListener('click',action);controls.append(b);return b;}
    const prev=button('← 上一步',()=>{pause();position--;render();});
    const play=button('播放动画',()=>{if(timer){pause();return;}if(position===data.frames.length-1)position=0;render();schedule();});
    const next=button('下一步 →',()=>{pause();position++;render();});
    button('重置',()=>{pause();position=0;render();});
    const speedLabel=el('label','', '速度 '),speed=el('select');
    speed.setAttribute('aria-label','动画速度');
    [['1800','慢'],['1100','正常'],['500','快']].forEach(([value,text])=> {const option=el('option','',text);option.value=value;option.selected=value==='1100';speed.append(option);});
    speedLabel.append(speed);controls.append(speedLabel);
    const sliderLabel=el('label','', '步骤'),slider=el('input'),counter=el('span','study-counter');
    slider.id=`study-progress-${index}`;slider.type='range';slider.min='0';slider.max=String(data.frames.length-1);slider.step='1';slider.value='0';sliderLabel.htmlFor=slider.id;
    controls.append(sliderLabel,slider,counter);
    slider.addEventListener('input',()=>{pause();position=Number(slider.value);render();});
    speed.addEventListener('change',()=>{if(timer){clearTimeout(timer);schedule();}});
    function pause() {if(timer)clearTimeout(timer);timer=null;play.textContent='播放动画';play.setAttribute('aria-pressed','false');}
    function schedule() {
      play.textContent='暂停动画';play.setAttribute('aria-pressed','true');
      timer=setTimeout(()=>{timer=null;position++;render();if(position<data.frames.length-1)schedule();else pause();},Number(speed.value));
    }
    function render() {
      const frame=data.frames[position];
      nodes.forEach(({node,state},i)=>{node.classList.toggle('is-active',i===frame.active);state.textContent=frame.state[i];});
      title.textContent=frame.title;detail.textContent=frame.detail;
      counter.textContent=`${position+1} / ${data.frames.length}`;slider.value=String(position);slider.setAttribute('aria-valuetext',`步骤 ${position+1}：${frame.title}`);
      prev.disabled=position===0;next.disabled=position===data.frames.length-1;
    }
    document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
    host.append(el('p','study-hint','固定情景的状态动画：播放观察变化，也可暂停、拖动步骤或回退。节点位置表示流程角色，箭头用于阅读顺序。'),controls,stage,caption);
    pause();render();
  });
})();
