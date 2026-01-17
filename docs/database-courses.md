# 班级管理数据库集合结构

## 数据库集合说明

本项目使用微信云开发数据库，包含以下集合：

### 1. users（用户集合）
已存在的集合，存储用户基本信息。

### 2. courses（班级集合）
存储所有班级的基本信息。

#### 字段说明

| 字段名 | 类型 | 说明 | 必填 |
|--------|------|------|------|
| _id | String | 系统自动生成的唯一ID | 是 |
| name | String | 班级名称 | 是 |
| teacherName | String | 老师名称 | 否 |
| semester | String | 学期信息 | 否 |
| classCode | String | 班级码（6位字母数字，唯一） | 是 |
| creatorId | String | 创建者用户ID（关联users._id） | 是 |
| creatorOpenid | String | 创建者openid | 是 |
| status | Number | 状态：0-禁用，1-启用 | 是 |
| createdAt | Number | 创建时间（时间戳） | 是 |
| updatedAt | Number | 更新时间（时间戳） | 是 |

#### 索引建议
- `classCode`: 唯一索引（确保班级码不重复）
- `creatorId`: 普通索引（用于查询用户创建的班级）

### 3. course_members（班级成员集合）
存储用户与班级的关联关系，用于管理班级成员和管理员。

#### 字段说明

| 字段名 | 类型 | 说明 | 必填 |
|--------|------|------|------|
| _id | String | 系统自动生成的唯一ID | 是 |
| courseId | String | 班级ID（关联courses._id） | 是 |
| userId | String | 用户ID（关联users._id） | 是 |
| openid | String | 用户openid | 是 |
| role | String | 角色：'admin'-管理员，'member'-普通成员 | 是 |
| joinedAt | Number | 加入时间（时间戳） | 是 |

#### 索引建议
- `courseId`: 普通索引（用于查询班级的所有成员）
- `openid`: 普通索引（用于查询用户加入的所有班级）
- 复合索引：`{ courseId: 1, openid: 1 }`（用于快速查询用户是否已加入某班级）

## 数据关系

```
users (用户)
  ↓ (creatorId)
courses (班级)
  ↓ (courseId)
course_members (班级成员)
  ↑ (userId/openid)
users (用户)
```

## 云函数说明

### 1. createClass（创建班级）
- **功能**：创建新班级并自动将创建者添加为管理员
- **输入**：`name`, `teacherName`, `semester`, `classCode`
- **输出**：`classId`, `classCode`

### 2. joinClass（加入班级）
- **功能**：通过班级码加入班级
- **输入**：`classCode`
- **输出**：`classId`, `className`

### 3. getClassList（获取班级列表）
- **功能**：获取当前用户加入的所有班级
- **输入**：无（自动从openid获取）
- **输出**：班级列表数组

### 4. getClassDetail（获取班级详情）
- **功能**：根据班级ID获取班级详细信息
- **输入**：`classId`
- **输出**：班级详细信息

### 5. exitClass（退出班级）
- **功能**：退出已加入的班级
- **输入**：`classId`
- **输出**：成功/失败信息

## 数据库权限设置

### courses 集合
- **读取权限**：所有用户可读（用于通过班级码查找班级）
- **写入权限**：仅创建者可写（管理员可修改班级信息）

### course_members 集合
- **读取权限**：仅创建者可读（用户只能查看自己加入的班级）
- **写入权限**：仅创建者可写（通过云函数控制）

## 注意事项

1. **班级码唯一性**：创建班级时会检查班级码是否已存在
2. **成员去重**：加入班级时会检查用户是否已加入
3. **管理员权限**：班级创建者自动成为管理员，可通过 `course_members` 集合的 `role` 字段管理
4. **数据隔离**：不同用户的数据通过 `openid` 和 `userId` 进行隔离
