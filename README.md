# 家校信息协同小程序

当前主方案：微信小程序承载身份、孩子关联、通知任务、费用公示和知识库问答；微信订阅消息提供服务提醒；优先验证现有 NAS 与 Cloudflare Tunnel 作为后端。

当前交付为方案文档，尚未实现或部署小程序。需求基线日期：2026-09-08。

- [方案文档入口](docs/README.md)
- [产品需求](docs/requirements.md)
- [身份与权限](docs/permissions.md)
- [技术架构](docs/technical-architecture.md)
- [费用收取与公示](docs/finance.md)
- [数据模型与状态](docs/data-model.md)
- [可行性与平台验证](docs/feasibility-analysis.md)
- [实施计划与验收](docs/implementation-plan.md)
- [决策与待确认项](docs/decisions.md)

## 备选方案

原微信群自动应答设计、draw.io/SVG 架构图、Mac OCR 监听器及测试、启动/停止脚本保存在本地 Git 分支 `codex/alternative-wechat-monitor`，快照提交 `422cb3d40fc9702f3a8ebed270673a9fa2107da1`。该快照包含切换前尚未提交的代码与文档改动。

```sh
# 只读查看旧方案，不切换工作目录
git show codex/alternative-wechat-monitor:docs/README.md

# 工作区干净时切换；返回主方案使用 git switch main
git switch codex/alternative-wechat-monitor
```

主分支不再保留旧方案图表和监听器入口。本地 `.local/`、`.build/` 未纳入版本控制，仍保留原地；Git 切换不代表停止此前启动的进程。本次仅整理分支和文档，没有变更运行服务，也没有推送远端。
