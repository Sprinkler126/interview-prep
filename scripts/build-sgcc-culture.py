# Rebuild the static page from the canonical deduplicated knowledge data.
import json
from pathlib import Path
from html import escape as e
ROOT=Path(__file__).resolve().parents[1]
D=json.loads((ROOT/'data/sgcc-culture-2027.json').read_text(encoding='utf-8'))
idx={q['id']:q for q in D['questionIndex']}
nav=''.join(f'<a href="#map-{g["id"]}">{e(g["title"])}</a>' for g in D['groups'])
overview=''.join(f'<a href="#map-{g["id"]}" style="--branch:{g["color"]}">{e(g["title"])}<small>{len(g["points"])}个归并知识点</small></a>' for g in D['groups'])
maps=''
for gi,g in enumerate(D['groups'],1):
 points=''
 for p in g['points']:
  refs=[]
  for n in p['refs']:
   q=idx[n];page=str(q['page']) if q['endPage']==q['page'] else f'{q["page"]}–{q["endPage"]}'
   refs.append(f'<li data-source-id="{n}">第{n}题 · {e(q["kind"])} · PDF第{page}页</li>')
  points+=f'''<article class="culture-point" id="point-{p['id']}" data-point-id="{p['id']}" data-refs="{','.join(map(str,p['refs']))}">
<h3>{e(p['title'])}</h3><div class="point-content" id="content-{p['id']}"><p class="fact">{e(p['fact'])}</p><p class="meaning"><strong>怎么理解：</strong>{e(p['meaning'])}</p><p class="pitfall"><strong>易混点：</strong>{e(p['trap'])}</p></div>
<details><summary>原题索引 · 合并{len(p['refs'])}题</summary><ul>{''.join(refs)}</ul></details></article>\n'''
 maps+=f'''<details class="culture-map" id="map-{g['id']}" style="--branch:{g['color']}" open><summary>{gi:02d} {e(g['title'])}<span>{len(g['points'])}个知识点 · 点击折叠</span></summary><p class="culture-map-intro">{e(g['description'])}</p><div class="culture-tree">{points}</div></details>\n'''
questions=[('企业宗旨应对应哪一句？',['人民电业为人民','努力超越、追求卓越','以人为本、守正创新','为美好生活充电，为美丽中国赋能'],0,'point-purpose','宗旨回答为谁服务；使命回答提供什么价值。'),('“打头阵、增动能”主要对应哪种体现？',['争先','率先','领先','当先'],1,'point-first','率先对应主动精神与奋进姿态。'),('法治精神是哪组？',['基业长青、法治先行','你用电，我用心','制度立本、契约立信、合规立身','办事依法、遇事找法'],2,'point-legal-spirit','理念、精神、思维要分别记忆。'),('城区抢修“到场”和“到场后恢复”平均时间一般为？',['90分钟、4小时','45分钟、4小时','90分钟、3小时','45分钟、3小时'],3,'point-repair','先辨城区/农村，再辨到场/到场后恢复；保留平均时间一般为的限定。'),('2035年企业文化建设目标应抓哪个词？',['企业文化体系、建成','企业文化生态、巩固提升','仅提高收费标准','厂网分开'],1,'point-goals','2030记体系与建成，2035记生态与巩固提升。'),('题库的“22交21直、43项”采用哪个时点？',['任意实时日期','2027年全年','2026年8月','2009年'],2,'point-uhv-count','这是题库明确给出的统计时点，不能删掉日期作为实时值。')]
quiz=''
for i,(title,opts,answer,anchor,explain) in enumerate(questions,1):
 options=''.join(f'<label><input type="radio" name="culture-q{i}" value="{j}"><span>{chr(65+j)}. {e(v)}</span></label>' for j,v in enumerate(opts))
 quiz+=f'<article class="culture-quiz" data-answer="{answer}"><fieldset><legend>{i}. {e(title)}</legend>{options}</fieldset><button type="button">检查答案</button><p class="quiz-feedback" role="status"></p><details><summary>答案与定位</summary><p>答案：{chr(65+answer)}。{e(explain)} <a href="#{anchor}">回到对应导图节点 →</a></p></details></article>\n'
text=f'''<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>国网企业文化2027 · 去重知识点与思维导图 - 面试知识复习库</title><meta name="description" content="依据用户提供的2027版公共与行业知识题库，将企业文化93题去重合并为43个知识点，附8张分支导图、原题页码、易混点、搜索和背诵模式。"><link rel="stylesheet" href="../css/style.css"><link rel="stylesheet" href="../css/sgcc-culture.css"><script src="../js/sgcc-culture.js" defer></script></head>
<body class="culture-page"><nav class="nav"><div class="nav-inner"><a class="nav-brand" href="../index.html">📚 面试知识复习库</a><a class="back" href="sgcc-exam.html">← 国网专业课</a></div></nav>
<main class="container"><header class="culture-hero"><p>国家电网 · 公共与行业知识</p><h1>2027版企业文化 · 去重知识导图</h1><p class="subtitle">先看关系，再记原词，最后辨认题干中的对象与时间。</p><div class="culture-meta"><span>93道原题 → 43个知识点</span><span>1张总览＋8张分支导图</span><span>3类题型统一合并</span><span>整理日期 2026-10-21</span></div><p>依据你提供的2027版PDF中“企业文化”部分整理：单选48–86、多选395–424、判断643–666。每个知识点只保留一份正文，跨题型的重复设问与反向判断归入同一节点；原题号、页码保留，便于回查。</p><p class="culture-source">本页为题库归纳，采用原题库答案口径；不将题库中的统计时点改写成实时数据。<a href="#sources">查看来源与去重说明</a></p></header>
<nav class="exam-nav culture-toolbar" aria-label="文化专项目录">{nav}<a href="#practice">自测</a><a href="#sources">来源</a></nav>
<h2 id="overview">第一部分 · 企业文化知识总图</h2><div class="culture-overview" aria-label="企业文化总览思维导图"><div class="culture-root">国家电网<br>企业文化<small>2027版题库<br>8条记忆主线</small></div><div class="culture-branches">{overview}</div></div>
<div class="culture-toolbar" aria-label="导图控制"><label for="culture-search">查知识点</label><input id="culture-search" type="search" placeholder="如：使命、45分钟、2035、646" autocomplete="off"><button id="culture-clear" type="button">清空搜索</button><button id="culture-expand" type="button">全部展开</button><button id="culture-collapse" type="button">全部折叠</button><button id="culture-recall" type="button" aria-pressed="false">背诵模式：隐藏答案</button></div><p id="culture-results" role="status">显示43个去重知识点。</p><p class="culture-source">点击分支标题折叠或展开；背诵模式保留节点题名，逐个显示内容。搜索同时检索正文、易混点和原题号。</p>
{maps}
<h2 id="scenarios">第二部分 · 遇到题目怎样定位</h2><div class="culture-overview" aria-label="题干定位导图"><div class="culture-root">先辨题干<small>不是见到正面词语就选</small></div><div class="culture-branches"><a href="#map-values" style="--branch:#34d399">问“宗旨、使命、精神、理念”<small>沿标签回到四项价值理念，检查是否错配。</small></a><a href="#map-identity" style="--branch:#38bdf8">问“使命必达、打头阵、树标杆”<small>沿描述辨争先、率先、领先。</small></a><a href="#point-repair" style="--branch:#8cddda">问“时间是多少”<small>看城区/农村、到场/恢复，以及平均值限定。</small></a><a href="#point-uhv-count" style="--branch:#a5b4fc">问“数字、年份、工程”<small>带上日期、单位、国内/海外和交流/直流类别。</small></a></div></div>
<h2 id="practice">第三部分 · 自编辨析练习</h2><p>以下6题用于检查标签与限定词，均为本站自编；相同知识点的正文仍统一链接到上方节点。</p>{quiz}
<h2 id="sources">来源、范围与去重索引</h2><article class="card"><h3>来源与版本</h3><p>来源：{e(D['source']['file'])}。共159页、832题；本页处理其中第二部分“企业文化”93题，原PDF其余板块为形势政策、公司战略、新型电力系统、品牌建设，未计入本页93题。</p><p>回查页码：单选第10–18页、多选第82–88页、判断第131–134页；个别题跨页，每个节点索引列出实际起止页。2027为所提供文件的版本标识；归纳日期为2026-10-21。</p><p>所有原题都映射到一个主节点，不把选项中的干扰表述直接当作事实；同一概念的问法、情景题和反向判断合并，定义不同的相近词保留独立节点。没有重复复制原题全文，原PDF保持不变。</p><details><summary>查看93题 → 43节点的完整去重清单</summary><ul>{''.join(f'<li><a href="#point-{q["point"]}">第{q["id"]}题 → {e(next(p["title"] for g in D["groups"] for p in g["points"] if p["id"]==q["point"]))}</a></li>' for q in D['questionIndex'])}</ul></details><p><a href="../data/sgcc-culture-2027.json">下载知识点与原题映射JSON</a></p><p class="culture-source">源文件SHA-256：<span style="overflow-wrap:anywhere">{D['source']['sha256']}</span></p></article><p><a href="../index.html">← 返回首页</a> · <a href="sgcc-exam.html">计算机类专业课目录</a></p></main></body></html>'''
(ROOT/'pages/sgcc-culture-2027.html').write_text(text,encoding='utf-8')
