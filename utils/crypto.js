/**
 * AES 加密工具模块
 * 
 * 注意：密钥管理策略
 * 1. 生产环境：密钥仅存在于服务端，前端通过安全接口获取临时密钥
 * 2. 开发环境：可使用配置的测试密钥
 * 3. 推荐方案：使用 RSA 非对称加密传输 AES 密钥
 */

// 引入 crypto-js（需要先安装：npm install crypto-js）
// 如果未安装，可以使用微信小程序内置的加密 API
let CryptoJS = null;

// 尝试引入 crypto-js
try {
  // 微信小程序中使用 require 引入 npm 包
  // eslint-disable-next-line
  CryptoJS = require('crypto-js');
} catch (e) {
  console.warn('crypto-js 未安装，请运行: npm install crypto-js');
}

/**
 * 获取加密密钥
 * 优先级：1. 从后端获取临时密钥 2. 从配置获取 3. 使用默认测试密钥
 */
async function getEncryptionKey() {
  // 如果启用 mock 或 baseUrl 为空，直接使用本地配置的密钥
  try {
    // eslint-disable-next-line
    const localConfigModule = require('../config');
    const localConfig = localConfigModule.default || localConfigModule;
    if (localConfig?.encryptionKey && (localConfig.isMock || !localConfig.baseUrl)) {
      return localConfig.encryptionKey;
    }
  } catch (e) {
    // ignore
  }

  // 方案1：从后端获取临时密钥（推荐）
  try {
    const tokenString = wx.getStorageSync('encryption_key');
    const keyExpireTime = wx.getStorageSync('encryption_key_expire');
    
    // 检查密钥是否过期
    if (tokenString && keyExpireTime && new Date(keyExpireTime) > new Date()) {
      return tokenString;
    }
    
    // 从后端获取新密钥
    // eslint-disable-next-line
    const request = require('../api/request').default || require('../api/request');
    const res = await request('/api/system/encryption-key', 'GET');
    
    if (res.code === 200 && res.data && res.data.key) {
      // 存储密钥和过期时间
      wx.setStorageSync('encryption_key', res.data.key);
      wx.setStorageSync('encryption_key_expire', res.data.expireTime);
      return res.data.key;
    }
  } catch (error) {
    console.warn('获取加密密钥失败，使用配置密钥', error);
  }
  
  // 方案2：从配置获取（开发环境）
  try {
    // eslint-disable-next-line
    const configModule = require('../config');
    const config = configModule.default || configModule;
    if (config && config.encryptionKey) {
      return config.encryptionKey;
    }
  } catch (error) {
    console.warn('获取配置失败:', error);
  }
  
  // 方案3：默认测试密钥（仅用于开发，生产环境必须从后端获取）
  console.warn('使用默认测试密钥，生产环境请配置密钥管理');
  return 'default-test-key-32-bytes-long!!'; // 32字节密钥
}

/**
 * 生成随机 IV（初始向量）
 */
function generateIV() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let iv = '';
  for (let i = 0; i < 16; i++) {
    iv += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return iv;
}

/**
 * AES-256-CBC 加密
 * @param {string} plaintext - 明文
 * @param {string} key - 密钥（32字节）
 * @param {string} iv - 初始向量（16字节）
 * @returns {string} 加密后的密文（Base64编码）
 */
function encryptAES(plaintext, key, iv) {
  if (!plaintext) {
    return '';
  }
  
  // 使用 crypto-js
  if (CryptoJS) {
    // 后端使用的是 32 字节 key（不足会在右侧补 0），这里保持一致
    const fullKey = key.padEnd(32, '0').slice(0, 32);
    const encrypted = CryptoJS.AES.encrypt(plaintext, CryptoJS.enc.Utf8.parse(fullKey), {
      iv: CryptoJS.enc.Utf8.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return encrypted.toString();
  }
  
  // 使用微信小程序内置加密 API（备选方案）
  // 注意：微信小程序没有直接提供 AES 加密 API，建议安装 crypto-js
  throw new Error('crypto-js 未安装，请运行: npm install crypto-js');
}

/**
 * AES-256-CBC 解密
 * @param {string} ciphertext - 密文（Base64编码）
 * @param {string} key - 密钥（32字节）
 * @param {string} iv - 初始向量（16字节）
 * @returns {string} 解密后的明文
 */
function decryptAES(ciphertext, key, iv) {
  if (!ciphertext) {
    return '';
  }
  
  // 使用 crypto-js
  if (CryptoJS) {
    const fullKey = key.padEnd(32, '0').slice(0, 32);
    const decrypted = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Utf8.parse(fullKey), {
      iv: CryptoJS.enc.Utf8.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  }
  
  throw new Error('crypto-js 未安装，请运行: npm install crypto-js');
}

/**
 * 加密数据（自动获取密钥和生成IV）
 * @param {string|object} data - 要加密的数据（字符串或对象）
 * @returns {Promise<object>} 返回 { encrypted: 密文, iv: 初始向量 }
 */
async function encrypt(data) {
  try {
    // 如果是对象，转换为 JSON 字符串
    const plaintext = typeof data === 'object' ? JSON.stringify(data) : String(data);
    
    // 获取密钥
    const key = await getEncryptionKey();
    
    // 生成 IV
    const iv = generateIV();
    
    // 加密
    const encrypted = encryptAES(plaintext, key, iv);
    
    return {
      encrypted,
      iv,
    };
  } catch (error) {
    console.error('加密失败:', error);
    throw new Error('数据加密失败');
  }
}

/**
 * 解密数据（需要提供IV）
 * @param {string} encrypted - 密文
 * @param {string} iv - 初始向量
 * @returns {Promise<string|object>} 解密后的数据
 */
async function decrypt(encrypted, iv) {
  try {
    // 获取密钥
    const key = await getEncryptionKey();
    
    // 解密
    const decrypted = decryptAES(encrypted, key, iv);
    
    // 尝试解析为 JSON
    try {
      return JSON.parse(decrypted);
    } catch (e) {
      return decrypted;
    }
  } catch (error) {
    console.error('解密失败:', error);
    throw new Error('数据解密失败');
  }
}

/**
 * 加密对象中的指定字段
 * @param {object} data - 要加密的对象
 * @param {string[]} fields - 需要加密的字段名数组
 * @returns {Promise<object>} 加密后的对象
 */
async function encryptFields(data, fields) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const result = { ...data };
  
  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null) {
      const { encrypted, iv } = await encrypt(result[field]);
      result[field] = encrypted;
      // 同时保存 IV，供后端解密使用
      result[`${field}_iv`] = iv;
    }
  }
  
  return result;
}

/**
 * 解密对象中的指定字段
 * @param {object} data - 要解密的对象
 * @param {string[]} fields - 需要解密的字段名数组
 * @returns {Promise<object>} 解密后的对象
 */
async function decryptFields(data, fields) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const result = { ...data };
  
  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null) {
      // 如果 IV 单独存储
      const iv = result[`${field}_iv`] || generateIV(); // 实际应从数据中获取
      result[field] = await decrypt(result[field], iv);
    }
  }
  
  return result;
}

// 兼容 ES6 和 CommonJS
const exports = {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  encryptAES,
  decryptAES,
  getEncryptionKey,
  generateIV,
};

// CommonJS 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = exports;
}

// ES6 导出
export default exports;
export {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  encryptAES,
  decryptAES,
  getEncryptionKey,
  generateIV,
};
