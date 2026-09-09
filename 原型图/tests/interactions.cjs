// Run with NODE_PATH pointing to a runtime that provides Playwright; uses an isolated Chrome profile.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(6000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
 const results=[];
 const text=()=>page.locator('#sc-screen').innerText();
 const go=async name=>{await page.locator(`[data-go="${name}"]`).first().click();};
 const act=async name=>{await page.locator(`[data-action="${name}"]`).first().click();};
 const role=async value=>{await page.locator('#sc-persona').selectOption(value);};
 const fresh=async()=>{await page.goto(url);};
 const check=(condition,label)=>{assert.ok(condition,label);results.push(label);};
 try{
 await fresh();await role('teacher');await go('compose');
 check(await page.locator('#sc-task-deadline').inputValue()==='', '普通通知默认无截止');
 check(!await page.locator('#sc-task-confirm').isChecked(),'普通通知默认不要求确认');
 await act('preview-publish');check((await text()).includes('未设置（普通通知）'),'无截止通知可预览');await act('publish');
 check((await text()).includes('无需确认收到或完成'),'发布后保留通知语义');
 await role('teacher');await go('compose');await page.locator('#sc-task-type').selectOption('待办');await act('preview-publish');
 check((await page.locator('#sc-toast').innerText()).includes('必须填写截止'),'待办缺少截止被阻断');
 await page.locator('#sc-task-deadline').fill('2026-09-11T18:00');
 await page.locator('[name="sc-scope"][value="全体学生"]').uncheck();
 await page.locator('[name="sc-scope"][value="女生"]').check();await page.locator('[name="sc-scope"][value="合唱队"]').check();
 await page.locator('[name="sc-scope"][value="学生多选"]').check();await page.locator('[name="sc-student"][value="s3"]').check();
 await act('preview-publish');check((await text()).includes('20 位学生'),'女生与群组重叠去重，再加入男生为20人');
 await act('publish');check((await text()).includes('待办'),'任务类型保存到发布');await act('complete-publication');check((await text()).includes('已标记事项完成'),'待办详情有独立完成行为');
 await fresh();await role('teacher');await go('compose');await page.locator('#sc-task-type').selectOption('信息采集');await page.locator('#sc-task-deadline').fill('2026-09-11T18:00');await page.locator('#sc-collection-mode').selectOption('腾讯文档');await act('preview-publish');
 check((await page.locator('#sc-toast').innerText()).includes('HTTPS 腾讯文档'),'外部采集验证链接');await page.locator('#sc-external-url').fill('https://docs.qq.com/form/page/demo');await page.locator('#sc-verify-required').check();await act('preview-publish');await act('publish');await act('complete-publication');check((await text()).includes('待管理员核验'),'外部采集自报与核验分开');
 await fresh();await go('activity');await go('collect');await page.locator('#sc-attendance').selectOption('不参加');await act('save-form');check((await text()).includes('已答复：不参加'),'不参加算已答复');
 await page.locator('#sc-form-child').selectOption('s0');check(!(await text()).includes('已答复：'),'两个孩子的答复分开');await act('save-form');await go('activity');check((await text()).includes('待学校原渠道核验'),'报名不会产生正式授权');
 await go('volunteer');await page.locator('#sc-proxy-consent').check();await act('register-vol');check((await text()).includes('林爸爸（未注册）')&&(await text()).includes('已确认'),'可代未注册成人报名');
 await page.locator('#sc-proxy-consent').check();await act('register-vol');check((await page.locator('#sc-toast').innerText()).includes('不重复占名额'),'同成人重复报名不占位');
 await page.locator('#sc-participant').selectOption('adult-2');await page.locator('#sc-proxy-consent').check();await act('register-vol');check((await text()).includes('候补'),'满额进入候补');
 await page.locator('[data-vol-cancel="0"]').click();check((await text()).includes('候补待确认'),'退出后替补须确认');await page.locator('[data-vol-confirm="1"]').click();check(!(await text()).includes('候补待确认'),'替补确认后才占位确认');
 await fresh();await go('activity');await go('volunteer');await page.locator('#sc-vol-mode').selectOption('腾讯文档');await act('declare-vol');check((await text()).includes('外部待核验'),'外部自报不自动确认');
 await role('teacher');await go('activity');await go('volunteer');await page.locator('[data-vol-review="0"]').click();check((await text()).includes('已确认'),'管理员核验外部报名');
 await fresh();await go('schedule');await go('art-prep');await act('complete-art');await role('teacher');await go('schedule');await go('adjust');await act('swap');await go('art-prep');check((await text()).includes('已完成准备')&&(await text()).includes('10:20'),'移课保留完成与新时间');
 await go('schedule');await go('adjust');await page.locator('#sc-art-new-round').check();await act('swap');await go('art-prep');check((await text()).includes('第 2 轮')&&(await text()).includes('待准备'),'新材料显式开启新轮次');
 await role('committee');await go('schedule');check(await page.locator('[data-go="adjust"]').count()===0,'无委托家委会不能改课');await role('teacher');await go('course-permission');await act('toggle-course-grant');await role('committee');await go('schedule');await go('adjust');check((await text()).includes('临时串课'),'委托包含课程发布');
 await fresh();await role('teacher');await go('schedule');await page.locator('[data-schedule="duty"]').click();await go('duty-adjust');await act('duty-change');await role('parent');await go('change-inbox');check((await text()).includes('本次值日已移出')&&!(await text()).includes('周星然'),'旧家庭查看最小移出告知');
 await fresh();await role('committee');await go('finance-review');await page.locator('#sc-reconcile-check').check();await act('verify');await go('finance');check((await text()).includes('¥1,000')&&(await text()).includes('公示待生成'),'入账未公示时保持完整旧余额');
 await go('finance-review');await act('publish-finance');check((await text()).includes('¥1,050'),'审核公示才切换余额');
 await go('finance-review');await go('reminders');check((await text()).includes('已复核入账，停止催款'),'最新账本停催');
 await act('simulate-payment-reminder');await act('simulate-payment-reminder');check((await page.locator('#sc-toast').innerText()).includes('不足两小时'),'最小间隔阻断重复催款');await act('advance-clock');await act('simulate-payment-reminder');
 check(await page.locator('[data-action="simulate-payment-reminder"]').isDisabled(),'每天两次达到上限');check((await text()).includes('如果已交款请忽略'),'催款文案包含忽略提示');
 await fresh();await go('finance');await go('my-payment');await act('report-paid');await role('teacher');await go('reminders');check(await page.locator('[data-action="simulate-payment-reminder"]').isDisabled(),'自报待核对暂停催款');
 await fresh();await role('committee');await go('handover');await act('submit-handover');check((await page.locator('#sc-toast').innerText()).includes('全部五类'),'交接清单不完整不能提交');
 for(const key of ['tasks','knowledge','activities','finance','grants'])await page.locator(`[data-handover-item="${key}"]`).check();await act('submit-handover');await role('successor');await act('accept-handover');check(await page.locator('[data-action="activate-handover"]').isDisabled(),'接收不等于有权批准');
 await role('teacher');await go('handover');await act('activate-handover');check((await text()).includes('旧管理授权：已撤销'),'批准交接撤销旧管理授权');
 await go('manage');await go('owners');check((await text()).includes('未完成事项：李委员')&&(await text()).includes('公共知识：李委员')&&(await text()).includes('秋游活动：李委员'),'任务知识活动一起转维护人');
 await role('committee');check(!(await text()).includes('管理工作台'),'旧委员只保留家长访问');await role('successor');check((await text()).includes('管理工作台'),'接收人经批准获得管理入口');await go('finance-review');check(await page.locator('[data-action="verify"]').isDisabled(),'新经办角色不自动获得复核职责');
 await fresh();await role('teacher');await go('activity');await go('activity-cancel');await page.locator('#sc-cancel-check').check();await act('cancel-activity');await go('collect');check(await page.locator('[data-action="save-form"]').isDisabled(),'取消活动关闭原生答复');await go('activity');await go('activity-fee');check((await text()).includes('实际退款：尚未登记'),'取消不伪造已退款');await go('home');check(await page.locator('.sc-hero strong').innerText()==='1','取消后的采集不再计入未完成数');
 await fresh();await go('activity');await go('materials');await act('claim-material');await act('receive-material');await act('return-material');check((await text()).includes('已归还'),'物资认领领取归还链路');
 // Theme and width QA with actual browser boxes on major screens.
 for(const width of [320,390,736])for(const colorScheme of ['light','dark']){
  await page.setViewportSize({width,height:844});await page.emulateMedia({colorScheme});await fresh();await role('teacher');
  for(const name of ['compose','activity','finance-review','handover','knowledge']){
   await role('teacher');await go(name);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,`${name} ${width} ${colorScheme} overflow`);
   if(width===390&&(name==='handover'||name==='compose'))await page.screenshot({path:`/tmp/family-${name}-${colorScheme}.png`,fullPage:true});
  }
 }
 check(errors.length===0,'浏览器无脚本异常');
 console.log(JSON.stringify({passed:results.length,checks:results,layout:'320/390/736 px × light/dark × 5 screens passed',errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
