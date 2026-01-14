import { encryptFields } from '~/utils/crypto';

Page({
  data: {
    isCheck: false,
    isSubmit: false,
    passwordInfo: {
      account: '',
      password: '',
    },
    radioValue: '',
  },

  changeSubmit() {
    const { account, password } = this.data.passwordInfo;
    if (account !== '' && password !== '' && this.data.isCheck) {
      this.setData({ isSubmit: true });
    } else {
      this.setData({ isSubmit: false });
    }
  },

  onCheckChange(e) {
    const { value } = e.detail;
    this.setData({
      radioValue: value,
      isCheck: value === 'agree',
    });
    this.changeSubmit();
  },

  onAccountChange(e) {
    this.setData({ passwordInfo: { ...this.data.passwordInfo, account: e.detail.value } });
    this.changeSubmit();
  },

  onPasswordChange(e) {
    this.setData({ passwordInfo: { ...this.data.passwordInfo, password: e.detail.value } });
    this.changeSubmit();
  },

  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register',
    });
  },

  goToForgotPassword() {
    wx.navigateTo({
      url: '/pages/forgot-password/forgot-password',
    });
  },

  async login() {
    if (!this.data.isCheck) {
      wx.showToast({
        title: '请先同意《协议条款》',
        icon: 'none',
      });
      return;
    }

    const { account, password } = this.data.passwordInfo;
    if (!account || !password) {
      wx.showToast({
        title: '请输入账号和密码',
        icon: 'none',
      });
      return;
    }

    try {
      wx.showLoading({
        title: '登录中...',
        mask: true,
      });

      // 1. 前端先 AES 加密（沿用你现有的加密工具）
      const encrypted = await encryptFields(
        { phone: account, password },
        ['phone', 'password'],
      );

      // 2. 调用云函数 login
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: encrypted,
      });
      const result = res.result || {};

      if (result.code === 200) {
        const { userId, role } = result.data || {};

        // 这里你之前是存 token，这里可以简单存一下 userId/role
        if (userId) {
          wx.setStorageSync('userId', userId);
        }
        if (role !== undefined) {
          wx.setStorageSync('userRole', role);
        }

        wx.hideLoading();
        wx.showToast({
          title: '登录成功',
          icon: 'success',
        });

        setTimeout(() => {
          wx.switchTab({
            url: '/pages/home/index',
          });
        }, 1500);
      } else {
        wx.hideLoading();
        wx.showToast({
          title: result.message || '登录失败',
          icon: 'none',
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('登录失败:', error);
      wx.showToast({
        title: error.message || '登录失败，请重试',
        icon: 'none',
        duration: 2000,
      });
    }
  },
});