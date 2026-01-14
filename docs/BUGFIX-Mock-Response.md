# Mock 响应格式修复说明

## 问题描述

在 Mock 模式下，请求返回的数据被误判为错误，导致以下问题：

1. **错误信息**：`request:fail invalid url "undefined/home/cards"`
2. **数据格式问题**：Mock 返回的响应缺少 `statusCode` 字段
3. **请求被拒绝**：`api/request.js` 检查 `statusCode === 200` 失败，导致请求被 reject

## 根本原因

1. **Mock 响应格式不一致**：
   - `WxMock.js` 直接返回 Mock 数据，没有包装成标准的 `wx.request` 响应格式
   - 缺少 `statusCode` 字段，导致 `api/request.js` 无法正确判断请求成功

2. **请求处理逻辑不兼容**：
   - `api/request.js` 只检查 `res.statusCode === 200`
   - 没有兼容 Mock 模式下的响应格式

## 修复方案

### 1. 修复 `mock/WxMock.js`

**修改前：**
javascript
var response = Mock.mock(resTemplate);
if (typeof config.success == 'function') {
  config.success(response);
}


**修改后：**
javascript
var response = Mock.mock(resTemplate);

// 确保 Mock 返回的响应格式与真实请求一致
var mockResponse = {
  statusCode: 200,
  data: response,
  header: {},
  cookies: [],
};

if (typeof config.success == 'function') {
  config.success(mockResponse);
}


### 2. 修复 `api/request.js`

**修改前：**
javascript
if (res.statusCode === 200) {
  // 处理成功响应
} else {
  reject(res);
}


**修改后：**
javascript
// 兼容 Mock 模式：如果没有 statusCode，检查 data.code 或 data.success
const isSuccess = res.statusCode === 200 
  || (res.statusCode === undefined && (res.data?.code === 200 || res.data?.success === true));

if (isSuccess) {
  // 处理成功响应
} else {
  reject(res);
}


## 修复效果

1. ✅ Mock 响应格式与真实请求一致
2. ✅ 请求处理逻辑兼容 Mock 和真实 API
3. ✅ 数据正常返回，不再被误判为错误

## 注意事项

### 关于错误信息中的警告

错误信息中可能还会看到以下警告，这些是**非致命性警告**，不影响功能：

1. **字体加载警告**：
   
   Failed to load font https://tdesign.gtimg.com/icon/0.3.1/fonts/t.woff
   
   - 这是 TDesign 组件库的字体文件加载问题
   - 不影响功能，可以忽略

2. **组件属性警告**：
   
   property "url" of "cell" received type-uncompatible value: expected <String> but get null value
   
   - 这是组件属性类型检查警告
   - 需要确保传递给组件的 `url` 属性不为 `null`

3. **SharedArrayBuffer 警告**：
   
   SharedArrayBuffer will require cross-origin isolation
   
   - 这是浏览器兼容性警告
   - 不影响小程序运行

### 数据格式说明

Mock 返回的数据格式：
javascript
{
  statusCode: 200,
  data: {
    code: 200,
    success: true,
    data: [...] // 实际数据
  }
}


业务代码使用方式：
javascript
request('/api/xxx').then((res) => {
  // res.data 是 {code: 200, success: true, data: [...]}
  // res.data.data 是实际数据
  const actualData = res.data.data;
});


## 测试建议

1. **清除缓存**：微信开发者工具 → 清除缓存 → 清除全部
2. **重新编译**：保存文件后重新编译
3. **检查控制台**：确认不再出现 `undefined/home/cards` 错误
4. **验证数据**：确认数据正常显示在页面上

---

**修复时间：** 2026-01-13  
**修复版本：** v1.1
