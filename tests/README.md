# 测试与当前开发状态

2026-09-11 · 需求基线 0.6 · 当前完成工程基础，不代表完整业务已交付。

| 开发包 | 状态 | 证据 |
|---|---|---|
| P0-01 工程与测试入口 | 已验收 | [记录](verification/P0-01.md) |
| P0-02 契约、幂等与夹具 | 已验收 | [记录](verification/P0-02.md) |
| P0-03 微信身份与环境隔离 | 新环境已关联且探针已部署，参数与配置待定位，客户端未验收 | [记录及恢复步骤](verification/P0-03.md) |
| P0-04 文档数据库与事务 | 开发中，事务适配层本地通过 | [记录](verification/P0-04.md) |
| P0-05 及后续 | 未开始 | [开发计划](../docs/development-plan.md) |

首次部署与两次增量均已成功，没有待确认请求。完整 check 可执行；当前 44 项单元测试通过。真实云端问题与证据见 P0-03 记录。

## 本地运行

使用 `.nvmrc` 中的 Node.js 22.22.1 与 npm 10.9.4：

```sh
npm ci
npm run check
npm run test:unit:coverage
npm run test:prototype
```

`check` 顺序运行 ESLint、TypeScript、构建和 Node 内置单元测试，任一失败即返回非零。单测共 44 项；测试文件映射见 [task-map.json](task-map.json)。锁文件固定全部依赖，云函数共享代码经 esbuild 打包；SDK 留在独立函数依赖中，不依赖仓库根目录的 `node_modules`。

首次克隆：参考 `config/environments.example.json`，在忽略的 `config/environments.local.json` 中只填写需要的 stage，删除未配置的 production 占位项；前端构建只读取此文件的白名单字段。`.env.local` 目前是本地配置备忘，`build` 不会从中自动加载配置。生产构建缺少独立配置会失败；无本地配置时开发构建仅提供不初始化云服务的空壳。

```sh
npm run build
# 将当前仓库下 dist/ 导入微信开发者工具
```

本机正式 AppID 为 `wx7d14c4114404f835`，开发配置已切换到微信新环境 `cloud1-d2gndswq6641f6dd6`，关联和空 NoSQL 集合查询成功。测试号保持停用，模型 `hy-mt2-pro` 仍为待验证候选。部署与运行时配置见 P0-03。

## 云端检查与部署边界

```sh
# 显式联网：只在本地映射与 cloudbaserc 一致的开发环境运行
npm run test:cloud:p0
```

当前 tcb 腾讯云账号无新环境管理权限，该管理脚本暂不能用于新环境验收；旧环境结果已明确标注范围。该命令只读函数状态/规则，调用无数据写入的探针，验证管理端不能冒充微信用户、伪造字段被拒绝、内部固定标记可由管理端读取。它不证明普通客户端被网关拒绝，也不证明真实 APPID/OPENID、双账号或热实例混合来源已通过。

需要重新部署时先 `npm run check`，再在 `dist/functions/p0Identity` 执行 `npm ci --omit=dev --ignore-scripts --workspaces=false`，按该函数锁文件准备依赖；随后仅部署指定探针，使用 `--install-dependency false`。普通 `build` 会重建函数目录，部署依赖须重新准备。不要部署尚为 `NOT_READY` 占位的 bootstrap；不要直接执行所有函数部署。

`config/p0-function-permissions.json` 是要合并的最小规则补丁，**不是整份环境规则**。`p0Identity` 继承环境当前规则；`p0Internal.invoke=false` 曾在旧环境落云，新环境尚未配置。环境级规则更新必须先回读并保留现有键，不得用补丁覆盖整份规则。内部探针仅用于验证网关是否可达，其函数体本身不是业务鉴权中间件。

`test:integration`、`test:e2e`、`test:ai-eval` 总入口尚未实现，会明确返回非零。微信真实客户端脚本为 [p0-03.wechat.js](integration/p0-03.wechat.js)，只在正式 AppID 和环境关联验证后执行。脚本中的权限错误白名单需依据真实错误核对，未知失败不会计为通过。

## 验证解释

- 单测先红后绿，调用实际生产模块；内存 Repository 只是隔离替身。
- 核心幂等工具只作决策，真正的业务写入与幂等记录同事务提交留到数据库适配与各领域任务。
- 覆盖率是 Node/esbuild 源映射诊断，包含测试与夹具，未加载模块不会进入统计。不可将总覆盖率称为全项目业务覆盖率。
- 远端 GitHub CI 配置已建立；当前证据是本地执行同一检查入口，未声称远端工作流已运行。
- 截图、云请求 ID 和错误证据必须脱敏；不记录原始上下文、SDK 密钥、登录令牌、OpenID 或家庭资料。

当前代码定位见 [源文件 SHA-256 清单](verification/source-manifest.json)，旧环境 6 项管理侧结果见 [历史脱敏记录](verification/p0-03-management.json)，新环境就绪证据见 [当前记录](verification/p0-03-new-environment.json)。这些结果不能替代新环境部署和客户端验收。
