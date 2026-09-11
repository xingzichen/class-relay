# 家校信息协同小程序

当前主方案：微信小程序承载身份、孩子关联、通知任务、课程/值日安排、费用公示和公共知识问答；微信订阅消息提供服务提醒；全部后端采用腾讯云开发 CloudBase（云函数、文档型云数据库、云存储、定时触发器与 CloudBase AI）。

产品聚焦通知、作业要求、准备事项、公共解答、待办和日常安排等可复用场景，不承接反馈工单、冲突处理或敏感个案。

当前已交付方案文档、交互原型、原生小程序工程骨架与共享契约。P0-01/P0-02 已验收；新环境身份探针及诊断均已部署，真实调用仍因附加字段和无效预期配置未验收；运行时控制台与 IDE 回读不一致，待核验。P0-04 事务适配层和初始化预览本地通过，整包仍未验收。需求基线：0.6 · 2026-09-10。

- [方案文档入口](docs/README.md)
- [产品需求](docs/requirements.md)
- [身份与权限](docs/permissions.md)
- [AI 回复范围与语气红线](docs/ai-response-policy.md)
- [腾讯云 AI 能力与实施设计](docs/ai-cloudbase-design.md)
- [课程表、值日表与临时调整](docs/schedules.md)
- [腾讯云能力评估](docs/cloudbase-capability-assessment.md)
- [本地开发环境与腾讯云准备手册](docs/development-environment-and-tencent-cloud-setup.md)
- [技术架构](docs/technical-architecture.md)
- [费用收取与公示](docs/finance.md)
- [数据模型与状态](docs/data-model.md)
- [可行性与平台验证](docs/feasibility-analysis.md)
- [实施计划与验收](docs/implementation-plan.md)
- [细分开发计划（69 个开发包、单元测试与阶段验证）](docs/development-plan.md)
- [逐任务开发提示词（69 段，可独立复制）](docs/development-prompts.md)
- [决策与待确认项](docs/decisions.md)
- [Web 交互原型](原型图/index.html)（[本地打开说明](原型图/README.md)）

## 开发与验证

```sh
npm ci
npm run check
# 仅在指定开发云环境运行管理侧验证
npm run test:cloud:p0
```

正式 AppID `wx7d14c4114404f835` 与新环境 `cloud1-d2gndswq6641f6dd6` 已关联，本地配置已同步。44 项单元测试和完整 check 通过；当前无待确认的部署。新环境管理走微信开发者工具，现有 tcb 腾讯云账号无该环境权限；云端剩余问题见 [P0-03 记录](tests/verification/P0-03.md)。

- [任务与测试映射](tests/task-map.json)
- [P0-01 工程验收](tests/verification/P0-01.md)
- [P0-02 契约验收](tests/verification/P0-02.md)
- [P0-03 云端证据与当前阻塞](tests/verification/P0-03.md)
- [P0-04 事务适配层与待验证项](tests/verification/P0-04.md)

## 备选方案

原微信群自动应答设计、draw.io/SVG 架构图、Mac OCR 监听器及测试、启动/停止脚本保存在本地 Git 分支 `codex/alternative-wechat-monitor`，快照提交 `422cb3d40fc9702f3a8ebed270673a9fa2107da1`。该快照包含切换前尚未提交的代码与文档改动。

```sh
# 只读查看旧方案，不切换工作目录
git show codex/alternative-wechat-monitor:docs/README.md

# 工作区干净时切换；返回主方案使用 git switch main
git switch codex/alternative-wechat-monitor
```

主分支不再保留旧方案图表和监听器入口。本地 `.local/`、`.build/` 未纳入版本控制，仍保留原地；Git 切换不代表停止此前启动的进程。本次仅整理分支和文档，没有变更运行服务，也没有推送远端。

## 本轮统一规则与协作扩展

新增关联家长代填志愿报名/腾讯文档、原生事务回填、活动联动、每天最多两次催款、维护负责人交接和旧授权撤销。完整流程见[家委会协作与交接](docs/committee-workflows.md)，历史评审见[评审清单](docs/design-review-2026-09-09.md)。
