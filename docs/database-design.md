# 数据库表结构设计文档

## 设计原则
- 敏感字段使用 AES-256 加密存储
- 数据库中不存储明文隐私数据
- 所有加密字段在表结构中标注 `[加密]`

---

## 一、用户与身份管理模块

### 1.1 用户表 (users)

| 字段名 | 类型 | 说明 | 加密 |
|--------|------|------|------|
| id | BIGINT | 主键，自增 | 否 |
| openid | VARCHAR(64) | 微信OpenID，唯一索引 | 否 |
| role | TINYINT | 角色：0-未绑定，1-学生，2-教师 | 否 |
| student_no | VARCHAR(32) | 学号 | **是 [AES]** |
| teacher_no | VARCHAR(32) | 工号 | **是 [AES]** |
| phone | VARCHAR(16) | 手机号 | **是 [AES]** |
| created_at | DATETIME | 创建时间 | 否 |
| updated_at | DATETIME | 更新时间 | 否 |

**索引：**
- PRIMARY KEY (id)
- UNIQUE KEY uk_openid (openid)
- INDEX idx_student_no (student_no) -- 加密字段索引用于关联查询
- INDEX idx_teacher_no (teacher_no) -- 加密字段索引用于关联查询

**说明：**
- student_no 和 teacher_no 互斥，根据 role 字段决定使用哪个
- 所有敏感字段在存储前进行 AES-256 加密

---

## 二、班级管理模块

### 2.1 班级表 (classes)

| 字段名 | 类型 | 说明 | 加密 |
|--------|------|------|------|
| id | BIGINT | 主键，自增 | 否 |
| class_code | VARCHAR(16) | 班级码，唯一索引 | 否 |
| class_name | VARCHAR(64) | 班级名称 | 否 |
| semester | VARCHAR(32) | 学期信息 | 否 |
| creator_id | BIGINT | 创建人ID（关联users.id） | 否 |
| creator_teacher_no | VARCHAR(32) | 创建人工号（冗余，用于快速查询） | **是 [AES]** |
| status | TINYINT | 状态：0-禁用，1-启用 | 否 |
| created_at | DATETIME | 创建时间 | 否 |
| updated_at | DATETIME | 更新时间 | 否 |

**索引：**
- PRIMARY KEY (id)
- UNIQUE KEY uk_class_code (class_code)
- INDEX idx_creator_id (creator_id)

---

### 2.2 班级成员表 (class_members)

| 字段名 | 类型 | 说明 | 加密 |
|--------|------|------|------|
| id | BIGINT | 主键，自增 | 否 |
| class_id | BIGINT | 班级ID | 否 |
| user_id | BIGINT | 用户ID | 否 |
| student_no | VARCHAR(32) | 学号（冗余，用于快速查询） | **是 [AES]** |
| role | TINYINT | 在班级中的角色：1-学生，2-教师 | 否 |
| joined_at | DATETIME | 加入时间 | 否 |

**索引：**
- PRIMARY KEY (id)
- UNIQUE KEY uk_class_user (class_id, user_id)
- INDEX idx_class_id (class_id)
- INDEX idx_user_id (user_id)

**说明：**
- student_no 字段加密存储，防止通过成员表直接还原学生身份

---

## 三、通知公告模块

### 3.1 通知表 (notices)

| 字段名 | 类型 | 说明 | 加密 |
|--------|------|------|------|
| id | BIGINT | 主键，自增 | 否 |
| class_id | BIGINT | 班级ID | 否 |
| title | VARCHAR(128) | 通知标题 | 否 |
| content | TEXT | 通知内容 | 否 |
| attachment_url | VARCHAR(512) | 附件地址 | 否 |
| is_urgent | TINYINT | 是否紧急：0-否，1-是 | 否 |
| publisher_id | BIGINT | 发布人ID | 否 |
| created_at | DATETIME | 发布时间 | 否 |
| updated_at | DATETIME | 更新时间 | 否 |

**索引：**
- PRIMARY KEY (id)
- INDEX idx_class_id (class_id)
- INDEX idx_created_at (created_at)

**说明：**
- 通知内容为明文存储，不涉及直接个人隐私

---

### 3.2 通知阅读记录表 (notice_reads)

| 字段名 | 类型 | 说明 | 加密 |
|--------|------|------|------|
| id | BIGINT | 主键，自增 | 否 |
| notice_id | BIGINT | 通知ID | 否 |
| user_id | BIGINT | 用户ID | 否 |
| student_no | VARCHAR(32) | 学号（冗余） | **是 [AES]** |
| read_at | DATETIME | 阅读时间 | 否 |

**索引：**
- PRIMARY KEY (id)
- UNIQUE KEY uk_notice_user (notice_id, user_id)
- INDEX idx_notice_id (notice_id)
- INDEX idx_student_no (student_no)

**说明：**
- student_no 加密存储，避免通过阅读行为分析学生身份

---

## 四、作业管理模块

### 4.1 作业表 (assignments)

| 字段名 | 类型 | 说明 | 加密 |
|--------|------|------|------|
| id | BIGINT | 主键，自增 | 否 |
| class_id | BIGINT | 班级ID | 否 |
| title | VARCHAR(128) | 作业标题 | 否 |
| description | TEXT | 作业说明 | 否 |
| deadline | DATETIME | 截止时间 | 否 |
| publisher_id | BIGINT | 发布人ID | 否 |
| created_at | DATETIME | 发布时间 | 否 |
| updated_at | DATETIME | 更新时间 | 否 |

**索引：**
- PRIMARY KEY (id)
- INDEX idx_class_id (class_id)
- INDEX idx_deadline (deadline)

---

### 4.2 作业提交表 (assignment_submissions)

| 字段名 | 类型 | 说明 | 加密 |
|--------|------|------|------|
| id | BIGINT | 主键，自增 | 否 |
| assignment_id | BIGINT | 作业ID | 否 |
| user_id | BIGINT | 用户ID | 否 |
| student_no | VARCHAR(32) | 学号 | **是 [AES]** |
| content | TEXT | 文本作业内容 | **是 [AES]** |
| file_url | VARCHAR(512) | 文件地址 | 否 |
| file_metadata | JSON | 文件元数据（文件名、大小等） | **是 [AES]** |
| submitted_at | DATETIME | 提交时间 | 否 |
| updated_at | DATETIME | 更新时间 | 否 |

**索引：**
- PRIMARY KEY (id)
- UNIQUE KEY uk_assignment_user (assignment_id, user_id)
- INDEX idx_assignment_id (assignment_id)
- INDEX idx_student_no (student_no)

**说明：**
- content 和 file_metadata 加密存储
- file_url 为云存储地址，不加密

---

### 4.3 作业批改表 (assignment_grades)

| 字段名 | 类型 | 说明 | 加密 |
|--------|------|------|------|
| id | BIGINT | 主键，自增 | 否 |
| submission_id | BIGINT | 提交ID | 否 |
| student_no | VARCHAR(32) | 学号 | **是 [AES]** |
| score | DECIMAL(5,2) | 成绩 | **是 [AES]** |
| comment | TEXT | 教师评语 | **是 [AES]** |
| grader_id | BIGINT | 批改人ID | 否 |
| graded_at | DATETIME | 批改时间 | 否 |
| updated_at | DATETIME | 更新时间 | 否 |

**索引：**
- PRIMARY KEY (id)
- UNIQUE KEY uk_submission (submission_id)
- INDEX idx_student_no (student_no)

**说明：**
- 成绩和评语加密存储，防止学业评价泄露

---

## 五、请假审批模块

### 5.1 请假申请表 (leave_requests)

| 字段名 | 类型 | 说明 | 加密 |
|--------|------|------|------|
| id | BIGINT | 主键，自增 | 否 |
| class_id | BIGINT | 班级ID | 否 |
| user_id | BIGINT | 用户ID | 否 |
| student_no | VARCHAR(32) | 学号 | **是 [AES]** |
| reason | TEXT | 请假原因 | **是 [AES]** |
| start_time | DATETIME | 请假开始时间 | 否 |
| end_time | DATETIME | 请假结束时间 | 否 |
| image_url | VARCHAR(512) | 凭证图片地址 | 否 |
| image_metadata | JSON | 凭证元数据 | **是 [AES]** |
| status | TINYINT | 状态：0-待审批，1-已通过，2-已拒绝 | 否 |
| created_at | DATETIME | 申请时间 | 否 |
| updated_at | DATETIME | 更新时间 | 否 |

**索引：**
- PRIMARY KEY (id)
- INDEX idx_class_id (class_id)
- INDEX idx_user_id (user_id)
- INDEX idx_status (status)
- INDEX idx_student_no (student_no)

---

### 5.2 请假审批记录表 (leave_approvals)

| 字段名 | 类型 | 说明 | 加密 |
|--------|------|------|------|
| id | BIGINT | 主键，自增 | 否 |
| leave_request_id | BIGINT | 请假申请ID | 否 |
| student_no | VARCHAR(32) | 学号 | **是 [AES]** |
| comment | TEXT | 审批意见 | **是 [AES]** |
| approver_id | BIGINT | 审批人ID | 否 |
| approved_at | DATETIME | 审批时间 | 否 |

**索引：**
- PRIMARY KEY (id)
- UNIQUE KEY uk_leave_request (leave_request_id)
- INDEX idx_student_no (student_no)

---

## 六、考勤签到模块

### 6.1 签到任务表 (attendance_tasks)

| 字段名 | 类型 | 说明 | 加密 |
|--------|------|------|------|
| id | BIGINT | 主键，自增 | 否 |
| class_id | BIGINT | 班级ID | 否 |
| title | VARCHAR(128) | 签到任务标题 | 否 |
| start_time | DATETIME | 签到开始时间 | 否 |
| end_time | DATETIME | 签到结束时间 | 否 |
| creator_id | BIGINT | 创建人ID | 否 |
| created_at | DATETIME | 创建时间 | 否 |

**索引：**
- PRIMARY KEY (id)
- INDEX idx_class_id (class_id)
- INDEX idx_start_time (start_time)

---

### 6.2 签到记录表 (attendance_records)

| 字段名 | 类型 | 说明 | 加密 |
|--------|------|------|------|
| id | BIGINT | 主键，自增 | 否 |
| task_id | BIGINT | 签到任务ID | 否 |
| user_id | BIGINT | 用户ID | 否 |
| student_no | VARCHAR(32) | 学号 | **是 [AES]** |
| signed_at | DATETIME | 签到时间 | 否 |

**索引：**
- PRIMARY KEY (id)
- UNIQUE KEY uk_task_user (task_id, user_id)
- INDEX idx_task_id (task_id)
- INDEX idx_student_no (student_no)

**说明：**
- student_no 加密存储
- signed_at 为明文，用于统计计算

---

## 七、系统配置表

### 7.1 加密配置表 (encryption_config)

| 字段名 | 类型 | 说明 | 加密 |
|--------|------|------|------|
| id | BIGINT | 主键，自增 | 否 |
| config_key | VARCHAR(64) | 配置键 | 否 |
| config_value | TEXT | 配置值（加密密钥等） | **是 [AES]** |
| description | VARCHAR(255) | 配置说明 | 否 |
| updated_at | DATETIME | 更新时间 | 否 |

**索引：**
- PRIMARY KEY (id)
- UNIQUE KEY uk_config_key (config_key)

**说明：**
- 用于存储加密相关配置，密钥本身也需要加密存储

---

## 数据库设计总结

### 加密字段汇总

需要 AES-256 加密的字段：
1. **用户表**：student_no, teacher_no, phone
2. **班级表**：creator_teacher_no
3. **班级成员表**：student_no
4. **通知阅读记录表**：student_no
5. **作业提交表**：student_no, content, file_metadata
6. **作业批改表**：student_no, score, comment
7. **请假申请表**：student_no, reason, image_metadata
8. **请假审批记录表**：student_no, comment
9. **签到记录表**：student_no
10. **加密配置表**：config_value

### 索引设计原则

- 加密字段的索引：由于加密后无法直接使用索引进行精确查询，需要在应用层进行：
  1. 查询时先解密再比较
  2. 或使用哈希索引（对加密前的值进行哈希，存储哈希值用于快速匹配）

### 性能优化建议

1. 对于加密字段的查询，考虑添加哈希索引字段
2. 敏感字段查询时，在应用层进行批量解密
3. 统计类查询在应用层统一解密后计算，不直接使用数据库聚合函数
