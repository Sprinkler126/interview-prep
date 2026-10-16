(function () {
  'use strict';
  // 教学伪代码、命令输出和ASCII图也保留原文本，只为词法单元着色。
  hljs.registerLanguage('pseudocode',()=>({
    name:'Pseudocode',
    keywords:{keyword:'if else for while return break continue repeat until then do end function procedure true false null nil undefined and or not in down to foreach swap floor ceil max min 输入 输出 如果 否则 循环 返回 重复 直到 初始化 遍历 若 则 创建 读取 写入 提交 回滚 加锁 解锁 入队 出队 入栈 出栈 等待 释放 申请 选择 匹配 不存在 报错'},
    contains:[
      hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.HASH_COMMENT_MODE,
      hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,
      {scope:'keyword',begin:/如果|否则|遍历|返回|初始化|重复|直到|输入|输出|创建|读取|写入|提交|回滚|加锁|解锁|入队|出队|入栈|出栈|等待|释放|申请|不存在|报错/},
      {scope:'number',begin:/\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/},
      {scope:'operator',begin:/[←→⇄≤≥≠∞ΣΘΩ]|[-+*/%=!<>|&^]+/},
      {scope:'title.function',begin:/\b[A-Za-z_]\w*(?=\s*\()/},
      {scope:'punctuation',begin:/[{}[\]();,:]/}
    ]
  }));
  const lastText=new WeakMap();
  function languageFor(code,text) {
    const explicit=code.className.match(/\blanguage-([\w-]+)/)?.[1]||code.dataset.language;
    if(explicit&&hljs.getLanguage(explicit))return explicit;
    if(/(?:^|\n)\s*(?:SELECT\s|INSERT\s+INTO|UPDATE\s+\w+\s+SET|CREATE\s+(?:TABLE|INDEX)|EXPLAIN\s|BEGIN;|COMMIT;)/i.test(text))return 'sql';
    if(/(?:^|\n)\s*(?:location\s|upstream\s|proxy_pass\s|worker_processes\s)/.test(text))return 'nginx';
    if(/(?:^|\n)\s*(?:FROM\s+\S+|ENTRYPOINT\s|CMD\s*\[|COPY\s+\S+)/.test(text))return 'dockerfile';
    if(/(?:^|\n)\s*<\/?[A-Za-z][\w:.-]*(?:\s[^>]*|\s*)>/.test(text))return 'xml';
    if(/(?:^|\n)\s*[\w.-]+\s*:\s*(?:$|\S)/.test(text)&&!/[{};]/.test(text))return 'yaml';
    if(/(?:^|\n)\s*(?:[\w.-]+\s*=|\[[\w.-]+\]\s*$)/.test(text)&&!/[{};]/.test(text))return 'ini';
    if(/(?:^|\n)\s*(?:def\s+\w+\(|from\s+\w+\s+import|async\s+def\s)/.test(text))return 'python';
    if(/(?:^|\n)\s*(?:func\s|package\s+main\b)/.test(text))return 'go';
    if(/(?:^|\n)\s*(?:const\s|let\s|async\s+function\s)|=>/.test(text))return 'javascript';
    if(/\b(?:public|private|protected)\s|@(?:Override|Bean|Configuration|Transactional)\b|\b(?:void|boolean|String)\s+\w+/.test(text))return 'java';
    if(/(?:^|\n)\s*(?:\$\s|#!.*(?:bash|sh)|(?:sudo|kubectl|docker|git|curl|redis-cli|systemctl|chmod|grep|awk|export)\s)/.test(text))return 'bash';
    if(/(?:伪代码|for\s+\w+\s*=.*\.\.|\bdown to\b|如果|否则|遍历|返回|初始化|报错|入队|出队)/.test(text))return 'pseudocode';
    const guess=hljs.highlightAuto(text,['java','javascript','python','go','sql','bash','yaml','ini','json','xml','nginx','dockerfile','c','cpp']);
    return guess.relevance>=3?guess.language:'pseudocode';
  }
  function highlight(block) {
    const isPre=block.tagName==='PRE';
    let code=isPre?block.querySelector(':scope > code'):block;
    if(!code) {
      const text=block.textContent;code=document.createElement('code');code.textContent=text;block.replaceChildren(code);
    }
    const text=code.textContent;
    if(lastText.get(code)===text)return;
    const language=languageFor(code,text);
    const result=hljs.highlight(text,{language,ignoreIllegals:true});
    lastText.set(code,text);
    code.innerHTML=result.value;code.classList.add('hljs');code.dataset.highlightLanguage=language;
    block.classList.add('syntax-highlighted');
  }
  document.querySelectorAll('pre,div.code').forEach(highlight);
  // 只处理发生变化的代码块，避免每次播放动画重新扫描整页。
  new MutationObserver(records=> {
    const blocks=new Set();
    for(const record of records) {
      const target=record.target.nodeType===Node.ELEMENT_NODE?record.target:record.target.parentElement;
      const parent=target?.closest('pre,div.code');if(parent)blocks.add(parent);
      for(const node of record.addedNodes) {
        if(node.nodeType!==Node.ELEMENT_NODE)continue;
        if(node.matches('pre,div.code'))blocks.add(node);
        node.querySelectorAll('pre,div.code').forEach(block=>blocks.add(block));
      }
    }
    blocks.forEach(block=>{if(block.isConnected)highlight(block);});
  }).observe(document.body,{childList:true,characterData:true,subtree:true});
})();
