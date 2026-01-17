/* eslint-disable */
var __request = wx.request;
var Mock = require('./mock.js');
Object.defineProperty(wx, 'request', { writable: true });
wx.request = function (config) {
  // 尝试匹配带 method 的 key，如 "POST /api/class/create"
  var method = (config.method || 'GET').toUpperCase();
  
  // 去除 URL 中的查询参数，只保留路径部分用于匹配
  var urlPath = config.url.split('?')[0];
  var urlWithMethod = method + ' ' + urlPath;
  var urlOnly = urlPath;
  var originalUrl = config.url; // 保留原始 URL 用于后续处理
  
  // 优先匹配带 method 的 key，如果没有则匹配 url
  var mockKey = Mock._mocked[urlWithMethod] ? urlWithMethod : (Mock._mocked[urlOnly] ? urlOnly : undefined);
  
  // 如果没有精确匹配，尝试动态路径匹配（如 /api/class/1）
  if (typeof mockKey == 'undefined') {
      // 检查是否是获取单个班级信息的请求（去除查询参数后匹配）
    if (method === 'GET' && /^\/api\/class\/\d+/.test(urlPath)) {
      // 直接处理获取单个班级信息的请求（使用去除查询参数后的路径）
      var match = urlPath.match(/\/api\/class\/(\d+)/);
      if (match) {
        var classId = parseInt(match[1]);
        // 从全局班级数据库查找班级
        var allClasses = wx.getStorageSync('mock_all_classes') || [];
        var foundClass = null;
        for (var i = 0; i < allClasses.length; i++) {
          if (allClasses[i].id === classId) {
            foundClass = allClasses[i];
            break;
          }
        }
        
        var mockResponse = {
          statusCode: 200,
          data: foundClass ? {
            code: 200,
            success: true,
            data: foundClass,
          } : {
            code: 404,
            success: false,
            message: '班级不存在',
          },
          header: {},
          cookies: [],
        };
        
        if (typeof config.success == 'function') {
          config.success(mockResponse);
        }
        if (typeof config.complete == 'function') {
          config.complete(mockResponse);
        }
        return;
      }
    }
  }
  
  if (typeof mockKey == 'undefined') {
    console.log('[Mock] 未找到匹配的 Mock 数据:', config.url, 'method:', method);
    __request(config);
    return;
  }
  
  console.log('[Mock] 匹配到 Mock 数据:', mockKey);
  var resTemplate = Mock._mocked[mockKey].template;
  
  // 如果模板是函数，传递请求配置（包含原始 URL 和解析后的查询参数）
  var response;
  if (typeof resTemplate === 'function') {
    // 解析查询参数
    var urlParams = {};
    if (originalUrl.indexOf('?') !== -1) {
      var queryString = originalUrl.split('?')[1];
      var params = queryString.split('&');
      for (var i = 0; i < params.length; i++) {
        var pair = params[i].split('=');
        if (pair.length === 2) {
          urlParams[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
        }
      }
    }
    
    response = resTemplate({
      url: originalUrl,
      urlPath: urlPath,
      urlParams: urlParams,
      method: config.method,
      data: config.data,
      header: config.header,
      body: typeof config.data === 'string' ? config.data : JSON.stringify(config.data || {}),
    });
  } else {
    response = Mock.mock(resTemplate);
  }
  
  // 确保 Mock 返回的响应格式与真实请求一致
  // 添加 statusCode 字段，使其与真实 wx.request 返回格式一致
  var mockResponse = {
    statusCode: 200,
    data: response,
    header: {},
    cookies: [],
  };
  
  if (typeof config.success == 'function') {
    config.success(mockResponse);
  }
  if (typeof config.complete == 'function') {
    config.complete(mockResponse);
  }
};
module.exports = Mock;
