# API 接口清单与加密字段说明

## 接口设计原则

1. **请求加密**：涉及敏感字段的 POST/PUT 请求，前端提交前对指定字段进行 AES 加密
2. **响应解密**：后端返回敏感数据时，在应用层解密后返回明文给前端
3. **密钥管理**：密钥仅存在于服务端，前端通过安全接口获取临时加密密钥（或使用非对称加密传输对称密钥）

---

## 一、用户与身份管理模块

### 1.1 微信登录

**接口：** `POST /api/auth/wechat-login`

**请求参数：**
json
{
  "code": "微信登录code",
  "encryptedData": "加密数据（微信提供）",
  "iv": "初始向量（微信提供）"
}


**响应：**
json
{
  "code": 200,
  "data": {
    "openid": "用户OpenID",
    "token": "访问令牌",
    "role": 0  // 0-未绑定，1-学生，2-教师
  }
}


**加密说明：** 无（使用微信官方加密）

---

### 1.2 身份绑定

**接口：** `POST /api/auth/bind-identity`

**请求参数：**
json
{
  "role": 1,  // 1-学生，2-教师
  "studentNo": "[AES加密]学号",  // 学生必填
  "teacherNo": "[AES加密]工号",  // 教师必填
  "phone": "[AES加密]手机号"
}


**加密字段：**
- `studentNo` - AES-256 加密
- `teacherNo` - AES-256 加密
- `phone` - AES-256 加密

**响应：**
json
{
  "code": 200,
  "message": "绑定成功",
  "data": {
    "userId": 123,
    "role": 1
  }
}


**加密说明：**
- 前端提交前对敏感字段加密
- 后端接收后解密 → 校验 → 再次加密存储

---

### 1.3 获取

**接口：** `GET /api/user/info`

**请求参数：** 无（从 token 获取用户信息）

**响应：**
json
{
  "code": 200,
  "data": {
    "userId": 123,
    "role": 1,
    "studentNo": "学号明文",  // 后端解密后返回
    "phone": "手机号明文",    // 后端解密后返回
    "avatar": "头像地址"
  }
}


**加密说明：**
- 后端从数据库读取密文 → 解密 → 返回明文给前端

---

### 1.4 更新个人信息

**接口：** `PUT /api/user/info`

**请求参数：**
json
{
  "phone": "[AES加密]新手机号"
}


**加密字段：**
- `phone` - AES-256 加密

**响应：**
json
{
  "code": 200,
  "message": "更新成功"
}


---

## 二、班级管理模块

### 2.1 创建班级

**接口：** `POST /api/class/create`

**请求参数：**
json
{
  "className": "班级名称",
  "semester": "2024-2025学年第一学期"
}


**响应：**
json
{
  "code": 200,
  "data": {
    "classId": 456,
    "classCode": "ABC123"
  }
}


**加密说明：** 无（班级基础信息不加密）

---

### 2.2 加入班级

**接口：** `POST /api/class/join`

**请求参数：**
json
{
  "classCode": "班级码"
}


**响应：**
json
{
  "code": 200,
  "message": "加入成功",
  "data": {
    "classId": 456,
    "className": "班级名称"
  }
}


**加密说明：**
- 后端自动获取当前用户的学号（已加密存储），建立关联关系

---

### 2.3 获取班级列表

**接口：** `GET /api/class/list`

**请求参数：** 无

**响应：**
json
{
  "code": 200,
  "data": [
    {
      "classId": 456,
      "className": "班级名称",
      "semester": "2024-2025学年第一学期",
      "memberCount": 30
    }
  ]
}


---

### 2.4 获取班级成员列表

**接口：** `GET /api/class/:classId/members`

**请求参数：** 路径参数 `classId`

**响应：**
json
{
  "code": 200,
  "data": [
    {
      "userId": 123,
      "role": 1,
      "studentNo": "学号明文",  // 后端解密后返回（仅教师可见）
      "joinedAt": "2024-01-01 10:00:00"
    }
  ]
}


**加密说明：**
- 后端解密学号后返回
- 权限控制：仅教师可查看成员学号

---

## 三、通知公告模块

### 3.1 发布通知

**接口：** `POST /api/notice/create`

**请求参数：**
json
{
  "classId": 456,
  "title": "通知标题",
  "content": "通知内容",
  "attachmentUrl": "附件地址（可选）",
  "isUrgent": 1  // 0-否，1-是
}


**响应：**
json
{
  "code": 200,
  "data": {
    "noticeId": 789
  }
}


**加密说明：** 无（通知内容明文）

---

### 3.2 获取通知列表

**接口：** `GET /api/notice/list`

**请求参数：**
json
{
  "classId": 456,
  "page": 1,
  "pageSize": 20
}


**响应：**
json
{
  "code": 200,
  "data": {
    "list": [
      {
        "noticeId": 789,
        "title": "通知标题",
        "content": "通知内容",
        "isUrgent": 1,
        "createdAt": "2024-01-01 10:00:00",
        "readStatus": 1  // 0-未读，1-已读
      }
    ],
    "total": 50
  }
}


---

### 3.3 标记通知已读

**接口：** `POST /api/notice/:noticeId/read`

**请求参数：** 路径参数 `noticeId`

**响应：**
json
{
  "code": 200,
  "message": "标记成功"
}


**加密说明：**
- 后端自动记录当前用户的学号（已加密存储）

---

### 3.4 获取通知阅读记录

**接口：** `GET /api/notice/:noticeId/read-records`

**请求参数：** 路径参数 `noticeId`

**响应：**
json
{
  "code": 200,
  "data": {
    "readList": [
      {
        "userId": 123,
        "studentNo": "学号明文",  // 后端解密后返回（仅教师可见）
        "readAt": "2024-01-01 10:00:00"
      }
    ],
    "unreadCount": 5
  }
}


**加密说明：**
- 后端解密学号后返回
- 权限控制：仅教师可查看

---

## 四、作业管理模块

### 4.1 发布作业

**接口：** `POST /api/assignment/create`

**请求参数：**
json
{
  "classId": 456,
  "title": "作业标题",
  "description": "作业说明",
  "deadline": "2024-01-15 23:59:59"
}


**响应：**
json
{
  "code": 200,
  "data": {
    "assignmentId": 101
  }
}


---

### 4.2 提交作业

**接口：** `POST /api/assignment/submit`

**请求参数：**
json
{
  "assignmentId": 101,
  "content": "[AES加密]文本作业内容",
  "fileUrl": "文件地址（可选）",
  "fileMetadata": "[AES加密]{\"fileName\":\"作业.pdf\",\"fileSize\":1024000}"
}


**加密字段：**
- `content` - AES-256 加密
- `fileMetadata` - AES-256 加密（JSON 字符串加密）

**响应：**
json
{
  "code": 200,
  "message": "提交成功",
  "data": {
    "submissionId": 202
  }
}


**加密说明：**
- 前端提交前对 content 和 fileMetadata 加密
- 后端接收后解密 → 验证 → 再次加密存储

---

### 4.3 获取作业列表

**接口：** `GET /api/assignment/list`

**请求参数：**
json
{
  "classId": 456,
  "page": 1,
  "pageSize": 20
}


**响应：**
json
{
  "code": 200,
  "data": {
    "list": [
      {
        "assignmentId": 101,
        "title": "作业标题",
        "description": "作业说明",
        "deadline": "2024-01-15 23:59:59",
        "submitted": 1  // 0-未提交，1-已提交
      }
    ],
    "total": 10
  }
}


---

### 4.4 获取作业提交详情

**接口：** `GET /api/assignment/:assignmentId/submission`

**请求参数：** 路径参数 `assignmentId`

**响应：**
json
{
  "code": 200,
  "data": {
    "submissionId": 202,
    "content": "文本作业内容明文",  // 后端解密后返回
    "fileUrl": "文件地址",
    "fileMetadata": {
      "fileName": "作业.pdf",
      "fileSize": 1024000
    },
    "submittedAt": "2024-01-10 15:30:00"
  }
}


**加密说明：**
- 后端解密 content 和 fileMetadata 后返回

---

### 4.5 批改作业

**接口：** `POST /api/assignment/grade`

**请求参数：**
json
{
  "submissionId": 202,
  "score": "[AES加密]85.5",
  "comment": "[AES加密]作业完成得很好"
}


**加密字段：**
- `score` - AES-256 加密
- `comment` - AES-256 加密

**响应：**
json
{
  "code": 200,
  "message": "批改成功"
}


---

### 4.6 获取作业成绩

**接口：** `GET /api/assignment/:assignmentId/grade`

**请求参数：** 路径参数 `assignmentId`

**响应：**
json
{
  "code": 200,
  "data": {
    "score": "85.5",  // 后端解密后返回
    "comment": "作业完成得很好"  // 后端解密后返回
  }
}


---

## 五、请假审批模块

### 5.1 提交请假申请

**接口：** `POST /api/leave/create`

**请求参数：**
json
{
  "classId": 456,
  "reason": "[AES加密]因病请假",
  "startTime": "2024-01-20 08:00:00",
  "endTime": "2024-01-22 18:00:00",
  "imageUrl": "凭证图片地址（可选）",
  "imageMetadata": "[AES加密]{\"fileName\":\"病假条.jpg\",\"uploadTime\":\"2024-01-19 10:00:00\"}"
}


**加密字段：**
- `reason` - AES-256 加密
- `imageMetadata` - AES-256 加密

**响应：**
json
{
  "code": 200,
  "data": {
    "leaveRequestId": 303
  }
}


---

### 5.2 获取请假列表

**接口：** `GET /api/leave/list`

**请求参数：**
json
{
  "classId": 456,
  "status": 0,  // 0-待审批，1-已通过，2-已拒绝（可选）
  "page": 1,
  "pageSize": 20
}


**响应：**
json
{
  "code": 200,
  "data": {
    "list": [
      {
        "leaveRequestId": 303,
        "studentNo": "学号明文",  // 后端解密后返回（仅教师可见）
        "reason": "请假原因明文",  // 后端解密后返回
        "startTime": "2024-01-20 08:00:00",
        "endTime": "2024-01-22 18:00:00",
        "status": 0,
        "createdAt": "2024-01-19 10:00:00"
      }
    ],
    "total": 15
  }
}


**加密说明：**
- 权限控制：学生只能看到自己的申请，教师可看到所有申请
- 后端解密后返回

---

### 5.3 审批请假

**接口：** `POST /api/leave/:leaveRequestId/approve`

**请求参数：**
json
{
  "status": 1,  // 1-通过，2-拒绝
  "comment": "[AES加密]同意请假"
}


**加密字段：**
- `comment` - AES-256 加密

**响应：**
json
{
  "code": 200,
  "message": "审批成功"
}


---

### 5.4 获取审批详情

**接口：** `GET /api/leave/:leaveRequestId/detail`

**请求参数：** 路径参数 `leaveRequestId`

**响应：**
json
{
  "code": 200,
  "data": {
    "leaveRequestId": 303,
    "reason": "请假原因明文",
    "startTime": "2024-01-20 08:00:00",
    "endTime": "2024-01-22 18:00:00",
    "status": 1,
    "comment": "审批意见明文",  // 后端解密后返回
    "approvedAt": "2024-01-19 15:00:00"
  }
}


---

## 六、考勤签到模块

### 6.1 创建签到任务

**接口：** `POST /api/attendance/create`

**请求参数：**
json
{
  "classId": 456,
  "title": "签到任务标题",
  "startTime": "2024-01-20 08:00:00",
  "endTime": "2024-01-20 08:30:00"
}


**响应：**
json
{
  "code": 200,
  "data": {
    "taskId": 404
  }
}


---

### 6.2 学生签到

**接口：** `POST /api/attendance/sign`

**请求参数：**
json
{
  "taskId": 404
}


**响应：**
json
{
  "code": 200,
  "message": "签到成功",
  "data": {
    "signedAt": "2024-01-20 08:15:00"
  }
}


**加密说明：**
- 后端自动记录当前用户的学号（已加密存储）

---

### 6.3 获取签到记录

**接口：** `GET /api/attendance/:taskId/records`

**请求参数：** 路径参数 `taskId`

**响应：**
json
{
  "code": 200,
  "data": {
    "taskInfo": {
      "taskId": 404,
      "title": "签到任务标题",
      "startTime": "2024-01-20 08:00:00",
      "endTime": "2024-01-20 08:30:00"
    },
    "records": [
      {
        "userId": 123,
        "studentNo": "学号明文",  // 后端解密后返回（仅教师可见）
        "signedAt": "2024-01-20 08:15:00"
      }
    ],
    "totalCount": 30,
    "signedCount": 28,
    "attendanceRate": "93.33%"
  }
}


**加密说明：**
- 后端解密学号后返回
- 统计计算在后端统一解密后完成

---

## 七、系统级接口

### 7.1 获取加密密钥（临时方案）

**接口：** `GET /api/system/encryption-key`

**请求参数：** 无

**响应：**
json
{
  "code": 200,
  "data": {
    "publicKey": "RSA公钥（用于加密传输AES密钥）",
    "keyExpireTime": "2024-01-20 10:00:00"
  }
}


**说明：**
- 推荐方案：使用 RSA 非对称加密传输 AES 密钥
- 或使用微信小程序的安全存储机制

---

### 7.2 健康检查

**接口：** `GET /api/health`

**响应：**
json
{
  "code": 200,
  "message": "服务正常"
}


---

## 接口加密字段汇总表

| 接口 | 方法 | 加密字段 | 说明 |
|------|------|----------|------|
| `/api/auth/bind-identity` | POST | studentNo, teacherNo, phone | 身份绑定 |
| `/api/user/info` | PUT | phone | 更新手机号 |
| `/api/assignment/submit` | POST | content, fileMetadata | 提交作业 |
| `/api/assignment/grade` | POST | score, comment | 批改作业 |
| `/api/leave/create` | POST | reason, imageMetadata | 提交请假 |
| `/api/leave/:id/approve` | POST | comment | 审批意见 |

---

## 错误码规范

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（token 无效） |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
| 501 | 加密/解密失败 |

---

## 安全建议

1. **HTTPS 传输**：所有接口必须使用 HTTPS
2. **Token 机制**：使用 JWT 或类似机制进行身份验证
3. **请求签名**：对敏感接口增加请求签名验证
4. **频率限制**：对登录、绑定等关键接口进行频率限制
5. **密钥轮换**：定期轮换加密密钥
