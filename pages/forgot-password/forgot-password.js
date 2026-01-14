import request from '~/api/request';

Page({
  data: {
    step: 1, // 1-输入账号，2-验证码，3-重置密码
    account: '',
    verifyCode: '',
    sendCodeCount: 60,
    isSendCode: false,
    newPassword: '',
    confirmPassword: '',
    timer: null,
  },

  onUnload() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
  },

  onAccountChange(e) {
    this.setData({ account: e.detail.value });
  },

  onVerifyCodeChange(e) {
    this.setData({ verifyCode: e.detail.value });
  },

  onNewPasswordChange(e) {
    this.setData({ newPassword: e.detail.value });
  },

  onConfirmPasswordChange(e) {
    this.setData({ confirmPassword: e.detail.value });
  },

  // 发送验证码
  async sendVerifyCode() {
    if (!this.data.account) {
      wx.showToast({
        title: '请输入账号',
        icon: 'none',
      });
      return;
    }

    // 验证手机号格式
    const phoneReg = /^[1][3,4,5,7,8,9][0-9]{9}$/;
    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!phoneReg.test(this.data.account) && !emailReg.test(this.data.account)) {
      wx.showToast({
        title: '请输入正确的手机号或邮箱',
        icon: 'none',
      });
      return;
    }

    try {
      wx.showLoading({
        title: '发送中...',
        mask: true,
      });

      const res = await request('/api/auth/send-reset-code', 'POST', {
        account: this.data.account,
      });

      wx.hideLoading();

      if (res.success || res.data?.code === 200 || res.data?.success) {
        wx.showToast({
          title: '验证码已发送',
          icon: 'success',
        });

        this.setData({ isSendCode: true });
        this.countDown();
        this.setData({ step: 2 });
      } else {
        throw new Error(res.message || res.data?.message || '发送失败');
      }
    } catch (error) {
      wx.hideLoading();
      console.error('发送验证码失败:', error);
      wx.showToast({
        title: error.message || '发送失败，请重试',
        icon: 'none',
      });
    }
  },

  // 倒计时
  countDown() {
    this.setData({ sendCodeCount: 60 });
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
    this.data.timer = setInterval(() => {
      if (this.data.sendCodeCount <= 0) {
        this.setData({ sendCodeCount: 0, isSendCode: false });
        clearInterval(this.data.timer);
        this.data.timer = null;
      } else {
        this.setData({ sendCodeCount: this.data.sendCodeCount - 1 });
      }
    }, 1000);
  },

  // 验证验证码
  async verifyCode() {
    if (!this.data.verifyCode) {
      wx.showToast({
        title: '请输入验证码',
        icon: 'none',
      });
      return;
    }

    try {
      wx.showLoading({
        title: '验证中...',
        mask: true,
      });

      const res = await request('/api/auth/verify-reset-code', 'POST', {
        account: this.data.account,
        code: this.data.verifyCode,
      });

      wx.hideLoading();

      if (res.success || res.data?.code === 200 || res.data?.success) {
        this.setData({ step: 3 });
      } else {
        throw new Error(res.message || res.data?.message || '验证失败');
      }
    } catch (error) {
      wx.hideLoading();
      console.error('验证失败:', error);
      wx.showToast({
        title: error.message || '验证失败，请重试',
        icon: 'none',
      });
    }
  },

  // 重置密码
  async resetPassword() {
    const { newPassword, confirmPassword } = this.data;

    if (!newPassword || !confirmPassword) {
      wx.showToast({
        title: '请输入新密码',
        icon: 'none',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      wx.showToast({
        title: '两次密码输入不一致',
        icon: 'none',
      });
      return;
    }

    if (newPassword.length < 6) {
      wx.showToast({
        title: '密码长度至少6位',
        icon: 'none',
      });
      return;
    }

    try {
      wx.showLoading({
        title: '重置中...',
        mask: true,
      });

      const res = await request('/api/auth/reset-password', 'POST', {
        account: this.data.account,
        code: this.data.verifyCode,
        newPassword,
      });

      wx.hideLoading();

      if (res.success || res.data?.code === 200 || res.data?.success) {
        wx.showToast({
          title: '密码重置成功',
          icon: 'success',
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        throw new Error(res.message || res.data?.message || '重置失败');
      }
    } catch (error) {
      wx.hideLoading();
      console.error('重置密码失败:', error);
      wx.showToast({
        title: error.message || '重置失败，请重试',
        icon: 'none',
      });
    }
  },
});
