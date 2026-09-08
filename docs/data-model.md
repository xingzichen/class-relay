# 数据模型、状态与接口草案

版本 0.4 · 2026-09-09。为设计模型，尚未创建云数据库集合、索引、安全规则或实现云函数。权限以[身份与权限](permissions.md)为准，业务语义以[需求](requirements.md)为准。

## 1. 实体

所有实体映射为 CloudBase 文档型数据库集合，内部 ID 落为 `_id`，时间存 UTC，可变协作文档带 `version`。显式引用、班级一致性和状态迁移由云函数验证；跨文档原子性由服务端小事务保证，不依赖关系型外键或 SQL。稳定组合键编码/摘要用于唯一文档 ID，重复创建必须事务检查，不无条件覆盖。

| 实体 | 核心字段 | 约束/作用 |
|---|---|---|
| users | id, display_name, status, auth_version | 内部用户，不以微信昵称识别 |
| wechat_accounts | user_id, appid, openid | `(appid, openid)` 唯一；密钥不在业务表明文存储 |
| classes | id, name, school_label, term, status | 逻辑班级，首版单班也保留 class_id |
| class_memberships | user_id, class_id, status | 每用户每班一个当前成员关系 |
| role_applications | user_id, class_id, requested_role, status, reviewer | 每种所选角色独立审批，系统管理员作用域为全局 |
| role_assignments | user_id, role, scope_type, scope_id, status, granted_by | 仅有效授权参与权限；全局角色使用明确全局范围键 |
| admin_grants | user_id, class_id, capabilities, expires_at, status, granted_by | 与角色分开；不能含系统权限或关联审批能力 |
| students | id, name, gender, status | gender 为 MALE/FEMALE/UNSPECIFIED |
| enrollments | student_id, class_id, student_number, status, from/to | 班内学号有值时唯一；在班关系支持转班/归档 |
| child_link_requests | applicant_id, student_id, class_id, relationship, status, reviewer_id, reason | 同一账户孩子仅一条待处理申请；记录所属班级审批依据 |
| child_links | user_id, student_id, relationship, status, approved_request_id | 每账户孩子一个有效关系；与班级成员资格共同鉴权 |
| student_groups | id, class_id, name, version, status | 班级共享群组 |
| student_group_members | group_id, student_id, status | 群组学生唯一；只能包含本班有效学生 |
| task_templates | class_id, type, category, title_pattern, body, relative_deadline, checklist, reminder_policy, version | 复用通知、作业、准备事项等结构；新建实例时重新选范围和日期 |
| audience_snapshots | manifest_id, chunks, source_versions, count, digest, status | 发布前 READY，版本冻结后幂等展开 |
| outbox_events / dispatch_jobs | event_id, task_id, revision, cursor, state, lease_owner, lease_until, attempt_token | 事件持久化与分批恢复 |
| tasks | id, class_id, type, lifecycle, current_version, completion_round | 通知/采集/待办共用主记录 |
| task_versions | task_id, version, title, body, deadline, audience_rule, completion_mode, verification_required, allow_late, reminder_policy, authority_level, publisher | 已发布版本不可覆盖，含外部链接设置 |
| task_targets | task_id, student_id, added_version, removed_version | 发布对象快照与增减历史，不随群组静默变化 |
| task_relations | from_task, to_task, relation_type, completion_source_id, notification_group_id | CONTEXT/SHARED_COMPLETION；限定同班、无环 |
| completion_instances | completion_source_id, round, student_id, recipient_key, status, actor_id, completed_at, evidence_source, late | PER_STUDENT 用固定学生级键；PER_RELATIVE 用 user_id |
| task_recipients | task_id, student_id, user_id, child_link_id, status | 记录有效接收资格，不把多亲属合成一个收件人 |
| receipt_events | instance_id, actor_id, action, version, reason, timestamp | 完成、确认、退回、代登记事件追加保存 |
| collection_submissions | instance_id, source, external_submission_id, declared_at, verified_at, reviewer_id | 来源 SELF_REPORTED/MANUAL_VERIFIED/EXTERNAL_VERIFIED 分开 |
| external_resources | task_id, provider, url, document_id, open_mode, integration_status | 链接不是自动提交证明；令牌独立保管 |
| inbox_items | user_id, task_id/event_id, first_opened_at, last_seen_version | 站内通知持久存在，不用微信发送结果推断已读 |
| reminder_plans | completion_source_id, round, schedule_version, next_due, state | 完成/修订会使旧计划失效 |
| notification_deliveries | task_id, notification_group_id, user_id, target_instance_ids, round, slot_id, channel, status, idempotency_key | 唯一幂等键；记录具体尝试结果与错误码 |
| subscription_observations | user_id, template_id, observed_choice, observed_at | 授权观测不是无限额度，也不等同于实际剩余次数 |
| knowledge_entries/versions | class_id, title, body, source, version, status, audience_acl, ai_eligible, reusable_category, valid_from/to, authority_level | 版本、问答适用标记和可见范围不得丢失 |
| knowledge_chunks | source_id, source_version, chunk_no, text, metadata, acl, index_revision, embedding_version | 派生索引可重建；查询前后均校验当前源和权限 |
| qa_jobs/answers | user_id, authorized_scope, kind, source_versions, safe_answer, model_id, policy_version, permission_version, expires_at | 只处理公共可复用事项；越界输入不存原文，异步结果按用户重新鉴权 |
| ai_policy_versions | version, system_rule_hash, redline_rules, fallback_templates, status | 提示规则、输出检查和固定回退一起版本化 |
| ai_answer_cache | query_key, permission_version, source_versions, policy_version, model_id, safe_answer, expires_at | 只缓存正常公共问答；任一依赖版本变化即失效 |
| ai_usage_daily | class_id, date, calls, input_tokens, output_tokens, failures, blocked_count | AI 预算、限流和运营观察，不存问题全文 |
| ai_eval_runs | model_id, policy_version, case_set_version, result_summary, released_at | 模型或策略上线验收证据 |
| audit_events | actor_id, action, scope, entity_id, before/after_version, reason, timestamp | 管理、审批、任务和知识变更追加日志 |

## 2. 关键约束

1. 角色使用明确的全局/班级范围键，按账户、角色、范围计算稳定文档 ID，防止重复授权。
2. `reviewer_id != applicant_id`；审批时复核审批者当前权限和班级，并在事务中条件更新 PENDING。
3. 同一学生可有多位亲属，同一用户可关联多位学生；重名不影响唯一性。
4. 完成实例唯一键为 `(completion_source_id, round, student_id, recipient_key)`，学生级实例使用明确非空固定键，用于构造确定性文档 ID。
5. 同一共享完成源的任务完成模式、目标学生、截止和核验策略必须兼容；首版由主采集统一控制，子催办不独立改写。
6. 正式发布版本与 outbox_events 写入同一小事务；收件人/完成实例分批幂等展开。函数命令采用请求幂等键并校验请求体摘要，队列文档 ID 由业务幂等键构造。
7. 已发布版本不可变；旧链接加载当前版本并可查看有权访问的修订记录。
8. 学生退出班级、目标移出、关系撤销或账号停用，撤销相应未完成分配和待发记录，不删除已完成审计。
9. 审批新亲属或重新入班只建立当前开放且有权访问的任务关系，不重放过期通知。
10. 撤销唯一亲属后学生级任务仍未完成，标记无接收人；不能因没有人能操作就自动完成。

## 3. 状态规范

### 3.1 加入与关联申请

`PENDING → APPROVED / REJECTED / CANCELLED`。终态不可重新改写，重新申请生成新记录；已通过的关系可 `ACTIVE → REVOKED`。

入班状态独立为 `PENDING / ACTIVE / SUSPENDED / LEFT`；角色授权为 `ACTIVE / REVOKED`；委托能力另外支持 `EXPIRED`。界面聚合展示申请进度，不用单一“已认证”覆盖所有身份。

### 3.2 任务生命周期

`DRAFT → PUBLISHED → CLOSED / CANCELLED → ARCHIVED`。已发布任务修订保持 PUBLISHED 并增加内容版本。CLOSED 后需要重新开放必须由有权管理者显式操作并留审计；取消后通过新任务重新发布。

截止产生 `is_overdue` 和关闭催办计划，不必立刻将任务置 CLOSED；这样默认允许逾期补交。主动关闭则不再接受完成。无截止的普通通知没有自动催办截止逻辑。

### 3.3 完成与采集

- 待办实例：`PENDING → COMPLETED`；退回为 `COMPLETED → PENDING` 并追加事件。对象失效为 `WITHDRAWN`，历史完成事件不删除。
- 普通通知无完成实例；要求确认时使用确认实例及相同粒度规则，事件动作为 ACKNOWLEDGED。
- 采集：`PENDING → DECLARED → VERIFIED`；核验退回 `DECLARED/VERIFIED → PENDING`，必须有理由。无须核验时 DECLARED 算业务完成，但仍展示“亲属自报”，不展示“外部提交已验证”。
- `late` 为时间属性，保留实际完成时间，不以 OVERDUE 覆盖完成状态。
- 修订明确要求重新确认时建立新 round；旧 round 的回执只作历史，不被当前统计计为完成。

### 3.4 外发状态

`QUEUED → CLAIMED → API_ACCEPTED / RETRY_WAIT / BLOCKED / UNKNOWN / CANCELLED / SKIPPED`。

- API_ACCEPTED：微信接口接受，不代表设备展示或亲属阅读。
- RETRY_WAIT：明确可重试失败，退避后可回 QUEUED，超过次数或截止后结束。
- BLOCKED：无订阅条件、模板问题或权限限制；条件变更后重算未来有效时点，保留旧失败记录。
- UNKNOWN：发送结果不确定，暂停该时点自动重发。崩溃恢复根据“尚未调用/可能调用”区分可安全重排和 UNKNOWN。
- CANCELLED：业务取消、完成、权限撤销等使其不再需要。
- SKIPPED：过期、合并、限频等跳过，保存原因。

打开和确认在 inbox/receipt 单独记录，不作为以上发送状态的后续阶段。

## 4. 云函数命令边界（拟定）

小程序统一通过 `wx.cloud.callFunction({name, data: {action, payload, requestId}})` 调用受限入口。下表是函数名与允许 action，不是自建 HTTP 路由；所有身份取可信微信调用上下文。

| 云函数 / action | 作用 | 必须校验 |
|---|---|---|
| identity / bootstrapUser | 解析微信身份并建立业务用户 | 可信 APPID/OPENID，不信任客户端身份 |
| membership / apply | 入班和多角色申请 | 班级范围、角色不自动生效 |
| membership / reviewRole | 审批身份 | 授权范围、禁止自审、版本 |
| membership / grantAdmin | 委托管理员能力 | 赋权上限及范围 |
| students / save | 学生名册维护 | 本班权限、版本 |
| family / applyLink, reviewLink | 关联申请及审批 | 对应角色、本班、非本人审批 |
| groups / save | 学生群组 | 管理权限、学生归属 |
| tasks / saveTemplate, instantiate | 保存并复用模板 | 管理权限、新实例重新选日期与范围 |
| tasks / preview, publish | 范围预览与发布 | 冻结快照 READY、权限、幂等 |
| tasks / revise, cancel | 修订或取消 | 内容层级、版本；主状态立即失效，队列异步清理 |
| completion / complete | 亲属完成或自报已填写 | 有效关联、轮次、开放状态 |
| completion / review | 核验/退回/代登记 | 管理权限、原因 |
| tasks / report | 统计 | 管理范围或自己孩子摘要 |
| knowledge / saveVersion, disableForAI | 管理公共知识版本或停止 AI 使用 | 来源、可见范围、公共可复用标记、预期修订；停用先阻断新问答再清理索引 |
| qa / ask, getResult, getSource | 公共事项问答及来源读取 | 用户权限、业务白名单、来源版本、回复红线及结果读取时重新鉴权 |
| aiAdmin / setPolicy, pause | 发布已验收策略或暂停模型生成 | 系统管理员权限、策略验收记录；暂停不影响原文查询 |
| files / prepareUpload, finalizeUpload, authorizeRead | 受控文件访问 | 路径/元数据/对象权限，不接受任意 fileID 授权 |

内部函数 `dispatchWorker`、`reminderScheduler`、`financePublisher`、`maintenance` 只接受受信触发器或服务角色调用，不接受客户端伪造内部身份。长期作业由数据库保存游标、租约与重试状态。

必要查询索引包括：成员 user_id/class_id/status、学生 class_id/status、任务 class_id/lifecycle、关系 user_id/student_id/status、计划 state/next_due、作业 state/lease_until、知识 class_id/status/ai_eligible/valid_from、知识关键词/类别、AI 作业 user_id/state、用量 class_id/date、账本 class_id/ledger_revision。具体复合索引和查询分页在实施中验证；事务内按明确 doc ID 操作，查候选后重新校验版本。

AI 的字段、失效规则、调用契约和最少审计要求以[腾讯云 AI 能力与实施设计](ai-cloudbase-design.md)为准。

未列出的列表、撤销和归档命令须沿用同一鉴权规范，不新增反馈工单或争议处理接口。

## 5. 统计口径

分别统计目标学生数、无有效亲属学生数、有效接收亲属数、可微信提醒人数、接口成功人数、打开人数、确认/完成数、待核验数、逾期数。

按学生完成的分母是当前轮次有效目标学生，按亲属完成的分母是当前有效的学生—亲属实例。同一亲属关联两名目标学生可贡献两个完成实例，但外发人数去重。每个报表显示口径、轮次、统计时间及撤销/新增分配数，不能用发送成功率替代完成率。

## 6. 费用扩展

费用实体、整数分金额、凭证、收款分配、冲正、对账、公示版本以[费用规范](finance.md)为唯一详细定义。普通 completion_instances 不作为缴费到账事实，费用 publication 使用专用班内可见范围。费用复核、账本与新修订事件以小事务一致保存；整班公示异步按确定版本生成，校验后原子切换完整快照。客户端不得提交可信余额或直接修改账本。

拟增云函数命令：`finance / saveProject, adjustAssessment, submitClaim, saveCashRecord, reviewRecord, reverseEntry, reconcile, getPublication`。每项检查费用权限、班级、版本和幂等；第一版无实际付款或退款命令，无账目争议工单。

## 7. 课程与值日扩展

集合、基础表、日期例外、调整修订、双方一致性与提醒联动以[课程与值日规范](schedules.md)为准。云函数 `schedules` 按同一发布修订读取当前有效安排；与任务的关联使用稳定事件 ID，不仅存节次文本。
