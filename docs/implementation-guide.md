# 实现指南

## 一、环境准备

### 1. 安装依赖

bash
npm install crypto-js


### 2. 构建 npm 包

在微信开发者工具中：
1. 工具 → 构建 npm
2. 确保 `miniprogram_npm` 目录下有 `crypto-js` 包

---

## 二、配置说明

### 1. 加密配置 (`config.js`)

javascript
export default {
  isMock: true,
  baseUrl: '',
  encryptionKey: '', // 开发环境测试密钥（生产环境应从后端获取）
  encryptionEnabled: true, // 是否启用加密
};


### 2. 加密配置（现状说明）

当前项目已移除 `api/request.js` 与 `config/api-encryption-config.js` 的 HTTP 接口加密方案，业务数据交互以 **微信云函数** 为主。前端加密主要通过 `utils/crypto.js` 的 `encryptFields` 完成，云函数侧通过各模块 `common/aes.js` 解密并在写库前进行二次加密存储（如需）。

---

## 三、使用方式

### 1. 自动加密（推荐）

当前项目推荐在调用云函数前进行字段级加密（以个人信息编辑为例），再调用 `wx.cloud.callFunction` 发送到云函数。


### 2. 手动加密

如需手动加密，可使用 `utils/crypto.js`：

javascript
import { encrypt, decrypt, encryptFields } from '~/utils/crypto';

// 加密单个值
const { encrypted, iv } = await encrypt('敏感数据');

// 加密对象中的指定字段
const data = {
  studentNo: '2024001',
  phone: '13800138000',
  name: '张三',
};
const encryptedData = await encryptFields(data, ['studentNo', 'phone']);


---

## 四、后端实现要点

### 1. 密钥管理

**推荐方案：RSA + AES 混合加密**

1. 前端请求获取临时 AES 密钥：
   javascript
   GET /api/system/encryption-key
   // 返回 RSA 公钥加密的 AES 密钥
   

2. 前端使用 AES 密钥加密数据，使用 RSA 公钥加密 AES 密钥

3. 后端使用 RSA 私钥解密 AES 密钥，再使用 AES 密钥解密数据

### 2. 数据库存储

- 所有标记为 `[AES加密]` 的字段，在存储前必须加密
- 查询时先解密再比较
- 返回给前端的数据，在应用层解密后返回明文

### 3. 加密字段查询优化

由于加密字段无法直接使用数据库索引，建议：

1. **添加哈希索引字段**：
   sql
   ALTER TABLE users ADD COLUMN student_no_hash VARCHAR(64);
   -- 存储学号的哈希值，用于快速匹配
   

2. **批量解密查询**：
   javascript
   // 伪代码
   const records = await db.query('SELECT * FROM users WHERE ...');
   const decrypted = records.map(record => ({
     ...record,
     studentNo: decrypt(record.student_no, key, iv),
   }));
   

---

## 五、安全建议

### 1. 密钥管理

- ✅ **生产环境**：密钥仅存在于服务端，定期轮换
- ✅ **开发环境**：可使用配置的测试密钥
- ❌ **禁止**：在前端代码中硬编码密钥

### 2. 传输安全

- ✅ 所有接口使用 HTTPS
- ✅ 敏感数据加密传输
- ✅ 使用 Token 机制进行身份验证

### 3. 存储安全

- ✅ 数据库中不存储明文隐私数据
- ✅ 加密字段的 IV（初始向量）可单独存储或包含在密文中
- ✅ 定期备份加密密钥

### 4. 日志安全

- ❌ 不在日志中记录敏感数据的明文
- ✅ 记录操作日志时，对敏感字段进行脱敏处理

---

## 六、测试

### 1. 加密功能测试

javascript
// 测试加密/解密
import { encrypt, decrypt } from '~/utils/crypto';

const testData = '测试数据';
const { encrypted, iv } = await encrypt(testData);
const decrypted = await decrypt(encrypted, iv);
console.log('解密结果:', decrypted === testData); // true


### 2. 接口测试

1. 启用 Mock 模式测试加密流程
2. 连接真实后端测试端到端加密
3. 验证加密字段在数据库中的存储格式

---

## 七、常见问题

### Q1: crypto-js 在小程序中无法使用？

**A:** 确保已正确构建 npm 包，并在 `project.config.json` 中配置：

json
{
  "setting": {
    "packNpmManually": true,
    "packNpmRelationList": [
      {
        "packageJsonPath": "./package.json",
        "miniprogramNpmDistDir": "./miniprogram_npm"
      }
    ]
  }
}


### Q2: 加密后数据长度增加很多？

**A:** 这是正常的，AES 加密后数据会 Base64 编码，长度会增加约 33%。建议：
- 对长文本内容进行压缩后再加密
- 文件类数据直接存储到云存储，只加密元数据

### Q3: 如何调试加密问题？

**A:** 
1. 在 `config.js` 中设置 `encryptionEnabled: false` 临时禁用加密
2. 查看控制台日志，检查加密/解密过程
3. 使用测试密钥验证加密算法正确性

---

## 八、后续优化

1. **密钥轮换机制**：实现自动密钥轮换
2. **性能优化**：对批量查询进行优化，减少解密次数
3. **缓存机制**：对解密后的数据进行适当缓存
4. **监控告警**：监控加密/解密失败率，及时告警
