# 注册接口后端实现文档

## 接口说明

**接口路径：** `POST /api/auth/register`

**功能：** 用户注册，将手机号和密码以 AES 加密方式存储到数据库

---

## 一、数据流程

### 1. 前端提交流程


用户输入 → 前端验证 → AES加密(phone, password) → 发送到后端


### 2. 后端处理流程


接收加密数据 → AES解密 → 数据验证 → 检查重复 → AES加密存储 → 返回结果


---

## 二、请求参数

### 请求体（已加密）

json
{
  "phone": "U2FsdGVkX1...",      // AES加密后的手机号
  "phone_iv": "base64_iv...",    // 手机号加密的IV（初始向量）
  "password": "U2FsdGVkX1...",   // AES加密后的密码
  "password_iv": "base64_iv..."  // 密码加密的IV（初始向量）
}


**注意：** 
- `phone` 和 `password` 字段在前端已使用 AES-256-CBC 加密
- 加密后的数据是 Base64 编码的字符串
- `phone_iv` 和 `password_iv` 是每个字段对应的 IV（初始向量），也是 Base64 编码
- 前端会自动添加 `_iv` 后缀的字段，后端需要同时接收加密数据和 IV

---

## 三、后端实现步骤

### 步骤1：接收请求并解密

javascript
// 伪代码示例（Node.js + Express）

const crypto = require('crypto');

// 获取加密密钥（从配置或密钥管理服务）
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32字节密钥

// AES-256-CBC 解密函数
function decryptAES(encryptedData, iv) {
  const key = Buffer.from(ENCRYPTION_KEY, 'utf8');
  const ivBuffer = Buffer.from(iv, 'utf8');
  const encrypted = Buffer.from(encryptedData, 'base64');
  
  const decipher = cipher.createDecipheriv('aes-256-cbc', key, ivBuffer);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}

// 注册接口
app.post('/api/auth/register', async (req, res) => {
  try {
    const { 
      phone: encryptedPhone, 
      phone_iv: phoneIV,
      password: encryptedPassword,
      password_iv: passwordIV
    } = req.body;
    
    // 验证必要参数
    if (!encryptedPhone || !phoneIV || !encryptedPassword || !passwordIV) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数'
      });
    }
    
    // 解密数据
    const phone = decryptAES(encryptedPhone, phoneIV);
    const password = decryptAES(encryptedPassword, passwordIV);
    
    // 继续后续处理...
  } catch (error) {
    return res.status(500).json({
      code: 500,
      message: '解密失败',
      error: error.message
    });
  }
});


### 步骤2：数据验证

javascript
// 验证手机号格式
const phoneReg = /^[1][3,4,5,7,8,9][0-9]{9}$/;
if (!phoneReg.test(phone)) {
  return res.status(400).json({
    code: 400,
    message: '手机号格式不正确'
  });
}

// 验证密码长度
if (password.length < 6) {
  return res.status(400).json({
    code: 400,
    message: '密码长度至少6位'
  });
}

// 验证密码复杂度（可选）
// 可以要求包含数字、字母等


### 步骤3：检查手机号是否已注册

javascript
// 查询数据库（需要先解密存储的手机号进行比较）
const existingUser = await db.query(
  'SELECT * FROM users WHERE phone = ?',
  [encryptedPhoneInDB] // 注意：数据库中存储的是加密后的手机号
);

// 或者：查询所有用户，在应用层解密后比较（性能较差，不推荐）
// 推荐方案：使用哈希索引字段进行快速匹配

if (existingUser) {
  return res.status(400).json({
    code: 400,
    message: '该手机号已被注册'
  });
}


### 步骤4：密码加密存储

javascript
// 使用 bcrypt 或类似算法对密码进行哈希（推荐）
const bcrypt = require('bcrypt');
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// 或者：使用 AES 加密存储（根据需求选择）
const encryptedPhoneForDB = encryptAES(phone, generateIV());
const encryptedPasswordForDB = encryptAES(hashedPassword, generateIV());


### 步骤5：存储到数据库

sql
-- 数据库表结构（参考 database-design.md）
INSERT INTO users (
  phone,           -- AES加密后的手机号
  password_hash,   -- 密码哈希值（或AES加密后的密码）
  role,            -- 0-未绑定
  created_at,
  updated_at
) VALUES (
  ?,  -- encryptedPhoneForDB
  ?,  -- hashedPassword 或 encryptedPasswordForDB
  0,
  NOW(),
  NOW()
);


javascript
// 执行插入
const result = await db.query(
  `INSERT INTO users (phone, password_hash, role, created_at, updated_at)
   VALUES (?, ?, 0, NOW(), NOW())`,
  [encryptedPhoneForDB, hashedPassword]
);

const userId = result.insertId;


### 步骤6：返回响应

javascript
return res.json({
  code: 200,
  success: true,
  message: '注册成功',
  data: {
    userId: userId
  }
});


---

## 四、完整实现示例（Node.js + Express + MySQL）

javascript
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

const router = express.Router();

// 加密配置
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32字节密钥

// AES 加密函数
function encryptAES(plaintext, iv) {
  const key = Buffer.from(ENCRYPTION_KEY, 'utf8');
  const ivBuffer = Buffer.from(iv, 'utf8');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, ivBuffer);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

// AES 解密函数
function decryptAES(encryptedData, iv) {
  const key = Buffer.from(ENCRYPTION_KEY, 'utf8');
  const ivBuffer = Buffer.from(iv, 'utf8');
  const encrypted = Buffer.from(encryptedData, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivBuffer);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

// 生成 IV
function generateIV() {
  return crypto.randomBytes(16).toString('base64');
}

// 注册接口
router.post('/api/auth/register', async (req, res) => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const { phone: encryptedPhone, password: encryptedPassword } = req.body;
    
    // 1. 解密数据
    // 注意：需要从前端获取 IV，或从加密数据中提取
    // 这里假设 IV 是单独传输的
    const phoneIV = req.body.phone_iv;
    const passwordIV = req.body.password_iv;
    
    if (!phoneIV || !passwordIV) {
      return res.status(400).json({
        code: 400,
        message: '缺少加密参数'
      });
    }
    
    const phone = decryptAES(encryptedPhone, phoneIV);
    const password = decryptAES(encryptedPassword, passwordIV);
    
    // 2. 数据验证
    const phoneReg = /^[1][3,4,5,7,8,9][0-9]{9}$/;
    if (!phoneReg.test(phone)) {
      return res.status(400).json({
        code: 400,
        message: '手机号格式不正确'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        code: 400,
        message: '密码长度至少6位'
      });
    }
    
    // 3. 检查手机号是否已注册
    // 注意：数据库中存储的是加密后的手机号，需要查询所有用户并解密比较
    // 或者使用哈希索引字段进行快速匹配（推荐）
    const [existingUsers] = await connection.execute(
      'SELECT id, phone FROM users'
    );
    
    // 在应用层解密后比较（生产环境建议使用哈希索引优化）
    const phoneIVForDB = generateIV();
    const encryptedPhoneForDB = encryptAES(phone, phoneIVForDB);
    
    for (const user of existingUsers) {
      // 这里需要存储 IV，实际实现中 IV 应该单独存储
      // 简化示例：假设可以从加密数据中提取 IV
      const existingPhone = decryptAES(user.phone, phoneIVForDB);
      if (existingPhone === phone) {
        return res.status(400).json({
          code: 400,
          message: '该手机号已被注册'
        });
      }
    }
    
    // 4. 密码加密（使用 bcrypt 哈希）
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // 5. 存储到数据库
    // 手机号使用 AES 加密存储
    // 密码使用 bcrypt 哈希存储（或也可以 AES 加密存储）
    const [result] = await connection.execute(
      `INSERT INTO users (phone, password_hash, role, created_at, updated_at)
       VALUES (?, ?, 0, NOW(), NOW())`,
      [encryptedPhoneForDB, hashedPassword]
    );
    
    // 6. 返回成功响应
    return res.json({
      code: 200,
      success: true,
      message: '注册成功',
      data: {
        userId: result.insertId
      }
    });
    
  } catch (error) {
    console.error('注册失败:', error);
    return res.status(500).json({
      code: 500,
      message: '注册失败，请重试',
      error: error.message
    });
  } finally {
    await connection.end();
  }
});

module.exports = router;


---

## 五、数据库表结构

参考 `docs/database-design.md` 中的用户表设计：

sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(64) UNIQUE,
  role TINYINT DEFAULT 0 COMMENT '0-未绑定，1-学生，2-教师',
  phone VARCHAR(255) COMMENT 'AES加密后的手机号',
  password_hash VARCHAR(255) COMMENT '密码哈希值',
  phone_hash VARCHAR(64) COMMENT '手机号哈希值（用于快速查询）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone_hash (phone_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


---

## 六、性能优化建议

### 1. 使用哈希索引字段

由于手机号是加密存储的，无法直接使用数据库索引进行查询。建议：

sql
-- 添加手机号哈希字段
ALTER TABLE users ADD COLUMN phone_hash VARCHAR(64);

-- 创建索引
CREATE INDEX idx_phone_hash ON users(phone_hash);


javascript
// 存储时同时存储哈希值
const crypto = require('crypto');
const phoneHash = crypto.createHash('sha256').update(phone).digest('hex');

await connection.execute(
  `INSERT INTO users (phone, phone_hash, password_hash, ...)
   VALUES (?, ?, ?, ...)`,
  [encryptedPhoneForDB, phoneHash, hashedPassword, ...]
);

// 查询时使用哈希值
const [users] = await connection.execute(
  'SELECT * FROM users WHERE phone_hash = ?',
  [phoneHash]
);


### 2. IV 存储方案

**方案1：IV 包含在加密数据中**
- 将 IV 和加密数据组合存储
- 格式：`IV:EncryptedData` 或 `Base64(IV+EncryptedData)`

**方案2：IV 单独存储**
- 在数据库中添加 `phone_iv` 字段
- 查询时同时获取加密数据和 IV

---

## 七、安全注意事项

1. **密钥管理**
   - 密钥仅存在于服务端
   - 使用环境变量或密钥管理服务存储
   - 定期轮换密钥

2. **密码存储**
   - 推荐使用 bcrypt 等哈希算法，而不是 AES 加密
   - AES 加密的密码可以被解密，存在安全风险
   - 哈希算法是单向的，更安全

3. **数据传输**
   - 所有接口使用 HTTPS
   - 敏感数据加密传输

4. **错误处理**
   - 不要暴露详细的错误信息
   - 统一错误响应格式

---

## 八、测试要点

1. **正常注册流程**
   - 输入正确的手机号和密码
   - 验证数据是否正确加密存储

2. **异常情况**
   - 手机号格式错误
   - 密码长度不足
   - 手机号已注册
   - 加密数据损坏

3. **安全性测试**
   - 验证数据库中存储的是加密数据
   - 验证无法通过 SQL 直接查询到明文手机号

---

## 九、前端配合说明

前端已配置自动加密，无需修改前端代码：

1. **加密配置**：`config/api-encryption-config.js` 已配置注册接口的加密字段
2. **自动加密**：`api/request.js` 会自动对 `phone` 和 `password` 进行 AES 加密
3. **IV 传输**：需要确认前端如何传输 IV（可能需要修改前端代码）

---

**最后更新：** 2026-01-13
