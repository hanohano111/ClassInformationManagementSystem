/**
 * 项目配置文件
 * 统一管理所有配置项
 */
const config = {
  // API 配置
  isMock: true, // 是否使用 Mock 数据
  baseUrl: '', // API 基础地址，如果为空则使用相对路径（Mock 模式下可以为空）
  
  // 加密配置
  encryptionKey: 'a9F$3dL!8kPz2xQw', // 开发环境测试密钥（生产环境应从后端获取）
  encryptionEnabled: true, // 是否启用加密
};

// 兼容 ES6 和 CommonJS 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = config;
}

export default config;
