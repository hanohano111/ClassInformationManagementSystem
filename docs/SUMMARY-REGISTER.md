# 注册功能实现总结

## ✅ 已完成的工作

### 1. 前端加密配置 ✅
- **文件：** `config/api-encryption-config.js`
- **配置：** 注册接口 `/api/auth/register` 的 `phone` 和 `password` 字段已配置为自动加密
- **状态：** ✅ 已配置

### 2. 前端加密实现 ✅
- **文件：** `utils/crypto.js`
- **功能：** 
  - `encryptFields` 函数会自动加密指定字段
  - 加密时会生成 IV（初始向量）
  - **已更新：** IV 会通过 `phone_iv` 和 `password_iv` 字段一起发送到后端
- **状态：** ✅ 已实现并更新

### 3. 请求拦截器 ✅
- **文件：** `api/request.js`
- **功能：** 自动拦截注册请求，对 `phone` 和 `password` 进行 AES 加密
- **状态：** ✅ 已实现

### 4. 注册页面 ✅
- **文件：** `pages/register/register.js`
- **功能：** 完整的注册表单和验证逻辑
- **状态：** ✅ 已实现

### 5. 后端实现文档 ✅
- **文件：** 
  - `docs/backend-register-implementation.md` - 详细实现文档
  - `docs/backend-register-quick-start.md` - 快速开始指南
- **内容：** 
  - 完整的数据流程说明
  - 代码实现示例
  - 数据库表结构
  - 安全注意事项
- **状态：** ✅ 已创建

---

## 📋 数据流程


用户输入手机号和密码
    ↓
前端验证（格式、长度等）
    ↓
前端 AES 加密（phone, password）
    ↓
前端发送到后端（包含加密数据和 IV）
    ↓
后端接收并解密
    ↓
后端验证数据
    ↓
后端检查手机号是否已注册
    ↓
后端 AES 加密手机号 + bcrypt 哈希密码
    ↓
后端存储到数据库
    ↓
返回注册成功


---

## 🔐 加密流程

### 前端加密
1. 用户输入：`phone: "13800138000"`, `password: "123456"`
2. 前端加密：
   javascript
   phone → AES加密 → "U2FsdGVkX1..." + IV → "base64_iv..."
   password → AES加密 → "U2FsdGVkX1..." + IV → "base64_iv..."
   
3. 发送到后端：
   json
   {
     "phone": "U2FsdGVkX1...",
     "phone_iv": "base64_iv...",
     "password": "U2FsdGVkX1...",
     "password_iv": "base64_iv..."
   }
   

### 后端处理
1. 接收加密数据
2. 使用 IV 解密：
   javascript
   phone = decryptAES(encryptedPhone, phoneIV)
   password = decryptAES(encryptedPassword, passwordIV)
   
3. 验证数据
4. 重新加密存储：
   javascript
   encryptedPhoneForDB = encryptAES(phone, newIV)
   hashedPassword = bcrypt.hash(password)
   
5. 存储到数据库

---

## 📊 数据库存储

### 用户表结构

sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(255) COMMENT 'AES加密后的手机号',
  phone_iv VARCHAR(64) COMMENT 'IV（如果单独存储）',
  phone_hash VARCHAR(64) COMMENT '手机号哈希（用于快速查询）',
  password_hash VARCHAR(255) COMMENT 'bcrypt哈希后的密码',
  role TINYINT DEFAULT 0 COMMENT '0-未绑定，1-学生，2-教师',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone_hash (phone_hash)
);


### 存储示例

| 字段 | 存储值 | 说明 |
|------|--------|------|
| phone | `U2FsdGVkX1...` | AES加密后的手机号 |
| phone_iv | `base64_iv...` | IV（如果单独存储） |
| phone_hash | `sha256_hash...` | 手机号哈希值（用于快速查询） |
| password_hash | `$2b$10$...` | bcrypt哈希后的密码 |

---

## 🔑 关键配置

### 前端配置

**加密配置：** `config/api-encryption-config.js`
javascript
'/api/auth/register': {
  encryptFields: ['password', 'phone'],
  decryptFields: [],
}


**加密密钥：** `config.js`
javascript
encryptionKey: 'a9F$3dL!8kPz2xQw', // 开发环境测试密钥


### 后端配置

**环境变量：**
bash
ENCRYPTION_KEY=your-32-byte-key-here
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=class_information


---

## ⚠️ 重要注意事项

### 1. IV 传输
- ✅ 前端已更新，会自动发送 `phone_iv` 和 `password_iv`
- ✅ 后端需要同时接收加密数据和 IV

### 2. 密钥管理
- ⚠️ 生产环境必须从密钥管理服务获取密钥
- ⚠️ 不能在前端代码中硬编码密钥
- ⚠️ 密钥必须定期轮换

### 3. 密码存储
- ✅ 推荐使用 bcrypt 哈希，而不是 AES 加密
- ✅ bcrypt 是单向的，更安全
- ✅ AES 加密的密码可以被解密，存在风险

### 4. 性能优化
- ✅ 使用 `phone_hash` 字段进行快速查询
- ✅ 避免在应用层解密所有用户数据进行比较

---

## 📝 下一步工作

### 后端开发（待实现）
- [ ] 实现注册接口 `/api/auth/register`
- [ ] 实现 AES 加密/解密工具函数
- [ ] 实现数据库操作（插入用户）
- [ ] 实现手机号重复检查（使用哈希索引）
- [ ] 添加错误处理和日志记录

### 测试（待进行）
- [ ] 单元测试
- [ ] 集成测试
- [ ] 安全测试（验证加密存储）

---

## 📚 相关文档

- **详细实现：** `docs/backend-register-implementation.md`
- **快速开始：** `docs/backend-register-quick-start.md`
- **数据库设计：** `docs/database-design.md`
- **API 设计：** `docs/api-design.md`

---

**最后更新：** 2026-01-13
