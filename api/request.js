import config from '~/config';
import { getEncryptionConfig } from '~/config/api-encryption-config';
import { encryptFields, decryptFields } from '~/utils/crypto';

// 确保 baseUrl 有默认值，避免 undefined
const baseUrl = config?.baseUrl || '';
const delay = config?.isMock ? 500 : 0;

/**
 * 请求拦截器：加密请求数据
 */
async function encryptRequestData(url, data) {
  // 如果未启用加密，直接返回
  if (!config?.encryptionEnabled) {
    return data;
  }
  
  // 获取加密配置
  const encryptionConfig = getEncryptionConfig(url);
  if (!encryptionConfig || !encryptionConfig.encryptFields || encryptionConfig.encryptFields.length === 0) {
    return data;
  }
  
  // 加密指定字段
  try {
    const encryptedData = await encryptFields(data, encryptionConfig.encryptFields);
    return encryptedData;
  } catch (error) {
    console.error('请求数据加密失败:', error);
    // 加密失败时，可以选择抛出错误或返回原始数据
    throw new Error('请求数据加密失败');
  }
}

/**
 * 响应拦截器：解密响应数据
 */
async function decryptResponseData(url, responseData) {
  // 如果未启用加密，直接返回
  if (!config?.encryptionEnabled) {
    return responseData;
  }
  
  // 获取加密配置
  const encryptionConfig = getEncryptionConfig(url);
  if (!encryptionConfig || !encryptionConfig.decryptFields || encryptionConfig.decryptFields.length === 0) {
    return responseData;
  }
  
  // 递归解密数据（支持嵌套对象和数组）
  async function decryptNestedData(data, fields) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => decryptNestedData(item, fields)));
    }
    
    if (data && typeof data === 'object') {
      // 解密当前层级的字段
      const decrypted = await decryptFields(data, fields);
      
      // 递归处理嵌套对象
      const result = { ...decrypted };
      for (const key in result) {
        if (result[key] && typeof result[key] === 'object') {
          result[key] = await decryptNestedData(result[key], fields);
        }
      }
      
      return result;
    }
    
    return data;
  }
  
  try {
    // 如果响应数据是对象，尝试解密 data 字段
    if (responseData && typeof responseData === 'object') {
      if (responseData.data) {
        responseData.data = await decryptNestedData(responseData.data, encryptionConfig.decryptFields);
      } else {
        // 如果 data 字段不存在，直接解密整个对象
        return await decryptNestedData(responseData, encryptionConfig.decryptFields);
      }
    }
    
    return responseData;
  } catch (error) {
    console.error('响应数据解密失败:', error);
    // 解密失败时返回原始数据，避免影响业务
    return responseData;
  }
}

/**
 * 请求函数
 * @param {string} url - 接口路径
 * @param {string} method - 请求方法
 * @param {object} data - 请求数据
 * @returns {Promise} 响应数据
 */
async function request(url, method = 'GET', data = {}) {
  const header = {
    'content-type': 'application/json',
    // 有其他content-type需求加点逻辑判断处理即可
  };
  
  // 获取token，有就丢进请求头
  const tokenString = wx.getStorageSync('access_token');
  if (tokenString) {
    header.Authorization = `Bearer ${tokenString}`;
  }
  
  // 请求前加密数据
  let requestData = data;
  if (method !== 'GET' && data && Object.keys(data).length > 0) {
    try {
      requestData = await encryptRequestData(url, data);
    } catch (error) {
      return Promise.reject(error);
    }
  }
  
  // 构建完整的请求 URL
  const fullUrl = baseUrl ? `${baseUrl}${url}` : url;
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method,
      data: requestData,
      dataType: 'json', // 微信官方文档中介绍会对数据进行一次JSON.parse
      header,
      success: async (res) => {
        setTimeout(async () => {
          try {
          // HTTP状态码为200才视为成功
            // 兼容 Mock 模式：如果没有 statusCode，检查 data.code 或 data.success
            const isSuccess = res.statusCode === 200 
              || (res.statusCode === undefined && (res.data?.code === 200 || res.data?.success === true));
            
            if (isSuccess) {
              // 解密响应数据
              const decryptedRes = await decryptResponseData(url, res.data);
              resolve({
                ...res,
                data: decryptedRes,
              });
          } else {
            // wx.request的特性，只要有响应就会走success回调，所以在这里判断状态，非200的均视为请求失败
            reject(res);
            }
          } catch (error) {
            console.error('响应处理失败:', error);
            reject(error);
          }
        }, delay);
      },
      fail(err) {
        setTimeout(() => {
          // 断网、服务器挂了都会fail回调，直接reject即可
          reject(err);
        }, delay);
      },
    });
  });
}

// 导出请求和服务地址
export default request;
