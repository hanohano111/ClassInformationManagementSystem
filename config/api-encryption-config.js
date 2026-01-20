/**
 * API 接口加密配置
 * 定义哪些接口的哪些字段需要加密/解密
 */

/**
 * 接口加密配置映射
 * key: 接口路径（支持通配符）
 * value: {
 *   encryptFields: 请求时需要加密的字段数组
 *   decryptFields: 响应时需要解密的字段数组
 * }
 */
const encryptionConfig = {
  // 注：本项目实际登录采用 OpenID + 云函数方式，不使用“账号密码登录/注册/找回密码”这类 HTTP 接口。
  // 如需扩展为独立 HTTP 后端，可在此处恢复相关接口的加密配置。
  
  // 更新个人信息
  '/api/user/info': {
    encryptFields: ['phone', 'studentNo'],
    decryptFields: ['studentNo', 'phone'],
  },
  
  // 获取个人信息
  '/api/genPersonalInfo': {
    encryptFields: [],
    decryptFields: ['studentNo'],
  },
  
  // 提交作业
  '/api/assignment/submit': {
    encryptFields: ['content', 'fileMetadata'],
    decryptFields: [],
  },
  
  // 获取作业提交详情
  '/api/assignment/:assignmentId/submission': {
    encryptFields: [],
    decryptFields: ['content', 'fileMetadata'],
  },
  
  // 批改作业
  '/api/assignment/grade': {
    encryptFields: ['score', 'comment'],
    decryptFields: [],
  },
  
  // 获取作业成绩
  '/api/assignment/:assignmentId/grade': {
    encryptFields: [],
    decryptFields: ['score', 'comment'],
  },
  
  // 提交请假申请
  '/api/leave/create': {
    encryptFields: ['reason', 'imageMetadata'],
    decryptFields: [],
  },
  
  // 获取请假列表
  '/api/leave/list': {
    encryptFields: [],
    decryptFields: ['studentNo', 'reason', 'imageMetadata'],
  },
  
  // 获取请假详情
  '/api/leave/:leaveRequestId/detail': {
    encryptFields: [],
    decryptFields: ['reason', 'imageMetadata', 'comment'],
  },
  
  // 审批请假
  '/api/leave/:leaveRequestId/approve': {
    encryptFields: ['comment'],
    decryptFields: [],
  },
  
  // 获取班级成员列表
  '/api/class/:classId/members': {
    encryptFields: [],
    decryptFields: ['studentNo'],
  },
  
  // 获取通知阅读记录
  '/api/notice/:noticeId/read-records': {
    encryptFields: [],
    decryptFields: ['studentNo'],
  },
  
  // 获取签到记录
  '/api/attendance/:taskId/records': {
    encryptFields: [],
    decryptFields: ['studentNo'],
  },
};

/**
 * 匹配接口路径
 * 支持通配符匹配，如 /api/assignment/:assignmentId/submission
 */
function matchApiPath(url, configKey) {
  // 精确匹配
  if (url === configKey) {
    return true;
  }
  
  // 通配符匹配
  const pattern = configKey.replace(/:[^/]+/g, '[^/]+');
  const regex = new RegExp(`^${pattern}$`);
  return regex.test(url);
}

/**
 * 获取接口的加密配置
 * @param {string} url - 接口路径
 * @returns {object|null} 加密配置
 */
function getEncryptionConfig(url) {
  // 移除 baseUrl 前缀
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  
  // 查找匹配的配置
  for (const [key, config] of Object.entries(encryptionConfig)) {
    if (matchApiPath(path, key)) {
      return config;
    }
  }
  
  return null;
}

// 兼容 ES6 和 CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = encryptionConfig;
  module.exports.getEncryptionConfig = getEncryptionConfig;
}

export default encryptionConfig;
export { getEncryptionConfig };
