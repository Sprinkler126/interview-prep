/* 每次记录独立快照，回退不会改变算法状态。 */
(function () {
  'use strict';
  const sorts = [
    ['bubble', '冒泡排序', '像把重的石头往右推：只比较挨着的两个数，左边大就交换。一趟结束，最大的数就到了最后。下一趟少看一个位置。',
`for end = n-1 down to 1:
  changed = false
  for j = 0 to end-1:
    if A[j] > A[j+1]: swap(A[j], A[j+1]); changed = true
  if not changed: break`, '相等时不交换，所以稳定；已经有序时一趟即可结束。'],
    ['selection', '选择排序', '像排队选最矮的人：从还没排好的数里找最小的，放到队伍最前面。再从剩下的人里选一次。',
`for i = 0 to n-2:
  min = i
  for j = i+1 to n-1:
    if A[j] < A[min]: min = j
  swap(A[i], A[min])`, '交换次数少，但即使有序仍要找最小值；远距离交换可能打乱相等元素的先后。'],
    ['insertion', '插入排序', '像整理手里的扑克牌：左边一直是排好的牌，拿起下一张，把比它大的牌往右挪，空出位置后插进去。',
`for i = 1 to n-1:
  key = A[i]; j = i-1
  while j >= 0 and A[j] > key:
    A[j+1] = A[j]; j = j-1
  A[j+1] = key`, '移动时手里还拿着 key，数组里暂时出现重复值是正常的。接近有序时很快。'],
    ['shell', '希尔排序', '先隔着几个位置整理牌，让离正确位置很远的数快速靠近目标；再缩小间隔，最后用间隔 1 做插入排序。',
`gap = floor(n/2)
while gap >= 1:
  for i = gap to n-1:
    key = A[i]; j = i
    while j >= gap and A[j-gap] > key:
      A[j] = A[j-gap]; j = j-gap
    A[j] = key
  gap = floor(gap/2)`, '这里使用折半间隔；复杂度取决于间隔序列，不能统一写成 O(n^1.3)。本实现最坏 O(n²)。'],
    ['quick', '快速排序', '选一个数当标尺，把不大于它的放左边，大于它的留右边，然后把标尺放在中间。左右两堆各自再做同样的事。',
`quick(lo, hi):
  if lo >= hi: return
  pivot = A[hi]; i = lo
  for j = lo to hi-1:
    if A[j] <= pivot: swap(A[i], A[j]); i++
  swap(A[i], A[hi])
  quick(lo, i-1); quick(i+1, hi)`, '演示固定选末尾为基准，便于跟踪。随机选基准能降低退化概率，但不能保证没有最坏情况；递归栈最坏 O(n)。'],
    ['merge', '归并排序', '先把一叠牌不断拆成两半，拆到只剩一张。合并时比较两叠牌的第一张，把小的拿走，直到拼成一叠有序牌。',
`mergeSort(lo, hi):
  if lo >= hi: return
  mid = floor((lo+hi)/2)
  mergeSort(lo, mid); mergeSort(mid+1, hi)
  L = copy A[lo..mid]; R = copy A[mid+1..hi]
  从 L、R 头部选择较小值，依次写回 A[lo..hi]
  相等时先取 L；一边取完后复制另一边剩余值`, '合并的两个临时数组保存原值，写回时主数组可能暂时出现重复值；取完后恢复完整排列。'],
    ['heap', '堆排序', '把数摆成一棵“家长比孩子大”的树，最大值就在树顶。把树顶换到末尾，再整理剩下的树，重复取出最大值。',
`sift(i, size):
  while i 有孩子:
    child = 值最大的孩子
    if A[i] >= A[child]: break
    swap(A[i], A[child]); i = child
for i = floor(n/2)-1 down to 0: sift(i, n)
for end = n-1 down to 1:
  swap(A[0], A[end]); sift(0, end)`, '数组下标 i 的左右孩子是 2i+1、2i+2；只有末尾取出的部分完全有序，堆内部并不是有序数组。'],
    ['counting', '计数排序', '不用两两比大小，直接点名：0 出现几次，1 出现几次……数完后按从小到大的顺序安排位置。',
`count[0..max] = 0
for x in A: count[x]++
for v = 1 to max: count[v] += count[v-1]
for i = n-1 down to 0:
  output[count[A[i]]-1] = A[i]; count[A[i]]--
A = output`, '演示限定非负整数，使用累计计数与逆序放置来保持稳定；该稳定实现空间是 O(n+k)。'],
    ['radix', '基数排序', '像按编号分信：先看个位分组，再看十位、百位。每轮分组都保持原顺序，后面看高位时就保留了低位的排序成果。',
`for place = 1, 10, 100, ... while floor(max(A)/place) > 0:
  buckets[0..9] = 空列表
  for x in A: buckets[floor(x/place) mod 10].append(x)
  A = 按桶号 0..9 拼接 buckets`, '这里只演示非负整数的低位优先排序。每一轮必须稳定，不能把同一桶中的元素随意倒过来。'],
    ['bucket', '桶排序', '先按数值范围分几间屋子：小数进前面的屋子，大数进后面的屋子。每间屋子内部排好，再依次接起来。',
`buckets[0..k-1] = 空列表
width = ceil((max(A)+1)/k)
for x in A: buckets[floor(x/width)].append(x)
for bucket in buckets: 对 bucket 做稳定插入排序
A = 按桶号拼接 buckets`, '演示用 3 个等宽桶和稳定插入排序。均匀分布时效率高；全挤进一个桶时可能 O(n²)。']
  ];

  function sortTrace(kind, input) {
    const a = input.slice(), frames = [];
    const save = (text, active = [], extra = '') => frames.push({ values:a.slice(), text, active, extra });
    const swap = (i,j) => { [a[i],a[j]] = [a[j],a[i]]; };
    save('初始数组。亮色格子表示当前比较、移动或写入的位置。');
    if (kind === 'bubble') {
      for (let end=a.length-1;end>0;end--) {
        let changed=false;
        for(let j=0;j<end;j++) {
          save(`比较 ${a[j]} 和 ${a[j+1]}`, [j,j+1]);
          if(a[j]>a[j+1]) { swap(j,j+1);changed=true;save('左边更大，交换。',[j,j+1]); }
        }
        save(`本趟结束，下标 ${end} 已就位。`,[end]);
        if(!changed) {save('本趟没有交换，提前结束。');break;}
      }
    } else if(kind === 'selection') {
      for(let i=0;i<a.length-1;i++) {
        let min=i;
        for(let j=i+1;j<a.length;j++) {if(a[j]<a[min]) min=j;save(`寻找最小值：当前最小是 ${a[min]}`,[min,j]);}
        swap(i,min);save(`将最小值 ${a[i]} 放到下标 ${i}。`,[i,min]);
      }
    } else if(kind === 'insertion' || kind === 'shell') {
      for(let gap=kind==='shell'?Math.floor(a.length/2):1;gap>=1;gap=kind==='shell'?Math.floor(gap/2):0) {
        save(`开始间隔 gap = ${gap} 的插入排序。`);
        for(let i=gap;i<a.length;i++) {
          const key=a[i];let j=i;
          save(`拿起 ${key}，寻找插入位置。`,[i],`手里拿着 key = ${key}`);
          while(j>=gap && a[j-gap]>key) {a[j]=a[j-gap];save(`将 ${a[j-gap]} 向右移动 ${gap} 格。`,[j-gap,j],`手里拿着 key = ${key}`);j-=gap;}
          a[j]=key;save(`把 ${key} 插入下标 ${j}。`,[j]);
        }
      }
    } else if(kind === 'quick') {
      function quick(lo,hi) {
        if(lo>=hi)return;
        const pivot=a[hi];let i=lo;
        save(`处理区间 [${lo}, ${hi}]，基准 = ${pivot}。`,[hi]);
        for(let j=lo;j<hi;j++) {
          save(`比较 ${a[j]} 与基准 ${pivot}。`,[j,hi]);
          if(a[j]<=pivot) {swap(i,j);save(`归入左侧，下一个左侧位置为 ${i+1}。`,[i,j]);i++;}
        }
        swap(i,hi);save(`基准 ${pivot} 就位，下标 ${i}。`,[i]);quick(lo,i-1);quick(i+1,hi);
      }
      quick(0,a.length-1);
    } else if(kind === 'merge') {
      function merge(lo,hi) {
        if(lo>=hi)return;
        const mid=Math.floor((lo+hi)/2);save(`拆分 [${lo}, ${hi}] 为 [${lo}, ${mid}] 和 [${mid+1}, ${hi}]。`);
        merge(lo,mid);merge(mid+1,hi);
        const left=a.slice(lo,mid+1),right=a.slice(mid+1,hi+1);let i=0,j=0;
        for(let k=lo;k<=hi;k++) {
          a[k]=j>=right.length || (i<left.length && left[i]<=right[j])?left[i++]:right[j++];
          save(`将 ${a[k]} 写回下标 ${k}。`,[k],`左侧待取：${left.slice(i).join(', ') || '空'}\n右侧待取：${right.slice(j).join(', ') || '空'}`);
        }
      }
      merge(0,a.length-1);
    } else if(kind === 'heap') {
      function sift(i,size) {
        while(2*i+1<size) {
          let child=2*i+1;if(child+1<size && a[child+1]>a[child])child++;
          save(`堆大小 ${size}：比较父节点 ${a[i]} 与较大孩子 ${a[child]}。`,[i,child]);
          if(a[i]>=a[child])break;
          swap(i,child);save('孩子更大，交换后继续向下调整。',[i,child]);i=child;
        }
      }
      for(let i=Math.floor(a.length/2)-1;i>=0;i--)sift(i,a.length);
      save('大顶堆建好，树顶是最大值。',[0]);
      for(let end=a.length-1;end>0;end--) {swap(0,end);save(`最大值放到下标 ${end}，剩余堆大小 ${end}。`,[0,end]);sift(0,end);}
    } else if(kind === 'counting') {
      const count=Array(Math.max(...a)+1).fill(0), output=Array(a.length).fill('·');
      const counts=()=>count.map((v,i)=>`${i}:${v}`).join('  ');
      a.forEach((v,i)=> {count[v]++;save(`统计：${v} 又出现一次。`,[i],`次数（数值:次数）：${counts()}`);});
      for(let i=1;i<count.length;i++)count[i]+=count[i-1];
      save('累计计数：每个值记录“不大于它的元素个数”。',[],counts());
      for(let i=a.length-1;i>=0;i--) {const p=--count[a[i]];output[p]=a[i];save(`从右向左取 ${a[i]}，放到输出下标 ${p}。`,[i],`输出：${output.join('  ')}`);}
      a.splice(0,a.length,...output);
    } else if(kind === 'radix') {
      for(let place=1;Math.floor(Math.max(...a)/place)>0;place*=10) {
        const buckets=Array.from({length:10},()=>[]);
        a.forEach((v,i)=> {const digit=Math.floor(v/place)%10;buckets[digit].push(v);save(`按 ${place} 位分组：${v} 进入桶 ${digit}。`,[i],buckets.map((b,k)=>`${k}: [${b.join(', ')}]`).join('\n'));});
        a.splice(0,a.length,...buckets.flat());save(`按桶号收集，${place} 位这一轮完成。`);
      }
    } else if(kind === 'bucket') {
      const buckets=[[],[],[]],width=Math.ceil((Math.max(...a)+1)/3);
      const state=()=>buckets.map((b,k)=>`桶 ${k}（${k*width}..${(k+1)*width-1}）：[${b.join(', ')}]`).join('\n');
      a.forEach((v,i)=>{const b=Math.floor(v/width);buckets[b].push(v);save(`${v} 进入桶 ${b}。`,[i],state());});
      buckets.forEach((b,k)=>{
        for(let i=1;i<b.length;i++){const key=b[i];let j=i-1;while(j>=0&&b[j]>key){b[j+1]=b[j];j--;}b[j+1]=key;save(`桶 ${k} 内插入 ${key}。`,[],state());}
        save(`桶 ${k} 内部排好。`,[],state());
      });
      a.splice(0,a.length,...buckets.flat());
    } else {throw new Error(`未知排序：${kind}`);}
    save('排序完成，数组已按升序排列。');return frames;
  }

  const structures = [
    ['array','数组','像一排有编号的储物柜，知道编号就能直接拿东西；中间插东西时，要让后面的东西挪位置。',
`insert(A, length, i, x):  // 要求容量足够，0 <= i <= length
  for j = length down to i+1: A[j] = A[j-1]
  A[i] = x; length++`, '按下标访问 O(1)，中间插入 O(n)；动态数组容量不足时还需要扩容复制。',
[['在下标 1 插入 9，先留一个空位。','下标  0  1  2  3\n数组 [2, 4, 6, ·]'],['把 6 移到下标 3。','[2, 4, 6, 6]'],['把 4 移到下标 2。','[2, 4, 4, 6]'],['下标 1 写入 9，长度加 1。','[2, 9, 4, 6]']]],
    ['linked','单向链表','像一串寻宝纸条，每张只告诉你下一张在哪。插入时改连线即可；找第几个节点却得从头走。',
`insertAfter(p, x):
  node = new Node(x)
  node.next = p.next
  p.next = node`, '已知前驱后插入 O(1)，找前驱可能 O(n)。先保存后面的连线，避免丢失后半段。',
[['在节点 2 后插入 9。','head → 2 → 4 → 6 → null\n新节点：9'],['新节点先指向原来的后继。','head → 2 → 4 → 6 → null\n             ↑\n         9 ──┘'],['节点 2 改为指向 9。','head → 2 → 9 → 4 → 6 → null']]],
    ['doubly','双向链表','每个节点同时记住前面和后面的人。删除一个已知节点时，两边的人直接重新牵手。',
`remove(node):  // 使用 head、tail 哨兵；node 是真实节点
  node.prev.next = node.next
  node.next.prev = node.prev
  node.prev = null; node.next = null`, '删除已知节点 O(1)；两个哨兵让头尾删除也能用同一套操作。',
[['准备删除 4。','head ⇄ 2 ⇄ 4 ⇄ 6 ⇄ tail'],['让 2 的 next 指向 6。','next：head → 2 → 6 → tail\nprev：tail → 6 → 4 → 2 → head'],['让 6 的 prev 指向 2，再清理 4 的连线。','head ⇄ 2 ⇄ 6 ⇄ tail\n4 已脱离链表']]],
    ['stack','栈','像叠盘子，只能从最上面放、从最上面拿。最后放进去的最先出来。',
`push(x): items.append(x)
pop():
  if items 为空: 报错“空栈”
  return items.removeLast()`, '后进先出；适合撤销、括号匹配、递归调用。动态数组实现 push 均摊 O(1)。',
[['初始空栈。','栈底 [ ] 栈顶'],['push(2)。','栈底 [2] 栈顶'],['push(4)。','栈底 [2, 4] 栈顶'],['pop() 返回 4。','栈底 [2] 栈顶\n输出：4'],['pop() 返回 2。','栈底 [ ] 栈顶\n输出：2']]],
    ['queue','队列','像排队买票，从队尾加入，从队头离开。先来的人先走。',
`enqueue(x): 将 x 接到链表队尾
dequeue():
  if 队头为空: 报错“空队列”
  x = 队头的值; 队头 = 队头.next
  if 队头为空: 队尾 = null
  return x`, '先进先出；带队头、队尾指针的链表入队出队都是 O(1)。',
[['初始空队列。','队头 [ ] 队尾'],['enqueue(2)。','队头 [2] 队尾'],['enqueue(4)。','队头 [2, 4] 队尾'],['dequeue() 返回最早来的 2。','队头 [4] 队尾\n输出：2'],['enqueue(6)。','队头 [4, 6] 队尾']]],
    ['hash','哈希表','像先算快递属于哪个货架，再去货架里找包裹。不同键可能算到同一货架，这就叫冲突；可以在货架挂一条链表。',
`put(key, value):
  b = buckets[hash(key) mod capacity]
  for node in b:
    if node.key == key: node.value = value; return
  b.append(Node(key, value))
get(key):
  b = buckets[hash(key) mod capacity]
  在 b 中比较完整 key；命中则返回 value，否则返回“不存在”`, '良好散列和负载控制下平均 O(1)，链式冲突最坏 O(n)。示例 hash(k)=k，容量 3。',
[['初始 3 个桶。','0: 空\n1: 空\n2: 空'],['put(1, A)：1 mod 3 = 1。','0: 空\n1: (1,A)\n2: 空'],['put(4, B)：发生冲突，挂在同一个桶。','0: 空\n1: (1,A) → (4,B)\n2: 空'],['get(4)：先看键 1，不匹配，再看键 4。','桶 1：(1,A) → [命中 (4,B)]\n返回 B']]],
    ['binary','二叉树','像家谱，每个人最多有两个孩子。遍历就是规定一个顺序，把所有人点名一次；二叉树本身不要求左右有大小关系。',
`preorder(node):
  if node == null: return
  visit(node)
  preorder(node.left)
  preorder(node.right)
// 中序：左、根、右；后序：左、右、根`, '遍历 O(n)，递归空间 O(h)。以下为前序点名；同一棵树中序为 2,4,6，后序为 2,6,4。',
[['示例树，准备前序遍历。','    4\n   / \\\n  2   6\n已访问：空'],['先访问根 4。','    [4]\n   /   \\\n  2     6\n已访问：4'],['走左边，访问 2；它没有孩子，返回。','    4\n   / \\\n [2]  6\n已访问：4 → 2'],['走右边，访问 6，完成。','    4\n   / \\\n  2  [6]\n已访问：4 → 2 → 6']]],
    ['bst','二叉搜索树（BST）','像猜数字，左边都比当前小，右边都比当前大。每比一次，就知道该往哪边找。',
`find(node, x):  // 示例不存重复键
  while node != null:
    if x == node.key: return node
    if x < node.key: node = node.left
    else: node = node.right
  return“不存在”`, '操作 O(h)；树平衡时 O(log n)，有序插入可能退化为 O(n)。',
[['查找 6，从根 4 开始。','    [4]\n   /   \\\n  2     7\n       /\n      6'],['6 > 4，去右子树。','    4\n   / \\\n  2  [7]\n     /\n    6'],['6 < 7，去左子树，找到 6。','    4\n   / \\\n  2   7\n     /\n   [6]']]],
    ['avl','AVL 树','给搜索树加一个“别歪太多”的规矩：每个节点左右高度最多差 1。插入后太歪，就转一下，让中间的数当家长。',
`insert(node, x):
  if node == null: return new Node(x, height=1)
  if x == node.key: return node  // 本例不存重复键
  按 BST 规则递归插入 x
  更新 node.height
  balance = height(node.left) - height(node.right)
  if balance > 1:
    if height(left.left) < height(left.right): node.left = rotateLeft(node.left)
    return rotateRight(node)
  if balance < -1:
    if height(right.right) < height(right.left): node.right = rotateRight(node.right)
    return rotateLeft(node)
  return node
// 旋转须重连中间子树，并先更新旧根、再更新新根的高度`, '查找和更新 O(log n)。例子演示 LL 型右旋；LR、RL 型需要先转孩子再转根。',
[['依次插入 3、2。','  3\n /\n2'],['插入 1，节点 3 左右高度差为 2，出现 LL 失衡。','    3\n   /\n  2\n /\n1'],['对 3 右旋，2 成为新根。','  2\n / \\\n1   3\n每个节点高度差均不超过 1']]],
    ['redblack','红黑树','也是搜索树，但用红黑颜色控制“别长得太偏”。新节点先涂红；红色不能挨着红色，遇到冲突就变色或旋转。',
`insert(x):
  z = BST插入(x); z.color = 红
  while z.parent.color == 红:
    if 父亲是祖父的左孩子:
      uncle = 祖父.right
      if uncle.color == 红:
        父亲和叔叔涂黑；祖父涂红；z = 祖父
      else:
        if z 是右孩子: z = 父亲; rotateLeft(z)
        父亲涂黑；祖父涂红；rotateRight(祖父)
    else: 左右镜像处理
  root.color = 黑
// 所有空叶子 NIL 为黑；根的父亲为黑色 NIL`, '每条到 NIL 的路径黑节点数相同，且红节点不能有红孩子；查找与更新 O(log n)。',
[['插入 3 后根涂黑，再插入红色 2。','    3黑\n   /\n  2红\n所有空孩子均为黑色 NIL'],['插入红色 1，父亲 2 也红，叔叔为黑色 NIL。','    3黑\n   /\n  2红\n /\n1红'],['父亲涂黑、祖父涂红，对祖父右旋。','   2黑\n  /   \\\n1红   3红\n根为黑，无红红相邻，黑高度相同']]],
    ['btree','B 树','像每页装多张目录卡，一次看几个分界值再选下一页。每个节点都可以存数据，满了就把中间那张升到上一层。',
`insert(k):  // 最小度数 t，最多 2t-1 个键
  if root 已满: 创建新根并 splitChild(newRoot, 0)
  insertNonFull(root, k)
insertNonFull(node, k):
  if node 是叶子: 有序插入 k; return
  i = k 应进入的孩子下标
  if child[i] 已满:
    splitChild(node, i) // 中位键上移，两侧各保留 t-1 个键
    根据上移键重新选择孩子 i
  insertNonFull(child[i], k)`, '例子 t=2，每节点最多 3 个键；插入前先分裂满节点。所有叶子深度相同。',
[['已插入 1、2、3，根已满。','根/叶：[1 | 2 | 3]'],['要插入 4，先把中位键 2 升到新根。','       [2]\n      /   \\\n    [1]   [3]'],['4 > 2，放进右叶子。','       [2]\n      /   \\\n    [1]  [3 | 4]\nB 树的键 2 及其数据存于内部节点']]],
    ['bplus','B+ 树','像书的目录和正文分开：上层只指路，数据都在最下面。最下面的页还连在一起，查一段连续数据时顺着翻就行。',
`range(lo, hi):
  node = root
  while node 不是叶子:
    node = 按分隔键选择包含 lo 的孩子（等于分隔键时向右）
  while node != null:
    for record in node.records 按键升序:
      if record.key > hi: return
      if record.key >= lo: 输出 record
    node = node.nextLeaf`, '以下演示范围查询 [2,4]；分隔键仍保留在叶子。叶链可以单向或双向，取决于实现。',
[['从根目录查找下界 2。','       索引 [3]\n       /      \\\n数据 [1,2] → [3,4,5] → null'],['2 < 3，落在左叶子，跳过 1，输出 2。','当前叶：[1, (2)]\n输出：2'],['顺着叶链到下一页，输出 3、4。','[1,2] → [(3),(4),5]\n输出：2,3,4'],['遇到 5 > 上界 4，结束查询。','结果：[2,3,4]\n无需回到根重复查找']]],
    ['heapds','堆 / 优先队列','像按紧急程度叫号，最优先的总在最上面。新来的人先站末尾，再一路和家长比，必要时往上换。',
`push(x):  // 小顶堆
  A.append(x); i = length(A)-1
  while i > 0:
    p = floor((i-1)/2)
    if A[p] <= A[i]: break
    swap(A[p], A[i]); i = p
popMin():
  if A 为空: 报错“空堆”
  保存堆顶；用末尾替换堆顶并缩短数组
  反复与较小孩子交换，直到满足堆序；返回原堆顶`, '堆顶读取 O(1)，插入与弹出 O(log n)。树形由数组隐含表示，不需要真的存左右指针。',
[['小顶堆初始状态，插入 1。','    2\n   / \\\n  4   6\n数组：[2,4,6]'],['1 追加到数组末尾。','    2\n   / \\\n  4   6\n /\n1\n数组：[2,4,6,1]'],['1 < 父亲 4，向上交换。','    2\n   / \\\n  1   6\n /\n4\n数组：[2,1,6,4]'],['1 < 父亲 2，再交换，成为堆顶。','    1\n   / \\\n  2   6\n /\n4\n数组：[1,2,6,4]']]],
    ['graph','图（邻接表）','像地铁站和站间连线，节点表示站，边表示连接。邻接表就是每站记一张“能直接到哪些站”的名单。',
`BFS(start):
  seen = {start}; queue = [start]
  while queue 非空:
    u = queue.dequeue(); visit(u)
    for v in adjacency[u]:
      if v not in seen:
        seen.add(v); queue.enqueue(v)`, '图本身是数据结构；这里用 BFS 展示如何使用邻接表。入队时标记可避免环和重复入队，时间 O(V+E)。',
[['无向图，从 A 开始。','A ─ B\n│   │\nC ─ D\n邻接：A:[B,C] B:[A,D] C:[A,D] D:[B,C]\n队列：[A]；已访问：空'],['出队 A，B、C 标记并入队。','队列：[B,C]\n已发现：A,B,C\n已访问：A'],['出队 B，A 已发现，只把 D 入队。','队列：[C,D]\n已发现：A,B,C,D\n已访问：A,B'],['出队 C，D 已入队，不重复添加。','队列：[D]\n已访问：A,B,C'],['出队 D，所有邻居都已发现。','队列：[]\n遍历结果：A → B → C → D']]],
    ['trie','Trie 前缀树','像逐个字母走岔路，相同开头的词共用一段路。走完全部字母后，还要看“这里是不是一个完整词”的标记。',
`insert(word):
  node = root
  for c in word:
    if node.children[c] 不存在: 创建子节点
    node = node.children[c]
  node.isWord = true
search(word):
  按字符走到对应节点；缺边返回 false
  return node.isWord`, '插入和查询 O(L)，L 为词长。找到路径只代表前缀存在，不一定是完整单词。',
[['插入 cat，最后的 t 标记为完整词。','root → c → a → t*\n* = 单词结尾'],['插入 car，共用 c、a，再分叉。','root → c → a → t*\n             └→ r*'],['search(ca)：路径存在，但 a 没有结尾标记。','命中前缀 ca\n完整词查询：false\n前缀查询：true'],['search(car)：r 有结尾标记。','root → c → a → r*\n完整词查询：true']]],
    ['dsu','并查集','像给小组找组长：每个人跟着一个上级，最终到组长。两组要合并，只要让一个组长跟着另一个组长。',
`find(x):
  if parent[x] != x: parent[x] = find(parent[x])
  return parent[x]
union(a,b):
  ra = find(a); rb = find(b)
  if ra == rb: return
  if size[ra] < size[rb]: swap(ra,rb)
  parent[rb] = ra; size[ra] += size[rb]`, '路径压缩加按大小合并，均摊接近 O(1)，严格为 O(α(n))；用于连通性和 Kruskal 判环。',
[['4 个元素各自一组。','parent：1→1  2→2  3→3  4→4'],['union(1,2)：2 跟随组长 1。','2 → 1（大小 2）\n3（大小 1）  4（大小 1）'],['union(3,4)：4 跟随组长 3。','2 → 1（大小 2）\n4 → 3（大小 2）'],['union(1,3)：3 跟随 1，4 暂时仍跟随 3。','4 → 3 → 1 ← 2\n组长 1，大小 4'],['find(4)：找到 1，把路径压短。','4 → 1 ← 2\n    ↑\n    3\n返回组长 1']]],
    ['lru','LRU 缓存','像只能放两本书的桌子：刚看的放最前面；桌子满了，就把最久没翻的那本收走。用哈希表找书，用双向链表调位置。',
`get(key):
  if key 不在 map: return“不存在”
  node = map[key]; 将 node 摘下并移到链表头；return node.value
put(key,value):
  if key 已存在: 更新值并移到链表头；return
  新建节点，加到链表头并写入 map
  if size > capacity:
    old = 尾哨兵.prev；摘下 old；删除 map[old.key]`, '容量为正，链表用头尾哨兵；哈希表与链表必须同步更新。get/put 平均 O(1)。',
[['容量 2，初始为空。','最近 [ ] 最久\nmap：空'],['put(A,1)，再 put(B,2)。','最近 [B ⇄ A] 最久\nmap：A→节点A，B→节点B'],['get(A) 返回 1，A 移到最前面。','最近 [A ⇄ B] 最久'],['put(C,3)，容量超限，淘汰 B。','最近 [C ⇄ A] 最久\nmap：A→节点A，C→节点C'],['get(B)：哈希表里已经没有 B。','返回“不存在”\n最近 [C ⇄ A] 最久']]]
  ];

  function element(tag, className, text) {
    const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;
  }
  function mountDemo(container, frames, makeFrames, id) {
    const demo=element('div','demo');container.append(demo);
    let position=0;
    if(makeFrames) {
      const label=element('label','', '试试自己的数组（2–10 个 0–99 的整数）：');label.htmlFor=`input-${id}`;demo.append(label);
      const row=element('div','demo-controls'),input=element('input');input.id=`input-${id}`;input.value='5, 3, 8, 3, 1';
      const apply=element('button','','应用数组');apply.type='button';row.append(input,apply);demo.append(row);
      const error=element('p','demo-error');error.setAttribute('role','alert');demo.append(error);
      function updateInput() {
        const parts=input.value.trim().split(/[,，\s]+/);
        if(parts.length<2||parts.length>10||parts.some(v=>!/^\d{1,2}$/.test(v))) {error.textContent='请输入 2–10 个 0–99 的整数，用逗号或空格分隔。';return;}
        frames=makeFrames(parts.map(Number));position=0;error.textContent='';render();
      }
      apply.addEventListener('click',updateInput);input.addEventListener('keydown',e=>{if(e.key==='Enter')updateInput();});
    }
    const controls=element('div','demo-controls'),prev=element('button','','← 上一步'),next=element('button','','下一步 →'),reset=element('button','','重置'),counter=element('span');
    [prev,next,reset].forEach(b=>{b.type='button';});controls.append(prev,next,reset,counter);demo.append(controls);
    const cells=element('div','demo-cells'),state=element('div','demo-state'),status=element('p','demo-status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');demo.append(cells,state,status);
    function render() {
      const frame=frames[position];cells.replaceChildren();
      if(frame.values)frame.values.forEach((v,i)=> {const cell=element('div',`demo-cell${frame.active.includes(i)?' current':''}`,String(v));cell.append(element('small','',`下标 ${i}`));cells.append(cell);});
      cells.hidden=!frame.values;state.textContent=frame.extra||'';state.hidden=!frame.extra;status.textContent=frame.text;
      counter.textContent=`步骤 ${position+1} / ${frames.length}`;prev.disabled=position===0;next.disabled=position===frames.length-1;
    }
    prev.addEventListener('click',()=>{if(position>0){position--;render();}});
    next.addEventListener('click',()=>{if(position<frames.length-1){position++;render();}});
    reset.addEventListener('click',()=>{position=0;render();});render();
  }
  function mountLessons(target, entries, sorting) {
    const host=document.getElementById(target);if(!host)return;
    const index=element('nav','lesson-index');index.setAttribute('aria-label',sorting?'排序算法快速跳转':'数据结构快速跳转');host.append(index);
    entries.forEach(([id,title,idea,pseudo,note,steps])=> {
      const anchor=element('a','',title);anchor.href=`#lesson-${id}`;index.append(anchor);
      const card=element('article','card lesson');card.id=`lesson-${id}`;card.append(element('h4','',title),element('p','lesson-label','思想 · 大白话'),element('p','',idea),element('p','lesson-label','伪代码'));
      const pre=element('pre');pre.append(element('code','',pseudo));card.append(pre,element('p','lesson-note',note),element('p','lesson-label',sorting?'逐步演示 · 可修改数组':'逐步演示 · 固定小例子'));
      const make=sorting?input=>sortTrace(id,input):null;
      mountDemo(card,sorting?make([5,3,8,3,1]):steps.map(([text,extra])=>({text,extra})),make,id);host.append(card);
    });
  }
  if(typeof module!=='undefined' && module.exports)module.exports={sortTrace,sorts,structures};
  if(typeof document!=='undefined') {mountLessons('sorting-lessons',sorts,true);mountLessons('structure-lessons',structures,false);}
})();
