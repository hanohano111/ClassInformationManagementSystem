# 课程管理 AES 加密说明

## 加密流程

### 1. 前端加密（小程序端）

在调用云函数前，对敏感信息进行 AES 加密：

```javascript
import { encryptFields } from '~/utils/crypto';

// 创建课程时
const encryptedData = await encryptFields(
  {
    name: name.trim(),
    teacherName: teacherName.trim(),  // 敏感信息
    semester: semester.trim(),
    classCode,
  },
  ['teacherName'], // 只加密老师姓名
);

await wx.cloud.callFunction({
  name: 'createClass',
  data: encryptedData,
});
```

### 2. 云函数解密（服务端）

云函数接收加密数据后，先解密：

```javascript
const { decryptFields } = require('./common/aes');

// 解密前端传来的加密数据
const input = decryptFields(event, ['teacherName']);
const { name, teacherName, semester, classCode } = input;
```

### 3. 存储前再次加密（服务端）

解密后，在存储到数据库前再次加密：

```javascript
const { encryptFieldsForDB } = require('./common/aes');

let courseData = {
  name: name.trim(),
  teacherName: teacherName.trim(),
  // ...
};

// 写库前再次 AES 加密敏感字段
courseData = encryptFieldsForDB(courseData, ['teacherName']);

await courses.add({ data: courseData });
```

### 4. 读取后解密（服务端）

从数据库读取数据后，解密返回给前端：

```javascript
const { decryptFieldsFromDB } = require('./common/aes');

// 从数据库读取
const courseRes = await courses.doc(classId).get();

// 解密敏感字段
let courseData = {
  id: courseRes.data._id,
  ...courseRes.data,
};
courseData = decryptFieldsFromDB(courseData, ['teacherName']);

return {
  code: 200,
  success: true,
  data: courseData,
};
```

## 加密字段

### courses 集合

| 字段名 | 是否加密 | 说明 |
|--------|---------|------|
| name | 否 | 课程名称（公开信息） |
| teacherName | **是** | 老师姓名（敏感信息） |
| semester | 否 | 学期信息（公开信息） |
| classCode | 否 | 课程码（公开信息） |

## 涉及的云函数

1. **createClass** - 创建课程
   - 接收：加密的 `teacherName`
   - 存储：加密的 `teacherName` + `teacherName_iv`

2. **getClassDetail** - 获取课程详情
   - 读取：加密的 `teacherName` + `teacherName_iv`
   - 返回：解密的 `teacherName`

3. **getClassList** - 获取课程列表
   - 读取：加密的 `teacherName` + `teacherName_iv`
   - 返回：解密的 `teacherName`

4. **updateClass** - 更新课程信息
   - 接收：加密的 `teacherName`
   - 存储：加密的 `teacherName` + `teacherName_iv`

## 数据库字段格式

加密后的数据在数据库中的存储格式：

```javascript
{
  name: "离散数学",
  teacherName: "U2FsdGVkX1...",  // 加密后的密文（Base64）
  teacherName_iv: "dGVzdGl2MTIzNDU2Nzg=",  // IV（Base64）
  semester: "2024春季",
  classCode: "ABC123",
  // ...
}
```

## 注意事项

1. **密钥管理**：所有云函数使用相同的加密密钥（`a9F$3dL!8kPz2xQw`），生产环境建议使用环境变量
2. **IV 存储**：每个加密字段都有对应的 `_iv` 字段存储初始向量
3. **解密时机**：只在返回给前端前解密，数据库中的存储始终是密文
4. **非敏感信息**：课程名称、学期、课程码等公开信息不加密
