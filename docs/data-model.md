# 数据模型、状态与接口草案

版本 0.2 · 2026-09-08。为设计模型，尚未生成数据库迁移或实现 API。权限以[身份与权限](permissions.md)为准，业务语义以[需求](requirements.md)为准。

## 1. 实体

所有业务实体使用内部 ID；时间存 UTC；可变协作实体带 `version`。外键、唯一键和状态转换需在数据库或服务端事务内保证。

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
| knowledge_entries/versions | class_id, title, body, source, version, status, audience_acl, valid_from/to, authority_level | 版本和可见范围不得丢失 |
| knowledge_chunks | source_id, source_version, text, acl, embedding_version | 派生索引可重建；查询须校验当前源 |
| qa_sessions/answers | user_id, child_scope, question, source_versions, answer, model_version | 按需保留问答及出处；不保存全库模型上下文 |
| audit_events | actor_id, action, scope, entity_id, before/after_version, reason, timestamp | 管理、审批、任务和知识变更追加日志 |

## 2. 关键约束

1. 角色的全局范围键非空，避免 SQL NULL 导致重复全局管理员授权。
2. `reviewer_id != applicant_id`；审批时复核审批者当前权限和班级，并在事务中条件更新 PENDING。
3. 同一学生可有多位亲属，同一用户可关联多位学生；重名不影响唯一性。
4. 完成实例唯一键为 `(completion_source_id, round, student_id, recipient_key)`，学生级实例使用明确非空固定键，避免 NULL 破坏唯一性。
5. 同一共享完成源的任务完成模式、目标学生、截止和核验策略必须兼容；首版由主采集统一控制，子催办不独立改写。
6. 发布内容与 outbox 写入同一事务。队列幂等键唯一，API 写入用请求幂等键且校验相同键的请求体一致。
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

## 4. 核心接口边界（拟定）

| 接口 | 作用 | 必须校验 |
|---|---|---|
| POST /auth/wechat | 登录换业务会话 | 微信验证结果，不能信任客户端身份字段 |
| POST /join-applications | 入班和多角色申请 | 邀请/班级范围，角色未自动生效 |
| POST /role-applications/:id/review | 审批身份 | 授予权限、禁止自审、申请版本 |
| POST /admin-grants | 设置管理员账户及能力 | 赋权者范围和能力上限 |
| POST/PATCH /classes/:id/students | 管理学生 | 本班学生管理权限、版本冲突 |
| POST /child-link-requests | 提交孩子关联 | 本人身份、班级、最少必要匹配信息 |
| POST /child-link-requests/:id/review | 审批关联 | 家委会及以上已授权角色、本班、非本人 |
| POST /classes/:id/groups | 创建学生群组 | 管理权限和学生归属 |
| POST /tasks/preview | 预览范围与收件人数量 | 发布权限、范围快照版本 |
| POST /tasks/:id/publish | 发布 | 发布权限、预览版本、幂等键 |
| POST /tasks/:id/revisions | 修订/重新确认 | 内容层级、当前版本、显式轮次变更 |
| POST /tasks/:id/cancel | 取消任务 | 内容管理权限，同事务取消队列 |
| POST /completion-instances/:id/complete | 亲属点击完成/已填写 | 本人有效关联、当前轮次、开放状态 |
| POST /completion-instances/:id/review | 核验/退回/代登记 | 管理权限、操作类型、原因 |
| GET /tasks/:id/report | 查看统计 | 本班管理权限，亲属只读自己孩子摘要 |
| POST /knowledge/:id/versions | 维护知识 | 管理权限、来源和可见范围 |
| POST /qa/ask | 基于知识回答 | 当前用户及孩子授权范围 |
| GET /files/:id | 附件/来源下载 | 所属任务或知识的当前访问权限 |

未列出的列表、撤销、归档接口在实施时补齐，必须沿用同一鉴权和版本规范，不新增隐式权限。

## 5. 统计口径

分别统计目标学生数、无有效亲属学生数、有效接收亲属数、可微信提醒人数、接口成功人数、打开人数、确认/完成数、待核验数、逾期数。

按学生完成的分母是当前轮次有效目标学生，按亲属完成的分母是当前有效的学生—亲属实例。同一亲属关联两名目标学生可贡献两个完成实例，但外发人数去重。每个报表显示口径、轮次、统计时间及撤销/新增分配数，不能用发送成功率替代完成率。

## 6. 费用扩展

费用实体、整数分金额、凭证、收款分配、冲正、对账、公示版本以[费用规范](finance.md)为唯一详细定义。普通 completion_instances 不作为缴费到账事实，费用 publication 使用专用班内可见范围。费用发布、复核、入账和公示快照需事务一致；客户端不得提交可信余额或直接修改账本。

拟增接口组：`/fee-projects`（费用事项/分摊）、`/payment-claims`（家长申报）、`/cash-records`（实际收支登记）、`/cash-records/:id/review`（非本人复核入账）、`/ledger-reversals`（冲正）、`/reconciliations`（对账）、`/finance-publications`（班内公示）。每组执行费用权限、班级范围、版本和幂等校验；第一版无发起实际付款的 API。
