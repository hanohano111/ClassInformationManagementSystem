# 班级信息管理系统 - 加密功能说明

## 📋 概述

本系统实现了基于 **AES-256** 加密算法的数据安全保护机制，对敏感数据进行分级加密存储和传输。

## 🔐 加密设计原则

1. **数据分级加密**：根据数据敏感程度决定是否加密
2. **按需加密**：只对敏感字段进行加密，不影响性能
3. **密钥安全**：密钥仅存在于服务端，前端不保存密钥
4. **透明加密**：业务代码无需关心加密细节，自动处理

## 📁 文件结构


├── docs/
│   ├── database-design.md          # 数据库表结构设计（含加密字段标注）
│   ├── api-design.md                # API接口清单（含加密字段说明）
│   └── implementation-guide.md      # 实现指南
├── utils/
│   └── crypto.js                    # AES加密工具模块
├── config/
│   ├── api-encryption-config.js    # API加密配置映射
│   └── index.js                     # 配置文件
├── api/
│   └── request.js                   # 请求拦截器（自动加密/解密）
└── README-ENCRYPTION.md             # 本文档


## 🚀 快速开始

### 1. 安装依赖

bash
npm install crypto-js


### 2. 构建 npm 包

在微信开发者工具中：
- 工具 → 构建 npm
- 确保 `miniprogram_npm` 目录下有 `crypto-js` 包

### 3. 配置加密

编辑 `config.js`：

javascript
export default {
  isMock: true,
  baseUrl: '',
  encryptionKey: '', // 开发环境测试密钥（生产环境应从后端获取）
  encryptionEnabled: true, // 是否启用加密
};


## 📖 使用方式

### 自动加密（推荐）

使用 `api/request.js` 发送请求时，会自动根据配置加密/解密：

javascript
import request from '~/api/request';

// 提交作业（content 和 fileMetadata 会自动加密）
request('/api/assignment/submit', 'POST', {
  assignmentId: 101,
  content: '作业内容', // ✅ 自动加密
  fileMetadata: JSON.stringify({ fileName: '作业.pdf' }), // ✅ 自动加密
});


### 手动加密

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


## 🔑 密钥管理

### 推荐方案：RSA + AES 混合加密

1. **前端请求获取临时 AES 密钥**：
  javascript
   GET /api/system/encryption-key
   // 返回 RSA 公钥加密的 AES 密钥
   

2. **前端使用 AES 密钥加密数据**

3. **后端使用 RSA 私钥解密 AES 密钥，再使用 AES 密钥解密数据**

### 开发环境

可使用配置的测试密钥（仅用于开发测试）：

javascript
// config.js
encryptionKey: 'your-32-byte-test-key-here!!'


## 📊 加密字段清单

### 用户模块
- ✅ 学号 (studentNo)
- ✅ 工号 (teacherNo)
- ✅ 手机号 (phone)

### 作业模块
- ✅ 作业内容 (content)
- ✅ 文件元数据 (fileMetadata)
- ✅ 成绩 (score)
- ✅ 评语 (comment)

### 请假模块
- ✅ 请假原因 (reason)
- ✅ 凭证元数据 (imageMetadata)
- ✅ 审批意见 (comment)

### 其他模块
- ✅ 阅读记录中的学号
- ✅ 签到记录中的学号
- ✅ 班级成员中的学号

## 🛡️ 安全建议

1. **密钥管理**
   - ✅ 生产环境：密钥仅存在于服务端，定期轮换
   - ✅ 开发环境：可使用配置的测试密钥
   - ❌ 禁止：在前端代码中硬编码密钥

2. **传输安全**
   - ✅ 所有接口使用 HTTPS
   - ✅ 敏感数据加密传输
   - ✅ 使用 Token 机制进行身份验证

3. **存储安全**
   - ✅ 数据库中不存储明文隐私数据
   - ✅ 加密字段的 IV 可单独存储或包含在密文中
   - ✅ 定期备份加密密钥

## 📚 详细文档

- [数据库表结构设计](./docs/database-design.md) - 完整的表结构设计，标注了所有加密字段
- [API接口清单](./docs/api-design.md) - 所有接口的详细说明，包含加密字段标注
- [实现指南](./docs/implementation-guide.md) - 后端实现要点和常见问题

## ⚠️ 注意事项

1. **crypto-js 安装**：必须安装并构建 npm 包，否则加密功能无法使用
2. **密钥安全**：生产环境必须从后端获取密钥，不能在前端硬编码
3. **性能影响**：加密/解密会有一定性能开销，建议对批量操作进行优化
4. **调试模式**：可在 `config.js` 中设置 `encryptionEnabled: false` 临时禁用加密

## 🔧 故障排查

### Q: crypto-js 在小程序中无法使用？

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

### Q: 加密后数据长度增加很多？

**A:** 这是正常的，AES 加密后数据会 Base64 编码，长度会增加约 33%。建议：
- 对长文本内容进行压缩后再加密
- 文件类数据直接存储到云存储，只加密元数据

### Q: 如何调试加密问题？

**A:** 
1. 在 `config.js` 中设置 `encryptionEnabled: false` 临时禁用加密
2. 查看控制台日志，检查加密/解密过程
3. 使用测试密钥验证加密算法正确性

## 📞 技术支持

如有问题，请查看：
- [实现指南](./docs/implementation-guide.md) 中的常见问题部分
- 代码注释中的详细说明

---

**最后更新：** 2024-01-20
