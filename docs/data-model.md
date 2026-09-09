# 数据模型、状态与接口草案

版本 0.6 · 2026-09-10。为设计模型，尚未创建云数据库集合、索引、安全规则或实现云函数。权限以[身份与权限](permissions.md)为准，业务语义以[需求](requirements.md)为准。

## 1. 实体

所有实体映射为 CloudBase 文档型数据库集合，内部 ID 落为 `_id`，时间存 UTC，可变协作文档带 `version`。显式引用、班级一致性和状态迁移由云函数验证；跨文档原子性由服务端小事务保证，不依赖关系型外键或 SQL。稳定组合键编码/摘要用于唯一文档 ID，重复创建必须事务检查，不无条件覆盖。

| 实体 | 核心字段 | 约束/作用 |
|---|---|---|
| users | id, display_name, status, auth_version | 内部用户，不以微信昵称识别 |
| wechat_accounts | user_id, appid, openid | `(appid, openid)` 唯一；密钥不在业务表明文存储 |
| classes | id, name, school_label, current_term_id, status, knowledge_revision, ledger_revision, published_finance_version | 逻辑班级，首版单班也保留 class_id |
| class_memberships | user_id, class_id, status | 每用户每班一个当前成员关系 |
| role_applications | user_id, class_id, requested_role, status, reviewer | 每种所选角色独立审批，系统管理员作用域为全局 |
| role_assignments | user_id, role, scope_type, scope_id, status, granted_by, handover_id, effective_revision | 仅有效授权参与权限；全局角色使用明确全局范围键 |
| admin_grants | user_id, class_id, capabilities, expires_at, status, granted_by, handover_id, effective_revision | 与角色分开；不能含系统权限或关联审批能力 |
| students | id, name, gender, status | gender 为 MALE/FEMALE/UNSPECIFIED |
| enrollments | student_id, class_id, student_number, status, from/to | 班内学号有值时唯一；在班关系支持转班/归档 |
| child_link_requests | applicant_id, student_id, class_id, relationship, status, reviewer_id, reason | 同一账户孩子仅一条待处理申请；记录所属班级审批依据 |
| child_links | user_id, student_id, relationship, status, approved_request_id | 每账户孩子一个有效关系；与班级成员资格共同鉴权 |
| student_groups | id, class_id, name, version, status | 班级共享群组 |
| student_group_members | group_id, student_id, status | 群组学生唯一；只能包含本班有效学生 |
| task_templates | class_id, type, category, title_pattern, body, relative_deadline, checklist, reminder_policy, version | 复用通知、作业、准备事项等结构；新建实例时重新选范围和日期 |
| audience_snapshots | manifest_id, chunks, source_versions, count, digest, status | 发布前 READY，版本冻结后幂等展开 |
| outbox_events / dispatch_jobs | event_id, subject_type, subject_id, task_id可空, revision, cursor, state, lease_owner, lease_until, attempt_token | 事件持久化与分批恢复 |
| tasks | id, class_id, owner_id, activity_id, topic_id, author_id, type, category, lifecycle, current_version, completion_round | 通知/采集/待办共用主记录 |
| task_versions | task_id, version, title, body, deadline, read_scope, action_audience, delivery_policy, completion_mode, verification_required, allow_late, reminder_policy, authority_level, publisher_id | 已发布版本不可覆盖，read_scope=CLASS_PUBLIC/TARGET_PRIVATE；action_audience 生成 task_targets；type=NOTICE/COLLECT/TODO，作业/准备是 category |
| task_targets | task_id, student_id, added_version, removed_version | 发布对象快照与增减历史，不随群组静默变化 |
| task_relations | from_task, to_task, relation_type, completion_source_id, notification_group_id | CONTEXT/SHARED_COMPLETION；限定同班、无环 |
| completion_instances | completion_source_id, round, student_id, recipient_key, status, actor_id, completed_at, evidence_source, late | PER_STUDENT 用固定学生级键；PER_RELATIVE 用 user_id |
| task_recipients | task_id, student_id, user_id, child_link_id, status | 记录有效接收资格，不把多亲属合成一个收件人 |
| receipt_events | instance_id, actor_id, action, version, reason, timestamp | 完成、确认、退回、代登记事件追加保存 |
| collection_submissions | instance_id, source, response_version, external_submission_id, submitted_at, verified_at, reviewer_id | NATIVE_FORM/EXTERNAL_SELF_REPORTED/ADMIN_RECORDED/EXTERNAL_VERIFIED 分开；来源不是核验状态 |
| external_resources | task_id, provider, url, document_id, open_mode, integration_status | 链接不是自动提交证明；令牌独立保管 |
| inbox_items | user_id, task_id/event_id, first_opened_at, last_seen_version | 站内通知持久存在，不用微信发送结果推断已读 |
| reminder_plans | subject_type, subject_id, completion_source_id可空, round可空, schedule_version, next_due, state | 催款/志愿事项有独立业务源，不伪装普通完成；变更告知独立事件 |
| notification_deliveries | subject_type, subject_id, event_type, category, notification_group_id, event_revision, user_id, target_instance_ids, round可空, schedule_version, slot_id, channel, status, idempotency_key | event_type=INITIAL/REMINDER/CHANGE_NOTICE；category=GENERAL/PAYMENT；手动自动共用预算入口 |
| subscription_observations | user_id, template_id, observed_choice, observed_at | 授权观测不是无限额度，也不等同于实际剩余次数 |
| knowledge_entries / knowledge_versions | class_id, owner_id, topic_id, activity_id, title, body, source, author_id, publisher_id, normalized_terms, version, supersedes_version, status, audience_acl, ai_eligible, reusable_category, valid_from/to, authority_level | 版本、问答适用标记和可见范围不得丢失 |
| knowledge_chunks | source_id, source_version, chunk_no, text, metadata, acl, index_revision, embedding_version | 派生索引可重建；查询前后均校验当前源和权限 |
| qa_jobs / qa_answers | answer_id, user_id, request_id, request_digest, state, authorized_scope, kind, source_refs, source_versions, safe_answer, model_id, policy_version, permission_version, expires_at | 只处理公共可复用事项；越界输入不存原文，异步结果按用户重新鉴权 |
| ai_policy_versions | version, system_rule_hash, redline_rules, fallback_templates, status | 提示规则、输出检查和固定回退一起版本化 |
| ai_answer_cache | query_key, permission_version, source_versions, policy_version, model_id, safe_answer, expires_at | 只缓存正常公共问答；任一依赖版本变化即失效 |
| ai_usage_daily | class_id, date, calls, input_tokens, output_tokens, failures, blocked_count | AI 预算、限流和运营观察，不存问题全文 |
| ai_eval_runs | model_id, policy_version, case_set_version, result_summary, released_at | 模型或策略上线验收证据 |
| audit_events | actor_id, action, scope, entity_id, before/after_version, reason, timestamp | 管理、审批、任务和知识变更追加日志 |
| change_notices | event_id, revision, former/new_target_snapshot, per_family_safe_content, expires_at；保留旧对象最小结果，读/发重验当前关联 | 详见下列约束及[协作规范](committee-workflows.md) |
| delivery_daily_budgets | user_id, local_date, total_reserved, ordinary_reserved, change_reserved, payment_reserved, last_attempt_at；跨班跨任务事务限额，UNKNOWN 不释放占位 | 详见下列约束及[协作规范](committee-workflows.md) |
| family_delivery_preferences | student_id, primary_user_id可空, version；主接收人必须是有效关联，其他亲属保留站内资格 | 详见下列约束及[协作规范](committee-workflows.md) |
| structured_forms / form_responses | task_id, form_id, version, collection_mode, schema, student_id, round, answers, source, response_version, actor_id；单选、整数数量、确认，原生回答版本化、按孩子去重 | 详见下列约束及[协作规范](committee-workflows.md) |
| activities / activity_links | class_id, owner_id, status, revision, target_snapshot, linked_entities；取消主修订统一失效执行项目，费用进入处置流程 | 详见下列约束及[协作规范](committee-workflows.md) |
| adult_participants | class_id, participant_id, display_name, linked_user_id可空, authorized_proxy_refs；不以姓名唯一，合并需管理员核验且保留记录 | 详见下列约束及[协作规范](committee-workflows.md) |
| volunteer_slots / registrations | activity_id, participant_id, slot_id, capacity, reserved_count, confirmed_count, submitter_user_id, student_refs, source, status, confirmation_deadline, version；提交人与参与人分离，岗位/时段去重、名额事务控制 | 详见下列约束及[协作规范](committee-workflows.md) |
| adult_groups / adult_group_members | class_id, group_id, participant_id；通知解析到有权代填人，无账号成人不伪造送达 | 详见下列约束及[协作规范](committee-workflows.md) |
| handovers / handover_items | class_id, old_owner_id, new_owner_id, source_versions, new_grants, revoke_role_assignment_ids, revoke_grant_ids, effective_at, status, acknowledged_by, activated_by, revision；清单确认不提权，生效必须有权人员执行 | 详见下列约束及[协作规范](committee-workflows.md) |
| consent_checks | activity_id, student_id, statement_version, channel, verification_status, verifier_id, verified_at, version；学校原渠道核验，普通完成不驱动此记录 | 详见下列约束及[协作规范](committee-workflows.md) |
| materials / material_events | class_id, activity_id, quantity, custodian, claimant, action, linked_expense；领取归还留痕，不改写财务账本 | 详见下列约束及[协作规范](committee-workflows.md) |
| family_record_exports | applicant_id, historical_student_scope, status, sanitized_files, expires_at, approver_id；离班仅取得本家庭资料，不恢复班级读取权 | 详见下列约束及[协作规范](committee-workflows.md) |

## 2. 关键约束

1. 角色使用明确的全局/班级范围键，按账户、角色、范围计算稳定文档 ID，防止重复授权。
2. `reviewer_id != applicant_id`；审批时复核审批者当前权限和班级，并在事务中条件更新 PENDING。
3. 同一学生可有多位亲属，同一用户可关联多位学生；重名不影响唯一性。
4. 完成实例唯一键为 `(completion_source_id, round, student_id, recipient_key)`，学生级实例使用明确非空固定键，用于构造确定性文档 ID。
5. 同一共享完成源的任务完成模式、目标学生、截止和核验策略必须兼容；首版由主采集统一控制，子催办不独立改写。
6. 正式发布版本与 outbox_events 写入同一小事务；收件人/完成实例分批幂等展开。函数命令采用请求幂等键并校验请求体摘要，队列文档 ID 由业务幂等键构造。
7. 已发布版本不可变；旧链接加载当前版本并可查看有权访问的修订记录。
8. 目标移出、任务取消仅撤销处理资格、旧催办及定向私有原文访问；CLASS_PUBLIC 仍独立鉴权，change_notices 仅保留原家庭最小结果。离班/关系撤销/停用使该家庭全部候选外发及访问失效。历史回执和账目不删。
9. 审批新亲属或重新入班只建立当前开放且有权访问的任务关系，不重放过期通知。
10. 撤销唯一亲属后学生级任务仍未完成，标记无接收人；不能因没有人能操作就自动完成。
11. 志愿去重键为 activity_id + slot_id + participant_id；slot_id 含时段，同一成人关联多个孩子不重复占位。无账号参与人不按姓名自动合并；原生容量和候补名额在服务端事务中占用。
12. 日预算按 user_id + Asia/Shanghai 日期在所有班级共用；INITIAL/REMINDER 计普通桶，CHANGE_NOTICE 计变更桶；含催款的摘要还须计 PAYMENT 子桶，不能改类别绕过限额。总计 ≤4、普通 ≤2、变更 ≤2、催款 ≤2，最小间隔两小时，22:00—08:00 免打扰。UNKNOWN 保守占位；预留键与发送尝试幂等关联。混合普通与变更内容的摘要分别占相应分类一次，外发总量一次；明确未发送才可按规则释放预留。
13. 财务止催读当前账本/分摊及 payment_claims，不能读旧公示来推断未缴；自报待核对暂停，但不增加账本实收。
14. owner_id 是维护人；author_id、publisher_id 与 authority_level 不因交接更改。角色/委托的有效性还要核对 handover_id/effective_revision；未生效清单不能提权，已生效旧授权不能因物化滞后继续使用。
15. 普通表单与志愿名额不改变 consent_checks，只有 consent.record 可写学校原渠道核验；活动取消不自动退款或删除已入账记录。
16. 离班家庭资料申请按账号及历史关联审核，下载仅含本家庭脱敏记录和限时令牌，不恢复全班读取；这不是反馈工单。

## 3. 状态规范

### 3.1 加入与关联申请

`PENDING → APPROVED / REJECTED / CANCELLED`。终态不可重新改写，重新申请生成新记录；已通过的关系可 `ACTIVE → REVOKED`。

入班状态独立为 `PENDING / ACTIVE / SUSPENDED / LEFT`；角色授权为 `ACTIVE / REVOKED`；委托能力另外支持 `EXPIRED`。交接可预建 `PREPARED` 授权，只有生效修订确认后才按 ACTIVE 参与权限；本地状态标签不得绕过生效检查。界面聚合展示申请进度，不用单一“已认证”覆盖所有身份。

### 3.2 任务生命周期

`DRAFT → PUBLISHED → CLOSED / CANCELLED → ARCHIVED`。已发布任务修订保持 PUBLISHED 并增加内容版本。CLOSED 后需要重新开放必须由有权管理者显式操作并留审计；取消后通过新任务重新发布。

截止产生 `is_overdue` 和关闭催办计划，不必立刻将任务置 CLOSED；这样默认允许逾期补交。主动关闭则不再接受完成。无截止的普通通知没有自动催办截止逻辑。

### 3.3 完成与采集

- 待办实例：`PENDING → COMPLETED`；退回为 `COMPLETED → PENDING` 并追加事件。对象失效为 `WITHDRAWN`，历史完成事件不删除。
- 普通通知无完成实例；要求确认时使用确认实例及相同粒度规则，事件动作为 ACKNOWLEDGED。
- 原生采集：`PENDING → SUBMITTED → VERIFIED`；不要求核验时 SUBMITTED 算业务完成，展示“原生已提交”；要求核验时暂停催家长，管理端保留待核验。参加/不参加都算已答复。
- 外部采集：`PENDING → DECLARED → VERIFIED`；DECLARED 只表示外部自报；无须核验时算业务完成但不称外部已验证。核验退回为 PENDING，保留来源及理由。原生 SUBMITTED/VERIFIED 也可按同样规则退回。
- 共享采集催办在提交/自报后暂停，只有退回才恢复未来允许时点；完成分母、待核验与业务完成按配置分开，外部志愿报名的名额必须另行核验。
- `late` 为时间属性，保留实际完成时间，不以 OVERDUE 覆盖完成状态。
- 修订明确要求重新确认时建立新 round；旧 round 的回执只作历史，不被当前统计计为完成。

### 3.4 外发状态

`QUEUED → CLAIMED → API_ACCEPTED / RETRY_WAIT / BLOCKED / UNKNOWN / CANCELLED / SKIPPED`。

- API_ACCEPTED：微信接口接受，不代表设备展示或亲属阅读。
- RETRY_WAIT：明确可重试失败，退避后可回 QUEUED，超过重试上限或对应事件有效期后结束（催办用任务截止，变更用独立 expires_at）。
- BLOCKED：无订阅条件、模板问题或权限限制；条件变更后重算未来有效时点，保留旧失败记录。
- UNKNOWN：发送结果不确定，暂停该时点自动重发。崩溃恢复根据“尚未调用/可能调用”区分可安全重排和 UNKNOWN。
- CANCELLED：原业务取消/完成使催办失效，或当前身份/关联撤销使外发资格失效；不能因原任务取消就取消新建 CHANGE_NOTICE。
- SKIPPED：过期、合并、限频等跳过，保存原因。

打开和确认在 inbox/receipt 单独记录，不作为以上发送状态的后续阶段。

### 3.5 协作状态

| 业务 | 状态与关系 |
|---|---|
| 志愿原生报名 | 创建 CONFIRMED 或 WAITLISTED；WAITLISTED → OFFERED → CONFIRMED；退出 WITHDRAWN，邀约到期 OFFER_EXPIRED，活动取消 CANCELLED |
| 志愿外部报名 | REVIEW_PENDING（source=EXTERNAL_SELF_REPORTED）→ CONFIRMED/WAITLISTED/NEEDS_INFO；补充回 REVIEW_PENDING，自报不占位 |
| 活动 | DRAFT → OPEN → FINISHED/CANCELLED → ARCHIVED；关联取消由同一生效修订控制 |
| 交接 | DRAFT → AWAITING_ACCEPTANCE → ACCEPTED → ACTIVE；生效前可 CANCELLED；改清单使旧接收确认失效 |
| 正式授权核验 | PENDING / VERIFIED / REVOKED；记录学校原渠道及文本版本，不代表小程序签署 |
| 物资 | AVAILABLE → CLAIMED → RECEIVED → RETURNED；数量和历次领取归还以 material_events 为准 |
| 家庭资料取得 | PENDING → APPROVED/REJECTED；批准文件到期不可下载，不开放原班级 |
| QA 作业 | QUEUED → RUNNING → SUCCEEDED/FAILED/EXPIRED；越界问题不入持久作业；读取重验权限及来源 |

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
| completion / complete | 普通完成或外部自报（原生答复走 forms.submit） | 有效关联、轮次、开放状态 |
| completion / review | 核验/退回/代登记 | 管理权限、原因 |
| tasks / report | 统计 | 管理范围或自己孩子摘要 |
| knowledge / saveDraft, publishVersion, disableForAI, assignOwner, maintainValidity | 管理公共知识版本或停止 AI 使用 | 来源、可见范围、公共可复用标记、预期修订；停用先阻断新问答再清理索引 |
| qa / ask, getResult, getSource | 公共事项问答及来源读取 | 用户权限、业务白名单、来源版本、回复红线及结果读取时重新鉴权 |
| aiAdmin / setPolicy, pause | 发布已验收策略或暂停模型生成 | 系统管理员权限、策略验收记录；暂停不影响原文查询 |
| files / prepareUpload, finalizeUpload, authorizeRead | 受控文件访问 | 路径/元数据/对象权限，不接受任意 fileID 授权 |
| forms / save, publish, submit, revise, review, switchSource | 事务型表单配置、发布、原生答复及核验、采集来源迁移 | 配置/切换限 task.manage，填报需有效关联；同孩子/轮次唯一；不参加算已答复 |
| activities / save, publish, previewCancel, cancel, assignOwner | 活动及取消关联清单 | activity.manage；取消所有必要对象权限与源版本，财务不能越权 |
| volunteers / saveSlot, register, withdraw, reviewExternal, confirmOffer, assignProxy, saveGroup | 岗位、代报名、退出、外部核验、替补、联系人及成人群组 | 实际参与人与代填人分离；容量、重复、活动状态、有效代填授权；维护需 activity.manage |
| handover / prepare, acknowledge, revise, activate | 盘点、接收、修订、生效 | prepare/revise 需 handover.manage；指定接收者 acknowledge；activate 不可委托且逐项检查赋权/撤权范围 |
| finance / saveProject, adjustAssessment, submitClaim, reportPaid, saveCashRecord, reviewRecord, reverseEntry, reconcile, previewReminders, generateSnapshot, publishSnapshot, getPublication | 费用全链路，不执行真实交易 | permissions.md 第 8/11 节与 finance.md、非自复核、整数分、最新账本止催、公示 READY 后独立审核发布 |
| consent / recordCheck, revokeCheck | 学校原渠道授权核验 | consent.record、说明版本、核验人；不接受普通完成驱动 |
| materials / save, claim, receive, return | 物资记录与流转（P6） | activity.manage 或明确受限认领资格、数量/版本；不直接改账 |
| family / requestRecords, reviewRecordRequest, getRecordExport | 离班本家庭资料 | 正常账号/历史关联；审核者必要管理权限，文件仅含自家且限时 |
| preferences / saveDelivery | 家庭外发接收偏好 | 有效关联；不撤销其他亲属站内资格 |
| schedules / saveTemplate, publishTemplate, getDay, getWeek, previewChange, publishChange, cancelChange | 基础和日期安排 | 对各班均有对应课程/值日能力；原子生效修订与稳定事件 ID |

内部函数 `dispatchWorker`、`reminderScheduler`、`financePublisher`、`maintenance` 只接受受信触发器或服务角色调用，不接受客户端伪造内部身份。长期作业由数据库保存游标、租约与重试状态。

必要查询索引包括：成员 user_id/class_id/status、在班关系 enrollments.class_id/status、任务 class_id/lifecycle、关系 user_id/student_id/status、计划 state/next_due、作业 state/lease_until、知识 class_id/status/ai_eligible/valid_from、知识关键词/类别、AI 作业 user_id/state、用量 class_id/date、账本 class_id/ledger_revision、报名 activity_id/slot_id/status、交接 class_id/status、表单 task_id/student_id/round、变更告知接收人/状态/有效期、预算 user_id/local_date。具体复合索引和查询分页在实施中验证；事务内按明确 doc ID 操作，查候选后重新校验版本。

AI 的字段、失效规则、调用契约和最少审计要求以[腾讯云 AI 能力与实施设计](ai-cloudbase-design.md)为准。

未列出的列表、撤销和归档命令须沿用同一鉴权规范，不新增反馈工单或争议处理接口。

## 5. 统计口径

分别统计阅读资格、有效处理对象、无接收人学生、关联关系、去重用户、偏好筛选后的外发候选、接口接受、打开、确认、原生已提交/外部自报、待核验、业务完成和逾期。微信人数不能由关联数推定剩余额度。

按学生完成的分母是当前轮次有效处理对象学生，按亲属完成的分母是当前有效的学生—亲属实例。同一亲属关联两名目标学生可贡献两个完成实例，但外发人数去重。每个报表显示口径、轮次、统计时间及撤销/新增分配数，不能用发送成功率替代完成率。

志愿报表按实际成人/岗位统计已确认、候补、待确认与外部待核验，不按孩子数或自报数计算名额。财务分别展示申报、最新核实、完整公示版本和最后实际核对；交接分别统计待接收、生效及承接未完成项，交接完成不表示资金已平。

## 6. 费用扩展

费用实体、整数分金额、凭证、收款分配、冲正、对账、公示版本以[费用规范](finance.md)为唯一详细定义。普通 completion_instances 不作为缴费到账事实，费用 publication 使用专用班内可见范围。费用复核、账本与新修订事件以小事务一致保存；整班公示异步按确定版本生成，置 READY，经 finance.publish 审核发布后原子切换 published_finance_version 指向的完整快照。客户端不得提交可信余额或直接修改账本。

财务命令统一在第 4 节列出；每项检查费用权限、班级、版本和幂等；第一版无实际付款或退款命令，无账目争议工单。

## 7. 课程与值日扩展

集合、基础表、日期例外、调整修订、双方一致性与提醒联动以[课程与值日规范](schedules.md)为准。云函数 `schedules` 按同一发布修订读取当前有效安排；与任务的关联使用稳定事件 ID，不仅存节次文本。

## 8. 字段和命令命名约定

维护人统一 owner_id，原作者 author_id、发布者 publisher_id。表单 collection_mode=NATIVE_FORM/EXTERNAL_DOC 决定当前入口，答复 source 保存实际原生/自报/代登记/核验来源；两者不混用。任务选择规则用 action_audience，展开对象用 task_targets，阅读用 read_scope，外发偏好用 delivery_policy。知识接口统一 knowledge.*；对外 requestId 与库内 request_id 明确映射。AI 同步/作业结果返回 answer_id 和 source_refs，模型短期 citations 仅为待校验输入，安全正文缓存统一 safe_answer。日程引用 stable_event_id。
