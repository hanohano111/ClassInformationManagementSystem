/* eslint-disable */
var __request = wx.request;
var Mock = require('./mock.js');
Object.defineProperty(wx, 'request', { writable: true });
wx.request = function (config) {
  if (typeof Mock._mocked[config.url] == 'undefined') {
    __request(config);
    return;
  }
  var resTemplate = Mock._mocked[config.url].template;
  var response = Mock.mock(resTemplate);
  
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
