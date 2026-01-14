# 注册接口快速实现指南

## 核心要点

### 1. 数据流程


前端 → AES加密(phone, password) → 后端 → AES解密 → 验证 → 加密存储 → 数据库


### 2. 关键步骤

1. **接收加密数据**：前端已自动加密 `phone` 和 `password`
2. **解密数据**：使用 AES-256-CBC 解密
3. **数据验证**：验证手机号格式、密码长度
4. **检查重复**：查询数据库检查手机号是否已注册
5. **加密存储**：将手机号 AES 加密后存储，密码使用 bcrypt 哈希
6. **返回结果**：返回注册成功的响应

---

## 最小实现示例

### Node.js + Express

javascript
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// 配置
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32字节密钥

// 解密函数
function decryptAES(encrypted, iv) {
  const key = Buffer.from(ENCRYPTION_KEY, 'utf8');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'base64'));
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// 加密函数
function encryptAES(plaintext) {
  const key = Buffer.from(ENCRYPTION_KEY, 'utf8');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return { encrypted, iv: iv.toString('base64') };
}

// 注册接口
app.post('/api/auth/register', async (req, res) => {
  try {
    // 1. 解密（前端会自动发送 IV）
    const { 
      phone: encPhone, 
      phone_iv, 
      password: encPassword, 
      password_iv 
    } = req.body;
    const phone = decryptAES(encPhone, phone_iv);
    const password = decryptAES(encPassword, password_iv);
    
    // 2. 验证
    if (!/^[1][3,4,5,7,8,9][0-9]{9}$/.test(phone)) {
      return res.json({ code: 400, message: '手机号格式不正确' });
    }
    if (password.length < 6) {
      return res.json({ code: 400, message: '密码长度至少6位' });
    }
    
    // 3. 检查重复（简化示例，实际需要优化）
    // TODO: 使用哈希索引优化查询
    
    // 4. 加密存储
    const { encrypted: encryptedPhone, iv: phoneIV } = encryptAES(phone);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 5. 存储到数据库
    // INSERT INTO users (phone, password_hash, ...) VALUES (?, ?, ...)
    
    // 6. 返回成功
    return res.json({ code: 200, success: true, message: '注册成功' });
  } catch (error) {
    return res.json({ code: 500, message: '注册失败' });
  }
});


---

## 数据库表结构

sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(255) COMMENT 'AES加密后的手机号',
  phone_iv VARCHAR(64) COMMENT 'IV（如果单独存储）',
  phone_hash VARCHAR(64) COMMENT '手机号哈希（用于快速查询）',
  password_hash VARCHAR(255) COMMENT 'bcrypt哈希后的密码',
  role TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone_hash (phone_hash)
);


---

## 注意事项

1. **IV 传输**：需要确认前端如何传输 IV，可能需要修改前端代码添加 IV 字段
2. **密钥安全**：密钥必须存储在服务端，不能暴露
3. **性能优化**：使用哈希索引字段进行快速查询
4. **密码存储**：密码使用 bcrypt 哈希，不要用 AES 加密

---

详细实现请参考：`docs/backend-register-implementation.md`
