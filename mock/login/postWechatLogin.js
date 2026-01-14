export default {
  path: '/api/auth/wechat-login',
  data: {
    code: 200,
    success: true,
    data: {
      openid: 'mock_openid_123456',
      token: 'mock_token_' + Date.now(),
      role: 0, // 0-未绑定，1-学生，2-教师
    },
  },
};
