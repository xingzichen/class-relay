
(()=>{
const root=document.getElementById('classroom-miniapp');
const screen=root.querySelector('#sc-screen');
const toast=root.querySelector('#sc-toast');
const state={page:'home',role:'parent',done:false,ack:false,swapped:false,dutyChanged:false,scheduleTab:'course',day:9,financeTab:'payment',verified:false,approved:false,submitted:false,joinSent:false,qaQuestion:'',qaAnswer:'',qaKind:'',draft:null,published:null,adjustPreview:false,accent:'jade',radius:18};
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=n=>`<span aria-hidden="true">${({'chevron-right':'›','chevron-left':'‹','arrow-up-right':'↗','calendar-days':'▦','receipt-text':'¥','message-circle':'…','users':'人','book-open':'册','bell':'铃'})[n]||'·'}</span>`;
const badge=(t,w=false)=>`<span class="sc-badge${w?' warm':''}">${t}</span>`;
const title=(t,s)=>`<div class="sc-title"><h2>${t}</h2><p class="sc-muted">${s}</p></div>`;
const back=(p='home')=>`<button class="sc-back" data-go="${p}" type="button">${icon('chevron-left')}返回</button>`;
const isManager=()=>canManage();
const roleName=()=>({parent:'林小禾妈妈',teacher:'周老师',committee:'沈委员',admin:'系统管理员',successor:'李委员'}[state.role]);
const listItem=(glyph,t,sub,go,tag='')=>`<button type="button" class="sc-item" data-go="${go}"><span class="sc-glyph">${icon(glyph)}</span><span class="sc-grow"><span>${t}</span><p class="sc-muted">${sub}</p></span>${tag||icon('chevron-right')}</button>`;
function notice(text){toast.textContent=text;toast.classList.remove('sc-hidden')}
function go(page){
 const protectedPages=['manage','compose','publish-preview','finance-review','reminders','owners','activity-cancel','consent','course-permission','adjust','duty-adjust','approvals','students'];
 if(protectedPages.includes(page)&&!canManage()){notice('当前管理授权无效；家长与孩子关联仍保留');return;}
 if(page==='handover'&&!canManage()&&state.role!=='successor'){notice('当前无交接管理权限');return;}
 if(page==='adjust'&&!canCourse()){notice('当前未授予课程维护权限');return;}
 state.page=page;toast.classList.add('sc-hidden');render();
}
function render(){
root.style.setProperty('--sc-radius',state.radius+'px');
root.style.setProperty('--sc-accent',state.accent==='jade'?'light-dark(#28644d,#9bd8b4)':'light-dark(#355f88,#a9cde9)');
root.style.setProperty('--sc-soft',state.accent==='jade'?'light-dark(#e8f1e9,#2d4435)':'light-dark(#eaf0f6,#263f50)');
root.querySelectorAll('.sc-nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.go===state.page?'page':'false'));
let html='';
if(state.page==='home')html=`${title('把今天的事，安排好','9 月 8 日，星期二 · 林小禾 / 林小满')}
<div class="sc-surface sc-hero"><div class="sc-row"><div><div class="sc-muted">与孩子相关的待办</div><strong>${Number(!state.done)+Number(!state.submitted&&!state.activityCancelled)}</strong><span> 项待处理</span></div><button data-go="tasks" type="button">去查看 ${icon('arrow-up-right')}</button></div><p class="sc-muted">${state.done?'运动服准备已完成':'运动服准备 · 明天 08:00 前'}</p></div>
<div class="sc-section"><h3>常用入口</h3>${isManager()?'<button class="sc-link" data-go="manage" type="button">管理工作台 →</button>':''}</div>
<div class="sc-quick"><button data-go="schedule" type="button">${icon('calendar-days')}课程与值日</button><button data-go="qa" type="button">${icon('message-circle')}公共问答</button><button data-go="finance" type="button">${icon('receipt-text')}费用公示</button></div>
<div class="sc-section"><h3>班级通知</h3><span class="sc-muted">最新发布</span></div><div class="sc-surface sc-stack">${state.published?listItem('bell',e(state.published.title),'刚刚 · '+e(state.published.scope),'published',badge('新')):''}${state.swapped?listItem('calendar-sync','周三课程临时调整','第 3 节与第 5 节互换 · 仅本次','schedule',badge('有调整',true)):''}${listItem('notebook-pen','周三体育课准备提醒','周老师 · 今天 16:30','detail',badge(state.ack?'已确认收到':'未确认收到'))}${listItem('clipboard-list','秋游参加意向确认','家委会 · 周五 18:00 截止','collect',badge(state.activityCancelled?'已取消':state.responses.s1?'已答复':'待填写',!state.responses.s1&&!state.activityCancelled))}</div>
<div class="sc-section"><h3>明天的安排</h3><button class="sc-link" data-go="schedule" type="button">查看日程 →</button></div><div class="sc-surface"><div class="sc-row"><span>值日 · ${state.dutyChanged?'周星然':'林小禾'}、陈若溪</span>${badge('16:10')}</div><p class="sc-muted">整理讲台、擦白板、归置清洁工具</p></div>`;
if(state.page==='tasks')html=`${title('待办事项','按孩子查看 · 已完成会同步给关联亲属')}<div class="sc-stack"><div class="sc-surface"><div class="sc-row">${badge('准备事项')}<span class="sc-muted">林小禾</span></div><h3 style="margin-top:12px">准备运动服与水杯</h3><p class="sc-muted">明天 08:00 前 · 来自体育课通知</p><div class="sc-actions"><button class="sc-btn secondary" data-go="detail" type="button">查看要求</button><button class="sc-btn" data-action="complete" type="button" ${state.done?'disabled':''}>${state.done?'已完成':'标记完成'}</button></div>${state.done?'<p class="sc-muted">妈妈已确认 · 此孩子的后续催办已停止</p>':''}</div><div class="sc-surface"><div class="sc-row">${badge('信息采集')}<span class="sc-muted">林小满</span></div><h3 style="margin-top:12px">秋游参加意向确认</h3><p class="sc-muted">周五 18:00 前 · 腾讯文档填写</p><div class="sc-actions"><button class="sc-btn secondary" data-go="collect" type="button">${state.submitted?'查看自报状态':'前往填写'}</button></div></div></div>`;
if(state.page==='detail')html=`${back('tasks')}${badge('准备事项')}${title('周三体育课准备提醒','周老师 · 9 月 8 日 16:30 · 版本 1')}<div class="sc-surface"><p>周三体育课请准备：</p><ul class="sc-plainlist"><li>适合运动的服装和运动鞋</li><li>装好饮用水的水杯</li></ul><p>请在上学前检查物品是否带齐。</p><div class="sc-dangerfree"><span class="sc-muted">适用范围</span><p>全体学生 · 当前孩子：林小禾</p></div><div class="sc-row"><span class="sc-muted">完成截止</span><span>9 月 9 日 08:00</span></div></div><div class="sc-spacer"></div><div class="sc-note">一位关联亲属确认即可。系统记录“已确认准备”，不判断孩子实际行为。</div><div class="sc-actions"><button class="sc-btn secondary" data-action="ack" type="button">${state.ack?'已确认收到':'确认收到'}</button><button class="sc-btn" data-action="complete" type="button" ${state.done?'disabled':''}>${state.done?'已完成准备':'已准备完成'}</button></div>`;
if(state.page==='external-collect')html=`${back('tasks')}${title('秋游参加意向确认','林小满 · 周五 18:00 截止')}<div class="sc-surface"><h3>填写参加意向</h3><p>请打开班级收集表，选择是否参加本次秋游。</p><p class="sc-muted">腾讯文档 · 仅采集活动参加信息</p><div class="sc-actions"><button class="sc-btn secondary" data-action="external" type="button">${icon('external-link')}打开填写入口</button></div></div><div class="sc-spacer"></div><div class="sc-note">打开表单不代表已提交。填写后可在这里声明完成，家委会再核验。</div><div class="sc-actions"><button class="sc-btn" data-action="submitted" type="button" ${state.externalSubmitted?'disabled':''}>${state.externalSubmitted?'已自报完成 · 待核验':'我已填写'}</button></div>`;
if(state.page==='schedule'){
const dates=[8,9,10];const weekdays={8:'周二',9:'周三',10:'周四'};
html=`${title('课程与值日','学期基础安排 · 临时调整单独标记')}<div class="sc-tabs"><button type="button" data-schedule="course" aria-pressed="${state.scheduleTab==='course'}">课程表</button><button type="button" data-schedule="duty" aria-pressed="${state.scheduleTab==='duty'}">值日表</button></div><div class="sc-days">${dates.map(d=>`<button type="button" data-day="${d}" aria-pressed="${state.day===d}">${weekdays[d]}<br>9 月 ${d} 日</button>`).join('')}</div>`;
if(state.scheduleTab==='course'){
let courses=[['08:20','第一节','语文','陈老师'],['09:20','第二节','英语','李老师'],['10:20','第三节',state.swapped&&state.day===9?'美术':'数学',state.swapped&&state.day===9?'郑老师':'周老师'],['14:00','第五节',state.swapped&&state.day===9?'数学':'美术',state.swapped&&state.day===9?'周老师':'郑老师']];
html+=`${state.swapped&&state.day===9?'<div class="sc-note">临时串课：第 3、5 节互换，仅 9 月 9 日生效。原基础周表不变。</div>':''}<div class="sc-surface">${courses.map((c,i)=>`<div class="sc-timeline ${state.swapped&&state.day===9&&i>1?'changed':''}"><span class="sc-time">${c[0]}<br>${c[1]}</span><div class="sc-row"><div><h3>${c[2]}</h3><p class="sc-muted">${c[3]} · 本班教室</p></div>${state.swapped&&state.day===9&&i>1?badge('临时调整',true):''}</div></div>`).join('')}</div>${(state.role==='teacher'||state.role==='admin')?'<div class="sc-actions"><button class="sc-btn full" data-go="adjust" type="button">'+icon('arrow-left-right')+'临时调整</button></div>':''}`;
}else html+=`<div class="sc-surface"><div class="sc-row"><h3>放学值日</h3>${badge('16:10–16:25')}</div><p class="sc-muted">9 月 ${state.day} 日 · ${weekdays[state.day]}</p><div class="sc-spacer"></div><div class="sc-row"><span>${state.dutyChanged&&state.day===9?'周星然':'林小禾'}、陈若溪</span>${state.dutyChanged&&state.day===9?badge('换人',true):badge('基础安排')}</div><ul class="sc-plainlist"><li>擦白板、整理讲台</li><li>检查课桌与地面</li><li>归置清洁工具</li></ul></div>${state.dutyChanged&&state.day===9?'<div class="sc-spacer"></div><div class="sc-note">本次由周星然替换林小禾，已更新双方家庭的站内安排。</div>':''}${isManager()?'<div class="sc-actions"><button class="sc-btn" data-go="duty-adjust" type="button">调整本次值日</button></div>':''}`;
}
if(state.page==='adjust')html=`${back('schedule')}${title('临时串课','预览调整后发布 · 仅本次生效')}<div class="sc-fields"><label class="sc-field">日期<select id="sc-adjust-date"><option>9 月 9 日 · 星期三</option></select></label><div class="sc-surface"><span class="sc-muted">原安排</span><p>第 3 节 10:20 · 数学 / 周老师</p><p>第 5 节 14:00 · 美术 / 郑老师</p></div><div class="sc-surface"><span class="sc-muted">调整后</span><p>第 3 节 10:20 · 美术 / 郑老师</p><p>第 5 节 14:00 · 数学 / 周老师</p></div><label class="sc-field">公共说明<input id="sc-adjust-reason" value="本周三教学安排调整" /></label></div><div class="sc-spacer"></div><div class="sc-note">影响全班 40 名学生；两节课一起更新。关联美术准备事项改为上午上课前，旧时点提醒失效。</div>`;
if(state.page==='duty-adjust')html=`${back('schedule')}${title('调整本次值日','9 月 9 日 · 16:10')}<div class="sc-stack"><div class="sc-surface"><span class="sc-muted">调整前</span><p>林小禾、陈若溪</p></div><div class="sc-surface"><span class="sc-muted">调整后</span><p>周星然、陈若溪</p></div><label class="sc-field">公共说明<input id="sc-duty-reason" value="本次值日人员调整" /></label><div class="sc-note">通知林小禾、周星然的已关联亲属。无需填写私人原因。</div><button class="sc-btn" data-action="duty-change" type="button">确认本次调整</button></div>`;
if(state.page==='voucher'||state.page==='voucher-material')html=`${back('finance')}${title('支出凭证','班内公示副本 · 示例')}<div class="sc-surface"><h3>${state.page==='voucher-material'?'班级布置材料记录':'教室清洁服务记录'}</h3><table><tbody><tr><td>日期</td><td>${state.page==='voucher-material'?'9 月 7 日':'9 月 6 日'}</td></tr><tr><td>服务内容</td><td>${state.page==='voucher-material'?'班级布置材料':'教室保洁'}</td></tr><tr><td>金额</td><td>${state.page==='voucher-material'?'¥300':'¥600'}</td></tr><tr><td>经办 / 复核</td><td>${state.page==='voucher-material'?'林委员':'陈委员'} / 沈委员</td></tr></tbody></table><p class="sc-muted">原始凭证仅有财务权限的管理者可查看。</p></div>`;
if(state.page==='qa')html=`${back()}${title('公共事项小助手','通知 · 作业要求 · 准备清单 · 操作说明')}<div class="sc-chat"><div class="sc-row"><h3>今天想确认什么？</h3>${badge('公共知识')}</div><p>我可以帮你查找已发布的日常安排，并附上来源。</p><p class="sc-muted">具体反馈、争议和个人情况，请通过原有渠道直接沟通。</p></div><div class="sc-suggestions"><button type="button" data-ask="明天体育课要准备什么？">明天要准备什么？</button><button type="button" data-ask="今天数学作业是哪几页？">数学作业要求</button><button type="button" data-ask="保证老师明天一定回复吗？">回复承诺边界</button></div>${state.qaQuestion?`<div class="sc-chat user">${state.qaKind==='OUT_OF_SCOPE'?'已提交问题':e(state.qaQuestion)}</div><div class="sc-chat" role="status"><span class="sc-muted">公共事项小助手 · 演示回答</span><p>${e(state.qaAnswer)}</p>${state.qaKind==='ANSWER'?'<button class="sc-link" data-go="detail" type="button">查看来源通知 →</button>':''}</div>`:''}<label class="sc-field">输入公共事项问题<textarea id="sc-question" placeholder="例如：明天体育课需要准备什么？"></textarea></label><div class="sc-actions"><button class="sc-btn" data-action="ask" type="button">查询</button></div>`;
if(state.page==='profile')html=`${title('我的','管理身份与家庭关联分开保存')}<div class="sc-surface"><div class="sc-row"><div class="sc-row"><span class="sc-avatar">${roleName().slice(0,1)}</span><div><h3>${roleName()}</h3><p class="sc-muted">${isManager()?'管理身份 + 普通家长':'普通家长'}</p></div>${badge('已入班')}</div></div><div class="sc-section"><h3>已关联孩子</h3><button class="sc-link" data-go="join" type="button">添加关联 →</button></div><div class="sc-surface">${listItem('sprout','林小禾 · 妈妈','二年级 3 班 · 已审批','join',badge('有效'))}${listItem('sprout','林小满 · 妈妈','二年级 3 班 · 已审批','join',badge('有效'))}</div><div class="sc-section"><h3>账户与提醒</h3></div><div class="sc-surface">${listItem('user-plus','身份申请 / 加入班级','身份可多选，管理权限需授权','join')}${isManager()?listItem('settings-2','管理工作台','发布、审批、排课与账务','manage'):''}${listItem('bell','提醒设置','站内待办持续保留','notification-settings')}</div>`;
if(state.page==='join')html=`${back('profile')}${title('加入班级与关联孩子','选择身份，提交后等待对应管理者审核')}<div class="sc-fields"><label class="sc-field">班级邀请码<input value="QH-203" aria-label="班级邀请码"></label><div><p class="sc-muted" style="margin-bottom:8px">我的身份 · 可多选</p><div class="sc-stack">${['系统管理员','老师','家委会委员','普通家长'].map(t=>`<label class="sc-check"><input type="checkbox" name="sc-role" value="${t}" ${t==='普通家长'?'checked':''}>${t}</label>`).join('')}</div></div><label class="sc-field">孩子（可选）<input value="林小禾" aria-label="孩子姓名"></label><label class="sc-field">亲属身份<select aria-label="亲属身份"><option>妈妈</option><option>爸爸</option><option>奶奶</option><option>爷爷</option><option>外婆</option><option>外公</option><option>其他</option></select></label></div><div class="sc-actions"><button class="sc-btn" data-action="join" type="button">${state.joinSent?'已提交 · 可再次预览':'提交申请'}</button></div><p class="sc-muted">身份选择不直接授予权限；关联需家委会委员及以上人员审批，申请人不能自审。</p>`;
if(state.page==='manage')html=`${title('管理工作台',roleName()+' · 二年级 3 班')}<div class="sc-managegrid"><button data-go="compose" type="button">${icon('square-pen')}发布日常任务<span class="sc-muted">通知 / 作业 / 采集 / 待办</span></button><button data-go="approvals" type="button">${icon('user-check')}关联审批<span class="sc-muted">${state.approved?'暂无待审批':'1 条待审批'}</span></button><button data-go="schedule" type="button">${icon('calendar-sync')}课程与值日<span class="sc-muted">基础表与临时调整</span></button><button data-go="finance-review" type="button">${icon('receipt')}费用核对<span class="sc-muted">${state.verified?'已完成核对':'1 笔待复核'}</span></button><button data-go="students" type="button">${icon('users')}学生与群组<span class="sc-muted">40 位学生 · 3 个群组</span></button><button data-go="knowledge" type="button">${icon('book-open')}公共知识库<span class="sc-muted">来源、版本与可用范围</span></button></div><div class="sc-section"><h3>复用模板</h3></div><div class="sc-surface">${listItem('notebook-pen','每日作业通知','复用内容结构，重新确认日期与范围','compose')}${listItem('backpack','活动准备清单','物品、时间、家长确认','compose')}</div>`;
if(state.page==='approvals')html=`${back('manage')}${title('孩子关联审批','核对关系后生效 · 申请人不能自审')}<div class="sc-surface"><div class="sc-row"><h3>刘女士申请关联陈若溪</h3>${badge(state.approved?'已通过':'待审批',!state.approved)}</div><p>亲属身份：奶奶</p><p class="sc-muted">二年级 3 班 · 今天 15:20 提交</p><div class="sc-actions"><button class="sc-btn secondary" data-action="reject" type="button" ${state.approved?'disabled':''}>退回补充</button><button class="sc-btn" data-action="approve" type="button" ${state.approved?'disabled':''}>${state.approved?'已通过':'核对后通过'}</button></div></div>`;
if(state.page==='students')html=`${back('manage')}${title('学生与群组','班级共享名册 · 管理者可维护')}<div class="sc-surface">${[['林小禾','女生 · 3 位已关联亲属'],['林小满','女生 · 2 位已关联亲属'],['陈若溪','女生 · '+(state.approved?3:2)+' 位已关联亲属'],['周星然','男生 · 2 位已关联亲属']].map(r=>`<div class="sc-item"><span class="sc-avatar">${r[0].slice(0,1)}</span><div><h3>${r[0]}</h3><p class="sc-muted">${r[1]}</p></div></div>`).join('')}</div><div class="sc-section"><h3>自建群组</h3></div><div class="sc-surface"><div class="sc-row"><span>合唱队</span>${badge('8 人')}</div><p class="sc-muted">可用于通知范围与值日安排</p></div>`;
if(state.page==='knowledge')html=`${back('manage')}${title('公共知识库','供公共问答引用 · 保留来源版本')}<div class="sc-stack"><div class="sc-surface"><div class="sc-row"><h3>体育课物品准备</h3>${badge('可用于 AI')}</div><p class="sc-muted">来源：9 月 8 日周老师通知 · 版本 1</p><p>运动服、运动鞋、水杯；适用于全班。</p></div><div class="sc-surface"><div class="sc-row"><h3>费用公示查看方式</h3>${badge('可用于 AI')}</div><p class="sc-muted">来源：班级办事说明 · 版本 2</p><p>进入费用页面查看缴费、支出和结余。</p></div><div class="sc-note">公共知识不包含个人缴费明细、学生个案或反馈投诉；AI 不受理或代转达问题。</div></div>`;
screen.innerHTML=extraView(html);
if(globalThis.lucide)lucide.createIcons({attrs:{width:18,height:18}});
}
function ask(q){
q=q.trim();if(!q){notice('请输入一个公共事项问题');return}
let kind='INSUFFICIENT_SOURCE',answer='目前可查的通知没有说明这一点，可以通过原有渠道向发布者确认。';
if(/投诉|反馈|骂|欠|没交|谁对|针对|健康|病|保证|一定|承诺|隐私|忽略|家境|成绩|电话|地址|转达|不负责|评价/.test(q)){kind='OUT_OF_SCOPE';answer=/保证|一定|承诺/.test(q)?'目前没有可确认的回复时间。具体沟通安排，请通过原有渠道直接向相关人员确认。':'这类具体情况需要由相关人员沟通处理，请通过原有渠道直接联系老师或家委会。'}
else if(/准备|带什么|体育/.test(q)){kind='ANSWER';answer='根据 9 月 8 日周老师发布的体育课通知，明天请准备运动服、运动鞋和水杯。'}
else if(/作业|数学/.test(q)){kind='ANSWER';answer='当前演示资料没有数学作业页数，暂时无法确认。请查看老师发布的作业原通知。';kind='INSUFFICIENT_SOURCE'}
state.qaQuestion=kind==='OUT_OF_SCOPE'?'':q;state.qaKind=kind;state.qaAnswer=answer;if(kind==='OUT_OF_SCOPE')state.qaQuestion='已提交问题';render();
}
root.addEventListener('change',ev=>{if(ev.target.id==='sc-persona'){state.role=ev.target.value;go(state.role==='successor'&&!canManage()?'handover':isManager()?'manage':'home')}});
root.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b||!root.contains(b))return;if(b.dataset.go){go(b.dataset.go);return}if(b.dataset.schedule){state.scheduleTab=b.dataset.schedule;render();return}if(b.dataset.day){state.day=Number(b.dataset.day);render();return}if(b.dataset.finance){state.financeTab=b.dataset.finance;render();return}if(b.dataset.ask){ask(b.dataset.ask);return}
const a=b.dataset.action;
if(extraAction(a,b))return;
if(a==='complete'){state.done=true;render();notice('林小禾的准备事项已确认完成；后续催办停止（演示）')}
if(a==='ack'){state.ack=true;render();notice('已确认收到（演示），与准备完成状态分别记录')}
if(a==='external')notice('演示入口：真实腾讯文档跳转待接入验证，本次不会打开外部表单');
if(a==='submitted'){state.externalSubmitted=true;render();notice('已保存亲属自报状态（演示），尚未核验外部提交')}
if(a==='duty-change'){state.dutyChanged=true;state.day=9;state.scheduleTab='duty';go('schedule');notice('新旧对象的安排已更新（演示）')}
if(a==='ask')ask(root.querySelector('#sc-question').value);
if(a==='subscribe')notice('演示不调用微信授权；真实订阅状态需上线后由用户操作');
if(a==='join'){if(!root.querySelector('input[name="sc-role"]:checked')){notice('请至少选择一个身份');return}state.joinSent=true;render();notice('申请已提交（演示），不会自动获得管理权限或关联资格')}
if(a==='approve'){state.approved=true;render();notice('模拟审批通过，奶奶可接收该孩子开放事项')}
if(a==='reject')notice('模拟退回：请核对班内孩子标识后重新申请');

});
// Local demonstration only. No network, account, notification or financial service is called.
const students = Array.from({length:40}, (_,i)=>({id:'s'+i,name:['林小禾','林小满','陈若溪','周星然','许知夏','陆小川'][i]||`示例学生${i+1}`,gender:(i<19&&i!==3)||i===19?'女生':'男生',choir:i<9&&i!==3,relatives:i===0?3:2}));
const freshDraft=()=>({type:'通知',title:'周四美术课准备说明',body:'请准备彩纸和固体胶，在美术课前带到学校。',deadline:'',readScope:'CLASS_PUBLIC',scopes:['全体学生'],picks:[],ack:false,mode:'PER_STUDENT',collection:'原生回填',question:'参加意向',url:'',verify:false});
Object.assign(state,{
 compose:freshDraft(),artDone:false,artRound:1,artMaterial:'彩纸与固体胶',activityCancelled:false,
 formChild:'s1',responses:{},participants:[{id:'adult-1',name:'林爸爸（未注册）'},{id:'adult-2',name:'林妈妈（已关联）'}],volunteerMode:'原生代报名',registrations:[],volunteerSlot:'摄影',
 feeClaim:false,feePublished:false,paymentReminders:0,clockHour:10,reminderHours:[],owner:'沈委员',taskOwner:'沈委员',knowledgeOwner:'沈委员',activityOwner:'沈委员',knowledgeValid:'2026-12-31',knowledgeVersion:1,
 handoverState:'DRAFT',handoverChecks:{},oldGrantActive:true,courseDelegated:false,primaryRecipient:'所有关联亲属',consentVerified:false,materialStatus:'待认领',audit:[],
});
const action=(name,label,disabled=false,secondary=false)=>`<button type="button" class="sc-btn${secondary?' secondary':''}" data-action="${name}" ${disabled?'disabled':''}>${label}</button>`;
const nav=(page,label)=>`<button type="button" class="sc-btn secondary" data-go="${page}">${label}</button>`;
const field=(label,markup)=>`<label class="sc-field">${label}${markup}</label>`;
const select=(id,values,current)=>`<select id="${id}">${values.map(v=>`<option ${v===current?'selected':''}>${e(v)}</option>`).join('')}</select>`;
const note=t=>`<div class="sc-note">${t}</div>`;
const card=t=>`<div class="sc-surface">${t}</div>`;
const check=(id,label,checked=false)=>`<label class="sc-check"><input type="checkbox" id="${id}" ${checked?'checked':''}>${label}</label>`;
const canManage=()=>state.role==='teacher'||state.role==='admin'||(state.role==='committee'&&state.oldGrantActive)||(state.role==='successor'&&state.handoverState==='ACTIVE');
const canCourse=()=>state.role==='teacher'||state.role==='admin'||(state.role==='committee'&&state.oldGrantActive&&state.courseDelegated);
const canActivate=()=>state.role==='teacher'||state.role==='admin';
const canFinanceReview=()=>canActivate()||(state.role==='committee'&&state.oldGrantActive);
const canConsent=()=>canActivate();
const log=t=>state.audit.unshift(t);
function targetStudents(d){return students.filter(s=>d.scopes.includes('全体学生')||d.scopes.includes(s.gender)||(d.scopes.includes('合唱队')&&s.choir)||(d.scopes.includes('学生多选')&&d.picks.includes(s.id)));}
function readCompose(){
 const d=state.compose, by=id=>root.querySelector('#'+id);
 if(!by('sc-task-title'))return;
 d.title=by('sc-task-title').value;d.body=by('sc-task-body').value;d.deadline=by('sc-task-deadline').value;
 d.scopes=[...root.querySelectorAll('[name="sc-scope"]:checked')].map(x=>x.value);
 d.picks=[...root.querySelectorAll('[name="sc-student"]:checked')].map(x=>x.value);
 d.readScope=by('sc-read-scope').value;d.ack=by('sc-task-confirm')?.checked||false;
 d.mode=by('sc-completion-mode')?.value||'PER_STUDENT';
 if(by('sc-collection-mode'))d.collection=by('sc-collection-mode').value;
 if(by('sc-external-url'))d.url=by('sc-external-url').value;
 if(by('sc-verify-required'))d.verify=by('sc-verify-required').checked;
}
function composeView(){
 const d=state.compose,noticeType=['通知','作业通知'].includes(d.type);
 return `${back('manage')}${title('发布日常任务','阅读范围、处理对象和提醒接收分别确认')}
 <div class="sc-fields">${field('任务类型',select('sc-task-type',['通知','作业通知','准备事项','信息采集','待办'],d.type))}
 ${field('标题',`<input id="sc-task-title" value="${e(d.title)}">`)}${field('内容',`<textarea id="sc-task-body">${e(d.body)}</textarea>`)}
 ${field('谁可以阅读',`<select id="sc-read-scope"><option value="CLASS_PUBLIC" ${d.readScope==='CLASS_PUBLIC'?'selected':''}>本班公共说明</option><option value="TARGET_PRIVATE" ${d.readScope==='TARGET_PRIVATE'?'selected':''}>仅目标家庭</option></select>`)}
 <fieldset><legend>处理对象 · 可组合</legend><div class="sc-grid">${['全体学生','女生','男生','合唱队','学生多选'].map(v=>`<label class="sc-check"><input name="sc-scope" type="checkbox" value="${v}" ${d.scopes.includes(v)?'checked':''}>${v}</label>`).join('')}</div></fieldset>
 ${d.scopes.includes('学生多选')?`<fieldset><legend>选择学生</legend>${students.slice(0,6).map(s=>`<label class="sc-check"><input type="checkbox" name="sc-student" value="${s.id}" ${d.picks.includes(s.id)?'checked':''}>${s.name}</label>`).join('')}</fieldset>`:''}
 ${field(noticeType?'截止时间（选填）':'截止时间（必填）',`<input id="sc-task-deadline" type="datetime-local" value="${e(d.deadline)}">`)}
 ${noticeType?check('sc-task-confirm','需要确认收到（不代表事项完成）',d.ack):''}
 ${(!noticeType||d.ack)?field('普通事务回执粒度',`<select id="sc-completion-mode"><option value="PER_STUDENT" ${d.mode==='PER_STUDENT'?'selected':''}>每个孩子任一亲属确认</option><option value="PER_RELATIVE" ${d.mode==='PER_RELATIVE'?'selected':''}>每位亲属分别确认</option></select>`):''}
 ${d.type==='信息采集'?`${field('填写方式',select('sc-collection-mode',['原生回填','腾讯文档'],d.collection))}${d.collection==='腾讯文档'?field('腾讯文档链接',`<input id="sc-external-url" type="url" placeholder="粘贴已配置权限的腾讯文档链接" value="${e(d.url)}">`):note('使用“参加／不参加＋材料份数”事务模板。')}${check('sc-verify-required','需要管理员核验',d.verify)}`:''}
 </div><div class="sc-actions">${action('preview-publish','预览发布')}</div>`;
}
function publishedSummary(d,preview=false){
 const target=targetStudents(d),relativeCount=target.reduce((a,s)=>a+s.relatives,0),noticeType=['通知','作业通知'].includes(d.type);
 return `${back(preview?'compose':'home')}${title(preview?'发布预览':e(d.title),e(d.type)+' · '+(preview?'核对后发布':'已发布，模拟数据'))}
 ${card(`<h3>${e(d.title)}</h3><p>${e(d.body)}</p><div class="sc-flow"><p>谁能看：${d.readScope==='CLASS_PUBLIC'?'本班有阅读资格的家庭':'仅目标家庭'}及有权管理者</p><p>目标范围：${e(d.scopes.join('＋'))}</p><p>谁要做：${noticeType&&!d.ack?'无需回执，仅阅读':target.length+' 位学生对应的'+(d.mode==='PER_RELATIVE'?'每位亲属':'家庭')}</p><p>提醒接收：${target.length} 位学生 · ${relativeCount} 条有效亲属关联</p><p>按家庭接收偏好去重外发 · 无有效亲属：0 人 · 微信人数待真实订阅核验</p><p>截止：${d.deadline?e(d.deadline.replace('T',' ')):'未设置（普通通知）'}</p><p>${noticeType?(d.ack?'确认收到，与完成分开':'无需确认收到或完成'):'普通事务回执，不作为正式授权'}</p>${d.type==='信息采集'?`<p>填写方式：${d.collection} · ${d.verify?'须管理员核验':'无需额外核验'}</p>`:''}</div>`)}
 ${preview?`<div class="sc-actions">${action('publish','确认发布')}</div>`:publicationControls(d)}`;
}

function publicationControls(d){
 const status=state.publicationResult;
 if(d.type==='信息采集')return `${note(d.collection==='腾讯文档'?'打开外部文档不算提交，自报后等待核验。':'原生事务回填 · 参加意向与正式授权分开。')}${d.collection==='原生回填'?field('填写参加意向',select('sc-published-choice',['参加','不参加'],status?.choice||'参加')):''}<div class="sc-actions">${d.collection==='腾讯文档'?action('external','查看外部填写指引',false,true):''}${action('complete-publication',d.collection==='腾讯文档'?'我已填写':'提交原生答复')}</div>${status?card(`<p>${e(status.text)}</p>`):''}`;
 if(['通知','作业通知'].includes(d.type)&&!d.ack)return note('仅阅读，无需确认收到或完成；未发送真实提醒。');
 return `<div class="sc-actions">${action('complete-publication',d.ack?'确认收到':'标记事项完成',!!status)}</div>${status?card(`<p>${e(status.text)}</p>`):''}`;
}

function formView(){
 const r=state.responses[state.formChild],cancelled=state.activityCancelled;
 return `${back('activity')}${title('秋游参加意向','普通事务回填 · 周五 18:00 截止')}${field('选择孩子',`<select id="sc-form-child"><option value="s0" ${state.formChild==='s0'?'selected':''}>林小禾</option><option value="s1" ${state.formChild==='s1'?'selected':''}>林小满</option></select>`)}
 ${card(`${field('是否参加',select('sc-attendance',['参加','不参加'],r?.choice||'参加'))}${field('材料份数',`<input id="sc-quantity" type="number" min="0" max="10" value="${r?.quantity??1}">`)}${r?`<p>已答复：${r.choice} · ${r.quantity} 份 · 版本 ${r.version}</p><p class="sc-muted">该孩子已停止填写催办；另一孩子单独处理。</p>`:''}`)}
 ${note(cancelled?'活动已取消，本次表单不再接受提交。':'参加意向不代表已取得正式监护人授权；不参加同样算已答复。')}
 <div class="sc-actions">${action('save-form',r?'修改答复':'提交答复',cancelled)}${nav('external-collect','查看外部采集示例')}</div>`;
}
function registrationView(){
 const rows=state.registrations;
 return `${back('activity')}${title('志愿者代报名','报名人是实际成人，填写人是孩子的关联家长')}
 ${card(`<p>代填人：林小禾妈妈 · 有效关联家长</p><p class="sc-muted">可关联林小禾、林小满；同一成人同岗位只占一个名额。</p>`)}
 ${field('整项报名方式',select('sc-vol-mode',['原生代报名','腾讯文档'],state.volunteerMode))}
 ${state.volunteerMode==='腾讯文档'?`${note('本项使用腾讯文档采集。填写后仅记录待核验，由管理员核实名单和名额；不自动确认报名。')}<div class="sc-actions">${action('external','查看填写指引',false,true)}${action('declare-vol','我已填写，待核验',state.activityCancelled)}</div>`:
 `${field('实际参与人',`<select id="sc-participant">${state.participants.map(p=>`<option value="${p.id}">${e(p.name)}</option>`).join('')}<option value="new">新增一位实际成人</option></select>`)}<div id="sc-new-participant" hidden>${field('参与人称呼',`<input id="sc-participant-name" placeholder="例如林奶奶，不要求注册">`)}</div>
 ${field('岗位 / 时段',select('sc-vol-slot',['摄影','布置'],state.volunteerSlot))}<p class="sc-muted">9 月 18 日 09:00–11:00 · 摄影 1 位、布置 2 位</p>
 ${check('sc-proxy-consent','已与参与人沟通，并征得其同意报名')}
 <div class="sc-actions">${action('register-vol','提交代报名',state.activityCancelled)}</div>`}
 <div class="sc-section"><h3>本家庭报名记录</h3></div><div class="sc-stack">${rows.length?rows.map((r,i)=>card(`<h3>${e(r.name)} · ${e(r.slot)}</h3><p>${badge(r.status,r.status!=='已确认')}</p><p class="sc-muted">${r.source} · 提醒给代填家长，请自行转告实际参与人</p>${r.status==='候补待确认'?`<div class="sc-actions"><button class="sc-btn" data-vol-confirm="${i}">确认替补名额</button></div>`:''}${['已确认','候补','候补待确认','外部待核验'].includes(r.status)?`<div class="sc-actions"><button class="sc-btn secondary" data-vol-cancel="${i}">退出本次报名</button></div>`:''}${canManage()&&r.status==='外部待核验'?`<div class="sc-actions"><button class="sc-btn" data-vol-review="${i}">核实名单后确认</button></div>`:''}`)).join(''):card('<p>暂无本家庭报名</p>')}</div>${canManage()?`<div class="sc-actions">${action('expire-offer','释放逾期未确认的替补名额',!rows.some(r=>r.status==='候补待确认'),true)}</div>`:''}`;
}
function activityView(){
 return `${back()}${title('秋游活动','9 月 18 日 · 校外实践基地')}${card(`<div class="sc-row"><h3>当前安排</h3>${badge(state.activityCancelled?'已取消':'报名中',state.activityCancelled)}</div><p>维护负责人：${e(state.activityOwner)}</p><p>活动版本：${state.activityCancelled?2:1}</p><p>准备：水杯、帽子、运动鞋</p><p>参加意向：${Object.values(state.responses).filter(r=>r.choice==='参加').length} 位示例孩子</p><p>正式授权：${state.consentVerified?'学校原渠道已核验':'待学校原渠道核验'}</p>`)}
 <div class="sc-actions">${nav('collect','填写参加意向')}${nav('volunteer','家长志愿岗位')}</div><div class="sc-actions">${nav('materials','活动物资')}${nav('activity-fee','活动费用处置')}</div>
 ${note(state.activityCancelled?'报名和准备待办已关闭；原回执保留，费用继续核对处置。':'普通报名与正式授权分开。正式授权请按学校通知通过原有渠道完成。')}
 ${canManage()?`<div class="sc-actions">${nav('owners','维护负责人')}${canConsent()?nav('consent','登记线下授权核验'):''}${nav('activity-cancel','预览取消活动')}</div>`:''}`;
}
function financeView(){
 const published=state.feePublished,received=published?2000:1950,balance=received-950;
 return `${title('班级费用公示','环境维护费 · 本班逐孩子公示')}${card(`<p>公示账面结余</p><strong class="sc-amount" style="font-size:32px">¥${balance.toLocaleString()}</strong><p>实收 ¥${received} − 支出 ¥900 − 退款 ¥50</p><p class="sc-muted">公示版本 ${published?2:1} · 截止 9 月 9 日 ${published?'16:00':'09:00'}</p><p>负责人：${e(state.owner)}</p><p>实际资金最后核对：9 月 8 日 17:00</p>`)}
 ${state.verified&&!published?note('新收款已复核入账，公示待生成及审核。这里仍展示完整的上一版本。'):''}
 <div class="sc-tabs"><button data-finance="payment" aria-pressed="${state.financeTab==='payment'}">缴费明细</button><button data-finance="expense" aria-pressed="${state.financeTab==='expense'}">资金使用</button><button data-finance="balance" aria-pressed="${state.financeTab==='balance'}">核对与历史</button></div>
 ${state.financeTab==='payment'?card(`<table><thead><tr><th>学生</th><th>应缴</th><th>净缴</th><th>状态</th></tr></thead><tbody>${[['林小禾',50,50,'已缴'],['林小满',50,50,'已缴'],['陈若溪',50,50,'已缴'],['许知夏',50,published?50:0,published?'已缴':'未缴'],['陆小川',0,0,'已退款']].map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="sc-muted">5 位示例学生 / 全班 40 位；金额单位：元。表格与余额来自同一公示版本。</p>`):''}
 ${state.financeTab==='expense'?card(`${listItem('sparkles','教室清洁 · ¥600','陈委员经办 / 沈委员复核','voucher')}${listItem('flower-2','布置材料 · ¥300','林委员经办 / 沈委员复核','voucher-material')}<p class="sc-muted">班内只看脱敏副本，原始凭证仅指定财务职责可读。</p>`):''}
 ${state.financeTab==='balance'?card(`<p>公示 v1：实收 ¥1,950，余额 ¥1,000</p>${published?'<p>公示 v2：新增收款 ¥50，余额 ¥1,050</p>':''}<p>上次实际核对差异：¥0（9 月 8 日 17:00）</p><p>${state.verified?'新增收款后需纳入下一次实际资金核对。':'本次新增申报尚未完成入账。'}</p><p>结余处置：本期继续保管，结项另行公示。</p>`):''}
 <div class="sc-actions">${nav('my-payment','自家缴费状态')}${canManage()?nav('finance-review','财务工作台'):''}</div>`;
}
function financeWorkbench(){
 return `${back('finance')}${title('财务工作台','核实入账与公示发布分开')}${card(`<h3>许知夏 · ¥50</h3><p>来源：家长申报，经办陈委员已核实流水</p><p>复核职责：沈委员 / 周老师（演示已指派）</p><p>最新账本：${state.verified?'已入账 ¥50；不再催款':'待另一位管理者复核'}</p><p>班内公示：${state.feePublished?'v2 已发布':state.verified?'v1 · 待更新':'v1'}</p>${check('sc-reconcile-check','已核对到账、孩子归属及疑似重复',state.verified)}<div class="sc-actions">${action('verify','复核入账',state.verified||!canFinanceReview())}</div>`)}
 <div class="sc-actions">${action('publish-finance','生成并审核发布公示',!state.verified||state.feePublished)}${nav('reminders','催款计划与同步')}</div>
 ${card(`<h3>匹配与待跟进</h3><p>待核对申报：${state.feeClaim?1:0} 笔（活动费用）</p><p>疑似重复：0 笔 · 待分配：0 元</p><p>匹配建议需逐笔核对，姓名相同不自动认定。</p>`)}<div class="sc-actions">${nav('handover','财务与职责交接')}</div>`;
}
function remindersView(){
 const blocked=state.feeClaim||state.activityCancelled,remaining=Math.max(0,2-state.paymentReminders);
 return `${back('finance-review')}${title('催款与同步','同一接收人跨费用事项每日最多两次')}
 ${note('款项同步可能有延迟，如果已交款请忽略。')}
 ${card(`<h3>发送前核对</h3><p>环境维护费 · 许知夏：${state.verified?'已复核入账，停止催款':'待复核，暂不催款'}</p><p>活动材料费 · 林小禾：${state.activityCancelled?'活动已取消，待费用处置':state.feeClaim?'家长自报已交，暂停催款并待核对':'账面尚未核实，拟提醒代填家长'}</p><p>今日已模拟催款 ${state.paymentReminders} 次 · 剩余额度 ${remaining} 次</p><p>演示时钟：9 月 9 日 ${state.clockHour}:00</p><p class="sc-muted">手动自动共用额度；两小时间隔，22:00–08:00 不发送。</p>`)}
 <div class="sc-actions">${action('simulate-payment-reminder','模拟一次催款',blocked||remaining===0)}${action('advance-clock','模拟两小时后',state.clockHour>=22,true)}</div>
 ${card(`<p>拟发给林小禾关联家长：</p><p>活动材料费尚未核实，请查看缴费说明。款项同步可能有延迟，如果已交款请忽略。</p><p class="sc-muted">仅演示计划计数，不发送消息、不发生收费。</p>`)}
 <div class="sc-actions">${nav('my-payment','查看家长自报入口')}</div>`;
}
function handoverView(){
 const active=state.handoverState==='ACTIVE',accepted=state.handoverState==='ACCEPTED';
 const items=[['tasks','未完成事项','活动报名 1 项、彩纸准备 1 项，继续跟进'],['knowledge','知识库','体育准备、家长会资料；保留原作者及版本'],['activities','活动负责人','秋游及志愿岗位、物资清单'],['finance','财务账目与材料','公示 v'+(state.feePublished?2:1)+'、未核对款项、余额及后续核对'],['grants','旧授权撤销','沈委员的家委会角色及指定委托/财务职责；保留家长身份']];
 return `${back('manage')}${title('换届与职责交接','沈委员 → 李委员 · 原记录与账本保留')}${card(`<p>交接状态：${({DRAFT:'待盘点',AWAITING_ACCEPTANCE:'待李委员接收',ACCEPTED:'已接收，待有权者生效',ACTIVE:'已生效'})[state.handoverState]}</p><p>旧管理授权：${state.oldGrantActive?'有效':'已撤销'}</p><p>新管理授权：${active?'有效':'预备，尚未生效'}</p><p>财务安排：李委员经办 / 周老师复核</p><p>未核对款项继续承接，不视为账目已平。</p>`)}
 <div class="sc-stack">${items.map(([key,label,description])=>card(`<h3>${label}</h3><p class="sc-muted">${description}</p><label class="sc-check"><input type="checkbox" data-handover-item="${key}" ${state.handoverChecks[key]?'checked':''} ${state.handoverState!=='DRAFT'?'disabled':''}>已盘点，待新负责人接收</label>`)).join('')}</div>
 <div class="sc-actions">${state.handoverState==='DRAFT'?action('submit-handover','提交交接清单'):''}${state.handoverState==='AWAITING_ACCEPTANCE'?action('accept-handover','李委员确认接收',state.role!=='successor'):''}${accepted?action('activate-handover','批准交接并撤销旧授权',!canActivate()):''}</div>
 ${state.handoverState==='AWAITING_ACCEPTANCE'?note('切换“李委员（接收人）”确认接收；清单接收本身不会授予管理权限。'):accepted?note('切换老师或系统管理员批准生效。'):''}
 <div class="sc-section"><h3>变更记录</h3></div>${card(state.audit.length?state.audit.map(t=>`<p>${e(t)}</p>`).join(''):'<p>尚未发生交接变更</p>')}`;
}
function extraView(html){
 const d=state.compose;
 switch(state.page){
 case 'compose':return composeView();
 case 'publish-preview':return state.draft?publishedSummary(state.draft,true):composeView();
 case 'published':return state.published?publishedSummary(state.published):html;
 case 'collect':return formView();
 case 'volunteer':return registrationView();
 case 'activity':return activityView();
 case 'activity-cancel':return `${back('activity')}${title('取消活动预览','整个活动统一生效，保留历史')}${card('<p>关闭参加意向表及志愿报名</p><p>撤销未来安排和未完成准备待办</p><p>向原家庭生成最小取消告知</p><p>款项进入待核对/退款处置，不自动退款</p>')}${check('sc-cancel-check','已核对上述关联影响')}<div class="sc-actions">${action('cancel-activity','确认取消活动',state.activityCancelled)}</div>`;
 case 'activity-fee':return `${back('activity')}${title('活动费用处置','活动材料费 · 与环境维护费分开')}${card(`<p>应缴：¥20 / 孩子（示例）</p><p>当前申报：${state.feeClaim?'家长自报已交，待核实':'尚无本家庭申报'}</p><p>${state.activityCancelled?'活动已取消：停止催款，先核对实际收款，再登记退款/分摊调整。':'报名与缴费分别处理。'}</p><p>实际退款：尚未登记</p>`)}${note('取消活动不代表已经退钱，所有账目更正仍需复核。')}`;
 case 'consent':return `${back('activity')}${title('正式授权核验','学校原渠道 · 管理者登记')}${card('<p>对象：林小禾 / 秋游活动</p><p>授权说明版本：学校秋游授权说明 v1</p><p>本页面不签署授权，普通报名或准备完成不替代监护人决定。</p>')}${check('sc-consent-check','已按学校原渠道核验对应授权材料',state.consentVerified)}<div class="sc-actions">${action('verify-consent','记录核验结果',state.consentVerified||!canConsent())}</div>`;
 case 'finance':return financeView();
 case 'finance-review':return financeWorkbench();
 case 'reminders':return remindersView();
 case 'my-payment':return `${back('finance')}${title('自家缴费状态','林小禾 · 最新申报独立于公示')}${card('<p>环境维护费：已核实 ¥50</p>')}${card(`<p>活动材料费：${state.feeClaim?'已自报，待核对':'尚未核实到账'}</p><p>登记负责人：${e(state.owner)}</p><p>最后同步：9 月 9 日 ${state.clockHour}:00（演示）</p>`)}${note('款项同步可能有延迟，如果已交款请忽略。自报后暂停该项催款，核实前不增加实收。')}<div class="sc-actions">${action('report-paid','我已交款，待核对',state.feeClaim||state.activityCancelled)}${nav('activity-fee','查看活动费用')}</div>`;
 case 'handover':return handoverView();
 case 'owners':return `${back('manage')}${title('维护负责人','指派维护人，保留原作者与历史')}${card(`<p>未完成事项：${e(state.taskOwner)} · 截止 9 月 11 日</p><p>公共知识：${e(state.knowledgeOwner)} · 原发布周老师</p><p>秋游活动：${e(state.activityOwner)}</p>`)}${field('指派给现有本班管理者',select('sc-owner',['沈委员','周老师'],state.taskOwner))}<div class="sc-actions">${action('assign-owner','更新三项维护负责人')}${nav('handover','换届及权限交接')}</div>`;
 case 'notification-settings':return `${back('profile')}${title('提醒偏好','站内事项对所有有效关联亲属保留')}${field('家庭主要外部提醒接收人',select('sc-primary',['所有关联亲属','林小禾妈妈','林小禾爸爸'],state.primaryRecipient))}${card('<p>普通外发每日最多 2 次，全部外发每日最多 4 次。</p><p>催款包含在普通额度中，每天最多 2 次。</p><p>两小时间隔 · 22:00–08:00 免打扰</p><p>逐亲属确认仍分别提醒；志愿报名提醒代填责任人。</p>')}<div class="sc-actions">${action('save-preference','保存接收偏好')}${action('subscribe','查看微信订阅状态',false,true)}</div>`;
 case 'materials':return `${back('activity')}${title('活动物资','轻量认领与归还 · 后续能力预览')}${card(`<h3>折叠展示架 × 2</h3><p>保管人：${e(state.activityOwner)}</p><p>状态：${state.materialStatus}</p><p>关联活动：秋游展示 · 无新增采购支出</p>`)}<div class="sc-actions">${action('claim-material','认领物资',state.materialStatus!=='待认领'||state.activityCancelled)}${action('receive-material','登记领取',state.materialStatus!=='已认领'||state.activityCancelled)}${action('return-material','登记归还',state.materialStatus!=='已领取')}</div>`;
 case 'art-prep':return `${back('schedule')}${title('美术课准备','同一课程事件 · 第 '+state.artRound+' 轮')}${card(`<p>物品：${e(state.artMaterial)}</p><p>9 月 9 日 ${state.swapped?'10:20':'14:00'} 前准备</p><p>状态：${state.artDone?'已完成准备，停止催办':'待准备'}</p>`)}<div class="sc-actions">${action('complete-art','准备完成',state.artDone)}</div>${note('仅改时间保留完成；新材料需明确选择重新确认。')}`;
 case 'change-inbox':return `${back()}${title('与你有关的变更','仅保留当前家庭必要的结果')}${state.dutyChanged?card('<h3>林小禾本次值日已移出</h3><p>9 月 9 日 16:10 不再需要按旧安排值日。</p><p>旧催办已停止，不展示新对象的私有待办。</p>'):''}${state.activityCancelled?card('<h3>秋游活动已取消</h3><p>本次准备及报名无需继续，费用另行核对处置。</p>'):''}${!state.dutyChanged&&!state.activityCancelled?card('<p>暂无相关变更</p>'):''}`;
 case 'course-permission':return `${back('manage')}${title('课程维护委托','包含编辑、发布和撤销；限本班')}${card(`<p>对象：沈委员</p><p>委托：${state.courseDelegated?'有效':'未授予'}</p>`)}<div class="sc-actions">${action('toggle-course-grant',state.courseDelegated?'撤销课程委托':'授予课程委托',!canActivate()||!state.oldGrantActive)}</div>`;
 }
 if(state.page==='home')html+=`<div class="sc-section"><h3>班级协作</h3></div><div class="sc-surface">${listItem('users','秋游与志愿报名','关联家长可为未注册成人代填','activity')}${listItem('bell','与你有关的变更','取消、换人单独告知','change-inbox')}${listItem('book-open','公共资料','入学准备、家长会、阅读活动','knowledge')}</div>`;
 if(state.page==='tasks'){html=html.replace('腾讯文档填写','小程序直接回填').replace('查看自报状态','查看答复');if(state.activityCancelled)html=html.replace('周五 18:00 前 · 小程序直接回填','活动已取消 · 本次不再需要填写').replace('前往填写','查看取消状态').replace('查看答复','查看历史答复');}
 if(state.page==='schedule'&&state.scheduleTab==='course')html+=`<div class="sc-actions">${nav('art-prep','查看美术准备事项')}${canCourse()&&state.role==='committee'?nav('adjust','临时调整'):''}</div>`;
 if(state.page==='schedule'&&state.scheduleTab==='duty'&&state.dutyChanged)html+=`<div class="sc-actions">${nav('change-inbox','查看本家庭移出告知')}</div>`;
 if(state.page==='adjust')html+=`${check('sc-art-new-round','更换为新材料并要求重新确认')}<p class="sc-muted">当前彩纸准备：${state.artDone?'已完成':'未完成'}；不勾选时保持原轮次和完成状态。</p><div class="sc-actions">${action('swap','确认本次调整')}</div>`;
 if(state.page==='manage')html+=`<div class="sc-section"><h3>协作与透明交接</h3></div><div class="sc-managegrid">${[['activity','活动与志愿者'],['owners','维护负责人'],['handover','换届交接'],['reminders','催款与信息同步'],['course-permission','课程维护委托'],['materials','活动物资']].map(([p,l])=>`<button data-go="${p}">${l}</button>`).join('')}</div>`;
 if(state.page==='knowledge')html+=`${card(`<h3>家长会与阅读资料</h3><p>来源：学校公共办事说明 v${state.knowledgeVersion}</p><p>维护人：${e(state.knowledgeOwner)} · 原作者不变</p><p>有效至：${e(state.knowledgeValid)}</p><p>分类：入学准备 / 家长会 / 阅读 / 家庭教育</p>`)}${canManage()?`${field('维护有效期',`<input id="sc-knowledge-date" type="date" value="${e(state.knowledgeValid)}">`)}<div class="sc-actions">${action('save-knowledge-date','更新有效期并保存版本')}${nav('owners','维护负责人')}</div>`:''}`;
 return html;
}
function extraAction(a,b){
 const managerActions=new Set(['preview-publish','publish','verify','publish-finance','simulate-payment-reminder','advance-clock','cancel-activity','verify-consent','assign-owner','submit-handover','activate-handover','save-knowledge-date','toggle-course-grant','expire-offer','swap','duty-change','approve']);
 if(managerActions.has(a)&&!canManage()){notice('当前管理授权无效，请切换有权身份');return true;}
 if(b.dataset.volCancel!==undefined){const r=state.registrations[Number(b.dataset.volCancel)];if(!r)return true;r.status='已退出';const next=state.registrations.find(x=>x.slot===r.slot&&x.status==='候补');if(next)next.status='候补待确认';render();notice('报名已退出；有候补时发出待确认名额，未自动替其接受');return true;}
 if(b.dataset.volConfirm!==undefined){const r=state.registrations[Number(b.dataset.volConfirm)];if(r?.status==='候补待确认')r.status='已确认';render();return true;}
 if(b.dataset.volReview!==undefined){if(!canManage()){notice('需有权管理员核验');return true;}const r=state.registrations[Number(b.dataset.volReview)];if(r?.status==='外部待核验'){const used=state.registrations.filter(x=>x.slot===r.slot&&['已确认','候补待确认'].includes(x.status)).length;r.status=used>=(r.slot==='摄影'?1:2)?'候补':'已确认';}render();notice('已模拟核验外部名单；未调用腾讯文档');return true;}
 const by=id=>root.querySelector('#'+id);
 switch(a){
 case 'preview-publish':{
 readCompose();const d=state.compose,noticeType=['通知','作业通知'].includes(d.type);
 if(!d.title.trim()||!d.body.trim()){notice('请填写标题与内容');return true;}
 if(!noticeType&&!d.deadline){notice('采集和待办必须填写截止时间');return true;}
 if(!targetStudents(d).length){notice('请至少选择一位处理对象');return true;}
 if(d.type==='信息采集'&&d.collection==='腾讯文档'){try{const u=new URL(d.url);if(u.protocol!=='https:'||u.hostname!=='docs.qq.com')throw new Error();}catch{notice('请填写有效的 HTTPS 腾讯文档链接');return true;}}
 state.draft=JSON.parse(JSON.stringify(d));state.draft.scope=d.scopes.join('＋');state.draft.count=targetStudents(d).length;go('publish-preview');return true;}
 case 'publish':state.publicationResult=null;state.published=JSON.parse(JSON.stringify(state.draft));go('published');notice('已模拟发布；无实际外发');return true;
 case 'complete-publication':{
 const d=state.published;if(!d)return true;
 const choice=by('sc-published-choice')?.value;
 state.publicationResult={choice,text:d.type==='信息采集'?(d.collection==='腾讯文档'?'亲属自报已填写，暂停催办；'+(d.verify?'待管理员核验':'自报完成，非外部提交验证'):'已答复：'+choice+(d.verify?' · 待管理员核验':'')):(d.ack?'已确认收到，不代表事项完成':'已标记事项完成；普通回执不代替正式授权')};render();return true;}
 case 'save-form':{
 if(state.activityCancelled){notice('活动已取消');return true;}
 const q=Number(by('sc-quantity').value),choice=by('sc-attendance').value;
 if(!Number.isInteger(q)||q<0||q>10){notice('份数须为 0–10 的整数');return true;}
 state.responses[state.formChild]={choice,quantity:choice==='不参加'?0:q,version:(state.responses[state.formChild]?.version||0)+1};state.submitted=!!state.responses.s1;render();notice('已保存答复，不参加也算已答复；未登记正式授权');return true;}
 case 'register-vol':{
 if(state.activityCancelled){notice('活动已取消');return true;}if(!by('sc-proxy-consent').checked){notice('请先确认参与人已同意报名');return true;}
 let participant=state.participants.find(p=>p.id===by('sc-participant').value);
 if(!participant){let name=by('sc-participant-name').value.trim();if(!name){notice('请填写参与人称呼');return true;}if(state.participants.some(p=>p.name===name)){notice('已有同名参与人，请先核对并选择已有记录');return true;}participant={id:'adult-'+(state.participants.length+1),name};state.participants.push(participant);}
 const slot=by('sc-vol-slot').value,existing=state.registrations.find(r=>r.participantId===participant.id&&r.slot===slot&&!['已退出','已取消'].includes(r.status));if(existing){notice('同一成人已经报名该岗位，不重复占名额');return true;}
 const used=state.registrations.filter(r=>r.slot===slot&&['已确认','候补待确认'].includes(r.status)).length;
 state.registrations.push({participantId:participant.id,name:participant.name,slot,status:used>=(slot==='摄影'?1:2)?'候补':'已确认',source:'关联家长代填'});render();notice('报名状态已更新；实际志愿者无需注册，提醒发给代填家长');return true;}
 case 'declare-vol':if(!state.activityCancelled&&!state.registrations.some(r=>r.source==='腾讯文档'&&!['已退出','已取消'].includes(r.status)))state.registrations.push({participantId:'adult-1',name:'林爸爸（未注册）',slot:'摄影',source:'腾讯文档',status:'外部待核验'});render();notice('仅自报填写，尚未核验或占用名额');return true;
 case 'expire-offer':state.registrations.filter(r=>r.status==='候补待确认').forEach(r=>{r.status='已退出';const next=state.registrations.find(x=>x.slot===r.slot&&x.status==='候补');if(next)next.status='候补待确认';});render();notice('已演示释放到期名额');return true;
 case 'verify':if(!canFinanceReview()){notice('当前无指定复核职责');return true;}if(!by('sc-reconcile-check').checked){notice('请先核对到账及重复记录');return true;}state.verified=true;log('沈委员/有权复核者核实环境维护费 ¥50；公示另行更新');go('finance-review');notice('已模拟入账，停止该款催办；公示仍为完整旧版本');return true;
 case 'publish-finance':if(state.verified){state.feePublished=true;log('公示 v2 发布：实收 ¥2,000，余额 ¥1,050');}go('finance');return true;
 case 'report-paid':state.feeClaim=true;render();notice('自报已交，暂停该项催款；实收未改变');return true;
 case 'simulate-payment-reminder':
 if(state.feeClaim||state.activityCancelled){notice('已暂停该项催款');return true;}
 if(state.paymentReminders>=2){notice('今日两次额度已用完');return true;}
 if(state.clockHour>=22||state.clockHour<8){notice('免打扰时段不外发');return true;}
 if(state.reminderHours.length&&state.clockHour-state.reminderHours.at(-1)<2){notice('距离上次不足两小时，本次未计数');return true;}
 state.paymentReminders++;state.reminderHours.push(state.clockHour);render();notice('已模拟一次计划：如果已交款请忽略。没有发送微信消息');return true;
 case 'advance-clock':state.clockHour=Math.min(22,state.clockHour+2);render();return true;
 case 'cancel-activity':if(!by('sc-cancel-check').checked){notice('请先核对影响清单');return true;}state.activityCancelled=true;state.registrations.forEach(r=>{if(r.status!=='已退出')r.status='已取消'});log('秋游取消：准备及报名关闭，费用待核对处置');go('activity');return true;
 case 'verify-consent':if(!canConsent()){notice('当前无正式授权核验记录权限');return true;}if(!by('sc-consent-check').checked){notice('请先核验学校原渠道的授权');return true;}state.consentVerified=true;go('activity');notice('已模拟记录线下核验，不是在线签署');return true;
 case 'save-preference':state.primaryRecipient=by('sc-primary').value;render();notice('外部提醒偏好已保存，所有有效亲属仍可查看站内事项');return true;
 case 'assign-owner':state.taskOwner=state.knowledgeOwner=state.activityOwner=by('sc-owner').value;log('三项维护负责人改为'+state.taskOwner+'；原作者、权限层级保留');render();return true;
 case 'save-knowledge-date':if(!by('sc-knowledge-date').value){notice('请填写有效期');return true;}state.knowledgeValid=by('sc-knowledge-date').value;state.knowledgeVersion++;log('公共资料有效期维护，来源版本已更新');render();return true;
 case 'submit-handover':if(Object.values(state.handoverChecks).filter(Boolean).length!==5){notice('请盘点全部五类交接事项');return true;}state.handoverState='AWAITING_ACCEPTANCE';log('沈委员提交交接清单，未完成事项继续承接');render();return true;
 case 'accept-handover':if(state.role!=='successor'||state.handoverState!=='AWAITING_ACCEPTANCE'){notice('须由接收人确认当前清单');return true;}state.handoverState='ACCEPTED';log('李委员确认接收，尚未授予管理权限');render();return true;
 case 'activate-handover':if(!canActivate()||state.handoverState!=='ACCEPTED'){notice('需要有权者批准且接收人已确认');return true;}state.handoverState='ACTIVE';state.oldGrantActive=false;state.courseDelegated=false;state.owner=state.taskOwner=state.knowledgeOwner=state.activityOwner='李委员';log('周老师/系统管理员批准生效；沈委员旧管理及财务授权撤销，家长关系保留');render();return true;
 case 'toggle-course-grant':if(!canActivate()){notice('仅有权者可委托');return true;}state.courseDelegated=!state.courseDelegated;render();return true;
 case 'complete-art':state.artDone=true;render();return true;
 case 'swap':if(!canCourse()){notice('无课程维护权限');return true;}if(by('sc-art-new-round')?.checked){state.artRound++;state.artDone=false;state.artMaterial='水彩笔与画纸';}state.swapped=true;state.day=9;state.scheduleTab='course';go('schedule');notice('课程同时调整；'+(state.artDone?'已完成准备保留':'准备状态按当前轮次展示'));return true;
 case 'claim-material':state.materialStatus='已认领';render();return true;
 case 'receive-material':state.materialStatus='已领取';render();return true;
 case 'return-material':state.materialStatus='已归还';render();return true;
 }
 return false;
}
root.addEventListener('input',ev=>{if(state.page==='compose'&&['sc-task-title','sc-task-body','sc-task-deadline','sc-external-url'].includes(ev.target.id))readCompose();});
root.addEventListener('change',ev=>{
 const el=ev.target;
 if(el.dataset.handoverItem){state.handoverChecks[el.dataset.handoverItem]=el.checked;return;}
 if(state.page==='compose'){
 readCompose();if(el.id==='sc-task-type'){state.compose.type=el.value;state.compose.ack=false;}
 if(el.id==='sc-task-type'||el.name==='sc-scope'||el.id==='sc-task-confirm'||el.id==='sc-collection-mode')render();
 }
 if(el.id==='sc-form-child'){state.formChild=el.value;render();}
 if(el.id==='sc-participant')byParticipant();
 if(el.id==='sc-vol-slot')state.volunteerSlot=el.value;
 if(el.id==='sc-vol-mode'){
 if(state.registrations.some(r=>!['已退出','已取消'].includes(r.status))){el.value=state.volunteerMode;notice('已有报名记录，请先完成核对或退出后切换采集源');return;}
 state.volunteerMode=el.value;render();
 }
});
function byParticipant(){root.querySelector('#sc-new-participant').hidden=root.querySelector('#sc-participant').value!=='new';}

render();
if(globalThis.Tweak){const tweaks=new Tweak({container:root,onChange:render});tweaks.addSelect(state,'accent',{label:'配色',options:[{label:'青禾绿',value:'jade'},{label:'书页蓝',value:'blue'}]});tweaks.addSlider(state,'radius',{label:'圆角',min:8,max:24,step:2,unit:'px'})}
})();
