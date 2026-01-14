export default {
  path: '/api/auth/password-login',
  data: {
    code: 200,
    success: true,
    data: {
      token: 'mock_token_' + Date.now(),
      userId: 123,
      role: 1, // 1-学生，2-教师
    },
  },
};
